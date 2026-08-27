import { MarketQuote } from '@investment-tracker/shared';

interface CachedStockEntry {
  quote: MarketQuote;
  fetchedAt: number; // Unix timestamp in ms
}

// In-memory cache for stock quotes
const stockMemoryCache = new Map<string, CachedStockEntry>();

// In-flight promise map for request deduplication
const inFlightPromises = new Map<string, Promise<MarketQuote | null>>();

// Yahoo Session / Crumb cache
interface YahooSession {
  cookie: string;
  crumb: string;
  expiresAt: number;
}
let yahooSession: YahooSession | null = null;
let yahooRateLimitedUntil = 0;

/**
 * Helper to get current Indian Standard Time (IST) components
 */
function getISTDate(date: Date = new Date()): {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  isWeekend: boolean;
  dateString: string; // YYYY-MM-DD
} {
  // Convert to IST (UTC + 5 hours 30 minutes)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const istDate = new Date(utc + istOffset);

  const dayOfWeek = istDate.getDay();
  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1;
  const d = istDate.getDate();
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return {
    dayOfWeek,
    year,
    month,
    date: d,
    hours,
    minutes,
    totalMinutes,
    isWeekend,
    dateString,
  };
}

/**
 * Evaluates whether we need to fetch a fresh stock quote based on Indian Market Hours (NSE/BSE):
 * Market Hours: Mon-Fri 09:15 IST (555 min) to 15:30 IST (930 min).
 * - During market hours: Refresh every 60 minutes.
 * - After market hours (>= 15:30 IST): If last fetch was after 15:30 on same day, serve cached data. If fetched before 15:30, make 1 call to get closing price.
 * - Before market hours (< 09:15 IST) or Weekends: If cached data from previous close exists, serve cached data.
 */
function shouldFetchStockQuote(cachedEntry?: CachedStockEntry): boolean {
  if (!cachedEntry) return true;

  const now = new Date();
  const istNow = getISTDate(now);
  const istFetched = getISTDate(new Date(cachedEntry.fetchedAt));

  const MARKET_OPEN_MINUTES = 9 * 60 + 15; // 09:15 IST = 555
  const MARKET_CLOSE_MINUTES = 15 * 60 + 30; // 15:30 IST = 930
  const SIXTY_MINUTES_MS = 60 * 60 * 1000;

  // 1. Weekend (Saturday / Sunday)
  if (istNow.isWeekend) {
    return false;
  }

  const isTodaySameDate = istNow.dateString === istFetched.dateString;

  // 2. Before Market Hours (< 09:15 IST on weekday)
  if (istNow.totalMinutes < MARKET_OPEN_MINUTES) {
    return false;
  }

  // 3. During Market Hours (09:15 - 15:30 IST on weekday)
  if (istNow.totalMinutes >= MARKET_OPEN_MINUTES && istNow.totalMinutes <= MARKET_CLOSE_MINUTES) {
    if (!isTodaySameDate || istFetched.totalMinutes < MARKET_OPEN_MINUTES) {
      return true;
    }
    const ageMs = now.getTime() - cachedEntry.fetchedAt;
    return ageMs >= SIXTY_MINUTES_MS;
  }

  // 4. After Market Hours (> 15:30 IST on weekday)
  if (istNow.totalMinutes > MARKET_CLOSE_MINUTES) {
    if (isTodaySameDate && istFetched.totalMinutes >= MARKET_CLOSE_MINUTES) {
      return false;
    }
    return true;
  }

  return false;
}

export class StockService {
  /**
   * Normalize symbol for exchange queries (US vs Indian)
   */
  static normalizeSymbol(symbol: string): string {
    let clean = symbol.trim().toUpperCase();
    if (clean.endsWith('=X') || clean.includes('.')) {
      return clean;
    }
    // US Index ETFs and common US stocks without dot
    const knownUsTickers = ['VOO', 'QQQ', 'QQQM', 'VTI', 'VT', 'SCHD', 'SPY', 'IVV', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'BRK.B'];
    if (knownUsTickers.includes(clean)) {
      return clean;
    }
    return `${clean}.NS`;
  }

  /**
   * Acquire or reuse a valid Yahoo Finance session (cookie + crumb)
   */
  private static async getYahooSession(): Promise<{ cookie?: string; crumb?: string } | null> {
    const now = Date.now();
    if (yahooSession && yahooSession.expiresAt > now) {
      return yahooSession;
    }

    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const cookieRes = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': userAgent },
      });

      const rawCookie = cookieRes.headers.get('set-cookie');
      let cookie = '';
      if (rawCookie) {
        cookie = rawCookie.split(',').map((c) => c.split(';')[0].trim()).join('; ');
      }

      const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': userAgent,
          ...(cookie ? { 'Cookie': cookie } : {}),
        },
      });

      if (crumbRes.ok) {
        const crumb = (await crumbRes.text()).trim();
        if (crumb && !crumb.includes('<')) {
          yahooSession = {
            cookie,
            crumb,
            expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
          };
          return yahooSession;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Fetch quote for a single stock / ETF symbol with full deduplication & caching
   */
  static async getQuote(rawSymbol: string, forceRefresh: boolean = false): Promise<MarketQuote | null> {
    const symbol = this.normalizeSymbol(rawSymbol);
    const key = `stock_${symbol}`;

    // 1. Return from in-memory cache if fresh
    const cached = stockMemoryCache.get(key);
    if (!forceRefresh && cached && !shouldFetchStockQuote(cached)) {
      return cached.quote;
    }

    // 2. If currently rate-limited by Yahoo, return cached immediately
    if (Date.now() < yahooRateLimitedUntil) {
      return cached ? cached.quote : null;
    }

    // 3. Request Deduplication: if fetch is already in flight for this symbol, join it
    if (inFlightPromises.has(key)) {
      return inFlightPromises.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const session = await this.getYahooSession();
        const crumbParam = session?.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d${crumbParam}`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            ...(session?.cookie ? { 'Cookie': session.cookie } : {}),
          },
        });

        if (res.status === 429) {
          // Rate-limited: back off for 15 minutes and serve cached
          yahooRateLimitedUntil = Date.now() + 15 * 60 * 1000;
          return cached ? cached.quote : null;
        }

        if (!res.ok) {
          return cached ? cached.quote : null;
        }

        const data = await res.json() as any;
        const result = data?.chart?.result?.[0];
        if (!result || !result.meta) {
          return cached ? cached.quote : null;
        }

        const meta = result.meta;
        const price = meta.regularMarketPrice ?? meta.previousClose;
        if (typeof price !== 'number') {
          return cached ? cached.quote : null;
        }

        const prevClose = meta.previousClose ?? meta.chartPreviousClose;
        const change = typeof prevClose === 'number' ? price - prevClose : 0;
        const changePercent = typeof prevClose === 'number' && prevClose > 0 ? (change / prevClose) * 100 : 0;
        const currency = meta.currency === 'USD' ? 'USD' : 'INR';

        const quote: MarketQuote = {
          symbolOrCode: rawSymbol,
          name: meta.shortName || meta.symbol,
          price,
          previousClose: prevClose,
          change,
          changePercent,
          currency,
          updatedAt: new Date().toISOString(),
          source: 'yahoo',
        };

        stockMemoryCache.set(key, {
          quote,
          fetchedAt: Date.now(),
        });

        return quote;
      } catch (e) {
        console.error(`Stock quote fetch error for ${rawSymbol}:`, e);
        return cached ? cached.quote : null;
      } finally {
        inFlightPromises.delete(key);
      }
    })();

    inFlightPromises.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Batch fetch quotes for multiple symbols concurrently with deduplication
   */
  static async getBatchQuotes(symbols: string[], forceRefresh: boolean = false): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    const uniqueSymbols = Array.from(new Set(symbols.filter(Boolean)));

    await Promise.all(
      uniqueSymbols.map(async (sym) => {
        const quote = await this.getQuote(sym, forceRefresh);
        if (quote) {
          results[sym] = quote;
        }
      })
    );

    return results;
  }
}

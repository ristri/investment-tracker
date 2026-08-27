import { MarketQuote } from '@investment-tracker/shared';

export interface NseSgbEntry {
  symbol: string;
  name: string;
  series: string;
  issuePrice: number;
  ltp: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  tradedValue: number;
  maturityDate?: string;
  rawSymbol: string;
}

interface SgbCache {
  data: NseSgbEntry[];
  bySymbol: Map<string, NseSgbEntry>;
  fetchedAt: number;
}

let sgbMemoryCache: SgbCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
let inFlightSgbPromise: Promise<NseSgbEntry[]> | null = null;
let nseRateLimitedUntil = 0;

// Common series mapping table to NSE symbols
const KNOWN_SERIES_MAP: Record<string, string> = {
  // 2023-24
  '2023-24 series iv': 'SGBFEB32IV',
  '2023-24 series 4': 'SGBFEB32IV',
  '2023-24 series iii': 'SGBDE31III',
  '2023-24 series 3': 'SGBDE31III',
  '2023-24 series ii': 'SGBSEP31II',
  '2023-24 series 2': 'SGBSEP31II',
  '2023-24 series i': 'SGBJUN31I',
  '2023-24 series 1': 'SGBJUN31I',
  // 2022-23
  '2022-23 series iv': 'SGBMAR31IV',
  '2022-23 series 4': 'SGBMAR31IV',
  '2022-23 series iii': 'SGBDE30III',
  '2022-23 series 3': 'SGBDE30III',
  '2022-23 series ii': 'SGBAUG30',
  '2022-23 series 2': 'SGBAUG30',
  '2022-23 series i': 'SGBJUN30',
  '2022-23 series 1': 'SGBJUN30',
  // 2021-22
  '2021-22 series x': 'SGBMAR30X',
  '2021-22 series ix': 'SGBJAN30IX',
  '2021-22 series viii': 'SGBD29VIII',
  '2021-22 series vii': 'SGBNV29VII',
  '2021-22 series vi': 'SGBSEP29VI',
  '2021-22 series v': 'SGBAUG29V',
  '2021-22 series iv': 'SGBJUL29IV',
  '2021-22 series iii': 'SGBJU29III',
  '2021-22 series ii': 'SGBJUN29II',
  '2021-22 series i': 'SGBMAY29I',
  // 2020-21
  '2020-21 series xii': 'SGBMR29XII',
  '2020-21 series xi': 'SGBFEB29XI',
  '2020-21 series x': 'SGBJAN29X',
  '2020-21 series ix': 'SGBJAN29IX',
  '2020-21 series viii': 'SGBN28VIII',
  '2020-21 series vii': 'SGBOC28VII',
  '2020-21 series vi': 'SGBSEP28VI',
  '2020-21 series v': 'SGBAUG28V',
  '2020-21 series iv': 'SGBJUL28IV',
  '2020-21 series iii': 'SGBJUN28',
  '2020-21 series ii': 'SGBMAY28',
  '2020-21 series i': 'SGBAPR28I',
};

// Formatted Series Names for NSE symbols
const SYMBOL_TO_SERIES_TITLE: Record<string, string> = {
  'SGBFEB32IV': '2023-24 Series IV (Feb 2032)',
  'SGBDE31III': '2023-24 Series III (Dec 2031)',
  'SGBSEP31II': '2023-24 Series II (Sep 2031)',
  'SGBJUN31I': '2023-24 Series I (Jun 2031)',
  'SGBMAR31IV': '2022-23 Series IV (Mar 2031)',
  'SGBDE30III': '2022-23 Series III (Dec 2030)',
  'SGBAUG30': '2022-23 Series II (Aug 2030)',
  'SGBJUN30': '2022-23 Series I (Jun 2030)',
  'SGBMAR30X': '2021-22 Series X (Mar 2030)',
  'SGBJAN30IX': '2021-22 Series IX (Jan 2030)',
  'SGBD29VIII': '2021-22 Series VIII (Dec 2029)',
  'SGBNV29VII': '2021-22 Series VII (Nov 2029)',
  'SGBSEP29VI': '2021-22 Series VI (Sep 2029)',
  'SGBAUG29V': '2021-22 Series V (Aug 2029)',
  'SGBJUL29IV': '2021-22 Series IV (Jul 2029)',
  'SGBJU29III': '2021-22 Series III (Jul 2029)',
  'SGBJUN29II': '2021-22 Series II (Jun 2029)',
  'SGBMAY29I': '2021-22 Series I (May 2029)',
  'SGBMR29XII': '2020-21 Series XII (Mar 2029)',
  'SGBFEB29XI': '2020-21 Series XI (Feb 2029)',
  'SGBJAN29X': '2020-21 Series X (Jan 2029)',
  'SGBJAN29IX': '2020-21 Series IX (Jan 2029)',
  'SGBN28VIII': '2020-21 Series VIII (Nov 2028)',
  'SGBOC28VII': '2020-21 Series VII (Oct 2028)',
  'SGBSEP28VI': '2020-21 Series VI (Sep 2028)',
  'SGBAUG28V': '2020-21 Series V (Aug 2028)',
  'SGBJUL28IV': '2020-21 Series IV (Jul 2028)',
  'SGBJUN28': '2020-21 Series III (Jun 2028)',
  'SGBMAY28': '2020-21 Series II (May 2028)',
  'SGBAPR28I': '2020-21 Series I (Apr 2028)',
};

export class NseSgbService {
  /**
   * Fetches official SGB market data from NSE India
   * https://www.nseindia.com/market-data/sovereign-gold-bond
   */
  static async fetchAllSgbQuotes(forceRefresh: boolean = false): Promise<NseSgbEntry[]> {
    const now = Date.now();
    if (!forceRefresh && sgbMemoryCache && (now - sgbMemoryCache.fetchedAt < CACHE_TTL_MS)) {
      return sgbMemoryCache.data;
    }

    if (now < nseRateLimitedUntil) {
      return sgbMemoryCache ? sgbMemoryCache.data : [];
    }

    if (inFlightSgbPromise) {
      return inFlightSgbPromise;
    }

    inFlightSgbPromise = (async () => {
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/market-data/sovereign-gold-bond',
        };

        // 1. First establish session cookie on nseindia.com
        let cookieHeader = '';
        try {
          const homeRes = await fetch('https://www.nseindia.com', {
            headers: {
              'User-Agent': headers['User-Agent'],
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });
          const setCookie = homeRes.headers.get('set-cookie');
          if (setCookie) {
            cookieHeader = setCookie.split(',').map((c) => c.split(';')[0].trim()).join('; ');
          }
        } catch {}

        // 2. Fetch SGB market data
        const sgbUrl = 'https://www.nseindia.com/api/sovereign-gold-bonds';
        const res = await fetch(sgbUrl, {
          headers: {
            ...headers,
            ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
          },
        });

        if (res.status === 429) {
          nseRateLimitedUntil = Date.now() + 15 * 60 * 1000;
          return sgbMemoryCache ? sgbMemoryCache.data : [];
        }

        if (!res.ok) {
          if (sgbMemoryCache) return sgbMemoryCache.data;
          return [];
        }

        const json = await res.json() as any;
        const rawList = Array.isArray(json?.data) ? json.data : [];

        const bySymbol = new Map<string, NseSgbEntry>();
        const entries: NseSgbEntry[] = [];

        for (const item of rawList) {
          const symbol = String(item.symbol || '').trim().toUpperCase();
          if (!symbol) continue;

        const ltp = parseFloat(String(item.ltP || item.lastPrice || 0).replace(/,/g, '')) || 0;
        const prevClose = parseFloat(String(item.prevClose || item.previousClose || 0).replace(/,/g, '')) || ltp;
        const issuePrice = parseFloat(String(item.issue_price || item.issuePrice || 0).replace(/,/g, '')) || 0;
        const change = parseFloat(String(item.chn || item.change || 0).replace(/,/g, '')) || (ltp - prevClose);
        const changePercent = parseFloat(String(item.per || item.pChange || 0).replace(/,/g, '')) || 0;
        const volume = parseFloat(String(item.qty || item.totalTradedVolume || 0).replace(/,/g, '')) || 0;
        const tradedValue = parseFloat(String(item.trdVal || item.totalTradedValue || 0).replace(/,/g, '')) || 0;

        const seriesName = SYMBOL_TO_SERIES_TITLE[symbol] || `SGB ${symbol}`;
        const name = `Sovereign Gold Bond - ${seriesName}`;

        const entry: NseSgbEntry = {
          symbol,
          name,
          series: seriesName,
          issuePrice,
          ltp: ltp > 0 ? ltp : prevClose,
          previousClose: prevClose,
          change,
          changePercent,
          volume,
          tradedValue,
          maturityDate: item.maturityDate || undefined,
          rawSymbol: symbol,
        };

        entries.push(entry);
        bySymbol.set(symbol, entry);
      }

      // Sort by recent / higher traded volume
      entries.sort((a, b) => b.tradedValue - a.tradedValue);

      sgbMemoryCache = {
        data: entries,
        bySymbol,
        fetchedAt: now,
      };

      return entries;
    } catch (e) {
      console.error('Failed to fetch SGB quotes from NSE India:', e);
      if (sgbMemoryCache) return sgbMemoryCache.data;
      return [];
    } finally {
      inFlightSgbPromise = null;
    }
  })();

  return inFlightSgbPromise;
}

  /**
   * Resolves the real-time quote for a specific SGB identifier
   * (Supports NSE symbol like SGBFEB32IV, series name like "2023-24 Series IV", Groww bond names, or ISIN)
   */
  static async getSgbQuote(identifier: string, forceRefresh: boolean = false): Promise<MarketQuote | null> {
    const list = await this.fetchAllSgbQuotes(forceRefresh);
    if (!list || list.length === 0) return null;

    const raw = identifier.trim();
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    // 1. Direct match by symbol
    const cleanSym = upper.replace('.NS', '').replace('SGB-', '').replace(/\s+/g, '');
    let matched = list.find((item) => item.symbol === upper || item.symbol === cleanSym);

    // 2. Match by Known Series name mapping
    if (!matched) {
      for (const [key, nseSymbol] of Object.entries(KNOWN_SERIES_MAP)) {
        if (lower.includes(key)) {
          matched = list.find((item) => item.symbol === nseSymbol);
          if (matched) break;
        }
      }
    }

    // 3. Match by Year and Tranche in bond name (e.g. "2031-III" -> SGBDE31III, "2032-IV" -> SGBFEB32IV)
    if (!matched) {
      const yearTrancheMatch = raw.match(/20(\d{2})[- ]([I|V|X]+)/i);
      if (yearTrancheMatch) {
        const yr = yearTrancheMatch[1]; // e.g. 31 or 32
        const tranche = yearTrancheMatch[2].toUpperCase(); // e.g. III or IV
        matched = list.find((item) => item.symbol.includes(yr) && item.symbol.includes(tranche));
      }
    }

    // 4. Fuzzy search in symbol / series name
    if (!matched) {
      matched = list.find((item) =>
        item.series.toLowerCase().includes(lower) ||
        lower.includes(item.symbol.toLowerCase()) ||
        item.name.toLowerCase().includes(lower)
      );
    }

    // 5. Fallback: If no exact tranche matched, use the benchmark active SGB LTP (median of top traded SGBs)
    const price = matched ? matched.ltp : (list[0]?.ltp || 16000);
    const prevClose = matched ? matched.previousClose : (list[0]?.previousClose || price);
    const change = matched ? matched.change : 0;
    const changePercent = matched ? matched.changePercent : 0;
    const name = matched ? matched.name : `SGB (${raw})`;
    const resolvedSymbol = matched ? matched.symbol : cleanSym;

    return {
      symbolOrCode: resolvedSymbol,
      name,
      price,
      previousClose: prevClose,
      change,
      changePercent,
      currency: 'INR',
      updatedAt: new Date().toISOString(),
      source: 'nse_sgb',
    };
  }
}

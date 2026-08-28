import { MarketQuote } from '@investment-tracker/shared';
import { SymbolMappingService } from './symbolMappingService';

// In-memory cache for fast worker execution (survives worker warm instances)
const memoryCache = new Map<string, { quote: MarketQuote; expiresAt: number }>();
const schemeNameMap = new Map<string, number>();
const MF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const inFlightMfPromises = new Map<string, Promise<MarketQuote | null>>();

export class AmfiService {
  /**
   * Search MF schemes by name
   */
  static async searchSchemes(query: string): Promise<Array<{ schemeCode: number; schemeName: string }>> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!res.ok) return [];
      const data = await res.json() as Array<{ schemeCode: number; schemeName: string }>;
      return Array.isArray(data) ? data.slice(0, 10) : [];
    } catch (e) {
      console.error('AMFI search error:', e);
      return [];
    }
  }

  /**
   * Resolve numeric scheme code from a mutual fund scheme name.
   * Checks in-memory cache -> persistent D1 database -> AMFI Search API.
   */
  static async resolveSchemeCode(name: string, db?: any): Promise<number | null> {
    if (!name) return null;
    const cleanKey = name.trim().toLowerCase();

    // 1. Check in-memory cache
    if (schemeNameMap.has(cleanKey)) {
      return schemeNameMap.get(cleanKey)!;
    }

    // 2. Check persistent D1 database
    if (db) {
      const fromDb = await SymbolMappingService.getResolvedSymbol(db, name);
      if (fromDb && /^\d+$/.test(fromDb.trim())) {
        const code = parseInt(fromDb.trim(), 10);
        schemeNameMap.set(cleanKey, code);
        return code;
      }
    }

    const isDirect = cleanKey.includes('direct');
    const isGrowth = cleanKey.includes('growth');

    const cleanQuery = name
      .replace(/Direct Plan/gi, '')
      .replace(/Direct/gi, '')
      .replace(/Growth/gi, '')
      .replace(/Regular Plan/gi, '')
      .replace(/IDCW/gi, '')
      .replace(/Option/gi, '')
      .replace(/-+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const results = await this.searchSchemes(cleanQuery);
    if (results.length === 0) return null;

    const matched =
      results.find((s) => {
        const sLower = s.schemeName.toLowerCase();
        if (isDirect && isGrowth) return sLower.includes('direct') && sLower.includes('growth');
        if (isDirect) return sLower.includes('direct');
        if (isGrowth) return sLower.includes('growth');
        return true;
      }) || results[0];

    if (matched?.schemeCode) {
      schemeNameMap.set(cleanKey, matched.schemeCode);

      // 3. Persist newly discovered mapping in D1 database
      if (db) {
        await SymbolMappingService.saveMapping(
          db,
          'mutual_fund',
          name,
          String(matched.schemeCode),
          matched.schemeName,
          'amfi'
        );
      }

      return matched.schemeCode;
    }

    return null;
  }

  /**
   * Get latest NAV by scheme code or scheme name
   */
  static async getNavForScheme(
    schemeNameOrCode: string | number,
    forceRefresh: boolean = false,
    db?: any
  ): Promise<MarketQuote | null> {
    if (!schemeNameOrCode) return null;
    const str = String(schemeNameOrCode).trim();
    if (/^\d+$/.test(str)) {
      return this.getNav(str, forceRefresh);
    }

    const schemeCode = await this.resolveSchemeCode(str, db);
    if (!schemeCode) return null;
    return this.getNav(schemeCode, forceRefresh);
  }

  /**
   * Get latest NAV by scheme code with in-flight deduplication & 24h cache
   */
  static async getNav(schemeCode: number | string, forceRefresh: boolean = false): Promise<MarketQuote | null> {
    const key = `mf_${schemeCode}`;
    const now = Date.now();

    // 1. Check cache
    const cached = memoryCache.get(key);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      return cached.quote;
    }

    // 2. In-flight request deduplication
    if (inFlightMfPromises.has(key)) {
      return inFlightMfPromises.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!res.ok) return cached ? cached.quote : null;

        const data = await res.json() as any;
        if (data && data.status === 'SUCCESS' && data.data && data.data.length > 0) {
          const latestEntry = data.data[0];
          const nav = parseFloat(latestEntry.nav);
          if (!isNaN(nav)) {
            const quote: MarketQuote = {
              symbolOrCode: String(schemeCode),
              name: data.meta?.scheme_name || `MF ${schemeCode}`,
              price: nav,
              updatedAt: latestEntry.date || new Date().toISOString(),
              source: 'amfi',
            };

            memoryCache.set(key, {
              quote,
              expiresAt: now + MF_CACHE_TTL_MS,
            });

            return quote;
          }
        }
        return cached ? cached.quote : null;
      } catch (e) {
        console.error(`AMFI NAV fetch error for ${schemeCode}:`, e);
        return cached ? cached.quote : null;
      } finally {
        inFlightMfPromises.delete(key);
      }
    })();

    inFlightMfPromises.set(key, fetchPromise);
    return fetchPromise;
  }
}

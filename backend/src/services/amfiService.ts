import { MarketQuote } from '@investment-tracker/shared';

// In-memory cache for fast worker execution (survives worker warm instances)
const memoryCache = new Map<string, { quote: MarketQuote; expiresAt: number }>();
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
   * Get latest NAV by scheme code with in-flight deduplication & 24h cache
   */
  static async getNav(schemeCode: number | string): Promise<MarketQuote | null> {
    const key = `mf_${schemeCode}`;
    const now = Date.now();

    // 1. Check cache
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > now) {
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

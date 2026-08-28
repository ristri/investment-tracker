export interface SymbolMapping {
  id?: number;
  asset_class: string;
  query_key: string;
  resolved_symbol: string;
  resolved_name?: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

// In-memory cache for ultra-fast mapping lookups (survives warm worker instances)
const mappingMemoryCache = new Map<string, string>();

/**
 * Service to manage persistent database mappings for Stocks, ETFs, Mutual Funds, US Stocks, and SGBs.
 * Prevents redundant external search API calls by caching known ISINs, company names, and scheme titles in SQLite / D1.
 */
export class SymbolMappingService {
  /**
   * Normalize any query key to standard uppercase format
   */
  static normalizeKey(key: string): string {
    return (key || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * Look up a mapping from in-memory cache first, then D1 database
   */
  static async getResolvedSymbol(db: any, rawKey: string): Promise<string | null> {
    if (!rawKey) return null;
    const key = this.normalizeKey(rawKey);

    // 1. Check in-memory cache
    if (mappingMemoryCache.has(key)) {
      return mappingMemoryCache.get(key)!;
    }

    if (!db) return null;

    try {
      // 2. Query D1 database
      const row = await db
        .prepare('SELECT resolved_symbol FROM market_symbol_mappings WHERE query_key = ?')
        .bind(key)
        .first<{ resolved_symbol: string }>();

      if (row && row.resolved_symbol) {
        mappingMemoryCache.set(key, row.resolved_symbol);
        return row.resolved_symbol;
      }
    } catch (e) {
      console.error('Error fetching symbol mapping from DB:', e);
    }

    return null;
  }

  /**
   * Persist a newly discovered or verified mapping in the D1 database and memory cache
   */
  static async saveMapping(
    db: any,
    assetClass: string,
    rawKey: string,
    resolvedSymbol: string,
    resolvedName?: string,
    source: string = 'yahoo'
  ): Promise<void> {
    if (!rawKey || !resolvedSymbol) return;
    const key = this.normalizeKey(rawKey);
    const sym = resolvedSymbol.trim();

    mappingMemoryCache.set(key, sym);

    if (!db) return;

    try {
      await db
        .prepare(
          `INSERT INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(query_key) DO UPDATE SET
             resolved_symbol = excluded.resolved_symbol,
             resolved_name = coalesce(excluded.resolved_name, market_symbol_mappings.resolved_name),
             source = excluded.source,
             updated_at = datetime('now')`
        )
        .bind(assetClass, key, sym, resolvedName || null, source)
        .run();
    } catch (e) {
      console.error(`Error saving symbol mapping for ${key} -> ${sym} in DB:`, e);
    }
  }

  /**
   * Preload all mappings into memory for fast startup if needed
   */
  static async preloadCache(db: any): Promise<void> {
    if (!db) return;
    try {
      const res = await db.prepare('SELECT query_key, resolved_symbol FROM market_symbol_mappings').all();
      const rows = res?.results || [];
      for (const r of rows as any[]) {
        if (r.query_key && r.resolved_symbol) {
          mappingMemoryCache.set(r.query_key, r.resolved_symbol);
        }
      }
    } catch {}
  }
}

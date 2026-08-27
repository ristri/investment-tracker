let isMigrated = false;

export async function ensureD1Schema(db: any) {
  if (isMigrated || !db) return;

  try {
    const tableInfo = await db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='holdings'")
      .first<{ sql: string }>();

    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('us_stock')) {
      console.log('Migrating D1 database holdings table to support us_stock...');

      await db.prepare('ALTER TABLE holdings RENAME TO holdings_old').run();

      await db.prepare(`
        CREATE TABLE holdings (
          id                        INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          asset_class               TEXT NOT NULL CHECK(asset_class IN ('stock', 'mutual_fund', 'us_stock', 'sgb', 'etf', 'epf', 'ppf', 'fd')),
          symbol                    TEXT,
          name                      TEXT NOT NULL,
          isin                      TEXT,
          folio_or_account_number   TEXT,
          institution               TEXT,
          category                  TEXT,
          sub_category              TEXT,
          quantity                  REAL NOT NULL DEFAULT 0,
          avg_buy_price             REAL NOT NULL DEFAULT 0,
          invested_amount           REAL NOT NULL DEFAULT 0,
          statement_price           REAL,
          statement_value           REAL,
          live_price                REAL,
          live_value                REAL,
          unrealized_pnl            REAL,
          unrealized_pnl_percent    REAL,
          xirr                      REAL,
          source                    TEXT NOT NULL DEFAULT 'groww_stocks' CHECK(source IN ('groww_stocks', 'groww_mf', 'epf_passbook', 'epf_pdf', 'indmoney_us_stocks', 'us_stocks', 'manual', 'bank')),
          statement_date            TEXT,
          metadata_json             TEXT,
          created_at                TEXT DEFAULT (datetime('now')),
          updated_at                TEXT DEFAULT (datetime('now'))
        )
      `).run();

      // Copy non-cash holdings over
      await db.prepare(`
        INSERT INTO holdings (
          id, user_id, asset_class, symbol, name, isin, folio_or_account_number,
          institution, category, sub_category, quantity, avg_buy_price,
          invested_amount, statement_price, statement_value, live_price, live_value,
          unrealized_pnl, unrealized_pnl_percent, xirr, source, statement_date, metadata_json,
          created_at, updated_at
        )
        SELECT
          id, user_id,
          CASE WHEN asset_class = 'cash' THEN 'us_stock' ELSE asset_class END,
          symbol, name, isin, folio_or_account_number, institution, category, sub_category,
          quantity, avg_buy_price, invested_amount, statement_price, statement_value,
          live_price, live_value, unrealized_pnl, unrealized_pnl_percent, xirr,
          source, statement_date, metadata_json, created_at, updated_at
        FROM holdings_old
      `).run();

      await db.prepare('DROP TABLE holdings_old').run();
      console.log('D1 schema migration for us_stock completed successfully.');
    }

    isMigrated = true;
  } catch (err) {
    console.error('Auto migration check failed:', err);
  }
}

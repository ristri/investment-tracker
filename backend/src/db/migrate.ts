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

    // 2. Ensure market_symbol_mappings table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS market_symbol_mappings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_class      TEXT NOT NULL,
        query_key        TEXT NOT NULL UNIQUE,
        resolved_symbol  TEXT NOT NULL,
        resolved_name    TEXT,
        source           TEXT NOT NULL DEFAULT 'yahoo',
        created_at       TEXT DEFAULT (datetime('now')),
        updated_at       TEXT DEFAULT (datetime('now'))
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_market_mappings_key ON market_symbol_mappings(query_key)
    `).run();

    // 3. Seed baseline verified mappings if table is empty
    const countRow = await db.prepare('SELECT COUNT(*) as count FROM market_symbol_mappings').first<{ count: number }>();
    if (!countRow || countRow.count === 0) {
      console.log('Seeding initial market symbol mappings...');
      const seedStatements = [
        // Stocks
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE238A01034', 'AXISBANK.BO', 'Axis Bank Limited', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE296A01032', 'BAJFINANCE.NS', 'Bajaj Finance Limited', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE377Y01014', 'BAJAJHFL.BO', 'Bajaj Housing Finance Ltd', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE397D01024', 'BHARTIARTL.BO', 'Bharti Airtel Limited', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE118H01025', 'BSE.NS', 'BSE Limited', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE040A01034', 'HDFCBANK.NS', 'HDFC Bank Ltd', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE154A01025', 'ITC.NS', 'ITC Ltd', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE745G01043', 'MCX.NS', 'Multi Commodity Exchange', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE081A01020', 'TATASTEEL.NS', 'Tata Steel Limited', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE010B01027', 'ZYDUSLIFE.NS', 'Zydus Lifesciences Ltd', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE002A01018', 'RELIANCE.NS', 'Reliance Industries Ltd', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE467B01029', 'TCS.NS', 'Tata Consultancy Services', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('stock', 'INE009A01021', 'INFY.NS', 'Infosys Limited', 'yahoo')`,
        // ETFs
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('etf', 'INF179KC1981', 'HDFCGOLD.NS', 'HDFC Gold ETF', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('etf', 'HDFC GOLD ETF', 'HDFCGOLD.NS', 'HDFC Gold ETF', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('etf', 'NIPPON INDIA ETF NIFTY 50 BEES', 'NIFTYBEES.NS', 'Nippon India ETF Nifty 50 BeES', 'yahoo')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('etf', 'NIPPON INDIA SILVER ETF', 'SILVERBEES.NS', 'Nippon India Silver ETF', 'yahoo')`,
        // SGBs
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('sgb', 'IN0020230168', 'SGBDEC31III', '2.50%GOLDBONDS2031SR-III', 'nse_sgb')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('sgb', '2.50%GOLDBONDS2031SR-III', 'SGBDEC31III', '2.50%GOLDBONDS2031SR-III', 'nse_sgb')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('sgb', 'SGB 2021-22 SERIES IV (JUL 2029)', 'SGBJUL29IV', 'SGB 2021-22 Series IV (Jul 2029)', 'nse_sgb')`,
        // Mutual Funds (AMFI scheme codes)
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'ICICI PRUDENTIAL QUANT FUND DIRECT GROWTH', '148600', 'ICICI Prudential Quant Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'ICICI PRUDENTIAL TECHNOLOGY DIRECT PLAN GROWTH', '120594', 'ICICI Prudential Technology Direct Plan Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'MIRAE ASSET LARGE & MIDCAP FUND DIRECT GROWTH', '118834', 'Mirae Asset Large & Midcap Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'MOTILAL OSWAL S&P 500 INDEX FUND DIRECT GROWTH', '148381', 'Motilal Oswal S&P 500 Index Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'NAVI TOTAL STOCK MARKET US SPECIFIC EQUITY PASSIVE FOF DIRECT GROWTH', '149831', 'Navi Total Stock Market US Specific Equity Passive FoF Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'NIPPON INDIA PHARMA FUND DIRECT GROWTH', '118759', 'Nippon India Pharma Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'PARAG PARIKH CONSERVATIVE HYBRID FUND DIRECT GROWTH', '148958', 'Parag Parikh Conservative Hybrid Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'PARAG PARIKH FLEXI CAP FUND DIRECT GROWTH', '122639', 'Parag Parikh Flexi Cap Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'QUANT SMALL CAP FUND DIRECT PLAN GROWTH', '120828', 'Quant Small Cap Fund Direct Plan Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'SBI US SPECIFIC EQUITY ACTIVE FOF DIRECT GROWTH', '148760', 'SBI US Specific Equity Active FoF Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'TATA ARBITRAGE FUND DIRECT GROWTH', '145724', 'Tata Arbitrage Fund Direct Growth', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'TATA NIFTY 50 INDEX DIRECT', '150738', 'Tata Nifty 50 Index Direct', 'amfi')`,
        `INSERT OR IGNORE INTO market_symbol_mappings (asset_class, query_key, resolved_symbol, resolved_name, source) VALUES ('mutual_fund', 'UTI NIFTY 50 INDEX FUND DIRECT GROWTH', '120716', 'UTI Nifty 50 Index Fund Direct Growth', 'amfi')`,
      ];

      for (const stmt of seedStatements) {
        try {
          await db.prepare(stmt).run();
        } catch {}
      }
    }

    isMigrated = true;
  } catch (err) {
    console.error('Auto migration check failed:', err);
  }
}

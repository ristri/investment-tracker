-- Users
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Holdings for 8 investment asset classes (Stocks, MF, US Stocks, SGB, ETF, EPF, PPF, FD)
CREATE TABLE IF NOT EXISTS holdings (
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
);

-- Net Worth Snapshots
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date        TEXT NOT NULL,
  title                TEXT NOT NULL,
  notes                TEXT,
  total_net_worth      REAL NOT NULL,
  total_invested       REAL NOT NULL,
  total_unrealized_pnl REAL NOT NULL,
  total_pnl_percent    REAL NOT NULL,
  stocks_value         REAL NOT NULL DEFAULT 0,
  mutual_funds_value   REAL NOT NULL DEFAULT 0,
  us_stocks_value      REAL NOT NULL DEFAULT 0,
  sgb_value            REAL NOT NULL DEFAULT 0,
  etf_value            REAL NOT NULL DEFAULT 0,
  epf_value            REAL NOT NULL DEFAULT 0,
  ppf_value            REAL NOT NULL DEFAULT 0,
  fd_value             REAL NOT NULL DEFAULT 0,
  breakdown_json       TEXT NOT NULL,
  created_at           TEXT DEFAULT (datetime('now'))
);

-- Import Logs
CREATE TABLE IF NOT EXISTS import_logs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type          TEXT NOT NULL,
  file_name            TEXT NOT NULL,
  statement_date       TEXT,
  records_imported     INTEGER NOT NULL DEFAULT 0,
  total_value_imported REAL NOT NULL DEFAULT 0,
  created_at           TEXT DEFAULT (datetime('now'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_holdings_user_asset ON holdings(user_id, asset_class);
CREATE INDEX IF NOT EXISTS idx_holdings_isin ON holdings(isin);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON net_worth_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_import_logs_user ON import_logs(user_id);

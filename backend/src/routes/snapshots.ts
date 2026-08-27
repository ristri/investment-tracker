import { Hono } from 'hono';
import {
  Env,
  JWTPayload,
  CreateSnapshotInput,
  NetWorthSnapshot,
  computePortfolioSummary,
} from '@investment-tracker/shared';

const snapshots = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// 1. POST /api/v1/snapshots - Take a manual portfolio snapshot
snapshots.post('/', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const body = (await c.req.json().catch(() => ({}))) as CreateSnapshotInput;

  // 1. Fetch current holdings
  const holdingsResult = await db
    .prepare('SELECT * FROM holdings WHERE user_id = ?')
    .bind(payload.userId)
    .all();

  const holdingsRaw = holdingsResult.results || [];
  const holdings = holdingsRaw.map((h: any) => {
    let metadata = undefined;
    if (h.metadata_json) {
      try {
        metadata = JSON.parse(h.metadata_json);
      } catch {}
    }
    return { ...h, metadata };
  });

  const summary = computePortfolioSummary(holdings as any);

  const snapshotDate = body.snapshot_date || new Date().toISOString();
  const title = body.title || `Snapshot ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const notes = body.notes || null;

  // Breakdown across asset classes
  const stocksVal = summary.assetClassBreakdown.stock.current;
  const mfVal = summary.assetClassBreakdown.mutual_fund.current;
  const usStocksVal = summary.assetClassBreakdown.us_stock.current;
  const sgbVal = summary.assetClassBreakdown.sgb.current;
  const etfVal = summary.assetClassBreakdown.etf.current;
  const epfVal = summary.assetClassBreakdown.epf.current;
  const ppfVal = summary.assetClassBreakdown.ppf.current;
  const fdVal = summary.assetClassBreakdown.fd.current;

  const breakdownJson = JSON.stringify({
    holdings: holdings.map((h: any) => ({
      id: h.id,
      asset_class: h.asset_class,
      name: h.name,
      symbol: h.symbol,
      isin: h.isin,
      quantity: h.quantity,
      invested: h.invested_amount,
      current: h.live_value ?? h.statement_value ?? h.invested_amount,
      unrealized_pnl: h.unrealized_pnl,
    })),
    macro: summary.macroBreakdown,
  });

  const result = await db
    .prepare(
      `INSERT INTO net_worth_snapshots (
        user_id, snapshot_date, title, notes,
        total_net_worth, total_invested, total_unrealized_pnl, total_pnl_percent,
        stocks_value, mutual_funds_value, us_stocks_value, sgb_value,
        etf_value, epf_value, ppf_value, fd_value, breakdown_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      payload.userId,
      snapshotDate,
      title,
      notes,
      summary.totalNetWorth,
      summary.totalInvested,
      summary.totalGain,
      summary.totalGainPercent,
      stocksVal,
      mfVal,
      usStocksVal,
      sgbVal,
      etfVal,
      epfVal,
      ppfVal,
      fdVal,
      breakdownJson
    )
    .run();

  const id = Number(result.meta.last_row_id);
  const created = await db
    .prepare('SELECT * FROM net_worth_snapshots WHERE id = ?')
    .bind(id)
    .first<NetWorthSnapshot>();

  return c.json({ snapshot: created }, 201);
});

// 2. GET /api/v1/snapshots - List all snapshots
snapshots.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;

  const results = await db
    .prepare('SELECT id, user_id, snapshot_date, title, notes, total_net_worth, total_invested, total_unrealized_pnl, total_pnl_percent, stocks_value, mutual_funds_value, us_stocks_value, sgb_value, etf_value, epf_value, ppf_value, fd_value, created_at FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date ASC')
    .bind(payload.userId)
    .all();

  return c.json({ snapshots: results.results || [] });
});

// 3. GET /api/v1/snapshots/:id - Get single snapshot with breakdown
snapshots.get('/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const id = Number(c.req.param('id'));

  const snapshot = await db
    .prepare('SELECT * FROM net_worth_snapshots WHERE id = ? AND user_id = ?')
    .bind(id, payload.userId)
    .first<NetWorthSnapshot>();

  if (!snapshot) {
    return c.json({ error: 'Snapshot not found' }, 404);
  }

  let parsedBreakdown = null;
  if (snapshot.breakdown_json) {
    try {
      parsedBreakdown = JSON.parse(snapshot.breakdown_json);
    } catch {
      parsedBreakdown = null;
    }
  }

  return c.json({
    snapshot: {
      ...snapshot,
      breakdown: parsedBreakdown,
    },
  });
});

// 4. DELETE /api/v1/snapshots/:id - Delete a snapshot
snapshots.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const id = Number(c.req.param('id'));

  const result = await db
    .prepare('DELETE FROM net_worth_snapshots WHERE id = ? AND user_id = ?')
    .bind(id, payload.userId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Snapshot not found' }, 404);
  }

  return c.json({ success: true });
});

export default snapshots;

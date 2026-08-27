import { Hono } from 'hono';
import {
  Env,
  JWTPayload,
  Holding,
  CreateHoldingInput,
  BatchImportRequest,
  computePortfolioSummary,
} from '@investment-tracker/shared';

import { StockService } from '../services/stockService';
import { NseSgbService } from '../services/nseSgbService';

const holdings = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// Helper to parse holding row
function parseHoldingRow(row: any): Holding {
  let metadata = undefined;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = undefined;
    }
  }

  return {
    ...row,
    metadata,
  };
}

// 1. GET /api/v1/holdings - List all user holdings + summary with live quote enrichment
holdings.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;

  const results = await db
    .prepare('SELECT * FROM holdings WHERE user_id = ? ORDER BY asset_class, name ASC')
    .bind(payload.userId)
    .all();

  let items = (results.results || []).map(parseHoldingRow);

  // Enrich US stock holdings and SGB holdings with live prices and returns
  let usdInrRate = 88.0;
  try {
    const usdQuote = await StockService.getQuote('USDINR=X', false);
    if (usdQuote?.price && usdQuote.price > 0) {
      usdInrRate = usdQuote.price;
    }
  } catch {}

  items = await Promise.all(
    items.map(async (h) => {
      // 1. Sovereign Gold Bonds (NSE live traded price)
      if (h.asset_class === 'sgb') {
        try {
          const identifier = h.symbol || h.metadata?.issue_series || h.name || '';
          const sgbQuote = await NseSgbService.getSgbQuote(identifier, false);
          if (sgbQuote && typeof sgbQuote.price === 'number') {
            const livePrice = sgbQuote.price;
            const liveVal = h.quantity * livePrice;
            const pnl = liveVal - h.invested_amount;
            const pnlPct = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;

            const updatedMeta = {
              ...(h.metadata || {}),
              nse_symbol: sgbQuote.symbolOrCode,
              live_sgb_price: livePrice,
            };

            return {
              ...h,
              live_price: livePrice,
              live_value: liveVal,
              unrealized_pnl: pnl,
              unrealized_pnl_percent: pnlPct,
              metadata: updatedMeta,
            };
          }
        } catch {}
      }

      // 2. US Stocks & US ETFs
      if (h.asset_class === 'us_stock' && h.symbol) {
        try {
          const quote = await StockService.getQuote(h.symbol, false);
          if (quote && typeof quote.price === 'number') {
            const priceUsd = quote.price;
            const rate = h.metadata?.usd_inr_rate || usdInrRate;
            const livePriceInr = priceUsd * rate;
            const liveValInr = h.quantity * livePriceInr;
            const pnlInr = liveValInr - h.invested_amount;
            const pnlPct = h.invested_amount > 0 ? (pnlInr / h.invested_amount) * 100 : 0;

            const updatedMeta = {
              ...(h.metadata || {}),
              price_usd: priceUsd,
              value_usd: h.quantity * priceUsd,
              usd_inr_rate: rate,
            };

            return {
              ...h,
              live_price: livePriceInr,
              live_value: liveValInr,
              unrealized_pnl: pnlInr,
              unrealized_pnl_percent: pnlPct,
              metadata: updatedMeta,
            };
          }
        } catch {}
      }
      return h;
    })
  );

  const summary = computePortfolioSummary(items);

  return c.json({
    holdings: items,
    summary,
  });
});

// 2. POST /api/v1/holdings - Add a manual holding
holdings.post('/', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const body = (await c.req.json()) as CreateHoldingInput;

  if (!body.name || !body.asset_class) {
    return c.json({ error: 'Name and asset_class are required' }, 400);
  }

  const investedAmount = body.invested_amount ?? 0;
  const quantity = body.quantity ?? 1;
  const avgBuyPrice = body.avg_buy_price ?? (quantity > 0 ? investedAmount / quantity : 0);
  const statementPrice = body.statement_price ?? avgBuyPrice;
  const statementValue = body.statement_value ?? investedAmount;
  let livePrice = body.live_price ?? statementPrice;
  let liveValue = body.live_value ?? statementValue;

  let metadataObj = body.metadata || {};

  // Auto-enrich SGB with live NSE exchange price if added manually
  if (body.asset_class === 'sgb') {
    try {
      const identifier = body.symbol || metadataObj.issue_series || body.name || '';
      const sgbQuote = await NseSgbService.getSgbQuote(identifier, false);
      if (sgbQuote && typeof sgbQuote.price === 'number') {
        livePrice = sgbQuote.price;
        liveValue = quantity * livePrice;
        metadataObj = {
          ...metadataObj,
          nse_symbol: sgbQuote.symbolOrCode,
          live_sgb_price: livePrice,
        };
      }
    } catch {}
  }

  const metadataJson = JSON.stringify(metadataObj);
  const pnl = liveValue - investedAmount;
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

  const result = await db
    .prepare(
      `INSERT INTO holdings (
        user_id, asset_class, symbol, name, isin, folio_or_account_number,
        institution, category, sub_category, quantity, avg_buy_price,
        invested_amount, statement_price, statement_value, live_price, live_value,
        unrealized_pnl, unrealized_pnl_percent, xirr, source, statement_date, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      payload.userId,
      body.asset_class,
      body.symbol || null,
      body.name,
      body.isin || null,
      body.folio_or_account_number || null,
      body.institution || null,
      body.category || null,
      body.sub_category || null,
      quantity,
      avgBuyPrice,
      investedAmount,
      statementPrice,
      statementValue,
      livePrice,
      liveValue,
      pnl,
      pnlPercent,
      body.xirr || null,
      body.source || 'manual',
      body.statement_date || null,
      metadataJson
    )
    .run();

  const id = Number(result.meta.last_row_id);
  const created = await db
    .prepare('SELECT * FROM holdings WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ holding: parseHoldingRow(created) }, 201);
});

// 3. PUT /api/v1/holdings/:id - Update a holding
holdings.put('/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const id = Number(c.req.param('id'));
  const body = (await c.req.json()) as Partial<CreateHoldingInput>;

  const existing = await db
    .prepare('SELECT * FROM holdings WHERE id = ? AND user_id = ?')
    .bind(id, payload.userId)
    .first();

  if (!existing) {
    return c.json({ error: 'Holding not found' }, 404);
  }

  const metadataJson = body.metadata ? JSON.stringify(body.metadata) : (existing as any).metadata_json;
  const quantity = body.quantity !== undefined ? body.quantity : (existing as any).quantity;
  const investedAmount = body.invested_amount !== undefined ? body.invested_amount : (existing as any).invested_amount;
  const avgBuyPrice = body.avg_buy_price !== undefined ? body.avg_buy_price : (existing as any).avg_buy_price;
  const livePrice = body.live_price !== undefined ? body.live_price : (existing as any).live_price;
  const liveValue = body.live_value !== undefined ? body.live_value : (quantity * (livePrice ?? avgBuyPrice));
  const pnl = liveValue - investedAmount;
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

  await db
    .prepare(
      `UPDATE holdings SET
        name = COALESCE(?, name),
        symbol = COALESCE(?, symbol),
        isin = COALESCE(?, isin),
        folio_or_account_number = COALESCE(?, folio_or_account_number),
        institution = COALESCE(?, institution),
        category = COALESCE(?, category),
        sub_category = COALESCE(?, sub_category),
        quantity = ?,
        avg_buy_price = ?,
        invested_amount = ?,
        live_price = ?,
        live_value = ?,
        unrealized_pnl = ?,
        unrealized_pnl_percent = ?,
        xirr = COALESCE(?, xirr),
        metadata_json = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`
    )
    .bind(
      body.name || null,
      body.symbol || null,
      body.isin || null,
      body.folio_or_account_number || null,
      body.institution || null,
      body.category || null,
      body.sub_category || null,
      quantity,
      avgBuyPrice,
      investedAmount,
      livePrice,
      liveValue,
      pnl,
      pnlPercent,
      body.xirr || null,
      metadataJson,
      id,
      payload.userId
    )
    .run();

  const updated = await db
    .prepare('SELECT * FROM holdings WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ holding: parseHoldingRow(updated) });
});

// 4. DELETE /api/v1/holdings/:id - Delete a holding
holdings.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const id = Number(c.req.param('id'));

  const result = await db
    .prepare('DELETE FROM holdings WHERE id = ? AND user_id = ?')
    .bind(id, payload.userId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Holding not found' }, 404);
  }

  return c.json({ success: true });
});

// 5. POST /api/v1/holdings/batch-import - Import report data (Source of Truth)
holdings.post('/batch-import', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const body = (await c.req.json()) as BatchImportRequest;

  if (!body.holdings || !Array.isArray(body.holdings) || body.holdings.length === 0) {
    return c.json({ error: 'No holdings provided for import' }, 400);
  }

  const normalizedSource = (body.source_type === 'epf_pdf' ? 'epf_passbook' : body.source_type) as any;
  const isEpf = normalizedSource === 'epf_passbook';

  // For non-EPF imports (Stocks, Mutual Funds), replacing existing source records gives authoritative ground truth
  if (!isEpf && body.replace_existing_source !== false) {
    await db
      .prepare('DELETE FROM holdings WHERE user_id = ? AND (source = ? OR source = ?)')
      .bind(payload.userId, normalizedSource, body.source_type)
      .run();
  }

  let totalValue = 0;
  const statements = [];

  for (const h of body.holdings) {
    const investedAmount = h.invested_amount ?? 0;
    const quantity = h.quantity ?? 1;
    const avgBuyPrice = h.avg_buy_price ?? (quantity > 0 ? investedAmount / quantity : 0);
    const statementPrice = h.statement_price ?? avgBuyPrice;
    const statementValue = h.statement_value ?? (quantity * statementPrice);
    let livePrice = h.live_price ?? statementPrice;
    let liveValue = h.live_value ?? statementValue;
    let pnl = h.unrealized_pnl ?? (liveValue - investedAmount);
    let pnlPercent = h.unrealized_pnl_percent ?? (investedAmount > 0 ? (pnl / investedAmount) * 100 : 0);
    const itemSource = (h.source === 'epf_pdf' ? 'epf_passbook' : h.source) || normalizedSource;

    // For US stocks, fetch real-time market price & exchange rate to calculate live returns
    if (h.asset_class === 'us_stock' && h.symbol) {
      try {
        const quote = await StockService.getQuote(h.symbol, false);
        const usdQuote = await StockService.getQuote('USDINR=X', false);
        const rate = usdQuote?.price && usdQuote.price > 0 ? usdQuote.price : (h.metadata?.usd_inr_rate || 88.0);
        if (quote && typeof quote.price === 'number') {
          const priceUsd = quote.price;
          const livePriceInr = priceUsd * rate;
          const liveValInr = quantity * livePriceInr;
          livePrice = livePriceInr;
          liveValue = liveValInr;
          pnl = liveValInr - investedAmount;
          pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

          if (h.metadata) {
            h.metadata.price_usd = priceUsd;
            h.metadata.value_usd = quantity * priceUsd;
            h.metadata.usd_inr_rate = rate;
          }
        }
      } catch {}
    }

    totalValue += (h.asset_class === 'us_stock' ? liveValue : statementValue);

    // Special handling for EPF to support multi-year passbooks per member ID
    if (isEpf) {
      const existingEpf = await db
        .prepare(
          `SELECT * FROM holdings WHERE user_id = ? AND asset_class = 'epf' AND (
            (folio_or_account_number IS NOT NULL AND folio_or_account_number = ?) OR
            institution = ? OR
            name = ?
          )`
        )
        .bind(
          payload.userId,
          h.folio_or_account_number || '',
          h.institution || '',
          h.name
        )
        .first<any>();

      if (existingEpf) {
        let existingMeta: any = {};
        try {
          existingMeta = JSON.parse(existingEpf.metadata_json || '{}');
        } catch {
          existingMeta = {};
        }

        const newMeta = h.metadata || {};

        // Merge monthly transactions map (keyed by wage_month)
        const txMap = new Map<string, any>();
        const oldTxs = existingMeta.monthly_transactions || [];
        const newTxs = newMeta.monthly_transactions || [];

        for (const t of oldTxs) {
          if (t && t.wage_month) txMap.set(t.wage_month, t);
        }
        for (const t of newTxs) {
          if (t && t.wage_month) txMap.set(t.wage_month, t); // updates or adds month
        }

        const mergedTransactions = Array.from(txMap.values());
        const oldYears = existingMeta.financial_years_covered || (existingMeta.financial_year ? [existingMeta.financial_year] : []);
        const newYears = newMeta.financial_years_covered || (newMeta.financial_year ? [newMeta.financial_year] : []);
        const mergedYears = Array.from(new Set([...oldYears, ...newYears])).filter(Boolean);

        // Determine if incoming passbook is newer
        const oldDate = existingEpf.statement_date || '';
        const newDate = body.statement_date || h.statement_date || '';
        const isNewerPassbook = newDate >= oldDate || statementValue >= existingEpf.statement_value;

        const mergedMeta = {
          ...existingMeta,
          ...newMeta,
          financial_years_covered: mergedYears,
          monthly_transactions: mergedTransactions,
          employee_share: isNewerPassbook ? newMeta.employee_share ?? existingMeta.employee_share : existingMeta.employee_share,
          employer_share: isNewerPassbook ? newMeta.employer_share ?? existingMeta.employer_share : existingMeta.employer_share,
          pension_share: isNewerPassbook ? newMeta.pension_share ?? existingMeta.pension_share : existingMeta.pension_share,
        };

        const finalStatementVal = isNewerPassbook ? statementValue : existingEpf.statement_value;
        const finalInvested = isNewerPassbook ? investedAmount : existingEpf.invested_amount;
        const finalPnl = finalStatementVal - finalInvested;
        const finalPnlPct = finalInvested > 0 ? (finalPnl / finalInvested) * 100 : 0;
        const finalDate = isNewerPassbook ? (newDate || oldDate) : oldDate;

        await db
          .prepare(
            `UPDATE holdings SET
              quantity = 1,
              avg_buy_price = ?,
              invested_amount = ?,
              statement_price = ?,
              statement_value = ?,
              live_price = ?,
              live_value = ?,
              unrealized_pnl = ?,
              unrealized_pnl_percent = ?,
              statement_date = ?,
              metadata_json = ?,
              updated_at = datetime('now')
            WHERE id = ?`
          )
          .bind(
            finalInvested,
            finalInvested,
            finalStatementVal,
            finalStatementVal,
            finalStatementVal,
            finalStatementVal,
            finalPnl,
            finalPnlPct,
            finalDate,
            JSON.stringify(mergedMeta),
            existingEpf.id
          )
          .run();

        continue;
      }
    }

    const metadataJson = h.metadata ? JSON.stringify(h.metadata) : null;

    statements.push(
      db
        .prepare(
          `INSERT INTO holdings (
            user_id, asset_class, symbol, name, isin, folio_or_account_number,
            institution, category, sub_category, quantity, avg_buy_price,
            invested_amount, statement_price, statement_value, live_price, live_value,
            unrealized_pnl, unrealized_pnl_percent, xirr, source, statement_date, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          payload.userId,
          h.asset_class,
          h.symbol || null,
          h.name,
          h.isin || null,
          h.folio_or_account_number || null,
          h.institution || null,
          h.category || null,
          h.sub_category || null,
          quantity,
          avgBuyPrice,
          investedAmount,
          statementPrice,
          statementValue,
          livePrice,
          liveValue,
          pnl,
          pnlPercent,
          h.xirr || null,
          itemSource,
          body.statement_date || null,
          metadataJson
        )
    );
  }

  // Record import log
  statements.push(
    db
      .prepare(
        `INSERT INTO import_logs (user_id, source_type, file_name, statement_date, records_imported, total_value_imported)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        payload.userId,
        body.source_type,
        body.file_name,
        body.statement_date || null,
        body.holdings.length,
        totalValue
      )
  );

  await db.batch(statements);

  return c.json({
    success: true,
    importedCount: body.holdings.length,
    totalValueImported: totalValue,
  });
});

export default holdings;

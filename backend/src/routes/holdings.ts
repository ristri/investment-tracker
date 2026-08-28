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

  const price_updated_at = metadata?.price_updated_at || row.statement_date || row.updated_at || row.created_at;

  return {
    ...row,
    price_updated_at,
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
      // 1. Sovereign Gold Bonds (NSE live traded price)
      if (h.asset_class === 'sgb') {
        try {
          const identifier = h.symbol || h.metadata?.nse_symbol || h.metadata?.issue_series || h.name || '';
          const sgbQuote = await NseSgbService.getSgbQuote(identifier, false);
          if (sgbQuote && typeof sgbQuote.price === 'number') {
            const livePrice = sgbQuote.price;
            const liveVal = h.quantity * livePrice;
            const pnl = liveVal - h.invested_amount;
            const pnlPct = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;
            const priceUpdatedAt = sgbQuote.updatedAt || new Date().toISOString();

            const updatedMeta = {
              ...(h.metadata || {}),
              nse_symbol: sgbQuote.symbolOrCode,
              live_sgb_price: livePrice,
              price_updated_at: priceUpdatedAt,
              price_source: 'NSE India',
            };

            return {
              ...h,
              live_price: livePrice,
              live_value: liveVal,
              unrealized_pnl: pnl,
              unrealized_pnl_percent: pnlPct,
              price_updated_at: priceUpdatedAt,
              metadata: updatedMeta,
            };
          }
        } catch {}
      }

      // 2. US Stocks & US ETFs
      if (h.asset_class === 'us_stock') {
        try {
          const sym = h.symbol || h.name;
          if (sym) {
            const quote = await StockService.getQuote(sym, false, h.name, db);
            if (quote && typeof quote.price === 'number') {
              const priceUsd = quote.price;
              const rate = h.metadata?.usd_inr_rate || usdInrRate;
              const livePriceInr = priceUsd * rate;
              const liveValInr = h.quantity * livePriceInr;
              const pnlInr = liveValInr - h.invested_amount;
              const pnlPct = h.invested_amount > 0 ? (pnlInr / h.invested_amount) * 100 : 0;
              const priceUpdatedAt = quote.updatedAt || new Date().toISOString();

              const updatedMeta = {
                ...(h.metadata || {}),
                price_usd: priceUsd,
                value_usd: h.quantity * priceUsd,
                usd_inr_rate: rate,
                price_updated_at: priceUpdatedAt,
                price_source: 'Yahoo Finance',
              };

              return {
                ...h,
                live_price: livePriceInr,
                live_value: liveValInr,
                unrealized_pnl: pnlInr,
                unrealized_pnl_percent: pnlPct,
                price_updated_at: priceUpdatedAt,
                metadata: updatedMeta,
              };
            }
          }
        } catch {}
      }

      // 3. Indian Stocks & Indian ETFs
      if (h.asset_class === 'stock' || h.asset_class === 'etf') {
        try {
          const sym = h.symbol || h.isin || h.name;
          if (sym) {
            const quote = await StockService.getQuote(sym, false, h.name, db);
            if (quote && typeof quote.price === 'number') {
              const livePrice = quote.price;
              const liveVal = h.quantity * livePrice;
              const pnl = liveVal - h.invested_amount;
              const pnlPct = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;
              const priceUpdatedAt = quote.updatedAt || new Date().toISOString();

              const updatedMeta = {
                ...(h.metadata || {}),
                resolved_symbol: quote.symbolOrCode,
                price_updated_at: priceUpdatedAt,
                price_source: 'NSE / Yahoo',
              };

              return {
                ...h,
                live_price: livePrice,
                live_value: liveVal,
                unrealized_pnl: pnl,
                unrealized_pnl_percent: pnlPct,
                price_updated_at: priceUpdatedAt,
                metadata: updatedMeta,
              };
            }
          }
        } catch {}
      }

      // 4. Mutual Funds (AMFI NAV)
      if (h.asset_class === 'mutual_fund') {
        try {
          const schemeCodeOrName = h.metadata?.scheme_code || h.name;
          if (schemeCodeOrName) {
            const mfQuote = await AmfiService.getNavForScheme(schemeCodeOrName, false, db);
            if (mfQuote && typeof mfQuote.price === 'number') {
              const livePrice = mfQuote.price;
              const liveVal = h.quantity * livePrice;
              const pnl = liveVal - h.invested_amount;
              const pnlPct = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;
              const priceUpdatedAt = mfQuote.updatedAt || new Date().toISOString();

              const parsedCode = !isNaN(Number(mfQuote.symbolOrCode)) ? Number(mfQuote.symbolOrCode) : undefined;
              const updatedMeta = {
                ...(h.metadata || {}),
                scheme_code: h.metadata?.scheme_code || parsedCode,
                price_updated_at: priceUpdatedAt,
                price_source: 'AMFI NAV',
              };

              return {
                ...h,
                live_price: livePrice,
                live_value: liveVal,
                unrealized_pnl: pnl,
                unrealized_pnl_percent: pnlPct,
                price_updated_at: priceUpdatedAt,
                metadata: updatedMeta,
              };
            }
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

    // 1. For US stocks, fetch real-time market price & exchange rate to calculate live returns
    if (h.asset_class === 'us_stock') {
      try {
        const sym = h.symbol || h.name;
        const quote = await StockService.getQuote(sym, false, h.name, db);
        const usdQuote = await StockService.getQuote('USDINR=X', false, undefined, db);
        const rate = usdQuote?.price && usdQuote.price > 0 ? usdQuote.price : (h.metadata?.usd_inr_rate || 88.0);
        if (quote && typeof quote.price === 'number') {
          const priceUsd = quote.price;
          const livePriceInr = priceUsd * rate;
          const liveValInr = quantity * livePriceInr;
          livePrice = livePriceInr;
          liveValue = liveValInr;
          pnl = liveValInr - investedAmount;
          pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

          h.metadata = {
            ...(h.metadata || {}),
            price_usd: priceUsd,
            value_usd: quantity * priceUsd,
            usd_inr_rate: rate,
            price_updated_at: quote.updatedAt || new Date().toISOString(),
            price_source: 'Yahoo Finance',
          };
        }
      } catch {}
    }

    // 2. For Indian Stocks & Indian ETFs, look up DB mapping or resolve live price
    if (h.asset_class === 'stock' || h.asset_class === 'etf') {
      try {
        const sym = h.symbol || h.isin || h.name;
        const quote = await StockService.getQuote(sym, false, h.name, db);
        if (quote && typeof quote.price === 'number') {
          livePrice = quote.price;
          liveValue = quantity * livePrice;
          pnl = liveValue - investedAmount;
          pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

          h.metadata = {
            ...(h.metadata || {}),
            resolved_symbol: quote.symbolOrCode,
            price_updated_at: quote.updatedAt || new Date().toISOString(),
            price_source: 'NSE / Yahoo',
          };
        }
      } catch {}
    }

    // 3. For Mutual Funds, look up DB mapping or resolve AMFI scheme code and live NAV
    if (h.asset_class === 'mutual_fund') {
      try {
        const schemeCodeOrName = h.metadata?.scheme_code || h.name;
        const mfQuote = await AmfiService.getNavForScheme(schemeCodeOrName, false, db);
        if (mfQuote && typeof mfQuote.price === 'number') {
          livePrice = mfQuote.price;
          liveValue = quantity * livePrice;
          pnl = liveValue - investedAmount;
          pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

          const parsedCode = !isNaN(Number(mfQuote.symbolOrCode)) ? Number(mfQuote.symbolOrCode) : undefined;
          h.metadata = {
            ...(h.metadata || {}),
            scheme_code: h.metadata?.scheme_code || parsedCode,
            price_updated_at: mfQuote.updatedAt || new Date().toISOString(),
            price_source: 'AMFI NAV',
          };
        }
      } catch {}
    }

    // 4. For SGBs, look up series and live quote
    if (h.asset_class === 'sgb') {
      try {
        const identifier = h.symbol || h.metadata?.nse_symbol || h.metadata?.issue_series || h.name || '';
        const sgbQuote = await NseSgbService.getSgbQuote(identifier, false);
        if (sgbQuote && typeof sgbQuote.price === 'number') {
          livePrice = sgbQuote.price;
          liveValue = quantity * livePrice;
          pnl = liveValue - investedAmount;
          pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

          h.metadata = {
            ...(h.metadata || {}),
            nse_symbol: sgbQuote.symbolOrCode,
            live_sgb_price: livePrice,
            price_updated_at: sgbQuote.updatedAt || new Date().toISOString(),
            price_source: 'NSE India',
          };
        }
      } catch {}
    }

    totalValue += (['stock', 'etf', 'us_stock', 'mutual_fund', 'sgb'].includes(h.asset_class) ? liveValue : statementValue);

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

        // Merge yearly interest history
        const mergedYearlyInterest: Record<string, { employee: number; employer: number; total: number; date?: string }> = {
          ...(existingMeta.yearly_interest || {}),
          ...(newMeta.yearly_interest || {}),
        };

        // If previous single-year record existed without yearly_interest dictionary
        if (existingMeta.total_interest && existingMeta.financial_year && !mergedYearlyInterest[existingMeta.financial_year]) {
          mergedYearlyInterest[existingMeta.financial_year] = {
            employee: existingMeta.employee_interest ?? 0,
            employer: existingMeta.employer_interest ?? 0,
            total: existingMeta.total_interest,
            date: existingMeta.interest_updated_date,
          };
        }

        // Sum cumulative interest across all financial years
        const allTimeInterest = Object.values(mergedYearlyInterest).reduce((sum: number, item: any) => sum + (item.total || 0), 0);

        // Determine if incoming passbook is newer
        const oldDate = existingEpf.statement_date || '';
        const newDate = body.statement_date || h.statement_date || '';
        const isNewerPassbook = newDate >= oldDate || statementValue >= existingEpf.statement_value;

        const finalStatementVal = isNewerPassbook ? statementValue : existingEpf.statement_value;
        const finalInvested = allTimeInterest > 0 ? Math.max(0, finalStatementVal - allTimeInterest) : (isNewerPassbook ? investedAmount : existingEpf.invested_amount);
        const finalPnl = allTimeInterest > 0 ? allTimeInterest : (finalStatementVal - finalInvested);
        const finalPnlPct = finalInvested > 0 ? (finalPnl / finalInvested) * 100 : 0;
        const finalDate = isNewerPassbook ? (newDate || oldDate) : oldDate;

        const mergedMeta = {
          ...existingMeta,
          ...newMeta,
          financial_years_covered: mergedYears,
          monthly_transactions: mergedTransactions,
          yearly_interest: mergedYearlyInterest,
          total_interest: allTimeInterest > 0 ? allTimeInterest : (newMeta.total_interest || existingMeta.total_interest),
          employee_interest: isNewerPassbook ? newMeta.employee_interest ?? existingMeta.employee_interest : existingMeta.employee_interest,
          employer_interest: isNewerPassbook ? newMeta.employer_interest ?? existingMeta.employer_interest : existingMeta.employer_interest,
          interest_updated_date: isNewerPassbook ? newMeta.interest_updated_date ?? existingMeta.interest_updated_date : existingMeta.interest_updated_date,
          employee_share: isNewerPassbook ? newMeta.employee_share ?? existingMeta.employee_share : existingMeta.employee_share,
          employer_share: isNewerPassbook ? newMeta.employer_share ?? existingMeta.employer_share : existingMeta.employer_share,
          pension_share: isNewerPassbook ? newMeta.pension_share ?? existingMeta.pension_share : existingMeta.pension_share,
        };

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

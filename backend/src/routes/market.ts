import { Hono } from 'hono';
import { Env, JWTPayload } from '@investment-tracker/shared';
import { StockService } from '../services/stockService';
import { AmfiService } from '../services/amfiService';
import { NseSgbService } from '../services/nseSgbService';

const market = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// 1. GET /api/v1/market/exchange-rate - Get live USD/INR exchange rate
market.get('/exchange-rate', async (c) => {
  const pair = c.req.query('pair') || 'USDINR';
  const force = c.req.query('force') === 'true';

  try {
    const symbol = pair.toUpperCase() === 'USDINR' ? 'USDINR=X' : `${pair.toUpperCase()}=X`;
    const quote = await StockService.getQuote(symbol, force);
    const rate = quote?.price && quote.price > 0 ? quote.price : 88.0;

    return c.json({
      pair: 'USDINR',
      rate,
      previousClose: quote?.previousClose || rate,
      change: quote?.change || 0,
      changePercent: quote?.changePercent || 0,
      updatedAt: quote?.updatedAt || new Date().toISOString(),
      source: quote?.source || 'fallback',
    });
  } catch (err) {
    return c.json({
      pair: 'USDINR',
      rate: 88.0,
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  }
});

// 2. GET /api/v1/market/sgb-directory - Get official SGB market directory from NSE India
market.get('/sgb-directory', async (c) => {
  const force = c.req.query('force') === 'true';
  const sgbList = await NseSgbService.fetchAllSgbQuotes(force);
  return c.json({
    sgbs: sgbList,
    count: sgbList.length,
    updatedAt: new Date().toISOString(),
  });
});

// 3. GET /api/v1/market/sgb-quote/:symbol - Get quote for specific SGB series
market.get('/sgb-quote/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  const force = c.req.query('force') === 'true';
  const quote = await NseSgbService.getSgbQuote(symbol, force);

  if (!quote) {
    return c.json({ error: `Unable to fetch SGB quote for ${symbol}` }, 404);
  }

  return c.json({ quote });
});

// 4. GET /api/v1/market/stock/:symbol - Get quote for stock/ETF
market.get('/stock/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  const force = c.req.query('force') === 'true';
  const quote = await StockService.getQuote(symbol, force);

  if (!quote) {
    return c.json({ error: `Unable to fetch quote for ${symbol}` }, 404);
  }

  return c.json({ quote });
});

// 5. POST /api/v1/market/batch-quotes - Batch stock quotes
market.post('/batch-quotes', async (c) => {
  const body = (await c.req.json()) as { symbols: string[]; force?: boolean };
  if (!body.symbols || !Array.isArray(body.symbols)) {
    return c.json({ error: 'Array of symbols required' }, 400);
  }

  const quotes = await StockService.getBatchQuotes(body.symbols, !!body.force);
  return c.json({ quotes });
});

// 6. GET /api/v1/market/mf/search - Search mutual funds
market.get('/mf/search', async (c) => {
  const query = c.req.query('q') || '';
  const results = await AmfiService.searchSchemes(query);
  return c.json({ results });
});

// 7. GET /api/v1/market/mf/nav/:schemeCode - Get MF NAV (24h cache)
market.get('/mf/nav/:schemeCode', async (c) => {
  const schemeCode = c.req.param('schemeCode');
  const quote = await AmfiService.getNav(schemeCode);

  if (!quote) {
    return c.json({ error: `Unable to fetch NAV for scheme ${schemeCode}` }, 404);
  }

  return c.json({ quote });
});

// 8. POST /api/v1/market/refresh-holdings - Refresh live prices for user's portfolio
market.post('/refresh-holdings', async (c) => {
  const payload = c.get('jwtPayload');
  const db = c.env.investment_tracker_db;
  const force = c.req.query('force') === 'true';

  const holdingsResult = await db
    .prepare('SELECT * FROM holdings WHERE user_id = ?')
    .bind(payload.userId)
    .all();

  const holdings = holdingsResult.results || [];
  let updatedCount = 0;

  // Get current USD/INR rate for US stock conversions
  let usdInrRate = 88.0;
  try {
    const usdQuote = await StockService.getQuote('USDINR=X', force);
    if (usdQuote?.price && usdQuote.price > 0) {
      usdInrRate = usdQuote.price;
    }
  } catch {}

  for (const h of holdings as any[]) {
    // 1. Sovereign Gold Bonds (NSE live traded price)
    if (h.asset_class === 'sgb') {
      try {
        let meta: any = {};
        if (h.metadata_json) {
          try { meta = JSON.parse(h.metadata_json); } catch {}
        }

        const identifier = h.symbol || meta.issue_series || h.name || '';
        const sgbQuote = await NseSgbService.getSgbQuote(identifier, force);

        if (sgbQuote && typeof sgbQuote.price === 'number') {
          const livePrice = sgbQuote.price;
          const liveValue = h.quantity * livePrice;
          const pnl = liveValue - h.invested_amount;
          const pnlPercent = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;

          const updatedMeta = {
            ...meta,
            nse_symbol: sgbQuote.symbolOrCode,
            live_sgb_price: livePrice,
          };

          await db
            .prepare(
              `UPDATE holdings SET live_price = ?, live_value = ?, unrealized_pnl = ?, unrealized_pnl_percent = ?, metadata_json = ?, updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(livePrice, liveValue, pnl, pnlPercent, JSON.stringify(updatedMeta), h.id)
            .run();

          updatedCount++;
        }
      } catch (err) {
        console.error(`Failed to refresh SGB holding ${h.id}:`, err);
      }
    }

    // 2. Indian Stocks & Indian ETFs
    if (h.asset_class === 'stock' || h.asset_class === 'etf') {
      const sym = h.symbol || h.isin;
      if (sym) {
        const quote = await StockService.getQuote(sym, force);
        if (quote && typeof quote.price === 'number') {
          const livePrice = quote.price;
          const liveValue = h.quantity * livePrice;
          const pnl = liveValue - h.invested_amount;
          const pnlPercent = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;

          await db
            .prepare(
              `UPDATE holdings SET live_price = ?, live_value = ?, unrealized_pnl = ?, unrealized_pnl_percent = ?, updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(livePrice, liveValue, pnl, pnlPercent, h.id)
            .run();

          updatedCount++;
        }
      }
    }

    // 3. US Stocks & US ETFs (VOO, QQQM, AAPL, etc.)
    if (h.asset_class === 'us_stock' && h.symbol) {
      const quote = await StockService.getQuote(h.symbol, force);
      if (quote && typeof quote.price === 'number') {
        const priceUsd = quote.price;
        const totalValUsd = h.quantity * priceUsd;
        const livePriceInr = priceUsd * usdInrRate;
        const liveValueInr = totalValUsd * usdInrRate;
        const pnl = liveValueInr - h.invested_amount;
        const pnlPercent = h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0;

        let meta: any = {};
        try {
          meta = JSON.parse(h.metadata_json || '{}');
        } catch {}

        const updatedMeta = {
          ...meta,
          price_usd: priceUsd,
          value_usd: totalValUsd,
          usd_inr_rate: usdInrRate,
        };

        await db
          .prepare(
            `UPDATE holdings SET live_price = ?, live_value = ?, unrealized_pnl = ?, unrealized_pnl_percent = ?, metadata_json = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(livePriceInr, liveValueInr, pnl, pnlPercent, JSON.stringify(updatedMeta), h.id)
          .run();

        updatedCount++;
      }
    }
  }

  return c.json({
    success: true,
    updatedCount,
    usdInrRate,
  });
});

export default market;

import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatUSD,
  formatPercent,
  calculateFDMaturity,
  calculateAccruedFD,
  computePortfolioSummary,
  getHoldingMacroSplit,
  getHoldingLiveValue,
  isMaturedFD,
  isMarketRateAssetClass,
  parseDateSafe,
  getHoldingPriceUpdateInfo,
  getAssetClassPriceUpdateInfo,
  Holding,
} from '@investment-tracker/shared';

describe('Shared Investment Calculations', () => {
  it('formats Indian currency correctly with standard and compact notation', () => {
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(1500)).toBe('₹1,500.00');
    expect(formatINR(150000)).toBe('₹1,50,000.00');
    expect(formatINR(17153516.27)).toBe('₹1,71,53,516.27');

    // Compact
    expect(formatINR(150000, true)).toBe('₹1.50 L');
    expect(formatINR(17153516.27, true)).toBe('₹1.72 Cr');
  });

  it('formats USD currency correctly', () => {
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(550.25)).toBe('$550.25');
    expect(formatUSD(1741.63)).toBe('$1,741.63');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(24.81)).toBe('+24.81%');
    expect(formatPercent(-5.2)).toBe('-5.20%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('calculates Fixed Deposit maturity amount accurately', () => {
    const result = calculateFDMaturity(100000, 7.5, 12, 'quarterly');
    expect(result.maturityAmount).toBe(107714);
    expect(result.totalInterest).toBe(7714);
  });

  it('dynamically computes real-time accrued FD values based on deposit date without prematurely adding maturity interest', () => {
    const today = new Date('2026-08-27');

    // 1. FD created today: currentValue is exactly the principal (0 accrued interest)
    const todayFd = calculateAccruedFD(200000, 7.5, '2026-08-27', 12, 'quarterly', today);
    expect(todayFd.currentValue).toBe(200000);
    expect(todayFd.accruedInterest).toBe(0);
    expect(todayFd.isMatured).toBe(false);

    // 2. FD created 6 months ago (approx 182 days ago): should only have ~6 months accrued interest
    const sixMonthsAgoFd = calculateAccruedFD(200000, 7.5, '2026-02-27', 12, 'quarterly', today);
    expect(sixMonthsAgoFd.currentValue).toBeGreaterThan(200000);
    expect(sixMonthsAgoFd.currentValue).toBeLessThan(215428); // less than full 1-yr maturity
    expect(sixMonthsAgoFd.accruedInterest).toBeGreaterThan(7000);
    expect(sixMonthsAgoFd.isMatured).toBe(false);

    // 3. FD created 2 years ago: is matured
    const pastFd = calculateAccruedFD(200000, 7.5, '2024-01-01', 12, 'quarterly', today);
    expect(pastFd.isMatured).toBe(true);
  });

  it('accurately detects matured Fixed Deposits and excludes them from Net Worth', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Active FD created today
    const activeFd: Holding = {
      id: 1, user_id: 1, asset_class: 'fd', name: 'HDFC FD',
      quantity: 1, avg_buy_price: 100000, invested_amount: 100000,
      statement_value: 100000, live_value: 100000, source: 'manual',
      created_at: todayStr, updated_at: todayStr,
      metadata: { principal: 100000, interest_rate: 7.5, start_date: todayStr, tenure_months: 12, maturity_date: '2030-01-01', is_matured: false }
    };
    expect(isMaturedFD(activeFd)).toBe(false);
    expect(getHoldingLiveValue(activeFd).currentValue).toBe(100000); // exact principal today!

    // 2. Matured FD (maturity in 2022)
    const maturedFd: Holding = {
      id: 2, user_id: 1, asset_class: 'fd', name: 'Old SBI FD',
      quantity: 1, avg_buy_price: 200000, invested_amount: 200000,
      statement_value: 230000, live_value: 230000, source: 'manual',
      created_at: '2020-01-01', updated_at: '2020-01-01',
      metadata: { maturity_date: '2022-01-01', is_matured: true }
    };
    expect(isMaturedFD(maturedFd)).toBe(true);
    expect(getHoldingLiveValue(maturedFd).currentValue).toBe(0); // excluded

    // 3. Portfolio Summary computation with active + matured FD
    const summary = computePortfolioSummary([activeFd, maturedFd]);

    // Active Net Worth should ONLY be ₹1,00,000 (matured FD is excluded)
    expect(summary.totalNetWorth).toBe(100000);
    expect(summary.totalInvested).toBe(100000);
    expect(summary.macroBreakdown.debt.value).toBe(100000);
    expect(summary.assetClassBreakdown.fd.current).toBe(100000);
  });

  it('accurately decomposes asset classes and mutual funds for Macro Allocations (Equity, Debt, Gold)', () => {
    // 1. Pure Equity Fund
    const equityMf: Holding = {
      id: 1, user_id: 1, asset_class: 'mutual_fund', name: 'Quant Small Cap Fund',
      category: 'Equity', sub_category: 'Small Cap', quantity: 100, avg_buy_price: 100,
      invested_amount: 10000, statement_value: 15000, source: 'groww_mf', created_at: '', updated_at: ''
    };
    expect(getHoldingMacroSplit(equityMf)).toEqual({ equity: 100, debt: 0, gold: 0 });

    // 2. US Stock / ETF (VOO / QQQM)
    const usStock: Holding = {
      id: 2, user_id: 1, asset_class: 'us_stock', name: 'Vanguard 500 Index Fund ETF',
      symbol: 'VOO', quantity: 2.5, avg_buy_price: 45000, invested_amount: 112500,
      statement_value: 120000, source: 'indmoney_us_stocks', created_at: '', updated_at: ''
    };
    expect(getHoldingMacroSplit(usStock)).toEqual({ equity: 100, debt: 0, gold: 0 });

    // 3. Conservative Hybrid Fund (25% Equity, 75% Debt)
    const conservativeHybrid: Holding = {
      id: 3, user_id: 1, asset_class: 'mutual_fund', name: 'Parag Parikh Conservative Hybrid Fund',
      category: 'Hybrid', sub_category: 'Conservative Hybrid', quantity: 100, avg_buy_price: 100,
      invested_amount: 10000, statement_value: 10000, source: 'groww_mf', created_at: '', updated_at: ''
    };
    expect(getHoldingMacroSplit(conservativeHybrid)).toEqual({ equity: 25, debt: 75, gold: 0 });

    // 4. SGB / Gold (100% Gold)
    const sgbHolding: Holding = {
      id: 4, user_id: 1, asset_class: 'sgb', name: '2.50% GOLDBONDS 2031-III',
      quantity: 10, avg_buy_price: 6000, invested_amount: 60000, statement_value: 80000,
      source: 'groww_stocks', created_at: '', updated_at: ''
    };
    expect(getHoldingMacroSplit(sgbHolding)).toEqual({ equity: 0, debt: 0, gold: 100 });
  });

  it('computes portfolio summary across Indian stocks, US stocks, mutual funds, SGBs and EPF', () => {
    const mockHoldings: Holding[] = [
      {
        id: 1, user_id: 1, asset_class: 'stock', name: 'Axis Bank',
        quantity: 15, avg_buy_price: 910.35, invested_amount: 13655.25,
        statement_price: 1255, statement_value: 18825, source: 'groww_stocks',
        created_at: '2026-08-27', updated_at: '2026-08-27',
      },
      {
        id: 2, user_id: 1, asset_class: 'us_stock', name: 'Vanguard 500 ETF (VOO)', symbol: 'VOO',
        quantity: 2, avg_buy_price: 50000, invested_amount: 100000,
        statement_price: 55000, statement_value: 110000, source: 'indmoney_us_stocks',
        created_at: '2026-08-27', updated_at: '2026-08-27',
      },
      {
        id: 3, user_id: 1, asset_class: 'sgb', name: '2.50% GOLDBONDS 2031-III',
        quantity: 10, avg_buy_price: 6149, invested_amount: 61490,
        statement_price: 8000, statement_value: 80000, source: 'groww_stocks',
        created_at: '2026-08-27', updated_at: '2026-08-27',
      },
      {
        id: 4, user_id: 1, asset_class: 'epf', name: 'EPFO Passbook',
        quantity: 1, avg_buy_price: 30268, invested_amount: 30268,
        statement_value: 39517, source: 'epf_passbook',
        created_at: '2026-08-27', updated_at: '2026-08-27',
      },
    ];

    const summary = computePortfolioSummary(mockHoldings);

    // Total Net Worth: 18,825 + 1,10,000 + 80,000 + 39,517 = 2,48,342
    expect(summary.totalNetWorth).toBe(248342);
    expect(summary.macroBreakdown.equity.value).toBe(18825 + 110000); // 1,28,825
    expect(summary.macroBreakdown.debt.value).toBe(39517);
    expect(summary.macroBreakdown.gold.value).toBe(80000);
    expect(summary.assetClassBreakdown.us_stock.current).toBe(110000);
  });

  it('accurately calculates real-time gains for SGB holdings using NSE exchange price', () => {
    // SGB 2023-24 Series IV bought at issue price ₹6,213/g (10 grams = ₹62,130)
    // Live NSE Traded Price = ₹16,033.02/g (10 grams = ₹1,60,330.20)
    const sgbHolding: Holding = {
      id: 5, user_id: 1, asset_class: 'sgb', name: 'SGB 2023-24 Series IV (Feb 2032)',
      symbol: 'SGBFEB32IV', quantity: 10, avg_buy_price: 6213, invested_amount: 62130,
      statement_price: 6213, statement_value: 62130,
      live_price: 16033.02, live_value: 160330.20,
      unrealized_pnl: 98200.20, unrealized_pnl_percent: 158.056,
      source: 'manual', created_at: '2026-08-27', updated_at: '2026-08-27',
      metadata: { issue_series: '2023-24 Series IV', nse_symbol: 'SGBFEB32IV', live_sgb_price: 16033.02, coupon_rate: 2.5 }
    };

    const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(sgbHolding);
    expect(currentValue).toBe(160330.20);
    expect(pnl).toBe(98200.20);
    expect(pnlPercent).toBeCloseTo(158.056, 2);

    const summary = computePortfolioSummary([sgbHolding]);
    expect(summary.totalNetWorth).toBeCloseTo(160330.20, 2);
    expect(summary.macroBreakdown.gold.value).toBeCloseTo(160330.20, 2);
    expect(summary.assetClassBreakdown.sgb.gain).toBeCloseTo(98200.20, 2);
  });

  it('accurately maintains PPF passbook balance with manual deposits and March 31 interest credits without synthetic compounding', () => {
    // 1. Initial Deposit: ₹1,50,000 on 2025-04-05
    // 2. Subsequent Monthly Deposit: ₹25,000 on 2025-09-10
    // 3. Subsequent Lump Sum: ₹50,000 on 2026-01-15
    // Total Deposited Principal = 150000 + 25000 + 50000 = ₹2,25,000
    // 4. Manual Interest Credit on 2026-03-31 = +₹14,500
    // Total Passbook Balance = 225000 + 14500 = ₹2,39,500
    const ppfHolding: Holding = {
      id: 6,
      user_id: 1,
      asset_class: 'ppf',
      name: 'PPF Account (State Bank of India)',
      institution: 'State Bank of India',
      quantity: 1,
      avg_buy_price: 225000,
      invested_amount: 225000,
      statement_price: 239500,
      statement_value: 239500,
      live_price: 239500,
      live_value: 239500,
      unrealized_pnl: 14500,
      unrealized_pnl_percent: (14500 / 225000) * 100,
      source: 'manual',
      created_at: '2025-04-05',
      updated_at: '2026-03-31',
      metadata: {
        bank_name: 'State Bank of India',
        account_number: '1029384756',
        interest_rate: 7.1,
        ppf_transactions: [
          { id: '1', date: '2025-04-05', type: 'deposit', amount: 150000, note: 'Opening Deposit' },
          { id: '2', date: '2025-09-10', type: 'deposit', amount: 25000, note: 'Q2 Contribution' },
          { id: '3', date: '2026-01-15', type: 'deposit', amount: 50000, note: 'Bonus Deposit' },
          { id: '4', date: '2026-03-31', type: 'interest', amount: 14500, note: 'Annual Interest Credited FY 2025-26' },
        ],
      },
    };

    const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(ppfHolding);
    expect(currentValue).toBe(239500);
    expect(pnl).toBe(14500);
    expect(pnlPercent).toBeCloseTo(6.444, 2);

    const summary = computePortfolioSummary([ppfHolding]);
    expect(summary.totalNetWorth).toBe(239500);
    expect(summary.totalInvested).toBe(225000);
    expect(summary.totalGain).toBe(14500);
    expect(summary.macroBreakdown.debt.value).toBe(239500);
  });

  it('accurately accumulates multi-year EPFO interest credits across passbooks without overriding previous years', () => {
    // 2020-2021: Total Contributions = ₹9,400, Interest = ₹100 (Closing Balance = ₹9,500)
    // 2021-2022: Total Contributions = ₹28,201, Interest = ₹1,816 (Closing Balance = ₹39,517)
    // Combined Multi-Year Portfolio:
    // Total Invested = ₹37,601 (9400 + 28201)
    // All-time Interest Credited = ₹1,916 (100 + 1816)
    // Current Live Value = ₹39,517 (37601 + 1916)
    const multiYearEpf: Holding = {
      id: 7,
      user_id: 1,
      asset_class: 'epf',
      name: 'EPFO (BILLIONBRAINS GARAGE VENTURES LIMITED)',
      institution: 'BILLIONBRAINS GARAGE VENTURES LIMITED',
      quantity: 1,
      avg_buy_price: 37601,
      invested_amount: 37601,
      statement_price: 39517,
      statement_value: 39517,
      live_price: 39517,
      live_value: 39517,
      unrealized_pnl: 1916,
      unrealized_pnl_percent: (1916 / 37601) * 100,
      source: 'epf_passbook',
      created_at: '2026-08-27',
      updated_at: '2026-08-27',
      metadata: {
        uan: '101619658635',
        member_id: 'PYBOM17419810000010286',
        establishment_name: 'BILLIONBRAINS GARAGE VENTURES LIMITED',
        employee_share: 30268,
        employer_share: 9249,
        pension_share: 20000,
        total_interest: 1916,
        yearly_interest: {
          '2020-2021': { employee: 77, employer: 23, total: 100, date: '31/03/2021' },
          '2021-2022': { employee: 1391, employer: 425, total: 1816, date: '31/03/2022' },
        },
        financial_years_covered: ['2020-2021', '2021-2022'],
      },
    };

    const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(multiYearEpf);
    expect(currentValue).toBe(39517);
    expect(pnl).toBe(1916);
    expect(pnlPercent).toBeCloseTo(5.095, 2);

    const summary = computePortfolioSummary([multiYearEpf]);
    expect(summary.totalNetWorth).toBe(39517);
    expect(summary.totalInvested).toBe(37601);
    expect(summary.totalGain).toBe(1916);
    expect(summary.macroBreakdown.debt.value).toBe(39517);
  });

  it('correctly identifies market-rate vs fixed-income asset classes', () => {
    // Market rate based asset classes
    expect(isMarketRateAssetClass('stock')).toBe(true);
    expect(isMarketRateAssetClass('mutual_fund')).toBe(true);
    expect(isMarketRateAssetClass('us_stock')).toBe(true);
    expect(isMarketRateAssetClass('sgb')).toBe(true);
    expect(isMarketRateAssetClass('etf')).toBe(true);

    // Non-market rate asset classes (Fixed Income / Statutory)
    expect(isMarketRateAssetClass('epf')).toBe(false);
    expect(isMarketRateAssetClass('ppf')).toBe(false);
    expect(isMarketRateAssetClass('fd')).toBe(false);
  });

  it('safely parses diverse date and timestamp formats', () => {
    // ISO string
    const isoDate = parseDateSafe('2026-08-28T14:30:00.000Z');
    expect(isoDate).not.toBeNull();
    expect(isoDate?.getFullYear()).toBe(2026);

    // SQLite timestamp
    const sqlDate = parseDateSafe('2026-08-28 14:30:00');
    expect(sqlDate).not.toBeNull();
    expect(sqlDate?.getFullYear()).toBe(2026);

    // DD-MM-YYYY (Groww statement format)
    const ddmmyyyy = parseDateSafe('27-08-2026');
    expect(ddmmyyyy).not.toBeNull();
    expect(ddmmyyyy?.getDate()).toBe(27);
    expect(ddmmyyyy?.getMonth()).toBe(7); // 0-indexed August = 7
    expect(ddmmyyyy?.getFullYear()).toBe(2026);

    // YYYY-MM-DD
    const yyyymmdd = parseDateSafe('2026-08-26');
    expect(yyyymmdd).not.toBeNull();
    expect(yyyymmdd?.getDate()).toBe(26);
    expect(yyyymmdd?.getMonth()).toBe(7);

    // DD-MMM-YYYY (AMFI format)
    const amfiDate = parseDateSafe('27-Aug-2026');
    expect(amfiDate).not.toBeNull();
    expect(amfiDate?.getDate()).toBe(27);
    expect(amfiDate?.getMonth()).toBe(7);

    // Invalid input
    expect(parseDateSafe('')).toBeNull();
    expect(parseDateSafe(null)).toBeNull();
    expect(parseDateSafe('not-a-date')).toBeNull();
  });

  it('accurately determines holding price staleness levels (fresh, moderate, stale)', () => {
    const fixedNow = new Date('2026-08-28T14:30:00.000Z');

    // 1. Fresh Quote (10 minutes ago)
    const freshStock: Holding = {
      id: 10,
      user_id: 1,
      asset_class: 'stock',
      name: 'Reliance Industries',
      quantity: 10,
      avg_buy_price: 2800,
      invested_amount: 28000,
      live_price: 3000,
      live_value: 30000,
      source: 'groww_stocks',
      created_at: '2026-08-20',
      updated_at: '2026-08-28T14:20:00.000Z',
      metadata: {
        price_updated_at: '2026-08-28T14:20:00.000Z',
        price_source: 'NSE India',
      },
    };

    const freshInfo = getHoldingPriceUpdateInfo(freshStock, fixedNow);
    expect(freshInfo.isMarketRate).toBe(true);
    expect(freshInfo.staleness).toBe('fresh');
    expect(freshInfo.relativeTime).toBe('10m ago');
    expect(freshInfo.sourceLabel).toBe('NSE India');

    // 2. Moderate Quote (Yesterday's AMFI NAV)
    const yesterdayMf: Holding = {
      id: 11,
      user_id: 1,
      asset_class: 'mutual_fund',
      name: 'Parag Parikh Flexi Cap Fund',
      quantity: 100,
      avg_buy_price: 70,
      invested_amount: 7000,
      statement_price: 85.5,
      statement_value: 8550,
      live_price: 85.5,
      live_value: 8550,
      source: 'groww_mf',
      statement_date: '27-08-2026',
      created_at: '2026-08-20',
      updated_at: '2026-08-27',
      metadata: {
        price_updated_at: '27-08-2026',
        price_source: 'AMFI NAV',
      },
    };

    const moderateInfo = getHoldingPriceUpdateInfo(yesterdayMf, fixedNow);
    expect(moderateInfo.isMarketRate).toBe(true);
    expect(moderateInfo.staleness).toBe('moderate');
    expect(moderateInfo.relativeTime).toBe('Yesterday');
    expect(moderateInfo.sourceLabel).toBe('AMFI NAV');

    // 3. Stale Quote (Groww Statement from 5 days ago)
    const staleStock: Holding = {
      id: 12,
      user_id: 1,
      asset_class: 'stock',
      name: 'Infosys',
      quantity: 20,
      avg_buy_price: 1500,
      invested_amount: 30000,
      statement_price: 1800,
      statement_value: 36000,
      live_price: 1800,
      live_value: 36000,
      source: 'groww_stocks',
      statement_date: '23-08-2026',
      created_at: '2026-08-23',
      updated_at: '2026-08-23',
      metadata: {
        price_updated_at: '23-08-2026',
        price_source: 'Groww Statement',
      },
    };

    const staleInfo = getHoldingPriceUpdateInfo(staleStock, fixedNow);
    expect(staleInfo.isMarketRate).toBe(true);
    expect(staleInfo.staleness).toBe('stale');
    expect(staleInfo.relativeTime).toBe('5d ago');

    // 4. Non-Market Asset (PPF)
    const ppfHolding: Holding = {
      id: 13,
      user_id: 1,
      asset_class: 'ppf',
      name: 'PPF Account',
      quantity: 1,
      avg_buy_price: 150000,
      invested_amount: 150000,
      statement_price: 150000,
      statement_value: 150000,
      source: 'manual',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const ppfInfo = getHoldingPriceUpdateInfo(ppfHolding, fixedNow);
    expect(ppfInfo.isMarketRate).toBe(false);
    expect(ppfInfo.relativeTime).toBe('-');
  });

  it('aggregates asset class price update metadata and portfolio-wide market freshness in computePortfolioSummary', () => {
    const fixedNow = new Date('2026-08-28T14:30:00.000Z');

    const holdings: Holding[] = [
      {
        id: 1,
        user_id: 1,
        asset_class: 'stock',
        name: 'TCS',
        quantity: 5,
        avg_buy_price: 3500,
        invested_amount: 17500,
        live_price: 4200,
        live_value: 21000,
        source: 'groww_stocks',
        created_at: '2026-08-20',
        updated_at: '2026-08-28T14:15:00.000Z',
        metadata: {
          price_updated_at: '2026-08-28T14:15:00.000Z',
          price_source: 'NSE India',
        },
      },
      {
        id: 2,
        user_id: 1,
        asset_class: 'us_stock',
        name: 'Vanguard 500 ETF (VOO)',
        symbol: 'VOO',
        quantity: 2,
        avg_buy_price: 45000,
        invested_amount: 90000,
        live_price: 52000,
        live_value: 104000,
        source: 'indmoney_us_stocks',
        created_at: '2026-08-20',
        updated_at: '2026-08-28T14:25:00.000Z',
        metadata: {
          price_updated_at: '2026-08-28T14:25:00.000Z',
          price_source: 'Yahoo Finance',
        },
      },
      {
        id: 3,
        user_id: 1,
        asset_class: 'epf',
        name: 'EPFO Passbook',
        quantity: 1,
        avg_buy_price: 50000,
        invested_amount: 50000,
        statement_value: 55000,
        source: 'epf_passbook',
        created_at: '2026-08-20',
        updated_at: '2026-08-20',
      },
    ];

    const summary = computePortfolioSummary(holdings, fixedNow);

    // 1. Check Stock Breakdown Item
    const stockBreakdown = summary.assetClassBreakdown.stock;
    expect(stockBreakdown.isMarketRate).toBe(true);
    expect(stockBreakdown.priceUpdateInfo).not.toBeNull();
    expect(stockBreakdown.priceUpdateInfo?.staleness).toBe('fresh');
    expect(stockBreakdown.priceUpdateInfo?.relativeTime).toBe('15m ago');

    // 2. Check US Stock Breakdown Item
    const usStockBreakdown = summary.assetClassBreakdown.us_stock;
    expect(usStockBreakdown.isMarketRate).toBe(true);
    expect(usStockBreakdown.priceUpdateInfo?.relativeTime).toBe('5m ago');

    // 3. Check EPF Breakdown Item (non-market rate)
    const epfBreakdown = summary.assetClassBreakdown.epf;
    expect(epfBreakdown.isMarketRate).toBe(false);
    expect(epfBreakdown.priceUpdateInfo).toBeNull();

    // 4. Check Portfolio-Wide Market Freshness (should match the latest US stock update: 5m ago)
    expect(summary.lastMarketRefresh).toBe('2026-08-28T14:25:00.000Z');
    expect(summary.marketFreshnessInfo).not.toBeNull();
    expect(summary.marketFreshnessInfo?.relativeTime).toBe('5m ago');
    expect(summary.marketFreshnessInfo?.staleness).toBe('fresh');
  });
});

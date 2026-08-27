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
});

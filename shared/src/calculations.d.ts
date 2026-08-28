import { AssetClass, Holding, PortfolioSummary, PriceUpdateInfo } from './types';
export interface MacroSplit {
    equity: number;
    debt: number;
    gold: number;
}
/**
 * Format numbers according to Indian numbering system (Lakhs, Crores).
 * Example: 150000 -> ₹ 1,50,000 | 12500000 -> ₹ 1.25 Cr
 */
export declare function formatINR(amount: number | null | undefined, compact?: boolean): string;
export declare function formatUSD(amount: number | null | undefined): string;
export declare function formatPercent(percent: number | null | undefined, includeSign?: boolean): string;
/**
 * Formats a UTC ISO string or Date into user's local readable date and time.
 * Example: 2026-08-27T12:16:00.000Z -> "27 Aug 2026, 05:46 PM"
 */
export declare function formatLocalDateTime(dateInput?: string | Date | null): string;
/**
 * Formats a UTC ISO string or Date into user's local date.
 * Example: 2026-08-27T12:16:00.000Z -> "27 Aug 2026"
 */
export declare function formatLocalDate(dateInput?: string | Date | null): string;
/**
 * Formats a UTC ISO string or Date into user's local time only.
 * Example: "05:46 PM"
 */
export declare function formatLocalTime(dateInput?: string | Date | null): string;
/**
 * Returns the current (or given) date in local YYYY-MM-DD format (not UTC).
 */
export declare function getLocalTodayInputString(d?: Date): string;
/**
 * Asset classes that are priced dynamically based on financial market rates (Stocks, MF NAV, US Stocks, SGB, ETF).
 * Non-market asset classes include statutory fixed-income (EPF, PPF, Fixed Deposits).
 */
export declare const MARKET_RATE_ASSET_CLASSES: readonly AssetClass[];
/**
 * Check whether an asset class is valued using market rates.
 */
export declare function isMarketRateAssetClass(assetClass: AssetClass): boolean;
/**
 * Safely parses multiple date formats into a JavaScript Date object:
 * - ISO strings (2026-08-28T09:15:00.000Z)
 * - SQLite timestamps (2026-08-28 09:15:00)
 * - DD-MM-YYYY / DD/MM/YYYY (27-08-2026)
 * - YYYY-MM-DD (2026-08-27)
 * - DD-MMM-YYYY (27-Aug-2026)
 * - Millisecond timestamps
 */
export declare function parseDateSafe(input: any): Date | null;
/**
 * Calculates human-readable price staleness, relative time, and exact formatted date for a holding.
 */
export declare function getHoldingPriceUpdateInfo(h: Holding, now?: Date): PriceUpdateInfo;
/**
 * Returns aggregated price update freshness for an entire Asset Class.
 */
export declare function getAssetClassPriceUpdateInfo(holdings: Holding[], assetClass: AssetClass, now?: Date): PriceUpdateInfo | null;
/**
 * Computes exact underlying Macro Asset Class split (Equity, Debt, Gold)
 * with deep inspection of Mutual Fund categories, US Stocks, Indian Stocks, ETFs, and Fixed Income.
 */
export declare function getHoldingMacroSplit(h: Holding): MacroSplit;
/**
 * Calculate Fixed Deposit projected maturity amount at the end of tenure.
 * A = P * (1 + r / (n * 100))^(n * t)
 */
export declare function calculateFDMaturity(principal: number, annualInterestRate: number, tenureMonths: number, compoundingFrequency?: 'quarterly' | 'monthly' | 'cumulative' | 'simple'): {
    maturityAmount: number;
    totalInterest: number;
};
/**
 * Dynamically computes the real-time accrued value and interest of a Fixed Deposit
 * as of today based on elapsed days since deposit start date.
 * If opened today -> currentValue = principal, accruedInterest = 0.
 */
export declare function calculateAccruedFD(principal: number, annualInterestRate: number, startDateStr?: string, tenureMonths?: number, compoundingFrequency?: 'quarterly' | 'monthly' | 'cumulative' | 'simple', asOfDate?: Date): {
    currentValue: number;
    accruedInterest: number;
    isMatured: boolean;
    daysElapsed: number;
};
/**
 * Checks if a Fixed Deposit is matured (either explicitly flagged or past maturity date).
 */
export declare function isMaturedFD(h: Holding): boolean;
/**
 * Calculates current dynamic value and returns for any holding.
 */
export declare function getHoldingLiveValue(h: Holding): {
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    isMatured: boolean;
};
/**
 * Computes portfolio summary and aggregations from active holdings
 */
export declare function computePortfolioSummary(holdings: Holding[], now?: Date): PortfolioSummary;

import { Holding, PortfolioSummary } from './types';
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
export declare function computePortfolioSummary(holdings: Holding[]): PortfolioSummary;

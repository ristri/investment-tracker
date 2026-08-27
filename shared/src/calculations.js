/**
 * Format numbers according to Indian numbering system (Lakhs, Crores).
 * Example: 150000 -> ₹ 1,50,000 | 12500000 -> ₹ 1.25 Cr
 */
export function formatINR(amount, compact = false) {
    if (amount === null || amount === undefined || isNaN(amount))
        return '₹0.00';
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    if (compact) {
        if (absAmount >= 10000000) {
            return `${isNegative ? '-' : ''}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        }
        if (absAmount >= 100000) {
            return `${isNegative ? '-' : ''}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        if (absAmount >= 1000) {
            return `${isNegative ? '-' : ''}₹${(absAmount / 1000).toFixed(1)} k`;
        }
    }
    const parts = absAmount.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    // Indian currency formatting regex
    if (integerPart.length > 3) {
        const lastThree = integerPart.substring(integerPart.length - 3);
        const otherNumbers = integerPart.substring(0, integerPart.length - 3);
        integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    return `${isNegative ? '-' : ''}₹${integerPart}.${decimalPart}`;
}
export function formatUSD(amount) {
    if (amount === null || amount === undefined || isNaN(amount))
        return '$0.00';
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return `${isNegative ? '-' : ''}$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function formatPercent(percent, includeSign = true) {
    if (percent === null || percent === undefined || isNaN(percent))
        return '0.00%';
    const sign = includeSign && percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
}
/**
 * Formats a UTC ISO string or Date into user's local readable date and time.
 * Example: 2026-08-27T12:16:00.000Z -> "27 Aug 2026, 05:46 PM"
 */
export function formatLocalDateTime(dateInput) {
    if (!dateInput)
        return '-';
    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime()))
            return String(dateInput);
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }
    catch {
        return String(dateInput);
    }
}
/**
 * Formats a UTC ISO string or Date into user's local date.
 * Example: 2026-08-27T12:16:00.000Z -> "27 Aug 2026"
 */
export function formatLocalDate(dateInput) {
    if (!dateInput)
        return '-';
    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime()))
            return String(dateInput);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
    catch {
        return String(dateInput);
    }
}
/**
 * Formats a UTC ISO string or Date into user's local time only.
 * Example: "05:46 PM"
 */
export function formatLocalTime(dateInput) {
    if (!dateInput)
        return '-';
    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime()))
            return String(dateInput);
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }
    catch {
        return String(dateInput);
    }
}
/**
 * Returns the current (or given) date in local YYYY-MM-DD format (not UTC).
 */
export function getLocalTodayInputString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Computes exact underlying Macro Asset Class split (Equity, Debt, Gold)
 * with deep inspection of Mutual Fund categories, US Stocks, Indian Stocks, ETFs, and Fixed Income.
 */
export function getHoldingMacroSplit(h) {
    const nameLower = (h.name || '').toLowerCase();
    const catLower = (h.category || '').toLowerCase();
    const subCatLower = (h.sub_category || '').toLowerCase();
    // 1. Gold / Precious Metals / Commodities / SGB
    if (h.asset_class === 'sgb' ||
        nameLower.includes('gold') ||
        nameLower.includes('silver') ||
        catLower.includes('commodity') ||
        subCatLower.includes('gold')) {
        return { equity: 0, debt: 0, gold: 100 };
    }
    // 2. Fixed Income & Retirement (EPF, PPF, Fixed Deposits)
    if (h.asset_class === 'epf' || h.asset_class === 'ppf' || h.asset_class === 'fd') {
        return { equity: 0, debt: 100, gold: 0 };
    }
    // 3. US Stocks & ETFs (100% Equity / Global Equities)
    if (h.asset_class === 'us_stock') {
        return { equity: 100, debt: 0, gold: 0 };
    }
    // 4. Direct Indian Stocks (100% Equity)
    if (h.asset_class === 'stock') {
        return { equity: 100, debt: 0, gold: 0 };
    }
    // 5. ETFs
    if (h.asset_class === 'etf') {
        if (nameLower.includes('liquid') ||
            nameLower.includes('gilt') ||
            nameLower.includes('debt') ||
            nameLower.includes('bond') ||
            nameLower.includes('bharat bond')) {
            return { equity: 0, debt: 100, gold: 0 };
        }
        return { equity: 100, debt: 0, gold: 0 };
    }
    // 6. Mutual Funds (Deep category inspection)
    if (h.asset_class === 'mutual_fund') {
        // Pure Debt / Fixed Income schemes
        if (catLower.includes('debt') ||
            subCatLower.includes('liquid') ||
            subCatLower.includes('overnight') ||
            subCatLower.includes('money market') ||
            subCatLower.includes('corporate bond') ||
            subCatLower.includes('banking and psu') ||
            subCatLower.includes('gilt') ||
            subCatLower.includes('credit risk') ||
            subCatLower.includes('floater') ||
            subCatLower.includes('duration')) {
            return { equity: 0, debt: 100, gold: 0 };
        }
        // Arbitrage Funds (100% Debt/Cash equivalent under SEBI taxation & risk)
        if (subCatLower.includes('arbitrage') || nameLower.includes('arbitrage')) {
            return { equity: 0, debt: 100, gold: 0 };
        }
        // Hybrid Schemes
        if (catLower.includes('hybrid') || subCatLower.includes('hybrid') || catLower.includes('solution')) {
            if (subCatLower.includes('conservative')) {
                // Conservative Hybrid: 25% Equity, 75% Debt
                return { equity: 25, debt: 75, gold: 0 };
            }
            if (subCatLower.includes('aggressive')) {
                // Aggressive Hybrid: 70% Equity, 30% Debt
                return { equity: 70, debt: 30, gold: 0 };
            }
            if (subCatLower.includes('dynamic') || subCatLower.includes('balanced advantage')) {
                // Balanced Advantage / BAF: ~60% Equity, ~40% Debt
                return { equity: 60, debt: 40, gold: 0 };
            }
            if (subCatLower.includes('multi asset')) {
                // Multi Asset Allocation: 60% Equity, 25% Debt, 15% Gold
                return { equity: 60, debt: 25, gold: 15 };
            }
            if (subCatLower.includes('equity savings')) {
                // Equity Savings: ~35% Net Equity, ~65% Debt & Arbitrage
                return { equity: 35, debt: 65, gold: 0 };
            }
            // General Hybrid Default
            return { equity: 65, debt: 35, gold: 0 };
        }
        // Pure Equity Schemes (Large Cap, Mid Cap, Small Cap, Flexi Cap, Sectoral, International, ELSS, Index, etc.)
        return { equity: 100, debt: 0, gold: 0 };
    }
    return { equity: 100, debt: 0, gold: 0 };
}
/**
 * Calculate Fixed Deposit projected maturity amount at the end of tenure.
 * A = P * (1 + r / (n * 100))^(n * t)
 */
export function calculateFDMaturity(principal, annualInterestRate, tenureMonths, compoundingFrequency = 'quarterly') {
    const t = tenureMonths / 12;
    let n = 4; // quarterly
    if (compoundingFrequency === 'monthly')
        n = 12;
    if (compoundingFrequency === 'simple') {
        const interest = (principal * annualInterestRate * t) / 100;
        return {
            maturityAmount: Math.round(principal + interest),
            totalInterest: Math.round(interest),
        };
    }
    const r = annualInterestRate / 100;
    const maturityAmount = principal * Math.pow(1 + r / n, n * t);
    const totalInterest = maturityAmount - principal;
    return {
        maturityAmount: Math.round(maturityAmount),
        totalInterest: Math.round(totalInterest),
    };
}
/**
 * Dynamically computes the real-time accrued value and interest of a Fixed Deposit
 * as of today based on elapsed days since deposit start date.
 * If opened today -> currentValue = principal, accruedInterest = 0.
 */
export function calculateAccruedFD(principal, annualInterestRate, startDateStr, tenureMonths = 12, compoundingFrequency = 'quarterly', asOfDate = new Date()) {
    if (!principal || principal <= 0) {
        return { currentValue: 0, accruedInterest: 0, isMatured: false, daysElapsed: 0 };
    }
    const start = startDateStr ? new Date(startDateStr) : asOfDate;
    if (isNaN(start.getTime())) {
        return { currentValue: principal, accruedInterest: 0, isMatured: false, daysElapsed: 0 };
    }
    const now = new Date(asOfDate);
    // Set times to midnight for date diff
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = todayDay.getTime() - startDay.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const totalTenureDays = Math.max(1, Math.round((tenureMonths / 12) * 365.25));
    const isMatured = daysElapsed >= totalTenureDays;
    // If opened today or future, current value is exactly the principal without interest
    if (daysElapsed <= 0) {
        return {
            currentValue: principal,
            accruedInterest: 0,
            isMatured: false,
            daysElapsed: 0,
        };
    }
    // Capped elapsed time in years (if matured, capped at tenure)
    const elapsedYears = Math.min(daysElapsed / 365.25, tenureMonths / 12);
    const r = annualInterestRate / 100;
    if (compoundingFrequency === 'simple') {
        const accrued = principal * r * elapsedYears;
        return {
            currentValue: Math.round((principal + accrued) * 100) / 100,
            accruedInterest: Math.round(accrued * 100) / 100,
            isMatured,
            daysElapsed,
        };
    }
    let n = 4; // quarterly
    if (compoundingFrequency === 'monthly')
        n = 12;
    if (compoundingFrequency === 'cumulative')
        n = 1;
    const accruedVal = principal * Math.pow(1 + r / n, n * elapsedYears);
    const accruedInterest = Math.max(0, accruedVal - principal);
    return {
        currentValue: Math.round(accruedVal * 100) / 100,
        accruedInterest: Math.round(accruedInterest * 100) / 100,
        isMatured,
        daysElapsed,
    };
}
/**
 * Checks if a Fixed Deposit is matured (either explicitly flagged or past maturity date).
 */
export function isMaturedFD(h) {
    if (h.asset_class !== 'fd')
        return false;
    if (h.metadata?.is_matured === true)
        return true;
    if (h.metadata?.maturity_date) {
        try {
            const matDate = new Date(h.metadata.maturity_date);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (matDate.getTime() < now.getTime()) {
                return true;
            }
        }
        catch { }
    }
    return false;
}
/**
 * Calculates current dynamic value and returns for any holding.
 */
export function getHoldingLiveValue(h) {
    const isMatured = isMaturedFD(h);
    if (h.asset_class === 'fd') {
        if (isMatured) {
            return { currentValue: 0, pnl: 0, pnlPercent: 0, isMatured: true };
        }
        const principal = h.metadata?.principal ?? h.invested_amount;
        const rate = h.metadata?.interest_rate ?? 7.0;
        const startDate = h.metadata?.start_date ?? h.statement_date ?? h.created_at;
        const tenure = h.metadata?.tenure_months ?? 12;
        const comp = h.metadata?.compounding_frequency ?? 'quarterly';
        const accrued = calculateAccruedFD(principal, rate, startDate, tenure, comp);
        const pnl = accrued.accruedInterest;
        const pnlPercent = principal > 0 ? (pnl / principal) * 100 : 0;
        return {
            currentValue: accrued.currentValue,
            pnl,
            pnlPercent,
            isMatured: accrued.isMatured,
        };
    }
    let currentVal = h.live_value ?? h.statement_value;
    if (currentVal === null || currentVal === undefined) {
        const price = h.live_price ?? h.statement_price ?? h.avg_buy_price;
        currentVal = h.quantity * price;
    }
    if (currentVal === null || currentVal === undefined || isNaN(currentVal)) {
        currentVal = h.invested_amount;
    }
    const pnl = h.unrealized_pnl ?? (currentVal - h.invested_amount);
    const pnlPercent = h.unrealized_pnl_percent ?? (h.invested_amount > 0 ? (pnl / h.invested_amount) * 100 : 0);
    return {
        currentValue: currentVal,
        pnl,
        pnlPercent,
        isMatured: false,
    };
}
/**
 * Computes portfolio summary and aggregations from active holdings
 */
export function computePortfolioSummary(holdings) {
    const assetClasses = ['stock', 'mutual_fund', 'us_stock', 'sgb', 'etf', 'epf', 'ppf', 'fd'];
    const assetClassBreakdown = {};
    for (const ac of assetClasses) {
        assetClassBreakdown[ac] = {
            invested: 0,
            current: 0,
            gain: 0,
            gainPercent: 0,
            count: 0,
            allocationPercent: 0,
        };
    }
    let totalNetWorth = 0;
    let totalInvested = 0;
    let equityVal = 0;
    let debtVal = 0;
    let goldVal = 0;
    for (const h of holdings) {
        const { currentValue, isMatured } = getHoldingLiveValue(h);
        const investedVal = h.invested_amount;
        // Matured Fixed Deposits are excluded from active Net Worth and active category balances
        if (isMatured) {
            const breakdown = assetClassBreakdown[h.asset_class];
            if (breakdown) {
                breakdown.count += 1;
            }
            continue;
        }
        totalNetWorth += currentValue;
        totalInvested += investedVal;
        const breakdown = assetClassBreakdown[h.asset_class];
        if (breakdown) {
            breakdown.invested += investedVal;
            breakdown.current += currentValue;
            breakdown.count += 1;
        }
        // Precise Macro Asset Allocation split
        const split = getHoldingMacroSplit(h);
        equityVal += currentValue * (split.equity / 100);
        debtVal += currentValue * (split.debt / 100);
        goldVal += currentValue * (split.gold / 100);
    }
    // Calculate gains and allocations
    for (const ac of assetClasses) {
        const item = assetClassBreakdown[ac];
        item.gain = item.current - item.invested;
        item.gainPercent = item.invested > 0 ? (item.gain / item.invested) * 100 : 0;
        item.allocationPercent = totalNetWorth > 0 ? (item.current / totalNetWorth) * 100 : 0;
    }
    const totalGain = totalNetWorth - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
    const macroBreakdown = {
        equity: {
            value: equityVal,
            percentage: totalNetWorth > 0 ? (equityVal / totalNetWorth) * 100 : 0,
        },
        debt: {
            value: debtVal,
            percentage: totalNetWorth > 0 ? (debtVal / totalNetWorth) * 100 : 0,
        },
        gold: {
            value: goldVal,
            percentage: totalNetWorth > 0 ? (goldVal / totalNetWorth) * 100 : 0,
        },
    };
    return {
        totalNetWorth,
        totalInvested,
        totalGain,
        totalGainPercent,
        assetClassBreakdown,
        macroBreakdown,
        holdingCount: holdings.length,
    };
}

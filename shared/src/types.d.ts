export type AssetClass = 'stock' | 'mutual_fund' | 'us_stock' | 'sgb' | 'etf' | 'epf' | 'ppf' | 'fd';
export type MacroAssetClass = 'equity' | 'debt' | 'gold';
export type HoldingSource = 'groww_stocks' | 'groww_mf' | 'epf_passbook' | 'epf_pdf' | 'indmoney_us_stocks' | 'us_stocks' | 'manual' | 'bank';
export interface User {
    id: number;
    username: string;
    created_at: string;
}
export interface JWTPayload {
    userId: number;
    username: string;
    exp?: number;
}
export type D1DatabaseBinding = any;
export interface Env {
    investment_tracker_db: D1DatabaseBinding;
    JWT_SECRET?: string;
}
export interface EpfMonthlyTransaction {
    wage_month: string;
    transaction_date?: string;
    type?: string;
    particulars?: string;
    epf_wages?: number;
    eps_wages?: number;
    employee_share: number;
    employer_share: number;
    pension_share: number;
}
export interface PpfTransaction {
    id: string;
    date: string;
    type: 'deposit' | 'interest';
    amount: number;
    note?: string;
    running_balance?: number;
}
export interface HoldingMetadata {
    currency?: 'USD' | 'INR';
    usd_inr_rate?: number;
    price_usd?: number;
    invested_usd?: number;
    value_usd?: number;
    broker_name?: string;
    broker_account?: string;
    holding_since?: string;
    issue_series?: string;
    issue_price_per_gram?: number;
    live_sgb_price?: number;
    nse_symbol?: string;
    coupon_rate?: number;
    issue_date?: string;
    uan?: string;
    member_id?: string;
    establishment_name?: string;
    employee_share?: number;
    employer_share?: number;
    pension_share?: number;
    employee_interest?: number;
    employer_interest?: number;
    total_interest?: number;
    interest_updated_date?: string;
    yearly_interest?: Record<string, {
        employee: number;
        employer: number;
        total: number;
        date?: string;
    }>;
    financial_year?: string;
    financial_years_covered?: string[];
    monthly_transactions?: EpfMonthlyTransaction[];
    include_pension_in_net_worth?: boolean;
    account_number?: string;
    bank_name?: string;
    annual_deposit?: number;
    interest_rate?: number;
    opening_date?: string;
    maturity_date?: string;
    principal?: number;
    start_date?: string;
    tenure_months?: number;
    compounding_frequency?: 'quarterly' | 'monthly' | 'cumulative' | 'simple';
    maturity_amount?: number;
    is_matured?: boolean;
    ppf_transactions?: PpfTransaction[];
    notes?: string;
    price_updated_at?: string;
    price_source?: string;
}
export interface Holding {
    id: number;
    user_id: number;
    asset_class: AssetClass;
    symbol?: string | null;
    name: string;
    isin?: string | null;
    folio_or_account_number?: string | null;
    institution?: string | null;
    category?: string | null;
    sub_category?: string | null;
    quantity: number;
    avg_buy_price: number;
    invested_amount: number;
    statement_price?: number | null;
    statement_value?: number | null;
    live_price?: number | null;
    live_value?: number | null;
    unrealized_pnl?: number | null;
    unrealized_pnl_percent?: number | null;
    xirr?: number | null;
    source: HoldingSource;
    statement_date?: string | null;
    price_updated_at?: string | null;
    metadata?: HoldingMetadata;
    metadata_json?: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreateHoldingInput {
    asset_class: AssetClass;
    symbol?: string;
    name: string;
    isin?: string;
    folio_or_account_number?: string;
    institution?: string;
    category?: string;
    sub_category?: string;
    quantity: number;
    avg_buy_price: number;
    invested_amount: number;
    statement_price?: number;
    statement_value?: number;
    live_price?: number;
    live_value?: number;
    unrealized_pnl?: number;
    unrealized_pnl_percent?: number;
    xirr?: number;
    source: HoldingSource;
    statement_date?: string;
    metadata?: HoldingMetadata;
}
export interface BatchImportRequest {
    source_type: 'groww_stocks' | 'groww_mf' | 'epf_passbook' | 'epf_pdf' | 'indmoney_us_stocks' | 'us_stocks';
    file_name: string;
    statement_date?: string;
    replace_existing_source?: boolean;
    holdings: CreateHoldingInput[];
}
export interface NetWorthSnapshot {
    id: number;
    user_id: number;
    snapshot_date: string;
    title: string;
    notes?: string | null;
    total_net_worth: number;
    total_invested: number;
    total_unrealized_pnl: number;
    total_pnl_percent: number;
    stocks_value: number;
    mutual_funds_value: number;
    us_stocks_value: number;
    sgb_value: number;
    etf_value: number;
    epf_value: number;
    ppf_value: number;
    fd_value: number;
    breakdown_json: string;
    created_at: string;
}
export interface CreateSnapshotInput {
    title?: string;
    notes?: string;
    snapshot_date?: string;
}
export type PriceStaleness = 'fresh' | 'moderate' | 'stale';
export interface PriceUpdateInfo {
    timestamp: string | null;
    relativeTime: string;
    formattedExact: string;
    staleness: PriceStaleness;
    sourceLabel: string;
    isMarketRate: boolean;
}
export interface AssetClassBreakdownItem {
    invested: number;
    current: number;
    gain: number;
    gainPercent: number;
    count: number;
    allocationPercent: number;
    isMarketRate: boolean;
    priceUpdatedAt?: string | null;
    priceUpdateInfo?: PriceUpdateInfo | null;
}
export interface PortfolioSummary {
    totalNetWorth: number;
    totalInvested: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange?: number;
    dayChangePercent?: number;
    assetClassBreakdown: Record<AssetClass, AssetClassBreakdownItem>;
    macroBreakdown: Record<MacroAssetClass, {
        value: number;
        percentage: number;
    }>;
    lastSnapshot?: NetWorthSnapshot | null;
    holdingCount: number;
    lastMarketRefresh?: string | null;
    marketFreshnessInfo?: PriceUpdateInfo | null;
}
export interface MarketQuote {
    symbolOrCode: string;
    name?: string;
    price: number;
    previousClose?: number;
    change?: number;
    changePercent?: number;
    updatedAt: string;
    source: 'amfi' | 'yahoo' | 'statement_fallback';
    currency?: 'INR' | 'USD';
}

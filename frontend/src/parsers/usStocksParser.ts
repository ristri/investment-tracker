import { CreateHoldingInput, getLocalTodayInputString } from '@investment-tracker/shared';
import * as XLSX from 'xlsx';

export interface ParsedUsStocksReport {
  brokerName?: string;
  brokerAccount?: string;
  statementDate?: string;
  usdInrRate: number;
  totalValueUsd: number;
  totalValueInr: number;
  holdings: CreateHoldingInput[];
}

export const US_TICKER_DIRECTORY: Record<string, { name: string; category: string; sub_category: string; description: string }> = {
  // Top US Index ETFs
  VOO: { name: 'Vanguard 500 Index Fund ETF', category: 'US ETF', sub_category: 'S&P 500 Large-Cap Index', description: 'Tracks the 500 largest US public companies (Apple, Microsoft, Nvidia, Amazon, etc.)' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', category: 'US ETF', sub_category: 'S&P 500 Large-Cap Index', description: 'World’s most liquid S&P 500 tracking ETF' },
  IVV: { name: 'iShares Core S&P 500 ETF', category: 'US ETF', sub_category: 'S&P 500 Large-Cap Index', description: 'Low-cost core S&P 500 index ETF' },
  QQQ: { name: 'Invesco QQQ Trust ETF', category: 'US ETF', sub_category: 'NASDAQ-100 Tech Index', description: 'Tracks the 100 largest non-financial innovators on the NASDAQ' },
  QQQM: { name: 'Invesco NASDAQ 100 ETF (Micro)', category: 'US ETF', sub_category: 'NASDAQ-100 Tech Index', description: 'Lower expense ratio version of QQQ ideal for retail buy-and-hold investors' },
  VTI: { name: 'Vanguard Total Stock Market ETF', category: 'US ETF', sub_category: 'Total US Equities', description: 'Entire US stock market across large, mid, and small cap equities' },
  VT: { name: 'Vanguard Total World Stock ETF', category: 'US ETF', sub_category: 'Global Equities', description: 'Global all-cap ETF tracking 9,800+ stocks across 45+ countries' },
  SCHD: { name: 'Schwab U.S. Dividend Equity ETF', category: 'US ETF', sub_category: 'Dividend Growth', description: 'High quality 100 US dividend-paying companies' },
  SMH: { name: 'VanEck Semiconductor ETF', category: 'US ETF', sub_category: 'Semiconductors / AI Hardware', description: '25 largest global semiconductor leaders (NVDA, TSM, ASML, AVGO)' },
  XLK: { name: 'Technology Select Sector SPDR', category: 'US ETF', sub_category: 'US Information Tech', description: 'S&P 500 pure technology sector companies' },
  DIA: { name: 'SPDR Dow Jones Industrial Average ETF', category: 'US ETF', sub_category: 'Mega-Cap Industrials', description: '30 prominent blue-chip US companies' },
  IWM: { name: 'iShares Russell 2000 ETF', category: 'US ETF', sub_category: 'US Small-Cap', description: '2,000 small-cap US companies' },

  // Megacap US Tech & Equities
  AAPL: { name: 'Apple Inc.', category: 'US Stock', sub_category: 'Consumer Electronics / Services', description: 'iPhone, Mac, Services ecosystem' },
  MSFT: { name: 'Microsoft Corporation', category: 'US Stock', sub_category: 'Enterprise Software / Azure Cloud', description: 'Windows, Azure Cloud, Office 365, and AI platforms' },
  NVDA: { name: 'NVIDIA Corporation', category: 'US Stock', sub_category: 'AI GPUs & Accelerated Computing', description: 'Global leader in AI hardware and GPU computing' },
  GOOGL: { name: 'Alphabet Inc. (Class A)', category: 'US Stock', sub_category: 'Digital Advertising / Cloud', description: 'Google Search, YouTube, Android, Google Cloud, Waymo' },
  GOOG: { name: 'Alphabet Inc. (Class C)', category: 'US Stock', sub_category: 'Digital Advertising / Cloud', description: 'Alphabet non-voting class C shares' },
  AMZN: { name: 'Amazon.com Inc.', category: 'US Stock', sub_category: 'E-Commerce & AWS Cloud', description: 'Global e-commerce leader and largest cloud infrastructure provider (AWS)' },
  TSLA: { name: 'Tesla Inc.', category: 'US Stock', sub_category: 'Electric Vehicles & Clean Energy', description: 'Autonomous driving, EV manufacturing, Megapack energy storage, and robotics' },
  META: { name: 'Meta Platforms Inc.', category: 'US Stock', sub_category: 'Social Networks & Generative AI', description: 'Instagram, WhatsApp, Facebook, Quest VR, and Llama open-source AI' },
  BRK_B: { name: 'Berkshire Hathaway Inc. (Class B)', category: 'US Stock', sub_category: 'Diversified Conglomerate', description: 'Warren Buffett’s investment conglomerate spanning insurance, energy, and rails' },
  AVGO: { name: 'Broadcom Inc.', category: 'US Stock', sub_category: 'Semiconductors & Infrastructure Software', description: 'Custom AI ASICs, networking chips, and VMware enterprise software' },
  LLY: { name: 'Eli Lilly and Company', category: 'US Stock', sub_category: 'Healthcare & Pharmaceuticals', description: 'Global leader in diabetes, GLP-1 weight-loss, and oncology therapeutics' },
  JPM: { name: 'JPMorgan Chase & Co.', category: 'US Stock', sub_category: 'Commercial & Investment Banking', description: 'Largest bank in the United States' },
  AMD: { name: 'Advanced Micro Devices Inc.', category: 'US Stock', sub_category: 'Semiconductors (CPUs & GPUs)', description: 'Ryzen processors, EPYC server chips, and Instinct AI accelerators' },
  PLTR: { name: 'Palantir Technologies Inc.', category: 'US Stock', sub_category: 'Enterprise AI & Data Analytics', description: 'Gotham, Foundry, and Artificial Intelligence Platform (AIP)' },
  NFLX: { name: 'Netflix Inc.', category: 'US Stock', sub_category: 'Streaming Entertainment', description: 'Global subscription video streaming pioneer' },
};

export async function parseUsStocksExcel(
  file: File | ArrayBuffer,
  usdInrRate: number = 88.0
): Promise<ParsedUsStocksReport> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Look for HOLDINGS_BOOK or first sheet
  const sheetName = workbook.SheetNames.find((s) => s.toUpperCase().includes('HOLDINGS')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  let brokerName = 'US Broker';
  let brokerAccount = '';
  let statementDate = '';
  let headerRowIndex = -1;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (firstCell === 'Broker Name' && row[1]) {
      brokerName = String(row[1]).trim();
    }
    if (firstCell === 'Broker Account' && row[1]) {
      brokerAccount = String(row[1]).trim();
    }
    if (firstCell === 'Holdings as on' && row[1]) {
      statementDate = String(row[1]).trim();
    }

    if (
      firstCell === 'Stock Symbol' ||
      firstCell.toLowerCase().includes('symbol') ||
      firstCell.toLowerCase().includes('ticker')
    ) {
      headerRowIndex = i;
    }
  }

  if (headerRowIndex === -1) {
    // Default to searching row with 'VOO' or stock-like tickers if header is missing
    headerRowIndex = rawRows.findIndex(
      (r) => r && r[0] && ['VOO', 'QQQ', 'QQQM', 'AAPL', 'MSFT', 'NVDA'].includes(String(r[0]).trim().toUpperCase())
    ) - 1;
    if (headerRowIndex < -1) headerRowIndex = 6;
  }

  const holdings: CreateHoldingInput[] = [];
  let totalValueUsd = 0;

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawSymbol = String(row[0] || '').trim().toUpperCase();
    if (!rawSymbol || rawSymbol.includes('DISCLAIMER') || rawSymbol.startsWith('*')) {
      break;
    }

    const holdingSince = row[1] ? String(row[1]).trim() : undefined;
    const quantity = parseFloat(String(row[2]).replace(/,/g, '')) || 0;
    const avgPriceUsd = parseFloat(String(row[3]).replace(/,/g, '')) || 0;
    const totalValUsd = parseFloat(String(row[4]).replace(/,/g, '')) || (quantity * avgPriceUsd);

    if (quantity <= 0) continue;

    totalValueUsd += totalValUsd;

    const knownInfo = US_TICKER_DIRECTORY[rawSymbol] || US_TICKER_DIRECTORY[rawSymbol.replace('.', '_')];
    const displayName = knownInfo?.name || `${rawSymbol} (US Equity)`;
    const category = knownInfo?.category || (rawSymbol.length <= 4 && (rawSymbol.startsWith('Q') || rawSymbol.startsWith('V') || rawSymbol.startsWith('S') || rawSymbol.startsWith('I') || rawSymbol.startsWith('X')) ? 'US ETF' : 'US Stock');
    const subCategory = knownInfo?.sub_category || 'Global Equities';

    // INR conversions
    const investedInr = totalValUsd * usdInrRate;
    const avgBuyPriceInr = avgPriceUsd * usdInrRate;

    const holding: CreateHoldingInput = {
      asset_class: 'us_stock',
      symbol: rawSymbol,
      name: displayName,
      folio_or_account_number: brokerAccount || undefined,
      institution: brokerName || 'Alpaca US',
      category,
      sub_category: subCategory,
      quantity,
      avg_buy_price: avgBuyPriceInr,
      invested_amount: investedInr,
      statement_price: avgBuyPriceInr,
      statement_value: investedInr,
      live_price: avgBuyPriceInr,
      live_value: investedInr,
      unrealized_pnl: 0,
      unrealized_pnl_percent: 0,
      source: 'indmoney_us_stocks',
      statement_date: statementDate || getLocalTodayInputString(),
      metadata: {
        currency: 'USD',
        usd_inr_rate: usdInrRate,
        price_usd: avgPriceUsd,
        invested_usd: totalValUsd,
        value_usd: totalValUsd,
        broker_name: brokerName,
        broker_account: brokerAccount,
        holding_since: holdingSince,
        notes: knownInfo?.description,
        price_updated_at: statementDate || getLocalTodayInputString(),
        price_source: brokerName || 'IndMoney US',
      },
    };

    holdings.push(holding);
  }

  const totalValueInr = totalValueUsd * usdInrRate;

  return {
    brokerName,
    brokerAccount,
    statementDate,
    usdInrRate,
    totalValueUsd,
    totalValueInr,
    holdings,
  };
}

import * as XLSX from 'xlsx';
import { CreateHoldingInput, AssetClass } from '@investment-tracker/shared';

export interface ParsedStocksReport {
  statementDate?: string;
  clientCode?: string;
  totalInvested?: number;
  totalClosingValue?: number;
  totalUnrealizedPnl?: number;
  holdings: CreateHoldingInput[];
}

export async function parseGrowwStocksExcel(file: File | ArrayBuffer): Promise<ParsedStocksReport> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true });

  let statementDate: string | undefined = undefined;
  let clientCode: string | undefined = undefined;
  let headerRowIndex = -1;

  // Scan metadata
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i] || [];
    const text0 = String(row[0] || '').trim();
    const text1 = String(row[1] || '').trim();

    if (text0.toLowerCase().includes('unique client code')) {
      clientCode = text1;
    }
    if (text0.toLowerCase().includes('holdings statement for stocks as on')) {
      const match = text0.match(/as on\s+([0-9]{2}-[0-9]{2}-[0-9]{4})/i);
      if (match) {
        statementDate = match[1];
      }
    }
    if (text0.toLowerCase().includes('stock name') || text0.toLowerCase().includes('isin')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: look for row where ISIN or Stock Name appears
    headerRowIndex = rows.findIndex(r => r && r.some((c: any) => String(c).toLowerCase().includes('stock name')));
  }

  if (headerRowIndex === -1) {
    throw new Error('Unable to find table headers in Groww Stocks Statement');
  }

  const headers = rows[headerRowIndex].map((c: any) => String(c).trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes('stock name') || h.includes('company') || h.includes('name'));
  const isinIdx = headers.findIndex(h => h.includes('isin'));
  const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
  const avgPriceIdx = headers.findIndex(h => h.includes('average buy price') || h.includes('buy price'));
  const buyValIdx = headers.findIndex(h => h.includes('buy value') || h.includes('invested'));
  const closePriceIdx = headers.findIndex(h => h.includes('closing price') || h.includes('ltp') || h.includes('market price'));
  const closeValIdx = headers.findIndex(h => h.includes('closing value') || h.includes('current value'));
  const pnlIdx = headers.findIndex(h => h.includes('unrealised p&l') || h.includes('p&l') || h.includes('returns'));

  const holdings: CreateHoldingInput[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[nameIdx]) continue;

    const rawName = String(row[nameIdx]).trim();
    if (!rawName || rawName.toLowerCase() === 'total' || rawName.toLowerCase() === 'summary') continue;

    const isin = isinIdx !== -1 && row[isinIdx] ? String(row[isinIdx]).trim() : undefined;
    const quantity = qtyIdx !== -1 && row[qtyIdx] ? parseFloat(String(row[qtyIdx]).replace(/,/g, '')) : 0;
    const avgBuyPrice = avgPriceIdx !== -1 && row[avgPriceIdx] ? parseFloat(String(row[avgPriceIdx]).replace(/,/g, '')) : 0;
    const buyValue = buyValIdx !== -1 && row[buyValIdx] ? parseFloat(String(row[buyValIdx]).replace(/,/g, '')) : quantity * avgBuyPrice;
    const closingPrice = closePriceIdx !== -1 && row[closePriceIdx] ? parseFloat(String(row[closePriceIdx]).replace(/,/g, '')) : avgBuyPrice;
    const closingValue = closeValIdx !== -1 && row[closeValIdx] ? parseFloat(String(row[closeValIdx]).replace(/,/g, '')) : quantity * closingPrice;
    const pnl = pnlIdx !== -1 && row[pnlIdx] ? parseFloat(String(row[pnlIdx]).replace(/,/g, '')) : closingValue - buyValue;
    const pnlPercent = buyValue > 0 ? (pnl / buyValue) * 100 : 0;

    // Detect asset class (SGB, ETF, or Stock)
    let assetClass: AssetClass = 'stock';
    const upperName = rawName.toUpperCase();
    const upperIsin = (isin || '').toUpperCase();

    if (upperIsin.startsWith('IN00') || upperName.includes('GOLDBOND') || upperName.includes('SGB')) {
      assetClass = 'sgb';
    } else if (
      upperIsin.startsWith('INF') ||
      upperName.includes('ETF') ||
      upperName.includes('BEES') ||
      upperName.includes('NIFTY') && upperName.includes('INDEX')
    ) {
      assetClass = 'etf';
    }

    holdings.push({
      asset_class: assetClass,
      name: rawName,
      symbol: isin || rawName,
      isin: isin || undefined,
      quantity,
      avg_buy_price: avgBuyPrice,
      invested_amount: buyValue,
      statement_price: closingPrice,
      statement_value: closingValue,
      live_price: closingPrice,
      live_value: closingValue,
      unrealized_pnl: pnl,
      unrealized_pnl_percent: pnlPercent,
      source: 'groww_stocks',
      statement_date: statementDate,
    });
  }

  return {
    statementDate,
    clientCode,
    holdings,
  };
}

import * as XLSX from 'xlsx';
import { CreateHoldingInput } from '@investment-tracker/shared';

export interface ParsedMfReport {
  statementDate?: string;
  pan?: string;
  totalInvested?: number;
  totalCurrentValue?: number;
  overallReturns?: number;
  overallXirr?: number;
  holdings: CreateHoldingInput[];
}

export async function parseGrowwMfExcel(file: File | ArrayBuffer): Promise<ParsedMfReport> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true });

  let statementDate: string | undefined = undefined;
  let pan: string | undefined = undefined;
  let headerRowIndex = -1;

  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (cellVal.toLowerCase() === 'pan' && row[c + 1]) {
        pan = String(row[c + 1]).trim();
      }
      if (cellVal.toLowerCase().includes('holdings as on') || cellVal.toLowerCase().includes('as on')) {
        const match = cellVal.match(/as on\s+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}-[0-9]{2}-[0-9]{4})/i);
        if (match) {
          statementDate = match[1];
        }
      }
      if (cellVal.toLowerCase() === 'scheme name' || cellVal.toLowerCase().includes('scheme name')) {
        headerRowIndex = i;
      }
    }
    if (headerRowIndex !== -1 && statementDate) {
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = rows.findIndex(r => r && r.some((c: any) => String(c).toLowerCase().includes('scheme name')));
  }

  if (headerRowIndex === -1) {
    throw new Error('Unable to find Scheme Name header in Groww Mutual Funds Statement');
  }

  const headers = rows[headerRowIndex].map((c: any) => String(c).trim().toLowerCase());
  const schemeIdx = headers.findIndex(h => h.includes('scheme name'));
  const amcIdx = headers.findIndex(h => h.includes('amc'));
  const catIdx = headers.findIndex(h => h.includes('category') && !h.includes('sub'));
  const subCatIdx = headers.findIndex(h => h.includes('sub-category') || h.includes('sub category'));
  const folioIdx = headers.findIndex(h => h.includes('folio'));
  const unitsIdx = headers.findIndex(h => h.includes('units'));
  const investedIdx = headers.findIndex(h => h.includes('invested value') || h.includes('invested'));
  const currentIdx = headers.findIndex(h => h.includes('current value') || h.includes('current'));
  const returnsIdx = headers.findIndex(h => h.includes('returns') || h.includes('profit'));
  const xirrIdx = headers.findIndex(h => h.includes('xirr'));

  const holdings: CreateHoldingInput[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[schemeIdx]) continue;

    const schemeName = String(row[schemeIdx]).trim();
    if (!schemeName || schemeName.toLowerCase().includes('total')) continue;

    const amc = amcIdx !== -1 && row[amcIdx] ? String(row[amcIdx]).trim() : undefined;
    const category = catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : undefined;
    const subCategory = subCatIdx !== -1 && row[subCatIdx] ? String(row[subCatIdx]).trim() : undefined;
    const folioNo = folioIdx !== -1 && row[folioIdx] ? String(row[folioIdx]).trim() : undefined;
    const units = unitsIdx !== -1 && row[unitsIdx] ? parseFloat(String(row[unitsIdx]).replace(/,/g, '')) : 0;
    const investedValue = investedIdx !== -1 && row[investedIdx] ? parseFloat(String(row[investedIdx]).replace(/,/g, '')) : 0;
    const currentValue = currentIdx !== -1 && row[currentIdx] ? parseFloat(String(row[currentIdx]).replace(/,/g, '')) : investedValue;
    const returns = returnsIdx !== -1 && row[returnsIdx] ? parseFloat(String(row[returnsIdx]).replace(/,/g, '')) : currentValue - investedValue;
    
    let xirr: number | undefined = undefined;
    if (xirrIdx !== -1 && row[xirrIdx]) {
      const cleanXirr = String(row[xirrIdx]).replace(/%/g, '').trim();
      const parsedXirr = parseFloat(cleanXirr);
      if (!isNaN(parsedXirr)) xirr = parsedXirr;
    }

    const avgNav = units > 0 ? investedValue / units : 0;
    const currentNav = units > 0 ? currentValue / units : avgNav;
    const pnlPercent = investedValue > 0 ? (returns / investedValue) * 100 : 0;

    holdings.push({
      asset_class: 'mutual_fund',
      name: schemeName,
      institution: amc,
      category: category,
      sub_category: subCategory,
      folio_or_account_number: folioNo,
      quantity: units,
      avg_buy_price: avgNav,
      invested_amount: investedValue,
      statement_price: currentNav,
      statement_value: currentValue,
      live_price: currentNav,
      live_value: currentValue,
      unrealized_pnl: returns,
      unrealized_pnl_percent: pnlPercent,
      xirr: xirr,
      source: 'groww_mf',
      statement_date: statementDate,
    });
  }

  return {
    statementDate,
    pan,
    holdings,
  };
}

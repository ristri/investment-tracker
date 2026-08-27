import { CreateHoldingInput, EpfMonthlyTransaction, getLocalTodayInputString } from '@investment-tracker/shared';
import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker using unpkg or bundled worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ParsedEpfReport {
  memberId?: string;
  memberName?: string;
  establishmentName?: string;
  uan?: string;
  financialYear?: string;
  asOnDate?: string;
  employeeClosingBalance: number;
  employerClosingBalance: number;
  pensionBalance: number;
  totalEpfBalance: number;
  transactions: EpfMonthlyTransaction[];
  holding: CreateHoldingInput;
}

export async function parseEpfPdf(file: File | ArrayBuffer): Promise<ParsedEpfReport> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageStrings = content.items.map((item: any) => item.str || '');
    fullText += pageStrings.join(' ') + '\n';
  }

  // Regular expressions to extract metadata
  let memberId = '';
  let memberName = '';
  let establishmentName = '';
  let uan = '';
  let financialYear = '';
  let employeeClosing = 0;
  let employerClosing = 0;
  let pensionBalance = 0;

  // Extract UAN
  const uanMatch = fullText.match(/UAN\s*[:|]?\s*([0-9]{10,14})/i);
  if (uanMatch) uan = uanMatch[1].trim();

  // Extract Member ID & Name
  const memberMatch = fullText.match(/Member ID\/Name\s*[:|]?\s*([A-Z0-9]+)\s*\/\s*([A-Za-z\s]+?)(?:\s{2,}|tUe|\n|$)/i);
  if (memberMatch) {
    memberId = memberMatch[1].trim();
    memberName = memberMatch[2].trim().replace(/\s+(tUe|lnL|LFk).*$/i, '');
  }

  // Extract Establishment Name
  const estMatch = fullText.match(/Establishment ID\/Name\s*[:|]?\s*([A-Z0-9]+)\s*\/\s*([A-Za-z0-9\s.,-]+?)(?:\s{2,}|lnL|LFk|\n|$)/i);
  if (estMatch) {
    establishmentName = estMatch[2].trim().replace(/\s+(lnL|LFk|tUe).*$/i, '');
  }

  // Extract Financial Year
  const fyMatch = fullText.match(/Financial Year\s*[-–]\s*([0-9]{4}-[0-9]{4})/i);
  if (fyMatch) {
    financialYear = fyMatch[1].trim();
  }

  // Extract Closing Balances
  const closingMatch = fullText.match(/Closing Balance as on\s*([0-9/.-]+)\s*([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)/i);
  let asOnDate = '';
  if (closingMatch) {
    asOnDate = closingMatch[1].trim();
    employeeClosing = parseFloat(closingMatch[2].replace(/,/g, '')) || 0;
    employerClosing = parseFloat(closingMatch[3].replace(/,/g, '')) || 0;
    pensionBalance = parseFloat(closingMatch[4].replace(/,/g, '')) || 0;
  } else {
    const generalClosing = fullText.match(/Closing Balance[^\d]*([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (generalClosing) {
      employeeClosing = parseFloat(generalClosing[1].replace(/,/g, '')) || 0;
      employerClosing = parseFloat(generalClosing[2].replace(/,/g, '')) || 0;
      pensionBalance = parseFloat(generalClosing[3].replace(/,/g, '')) || 0;
    }
  }

  // Extract Monthly Contribution Transactions
  const txRegex = /([A-Za-z]{3}-[0-9]{4})\s*([0-9]{2}-[0-9]{2}-[0-9]{4})\s*(CR|DR)\s*([^\d]+?)\s*([0-9]+)\s+([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)/g;
  let txMatch;
  const transactions: EpfMonthlyTransaction[] = [];
  while ((txMatch = txRegex.exec(fullText)) !== null) {
    transactions.push({
      wage_month: txMatch[1],
      transaction_date: txMatch[2],
      type: txMatch[3],
      particulars: `${txMatch[4].trim()} ${txMatch[5]}`,
      epf_wages: parseFloat(txMatch[6].replace(/,/g, '')),
      eps_wages: parseFloat(txMatch[7].replace(/,/g, '')),
      employee_share: parseFloat(txMatch[8].replace(/,/g, '')),
      employer_share: parseFloat(txMatch[9].replace(/,/g, '')),
      pension_share: parseFloat(txMatch[10].replace(/,/g, '')),
    });
  }

  // Extract Opening Balance
  const obMatch = fullText.match(/OB\s+Int\.\s*Updated\s*upto\s*([0-9/.-]+)\s*([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)/i);

  // Extract Bottom Interest Credited ("Int. Updated upto <date> <employee_int> <employer_int> <pension_int>")
  const intRegex = /(?:^|\n|[^\w])Int\.\s*Updated\s*upto\s*([0-9/.-]+)\s*([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)/gi;
  const allIntMatches = [...fullText.matchAll(intRegex)];

  let employeeInterest = 0;
  let employerInterest = 0;
  let interestUpdatedDate = '';

  if (allIntMatches.length > 1) {
    const lastMatch = allIntMatches[allIntMatches.length - 1];
    interestUpdatedDate = lastMatch[1].trim();
    employeeInterest = parseFloat(lastMatch[2].replace(/,/g, '')) || 0;
    employerInterest = parseFloat(lastMatch[3].replace(/,/g, '')) || 0;
  } else if (allIntMatches.length === 1 && !obMatch) {
    const singleMatch = allIntMatches[0];
    interestUpdatedDate = singleMatch[1].trim();
    employeeInterest = parseFloat(singleMatch[2].replace(/,/g, '')) || 0;
    employerInterest = parseFloat(singleMatch[3].replace(/,/g, '')) || 0;
  }

  const totalInterest = employeeInterest + employerInterest;
  const totalEpf = employeeClosing + employerClosing;
  // Invested principal = total closing balance minus interest credited
  const totalInvested = totalInterest > 0 ? Math.max(0, totalEpf - totalInterest) : totalEpf;
  const pnl = totalInterest;
  const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const displayName = establishmentName ? `EPFO (${establishmentName})` : `EPFO Member Passbook ${memberId}`;

  const holding: CreateHoldingInput = {
    asset_class: 'epf',
    name: displayName,
    symbol: memberId || 'EPF',
    folio_or_account_number: memberId || uan || undefined,
    institution: establishmentName || 'EPFO India',
    category: 'Retirement',
    sub_category: 'Provident Fund',
    quantity: 1,
    avg_buy_price: totalInvested,
    invested_amount: totalInvested,
    statement_price: totalEpf,
    statement_value: totalEpf,
    live_price: totalEpf,
    live_value: totalEpf,
    unrealized_pnl: pnl,
    unrealized_pnl_percent: pnlPercent,
    source: 'epf_passbook',
    statement_date: asOnDate || financialYear || getLocalTodayInputString(),
    metadata: {
      uan,
      member_id: memberId,
      establishment_name: establishmentName,
      employee_share: employeeClosing,
      employer_share: employerClosing,
      pension_share: pensionBalance,
      employee_interest: employeeInterest,
      employer_interest: employerInterest,
      total_interest: totalInterest,
      interest_updated_date: interestUpdatedDate,
      financial_year: financialYear,
      financial_years_covered: financialYear ? [financialYear] : [],
      monthly_transactions: transactions,
      include_pension_in_net_worth: false,
    },
  };

  return {
    memberId,
    memberName,
    establishmentName,
    uan,
    financialYear,
    asOnDate,
    employeeClosingBalance: employeeClosing,
    employerClosingBalance: employerClosing,
    pensionBalance,
    totalEpfBalance: totalEpf,
    transactions,
    holding,
  };
}

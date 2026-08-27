import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { parseGrowwStocksExcel } from '../../parsers/growwStocksParser';
import { parseGrowwMfExcel } from '../../parsers/growwMfParser';
import { parseEpfPdf } from '../../parsers/epfPdfParser';
import { parseUsStocksExcel } from '../../parsers/usStocksParser';
import { useHoldings } from '../../hooks/useHoldings';
import { api } from '../../lib/api';
import { CreateHoldingInput, formatINR } from '@investment-tracker/shared';
import { toast } from 'sonner';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StatementType = 'auto' | 'groww_stocks' | 'groww_mf' | 'epf_pdf' | 'indmoney_us_stocks';

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { batchImport, isImporting } = useHoldings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statementType, setStatementType] = useState<StatementType>('auto');
  const [parsedHoldings, setParsedHoldings] = useState<CreateHoldingInput[]>([]);
  const [detectedType, setDetectedType] = useState<'groww_stocks' | 'groww_mf' | 'epf_passbook' | 'epf_pdf' | 'indmoney_us_stocks' | 'us_stocks' | null>(null);
  const [liveUsdRate, setLiveUsdRate] = useState<number>(88.0);
  const [statementDate, setStatementDate] = useState<string | undefined>(undefined);
  const [metadataSummary, setMetadataSummary] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch live exchange rate on open
  React.useEffect(() => {
    if (isOpen) {
      api.get<{ pair: string; rate: number }>('/market/exchange-rate')
        .then((res) => {
          if (res.data?.rate && res.data.rate > 0) {
            setLiveUsdRate(res.data.rate);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsParsing(true);
    setParsedHoldings([]);
    setDetectedType(null);
    setMetadataSummary(null);

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // 1. Try US Stocks (INDmoney / Alpaca) if filename matches or try first
        if (fileName.includes('us') || fileName.includes('alpaca') || fileName.includes('indmoney')) {
          try {
            const result = await parseUsStocksExcel(file, liveUsdRate);
            if (result.holdings.length > 0) {
              setParsedHoldings(result.holdings);
              setDetectedType('indmoney_us_stocks');
              setStatementDate(result.statementDate);
              setMetadataSummary(`Detected US Stocks statement (${result.brokerName || 'US Broker'}) with ${result.holdings.length} scrips. Total: $${result.totalValueUsd.toFixed(2)} (${formatINR(result.totalValueInr)}) @ ₹${liveUsdRate.toFixed(2)}/USD`);
              return;
            }
          } catch {
            // fallback to others
          }
        }

        // 2. Try Groww MF
        if (fileName.includes('mutual_fund') || fileName.includes('mf')) {
          const result = await parseGrowwMfExcel(file);
          setParsedHoldings(result.holdings);
          setDetectedType('groww_mf');
          setStatementDate(result.statementDate);
          setMetadataSummary(`Detected Groww Mutual Funds statement with ${result.holdings.length} funds.`);
        } else {
          // 3. Try Groww Stocks
          try {
            const result = await parseGrowwStocksExcel(file);
            setParsedHoldings(result.holdings);
            setDetectedType('groww_stocks');
            setStatementDate(result.statementDate);
            setMetadataSummary(`Detected Groww Stocks statement with ${result.holdings.length} scrips.`);
          } catch {
            // 4. Try US stocks fallback
            try {
              const result = await parseUsStocksExcel(file);
              if (result.holdings.length > 0) {
                setParsedHoldings(result.holdings);
                setDetectedType('indmoney_us_stocks');
                setStatementDate(result.statementDate);
                setMetadataSummary(`Detected US Stocks statement with ${result.holdings.length} scrips. Total: $${result.totalValueUsd.toFixed(2)} (${formatINR(result.totalValueInr)})`);
                return;
              }
            } catch {}

            // 5. Fallback try MF
            const result = await parseGrowwMfExcel(file);
            setParsedHoldings(result.holdings);
            setDetectedType('groww_mf');
            setStatementDate(result.statementDate);
            setMetadataSummary(`Detected Groww Mutual Funds statement with ${result.holdings.length} funds.`);
          }
        }
      } else if (fileName.endsWith('.pdf')) {
        const result = await parseEpfPdf(file);
        setParsedHoldings([result.holding]);
        setDetectedType('epf_passbook');
        setStatementDate(result.asOnDate || result.financialYear);
        setMetadataSummary(`Detected EPFO Passbook for ${result.establishmentName || result.memberName || 'EPF account'}. Balance: ${formatINR(result.totalEpfBalance)}`);
      } else {
        throw new Error('Unsupported file format. Please upload .xlsx, .xls or .pdf');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err.message || 'Failed to parse the uploaded file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!detectedType || parsedHoldings.length === 0 || !selectedFile) {
      toast.error('No valid parsed holdings to import.');
      return;
    }

    try {
      await batchImport({
        source_type: detectedType,
        file_name: selectedFile.name,
        statement_date: statementDate,
        replace_existing_source: replaceExisting,
        holdings: parsedHoldings,
      });
      onClose();
      // Reset
      setSelectedFile(null);
      setParsedHoldings([]);
    } catch (err) {
      // Error handled by mutation hook
    }
  };

  const totalInvested = parsedHoldings.reduce((acc, h) => acc + (h.invested_amount || 0), 0);
  const totalValue = parsedHoldings.reduce((acc, h) => acc + (h.statement_value || h.invested_amount || 0), 0);
  const totalGain = totalValue - totalInvested;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-0 sm:my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Import Investment Statement</h3>
              <p className="text-xs text-zinc-400">
                Groww Stocks (.xlsx), Groww Mutual Funds (.xlsx), or EPFO Passbook (.pdf)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            selectedFile
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/60'
          }`}
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".xlsx,.xls,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300">
              {selectedFile?.name.endsWith('.pdf') ? (
                <FileText className="h-8 w-8 text-purple-400" />
              ) : (
                <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                {selectedFile ? selectedFile.name : 'Click to browse or drag & drop report here'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports Excel statements from Groww and EPFO Passbook PDFs
              </p>
            </div>
          </div>
        </div>

        {/* Parsing Indicator */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span>Parsing file contents client-side...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Preview */}
        {parsedHoldings.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {metadataSummary || `Successfully parsed ${parsedHoldings.length} holdings`}
                </span>
                {statementDate && (
                  <span className="text-zinc-500 font-mono text-[11px]">Date: {statementDate}</span>
                )}
              </div>

              {/* Value Summary Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-medium">Invested</span>
                  <p className="font-bold text-zinc-200 font-mono">{formatINR(totalInvested)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-medium">Closing Value</span>
                  <p className="font-bold text-white font-mono">{formatINR(totalValue)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-medium">Gain / P&L</span>
                  <p className={`font-bold font-mono ${totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(totalGain)}
                  </p>
                </div>
              </div>
            </div>

            {/* Holdings list snippet */}
            <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-xs">
              {parsedHoldings.slice(0, 8).map((h, i) => (
                <div key={i} className="py-2 px-3 flex items-center justify-between hover:bg-zinc-800/30">
                  <div className="truncate max-w-[280px]">
                    <span className="font-medium text-zinc-200 truncate">{h.name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase ml-2 px-1.5 py-0.2 rounded bg-zinc-800">
                      {h.asset_class}
                    </span>
                  </div>
                  <div className="text-right font-mono text-zinc-300">
                    {formatINR(h.statement_value || h.invested_amount)}
                  </div>
                </div>
              ))}
              {parsedHoldings.length > 8 && (
                <div className="py-2 text-center text-zinc-500 text-[11px]">
                  + {parsedHoldings.length - 8} more holdings
                </div>
              )}
            </div>

            {/* Reconcile option */}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded bg-zinc-950 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>Replace previous imports of this type (Recommended to avoid duplicates)</span>
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedHoldings.length === 0 || isImporting}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Import & Save to Portfolio</span>
          </button>
        </div>

      </div>
    </div>
  );
}

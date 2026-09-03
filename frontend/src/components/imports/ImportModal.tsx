import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { batchImport, isImporting } = useHoldings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHoldings, setParsedHoldings] = useState<CreateHoldingInput[]>([]);
  const [detectedType, setDetectedType] = useState<'groww_stocks' | 'groww_mf' | 'epf_passbook' | 'epf_pdf' | 'indmoney_us_stocks' | 'us_stocks' | null>(null);
  const [liveUsdRate, setLiveUsdRate] = useState<number>(88.0);
  const [statementDate, setStatementDate] = useState<string | undefined>(undefined);
  const [metadataSummary, setMetadataSummary] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch live exchange rate on open
  useEffect(() => {
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
              setMetadataSummary(`Detected US Equities report with ${result.holdings.length} scrips. Total: $${result.totalValueUsd.toFixed(2)} (${formatINR(result.totalValueInr)}) @ ₹${liveUsdRate.toFixed(2)}/USD`);
              return;
            }
          } catch {}
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
                setMetadataSummary(`Detected US Stocks report with ${result.holdings.length} scrips. Total: $${result.totalValueUsd.toFixed(2)} (${formatINR(result.totalValueInr)})`);
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
        setMetadataSummary(`Detected EPFO Member Passbook for ${result.establishmentName || result.memberName || 'EPF account'}. Balance: ${formatINR(result.totalEpfBalance)}`);
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
      setSelectedFile(null);
      setParsedHoldings([]);
    } catch (err) {}
  };

  const totalInvested = parsedHoldings.reduce((acc, h) => acc + (h.invested_amount || 0), 0);
  const totalValue = parsedHoldings.reduce((acc, h) => acc + (h.statement_value || h.invested_amount || 0), 0);
  const totalGain = totalValue - totalInvested;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-tile bg-primary/15 text-primary border border-primary/20 shrink-0">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Import Investment Statement</DialogTitle>
              <DialogDescription>
                Client-side parsing for Groww Stocks, Groww Mutual Funds, US Stocks, or EPFO Passbooks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input')?.click()}
          className={cn(
            'border-2 border-dashed rounded-card p-6 sm:p-8 text-center transition-all cursor-pointer select-none',
            selectedFile
              ? 'border-primary/50 bg-primary/5'
              : 'border-surface-border hover:border-primary/40 bg-muted/30 hover:bg-muted/50'
          )}
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

          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="p-3 rounded-tile bg-card border border-surface-border text-foreground shadow-sm">
              {selectedFile?.name.endsWith('.pdf') ? (
                <FileText className="h-7 w-7 text-brand-tertiary-ink" />
              ) : (
                <FileSpreadsheet className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop statement here'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accepts .xlsx, .xls, and .pdf files
              </p>
            </div>
          </div>
        </div>

        {/* Parsing Indicator */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Parsing file client-side (no data leaves your machine)...</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-tile bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Preview */}
        {parsedHoldings.length > 0 && !isParsing && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-tile bg-primary/10 border border-primary/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Successfully extracted {parsedHoldings.length} holdings!</span>
              </div>
              {metadataSummary && <p className="text-muted-foreground text-[11px] pl-5.5">{metadataSummary}</p>}
            </div>

            {/* Financial Summary Pill */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-tile card-well text-xs tnum">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Invested</span>
                <span className="font-bold text-foreground">{formatINR(totalInvested)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Closing Valuation</span>
                <span className="font-extrabold text-foreground">{formatINR(totalValue)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Statement Return</span>
                <span className={cn('font-bold', totalGain >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                  {totalGain >= 0 ? '+' : ''}{formatINR(totalGain)}
                </span>
              </div>
            </div>

            {/* Replace Checkbox */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <input
                type="checkbox"
                id="replace-existing-check"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-4 w-4 rounded accent-primary text-primary"
              />
              <Label htmlFor="replace-existing-check" className="cursor-pointer">
                Replace existing holdings from this source (Recommended)
              </Label>
            </div>
          </div>
        )}

        {/* Supported Formats Info */}
        {!selectedFile && !isParsing && (
          <div className="card-well p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Supported Statements</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li><strong>Groww Stocks</strong>: Holdings statement Excel report</li>
              <li><strong>Groww Mutual Funds</strong>: Portfolio statement Excel report</li>
              <li><strong>INDmoney US Stocks</strong>: Holdings statement Excel / CSV</li>
              <li><strong>EPFO Passbook</strong>: Official Member Passbook multi-year PDF</li>
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleConfirmImport}
            disabled={parsedHoldings.length === 0 || isImporting || isParsing}
            className="font-bold gap-1.5"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm & Import ({parsedHoldings.length})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

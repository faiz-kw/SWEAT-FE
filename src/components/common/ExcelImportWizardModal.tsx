import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  X,
  Download,
  ShieldCheck,
  Layers,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type IngestionEntityType = 'CLASS_SCHEDULE' | 'WOD_VIDEO' | 'TRAINER_ROSTER';

interface ExcelImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityType?: IngestionEntityType;
  onImportComplete?: (result: any) => void;
}

interface RowPreview {
  row_number: number;
  sheet: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  messages: string[];
  [key: string]: any;
}

interface SheetBreakdownItem {
  sheet: string;
  found: number;
  skipped_other_months?: number;
  status: 'ACTIVE' | 'NO_DATA' | 'SKIPPED';
  note?: string;
}

interface PreviewSummary {
  entity_type: IngestionEntityType;
  confidence: number;
  sheets: string[];
  available_months?: Array<{ label: string; value: string; year: number; month: number }>;
  selected_month?: string;
  sheet_breakdown?: SheetBreakdownItem[];
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  error?: string;
  warning_message?: string;
}

export const ExcelImportWizardModal: React.FC<ExcelImportWizardModalProps> = ({
  isOpen,
  onClose,
  defaultEntityType = 'CLASS_SCHEDULE',
  onImportComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const [entityType, setEntityType] = useState<IngestionEntityType>(defaultEntityType);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [rows, setRows] = useState<RowPreview[]>([]);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('ALL');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<RowPreview | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep(1);
    setSelectedFile(null);
    setSummary(null);
    setRows([]);
    setFilterErrorsOnly(false);
    setSelectedMonth('');
    setSelectedSheetFilter('ALL');
    setSearchQuery('');
    setImportResult(null);
    setIsDetecting(false);
    setIsSimulating(false);
    setIsCommitting(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  // Step 1: File Selection & Detection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setIsDetecting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call detect endpoint
      const res = await api.post<any>('/tenant/excel-imports/detect/', formData);

      const detected = res.data?.entity_type;
      if (detected && detected !== 'UNKNOWN') {
        setEntityType(detected);
        toast.info(`Smart Detection: Identified as ${formatEntityLabel(detected)} (${res.data.confidence}% confidence)`);
      }
    } catch (err: any) {
      console.warn('Detection fallback to default:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Step 2: Trigger Simulation Preview with Strict Month Isolation
  const handleProceedToPreview = async (monthOverride?: string) => {
    if (!selectedFile) return;
    setIsSimulating(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_entity', entityType);
      const activeMonth = monthOverride !== undefined ? monthOverride : selectedMonth;
      if (activeMonth) {
        formData.append('target_month', activeMonth);
      }

      const res = await api.post<any>('/tenant/excel-imports/preview/', formData);

      const sum = res.data?.summary || null;
      setSummary(sum);
      setRows(res.data?.rows || []);
      if (sum?.selected_month && !selectedMonth) {
        setSelectedMonth(sum.selected_month);
      }
      setStep(2);
      toast.success('Simulation preview generated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Simulation preview failed. Check file format.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Row Editing and Deletion Handlers
  const handleDeleteRow = (targetIndex: number) => {
    const targetRow = rows[targetIndex];
    const newRows = rows.filter((_, idx) => idx !== targetIndex);
    setRows(newRows);
    recomputeSummary(newRows);
    toast.info(`Row ${targetRow?.row_number || targetIndex + 1} deleted from preview.`);
  };

  const handleDropAllErrors = () => {
    const errorCount = rows.filter((r) => r.status === 'ERROR').length;
    if (errorCount === 0) return;
    const newRows = rows.filter((r) => r.status !== 'ERROR');
    setRows(newRows);
    recomputeSummary(newRows);
    toast.success(`Removed ${errorCount} invalid/error rows.`);
  };

  const recomputeSummary = (currentRows: RowPreview[]) => {
    if (!summary) return;
    const total = currentRows.length;
    const valid = currentRows.filter((r) => r.status === 'VALID').length;
    const warnings = currentRows.filter((r) => r.status === 'WARNING').length;
    const errors = currentRows.filter((r) => r.status === 'ERROR').length;

    const updatedBreakdown = (summary.sheet_breakdown || []).map((sb) => {
      const foundInSheet = currentRows.filter((r) => r.sheet === sb.sheet).length;
      return {
        ...sb,
        found: foundInSheet,
        status: foundInSheet > 0 ? ('ACTIVE' as const) : ('NO_DATA' as const),
      };
    });

    setSummary({
      ...summary,
      total_rows: total,
      valid_rows: valid,
      warning_rows: warnings,
      error_rows: errors,
      sheet_breakdown: updatedBreakdown,
    });
  };

  const handleSaveEditedRow = () => {
    if (editingRowIndex === null || !editingRowData) return;
    let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
    const messages: string[] = [];

    if (entityType === 'WOD_VIDEO') {
      if (!editingRowData.date) {
        status = 'ERROR';
        messages.push('Missing or invalid Date.');
      }
      if (!editingRowData.video_url || !editingRowData.video_url.includes('youtu')) {
        status = 'ERROR';
        messages.push('Missing or invalid YouTube URL.');
      }
      if (!editingRowData.volume) {
        status = status !== 'ERROR' ? 'WARNING' : 'ERROR';
        messages.push('Volume number is missing.');
      }
    }

    const updatedRow = {
      ...editingRowData,
      status,
      messages,
    };

    const newRows = [...rows];
    newRows[editingRowIndex] = updatedRow;
    setRows(newRows);
    recomputeSummary(newRows);
    setEditingRowIndex(null);
    setEditingRowData(null);
    toast.success(`Row ${updatedRow.row_number} updated.`);
  };

  // Step 3: Atomic Final Commit with Curated Rows
  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setIsCommitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entity_type', entityType);
      if (selectedMonth) {
        formData.append('target_month', selectedMonth);
      }
      // Target either the single selected sheet or all sheets
      const targetRows = (selectedSheetFilter && selectedSheetFilter !== 'ALL')
        ? rows.filter((r) => r.sheet === selectedSheetFilter)
        : rows;
      const validCuratedRows = targetRows.filter((r) => r.status !== 'ERROR');
      formData.append('curated_rows', JSON.stringify(validCuratedRows));

      const res = await api.post<any>('/tenant/excel-imports/confirm/', formData);

      setImportResult(res.data);
      setStep(3);
      toast.success('Upload completed successfully!');
      if (onImportComplete) {
        onImportComplete(res.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to execute import.');
    } finally {
      setIsCommitting(false);
    }
  };

  const formatEntityLabel = (type: string) => {
    switch (type) {
      case 'CLASS_SCHEDULE':
        return 'Class Timetable & Schedule';
      case 'WOD_VIDEO':
        return 'Class Workout Videos';
      case 'TRAINER_ROSTER':
        return 'Trainer Shift Roster';
      default:
        return type;
    }
  };

  const activeSheets = (summary?.sheet_breakdown || []).filter((sb) => sb.found > 0);
  const otherSheets = (summary?.sheet_breakdown || []).filter((sb) => sb.found === 0);

  const filteredRows = rows
    .filter((r) => !filterErrorsOnly || r.status === 'ERROR' || r.status === 'WARNING')
    .filter((r) => selectedSheetFilter === 'ALL' || r.sheet === selectedSheetFilter)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const searchableText = [
        r.branch,
        r.room,
        r.day_pattern,
        r.time_slot,
        r.class_type,
        r.outlet,
        r.shift,
        r.trainer_name,
        r.video_url,
        r.muscle_group,
        r.volume,
        r.category_name,
        r.program,
        r.sheet,
        ...(r.messages || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(q);
    });

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl w-[96vw] max-h-[94vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Excel Schedule & Video Importer</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Check and upload class timetables, daily workout videos, and trainer shifts.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step {step} of 3
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Upload & Entity Select */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                selectedFile
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-foreground text-sm">Drop your Excel file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports Excel workbooks (.xlsx, .xls) and CSV files
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Entity Target Selector */}
            <div className="bg-muted/40 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> What type of data is this file?
                </label>
                {isDetecting && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Detecting format...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'CLASS_SCHEDULE', label: 'Class Timetable', desc: 'MWF/TT/SS slots & studios' },
                  { id: 'WOD_VIDEO', label: 'Class Workout Videos', desc: 'Daily YouTube links & class videos' },
                  { id: 'TRAINER_ROSTER', label: 'Trainer Roster', desc: 'Weekly shifts & rotations' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEntityType(item.id as IngestionEntityType)}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      entityType === item.id
                        ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPreview}
                disabled={!selectedFile || isSimulating}
                className="gap-2"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Checking File...
                  </>
                ) : (
                  <>
                    Review File <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Simulation Preview */}
        {step === 2 && summary && (
          <div className="space-y-4 py-2 flex flex-col flex-1 overflow-hidden">
            {/* Active Entity Badge, Month Selector & Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 bg-muted/30 p-2.5 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">File Type:</span>
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                  {formatEntityLabel(entityType)}
                </Badge>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-primary hover:underline ml-1 font-medium"
                >
                  (Change)
                </button>
              </div>

              {/* Month Selector Dropdown */}
              {summary.available_months && summary.available_months.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" /> Month:
                  </span>
                  <select
                    value={selectedMonth || summary.selected_month || ''}
                    onChange={(e) => {
                      const newM = e.target.value;
                      setSelectedMonth(newM);
                      handleProceedToPreview(newM);
                    }}
                    className="text-xs font-semibold bg-background border border-primary/40 rounded px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                  >
                    {summary.available_months.map((m) => (
                      <option key={m.value} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="text-xs text-muted-foreground">
                Workbook Sheets: <span className="font-semibold text-foreground">{summary.sheets.join(', ')}</span>
              </span>
            </div>

            {/* Source Sheet Breakdown Badge Bar */}
            {summary.sheet_breakdown && summary.sheet_breakdown.length > 0 && (
              <div className="bg-muted/40 border rounded-xl p-3 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Data Found in File ({summary.selected_month}):
                  </span>
                  {activeSheets.length > 1 && (
                    <span className="text-[11px] text-muted-foreground">
                      Click any sheet to filter rows
                    </span>
                  )}
                </div>

                {/* If only 1 sheet has data for this month */}
                {activeSheets.length === 1 && (
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground">Reading schedule from:</span>
                    <span className="px-2.5 py-1 rounded-md font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                      {activeSheets[0].sheet} ({entityType === 'CLASS_SCHEDULE' ? `${activeSheets[0].found} weekly timetable rules — generates ~${Math.round(activeSheets[0].found * 9.25)} monthly sessions for ${summary.selected_month || 'month'}` : `${activeSheets[0].found} records`})
                    </span>
                    {otherSheets.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        (Ignored non-timetable sheets: {otherSheets.map((s) => s.sheet).join(', ')})
                      </span>
                    )}
                  </div>
                )}

                {/* If multiple sheets have data for this month */}
                {activeSheets.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSheetFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        selectedSheetFilter === 'ALL'
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      All Sheets ({rows.length})
                    </button>
                    {activeSheets.map((sb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSheetFilter(sb.sheet)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          selectedSheetFilter === sb.sheet
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        <span>{sb.sheet}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono border-emerald-500/40 text-emerald-600">
                          {sb.found}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Warning Message Banner if format mismatch */}
            {summary.warning_message && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="font-medium">{summary.warning_message}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs h-7 border-amber-500/40 hover:bg-amber-500/20 shrink-0"
                >
                  Change Format
                </Button>
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-card border rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Total Found</p>
                <p className="text-xl font-bold text-foreground mt-1">{summary.total_rows}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Upload
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary.valid_rows}
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Minor Notes
                </p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {summary.warning_rows}
                </p>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Needs Attention
                </p>
                <p className="text-xl font-bold text-destructive mt-1">{summary.error_rows}</p>
              </div>
            </div>

            {/* Filter Toggle, Search Bar & Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by class, branch, time, trainer..."
                    className="w-56 lg:w-72 pl-7 pr-7 py-1 text-xs rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute left-2 top-1.5 text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {summary.error_rows > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDropAllErrors}
                    className="text-xs h-7 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Drop {summary.error_rows} Error Rows
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
                  className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors cursor-pointer ${
                    filterErrorsOnly
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filterErrorsOnly ? 'Showing Issues Only' : 'Show Issues Only'}
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="border rounded-xl flex-1 min-h-[360px] max-h-[52vh] overflow-auto shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted sticky top-0 border-b z-10">
                  <tr>
                    <th className="p-2 font-semibold">Row</th>
                    <th className="p-2 font-semibold">Sheet</th>
                    <th className="p-2 font-semibold">Status</th>
                    {entityType === 'WOD_VIDEO' && (
                      <>
                        <th className="p-2 font-semibold">Date</th>
                        <th className="p-2 font-semibold">Volume</th>
                        <th className="p-2 font-semibold">YouTube Link</th>
                        <th className="p-2 font-semibold">Muscle Group</th>
                        <th className="p-2 font-semibold">Equipment Required</th>
                      </>
                    )}
                    {entityType === 'CLASS_SCHEDULE' && (
                      <>
                        <th className="p-2 font-semibold">Studio / Branch</th>
                        <th className="p-2 font-semibold">Room</th>
                        <th className="p-2 font-semibold">Days</th>
                        <th className="p-2 font-semibold">Time Slot</th>
                        <th className="p-2 font-semibold">Class Type</th>
                      </>
                    )}
                    {entityType === 'TRAINER_ROSTER' && (
                      <>
                        <th className="p-2 font-semibold">Outlet</th>
                        <th className="p-2 font-semibold">Shift</th>
                        <th className="p-2 font-semibold">Trainer</th>
                      </>
                    )}
                    <th className="p-2 font-semibold">Status Details</th>
                    <th className="p-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/40">
                      <td className="p-2 font-mono text-muted-foreground whitespace-nowrap">
                        Row {r.row_number}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                          {r.sheet}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {r.status === 'VALID' && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Ready
                          </Badge>
                        )}
                        {r.status === 'WARNING' && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                            Note
                          </Badge>
                        )}
                        {r.status === 'ERROR' && (
                          <Badge variant="destructive" className="text-[10px]">
                            Needs Fix
                          </Badge>
                        )}
                      </td>
                      {entityType === 'WOD_VIDEO' && (
                        <>
                          <td className="p-2 whitespace-nowrap">{r.date}</td>
                          <td className="p-2 font-medium">{r.volume}</td>
                          <td className="p-2 max-w-xs truncate text-muted-foreground">{r.video_url}</td>
                          <td className="p-2">{r.muscle_group}</td>
                          <td className="p-2 text-muted-foreground max-w-[160px] truncate" title={r.equipment || ''}>
                            {r.equipment || '—'}
                          </td>
                        </>
                      )}
                      {entityType === 'CLASS_SCHEDULE' && (
                        <>
                          <td className="p-2 font-medium">{r.branch}</td>
                          <td className="p-2">{r.room}</td>
                          <td className="p-2 font-mono">{r.day_pattern}</td>
                          <td className="p-2 font-mono">{r.time_slot}</td>
                          <td className="p-2 font-medium">{r.class_type}</td>
                        </>
                      )}
                      {entityType === 'TRAINER_ROSTER' && (
                        <>
                          <td className="p-2 font-medium">{r.outlet}</td>
                          <td className="p-2">{r.shift}</td>
                          <td className="p-2 font-medium">{r.trainer_name}</td>
                        </>
                      )}
                      <td className="p-2 text-muted-foreground text-[11px]">
                        {r.messages?.length > 0 ? r.messages.join('; ') : '—'}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const originalIdx = rows.findIndex((item) => item === r);
                              setEditingRowIndex(originalIdx);
                              setEditingRowData({ ...r });
                            }}
                            title="Edit this row"
                            className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const originalIdx = rows.findIndex((item) => item === r);
                              handleDeleteRow(originalIdx);
                            }}
                            title="Delete this row"
                            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Upload
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                {selectedSheetFilter !== 'ALL' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSheetFilter('ALL');
                    }}
                    disabled={isCommitting}
                    className="text-xs"
                    title="Switch to all sheets"
                  >
                    View All Sheets ({summary.valid_rows})
                  </Button>
                )}
                <Button
                  onClick={handleConfirmImport}
                  disabled={isCommitting || (selectedSheetFilter !== 'ALL' ? rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length === 0 : summary.valid_rows === 0)}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving to Calendar...
                    </>
                  ) : selectedSheetFilter !== 'ALL' ? (
                    <>
                      <Check className="w-4 h-4" /> Save & Publish &ldquo;{selectedSheetFilter}&rdquo; ({rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length} {entityType === 'CLASS_SCHEDULE' ? 'Classes' : entityType === 'WOD_VIDEO' ? 'Videos' : 'Records'})
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save & Publish All Sheets ({summary.valid_rows} {entityType === 'CLASS_SCHEDULE' ? 'Classes' : entityType === 'WOD_VIDEO' ? 'Videos' : 'Records'})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && importResult && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Upload Finished Successfully!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                All records have been saved into your system.
              </p>
            </div>
            <div className="flex justify-center gap-4 text-left max-w-sm mx-auto">
              <div className="bg-muted/50 p-4 rounded-xl flex-1 text-center">
                <p className="text-xs text-muted-foreground">New Records Added</p>
                <p className="text-2xl font-bold text-foreground mt-1">{importResult.created_count}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-xl flex-1 text-center">
                <p className="text-xs text-muted-foreground">Records Updated</p>
                <p className="text-2xl font-bold text-foreground mt-1">{importResult.updated_count}</p>
              </div>
            </div>

            <Button onClick={() => handleDialogClose(false)} className="px-8">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
      {/* Edit Record Modal Dialog */}
      <Dialog open={editingRowIndex !== null} onOpenChange={(open) => !open && setEditingRowIndex(null)}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Row {editingRowData?.row_number} ({editingRowData?.sheet})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify values directly before committing to the database.
            </DialogDescription>
          </DialogHeader>

          {editingRowData && (
            <div className="space-y-3 py-2 text-xs">
              {entityType === 'WOD_VIDEO' && (
                <>
                  <div>
                    <label className="font-semibold text-foreground">Date (YYYY-MM-DD):</label>
                    <input
                      type="date"
                      value={editingRowData.date || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, date: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Workout Category / Class Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Pilates Total, Bootcamp, Glutes, HIIT"
                      value={editingRowData.category_name || editingRowData.program || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, category_name: e.target.value, program: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Volume Code (e.g. V20):</label>
                    <input
                      type="text"
                      value={editingRowData.volume || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, volume: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">YouTube Video URL:</label>
                    <input
                      type="text"
                      value={editingRowData.video_url || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, video_url: e.target.value })}
                      placeholder="https://youtu.be/..."
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Targeted Muscle Groups:</label>
                    <input
                      type="text"
                      value={editingRowData.muscle_group || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, muscle_group: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Equipment Required:</label>
                    <input
                      type="text"
                      value={editingRowData.equipment || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, equipment: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                </>
              )}

              {entityType === 'CLASS_SCHEDULE' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-foreground">Studio / Branch:</label>
                      <input
                        type="text"
                        value={editingRowData.branch || ''}
                        onChange={(e) => setEditingRowData({ ...editingRowData, branch: e.target.value })}
                        placeholder="e.g. SWEAT HQ, SWEAT Pilates"
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground">Room:</label>
                      <input
                        type="text"
                        value={editingRowData.room || ''}
                        onChange={(e) => setEditingRowData({ ...editingRowData, room: e.target.value })}
                        placeholder="e.g. Pilates, Bootcamp"
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Time Slot (e.g. 06:30 - 07:30):</label>
                    <input
                      type="text"
                      value={editingRowData.time_slot || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, time_slot: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Class Type / Template:</label>
                    <input
                      type="text"
                      value={editingRowData.class_type || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, class_type: e.target.value })}
                      placeholder="e.g. Pilates Total, Pilates Stretch, Bootcamp Total"
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Day Pattern (MWF / TT / SS):</label>
                    <input
                      type="text"
                      value={editingRowData.day_pattern || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, day_pattern: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs font-mono"
                    />
                  </div>
                </>
              )}

              {entityType === 'TRAINER_ROSTER' && (
                <>
                  <div>
                    <label className="font-semibold text-foreground">Studio / Outlet:</label>
                    <input
                      type="text"
                      value={editingRowData.outlet || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, outlet: e.target.value })}
                      placeholder="e.g. SWEAT HQ (Andheri), SWEAT Pilates (Malad)"
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Shift / Day:</label>
                    <input
                      type="text"
                      value={editingRowData.shift || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, shift: e.target.value })}
                      placeholder="e.g. Morning Shift, Evening Shift, Weekend Saturday"
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Assigned Trainer(s):</label>
                    <input
                      type="text"
                      value={editingRowData.trainer_name || ''}
                      onChange={(e) => setEditingRowData({ ...editingRowData, trainer_name: e.target.value })}
                      placeholder="e.g. Sairaj, Saeed (comma-separated)"
                      className="w-full mt-1 px-2.5 py-1.5 border rounded bg-background text-foreground text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRowIndex(null)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSaveEditedRow} className="bg-primary text-primary-foreground">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};


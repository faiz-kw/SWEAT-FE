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
  Calendar,
  MapPin,
  Clock,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Tag,
  Dumbbell,
  Users,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { classesApi } from '@/api/endpoints/classesApi';
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
  date?: string;
  video_url?: string;
  volume?: string;
  muscle_group?: string;
  equipment?: string;
  branch?: string;
  room?: string;
  day_pattern?: string;
  time_slot?: string;
  class_type?: string;
  outlet?: string;
  shift?: string;
  trainer_name?: string;
  category_name?: string;
  program?: string;
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

export interface SimulatedTrainerShift {
  id: string;
  trainer_id: string;
  trainer_name: string;
  trainer_code: string;
  role: string;
  role_code: string;
  branch_id: string;
  branch_name: string;
  branch_code?: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  time_slot: string;
  duration_hours: number;
  week_column: string;
  date_label: string;
  start_day: number;
  end_day: number;
  month_label: string;
  status: string;
  already_exists?: boolean;
  na_fields_filled: string[];
  rule_source?: string;
}

export interface SimulatedOccurrence {
  id: string;
  date: string;
  date_formatted: string;
  day_name: string;
  start_time: string;
  end_time: string;
  time_slot: string;
  class_name: string;
  template_id: string;
  template_name: string;
  template_code: string;
  category_name: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  room: string;
  capacity: number;
  trial_capacity: number;
  waitlist_capacity: number;
  delivery_mode: string;
  duration_minutes: number;
  status: string;
  na_fields_filled: string[];
  rule_source: string;
}

export const ExcelImportWizardModal: React.FC<ExcelImportWizardModalProps> = ({
  isOpen,
  onClose,
  defaultEntityType = 'CLASS_SCHEDULE',
  onImportComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [simulatedOccurrences, setSimulatedOccurrences] = useState<SimulatedOccurrence[]>([]);
  const [occurrencesSummary, setOccurrencesSummary] = useState<any>(null);
  const [isSimulatingOccurrences, setIsSimulatingOccurrences] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ id: string; name: string; code: string; default_capacity: number; category_name: string }>>([]);
  // CRM Direct queries for Branches, Categories, and Templates
  const { data: crmBranches = [] } = useQuery({
    queryKey: ['tenant-branches'],
    queryFn: () => classesApi.getBranches(),
    enabled: isOpen,
  });
  const { data: crmCategories = [] } = useQuery({
    queryKey: ['class-categories'],
    queryFn: () => classesApi.getCategories(),
    enabled: isOpen,
  });
  const { data: crmTemplates = [] } = useQuery({
    queryKey: ['class-templates'],
    queryFn: () => classesApi.getTemplates(),
    enabled: isOpen,
  });
  const { data: crmTrainers = [] } = useQuery({
    queryKey: ['tenant-trainer-profiles'],
    queryFn: () => classesApi.getTrainers(),
    enabled: isOpen,
  });

  const allBranchesList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    (crmBranches as any[]).forEach((b) => {
      if (b?.name) {
        map.set(b.name.trim().toLowerCase(), {
          id: String(b.id),
          name: b.name.trim(),
          code: b.code || '',
        });
      }
    });
    availableBranches.forEach((b) => {
      if (b?.name && !map.has(b.name.trim().toLowerCase())) {
        map.set(b.name.trim().toLowerCase(), {
          id: String(b.id),
          name: b.name.trim(),
          code: b.code || '',
        });
      }
    });
    simulatedOccurrences.forEach((occ) => {
      if (occ?.branch_name && !map.has(occ.branch_name.trim().toLowerCase())) {
        map.set(occ.branch_name.trim().toLowerCase(), {
          id: String(occ.branch_id || occ.branch_name),
          name: occ.branch_name.trim(),
          code: occ.branch_code || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [crmBranches, availableBranches, simulatedOccurrences]);

  const allTemplatesList = React.useMemo(() => {
    const map = new Map<string, any>();
    (crmTemplates as any[]).forEach((t) => {
      if (t?.name) {
        const catName = t.category?.name || (typeof t.category === 'string' ? t.category : 'General');
        map.set(String(t.id), {
          id: String(t.id),
          name: t.name.trim(),
          code: t.code || '',
          category_name: catName,
          category_id: t.category?.id || (typeof t.category === 'string' ? t.category : null),
          default_capacity: t.default_capacity || 12,
          default_trial_capacity: t.default_trial_capacity || 2,
          default_waitlist_capacity: t.default_waitlist_capacity || 5,
        });
      }
    });
    availableTemplates.forEach((t) => {
      if (t?.name && !map.has(String(t.id))) {
        map.set(String(t.id), {
          id: String(t.id),
          name: t.name.trim(),
          code: t.code || '',
          category_name: t.category_name || 'General',
          category_id: null,
          default_capacity: t.default_capacity || 12,
          default_trial_capacity: 2,
          default_waitlist_capacity: 5,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [crmTemplates, availableTemplates]);

  const allCategoriesList = React.useMemo(() => {
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const set = new Map<string, string>();
    (crmCategories as any[]).forEach((c) => {
      if (c?.name && !isUuid(c.name.trim())) {
        set.set(c.name.trim().toLowerCase(), c.name.trim());
      }
    });
    allTemplatesList.forEach((t) => {
      if (t.category_name && t.category_name !== 'General' && !isUuid(t.category_name.trim())) {
        set.set(t.category_name.trim().toLowerCase(), t.category_name.trim());
      }
    });
    return Array.from(set.values()).sort();
  }, [crmCategories, allTemplatesList]);

  const isOccMatchFilter = (o: SimulatedOccurrence) => {
    if (o.status === 'DELETED') return false;

    // Branch filter
    if (crmBranchFilter !== 'ALL') {
      const targetB = crmBranchFilter.toLowerCase();
      const matchBranch =
        o.branch_name?.toLowerCase() === targetB ||
        o.branch_id === crmBranchFilter ||
        o.branch_code?.toLowerCase() === targetB;
      if (!matchBranch) return false;
    }

    // Template / Category filter
    if (crmTemplateFilter !== 'ALL') {
      if (crmTemplateFilter.startsWith('CATEGORY:')) {
        const catTarget = crmTemplateFilter.replace('CATEGORY:', '').trim().toLowerCase();
        const matchCategory =
          o.category_name?.toLowerCase() === catTarget ||
          o.template_name?.toLowerCase().includes(catTarget) ||
          o.class_name?.toLowerCase().includes(catTarget);
        if (!matchCategory) return false;
      } else {
        const matchTemplate =
          o.template_name?.toLowerCase() === crmTemplateFilter.toLowerCase() ||
          o.class_name?.toLowerCase() === crmTemplateFilter.toLowerCase() ||
          o.template_id === crmTemplateFilter;
        if (!matchTemplate) return false;
      }
    }

    // Search query filter
    if (crmSearchQuery.trim()) {
      const q = crmSearchQuery.toLowerCase().trim();
      const searchable = [
        o.class_name,
        o.template_name,
        o.branch_name,
        o.room,
        o.date_formatted,
        o.day_name,
        o.time_slot,
        o.category_name,
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  };

  const [simulatedShifts, setSimulatedShifts] = useState<SimulatedTrainerShift[]>([]);
  const [shiftsSummary, setShiftsSummary] = useState<any>(null);
  const [isSimulatingShifts, setIsSimulatingShifts] = useState(false);
  const [crmTrainerFilter, setCrmTrainerFilter] = useState('ALL');
  const [crmShiftFilter, setCrmShiftFilter] = useState('ALL');
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [editingShift, setEditingShift] = useState<SimulatedTrainerShift | null>(null);

  const allTrainersList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    (crmTrainers as any[]).forEach((t) => {
      const name = t.trainer_name || t.name || t.full_name || t.display_name;
      if (name) {
        map.set(name.trim().toLowerCase(), {
          id: String(t.id),
          name: name.trim(),
          code: t.trainer_code || t.code || '',
        });
      }
    });
    simulatedShifts.forEach((s) => {
      if (s?.trainer_name && !map.has(s.trainer_name.trim().toLowerCase())) {
        map.set(s.trainer_name.trim().toLowerCase(), {
          id: String(s.trainer_id),
          name: s.trainer_name.trim(),
          code: s.trainer_code || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [crmTrainers, simulatedShifts]);

  const isShiftMatchFilter = (s: SimulatedTrainerShift) => {
    if (s.status === 'DELETED') return false;

    // Branch filter
    if (crmBranchFilter !== 'ALL') {
      const targetB = crmBranchFilter.toLowerCase();
      const matchBranch =
        s.branch_name?.toLowerCase() === targetB ||
        s.branch_id === crmBranchFilter ||
        (s.branch_code && s.branch_code.toLowerCase() === targetB);
      if (!matchBranch) return false;
    }

    // Trainer filter
    if (crmTrainerFilter !== 'ALL') {
      const matchTrainer =
        s.trainer_name?.toLowerCase() === crmTrainerFilter.toLowerCase() ||
        s.trainer_id === crmTrainerFilter ||
        (s.trainer_code && s.trainer_code.toLowerCase() === crmTrainerFilter.toLowerCase());
      if (!matchTrainer) return false;
    }

    // Shift filter
    if (crmShiftFilter !== 'ALL') {
      if (!s.shift_name.toLowerCase().includes(crmShiftFilter.toLowerCase())) {
        return false;
      }
    }

    // Search query
    if (crmSearchQuery.trim()) {
      const q = crmSearchQuery.toLowerCase().trim();
      const searchable = [
        s.trainer_name,
        s.trainer_code,
        s.branch_name,
        s.shift_name,
        s.time_slot,
        s.date_label,
        s.role,
        ...(s.na_fields_filled || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  };

  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [crmBranchFilter, setCrmBranchFilter] = useState('ALL');
  const [crmTemplateFilter, setCrmTemplateFilter] = useState('ALL');
  const [crmViewMode, setCrmViewMode] = useState<'cards' | 'table'>('cards');
  const [crmSortOrder, setCrmSortOrder] = useState<'date_asc' | 'date_desc'>('date_asc');
  const [selectedOccIds, setSelectedOccIds] = useState<Set<string>>(new Set());
  const [editingOcc, setEditingOcc] = useState<SimulatedOccurrence | null>(null);
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
    setSimulatedOccurrences([]);
    setOccurrencesSummary(null);
    setIsSimulatingOccurrences(false);
    setFilterErrorsOnly(false);
    setSelectedMonth('');
    setSelectedSheetFilter('ALL');
    setSearchQuery('');
    setCrmSearchQuery('');
    setCrmBranchFilter('ALL');
    setCrmTemplateFilter('ALL');
    setCrmViewMode('cards');
    setSelectedOccIds(new Set());
    setEditingOcc(null);
    setSimulatedShifts([]);
    setShiftsSummary(null);
    setIsSimulatingShifts(false);
    setCrmTrainerFilter('ALL');
    setCrmShiftFilter('ALL');
    setSelectedShiftIds(new Set());
    setEditingShift(null);
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
      setStep(4);
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

  // Step 2 -> Step 3: Trigger Intermediate CRM Classes Preview
  const handleProceedToCrmPreview = async () => {
    setIsSimulatingOccurrences(true);
    try {
      const targetRows = (selectedSheetFilter && selectedSheetFilter !== 'ALL')
        ? rows.filter((r) => r.sheet === selectedSheetFilter)
        : rows;
      const validRules = targetRows.filter((r) => r.status !== 'ERROR');

      const res = await api.post<any>('/tenant/excel-imports/simulate-occurrences/', {
        curated_rules: JSON.stringify(validRules),
        target_month: selectedMonth || summary?.selected_month,
      });

      setSimulatedOccurrences(res.data.occurrences || []);
      setOccurrencesSummary(res.data.summary || null);
      setAvailableBranches(res.data.available_branches || []);
      setAvailableTemplates(res.data.available_templates || []);
      setStep(3);
      toast.success(`Generated CRM preview: ${res.data.occurrences?.length || 0} class sessions ready for review.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to simulate CRM class occurrences.');
    } finally {
      setIsSimulatingOccurrences(false);
    }
  };

  // Final Publish: Atomically commit curated occurrences to CRM database
  const handleConfirmOccurrencesPublish = async () => {
    setIsCommitting(true);
    try {
      const validOccurrences = simulatedOccurrences.filter((o) => o.status !== 'DELETED');
      const res = await api.post<any>('/tenant/excel-imports/confirm/', {
        curated_occurrences: JSON.stringify(validOccurrences),
        entity_type: 'CLASS_SCHEDULE',
        target_month: selectedMonth || summary?.selected_month,
      });

      setImportResult(res.data);
      setStep(4);
      toast.success(`Successfully published ${res.data.created_count || validOccurrences.length} classes to the CRM calendar!`);
      if (onImportComplete) {
        onImportComplete(res.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to publish classes to CRM.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteOccurrence = (id: string) => {
    const updated = simulatedOccurrences.filter((o) => o.id !== id);
    setSimulatedOccurrences(updated);
    toast.info('Class session removed from import list.');
  };

  const handleDeleteSelectedOccurrences = () => {
    if (selectedOccIds.size === 0) return;
    const updated = simulatedOccurrences.filter((o) => !selectedOccIds.has(o.id));
    setSimulatedOccurrences(updated);
    setSelectedOccIds(new Set());
    toast.success(`Removed ${selectedOccIds.size} selected classes.`);
  };

  const handleSaveEditedOccurrence = (edited: SimulatedOccurrence) => {
    const updated = simulatedOccurrences.map((o) => (o.id === edited.id ? edited : o));
    setSimulatedOccurrences(updated);
    setEditingOcc(null);
    toast.success('Class session updated.');
  };

  // Trainer Shifts Handlers
  const handleProceedToTrainerPreview = async () => {
    setIsSimulatingShifts(true);
    try {
      const targetRows = (selectedSheetFilter && selectedSheetFilter !== 'ALL')
        ? rows.filter((r) => r.sheet === selectedSheetFilter)
        : rows;
      const validRules = targetRows.filter((r) => r.status !== 'ERROR');

      const res = await api.post<any>('/tenant/excel-imports/simulate-trainer-shifts/', {
        curated_rows: JSON.stringify(validRules),
        target_month: selectedMonth || summary?.selected_month,
      });

      setSimulatedShifts(res.data.shifts || []);
      setShiftsSummary(res.data.summary || null);
      setStep(3);
      toast.success(`Generated CRM preview: ${res.data.shifts?.length || 0} trainer shifts ready for review.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to simulate trainer shifts.');
    } finally {
      setIsSimulatingShifts(false);
    }
  };

  const handleConfirmTrainerShiftsPublish = async () => {
    setIsCommitting(true);
    try {
      const validShifts = simulatedShifts.filter((s) => s.status !== 'DELETED');
      const res = await api.post<any>('/tenant/excel-imports/confirm/', {
        curated_trainer_shifts: JSON.stringify(validShifts),
        entity_type: 'TRAINER_ROSTER',
        target_month: selectedMonth || summary?.selected_month,
      });

      setImportResult(res.data);
      setStep(4);
      toast.success(`Successfully published ${res.data.created_count || validShifts.length} trainer shifts to CRM rosters!`);
      if (onImportComplete) {
        onImportComplete(res.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to publish trainer shifts to CRM.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteShift = (id: string) => {
    const updated = simulatedShifts.filter((s) => s.id !== id);
    setSimulatedShifts(updated);
    toast.info('Trainer shift removed from import list.');
  };

  const handleDeleteSelectedShifts = () => {
    if (selectedShiftIds.size === 0) return;
    const updated = simulatedShifts.filter((s) => !selectedShiftIds.has(s.id));
    setSimulatedShifts(updated);
    setSelectedShiftIds(new Set());
    toast.success(`Removed ${selectedShiftIds.size} selected shifts.`);
  };

  const handleSaveEditedShift = (edited: SimulatedTrainerShift) => {
    const updated = simulatedShifts.map((s) => (s.id === edited.id ? edited : s));
    setSimulatedShifts(updated);
    setEditingShift(null);
    toast.success('Trainer shift updated.');
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
                {step === 3
                  ? entityType === 'CLASS_SCHEDULE'
                    ? 'Step 3 of 4: CRM Classes Preview & Confirmation'
                    : entityType === 'TRAINER_ROSTER'
                    ? 'Step 3 of 4: CRM Trainer Shifts Preview & Confirmation'
                    : 'Step 3 of 3'
                  : `Step ${step} of ${entityType === 'CLASS_SCHEDULE' || entityType === 'TRAINER_ROSTER' ? 4 : 3}`}
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
                onClick={() => handleProceedToPreview()}
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
                      {activeSheets[0]?.sheet} (
                      {entityType === 'CLASS_SCHEDULE'
                        ? `${activeSheets[0]?.found || 0} weekly timetable rules`
                        : `${activeSheets[0]?.found || 0} records`}
                      )
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
                {entityType === 'CLASS_SCHEDULE' ? (
                  <Button
                    onClick={handleProceedToCrmPreview}
                    disabled={isSimulatingOccurrences || (selectedSheetFilter !== 'ALL' ? rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length === 0 : summary.valid_rows === 0)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
                  >
                    {isSimulatingOccurrences ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Generating CRM Class Preview...
                      </>
                    ) : (
                      <>
                        <span>Next: Preview Generated CRM Classes</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : entityType === 'TRAINER_ROSTER' ? (
                  <Button
                    onClick={handleProceedToTrainerPreview}
                    disabled={isSimulatingShifts || (selectedSheetFilter !== 'ALL' ? rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length === 0 : summary.valid_rows === 0)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
                  >
                    {isSimulatingShifts ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Generating CRM Shift Preview...
                      </>
                    ) : (
                      <>
                        <span>Next: Preview Generated Trainer Shifts</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirmImport}
                    disabled={isCommitting || (selectedSheetFilter !== 'ALL' ? rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length === 0 : summary.valid_rows === 0)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isCommitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : selectedSheetFilter !== 'ALL' ? (
                      <>
                        <Check className="w-4 h-4" /> Save & Publish &ldquo;{selectedSheetFilter}&rdquo; ({rows.filter((r) => r.sheet === selectedSheetFilter && r.status !== 'ERROR').length} {entityType === 'WOD_VIDEO' ? 'Videos' : 'Records'})
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save & Publish All Sheets ({summary.valid_rows} {entityType === 'WOD_VIDEO' ? 'Videos' : 'Records'})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Intermediate Detailed CRM Class Preview & Confirmation */}
        {step === 3 && entityType === 'CLASS_SCHEDULE' && (
          <div className="space-y-4 py-2 flex flex-col flex-1 overflow-hidden">
            {/* Overview & Smart Template Auto-Fill Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      CRM Calendar Class Sessions Preview
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                        {simulatedOccurrences.length} Concrete Classes
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Target Period: <strong className="text-foreground">{occurrencesSummary?.month_label || selectedMonth}</strong> &bull; Showing exactly how each class will be scheduled in the CRM.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background text-[11px] font-medium py-1 px-2.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Template Auto-Fill Active</span>
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/50">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>
                  <strong>Dynamic Metadata Resolution:</strong> Unspecified and &ldquo;NA&rdquo; values in the timetable (Capacity, Trial Capacity, Waitlist, Duration, Delivery Mode, and Rooms) have been automatically populated from the matched <strong>Class Templates</strong>.
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by class name, date, time, room..."
                    value={crmSearchQuery}
                    onChange={(e) => setCrmSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {crmSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCrmSearchQuery('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch Filter (Direct from CRM & Excel) */}
                <select
                  value={crmBranchFilter}
                  onChange={(e) => setCrmBranchFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground font-medium"
                >
                  <option value="ALL">All Branches ({allBranchesList.length})</option>
                  {allBranchesList.map((b) => (
                    <option key={b.id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Template & Category Filter (Direct from CRM & Excel) */}
                <select
                  value={crmTemplateFilter}
                  onChange={(e) => setCrmTemplateFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground font-medium max-w-[220px]"
                >
                  <option value="ALL">All Templates & Categories</option>

                  {allCategoriesList.length > 0 && (
                    <optgroup label="── Filter by Category ──">
                      {allCategoriesList.map((catName) => (
                        <option key={`cat_${catName}`} value={`CATEGORY:${catName}`}>
                          Category: {catName}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {allCategoriesList.map((catName) => {
                    const templatesInCat = allTemplatesList.filter(
                      (t) => t.category_name?.toLowerCase() === catName.toLowerCase()
                    );
                    if (!templatesInCat.length) return null;
                    return (
                      <optgroup key={`grp_${catName}`} label={`Templates: ${catName}`}>
                        {templatesInCat.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}

                  {allTemplatesList.filter((t) => !t.category_name || t.category_name === 'General').length > 0 && (
                    <optgroup label="Other Class Templates">
                      {allTemplatesList
                        .filter((t) => !t.category_name || t.category_name === 'General')
                        .map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>

                {/* Sort Order */}
                <select
                  value={crmSortOrder}
                  onChange={(e) => setCrmSortOrder(e.target.value as any)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
                >
                  <option value="date_asc">Date: Earliest First</option>
                  <option value="date_desc">Date: Latest First</option>
                </select>
              </div>

              {/* View Switcher & Bulk Actions */}
              <div className="flex items-center gap-2">
                {selectedOccIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedOccurrences}
                    className="h-7 text-xs gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Selected ({selectedOccIds.size})
                  </Button>
                )}

                <div className="flex items-center border border-border rounded-md bg-background p-0.5">
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('cards')}
                    className={`px-2.5 py-1 text-xs rounded flex items-center gap-1.5 transition-colors ${
                      crmViewMode === 'cards'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('table')}
                    className={`px-2.5 py-1 text-xs rounded flex items-center gap-1.5 transition-colors ${
                      crmViewMode === 'table'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Table
                  </button>
                </div>
              </div>
            </div>

            {/* Class Occurrences Grid / Table Display */}
            {crmViewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[52vh] p-1">
                {simulatedOccurrences
                  .filter(isOccMatchFilter)
                  .sort((a, b) => (crmSortOrder === 'date_asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
                  .map((occ) => {
                    const isSelected = selectedOccIds.has(occ.id);
                    return (
                      <div
                        key={occ.id}
                        className={`p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between shadow-xs ${
                          isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Card Header: Class Name & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const updated = new Set(selectedOccIds);
                                  if (e.target.checked) updated.add(occ.id);
                                  else updated.delete(occ.id);
                                  setSelectedOccIds(updated);
                                }}
                                className="rounded border-border text-primary focus:ring-primary size-3.5 cursor-pointer"
                              />
                              <h4 className="font-bold text-sm text-foreground leading-tight">
                                {occ.class_name}
                              </h4>
                            </div>
                            {occ.status === 'EXISTS_IN_CRM' || (occ as any).already_exists ? (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold" title="Already scheduled in CRM. Publishing will update details rather than creating a duplicate.">
                                IN CRM (UPDATES)
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                                OPEN
                              </Badge>
                            )}
                          </div>

                          {/* Template & Category Mapping */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20">
                              {occ.category_name}
                            </Badge>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono">
                              Template: {occ.template_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              {occ.delivery_mode}
                            </span>
                          </div>

                          {/* Branch & Room */}
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-semibold">{occ.branch_name}</span>
                            <span className="text-muted-foreground">&bull; {occ.room}</span>
                          </div>

                          {/* Date & Time Slot */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span className="font-medium text-foreground">{occ.date_formatted}</span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-foreground font-medium">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{occ.time_slot}</span>
                            </div>
                          </div>

                          {/* Capacity & Trial */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                            <span>Capacity: <strong className="text-foreground">{occ.capacity}</strong></span>
                            <span>Trial: <strong className="text-foreground">{occ.trial_capacity}</strong></span>
                            <span>Waitlist: <strong className="text-foreground">{occ.waitlist_capacity}</strong></span>
                          </div>

                          {/* Auto-filled Notice */}
                          {occ.na_fields_filled?.length > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Auto-fetched: {occ.na_fields_filled.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 pt-3 border-t border-border mt-3">
                          <button
                            type="button"
                            onClick={() => setEditingOcc({ ...occ })}
                            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors text-xs flex items-center gap-1 cursor-pointer"
                            title="Edit this class session"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOccurrence(occ.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-xs flex items-center gap-1 cursor-pointer ml-1"
                            title="Remove this class session"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Table View */
              <div className="border border-border rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-[52vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 sticky top-0 border-b border-border z-10">
                    <tr>
                      <th className="p-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedOccIds.size > 0 && selectedOccIds.size === simulatedOccurrences.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOccIds(new Set(simulatedOccurrences.map((o) => o.id)));
                            } else {
                              setSelectedOccIds(new Set());
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary size-3.5"
                        />
                      </th>
                      <th className="p-2 font-semibold">Date & Day</th>
                      <th className="p-2 font-semibold">Time Slot</th>
                      <th className="p-2 font-semibold">Class Name & Template</th>
                      <th className="p-2 font-semibold">Branch & Room</th>
                      <th className="p-2 font-semibold">Capacity</th>
                      <th className="p-2 font-semibold">Auto-Filled Fields</th>
                      <th className="p-2 font-semibold">Status</th>
                      <th className="p-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {simulatedOccurrences
                      .filter(isOccMatchFilter)
                      .sort((a, b) => (crmSortOrder === 'date_asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
                      .map((occ) => (
                        <tr key={occ.id} className="hover:bg-muted/40">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedOccIds.has(occ.id)}
                              onChange={(e) => {
                                const updated = new Set(selectedOccIds);
                                if (e.target.checked) updated.add(occ.id);
                                else updated.delete(occ.id);
                                setSelectedOccIds(updated);
                              }}
                              className="rounded border-border text-primary focus:ring-primary size-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="font-medium text-foreground">{occ.date_formatted}</div>
                            <div className="text-[10px] text-muted-foreground">{occ.day_name}</div>
                          </td>
                          <td className="p-2 font-mono whitespace-nowrap font-medium text-foreground">
                            {occ.time_slot}
                          </td>
                          <td className="p-2">
                            <div className="font-semibold text-foreground">{occ.class_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Linked: {occ.template_name} ({occ.template_code})
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-foreground">{occ.branch_name}</div>
                            <div className="text-[10px] text-muted-foreground">{occ.room}</div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="font-semibold text-foreground">{occ.capacity}</span>
                            <span className="text-muted-foreground text-[10px]"> (Trial: {occ.trial_capacity})</span>
                          </td>
                          <td className="p-2">
                            {occ.na_fields_filled?.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                                {occ.na_fields_filled.join(', ')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">From Sheet</span>
                            )}
                          </td>
                          <td className="p-2">
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                              OPEN
                            </Badge>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingOcc({ ...occ })}
                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOccurrence(occ.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Delete"
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
            )}

            {/* Step 3 Footer Navigation */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Schedule Rules
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmOccurrencesPublish}
                  disabled={isCommitting || simulatedOccurrences.filter((o) => o.status !== 'DELETED').length === 0}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Publishing to CRM Calendar...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm & Publish to CRM Calendar ({simulatedOccurrences.filter((o) => o.status !== 'DELETED').length} Classes)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Intermediate Detailed CRM Trainer Shift Preview & Confirmation */}
        {step === 3 && entityType === 'TRAINER_ROSTER' && (
          <div className="space-y-4 py-2 flex flex-col flex-1 overflow-hidden">
            {/* Overview & Smart Trainer Shift Auto-Fill Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      CRM Trainer Shift Roster Preview
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                        {simulatedShifts.length} Concrete Shifts
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Target Period: <strong className="text-foreground">{shiftsSummary?.month_label || selectedMonth}</strong> &bull; Showing exact weekly shift allocations across studio branches.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background text-[11px] font-medium py-1 px-2.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trainer Auto-Resolution Active</span>
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/50">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>
                  <strong>Dynamic Metadata Resolution:</strong> Unspecified and &ldquo;NA&rdquo; values in the roster (Shift Hours, Studio Branch, Trainer Code, and Lead Roles) have been automatically populated from the CRM Trainer profiles and Staff Directory.
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by trainer, branch, shift, hours..."
                    value={crmSearchQuery}
                    onChange={(e) => setCrmSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {crmSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCrmSearchQuery('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch Filter */}
                <select
                  value={crmBranchFilter}
                  onChange={(e) => setCrmBranchFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground font-medium"
                >
                  <option value="ALL">All Branches ({allBranchesList.length})</option>
                  {allBranchesList.map((b) => (
                    <option key={b.id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Trainer Filter */}
                <select
                  value={crmTrainerFilter}
                  onChange={(e) => setCrmTrainerFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground font-medium max-w-[220px]"
                >
                  <option value="ALL">All Trainers ({allTrainersList.length})</option>
                  {allTrainersList.map((t) => (
                    <option key={t.id || t.name} value={t.name}>
                      {t.name} ({t.code || 'TRN'})
                    </option>
                  ))}
                </select>

                {/* Shift Filter */}
                <select
                  value={crmShiftFilter}
                  onChange={(e) => setCrmShiftFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground font-medium"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="Morning">Morning Shift (06:30 - 13:30)</option>
                  <option value="Evening">Evening Shift (13:30 - 22:30)</option>
                  <option value="Saturday">Weekend Saturday Roster</option>
                  <option value="Sunday">Weekend Sunday Roster</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedShiftIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedShifts}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedShiftIds.size})</span>
                  </Button>
                )}

                <div className="flex items-center bg-background border border-border rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('cards')}
                    className={`p-1.5 rounded text-xs ${crmViewMode === 'cards' ? 'bg-muted text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Cards View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('table')}
                    className={`p-1.5 rounded text-xs ${crmViewMode === 'table' ? 'bg-muted text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cards View / Table View for Shifts */}
            {crmViewMode === 'cards' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {simulatedShifts.filter(isShiftMatchFilter).map((s) => {
                    const isSelected = selectedShiftIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all relative ${
                          isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const next = new Set(selectedShiftIds);
                                  if (e.target.checked) next.add(s.id);
                                  else next.delete(s.id);
                                  setSelectedShiftIds(next);
                                }}
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 mt-0.5 cursor-pointer"
                              />
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {s.trainer_name ? s.trainer_name.slice(0, 2).toUpperCase() : 'TR'}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-foreground leading-tight">{s.trainer_name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono text-muted-foreground">
                                    {s.trainer_code || 'TRN'}
                                  </Badge>
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 text-[10px] py-0 px-1 border-0">
                                    {s.role || 'Lead Trainer'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={
                                s.already_exists
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]'
                              }
                            >
                              {s.already_exists ? 'EXISTS IN CRM' : 'OPEN'}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground">{s.branch_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{s.shift_name} &bull; <strong className="text-foreground">{s.time_slot}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{s.date_label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/60 text-muted-foreground">
                                {s.duration_hours} hrs / day
                              </Badge>
                              {s.rule_source && (
                                <span className="text-[10px] text-muted-foreground truncate" title={s.rule_source}>
                                  From {s.rule_source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Auto-fetched: Hours, Role, Branch</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingShift({ ...s })}
                              className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Edit shift"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(s.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Remove shift"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto border border-border rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2 w-8">
                        <input
                          type="checkbox"
                          checked={
                            simulatedShifts.filter(isShiftMatchFilter).length > 0 &&
                            simulatedShifts.filter(isShiftMatchFilter).every((s) => selectedShiftIds.has(s.id))
                          }
                          onChange={(e) => {
                            const matching = simulatedShifts.filter(isShiftMatchFilter);
                            if (e.target.checked) {
                              setSelectedShiftIds(new Set([...selectedShiftIds, ...matching.map((s) => s.id)]));
                            } else {
                              const next = new Set(selectedShiftIds);
                              matching.forEach((s) => next.delete(s.id));
                              setSelectedShiftIds(next);
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="p-2">Trainer</th>
                      <th className="p-2">Studio Branch</th>
                      <th className="p-2">Shift & Hours</th>
                      <th className="p-2">Date / Week Range</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Auto-Resolved</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {simulatedShifts
                      .filter(isShiftMatchFilter)
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedShiftIds.has(s.id)}
                              onChange={(e) => {
                                const next = new Set(selectedShiftIds);
                                if (e.target.checked) next.add(s.id);
                                else next.delete(s.id);
                                setSelectedShiftIds(next);
                              }}
                              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                {s.trainer_name ? s.trainer_name.slice(0, 2).toUpperCase() : 'TR'}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{s.trainer_name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{s.trainer_code || 'TRN'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 font-medium text-foreground">{s.branch_name}</td>
                          <td className="p-2">
                            <div className="font-medium text-foreground">{s.shift_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{s.time_slot} ({s.duration_hours}h)</div>
                          </td>
                          <td className="p-2 text-foreground">{s.date_label}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                              {s.role || 'LEAD'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                              {s.na_fields_filled?.join(', ') || 'Hours, Role, Branch'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className={
                                s.already_exists
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]'
                              }
                            >
                              {s.already_exists ? 'EXISTS IN CRM' : 'OPEN'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingShift({ ...s })}
                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteShift(s.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Delete"
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
            )}

            {/* Step 3 Footer Navigation for Trainer Shifts */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Roster Rules
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmTrainerShiftsPublish}
                  disabled={isCommitting || simulatedShifts.filter((s) => s.status !== 'DELETED').length === 0}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Publishing Trainer Rosters...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm & Publish to CRM Rosters ({simulatedShifts.filter((s) => s.status !== 'DELETED').length} Shifts)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success Confirmation */}
        {step === 4 && importResult && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {entityType === 'TRAINER_ROSTER' ? 'Trainer Rosters Published Successfully!' : 'Upload Finished Successfully!'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {entityType === 'TRAINER_ROSTER'
                  ? 'All trainer shift allocations have been saved and assigned to CRM schedules.'
                  : 'All class occurrences have been generated and published to your CRM calendar.'}
              </p>
            </div>
            <div className="flex justify-center gap-4 text-left max-w-sm mx-auto">
              <div className="bg-muted/50 p-4 rounded-xl flex-1 text-center">
                <p className="text-xs text-muted-foreground">
                  {entityType === 'TRAINER_ROSTER' ? 'Shifts Assigned' : 'Classes Created'}
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.created_count}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-xl flex-1 text-center">
                <p className="text-xs text-muted-foreground">Records Updated</p>
                <p className="text-2xl font-bold text-foreground mt-1">{importResult.updated_count}</p>
              </div>
            </div>

            <Button onClick={() => handleDialogClose(false)} className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {entityType === 'TRAINER_ROSTER' ? 'Done & View Trainer Rosters' : 'Done & View Classes'}
            </Button>
          </div>
        )}
      </DialogContent>
      {/* Edit Trainer Shift Modal Dialog for Step 3 */}
      <Dialog open={editingShift !== null} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Trainer Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify trainer assignment, branch, shift hours, and role before publishing to CRM.
            </DialogDescription>
          </DialogHeader>

          {editingShift && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold text-foreground">Trainer Assignment:</label>
                <select
                  value={editingShift.trainer_id || ''}
                  onChange={(e) => {
                    const tId = e.target.value;
                    const matched = allTrainersList.find((t) => t.id === tId || t.name === tId);
                    if (matched) {
                      setEditingShift({
                        ...editingShift,
                        trainer_id: matched.id,
                        trainer_name: matched.name,
                        trainer_code: matched.code || editingShift.trainer_code,
                      });
                    }
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                >
                  {allTrainersList.map((t) => (
                    <option key={t.id || t.name} value={t.id}>
                      {t.name} ({t.code || 'TRN'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Studio Branch:</label>
                <select
                  value={editingShift.branch_name || ''}
                  onChange={(e) => {
                    const bName = e.target.value;
                    const matched = allBranchesList.find((b) => b.name === bName || b.id === bName);
                    if (matched) {
                      setEditingShift({
                        ...editingShift,
                        branch_id: matched.id,
                        branch_name: matched.name,
                        branch_code: matched.code,
                      });
                    }
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                >
                  {allBranchesList.map((b) => (
                    <option key={b.id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Shift Type:</label>
                  <select
                    value={editingShift.shift_name || ''}
                    onChange={(e) => setEditingShift({ ...editingShift, shift_name: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                  >
                    <option value="Morning Shift">Morning Shift</option>
                    <option value="Evening Shift">Evening Shift</option>
                    <option value="Weekend Saturday Roster">Weekend Saturday Roster</option>
                    <option value="Weekend Sunday Roster">Weekend Sunday Roster</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground">Role:</label>
                  <select
                    value={editingShift.role || 'Lead Trainer'}
                    onChange={(e) => setEditingShift({ ...editingShift, role: e.target.value, role_code: e.target.value === 'Assistant' ? 'ASSISTANT' : 'LEAD' })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                  >
                    <option value="Lead Trainer">Lead Trainer</option>
                    <option value="Assistant">Assistant Trainer</option>
                    <option value="Co-Trainer">Co-Trainer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Time Slot:</label>
                  <input
                    type="text"
                    value={editingShift.time_slot || ''}
                    onChange={(e) => setEditingShift({ ...editingShift, time_slot: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Hours / Day:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={editingShift.duration_hours || 7}
                    onChange={(e) => setEditingShift({ ...editingShift, duration_hours: parseFloat(e.target.value) || 7 })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground">Date / Week Label:</label>
                <input
                  type="text"
                  value={editingShift.date_label || ''}
                  onChange={(e) => setEditingShift({ ...editingShift, date_label: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditingShift(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingShift) handleSaveEditedShift(editingShift);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Occurrence Modal Dialog for Step 3 */}
      <Dialog open={editingOcc !== null} onOpenChange={(open) => !open && setEditingOcc(null)}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Class Occurrence
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify template mapping, branch, room, capacity, and time before publishing to CRM.
            </DialogDescription>
          </DialogHeader>

          {editingOcc && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold text-foreground">Class Template Mapping (CRM):</label>
                <select
                  value={editingOcc.template_id || ''}
                  onChange={(e) => {
                    const tId = e.target.value;
                    const matched = allTemplatesList.find((t) => t.id === tId || t.name === tId);
                    if (matched) {
                      setEditingOcc({
                        ...editingOcc,
                        template_id: matched.id,
                        template_name: matched.name,
                        template_code: matched.code,
                        class_name: matched.name,
                        category_name: matched.category_name,
                        capacity: matched.default_capacity || editingOcc.capacity || 12,
                        trial_capacity: matched.default_trial_capacity || editingOcc.trial_capacity || 2,
                        waitlist_capacity: matched.default_waitlist_capacity || editingOcc.waitlist_capacity || 5,
                      });
                    }
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                >
                  {allCategoriesList.map((catName) => {
                    const catTpls = allTemplatesList.filter((t) => t.category_name?.toLowerCase() === catName.toLowerCase());
                    if (!catTpls.length) return null;
                    return (
                      <optgroup key={`edit_grp_${catName}`} label={catName}>
                        {catTpls.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Cap: {t.default_capacity})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {allTemplatesList.filter((t) => !t.category_name || t.category_name === 'General').length > 0 && (
                    <optgroup label="Other Templates">
                      {allTemplatesList
                        .filter((t) => !t.category_name || t.category_name === 'General')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Cap: {t.default_capacity})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Studio Branch (CRM):</label>
                <select
                  value={editingOcc.branch_id || ''}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const matched = allBranchesList.find((b) => b.id === bId || b.name === bId);
                    if (matched) {
                      setEditingOcc({
                        ...editingOcc,
                        branch_id: matched.id,
                        branch_name: matched.name,
                        branch_code: matched.code,
                      });
                    }
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-medium"
                >
                  {allBranchesList.map((b) => (
                    <option key={b.id || b.name} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Room / Studio:</label>
                  <input
                    type="text"
                    value={editingOcc.room || ''}
                    onChange={(e) => setEditingOcc({ ...editingOcc, room: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Date (YYYY-MM-DD):</label>
                  <input
                    type="date"
                    value={editingOcc.date || ''}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setEditingOcc({
                        ...editingOcc,
                        date: newD,
                        date_formatted: newD,
                      });
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Start Time (HH:MM):</label>
                  <input
                    type="time"
                    value={editingOcc.start_time || '06:30'}
                    onChange={(e) => setEditingOcc({ ...editingOcc, start_time: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">End Time (HH:MM):</label>
                  <input
                    type="time"
                    value={editingOcc.end_time || '07:30'}
                    onChange={(e) => setEditingOcc({ ...editingOcc, end_time: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Capacity:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingOcc.capacity || 12}
                    onChange={(e) => setEditingOcc({ ...editingOcc, capacity: parseInt(e.target.value) || 12 })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Trial Cap:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingOcc.trial_capacity || 0}
                    onChange={(e) => setEditingOcc({ ...editingOcc, trial_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Waitlist:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingOcc.waitlist_capacity || 0}
                    onChange={(e) => setEditingOcc({ ...editingOcc, waitlist_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded bg-background text-foreground text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditingOcc(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingOcc) handleSaveEditedOccurrence(editingOcc);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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


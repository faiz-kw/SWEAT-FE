import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  RefreshCw,
  Video,
  Award,
  Sparkles,
  Play,
  RotateCw,
  UserCheck,
  Tag,
  DollarSign,
  Building2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  CalendarX,
  Info,
  ExternalLink,
} from 'lucide-react';
import { BranchScheduleTimePicker, formatTime12h } from './BranchScheduleTimePicker';
import { toast } from 'sonner';
import { classesApi } from '../../services/classesApi';
import {
  ClassCategory,
  ClassTemplate,
  ClassScheduleRule,
  ClassOccurrence,
  ClassContentItem,
  ClassPrice,
  ClassBranchAvailability,
  DeliveryMode,
  ClassTemplateStatus,
  TrainerOccurrenceRole,
} from '../../types/classes';
import { useAuth } from '../../contexts/auth-context';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ClassesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthorized = !user?.role || user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN' || (user?.permissions && user.permissions.includes('core.settings.edit'));

  const [activeTab, setActiveTab] = useState<'categories' | 'templates' | 'rules' | 'occurrences' | 'content'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('');

  // Modals state
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClassCategory | null>(null);

  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClassTemplate | null>(null);

  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [isGenerateOccurrencesOpen, setIsGenerateOccurrencesOpen] = useState(false);
  const [selectedRuleForGen, setSelectedRuleForGen] = useState<ClassScheduleRule | null>(null);
  const [genFromDate, setGenFromDate] = useState<string>(selectedDate);
  const [genToDate, setGenToDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [isCreateOccurrenceOpen, setIsCreateOccurrenceOpen] = useState(false);
  const [occurrenceError, setOccurrenceError] = useState<string | null>(null);

  const [isAssignTrainerOpen, setIsAssignTrainerOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<ClassOccurrence | null>(null);
  const [trainerProfileIdInput, setTrainerProfileIdInput] = useState('');
  const [trainerRoleInput, setTrainerRoleInput] = useState<TrainerOccurrenceRole>('LEAD');
  const [trainerError, setTrainerError] = useState<string | null>(null);

  const [isBranchAvailOpen, setIsBranchAvailOpen] = useState(false);
  const [selectedTemplateForAvail, setSelectedTemplateForAvail] = useState<ClassTemplate | null>(null);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedTemplateForPricing, setSelectedTemplateForPricing] = useState<ClassTemplate | null>(null);

  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);

  // Forms state
  const [categoryForm, setCategoryForm] = useState({
    code: '',
    name: '',
    description: '',
    display_order: '',
    status: '',
  });

  const [templateForm, setTemplateForm] = useState({
    code: '',
    name: '',
    category: '',
    program: '',
    description: '',
    default_duration_minutes: '',
    default_capacity: '',
    default_trial_capacity: '',
    default_waitlist_capacity: '',
    default_delivery_mode: '',
    allow_booking: false,
    allow_trial: false,
    allow_waitlist: false,
    allow_reschedule: false,
    min_age: '',
    max_age: '',
    status: '',
  });

  const [ruleForm, setRuleForm] = useState({
    class_template: '',
    branch: '',
    recurrence_type: 'WEEKLY',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: '08:30',
    end_time: '09:30',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    delivery_mode: 'OFFLINE' as DeliveryMode,
    capacity_override: '',
    trial_capacity_override: '',
    waitlist_capacity_override: '',
    status: 'ACTIVE',
  });

  const [occurrenceForm, setOccurrenceForm] = useState({
    class_template: '',
    branch: '',
    occurrence_date: '',
    start_time: '',
    end_time: '',
    delivery_mode: '',
    capacity: '',
    trial_capacity: '',
    waitlist_capacity: '',
  });

  const [branchAvailForm, setBranchAvailForm] = useState({
    branch: '',
    status: 'ENABLED' as 'ENABLED' | 'DISABLED',
    capacity_override: '',
    trial_capacity_override: '',
    waitlist_capacity_override: '',
  });

  const [pricingForm, setPricingForm] = useState({
    branch: '',
    currency: 'INR',
    price: '',
    tax_percent: '18.00',
    effective_from: selectedDate,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    content_type: 'VIDEO' as 'VIDEO' | 'VIDEO_LINK' | 'DOCUMENT' | 'IMAGE' | 'OTHER',
    external_url: '',
    display_order: 1,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [mappingForm, setMappingForm] = useState({
    content_item: '',
    class_template: '',
    class_category: '',
    program: '',
    delivery_mode: '' as DeliveryMode | '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  // Queries
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['class-categories'],
    queryFn: () => classesApi.getCategories(),
  });

  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['class-templates'],
    queryFn: () => classesApi.getTemplates(),
  });

  const { data: rules = [], isLoading: loadingRules, refetch: refetchRules } = useQuery({
    queryKey: ['class-schedule-rules', selectedBranchFilter],
    queryFn: () => classesApi.getScheduleRules(selectedBranchFilter || undefined),
  });

  const { data: occurrences = [], isLoading: loadingOccurrences, refetch: refetchOccurrences } = useQuery({
    queryKey: ['class-occurrences', selectedDate, selectedBranchFilter],
    queryFn: () => classesApi.getOccurrences({
      occurrence_date: selectedDate,
      branch_id: selectedBranchFilter || undefined,
    }),
  });

  const { data: contentItems = [], isLoading: loadingContent, refetch: refetchContent } = useQuery({
    queryKey: ['class-content-items'],
    queryFn: () => classesApi.getContentItems(),
  });

  const { data: contentMappings = [], refetch: refetchMappings } = useQuery({
    queryKey: ['class-content-mappings'],
    queryFn: () => classesApi.getContentMappings(),
  });

  // External dropdown data (Real backend queries)
  const { data: branches = [] } = useQuery({
    queryKey: ['tenant-branches'],
    queryFn: () => classesApi.getBranches(),
  });

  // Real-time Branch Operating Hours & Holiday Exceptions for Recurring Rule
  const { data: ruleBranchWorkingHours = [] } = useQuery({
    queryKey: ['branch-working-hours', ruleForm.branch],
    queryFn: () => classesApi.getBranchWorkingHours(ruleForm.branch),
    enabled: !!ruleForm.branch,
  });

  const { data: ruleBranchExceptions = [] } = useQuery({
    queryKey: ['branch-operating-exceptions', ruleForm.branch],
    queryFn: () => classesApi.getBranchOperatingExceptions(ruleForm.branch),
    enabled: !!ruleForm.branch,
  });

  // Real-time Branch Operating Hours & Holiday Exceptions for One-Off Session Modal
  const { data: occurrenceBranchWorkingHours = [] } = useQuery({
    queryKey: ['branch-working-hours', occurrenceForm.branch],
    queryFn: () => classesApi.getBranchWorkingHours(occurrenceForm.branch),
    enabled: !!occurrenceForm.branch,
  });

  const { data: occurrenceBranchExceptions = [] } = useQuery({
    queryKey: ['branch-operating-exceptions', occurrenceForm.branch],
    queryFn: () => classesApi.getBranchOperatingExceptions(occurrenceForm.branch),
    enabled: !!occurrenceForm.branch,
  });

  const isDayClosed = (dayNum: number) => {
    const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === dayNum);
    return wh ? !wh.is_open : false;
  };

  const getDayScheduleText = (dayNum: number) => {
    const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === dayNum);
    if (!wh) return null;
    if (!wh.is_open) return 'Closed';
    if (wh.is_24_hours) return '24h Open';
    return `${formatTime12h(wh.open_time?.substring(0, 5))} – ${formatTime12h(wh.close_time?.substring(0, 5))}`;
  };

  const getEffectiveOperatingWindow = () => {
    if (!ruleBranchWorkingHours || ruleBranchWorkingHours.length === 0) {
      return { minTime: undefined, maxTime: undefined, text: 'Operating schedule not configured for selected branch' };
    }

    const targetDays = ruleForm.days_of_week.length > 0
      ? ruleForm.days_of_week
      : ruleBranchWorkingHours.filter((w: any) => w.is_open).map((w: any) => w.day_of_week);

    if (targetDays.length === 0) {
      return { minTime: undefined, maxTime: undefined, text: 'No active operating days selected' };
    }

    let earliestOpen = '23:59';
    let latestClose = '00:00';
    let hasOpen = false;

    for (const d of targetDays) {
      const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === d);
      if (wh && wh.is_open) {
        hasOpen = true;
        if (wh.is_24_hours) {
          earliestOpen = '00:00';
          latestClose = '23:59';
          break;
        }
        if (wh.open_time && wh.open_time.substring(0, 5) < earliestOpen) earliestOpen = wh.open_time.substring(0, 5);
        if (wh.close_time && wh.close_time.substring(0, 5) > latestClose) latestClose = wh.close_time.substring(0, 5);
      }
    }

    if (!hasOpen) {
      return { minTime: undefined, maxTime: undefined, text: 'Selected days are closed in branch schedule' };
    }

    const minT = earliestOpen === '23:59' ? undefined : earliestOpen;
    const maxT = latestClose === '00:00' ? undefined : latestClose;
    return {
      minTime: minT,
      maxTime: maxT,
      text: minT && maxT ? `Branch Operating Window: ${formatTime12h(minT)} – ${formatTime12h(maxT)}` : 'Operating schedule pending',
    };
  };

  const activeHolidayClosures = ruleBranchExceptions.filter((ex: any) => {
    if (!ex.is_closed) return false;
    if (!ruleForm.valid_from) return false;
    if (ruleForm.valid_until) {
      return ex.exception_date >= ruleForm.valid_from && ex.exception_date <= ruleForm.valid_until;
    }
    return ex.exception_date >= ruleForm.valid_from;
  });

  // Dynamic schedule, operating window, and holiday resolution for one-off class session
  const getOccurrenceDateSchedule = () => {
    if (!occurrenceForm.branch) {
      return {
        isConfigured: false,
        isOpen: false,
        isException: false,
        statusText: 'Select a branch to view operating schedule',
        reason: null,
        minTime: undefined,
        maxTime: undefined,
      };
    }
    if (!occurrenceForm.occurrence_date) {
      return {
        isConfigured: false,
        isOpen: false,
        isException: false,
        statusText: 'Select session date to view operating schedule',
        reason: null,
        minTime: undefined,
        maxTime: undefined,
      };
    }

    // 1. Date-specific operating exception / holiday (Rule 2: Exceptions override weekly hours)
    const exception = occurrenceBranchExceptions.find(
      (ex: any) => ex.exception_date === occurrenceForm.occurrence_date
    );

    if (exception) {
      if (exception.is_closed) {
        return {
          isConfigured: true,
          isOpen: false,
          isException: true,
          statusText: `Closed for holiday/exception: ${exception.reason || 'Branch Closed'}`,
          reason: exception.reason || 'Operating Exception / Holiday Closure',
          minTime: undefined,
          maxTime: undefined,
        };
      }
      const minT = exception.open_time ? exception.open_time.substring(0, 5) : '00:00';
      const maxT = exception.close_time ? exception.close_time.substring(0, 5) : '23:59';
      return {
        isConfigured: true,
        isOpen: true,
        isException: true,
        statusText: `Special holiday hours (${exception.reason || 'Holiday'}): ${formatTime12h(minT)} – ${formatTime12h(maxT)}`,
        reason: exception.reason,
        minTime: minT,
        maxTime: maxT,
      };
    }

    // 2. Weekly schedule: Python isoweekday Mon=1, Sun=7 (Canonical ISO standard)
    const [y, m, d] = occurrenceForm.occurrence_date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const wh = occurrenceBranchWorkingHours.find((w: any) => w.day_of_week === dayOfWeek);

    if (wh) {
      if (!wh.is_open) {
        return {
          isConfigured: true,
          isOpen: false,
          isException: false,
          statusText: 'Branch is closed on this day of the week',
          reason: 'Weekly Closed Day',
          minTime: undefined,
          maxTime: undefined,
        };
      }
      if (wh.is_24_hours) {
        return {
          isConfigured: true,
          isOpen: true,
          isException: false,
          statusText: 'Branch is open 24 hours',
          reason: null,
          minTime: '00:00',
          maxTime: '23:59',
        };
      }
      const minT = wh.open_time ? wh.open_time.substring(0, 5) : '00:00';
      const maxT = wh.close_time ? wh.close_time.substring(0, 5) : '23:59';
      return {
        isConfigured: true,
        isOpen: true,
        isException: false,
        statusText: `Operating Window: ${formatTime12h(minT)} – ${formatTime12h(maxT)}`,
        reason: null,
        minTime: minT,
        maxTime: maxT,
      };
    }

    // 3. Fallback when days are not yet seeded in backend (Plug-and-play readiness)
    return {
      isConfigured: false,
      isOpen: true,
      isException: false,
      statusText: 'Operating schedule pending configuration for this branch',
      reason: null,
      minTime: undefined,
      maxTime: undefined,
    };
  };

  const occurrenceSchedule = getOccurrenceDateSchedule();

  const openNewRuleModal = () => {
    setRuleError(null);
    const defaultBranchId = selectedBranchFilter || (branches.length === 1 ? branches[0].id : '');
    setRuleForm({
      class_template: '',
      branch: defaultBranchId,
      recurrence_type: 'WEEKLY',
      days_of_week: [],
      start_time: '',
      end_time: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      delivery_mode: 'OFFLINE',
      capacity_override: '',
      trial_capacity_override: '',
      waitlist_capacity_override: '',
      status: 'ACTIVE',
    });
    setIsCreateRuleOpen(true);
  };

  const openNewOccurrenceModal = () => {
    setOccurrenceError(null);
    const defaultBranchId = selectedBranchFilter || (branches.length === 1 ? branches[0].id : '');
    const defaultDate = selectedDate || new Date().toISOString().split('T')[0];
    setOccurrenceForm({
      class_template: '',
      branch: defaultBranchId,
      occurrence_date: defaultDate,
      start_time: '',
      end_time: '',
      delivery_mode: 'OFFLINE',
      capacity: '',
      trial_capacity: '',
      waitlist_capacity: '',
    });
    setIsCreateOccurrenceOpen(true);
  };

  const { data: trainers = [] } = useQuery({
    queryKey: ['tenant-trainers'],
    queryFn: () => classesApi.getTrainers(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['tenant-programs'],
    queryFn: () => classesApi.getPrograms(),
  });

  const { data: branchAvailabilities = [], refetch: refetchAvailabilities } = useQuery({
    queryKey: ['class-branch-availabilities', selectedTemplateForAvail?.id],
    queryFn: () => classesApi.getBranchAvailabilities(selectedTemplateForAvail?.id),
    enabled: !!selectedTemplateForAvail,
  });

  const { data: classPrices = [], refetch: refetchPrices } = useQuery({
    queryKey: ['class-prices', selectedTemplateForPricing?.id],
    queryFn: () => classesApi.getClassPrices(selectedTemplateForPricing?.id),
    enabled: !!selectedTemplateForPricing,
  });

  const refetchAll = () => {
    refetchCategories();
    refetchTemplates();
    refetchRules();
    refetchOccurrences();
    refetchContent();
  };

  // Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryForm) => {
      const payload: any = {
        code: data.code,
        name: data.name,
        description: data.description,
        display_order: data.display_order ? Number(data.display_order) : 1,
        status: (data.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      };
      if (editingCategory) {
        return classesApi.updateCategory(editingCategory.id, payload);
      }
      return classesApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-categories'] });
      setIsCreateCategoryOpen(false);
      setEditingCategory(null);
      setCategoryForm({ code: '', name: '', description: '', display_order: '', status: '' });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) => {
      const payload: any = {
        code: data.code,
        name: data.name,
        category: data.category || null,
        program: data.program || null,
        description: data.description,
        default_duration_minutes: data.default_duration_minutes ? Number(data.default_duration_minutes) : 60,
        default_capacity: data.default_capacity ? Number(data.default_capacity) : 20,
        default_trial_capacity: data.default_trial_capacity ? Number(data.default_trial_capacity) : 0,
        default_waitlist_capacity: data.default_waitlist_capacity ? Number(data.default_waitlist_capacity) : 0,
        default_delivery_mode: (data.default_delivery_mode as DeliveryMode) || 'OFFLINE',
        allow_booking: data.allow_booking,
        allow_trial: data.allow_trial,
        allow_waitlist: data.allow_waitlist,
        allow_reschedule: data.allow_reschedule,
        min_age: data.min_age ? Number(data.min_age) : null,
        max_age: data.max_age ? Number(data.max_age) : null,
        status: (data.status as ClassTemplateStatus) || 'ACTIVE',
      };
      if (editingTemplate) {
        return classesApi.updateTemplate(editingTemplate.id, payload);
      }
      return classesApi.createTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-templates'] });
      setIsCreateTemplateOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      code: '',
      name: '',
      category: '',
      program: '',
      description: '',
      default_duration_minutes: '',
      default_capacity: '',
      default_trial_capacity: '',
      default_waitlist_capacity: '',
      default_delivery_mode: '',
      allow_booking: false,
      allow_trial: false,
      allow_waitlist: false,
      allow_reschedule: false,
      min_age: '',
      max_age: '',
      status: '',
    });
  };

  const createRuleMutation = useMutation({
    mutationFn: (data: typeof ruleForm) => {
      const payload: any = {
        class_template: data.class_template,
        branch: data.branch,
        recurrence_type: data.recurrence_type || 'WEEKLY',
        days_of_week: data.days_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
        delivery_mode: data.delivery_mode || 'OFFLINE',
        capacity_override: data.capacity_override ? Number(data.capacity_override) : null,
        trial_capacity_override: data.trial_capacity_override ? Number(data.trial_capacity_override) : null,
        waitlist_capacity_override: data.waitlist_capacity_override ? Number(data.waitlist_capacity_override) : null,
        status: data.status || 'ACTIVE',
      };
      return classesApi.createScheduleRule(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedule-rules'] });
      setIsCreateRuleOpen(false);
      setRuleError(null);
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      let errorMsg = 'Failed to create schedule rule.';
      if (typeof resp === 'string') {
        errorMsg = resp;
      } else if (resp && typeof resp === 'object') {
        if (resp.detail) {
          errorMsg = resp.detail;
        } else if (resp.error) {
          errorMsg = resp.error;
        } else {
          const messages = Object.entries(resp).map(([field, errs]) => {
            const text = Array.isArray(errs) ? errs.join(', ') : String(errs);
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return `${fieldLabel}: ${text}`;
          });
          if (messages.length > 0) {
            errorMsg = messages.join(' | ');
          }
        }
      }
      setRuleError(errorMsg);
    },
  });

  const generateOccurrencesMutation = useMutation({
    mutationFn: () => {
      if (!selectedRuleForGen) throw new Error('No rule selected');
      return classesApi.generateOccurrencesFromRule(selectedRuleForGen.id, genFromDate, genToDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      setIsGenerateOccurrencesOpen(false);
      setSelectedRuleForGen(null);
    },
  });

  const createOccurrenceMutation = useMutation({
    mutationFn: (data: typeof occurrenceForm) => {
      const payload: any = {
        class_template: data.class_template,
        branch: data.branch,
        occurrence_date: data.occurrence_date,
        start_time: data.start_time,
        end_time: data.end_time,
        delivery_mode: data.delivery_mode || 'OFFLINE',
      };
      if (data.capacity !== '' && data.capacity !== null && data.capacity !== undefined) {
        payload.capacity = Number(data.capacity);
      }
      if (data.trial_capacity !== '' && data.trial_capacity !== null && data.trial_capacity !== undefined) {
        payload.trial_capacity = Number(data.trial_capacity);
      }
      if (data.waitlist_capacity !== '' && data.waitlist_capacity !== null && data.waitlist_capacity !== undefined) {
        payload.waitlist_capacity = Number(data.waitlist_capacity);
      }
      return classesApi.createOccurrence(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      setIsCreateOccurrenceOpen(false);
      setOccurrenceError(null);
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      let errorMsg = 'Failed to schedule occurrence.';
      if (typeof resp === 'string') {
        errorMsg = resp;
      } else if (resp && typeof resp === 'object') {
        if (resp.detail) {
          errorMsg = resp.detail;
        } else if (resp.error) {
          errorMsg = typeof resp.error === 'string' ? resp.error : JSON.stringify(resp.error);
        } else {
          const messages = Object.entries(resp).map(([field, errs]) => {
            const text = Array.isArray(errs) ? errs.join(', ') : String(errs);
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return `${fieldLabel}: ${text}`;
          });
          if (messages.length > 0) {
            errorMsg = messages.join(' | ');
          }
        }
      }
      setOccurrenceError(errorMsg);
    },
  });

  const assignTrainerMutation = useMutation({
    mutationFn: ({
      occurrenceId,
      trainerId,
      role,
    }: {
      occurrenceId: string;
      trainerId: string;
      role: TrainerOccurrenceRole;
    }) => classesApi.assignTrainer(occurrenceId, trainerId, role),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      setIsAssignTrainerOpen(false);
      setSelectedOccurrence(null);
      setTrainerProfileIdInput('');
      setTrainerError(null);
      toast.success(
        data?.trainer_name
          ? `Assigned ${data.trainer_name} (${data.trainer_role || 'Lead'}) successfully!`
          : 'Trainer assigned to class occurrence successfully!'
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Validation failed. Trainer may have conflict or lack specialty.';
      setTrainerError(msg);
      toast.error('Failed to assign trainer', { description: msg });
    },
  });

  const assignContentMutation = useMutation({
    mutationFn: (occurrenceId: string) => classesApi.rotateContent(occurrenceId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      toast.success(
        data?.content_title
          ? `Workout content rotated to: "${data.content_title}" (Cycle #${data.rotation_cycle_number})`
          : 'Workout content rotated successfully!'
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to rotate workout content.';
      toast.error(msg, {
        description: 'No workout items are in this template’s mapping pool yet. Go to "Content Studio" tab to create content items and map them.',
      });
    },
  });

  const createBranchAvailMutation = useMutation({
    mutationFn: (data: typeof branchAvailForm) => {
      if (!selectedTemplateForAvail) throw new Error('No template selected');
      return classesApi.createBranchAvailability({
        class_template: selectedTemplateForAvail.id,
        branch: data.branch,
        status: data.status,
        capacity_override: data.capacity_override ? Number(data.capacity_override) : undefined,
        trial_capacity_override: data.trial_capacity_override ? Number(data.trial_capacity_override) : undefined,
        waitlist_capacity_override: data.waitlist_capacity_override ? Number(data.waitlist_capacity_override) : undefined,
      });
    },
    onSuccess: () => {
      refetchAvailabilities();
      setBranchAvailForm({ branch: '', status: 'ENABLED', capacity_override: '', trial_capacity_override: '', waitlist_capacity_override: '' });
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: (data: typeof pricingForm) => {
      if (!selectedTemplateForPricing) throw new Error('No template selected');
      return classesApi.createClassPrice({
        class_template: selectedTemplateForPricing.id,
        branch: data.branch || undefined,
        currency: data.currency,
        price: data.price,
        tax_percent: data.tax_percent,
        effective_from: data.effective_from,
        status: data.status,
      });
    },
    onSuccess: () => {
      refetchPrices();
      setPricingForm({ branch: '', currency: 'INR', price: '', tax_percent: '18.00', effective_from: selectedDate, status: 'ACTIVE' });
    },
  });

  const saveContentMutation = useMutation({
    mutationFn: (data: typeof contentForm) => {
      return classesApi.createContentItem({
        title: data.title,
        description: data.description,
        content_type: data.content_type as any,
        external_url: data.external_url || undefined,
        display_order: Number(data.display_order),
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-content-items'] });
      setIsCreateContentOpen(false);
      setContentForm({ title: '', description: '', content_type: 'VIDEO', external_url: '', display_order: 1, status: 'ACTIVE' });
    },
  });

  const saveMappingMutation = useMutation({
    mutationFn: (data: typeof mappingForm) => {
      return classesApi.createContentMapping({
        content_item: data.content_item,
        class_template: data.class_template || undefined,
        class_category: data.class_category || undefined,
        program: data.program || undefined,
        delivery_mode: (data.delivery_mode as DeliveryMode) || undefined,
        status: data.status,
      });
    },
    onSuccess: () => {
      refetchMappings();
      setIsCreateMappingOpen(false);
      setMappingForm({ content_item: '', class_template: '', class_category: '', program: '', delivery_mode: '', status: 'ACTIVE' });
    },
  });

  // Filter helpers
  const filteredCategories = categories.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term);
  });

  const filteredTemplates = templates.filter((tpl) => {
    const term = searchTerm.toLowerCase();
    return (
      tpl.name.toLowerCase().includes(term) ||
      tpl.code.toLowerCase().includes(term) ||
      (tpl.category_name || '').toLowerCase().includes(term) ||
      (tpl.program_name || '').toLowerCase().includes(term)
    );
  });

  const filteredOccurrences = occurrences.filter((occ) => {
    const term = searchTerm.toLowerCase();
    const name = occ.template_name || '';
    const branch = occ.branch_name || '';
    return name.toLowerCase().includes(term) || branch.toLowerCase().includes(term);
  });

  const filteredRules = rules.filter((r) => {
    const term = searchTerm.toLowerCase();
    const name = r.template_name || '';
    const branch = r.branch_name || '';
    return name.toLowerCase().includes(term) || branch.toLowerCase().includes(term);
  });

  const filteredContent = contentItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return item.title.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Platform Header */}
      <PageHeader
        title="Group Classes Command Center"
        subtitle="Class Categories, Templates, Recurring Rules, Daily Sessions & Content Studio"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Layer 2 Module E
            </span>
            <span className="text-muted-foreground text-xs">
              {activeTab === 'categories' && `${categories.length} Categories`}
              {activeTab === 'templates' && `${templates.length} Class Templates`}
              {activeTab === 'rules' && `${rules.length} Recurring Rules`}
              {activeTab === 'occurrences' && `${occurrences.length} Sessions on ${selectedDate}`}
              {activeTab === 'content' && `${contentItems.length} Content Items`}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {isAuthorized && activeTab === 'categories' && (
              <Button size="sm" onClick={() => { setEditingCategory(null); setCategoryForm({ code: '', name: '', description: '', display_order: categories.length + 1, status: 'ACTIVE' }); setIsCreateCategoryOpen(true); }} className="gap-1.5">
                <Plus className="size-3.5" />
                <span>New Category</span>
              </Button>
            )}
            {isAuthorized && activeTab === 'templates' && (
              <Button size="sm" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsCreateTemplateOpen(true); }} className="gap-1.5">
                <Plus className="size-3.5" />
                <span>New Class Template</span>
              </Button>
            )}
            {isAuthorized && activeTab === 'rules' && (
              <Button size="sm" onClick={openNewRuleModal} className="gap-1.5">
                <Plus className="size-3.5" />
                <span>New Recurring Rule</span>
              </Button>
            )}
            {isAuthorized && activeTab === 'occurrences' && (
              <Button size="sm" onClick={openNewOccurrenceModal} className="gap-1.5">
                <Plus className="size-3.5" />
                <span>Schedule Session</span>
              </Button>
            )}
            {isAuthorized && activeTab === 'content' && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setIsCreateMappingOpen(true)} className="gap-1.5 text-xs">
                  <Sparkles className="size-3.5" />
                  <span>Map Content</span>
                </Button>
                <Button size="sm" onClick={() => setIsCreateContentOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" />
                  <span>New Content</span>
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={refetchAll} title="Refresh" className="gap-1.5">
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* Navigation Tabs - 5 Tabs Ordered According to Source of Truth */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Class Categories ({categories.length})
          </button>
          <button
            onClick={() => { setActiveTab('templates'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Class Templates ({templates.length})
          </button>
          <button
            onClick={() => { setActiveTab('rules'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Recurring Rules ({rules.length})
          </button>
          <button
            onClick={() => { setActiveTab('occurrences'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'occurrences'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Daily Schedule & Sessions ({occurrences.length})
          </button>
          <button
            onClick={() => { setActiveTab('content'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Content Studio ({contentItems.length})
          </button>
        </div>

        {/* TAB 1: CLASS CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search categories by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {loadingCategories ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading categories from tenant database...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Tag className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Categories Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Create categories like HIIT, Mobility, Strength, or Recovery to organize class templates.
                </p>
                {isAuthorized && (
                  <Button size="sm" onClick={() => { setEditingCategory(null); setCategoryForm({ code: '', name: '', description: '', display_order: 1, status: 'ACTIVE' }); setIsCreateCategoryOpen(true); }}>
                    <Plus className="size-3.5 mr-1" /> Add Category
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{cat.code}</span>
                        <Badge variant={cat.status === 'ACTIVE' ? 'default' : 'secondary'} className={cat.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : ''}>
                          {cat.status}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Order: #{cat.display_order}</span>
                      {isAuthorized && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              code: cat.code,
                              name: cat.name,
                              description: cat.description || '',
                              display_order: cat.display_order,
                              status: cat.status,
                            });
                            setIsCreateCategoryOpen(true);
                          }}
                          className="text-xs gap-1 h-7"
                        >
                          <Edit2 className="size-3" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLASS TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search templates by code, name, category, or program..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {loadingTemplates ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading class templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Award className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Templates Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Create high-intensity, mobility, or strength workout templates to schedule group classes.
                </p>
                {isAuthorized && (
                  <Button size="sm" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsCreateTemplateOpen(true); }}>
                    <Plus className="size-3.5 mr-1" /> New Template
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div key={tpl.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{tpl.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          {tpl.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{tpl.name}</h3>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                        {tpl.category_name && (
                          <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                            Cat: {tpl.category_name}
                          </span>
                        )}
                        {tpl.program_name && (
                          <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                            Prog: {tpl.program_name}
                          </span>
                        )}
                        <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                          Mode: {tpl.default_delivery_mode}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Duration</span>
                          <span className="font-semibold text-foreground">{tpl.default_duration_minutes} mins</span>
                        </div>
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Capacity</span>
                          <span className="font-semibold text-foreground">
                            {tpl.default_capacity} (WL: {tpl.default_waitlist_capacity})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplateForAvail(tpl);
                          setIsBranchAvailOpen(true);
                        }}
                        className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                      >
                        <Building2 className="size-3" /> Branches
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplateForPricing(tpl);
                          setIsPricingOpen(true);
                        }}
                        className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                      >
                        <DollarSign className="size-3" /> Pricing
                      </Button>
                      {isAuthorized && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTemplateForm({
                              code: tpl.code,
                              name: tpl.name,
                              category: tpl.category || '',
                              program: tpl.program || '',
                              description: tpl.description || '',
                              default_duration_minutes: tpl.default_duration_minutes,
                              default_capacity: tpl.default_capacity,
                              default_trial_capacity: tpl.default_trial_capacity || 0,
                              default_waitlist_capacity: tpl.default_waitlist_capacity || 0,
                              default_delivery_mode: tpl.default_delivery_mode,
                              allow_booking: tpl.allow_booking,
                              allow_trial: tpl.allow_trial,
                              allow_waitlist: tpl.allow_waitlist,
                              allow_reschedule: tpl.allow_reschedule,
                              min_age: tpl.min_age ? String(tpl.min_age) : '',
                              max_age: tpl.max_age ? String(tpl.max_age) : '',
                              status: tpl.status,
                            });
                            setIsCreateTemplateOpen(true);
                          }}
                          className="text-xs gap-1 h-7"
                        >
                          <Edit2 className="size-3" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECURRING RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search rules by class or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingRules ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading recurring schedule rules...
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <RotateCw className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Recurring Schedule Rules</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Configure recurring weekly timetable patterns to automatically populate occurrence slots.
                </p>
                {isAuthorized && (
                  <Button size="sm" onClick={openNewRuleModal}>
                    <Plus className="size-3.5 mr-1" /> New Recurring Rule
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Class Template</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Weekdays</th>
                        <th className="px-4 py-3">Time Window</th>
                        <th className="px-4 py-3">Validity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{rule.class_name || rule.template_name || rule.class_template}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rule.branch_name || rule.branch}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs">
                              {(rule.days_of_week || []).map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(', ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {rule.start_time} - {rule.end_time}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {rule.valid_from} to {rule.valid_until || 'Ongoing'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                              {rule.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAuthorized && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRuleForGen(rule);
                                  setGenFromDate(selectedDate);
                                  setIsGenerateOccurrencesOpen(true);
                                }}
                                className="text-xs gap-1 h-7"
                              >
                                <Calendar className="size-3" /> Generate Sessions
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DAILY SCHEDULE & SESSIONS */}
        {activeTab === 'occurrences' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search sessions by class or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0 hidden sm:block" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-background w-full sm:w-auto text-xs"
                  />
                </div>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingOccurrences ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading daily schedule from tenant database...
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Calendar className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Occurrences Scheduled</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  No sessions generated for {selectedDate}. Generate sessions from recurring rules or schedule a one-off session.
                </p>
                {isAuthorized && (
                  <Button size="sm" onClick={openNewOccurrenceModal}>
                    <Plus className="size-3.5 mr-1" /> Schedule One-Off Session
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOccurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {occ.delivery_mode}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-2">
                            {occ.template_name || occ.class_name || 'Class Session'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{occ.branch_name || 'Branch Session'}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            occ.status === 'OPEN' || occ.status === 'SCHEDULED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : occ.status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {occ.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {new Date(occ.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(occ.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Capacity: {occ.capacity} (Waitlist: {occ.waitlist_capacity})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Trainers:{' '}
                            {occ.trainers && occ.trainers.length > 0
                              ? occ.trainers.map((t: any) => `${t.trainer_name || t.trainer_code} (${t.trainer_role})`).join(', ')
                              : occ.assigned_trainers && occ.assigned_trainers.length > 0
                              ? occ.assigned_trainers.map((t) => t.trainer_name || t.trainer_code).join(', ')
                              : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-3.5 text-primary shrink-0" />
                          <span>
                            Workout Content:{' '}
                            {(occ as any).active_content ? (
                              <span className="font-semibold text-foreground">
                                {(occ as any).active_content.title}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">No content mapped yet</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                      {isAuthorized && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOccurrence(occ);
                            setTrainerError(null);
                            setIsAssignTrainerOpen(true);
                          }}
                          className="flex-1 text-xs"
                        >
                          Assign Trainer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => assignContentMutation.mutate(occ.id)}
                        disabled={assignContentMutation.isPending}
                        className="flex-1 text-xs"
                      >
                        Rotate Content
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONTENT STUDIO */}
        {activeTab === 'content' && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
              <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground block">NO_REPEAT_UNTIL_EXHAUSTED Engine</span>
                Content rotation strictly serves workout media and session plans in deterministic sequence by display order.
                Items repeat only after the complete pool for a class template has been exhausted.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search content by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {loadingContent ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading Content Studio items...
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Video className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Content Items Registered</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Upload workout playlists, video instructions, and workout cards for the Content Studio.
                </p>
                {isAuthorized && (
                  <Button size="sm" onClick={() => setIsCreateContentOpen(true)}>
                    <Plus className="size-3.5 mr-1" /> Add Content Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">Order #{item.display_order}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                          {item.content_type}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Status: {item.status}</span>
                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Play className="w-3 h-3" /> Stream Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* CREATE / EDIT CLASS CATEGORY MODAL */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Class Category' : 'Create Class Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Code *</Label>
              <Input
                type="text"
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                placeholder="Enter category code..."
                disabled={!!editingCategory}
              />
            </div>
            <div>
              <Label className="mb-1 block">Name *</Label>
              <Input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Enter category name..."
              />
            </div>
            <div>
              <Label className="mb-1 block">Description</Label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Enter description..."
                className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Display Order</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <select
                  value={categoryForm.status}
                  onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Status...</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveCategoryMutation.mutate(categoryForm)}
              disabled={!categoryForm.code || !categoryForm.name || saveCategoryMutation.isPending}
            >
              {saveCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT CLASS TEMPLATE MODAL */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Class Template' : 'Create Class Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {/* BASIC SECTION */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Code *</Label>
                  <Input
                    type="text"
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    placeholder="Enter template code..."
                    disabled={!!editingTemplate}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Class Name *</Label>
                  <Input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Enter class name..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="mb-1 block">Category</Label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Program (Commercial Access)</Label>
                  <select
                    value={templateForm.program}
                    onChange={(e) => setTemplateForm({ ...templateForm, program: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Program Bound</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="mb-1 block">Description</Label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Template description..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
                />
              </div>
            </div>

            {/* DEFAULT SESSION SETTINGS */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">Default Session Settings</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="mb-1 block">Duration (min)</Label>
                  <Input
                    type="number"
                    value={templateForm.default_duration_minutes}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_duration_minutes: e.target.value })}
                    placeholder="e.g. 60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Booking Cap</Label>
                  <Input
                    type="number"
                    value={templateForm.default_capacity}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_capacity: e.target.value })}
                    placeholder="e.g. 20"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Trial Cap</Label>
                  <Input
                    type="number"
                    value={templateForm.default_trial_capacity}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_trial_capacity: e.target.value })}
                    placeholder="e.g. 0"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Waitlist Cap</Label>
                  <Input
                    type="number"
                    value={templateForm.default_waitlist_capacity}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_waitlist_capacity: e.target.value })}
                    placeholder="e.g. 0"
                  />
                </div>
              </div>
            </div>

            {/* BOOKING RULE FLAGS */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">Booking Rule Flags</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_booking}
                    onChange={(e) => setTemplateForm({ ...templateForm, allow_booking: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Allow Booking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_trial}
                    onChange={(e) => setTemplateForm({ ...templateForm, allow_trial: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Allow Trial</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_waitlist}
                    onChange={(e) => setTemplateForm({ ...templateForm, allow_waitlist: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Allow Waitlist</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_reschedule}
                    onChange={(e) => setTemplateForm({ ...templateForm, allow_reschedule: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Allow Reschedule</span>
                </label>
              </div>
            </div>

            {/* DELIVERY & STATUS */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">Delivery Mode</Label>
                  <select
                    value={templateForm.default_delivery_mode}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_delivery_mode: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Delivery Mode...</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Min Age</Label>
                  <Input
                    type="number"
                    value={templateForm.min_age}
                    onChange={(e) => setTemplateForm({ ...templateForm, min_age: e.target.value })}
                    placeholder="None"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Status</Label>
                  <select
                    value={templateForm.status}
                    onChange={(e) => setTemplateForm({ ...templateForm, status: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Status...</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveTemplateMutation.mutate(templateForm)}
              disabled={!templateForm.code || !templateForm.name || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE RECURRING RULE MODAL */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Create Recurring Schedule Rule</span>
              <span className="text-[10px] px-2 py-0.5 font-normal bg-primary/10 text-primary border border-primary/20 rounded-full">
                Branch Hours Aware
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {ruleError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Schedule Rule Validation Failed</p>
                  <p className="text-[11px] leading-relaxed">{ruleError}</p>
                </div>
              </div>
            )}

            {/* TEMPLATE & BRANCH SELECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-medium">Class Template *</Label>
                <select
                  value={ruleForm.class_template}
                  onChange={(e) => setRuleForm({ ...ruleForm, class_template: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block font-medium">Branch *</Label>
                <select
                  value={ruleForm.branch}
                  onChange={(e) => setRuleForm({ ...ruleForm, branch: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* BRANCH OPERATING SCHEDULE BADGE */}
            {ruleForm.branch && (
              <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Clock className="size-3.5 text-primary" />
                  <span>{getEffectiveOperatingWindow().text}</span>
                </div>
                {branchWorkingHours.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {branchWorkingHours.filter((w: any) => w.is_open).length} open days/wk
                  </span>
                )}
              </div>
            )}

            {/* WEEKDAY SELECTOR WITH CLOSED-DAY INTELLIGENCE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="font-medium">Select Days of Week *</Label>
                <span className="text-[10px] text-muted-foreground">Click day to toggle</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { num: 1, label: 'Mon' },
                  { num: 2, label: 'Tue' },
                  { num: 3, label: 'Wed' },
                  { num: 4, label: 'Thu' },
                  { num: 5, label: 'Fri' },
                  { num: 6, label: 'Sat' },
                  { num: 7, label: 'Sun' },
                ].map((d) => {
                  const isSelected = ruleForm.days_of_week.includes(d.num);
                  const closed = isDayClosed(d.num);
                  const scheduleText = getDayScheduleText(d.num);

                  return (
                    <button
                      key={d.num}
                      type="button"
                      disabled={closed}
                      title={closed ? 'Branch is closed on this day' : scheduleText || ''}
                      onClick={() => {
                        if (closed) return;
                        const next = isSelected
                          ? ruleForm.days_of_week.filter((x) => x !== d.num)
                          : [...ruleForm.days_of_week, d.num].sort();
                        setRuleForm({ ...ruleForm, days_of_week: next });
                      }}
                      className={`py-2 px-1 flex flex-col items-center justify-center rounded-lg border transition-all ${
                        closed
                          ? 'bg-rose-500/5 text-rose-500/70 border-rose-500/20 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold cursor-pointer'
                          : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-semibold">{d.label}</span>
                      <span className="text-[9px] mt-0.5 leading-none">
                        {closed ? 'Closed' : isSelected ? 'Active' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Warning if a closed day somehow selected */}
              {ruleForm.days_of_week.some((d) => isDayClosed(d)) && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertTriangle className="size-3 shrink-0" />
                  Branch is closed on some selected days. Please unselect them to proceed.
                </p>
              )}
            </div>

            {/* TIME SELECTORS (BRANCH OPERATING WINDOW RESTRICTED) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-medium">Start Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={ruleForm.start_time}
                  onChange={(val) => {
                    setRuleForm({ ...ruleForm, start_time: val });
                    // Auto-bump end time if needed
                    if (ruleForm.end_time && val >= ruleForm.end_time) {
                      const sParts = val.split(':');
                      const h = parseInt(sParts[0], 10);
                      const m = parseInt(sParts[1], 10);
                      const bumpMins = Math.min(1320, h * 60 + m + 60);
                      const bh = Math.floor(bumpMins / 60) % 24;
                      const bm = bumpMins % 60;
                      setRuleForm((prev) => ({
                        ...prev,
                        start_time: val,
                        end_time: `${bh.toString().padStart(2, '0')}:${bm.toString().padStart(2, '0')}`,
                      }));
                    }
                  }}
                  minTime={getEffectiveOperatingWindow().minTime}
                  maxTime={getEffectiveOperatingWindow().maxTime}
                  operatingWindowText={getEffectiveOperatingWindow().text}
                  label="Class Start Time"
                  disabled={!ruleForm.branch}
                />
              </div>
              <div>
                <Label className="mb-1 block font-medium">End Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={ruleForm.end_time}
                  onChange={(val) => setRuleForm({ ...ruleForm, end_time: val })}
                  minTime={ruleForm.start_time || getEffectiveOperatingWindow().minTime}
                  maxTime={getEffectiveOperatingWindow().maxTime}
                  operatingWindowText={getEffectiveOperatingWindow().text}
                  label="Class End Time"
                  isEndTime={true}
                  startTime={ruleForm.start_time}
                  disabled={!ruleForm.branch}
                />
              </div>
            </div>

            {/* TIME LOGIC VALIDATION FEEDBACK */}
            {ruleForm.start_time && ruleForm.end_time && ruleForm.end_time <= ruleForm.start_time && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                <AlertCircle className="size-3" />
                End Time ({formatTime12h(ruleForm.end_time)}) must be strictly later than Start Time ({formatTime12h(ruleForm.start_time)}).
              </p>
            )}

            {/* VALIDITY DATES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-medium">Valid From *</Label>
                <Input
                  type="date"
                  value={ruleForm.valid_from}
                  onChange={(e) => setRuleForm({ ...ruleForm, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block font-medium">Valid Until</Label>
                <Input
                  type="date"
                  value={ruleForm.valid_until}
                  onChange={(e) => setRuleForm({ ...ruleForm, valid_until: e.target.value })}
                  placeholder="Ongoing if empty"
                />
              </div>
            </div>

            {ruleForm.valid_from && ruleForm.valid_until && ruleForm.valid_until < ruleForm.valid_from && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                <AlertCircle className="size-3" />
                Valid Until date cannot be earlier than Valid From date.
              </p>
            )}

            {/* HOLIDAY / OPERATING EXCEPTION NOTICES */}
            {activeHolidayClosures.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CalendarX className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Branch Holiday Closures in Schedule Period</span>
                </div>
                <ul className="space-y-1 text-[11px] pl-5 list-disc">
                  {activeHolidayClosures.map((h: any) => (
                    <li key={h.id}>
                      <span className="font-semibold">{h.exception_date}</span>: {h.reason || 'Closed for Branch Exception'} (occurrences will be skipped)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* OVERRIDES & DELIVERY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block font-medium">Capacity Override</Label>
                <Input
                  type="number"
                  value={ruleForm.capacity_override}
                  onChange={(e) => setRuleForm({ ...ruleForm, capacity_override: e.target.value })}
                  placeholder="Template default"
                />
              </div>
              <div>
                <Label className="mb-1 block font-medium">Delivery Mode</Label>
                <select
                  value={ruleForm.delivery_mode || 'OFFLINE'}
                  onChange={(e) => setRuleForm({ ...ruleForm, delivery_mode: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block font-medium">Status</Label>
                <select
                  value={ruleForm.status || 'ACTIVE'}
                  onChange={(e) => setRuleForm({ ...ruleForm, status: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createRuleMutation.mutate(ruleForm)}
              disabled={
                !ruleForm.class_template ||
                !ruleForm.branch ||
                ruleForm.days_of_week.length === 0 ||
                ruleForm.days_of_week.some((d) => isDayClosed(d)) ||
                !ruleForm.start_time ||
                !ruleForm.end_time ||
                ruleForm.end_time <= ruleForm.start_time ||
                Boolean(ruleForm.valid_until && ruleForm.valid_until < ruleForm.valid_from) ||
                createRuleMutation.isPending
              }
            >
              {createRuleMutation.isPending
                ? 'Validating & Saving...'
                : 'Save Recurring Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GENERATE OCCURRENCES MODAL */}
      <Dialog open={isGenerateOccurrencesOpen} onOpenChange={setIsGenerateOccurrencesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Class Occurrences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <p className="text-xs text-muted-foreground">
              Rule: <strong className="text-foreground">{selectedRuleForGen?.class_name || selectedRuleForGen?.template_name}</strong> at{' '}
              <strong className="text-foreground">{selectedRuleForGen?.branch_name}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={genFromDate}
                  onChange={(e) => setGenFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={genToDate}
                  onChange={(e) => setGenToDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsGenerateOccurrencesOpen(false)}>Cancel</Button>
            <Button
              onClick={() => generateOccurrencesMutation.mutate()}
              disabled={!genFromDate || !genToDate || generateOccurrencesMutation.isPending}
            >
              {generateOccurrencesMutation.isPending ? 'Generating...' : 'Generate Sessions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE ONE-OFF OCCURRENCE MODAL */}
      <Dialog open={isCreateOccurrenceOpen} onOpenChange={setIsCreateOccurrenceOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">Schedule One-Off Class Session</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Configure session schedule, operating window, and capacity</p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1 min-h-0">
            {occurrenceError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{occurrenceError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block font-medium">Class Template *</Label>
                <select
                  value={occurrenceForm.class_template}
                  onChange={(e) => {
                    const val = e.target.value;
                    const tpl = templates.find((t) => t.id === val);
                    setOccurrenceForm((prev) => {
                      const next = {
                        ...prev,
                        class_template: val,
                        delivery_mode: tpl?.default_delivery_mode || prev.delivery_mode || 'OFFLINE',
                      };
                      if (next.start_time && tpl?.default_duration_minutes) {
                        const parts = next.start_time.split(':');
                        const h = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const endM = h * 60 + m + tpl.default_duration_minutes;
                        const eh = Math.floor(endM / 60) % 24;
                        const em = endM % 60;
                        next.end_time = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
                      }
                      return next;
                    });
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block font-medium">Branch *</Label>
                <select
                  value={occurrenceForm.branch}
                  onChange={(e) => setOccurrenceForm({ ...occurrenceForm, branch: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block font-medium">Session Date *</Label>
              <Input
                type="date"
                value={occurrenceForm.occurrence_date}
                onChange={(e) => setOccurrenceForm({ ...occurrenceForm, occurrence_date: e.target.value })}
                className="bg-background text-xs"
              />
              {/* Dynamic Status / Operating Window / Holiday Feedback */}
              {occurrenceForm.branch && occurrenceForm.occurrence_date && (
                <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                  !occurrenceSchedule.isOpen
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium'
                    : occurrenceSchedule.isException
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium'
                    : 'bg-primary/5 border-primary/20 text-primary font-medium'
                }`}>
                  {!occurrenceSchedule.isOpen ? (
                    <AlertTriangle className="size-4 shrink-0" />
                  ) : occurrenceSchedule.isException ? (
                    <Info className="size-4 shrink-0" />
                  ) : (
                    <Clock className="size-4 shrink-0" />
                  )}
                  <span>{occurrenceSchedule.statusText}</span>
                </div>
              )}
            </div>

            {/* TIME SELECTORS CONNECTED TO DYNAMIC BRANCH OPERATING WINDOW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block font-medium">Start Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={occurrenceForm.start_time}
                  onChange={(val) => {
                    const selTpl = templates.find((t) => t.id === occurrenceForm.class_template);
                    const dur = selTpl?.default_duration_minutes || 60;
                    const parts = val.split(':');
                    const h = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    const endM = h * 60 + m + dur;
                    const eh = Math.floor(endM / 60) % 24;
                    const em = endM % 60;
                    const autoEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

                    setOccurrenceForm((prev) => ({
                      ...prev,
                      start_time: val,
                      end_time: (!prev.end_time || prev.end_time <= val) ? autoEnd : prev.end_time,
                    }));
                  }}
                  minTime={occurrenceSchedule.minTime}
                  maxTime={occurrenceSchedule.maxTime}
                  operatingWindowText={occurrenceSchedule.statusText}
                  label="Session Start Time"
                  disabled={!occurrenceForm.branch || !occurrenceSchedule.isOpen}
                />
              </div>
              <div>
                <Label className="mb-1.5 block font-medium">End Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={occurrenceForm.end_time}
                  onChange={(val) => setOccurrenceForm({ ...occurrenceForm, end_time: val })}
                  minTime={occurrenceForm.start_time || occurrenceSchedule.minTime}
                  maxTime={occurrenceSchedule.maxTime}
                  operatingWindowText={occurrenceSchedule.statusText}
                  label="Session End Time"
                  isEndTime={true}
                  startTime={occurrenceForm.start_time}
                  disabled={!occurrenceForm.branch || !occurrenceSchedule.isOpen}
                />
              </div>
            </div>

            {/* TIME LOGIC VALIDATION FEEDBACK */}
            {occurrenceForm.start_time && occurrenceForm.end_time && occurrenceForm.end_time <= occurrenceForm.start_time && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                <AlertCircle className="size-3" />
                End Time ({formatTime12h(occurrenceForm.end_time)}) must be strictly later than Start Time ({formatTime12h(occurrenceForm.start_time)}).
              </p>
            )}

            {(() => {
              const selectedTpl = templates.find((t) => t.id === occurrenceForm.class_template);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="mb-1.5 block font-medium">Capacity</Label>
                    <Input
                      type="number"
                      value={occurrenceForm.capacity}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, capacity: e.target.value })}
                      placeholder={selectedTpl ? `Default (${selectedTpl.default_capacity})` : 'Default'}
                      className="bg-background text-xs"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Trial Cap</Label>
                    <Input
                      type="number"
                      value={occurrenceForm.trial_capacity}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, trial_capacity: e.target.value })}
                      placeholder={selectedTpl ? `Default (${selectedTpl.default_trial_capacity})` : '0'}
                      className="bg-background text-xs"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Waitlist Cap</Label>
                    <Input
                      type="number"
                      value={occurrenceForm.waitlist_capacity}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, waitlist_capacity: e.target.value })}
                      placeholder={selectedTpl ? `Default (${selectedTpl.default_waitlist_capacity})` : 'Default'}
                      className="bg-background text-xs"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Delivery Mode</Label>
                    <select
                      value={occurrenceForm.delivery_mode || 'OFFLINE'}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, delivery_mode: e.target.value as any })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="OFFLINE">OFFLINE</option>
                      <option value="ONLINE">ONLINE</option>
                      <option value="HYBRID">HYBRID</option>
                    </select>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/20 shrink-0 gap-2 sm:gap-3 flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOccurrenceOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => createOccurrenceMutation.mutate(occurrenceForm)}
              disabled={
                !occurrenceForm.class_template ||
                !occurrenceForm.branch ||
                !occurrenceForm.occurrence_date ||
                !occurrenceForm.start_time ||
                !occurrenceForm.end_time ||
                !occurrenceSchedule.isOpen ||
                occurrenceForm.end_time <= occurrenceForm.start_time ||
                createOccurrenceMutation.isPending
              }
              className="px-4 font-semibold"
            >
              {createOccurrenceMutation.isPending ? 'Verifying...' : 'Schedule Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TRAINER MODAL */}
      <Dialog open={isAssignTrainerOpen && !!selectedOccurrence} onOpenChange={setIsAssignTrainerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Qualified Trainer</DialogTitle>
          </DialogHeader>
          {selectedOccurrence && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
                <p>Class: <strong className="text-foreground">{selectedOccurrence.template_name || selectedOccurrence.class_name}</strong></p>
                <p>Date: <strong className="text-foreground">{selectedOccurrence.occurrence_date}</strong></p>
                <p>Branch: <strong className="text-foreground">{selectedOccurrence.branch_name}</strong></p>
              </div>

              {trainerError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{trainerError}</span>
                </div>
              )}

              <div>
                <Label className="mb-1 block">Select Trainer Profile *</Label>
                <select
                  value={trainerProfileIdInput}
                  onChange={(e) => setTrainerProfileIdInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Choose qualified trainer...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trainer_name || t.trainer_code} ({t.trainer_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1 block">Role</Label>
                <select
                  value={trainerRoleInput}
                  onChange={(e) => setTrainerRoleInput(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="LEAD">Lead Trainer</option>
                  <option value="ASSISTANT">Assistant Trainer</option>
                  <option value="SUBSTITUTE">Substitute Trainer</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignTrainerOpen(false);
                setSelectedOccurrence(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOccurrence &&
                assignTrainerMutation.mutate({
                  occurrenceId: selectedOccurrence.id,
                  trainerId: trainerProfileIdInput,
                  role: trainerRoleInput,
                })
              }
              disabled={!trainerProfileIdInput || assignTrainerMutation.isPending}
            >
              {assignTrainerMutation.isPending ? 'Verifying Qualifications...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BRANCH AVAILABILITY MODAL */}
      <Dialog open={isBranchAvailOpen && !!selectedTemplateForAvail} onOpenChange={setIsBranchAvailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Branch Availability: {selectedTemplateForAvail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Cap Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {branchAvailabilities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        Available at all branches (no specific branch restrictions defined)
                      </td>
                    </tr>
                  ) : (
                    branchAvailabilities.map((ba) => (
                      <tr key={ba.id}>
                        <td className="p-2.5 font-medium">{ba.branch_name || ba.branch}</td>
                        <td className="p-2.5">{ba.status}</td>
                        <td className="p-2.5">{ba.capacity_override || 'Default'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isAuthorized && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <h5 className="font-semibold text-foreground text-xs">Add / Override Branch Availability</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block">Branch</Label>
                    <select
                      value={branchAvailForm.branch}
                      onChange={(e) => setBranchAvailForm({ ...branchAvailForm, branch: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Status</Label>
                    <select
                      value={branchAvailForm.status}
                      onChange={(e) => setBranchAvailForm({ ...branchAvailForm, status: e.target.value as any })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ENABLED">ENABLED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => createBranchAvailMutation.mutate(branchAvailForm)}
                  disabled={!branchAvailForm.branch || createBranchAvailMutation.isPending}
                  className="w-full text-xs"
                >
                  Save Availability
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchAvailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLASS PRICING MODAL */}
      <Dialog open={isPricingOpen && !!selectedTemplateForPricing} onOpenChange={setIsPricingOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Class Pricing: {selectedTemplateForPricing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5">Effective</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {classPrices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No standalone pricing configured (Access covered via Packages)
                      </td>
                    </tr>
                  ) : (
                    classPrices.map((cp) => (
                      <tr key={cp.id}>
                        <td className="p-2.5">{cp.branch_name || 'All Branches'}</td>
                        <td className="p-2.5 font-semibold">{cp.currency} {cp.price} (+{cp.tax_percent}%)</td>
                        <td className="p-2.5">{cp.effective_from}</td>
                        <td className="p-2.5">{cp.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isAuthorized && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <h5 className="font-semibold text-foreground text-xs">Add Standalone / Pay-Per-Use Price</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block">Branch (Optional)</Label>
                    <select
                      value={pricingForm.branch}
                      onChange={(e) => setPricingForm({ ...pricingForm, branch: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Price</Label>
                    <Input
                      type="number"
                      value={pricingForm.price}
                      onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })}
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => createPricingMutation.mutate(pricingForm)}
                  disabled={!pricingForm.price || createPricingMutation.isPending}
                  className="w-full text-xs"
                >
                  Save Price
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE CONTENT ITEM MODAL */}
      <Dialog open={isCreateContentOpen} onOpenChange={setIsCreateContentOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Content Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Title *</Label>
              <Input
                type="text"
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                placeholder="e.g. Mobility Warm-up Series 1"
              />
            </div>
            <div>
              <Label className="mb-1 block">Content Type</Label>
              <select
                value={contentForm.content_type}
                onChange={(e) => setContentForm({ ...contentForm, content_type: e.target.value as any })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="VIDEO">VIDEO</option>
                <option value="VIDEO_LINK">VIDEO_LINK</option>
                <option value="DOCUMENT">DOCUMENT</option>
                <option value="IMAGE">IMAGE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">External URL / Stream Link</Label>
              <Input
                type="text"
                value={contentForm.external_url}
                onChange={(e) => setContentForm({ ...contentForm, external_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="mb-1 block">Description</Label>
              <textarea
                value={contentForm.description}
                onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
                placeholder="Workout details..."
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block">Display Order</Label>
                <Input
                  type="number"
                  value={contentForm.display_order}
                  onChange={(e) => setContentForm({ ...contentForm, display_order: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <select
                  value={contentForm.status}
                  onChange={(e) => setContentForm({ ...contentForm, status: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateContentOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveContentMutation.mutate(contentForm)}
              disabled={!contentForm.title || saveContentMutation.isPending}
            >
              {saveContentMutation.isPending ? 'Saving...' : 'Register Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAP CONTENT ITEM MODAL */}
      <Dialog open={isCreateMappingOpen} onOpenChange={setIsCreateMappingOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Content Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Content Item *</Label>
              <select
                value={mappingForm.content_item}
                onChange={(e) => setMappingForm({ ...mappingForm, content_item: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Content Item</option>
                {contentItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>{ci.title} (#{ci.display_order})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Class Template (Optional)</Label>
              <select
                value={mappingForm.class_template}
                onChange={(e) => setMappingForm({ ...mappingForm, class_template: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any / None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Class Category (Optional)</Label>
              <select
                value={mappingForm.class_category}
                onChange={(e) => setMappingForm({ ...mappingForm, class_category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any / None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Delivery Mode (Optional)</Label>
              <select
                value={mappingForm.delivery_mode}
                onChange={(e) => setMappingForm({ ...mappingForm, delivery_mode: e.target.value as any })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Modes</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="ONLINE">ONLINE</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateMappingOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMappingMutation.mutate(mappingForm)}
              disabled={!mappingForm.content_item || saveMappingMutation.isPending}
            >
              {saveMappingMutation.isPending ? 'Mapping...' : 'Save Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ClassesWorkspace;

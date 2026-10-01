import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package as PackageIcon,
  Plus,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  Tag,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Settings2,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  FileSpreadsheet,
  Globe,
  Smartphone,
  Check,
  Calendar,
  DollarSign,
  Activity,
  Info,
  Building2,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  Archive,
  RotateCcw,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { catalogApi } from '@/api/endpoints/catalogApi';
import { crmApi } from '@/api/endpoints/crmApi';
import type { Package, PackageVersion, Program, TermsDocument, ProgramCategory, DeliveryMode } from '@/types/catalog';
import { useAuth, useApp } from '@/contexts';
import { toast } from 'sonner';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
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

function getErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const status = error.status || error?.response?.status;
  const data = error.data || error?.response?.data;

  // Friendly business messages from backend
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error && !data.error.includes('40') && !data.error.includes('50')) {
      return data.error;
    }
    if (typeof data.detail === 'string' && data.detail && data.detail !== 'Not found.' && !data.detail.includes('40')) {
      return data.detail;
    }
    if (data.code === 'PROGRAM_CATEGORY_HAS_PROGRAMS') {
      return 'Cannot delete this program category: Programs are still referencing it. Deactivate it instead, or reassign the programs.';
    }
    if (data.code === 'PROGRAM_TYPE_HAS_PROGRAMS') {
      return 'Cannot delete this program type: Programs are still referencing it. Deactivate it instead, or reassign the programs.';
    }
    if (data.code === 'PROGRAM_HAS_HISTORY') {
      return 'Cannot modify or delete this program: Packages, classes, or lead records are referencing it.';
    }
    const errorEntries = Object.entries(data).filter(([k]) => k !== 'code');
    if (errorEntries.length > 0) {
      return errorEntries
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('; ');
    }
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (status === 403) {
    return 'You do not have permission to manage catalog resources.';
  }
  if (status === 404) {
    return 'The requested record or resource was not found.';
  }
  if (status >= 500) {
    return 'Unable to complete this request right now. Please try again later.';
  }

  if (typeof error.message === 'string' && error.message) {
    if (error.message.includes('Network Error') || error.message.includes('AxiosError')) {
      return 'Network connection issue. Please check your connection and try again.';
    }
    if (!error.message.includes('40') && !error.message.includes('50') && !error.message.includes('Request failed')) {
      return error.message;
    }
  }

  return 'Unable to process this request. Please try again.';
}

const DELIVERY_MODES: Array<{ value: DeliveryMode; label: string; description: string }> = [
  { value: 'GROUP_CLASS', label: 'Group Class', description: 'Group classes and scheduled occurrences' },
  { value: 'INDIVIDUAL_SERVICE', label: 'Individual Service / PT', description: '1-on-1 dedicated training sessions and appointments' },
  { value: 'OPEN_ACCESS', label: 'Open Access / Floor', description: 'Self-guided floor or open gym facility access' },
];

const getDeliveryModeBadge = (mode?: string) => {
  switch (mode) {
    case 'INDIVIDUAL_SERVICE':
    case 'PERSONAL_TRAINING':
      return {
        label: 'Individual Service (PT)',
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      };
    case 'OPEN_ACCESS':
    case 'OPEN_GYM':
      return {
        label: 'Open Access',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    case 'GROUP_CLASS':
    case 'GROUP':
    default:
      return {
        label: 'Group Class',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
  }
};

const formatCurrency = (amount: any, currency: string = 'INR') => {
  if (amount === undefined || amount === null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return `${currency} ${amount}`;
  const sym = currency === 'INR' || currency === '₹' ? '₹' : currency === 'USD' || currency === '$' ? '$' : `${currency} `;
  return `${sym}${num.toLocaleString('en-IN')}`;
};

const formatSessionCount = (val: any) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num % 1 === 0 ? num.toFixed(0) : String(num);
};

export const PackagesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { locationId } = useApp();

  const hasCatalogPermission = useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('core.settings.edit') || perms.includes('*');
  }, [user, isAuthLoading]);

  const requirePermission = (actionDesc: string): boolean => {
    if (!hasCatalogPermission) {
      toast.error(`You do not have permission to ${actionDesc}. Please contact your administrator.`);
      return false;
    }
    return true;
  };

  // Top tabs: Program Categories | Programs | Legal Policies (Packages is nested inside Programs)
  const [activeTab, setActiveTab] = useState<'categories' | 'programs' | 'terms'>('programs');
  
  // Search state
  const [progSearchQuery, setProgSearchQuery] = useState('');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [termsSearchQuery, setTermsSearchQuery] = useState('');

  // Expandable programs state (Set of program IDs)
  const [expandedProgramIds, setExpandedProgramIds] = useState<Set<string>>(new Set());

  const toggleProgramExpanded = (programId: string) => {
    setExpandedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  // Version History Drawer / Modal state
  const [historyPackage, setHistoryPackage] = useState<Package | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const toggleVersionExpanded = (id: string) => setExpandedVersionId(prev => prev === id ? null : id);

  // Audit Log Drawer / Modal state
  const [auditPackage, setAuditPackage] = useState<Package | null>(null);

  // Creation Modals
  const [isNewPackageOpen, setIsNewPackageOpen] = useState(false);
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [isNewProgramOpen, setIsNewProgramOpen] = useState(false);
  const [isNewProgramCategoryOpen, setIsNewProgramCategoryOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Edit Package Modals (Stable Package Identity Fields Only)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgStatus, setEditPkgStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [editPkgProgram, setEditPkgProgram] = useState('');
  const [editPkgBranchIds, setEditPkgBranchIds] = useState<string[]>([]);

  // Package Version Lifecycle Confirmation Dialog States
  const [versionToPublish, setVersionToPublish] = useState<{ pkgId: string; verId: string; versionNum: number; pkgName: string } | null>(null);
  const [versionToRetire, setVersionToRetire] = useState<{ pkgId: string; verId: string; versionNum: number; pkgName: string } | null>(null);
  const [draftToDiscard, setDraftToDiscard] = useState<{ pkgId: string; verId: string; versionNum: number; pkgName: string } | null>(null);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgName, setEditProgName] = useState('');
  const [editProgCode, setEditProgCode] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');
  const [editProgCategory, setEditProgCategory] = useState('');
  const [editProgDeliveryMode, setEditProgDeliveryMode] = useState<DeliveryMode>('GROUP_CLASS');
  const [editProgDisplayOrder, setEditProgDisplayOrder] = useState<number>(0);
  const [editProgTrial, setEditProgTrial] = useState(false);
  const [editProgStatus, setEditProgStatus] = useState<'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [editProgBranchIds, setEditProgBranchIds] = useState<string[]>([]);

  // Program Category modal state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatOrder, setNewCatOrder] = useState(0);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  const [editingProgramCategory, setEditingProgramCategory] = useState<ProgramCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatCode, setEditCatCode] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatOrder, setEditCatOrder] = useState(0);
  const [editCatStatus, setEditCatStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editCatFormError, setEditCatFormError] = useState<string | null>(null);

  // Archive modal state
  const [programToArchive, setProgramToArchive] = useState<Program | null>(null);
  const [archiveProgError, setArchiveProgError] = useState<string | null>(null);

  const [programCategoryToDelete, setProgramCategoryToDelete] = useState<ProgramCategory | null>(null);
  const [deleteCatError, setDeleteCatError] = useState<string | null>(null);

  // Program Filter bar state
  const [progFilterCategory, setProgFilterCategory] = useState<string>('ALL');
  const [progFilterStatus, setProgFilterStatus] = useState<string>('ALL');
  const [progFilterBranch, setProgFilterBranch] = useState<string>(() => (locationId && locationId !== 'all' ? locationId : 'ALL'));
  const [progFilterDeliveryMode, setProgFilterDeliveryMode] = useState<string>('ALL');
  const [progFilterTrialOnly, setProgFilterTrialOnly] = useState<boolean>(false);

  // Sync global topbar branch selector to local branch filter
  React.useEffect(() => {
    if (locationId && locationId !== 'all') {
      setProgFilterBranch(locationId);
    } else if (locationId === 'all') {
      setProgFilterBranch('ALL');
    }
  }, [locationId]);

  // Legal Policies modal state (no Code field)
  const [isNewTermsDocOpen, setIsNewTermsDocOpen] = useState(false);
  const [newTermsName, setNewTermsName] = useState('');
  const [newTermsType, setNewTermsType] = useState('MEMBERSHIP_TERMS');
  const [termsDocFormError, setTermsDocFormError] = useState<string | null>(null);

  const [isNewTermsVersionOpen, setIsNewTermsVersionOpen] = useState(false);
  const [selectedTermsDoc, setSelectedTermsDoc] = useState<TermsDocument | null>(null);
  const [newVerContent, setNewVerContent] = useState('');
  const [newVerEffectiveFrom, setNewVerEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [termsVerFormError, setTermsVerFormError] = useState<string | null>(null);

  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<{ docId: string; versionId: string; versionNum: number } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [expandedTermsDocId, setExpandedTermsDocId] = useState<string | null>(null);

  // Form error states
  const [pkgFormError, setPkgFormError] = useState<string | null>(null);
  const [progFormError, setProgFormError] = useState<string | null>(null);

  // Package Form state (no Code field)
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgProgram, setNewPkgProgram] = useState('');
  const [newPkgTotalDays, setNewPkgTotalDays] = useState(180);
  const [newPkgDurationVal, setNewPkgDurationVal] = useState(6);
  const [newPkgDurationUnit, setNewPkgDurationUnit] = useState('MONTH');

  // Duration helper
  const calcDays = (val: number, unit: string): number => {
    const multiplier: Record<string, number> = {
      DAY: 1,
      WEEK: 7,
      MONTH: 30,
      YEAR: 365,
    };
    return Math.max(1, val * (multiplier[unit] ?? 1));
  };

  const [newPkgValidity, setNewPkgValidity] = useState(180);
  const [newPkgSalePrice, setNewPkgSalePrice] = useState('');
  const [newPkgDisplayPrice, setNewPkgDisplayPrice] = useState('');
  const [newPkgTaxPercentage, setNewPkgTaxPercentage] = useState('18');
  const [newPkgTaxIncluded, setNewPkgTaxIncluded] = useState(true);
  const [newPkgMaxSessions, setNewPkgMaxSessions] = useState('');
  const [newPkgPassportSessions, setNewPkgPassportSessions] = useState('');
  const [newPkgPassportCost, setNewPkgPassportCost] = useState('');
  const [newPkgShowWeb, setNewPkgShowWeb] = useState(true);
  const [newPkgShowApp, setNewPkgShowApp] = useState(true);
  const [newPkgPublishNow, setNewPkgPublishNow] = useState(false);
  const [newPkgBranchIds, setNewPkgBranchIds] = useState<string[]>([]);
  const [newPkgHomeUnlimited, setNewPkgHomeUnlimited] = useState(false);
  const [newPkgCrossUnlimited, setNewPkgCrossUnlimited] = useState(false);

  // Archive package modal state
  const [packageToArchive, setPackageToArchive] = useState<Package | null>(null);
  const [archivePkgError, setArchivePkgError] = useState<string | null>(null);

  // New Version Form state
  const [newVerName, setNewVerName] = useState('');
  const [newVerDurationVal, setNewVerDurationVal] = useState(6);
  const [newVerDurationUnit, setNewVerDurationUnit] = useState('MONTH');
  const [newVerValidity, setNewVerValidity] = useState(180);
  const [newVerTotalDays, setNewVerTotalDays] = useState(180);
  const [newVerShowWeb, setNewVerShowWeb] = useState(true);
  const [newVerShowApp, setNewVerShowApp] = useState(true);
  const [newVerHomeUnlimited, setNewVerHomeUnlimited] = useState(false);
  const [newVerMaxSessions, setNewVerMaxSessions] = useState('');
  const [newVerCrossUnlimited, setNewVerCrossUnlimited] = useState(false);
  const [newVerPassportSessions, setNewVerPassportSessions] = useState('');
  const [newVerPassportCost, setNewVerPassportCost] = useState('');
  const [newVerSalePrice, setNewVerSalePrice] = useState('');
  const [newVerDisplayPrice, setNewVerDisplayPrice] = useState('');
  const [newVerTaxPercentage, setNewVerTaxPercentage] = useState('18');
  const [newVerTaxIncluded, setNewVerTaxIncluded] = useState(true);
  const [newVerPublishNow, setNewVerPublishNow] = useState(false);

  // Program Form state
  const [newProgName, setNewProgName] = useState('');
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgCategory, setNewProgCategory] = useState('');
  const [newProgDeliveryMode, setNewProgDeliveryMode] = useState<DeliveryMode>('GROUP_CLASS');
  const [newProgDisplayOrder, setNewProgDisplayOrder] = useState<number>(0);
  const [newProgTrial, setNewProgTrial] = useState(false);
  const [newProgBranchIds, setNewProgBranchIds] = useState<string[]>([]);

  // Queries
  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
  });

  const {
    data: programCategories = [],
    isLoading: isProgramCategoriesLoading,
    refetch: refetchProgramCategories,
  } = useQuery({
    queryKey: ['program-categories'],
    queryFn: () => catalogApi.getProgramCategories(),
  });

  const {
    data: packages = [],
    isLoading: isPackagesLoading,
    isError: isPackagesError,
    error: packagesError,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: ['packages'],
    queryFn: () => catalogApi.getPackages(),
  });

  const {
    data: programs = [],
    isLoading: isProgramsLoading,
    isError: isProgramsError,
    error: programsError,
    refetch: refetchPrograms,
    isFetching: isProgramsFetching,
  } = useQuery({
    queryKey: ['programs'],
    queryFn: () => catalogApi.getPrograms({ context: 'management', status: 'ALL' }),
  });

  const {
    data: termsDocs = [],
    isLoading: isTermsLoading,
    isError: isTermsError,
    error: termsError,
    refetch: refetchTerms,
  } = useQuery({
    queryKey: ['terms-documents'],
    queryFn: () => catalogApi.getTermsDocuments(),
  });

  // Terms versions
  const {
    data: expandedVersions = [],
    isLoading: isVersionsLoading,
  } = useQuery({
    queryKey: ['terms-document-versions', expandedTermsDocId],
    queryFn: () => catalogApi.getTermsDocumentVersions(expandedTermsDocId!),
    enabled: Boolean(expandedTermsDocId),
  });

  // Package Audit query
  const {
    data: auditEvents = [],
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['package-audit-events', auditPackage?.id],
    queryFn: () =>
      catalogApi.getAuditEvents({
        entity_type: 'Package',
        entity_id: auditPackage?.id,
      }),
    enabled: Boolean(auditPackage?.id),
  });

  const filteredAuditEvents = useMemo(() => {
    if (!auditPackage?.id) return [];
    return (auditEvents || []).filter((evt: any) => {
      if (evt.entity_id && evt.entity_id !== auditPackage.id) return false;
      if (evt.entity_type && !['Package', 'PACKAGE'].includes(evt.entity_type)) return false;
      return true;
    });
  }, [auditEvents, auditPackage?.id]);

  // Map packages to their program
  const packagesByProgram = useMemo(() => {
    const map = new Map<string, Package[]>();
    for (const pkg of packages) {
      if (pkg.program) {
        const list = map.get(pkg.program) || [];
        list.push(pkg);
        map.set(pkg.program, list);
      }
    }
    return map;
  }, [packages]);

  // Mutations
  const createPackageMutation = useMutation({
    mutationFn: async () => {
      const pkg = await catalogApi.createPackage({
        name: newPkgName.trim(),
        program: newPkgProgram,
        status: 'ACTIVE',
        available_branch_ids: newPkgBranchIds,
      });
      // Create initial version if duration provided
      if (newPkgTotalDays > 0) {
        await catalogApi.createPackageVersion(pkg.id, {
          name_snapshot: `${newPkgName.trim()} v1`,
          duration_value: newPkgDurationVal,
          duration_unit: newPkgDurationUnit,
          total_days: newPkgTotalDays,
          validity_days: newPkgValidity,
          show_on_web: newPkgShowWeb,
          show_on_app: newPkgShowApp,
          sale_price: newPkgSalePrice ? Number(newPkgSalePrice) : undefined,
          display_price: newPkgDisplayPrice ? Number(newPkgDisplayPrice) : undefined,
          tax_percentage: newPkgTaxPercentage ? Number(newPkgTaxPercentage) : undefined,
          prices_include_tax: newPkgTaxIncluded,
          is_unlimited_home: newPkgHomeUnlimited,
          max_sessions: newPkgHomeUnlimited ? undefined : (newPkgMaxSessions ? Number(newPkgMaxSessions) : undefined),
          is_unlimited_cross: newPkgCrossUnlimited,
          passport_sessions: newPkgCrossUnlimited ? undefined : (newPkgPassportSessions ? Number(newPkgPassportSessions) : undefined),
          passport_cost: newPkgPassportCost ? Number(newPkgPassportCost) : undefined,
          publish_immediately: newPkgPublishNow,
          status: newPkgPublishNow ? 'ACTIVE' : 'DRAFT',
        });
      }
      return pkg;
    },
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setIsNewPackageOpen(false);
      // Auto expand the program to show the newly created package
      if (pkg.program) {
        setExpandedProgramIds((prev) => new Set([...prev, pkg.program!]));
      }
      setNewPkgName('');
      setNewPkgProgram('');
      setNewPkgBranchIds([]);
      setNewPkgSalePrice('');
      setNewPkgDisplayPrice('');
      setNewPkgHomeUnlimited(false);
      setNewPkgMaxSessions('');
      setNewPkgCrossUnlimited(false);
      setNewPkgPassportSessions('');
      setNewPkgPassportCost('');
      setPkgFormError(null);
      toast.success('Package created successfully.');
    },
    onError: (err: any) => {
      setPkgFormError(getErrorMessage(err));
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async () => {
      if (!editingPackage) return;
      // Update package identity metadata & branch availability only
      const updatedPkg = await catalogApi.updatePackage(editingPackage.id, {
        name: editPkgName.trim(),
        status: editPkgStatus,
        program: editPkgProgram,
        available_branch_ids: editPkgBranchIds,
      });
      return updatedPkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setEditingPackage(null);
      setPkgFormError(null);
      toast.success('Package updated successfully.');
    },
    onError: (err: any) => {
      setPkgFormError(getErrorMessage(err));
    },
  });

  const togglePackageStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: 'ACTIVE' | 'INACTIVE' }) =>
      catalogApi.updatePackage(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package status updated.');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const archivePackageMutation = useMutation({
    mutationFn: (id: string) => catalogApi.archivePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setPackageToArchive(null);
      setArchivePkgError(null);
      toast.success('Package archived successfully.');
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err);
      setArchivePkgError(msg);
      toast.error(msg);
    },
  });

  const restorePackageMutation = useMutation({
    mutationFn: (id: string) => catalogApi.restorePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Package restored successfully.');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const publishVersionDirectMutation = useMutation({
    mutationFn: ({ verId }: { pkgId: string; verId: string }) =>
      catalogApi.publishPackageVersionDirect(verId),
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setVersionToPublish(null);
      toast.success(
        data?.detail ||
          'Package version published successfully. Previous active version has been retired.'
      );
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const retireVersionDirectMutation = useMutation({
    mutationFn: ({ verId }: { pkgId: string; verId: string }) =>
      catalogApi.retirePackageVersion(verId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setVersionToRetire(null);
      toast.success(data?.detail || 'Package version retired.');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const reuseVersionMutation = useMutation({
    mutationFn: ({ verId }: { verId: string; fromVerNum: number }) =>
      catalogApi.reusePackageVersion(verId),
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(
        data?.detail ||
          `Version ${data?.version_number ?? 'new'} draft created from Version ${vars.fromVerNum}. Review it before publishing.`
      );
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const deleteDraftVersionMutation = useMutation({
    mutationFn: (verId: string) => catalogApi.deletePackageVersion(verId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setDraftToDiscard(null);
      toast.success('Draft version discarded.');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: ({ pkgId, payload }: { pkgId: string; payload: any }) =>
      catalogApi.createPackageVersion(pkgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setIsNewVersionOpen(false);
      setSelectedPackage(null);
      toast.success('New package version created successfully.');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const createProgramMutation = useMutation({
    mutationFn: () =>
      catalogApi.createProgram({
        name: newProgName.trim(),
        description: newProgDesc.trim() || null,
        category: newProgCategory || (programCategories[0]?.id ?? null),
        delivery_mode: newProgDeliveryMode,
        display_order: newProgDisplayOrder,
        trial_allowed: newProgTrial,
        available_branch_ids: newProgBranchIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      setIsNewProgramOpen(false);
      setNewProgName('');
      setNewProgCode('');
      setNewProgDesc('');
      setNewProgCategory('');
      setNewProgDeliveryMode('GROUP_CLASS');
      setNewProgDisplayOrder(0);
      setNewProgTrial(false);
      setNewProgBranchIds([]);
      setProgFormError(null);
      toast.success('Program created successfully.');
    },
    onError: (err: any) => {
      setProgFormError(getErrorMessage(err));
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      catalogApi.updateProgram(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      setEditingProgram(null);
      setProgFormError(null);
      toast.success('Program updated successfully.');
    },
    onError: (err: any) => {
      setProgFormError(getErrorMessage(err));
    },
  });

  const toggleProgramStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      if (currentStatus === 'ACTIVE') {
        return catalogApi.deactivateProgram(id);
      } else {
        return catalogApi.reactivateProgram(id);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      if (vars.currentStatus === 'ACTIVE') {
        toast.success('Program deactivated successfully.');
      } else {
        toast.success('Program activated successfully.');
      }
    },
    onError: (err: any, vars) => {
      console.error('[Program Status Error]', err);
      const friendlyBackend = err?.response?.data?.error || err?.response?.data?.detail;
      if (friendlyBackend && typeof friendlyBackend === 'string' && !friendlyBackend.toLowerCase().includes('not found')) {
        toast.error(friendlyBackend);
      } else if (vars.currentStatus === 'ACTIVE') {
        toast.error('Unable to deactivate this program. Please try again.');
      } else {
        toast.error('Unable to activate this program. Please try again.');
      }
    },
  });

  const archiveProgramMutation = useMutation({
    mutationFn: (id: string) => catalogApi.archiveProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      setProgramToArchive(null);
      setArchiveProgError(null);
      toast.success('Program archived successfully.');
    },
    onError: (err: any) => {
      console.error('[Archive Program Error]', err);
      const friendlyBackend = err?.response?.data?.error || err?.response?.data?.detail;
      const msg = friendlyBackend && typeof friendlyBackend === 'string' && !friendlyBackend.toLowerCase().includes('not found')
        ? friendlyBackend
        : 'Unable to archive this program. Please try again.';
      setArchiveProgError(msg);
      toast.error(msg);
    },
  });

  const restoreProgramMutation = useMutation({
    mutationFn: (id: string) => catalogApi.restoreProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      toast.success('Program restored successfully.');
    },
    onError: (err: any) => {
      console.error('[Restore Program Error]', err);
      const friendlyBackend = err?.response?.data?.error || err?.response?.data?.detail;
      const msg = friendlyBackend && typeof friendlyBackend === 'string' && !friendlyBackend.toLowerCase().includes('not found')
        ? friendlyBackend
        : 'Unable to restore this program. Please try again.';
      toast.error(msg);
    },
  });

  const createProgramCategoryMutation = useMutation({
    mutationFn: () =>
      catalogApi.createProgramCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || null,
        display_order: newCatOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      setIsNewProgramCategoryOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      setNewCatOrder(0);
      setCatFormError(null);
      toast.success('Program Category created successfully.');
    },
    onError: (err: any) => {
      setCatFormError(getErrorMessage(err));
    },
  });

  const updateProgramCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      catalogApi.updateProgramCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setEditingProgramCategory(null);
      setEditCatFormError(null);
      toast.success('Program Category updated successfully.');
    },
    onError: (err: any) => {
      setEditCatFormError(getErrorMessage(err));
    },
  });

  const toggleProgramCategoryStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      if (currentStatus === 'ACTIVE') {
        return catalogApi.deactivateProgramCategory(id);
      } else {
        return catalogApi.reactivateProgramCategory(id);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success(`Program Category ${vars.currentStatus === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const deleteProgramCategoryMutation = useMutation({
    mutationFn: (id: string) => catalogApi.deleteProgramCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] });
      setProgramCategoryToDelete(null);
      setDeleteCatError(null);
      toast.success('Program Category deleted successfully.');
    },
    onError: (err: any) => {
      setDeleteCatError(getErrorMessage(err));
    },
  });

  const createTermsDocMutation = useMutation({
    mutationFn: () =>
      catalogApi.createTermsDocument({
        name: newTermsName.trim(),
        document_type: newTermsType,
      }),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['terms-documents'] });
      setIsNewTermsDocOpen(false);
      setNewTermsName('');
      setTermsDocFormError(null);
      setSelectedTermsDoc(newDoc);
      setNewVerContent('');
      setNewVerEffectiveFrom(new Date().toISOString().slice(0, 16));
      setTermsVerFormError(null);
      setIsNewTermsVersionOpen(true);
      toast.success('Policy created. Add draft version content.');
    },
    onError: (err: any) => {
      setTermsDocFormError(getErrorMessage(err));
    },
  });

  const createTermsVersionMutation = useMutation({
    mutationFn: () =>
      catalogApi.createTermsDocumentVersion({
        terms_document: selectedTermsDoc!.id,
        content_text: newVerContent.trim() || null,
        effective_from: new Date(newVerEffectiveFrom).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-documents'] });
      if (selectedTermsDoc) {
        queryClient.invalidateQueries({ queryKey: ['terms-document-versions', selectedTermsDoc.id] });
        setExpandedTermsDocId(selectedTermsDoc.id);
      }
      setIsNewTermsVersionOpen(false);
      setSelectedTermsDoc(null);
      setNewVerContent('');
      setTermsVerFormError(null);
      toast.success('Draft policy version saved.');
    },
    onError: (err: any) => {
      setTermsVerFormError(getErrorMessage(err));
    },
  });

  const publishTermsVersionMutation = useMutation({
    mutationFn: () =>
      catalogApi.publishTermsVersion(publishTarget!.docId, publishTarget!.versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-documents'] });
      if (publishTarget) {
        queryClient.invalidateQueries({ queryKey: ['terms-document-versions', publishTarget.docId] });
      }
      setIsPublishConfirmOpen(false);
      setPublishTarget(null);
      setPublishError(null);
      toast.success('Policy version published successfully.');
    },
    onError: (err: any) => {
      setPublishError(getErrorMessage(err));
    },
  });

  // Resolve friendly label for Program Category
  const getProgramCategoryLabel = (prog: Program) => {
    if (prog.category_name) return prog.category_name;
    const match = programCategories.find(
      (c) => c.id === prog.category || c.code === prog.category
    );
    if (match) return match.name || match.code;
    return 'Uncategorized';
  };

  // Filtered program categories (search by name, code, or description)
  const filteredProgramCategories = programCategories.filter((c) => {
    const q = catSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  // Filtered programs (search by name, code, category, description, or package name + filters)
  const filteredPrograms = useMemo(() => {
    return programs.filter((prog) => {
      const q = progSearchQuery.toLowerCase().trim();
      const catLabel = getProgramCategoryLabel(prog).toLowerCase();
      const progPackages = packagesByProgram.get(prog.id) || [];
      const matchesPackageName = progPackages.some((p) => p.name?.toLowerCase().includes(q));
      const matchesQuery =
        !q ||
        prog.name?.toLowerCase().includes(q) ||
        (prog.code && prog.code.toLowerCase().includes(q)) ||
        catLabel.includes(q) ||
        (prog.description && prog.description.toLowerCase().includes(q)) ||
        matchesPackageName;

      if (!matchesQuery) return false;

      // Category filter
      if (progFilterCategory !== 'ALL' && prog.category !== progFilterCategory) {
        return false;
      }

      // Status filter
      if (progFilterStatus !== 'ALL' && prog.status !== progFilterStatus) {
        return false;
      }

      // Delivery Mode filter
      if (progFilterDeliveryMode !== 'ALL' && prog.delivery_mode !== progFilterDeliveryMode) {
        return false;
      }

      // Trial filter
      if (progFilterTrialOnly && !prog.trial_allowed) {
        return false;
      }

      // Branch filter
      if (progFilterBranch !== 'ALL') {
        const branchIds = prog.available_branch_ids || [];
        if (!branchIds.includes(progFilterBranch)) return false;
      }

      return true;
    });
  }, [
    programs,
    progSearchQuery,
    progFilterCategory,
    progFilterStatus,
    progFilterDeliveryMode,
    progFilterTrialOnly,
    progFilterBranch,
    packagesByProgram,
    programCategories,
  ]);

  // Filtered terms docs (search by name or type)
  const filteredTermsDocs = termsDocs.filter((doc) => {
    const q = termsSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.document_type?.toLowerCase().includes(q)
    );
  });

  const startEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setEditPkgName(pkg.name);
    setEditPkgStatus((pkg.status as any) || 'ACTIVE');
    setEditPkgProgram(pkg.program || '');
    setEditPkgBranchIds(pkg.available_branch_ids || []);
    setPkgFormError(null);
  };

  const startEditProgram = (prog: Program) => {
    setEditingProgram(prog);
    setEditProgName(prog.name);
    setEditProgCode(prog.code || '');
    setEditProgDesc(prog.description || '');
    setEditProgCategory(prog.category || '');
    setEditProgDeliveryMode((prog.delivery_mode as DeliveryMode) || 'GROUP_CLASS');
    setEditProgDisplayOrder(prog.display_order ?? 0);
    setEditProgTrial(Boolean(prog.trial_allowed));
    setEditProgStatus(prog.status);
    setEditProgBranchIds(prog.available_branch_ids || []);
    setProgFormError(null);
  };

  const startEditProgramCategory = (cat: ProgramCategory) => {
    setEditingProgramCategory(cat);
    setEditCatName(cat.name);
    setEditCatCode(cat.code || '');
    setEditCatDesc(cat.description || '');
    setEditCatOrder(cat.display_order);
    setEditCatStatus(cat.status);
    setEditCatFormError(null);
  };

  const openAddPackageForProgram = (programId: string) => {
    if (!requirePermission('create Packages')) return;
    const prog = programs.find((p) => p.id === programId);
    setNewPkgProgram(programId);
    setNewPkgBranchIds(prog?.available_branch_ids || []);
    setNewPkgName('');
    setNewPkgDurationVal(6);
    setNewPkgDurationUnit('MONTH');
    setNewPkgTotalDays(calcDays(6, 'MONTH'));
    setNewPkgValidity(calcDays(6, 'MONTH'));
    setNewPkgSalePrice('');
    setNewPkgDisplayPrice('');
    setNewPkgTaxPercentage('18');
    setNewPkgTaxIncluded(true);
    setNewPkgHomeUnlimited(false);
    setNewPkgMaxSessions('');
    setNewPkgCrossUnlimited(false);
    setNewPkgPassportSessions('');
    setNewPkgPassportCost('');
    setNewPkgShowWeb(true);
    setNewPkgShowApp(true);
    setNewPkgPublishNow(false);
    setPkgFormError(null);
    setIsNewPackageOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground w-full pb-32">
      <PageHeader
        title="Programs & Packages"
        description="Configure your program catalog, commercial package tiers, immutable pricing versions, and legal policies."
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activeTab === 'categories' && hasCatalogPermission && (
              <Button
                onClick={() => {
                  setCatFormError(null);
                  setNewCatName('');
                  setNewCatDesc('');
                  setNewCatOrder(0);
                  setIsNewProgramCategoryOpen(true);
                }}
                className="gap-2 shadow-xs"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Category</span>
              </Button>
            )}
            {activeTab === 'programs' && hasCatalogPermission && (
              <Button
                onClick={() => {
                  setProgFormError(null);
                  setNewProgName('');
                  setNewProgCode('');
                  setNewProgDesc('');
                  setNewProgCategory(programCategories[0]?.id ?? '');
                  setNewProgDeliveryMode('GROUP_CLASS');
                  setNewProgDisplayOrder(0);
                  setNewProgTrial(false);
                  setNewProgBranchIds([]);
                  setIsNewProgramOpen(true);
                }}
                className="gap-2 shadow-xs"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Program</span>
              </Button>
            )}
            {activeTab === 'terms' && hasCatalogPermission && (
              <Button
                onClick={() => {
                  setTermsDocFormError(null);
                  setNewTermsName('');
                  setNewTermsType('MEMBERSHIP_TERMS');
                  setIsNewTermsDocOpen(true);
                }}
                className="gap-2 shadow-xs"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Policy Document</span>
              </Button>
            )}
          </div>
        }
      />

      <PageBody className="pb-28">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiTile
            title="Program Categories"
            value={programCategories.length}
            icon={<Settings2 className="w-5 h-5 text-indigo-500" />}
            subtitle="Catalog classification tiers"
          />
          <KpiTile
            title="Active Programs"
            value={programs.filter((p) => p.status === 'ACTIVE').length}
            icon={<Layers className="w-5 h-5 text-blue-500" />}
            subtitle={`Across ${programs.length} total programs`}
          />
          <KpiTile
            title="Total Packages"
            value={packages.length}
            icon={<PackageIcon className="w-5 h-5 text-primary" />}
            subtitle={`${packages.filter((p) => p.status === 'ACTIVE').length} active packages`}
          />
          <KpiTile
            title="Legal Policies"
            value={termsDocs.length}
            icon={<FileText className="w-5 h-5 text-purple-500" />}
            subtitle="Policy & Terms Documents"
          />
        </div>

        {/* Workspace Top Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 text-xs sm:text-sm font-medium overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'categories'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>Program Categories</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {programCategories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('programs')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'programs'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Programs & Packages</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {programs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'terms'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Legal Policies</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {termsDocs.length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 0: PROGRAM CATEGORIES */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search program categories by name or description..."
                  value={catSearchQuery}
                  onChange={(e) => setCatSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Loading */}
            {isProgramCategoriesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/40 rounded-2xl border border-border/60 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isProgramCategoriesLoading && filteredProgramCategories.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <Settings2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {catSearchQuery ? 'No matching program categories' : 'No program categories configured'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {catSearchQuery
                    ? `No program category matched "${catSearchQuery}". Try a different search term.`
                    : 'Program Categories classify your programs (e.g. Strength & Conditioning, Pilates, Personal Training, Open Gym). Create the first one to get started.'}
                </p>
                {!catSearchQuery && hasCatalogPermission && (
                  <Button
                    onClick={() => {
                      setCatFormError(null);
                      setNewCatName('');
                      setNewCatDesc('');
                      setNewCatOrder(0);
                      setIsNewProgramCategoryOpen(true);
                    }}
                    size="sm"
                  >
                    Create Program Category
                  </Button>
                )}
              </div>
            )}

            {/* Cards grid */}
            {!isProgramCategoriesLoading && filteredProgramCategories.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProgramCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`p-4 sm:p-5 bg-card border rounded-2xl space-y-3 shadow-xs transition flex flex-col justify-between ${
                      cat.status === 'INACTIVE'
                        ? 'border-border/40 opacity-60'
                        : 'border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-base font-semibold text-foreground break-words" title={cat.name}>
                            {cat.name}
                          </h4>
                          <Badge variant="outline" className="text-[11px] font-mono font-semibold uppercase">
                            {cat.code || 'NO_CODE'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                          <Badge
                            variant={cat.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {cat.status}
                          </Badge>
                          {hasCatalogPermission && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => startEditProgramCategory(cat)}
                                title="Edit program category"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`w-7 h-7 shrink-0 ${
                                  cat.status === 'ACTIVE'
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-emerald-500 hover:text-emerald-600'
                                }`}
                                onClick={() => {
                                  toggleProgramCategoryStatusMutation.mutate({
                                    id: cat.id,
                                    currentStatus: cat.status,
                                  });
                                }}
                                title={cat.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              >
                                {cat.status === 'ACTIVE' ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => {
                                  setProgramCategoryToDelete(cat);
                                  setDeleteCatError(null);
                                }}
                                title="Delete program category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words" title={cat.description}>
                          {cat.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Layers className="w-3.5 h-3.5" />
                          {cat.programs_count ?? 0} {cat.programs_count === 1 ? 'Program' : 'Programs'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 flex-wrap gap-1">
                      <span>Display order: {cat.display_order}</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Updated {new Date(cat.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: PROGRAMS & NESTED PACKAGES */}
        {/* ========================================================================= */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            {/* Search and Filters toolbar */}
            <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search programs by name, code, type, description, or package..."
                    value={progSearchQuery}
                    onChange={(e) => setProgSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </div>

                {/* Category Filter */}
                <select
                  value={progFilterCategory}
                  onChange={(e) => setProgFilterCategory(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Categories</option>
                  {programCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Delivery Mode Filter */}
                <select
                  value={progFilterDeliveryMode}
                  onChange={(e) => setProgFilterDeliveryMode(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Delivery Modes</option>
                  {DELIVERY_MODES.map((dm) => (
                    <option key={dm.value} value={dm.value}>
                      {dm.label}
                    </option>
                  ))}
                </select>

                {/* Branch Filter */}
                <select
                  value={progFilterBranch}
                  onChange={(e) => setProgFilterBranch(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.city ? `${b.city} · ${b.name}` : b.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={progFilterStatus}
                  onChange={(e) => setProgFilterStatus(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>

                {/* Trial Allowed Toggle */}
                <button
                  type="button"
                  onClick={() => setProgFilterTrialOnly((prev) => !prev)}
                  className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                    progFilterTrialOnly
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-background text-muted-foreground border-input hover:text-foreground'
                  }`}
                >
                  {progFilterTrialOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>Trial Eligible Only</span>
                </button>

                {/* Reset Filters */}
                {(progFilterCategory !== 'ALL' ||
                  progFilterStatus !== 'ALL' ||
                  progFilterBranch !== 'ALL' ||
                  progFilterDeliveryMode !== 'ALL' ||
                  progFilterTrialOnly ||
                  progSearchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProgFilterCategory('ALL');
                      setProgFilterStatus('ALL');
                      setProgFilterBranch('ALL');
                      setProgFilterDeliveryMode('ALL');
                      setProgFilterTrialOnly(false);
                      setProgSearchQuery('');
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Loading */}
            {isProgramsLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/40 rounded-2xl border border-border/60 animate-pulse p-5" />
                ))}
              </div>
            )}

            {/* Error */}
            {isProgramsError && (
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-destructive font-semibold text-sm">Failed to load programs from tenant database.</p>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto font-mono">
                  {getErrorMessage(programsError)}
                </p>
                <Button
                  onClick={() => refetchPrograms()}
                  variant="destructive"
                  size="sm"
                  className="mt-3 gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isProgramsLoading && !isProgramsError && filteredPrograms.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {progSearchQuery || progFilterCategory !== 'ALL' || progFilterBranch !== 'ALL' || progFilterDeliveryMode !== 'ALL' || progFilterStatus !== 'ALL' || progFilterTrialOnly
                    ? 'No matching programs found'
                    : 'No programs registered'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {progSearchQuery || progFilterCategory !== 'ALL' || progFilterBranch !== 'ALL' || progFilterDeliveryMode !== 'ALL' || progFilterStatus !== 'ALL' || progFilterTrialOnly
                    ? 'No program matched your active search and filter criteria. Try resetting filters.'
                    : 'Programs group packages and classes (e.g. Strength, Pilates, Personal Training). Create your first Program to begin adding packages.'}
                </p>
                {!progSearchQuery && progFilterCategory === 'ALL' && progFilterBranch === 'ALL' && progFilterDeliveryMode === 'ALL' && progFilterStatus === 'ALL' && !progFilterTrialOnly && hasCatalogPermission && (
                  <Button
                    onClick={() => {
                      setProgFormError(null);
                      setNewProgName('');
                      setNewProgCode('');
                      setNewProgDesc('');
                      setNewProgCategory(programCategories[0]?.id ?? '');
                      setNewProgDeliveryMode('GROUP_CLASS');
                      setNewProgDisplayOrder(0);
                      setNewProgTrial(false);
                      setNewProgBranchIds([]);
                      setIsNewProgramOpen(true);
                    }}
                    size="sm"
                  >
                    Create First Program
                  </Button>
                )}
              </div>
            )}

            {/* Programs List with Nested Packages */}
            {!isProgramsLoading && !isProgramsError && filteredPrograms.length > 0 && (
              <div className="space-y-4">
                {filteredPrograms.map((prog) => {
                  const catLabel = getProgramCategoryLabel(prog);
                  const progPkgs = packagesByProgram.get(prog.id) || [];
                  const isExpanded = expandedProgramIds.has(prog.id);

                  return (
                    <div
                      key={prog.id}
                      className={`bg-card border rounded-2xl transition-all shadow-xs overflow-hidden ${
                        prog.status === 'INACTIVE'
                          ? 'border-border/40 opacity-75'
                          : 'border-border/70 hover:border-primary/40'
                      }`}
                    >
                      {/* Program Header */}
                      <div className="p-4 sm:p-5 bg-card space-y-3.5">
                        {/* Top: Title & Badges */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-foreground break-words" title={prog.name}>
                              {prog.name}
                            </h3>
                            <Badge variant="outline" className="text-xs font-mono font-semibold uppercase shrink-0">
                              {prog.code || 'NO_CODE'}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-medium shrink-0" title={catLabel}>
                              {catLabel}
                            </Badge>
                            {(() => {
                              const dm = getDeliveryModeBadge(prog.delivery_mode);
                              return (
                                <Badge variant="outline" className={`text-xs shrink-0 ${dm.className}`}>
                                  {dm.label}
                                </Badge>
                              );
                            })()}
                            <Badge
                              variant={prog.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className={`text-xs shrink-0 ${
                                prog.status === 'ARCHIVED'
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold'
                                  : ''
                              }`}
                            >
                              {prog.status}
                            </Badge>
                            {prog.trial_allowed && (
                              <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5 shrink-0">
                                Trials Allowed
                              </Badge>
                            )}
                          </div>

                          {prog.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {prog.description}
                            </p>
                          )}
                        </div>

                        {/* Middle: Metadata & Branch Availability */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-muted-foreground pt-0.5">
                          {/* Branch Availability Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Branches:</span>
                            </span>
                            {prog.available_branches && prog.available_branches.length > 0 ? (
                              prog.available_branches.map((b) => (
                                <Badge
                                  key={b.id}
                                  variant="secondary"
                                  className="text-[10px] font-normal py-0.5 px-2 bg-muted/80 text-foreground border border-border/50"
                                >
                                  {b.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-amber-500/90 italic">
                                Not assigned to any branch (unavailable)
                              </span>
                            )}
                          </div>

                          {/* Quick Stats: Packages count & display order */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <PackageIcon className="w-3.5 h-3.5 text-primary" />
                              {progPkgs.length} {progPkgs.length === 1 ? 'Package' : 'Packages'}
                            </span>
                            {prog.display_order !== undefined && (
                              <span className="text-[11px]">Order: {prog.display_order}</span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasCatalogPermission && (
                              <>
                                {prog.status === 'ARCHIVED' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => restoreProgramMutation.mutate(prog.id)}
                                    disabled={restoreProgramMutation.isPending}
                                    className="text-xs h-8 gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openAddPackageForProgram(prog.id)}
                                      className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Package</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditProgram(prog)}
                                      className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        toggleProgramStatusMutation.mutate({
                                          id: prog.id,
                                          currentStatus: prog.status,
                                        });
                                      }}
                                      className={`text-xs h-8 gap-1.5 ${
                                        prog.status === 'ACTIVE'
                                          ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                                          : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                                      }`}
                                    >
                                      {prog.status === 'ACTIVE' ? (
                                        <>
                                          <ToggleRight className="w-4 h-4" />
                                          <span>Deactivate</span>
                                        </>
                                      ) : (
                                        <>
                                          <ToggleLeft className="w-4 h-4" />
                                          <span>Activate</span>
                                        </>
                                      )}
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setProgramToArchive(prog);
                                        setArchiveProgError(null);
                                      }}
                                      className="text-xs h-8 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 gap-1.5 px-2.5"
                                      title="Archive"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                      <span>Archive</span>
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleProgramExpanded(prog.id)}
                            className="text-xs h-8 gap-1.5 px-3 ml-auto sm:ml-0"
                          >
                            <span>{isExpanded ? 'Hide Packages' : 'View Packages'}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-0.5 bg-background/60">
                              {progPkgs.length}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Nested Packages Container */}
                      {isExpanded && (
                        <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span>Packages for {prog.name} ({progPkgs.length})</span>
                          </div>

                          {progPkgs.length === 0 ? (
                            <div className="p-6 text-center bg-card/60 border border-dashed border-border/80 rounded-xl space-y-2">
                              <PackageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                              <p className="text-xs text-muted-foreground">No packages created under this program yet.</p>
                              {hasCatalogPermission && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAddPackageForProgram(prog.id)}
                                  className="h-7 text-xs gap-1 mt-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add First Package</span>
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                              {progPkgs.map((pkg) => {
                                const activeVer = pkg.active_version || (pkg as any).latest_version;
                                const firstPrice = activeVer?.prices?.[0];
                                const homeEnt = activeVer?.entitlements?.find(
                                  (e: any) => e.entitlement_type === 'HOME_BRANCH_SESSION'
                                );
                                const crossEnt = activeVer?.entitlements?.find(
                                  (e: any) => e.entitlement_type === 'CROSS_BRANCH_SESSION'
                                );

                                return (
                                  <div
                                    key={pkg.id}
                                    className="bg-card hover:bg-card/95 border border-border/80 hover:border-primary/40 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all space-y-3"
                                  >
                                    <div className="space-y-3">
                                      {/* Package Header */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-foreground truncate" title={pkg.name}>
                                              {pkg.name}
                                            </h4>
                                            {pkg.code && (
                                              <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50" title="Backend-managed system code">
                                                {pkg.code}
                                              </span>
                                            )}
                                          </div>
                                          <Badge
                                            variant={pkg.status === 'ACTIVE' ? 'default' : pkg.status === 'ARCHIVED' ? 'destructive' : 'secondary'}
                                            className={`text-[10px] font-semibold tracking-wider shrink-0 ${
                                              pkg.status === 'ACTIVE'
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                                                : pkg.status === 'ARCHIVED'
                                                ? 'bg-destructive/15 text-destructive border-destructive/30'
                                                : 'bg-muted text-muted-foreground border-border/60'
                                            }`}
                                          >
                                            {pkg.status}
                                          </Badge>
                                        </div>

                                        {/* Branch Availability Chips */}
                                        {pkg.available_branches && pkg.available_branches.length > 0 && (
                                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                            <Building2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                            <span className="text-[10px] text-muted-foreground font-medium">Branches:</span>
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {pkg.available_branches.map((b) => (
                                                <span
                                                  key={b.id}
                                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground/90 border border-border/40 font-medium"
                                                >
                                                  {b.name}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Active Version & Commercial Details */}
                                      {activeVer ? (
                                        <div className="p-3 bg-muted/30 dark:bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                          {/* Version Indicator & Duration */}
                                          <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                              <span className="font-semibold text-[11px]">v{activeVer.version_number}</span>
                                              <span className="text-[10px] text-muted-foreground">Current</span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/50">
                                              {activeVer.duration_value} {activeVer.duration_unit ? activeVer.duration_unit.charAt(0).toUpperCase() + activeVer.duration_unit.slice(1).toLowerCase() : 'Month'}{Number(activeVer.duration_value) > 1 ? 's' : ''}
                                            </span>
                                          </div>

                                          {/* Primary Price */}
                                          {firstPrice && (
                                            <div className="flex items-baseline justify-between gap-2">
                                              <div className="flex items-baseline gap-1.5">
                                                <span className="text-lg font-bold text-foreground tracking-tight">
                                                  {formatCurrency(firstPrice.total_price || firstPrice.sale_price, firstPrice.currency || 'INR')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                  {firstPrice.prices_include_tax ? 'Tax incl.' : '+ Tax'}
                                                </span>
                                              </div>
                                              {firstPrice.display_price && Number(firstPrice.display_price) > Number(firstPrice.sale_price) && (
                                                <span className="text-[11px] text-muted-foreground/60 line-through">
                                                  {formatCurrency(firstPrice.display_price, firstPrice.currency || 'INR')}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {/* Entitlements Grid */}
                                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                                            <div className="bg-background/80 dark:bg-background/40 rounded-lg p-2 border border-border/40 flex flex-col justify-between">
                                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                Home Studio
                                              </span>
                                              <span className="text-xs font-semibold text-foreground mt-0.5">
                                                {homeEnt?.is_unlimited ? 'Unlimited' : `${formatSessionCount(homeEnt?.allocated_units)} sessions`}
                                              </span>
                                            </div>

                                            <div className="bg-background/80 dark:bg-background/40 rounded-lg p-2 border border-border/40 flex flex-col justify-between">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                  Cross Branch
                                                </span>
                                              </div>
                                              <div className="flex items-baseline justify-between mt-0.5">
                                                <span className="text-xs font-semibold text-foreground">
                                                  {crossEnt ? (crossEnt.is_unlimited ? 'Unlimited' : `${formatSessionCount(crossEnt.allocated_units)} sessions`) : 'None'}
                                                </span>
                                                {crossEnt?.extra_unit_price && Number(crossEnt.extra_unit_price) > 0 && (
                                                  <span className="text-[10px] text-muted-foreground font-medium ml-1">
                                                    +{formatCurrency(crossEnt.extra_unit_price, 'INR')}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                          <Clock className="w-4 h-4 shrink-0" />
                                          <span className="font-medium">Draft state (no active version)</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Package Actions Bar */}
                                    <div className="pt-2.5 border-t border-border/50 flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setHistoryPackage(pkg)}
                                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1.5 font-medium"
                                            title="View immutable version history"
                                          >
                                            <History className="w-3.5 h-3.5" />
                                            <span>Versions</span>
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAuditPackage(pkg)}
                                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1.5 font-medium"
                                            title="View audit logs"
                                          >
                                            <Activity className="w-3.5 h-3.5" />
                                            <span>Audit</span>
                                          </Button>
                                        </div>

                                        {hasCatalogPermission && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedPackage(pkg);
                                              setNewVerName(`${pkg.name} v${(activeVer?.version_number ?? 0) + 1}`);
                                              setNewVerDurationVal(activeVer?.duration_value ?? 6);
                                              setNewVerDurationUnit(activeVer?.duration_unit ?? 'MONTH');
                                              const td = activeVer?.total_days ?? 180;
                                              setNewVerTotalDays(td);
                                              setNewVerValidity(td);
                                              setNewVerSalePrice(firstPrice?.sale_price ? String(Math.round(Number(firstPrice.sale_price))) : '');
                                              setNewVerDisplayPrice(firstPrice?.display_price ? String(Math.round(Number(firstPrice.display_price))) : '');
                                              setNewVerTaxPercentage(firstPrice?.tax_percent ? String(Math.round(parseFloat(String(firstPrice.tax_percent)))) : '18');
                                              setNewVerTaxIncluded(firstPrice?.prices_include_tax ?? true);
                                              setNewVerHomeUnlimited(Boolean(homeEnt?.is_unlimited));
                                              setNewVerMaxSessions(homeEnt?.allocated_units ? String(Math.round(Number(homeEnt.allocated_units))) : '');
                                              setNewVerCrossUnlimited(Boolean(crossEnt?.is_unlimited));
                                              setNewVerPassportSessions(crossEnt?.allocated_units ? String(Math.round(Number(crossEnt.allocated_units))) : '');
                                              setNewVerPassportCost(crossEnt?.extra_unit_price ? String(Math.round(Number(crossEnt.extra_unit_price))) : '');
                                              setNewVerShowWeb(activeVer?.show_on_web ?? true);
                                              setNewVerShowApp(activeVer?.show_on_app ?? true);
                                              setNewVerPublishNow(false);
                                              setIsNewVersionOpen(true);
                                            }}
                                            className="h-7 text-xs px-2 text-primary border-primary/25 hover:bg-primary/5 hover:border-primary/40 gap-1 font-medium"
                                            title="Create new version snapshot"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>New Version</span>
                                          </Button>
                                        )}
                                      </div>

                                      {hasCatalogPermission && (
                                        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEditPackage(pkg)}
                                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                                            title="Edit package settings"
                                          >
                                            <Pencil className="w-3 h-3" />
                                            <span>Edit</span>
                                          </Button>

                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                togglePackageStatusMutation.mutate({
                                                  id: pkg.id,
                                                  newStatus: pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                                });
                                              }}
                                              className={`h-6 text-[11px] px-2 gap-1 ${
                                                pkg.status === 'ACTIVE'
                                                  ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                                                  : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                                              }`}
                                              title={pkg.status === 'ACTIVE' ? 'Deactivate package' : 'Activate package'}
                                            >
                                              {pkg.status === 'ACTIVE' ? (
                                                <>
                                                  <ToggleRight className="w-3.5 h-3.5" />
                                                  <span>Deactivate</span>
                                                </>
                                              ) : (
                                                <>
                                                  <ToggleLeft className="w-3.5 h-3.5" />
                                                  <span>Activate</span>
                                                </>
                                              )}
                                            </Button>

                                            {pkg.status !== 'ARCHIVED' ? (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setPackageToArchive(pkg);
                                                  setArchivePkgError(null);
                                                }}
                                                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive gap-1"
                                                title="Archive package"
                                              >
                                                <Archive className="w-3 h-3" />
                                                <span>Archive</span>
                                              </Button>
                                            ) : (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => restorePackageMutation.mutate(pkg.id)}
                                                className="h-6 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 gap-1"
                                                title="Restore archived package"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                                <span>Restore</span>
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TERMS & LEGAL POLICIES */}
        {/* ========================================================================= */}
        {activeTab === 'terms' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search policies by name or type..."
                  value={termsSearchQuery}
                  onChange={(e) => setTermsSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Loading */}
            {isTermsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-muted/40 rounded-2xl border border-border/60 animate-pulse" />
                ))}
              </div>
            )}

            {/* Error */}
            {isTermsError && (
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-destructive font-semibold text-sm">Failed to load legal policies from tenant database.</p>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto font-mono">
                  {getErrorMessage(termsError)}
                </p>
                <Button onClick={() => refetchTerms()} variant="destructive" size="sm" className="mt-3 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isTermsLoading && !isTermsError && filteredTermsDocs.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {termsSearchQuery ? 'No matching policy documents' : 'No legal policies registered'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {termsSearchQuery
                    ? `No policy matched "${termsSearchQuery}". Try a different search term.`
                    : 'Create policy documents (e.g. Membership Terms, Cancellation Policy) and publish versioned legal texts with immutable member acceptance tracking.'}
                </p>
                {!termsSearchQuery && hasCatalogPermission && (
                  <Button
                    onClick={() => {
                      setTermsDocFormError(null);
                      setNewTermsName('');
                      setNewTermsType('MEMBERSHIP_TERMS');
                      setIsNewTermsDocOpen(true);
                    }}
                    size="sm"
                  >
                    Create Policy Document
                  </Button>
                )}
              </div>
            )}

            {/* Cards Grid */}
            {!isTermsLoading && !isTermsError && filteredTermsDocs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTermsDocs.map((doc) => {
                  const isExpanded = expandedTermsDocId === doc.id;
                  const activeVer = doc.active_version;

                  return (
                    <div
                      key={doc.id}
                      className="bg-card border border-border/60 hover:border-primary/40 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{doc.name}</h3>
                            <span className="text-xs text-muted-foreground">
                              {doc.document_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <Badge
                            variant={doc.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {doc.status}
                          </Badge>
                        </div>

                        {activeVer ? (
                          <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Active: v{activeVer.version_number}
                              </span>
                              <span className="text-muted-foreground/80">
                                {new Date(activeVer.effective_from).toLocaleDateString()}
                              </span>
                            </div>
                            {activeVer.content_text && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 italic">
                                "{activeVer.content_text}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>No active version published (Draft state).</span>
                          </div>
                        )}
                      </div>

                      {/* Version expand / actions */}
                      <div className="pt-3 border-t border-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedTermsDocId(isExpanded ? null : doc.id)}
                            className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1 px-2"
                          >
                            <span>{isExpanded ? 'Hide Versions' : 'View All Versions'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>

                          {hasCatalogPermission && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTermsDoc(doc);
                                setNewVerContent('');
                                setNewVerEffectiveFrom(new Date().toISOString().slice(0, 16));
                                setTermsVerFormError(null);
                                setIsNewTermsVersionOpen(true);
                              }}
                              className="text-xs h-7 text-primary hover:text-primary/80 gap-1 px-2"
                            >
                              <Plus className="w-3 h-3" />
                              <span>New Version</span>
                            </Button>
                          )}
                        </div>

                        {/* Inline versions list */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            {isVersionsLoading ? (
                              <p className="text-xs text-muted-foreground animate-pulse">Loading versions...</p>
                            ) : expandedVersions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No versions found for this document.</p>
                            ) : (
                              expandedVersions.map((ver) => (
                                <div
                                  key={ver.id}
                                  className="p-2.5 rounded-lg bg-background border border-border/60 text-xs flex items-center justify-between gap-2"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-foreground">v{ver.version_number}</span>
                                      <Badge
                                        variant={ver.status === 'ACTIVE' ? 'default' : 'secondary'}
                                        className="text-[10px] py-0 px-1.5"
                                      >
                                        {ver.status}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      From: {new Date(ver.effective_from).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {ver.status === 'DRAFT' && hasCatalogPermission && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setPublishTarget({
                                          docId: doc.id,
                                          versionId: ver.id,
                                          versionNum: ver.version_number,
                                        });
                                        setPublishError(null);
                                        setIsPublishConfirmOpen(true);
                                      }}
                                      className="text-xs h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                    >
                                      Publish
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* ========================================================================= */}
      {/* MODAL: PACKAGE VERSION HISTORY (READ-ONLY SNAPSHOTS) */}
      {/* ========================================================================= */}
      {historyPackage && (
        <Dialog open={Boolean(historyPackage)} onOpenChange={(open) => { if (!open) { setHistoryPackage(null); setExpandedVersionId(null); } }}>
          <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <History className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="font-bold text-base text-foreground leading-snug">
                      Version History — {historyPackage.name}
                    </h2>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Immutable commercial snapshots · click a version to view all fields
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                  {historyPackage.versions?.length ?? 0} version{(historyPackage.versions?.length ?? 0) !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            {/* Scrollable version list */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {historyPackage.versions && historyPackage.versions.length > 0 ? (
                historyPackage.versions
                  .slice()
                  .sort((a, b) => b.version_number - a.version_number)
                  .map((ver) => {
                    const isCurrent = ver.status === 'ACTIVE';
                    const isExpanded = expandedVersionId === ver.id;
                    const prices = ver.prices ?? [];
                    const ents = ver.entitlement_definitions ?? [];
                    const homeEnt = ents.find(e => e.entitlement_type === 'HOME_BRANCH_SESSION');
                    const crossEnt = ents.find(e => e.entitlement_type === 'CROSS_BRANCH_SESSION');
                    const classEnt = ents.find(e => e.entitlement_type === 'CLASS_SESSION');
                    const ptEnt = ents.find(e => e.entitlement_type === 'PERSONAL_TRAINING_SESSION');
                    const openEnt = ents.find(e => e.entitlement_type === 'OPEN_ACCESS');
                    const otherEnts = ents.filter(e => !['HOME_BRANCH_SESSION','CROSS_BRANCH_SESSION','CLASS_SESSION','PERSONAL_TRAINING_SESSION','OPEN_ACCESS'].includes(e.entitlement_type));

                    const firstPrice = prices[0];
                    const durationLabel = `${ver.duration_value} ${ver.duration_unit?.toLowerCase()}(s)${ver.total_days ? ` (${ver.total_days}d)` : ''}`;
                    const validityLabel = ver.validity_days ? `${ver.validity_days} days` : ver.total_days ? `${ver.total_days} days` : '—';
                    const channels = [ver.show_on_web && 'Web', ver.show_on_app && 'App'].filter(Boolean).join(', ') || 'None';

                    return (
                      <div
                        key={ver.id}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          isCurrent
                            ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5'
                            : 'border-border/60 bg-card'
                        }`}
                      >
                        {/* Version summary header — always visible, click to expand */}
                        <button
                          type="button"
                          onClick={() => toggleVersionExpanded(ver.id)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          {/* Version number badge */}
                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            v{ver.version_number}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-semibold text-sm text-foreground">
                                Version {ver.version_number}
                              </span>
                              {/* Status badge & actions */}
                              <div className="flex items-center gap-1.5 ml-auto shrink-0 flex-wrap">
                                {ver.status === 'ACTIVE' && (
                                  <>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                                      CURRENT / ACTIVE
                                    </span>
                                    {hasCatalogPermission && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPackage(historyPackage);
                                            setNewVerName(`${historyPackage.name} v${(ver.version_number ?? 0) + 1}`);
                                            setNewVerDurationVal(ver.duration_value ?? 6);
                                            setNewVerDurationUnit(ver.duration_unit ?? 'MONTH');
                                            const td = ver.total_days ?? 180;
                                            setNewVerTotalDays(td);
                                            setNewVerValidity(td);
                                            const fp = ver.prices?.[0];
                                            setNewVerSalePrice(fp?.sale_price ? String(Math.round(Number(fp.sale_price))) : '');
                                            setNewVerDisplayPrice(fp?.display_price ? String(Math.round(Number(fp.display_price))) : '');
                                            setNewVerTaxPercentage(fp?.tax_percent ? String(Math.round(parseFloat(String(fp.tax_percent)))) : '18');
                                            setNewVerTaxIncluded(fp?.prices_include_tax ?? true);
                                            const he = ver.entitlement_definitions?.find(e => e.entitlement_type === 'HOME_BRANCH_SESSION');
                                            const ce = ver.entitlement_definitions?.find(e => e.entitlement_type === 'CROSS_BRANCH_SESSION');
                                            setNewVerHomeUnlimited(Boolean(he?.is_unlimited));
                                            setNewVerMaxSessions(he?.allocated_units ? String(Math.round(Number(he.allocated_units))) : '');
                                            setNewVerCrossUnlimited(Boolean(ce?.is_unlimited));
                                            setNewVerPassportSessions(ce?.allocated_units ? String(Math.round(Number(ce.allocated_units))) : '');
                                            setNewVerPassportCost(ce?.extra_unit_price ? String(Math.round(Number(ce.extra_unit_price))) : '');
                                            setNewVerShowWeb(ver.show_on_web ?? true);
                                            setNewVerShowApp(ver.show_on_app ?? true);
                                            setNewVerPublishNow(false);
                                            setIsNewVersionOpen(true);
                                          }}
                                          className="h-6 text-[11px] px-2 text-primary border-primary/30 hover:bg-primary/5 gap-1"
                                          title="Clone terms into a new Draft version"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>New Version</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVersionToRetire({
                                              pkgId: historyPackage.id,
                                              verId: ver.id,
                                              versionNum: ver.version_number,
                                              pkgName: historyPackage.name,
                                            });
                                          }}
                                          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-amber-600"
                                          title="Retire this version"
                                        >
                                          Retire
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}

                                {ver.status === 'DRAFT' && (
                                  <>
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      DRAFT
                                    </Badge>
                                    {hasCatalogPermission && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVersionToPublish({
                                              pkgId: historyPackage.id,
                                              verId: ver.id,
                                              versionNum: ver.version_number,
                                              pkgName: historyPackage.name,
                                            });
                                          }}
                                          className="h-6 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                          title="Publish this version to make it active"
                                        >
                                          <Send className="w-3 h-3" />
                                          <span>Publish</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDraftToDiscard({
                                              pkgId: historyPackage.id,
                                              verId: ver.id,
                                              versionNum: ver.version_number,
                                              pkgName: historyPackage.name,
                                            });
                                          }}
                                          className="h-6 text-[11px] px-2 text-destructive hover:bg-destructive/10 gap-1"
                                          title="Discard this draft version"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>Discard</span>
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}

                                {ver.status === 'RETIRED' && (
                                  <>
                                    <Badge variant="secondary" className="text-[10px]">
                                      RETIRED
                                    </Badge>
                                    {hasCatalogPermission && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          reuseVersionMutation.mutate({ verId: ver.id, fromVerNum: ver.version_number });
                                        }}
                                        disabled={reuseVersionMutation.isPending}
                                        className="h-6 text-[11px] px-2 text-primary border-primary/30 hover:bg-primary/5 gap-1 font-medium"
                                        title="Clone selected retired terms into the next version as a new Draft"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Make Current Again</span>
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Quick-glance summary row */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5 items-center">
                              <span className="font-medium text-foreground">{durationLabel}</span>
                              {firstPrice && (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(firstPrice.total_price || firstPrice.sale_price, firstPrice.currency || 'INR')}
                                </span>
                              )}
                              <span>Validity: {validityLabel}</span>
                              <span>{channels}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              Created {new Date(ver.created_at).toLocaleDateString()}
                              {ver.published_at && ` · Published ${new Date(ver.published_at).toLocaleDateString()}`}
                            </p>
                          </div>

                          {/* Chevron */}
                          <div className="shrink-0 text-muted-foreground mt-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-4 text-xs">
                            {/* Immutability guidance banner */}
                            {ver.status === 'ACTIVE' ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="flex-1">
                                  This version is currently published and cannot be changed. Create a new version to update commercial terms.
                                </span>
                              </div>
                            ) : ver.status === 'RETIRED' ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="flex-1">
                                  This version is retired and immutable. Click &ldquo;Make Current Again&rdquo; to clone these terms into a new Draft version.
                                </span>
                              </div>
                            ) : null}

                            {/* — Duration & Validity — */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Duration &amp; Validity</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-muted/30 rounded-lg p-2.5">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Duration</p>
                                  <p className="font-semibold text-foreground">{ver.duration_value} {ver.duration_unit?.toLowerCase()}(s)</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-2.5">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Total Days</p>
                                  <p className="font-semibold text-foreground">{ver.total_days ?? '—'}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-2.5">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Validity Days</p>
                                  <p className="font-semibold text-foreground">{ver.validity_days ?? ver.total_days ?? '—'}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-2.5">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Effective From</p>
                                  <p className="font-semibold text-foreground">{new Date(ver.effective_from).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>

                            {/* — Pricing — */}
                            {prices.length > 0 ? (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pricing</p>
                                <div className="space-y-2">
                                  {prices.map((price, pi) => (
                                    <div key={pi} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <div>
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Base Price</p>
                                        <p className="font-semibold text-foreground">{price.currency || 'INR'} {price.base_price}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Tax ({Math.round(parseFloat(String(price.tax_percent || price.tax_percentage || 0)))}%)</p>
                                        <p className="font-semibold text-foreground">{price.prices_include_tax ? 'Included' : 'Exclusive'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Total Price</p>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{price.currency || 'INR'} {price.total_price || price.sale_price}</p>
                                      </div>
                                      {price.branch_name && (
                                        <div>
                                          <p className="text-[10px] text-muted-foreground mb-0.5">Branch</p>
                                          <p className="font-semibold text-foreground">{price.branch_name}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pricing</p>
                                <p className="text-muted-foreground italic">No pricing configured for this version.</p>
                              </div>
                            )}

                            {/* — Entitlements — */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Entitlements &amp; Sessions</p>
                              {ents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {homeEnt && (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">🏠 Home Branch Sessions</p>
                                      <p className="font-semibold text-foreground">
                                        {homeEnt.is_unlimited ? 'Unlimited' : homeEnt.allocated_units ? `${homeEnt.allocated_units} sessions` : '—'}
                                      </p>
                                    </div>
                                  )}
                                  {crossEnt && (
                                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">🌐 Session Passport (Cross-Branch)</p>
                                      <p className="font-semibold text-foreground">
                                        {crossEnt.is_unlimited ? 'Unlimited' : crossEnt.allocated_units ? `${crossEnt.allocated_units} sessions` : '—'}
                                      </p>
                                      {crossEnt.extra_unit_price && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Extra unit: ₹{crossEnt.extra_unit_price}</p>
                                      )}
                                    </div>
                                  )}
                                  {classEnt && (
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">🧘 Class Sessions</p>
                                      <p className="font-semibold text-foreground">
                                        {classEnt.is_unlimited ? 'Unlimited' : classEnt.allocated_units ? `${classEnt.allocated_units} sessions` : '—'}
                                      </p>
                                    </div>
                                  )}
                                  {ptEnt && (
                                    <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">💪 PT Sessions</p>
                                      <p className="font-semibold text-foreground">
                                        {ptEnt.is_unlimited ? 'Unlimited' : ptEnt.allocated_units ? `${ptEnt.allocated_units} sessions` : '—'}
                                      </p>
                                    </div>
                                  )}
                                  {openEnt && (
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">🔓 Open Access</p>
                                      <p className="font-semibold text-foreground">Included</p>
                                    </div>
                                  )}
                                  {otherEnts.map((e, ei) => (
                                    <div key={ei} className="bg-muted/30 rounded-lg p-2.5">
                                      <p className="text-[10px] text-muted-foreground mb-0.5">{e.entitlement_type.replace(/_/g, ' ')}</p>
                                      <p className="font-semibold text-foreground">
                                        {e.is_unlimited ? 'Unlimited' : e.allocated_units ? `${e.allocated_units} units` : '—'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground italic">No entitlements defined for this version.</p>
                              )}
                            </div>

                            {/* — Distribution & Flags — */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Distribution &amp; Flags</p>
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                  ver.show_on_web ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : 'bg-muted/30 border-border/50 text-muted-foreground'
                                }`}>
                                  <Globe className="w-3 h-3" /> Web {ver.show_on_web ? '✓' : '✗'}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                  ver.show_on_app ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400' : 'bg-muted/30 border-border/50 text-muted-foreground'
                                }`}>
                                  <Smartphone className="w-3 h-3" /> App {ver.show_on_app ? '✓' : '✗'}
                                </span>
                                {ver.is_trial_package && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                                    ⚡ Trial Package
                                  </span>
                                )}
                                {ver.only_for_trial && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                                    🔒 Trial-Only
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* — Description — */}
                            {ver.description_snapshot && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                                <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5 whitespace-pre-wrap">{ver.description_snapshot}</p>
                              </div>
                            )}

                            {/* — Timestamps — */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>Created: {new Date(ver.created_at).toLocaleString()}</span>
                              {ver.published_at && <span>Published: {new Date(ver.published_at).toLocaleString()}</span>}
                              {ver.effective_until && <span>Expires: {new Date(ver.effective_until).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : historyPackage.active_version ? (
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      v{historyPackage.active_version.version_number} — {historyPackage.active_version.name_snapshot}
                    </span>
                    <Badge variant="default" className="text-[10px]">CURRENT</Badge>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">READ-ONLY</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Duration</span>
                      <span className="font-semibold text-foreground">
                        {historyPackage.active_version.duration_value} {historyPackage.active_version.duration_unit?.toLowerCase()}(s)
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Validity</span>
                      <span className="font-semibold text-foreground">
                        {historyPackage.active_version.validity_days ?? historyPackage.active_version.total_days ?? '—'} days
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Pricing</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {historyPackage.active_version.prices?.[0]?.total_price
                          ? `₹ ${historyPackage.active_version.prices[0].total_price}`
                          : 'Configured'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Sessions</span>
                      <span className="font-semibold text-foreground">
                        {historyPackage.active_version.entitlements?.find(e => e.entitlement_type === 'HOME_BRANCH_SESSION')?.allocated_units ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-card border border-dashed border-border/80 rounded-xl">
                  <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No versions created yet for this package.</p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-border/60 shrink-0 flex justify-end">
              <Button type="button" variant="outline" onClick={() => { setHistoryPackage(null); setExpandedVersionId(null); }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PACKAGE AUDIT LOG */}
      {/* ========================================================================= */}
      {auditPackage && (
        <Dialog open={Boolean(auditPackage)} onOpenChange={(open) => !open && setAuditPackage(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <span>Audit Trail — {auditPackage.name}</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological record of who modified this package and when.
              </p>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {isAuditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/40 rounded-xl border border-border/50 animate-pulse" />
                  ))}
                </div>
              ) : filteredAuditEvents.length === 0 ? (
                <div className="p-8 text-center bg-card border border-dashed border-border/80 rounded-xl">
                  <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No audit events recorded yet for this package.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredAuditEvents.map((evt: any) => {
                    const actionRaw = evt.action || evt.action_code || evt.event_type || '';
                    const actionTitle = actionRaw
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Package Modified';
                    const isCreate = actionRaw.toUpperCase().includes('CREATE');
                    const actorDisplay = evt.actor_email || evt.actor_name || evt.actor || 'Administrator';
                    const data = evt.after_data || evt.metadata || {};

                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 bg-card border border-border/70 rounded-xl space-y-2 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full shrink-0 ${isCreate ? 'bg-emerald-500' : 'bg-primary'}`} />
                            <span className="font-semibold text-foreground text-xs sm:text-sm">
                              {actionTitle}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {new Date(evt.created_at || evt.occurred_at || evt.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground text-[11px] flex-wrap gap-1">
                          <span>
                            Modified by: <strong className="text-foreground font-medium">{actorDisplay}</strong>
                          </span>
                          {evt.ip_address && <span className="text-muted-foreground/60">IP: {evt.ip_address}</span>}
                        </div>

                        {evt.event_description && (
                          <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-foreground/90 leading-relaxed border border-border/40">
                            {evt.event_description}
                          </div>
                        )}

                        {/* Client-friendly attribute summary badges with ZERO raw code/JSON */}
                        {data && typeof data === 'object' && Object.keys(data).length > 0 && (
                          <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                            {data.status && (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                data.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                Status: {data.status}
                              </span>
                            )}
                            {(data.price || data.total_price || data.sale_price) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Price: {formatCurrency(data.price || data.total_price || data.sale_price, data.currency || 'INR')}
                              </span>
                            )}
                            {(data.duration_value || data.duration) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                                Duration: {data.duration_value || data.duration} {data.duration_unit?.toLowerCase() || ''}
                              </span>
                            )}
                            {(data.validity_days || data.validity) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border/60">
                                Validity: {data.validity_days || data.validity} days
                              </span>
                            )}
                            {(data.allocated_units || data.sessions) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border/60">
                                Sessions: {data.allocated_units || data.sessions}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setAuditPackage(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PROGRAM CATEGORY */}
      {/* ========================================================================= */}
      <Dialog open={isNewProgramCategoryOpen} onOpenChange={setIsNewProgramCategoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Program Category</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Program Categories classify your Programs (e.g. Strength & Conditioning, Pilates, Personal Training, Open Gym).
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {catFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {catFormError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
              <Input
                type="text"
                placeholder="e.g. Strength & Conditioning"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-sm"
              />
              <span className="text-[10px] text-muted-foreground">Unique system code will be generated automatically.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                type="text"
                placeholder="Optional description..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
              <Input
                type="number"
                min={0}
                value={newCatOrder}
                onChange={(e) => setNewCatOrder(Number(e.target.value))}
                className="text-sm"
              />
              <span className="text-[10px] text-muted-foreground">Lower number = shown first in listings</span>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsNewProgramCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCatName.trim() || createProgramCategoryMutation.isPending}
              onClick={() => {
                setCatFormError(null);
                createProgramCategoryMutation.mutate();
              }}
            >
              {createProgramCategoryMutation.isPending ? 'Creating...' : 'Create Program Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROGRAM CATEGORY */}
      {/* ========================================================================= */}
      {editingProgramCategory && (
        <Dialog open={Boolean(editingProgramCategory)} onOpenChange={(open) => !open && setEditingProgramCategory(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Program Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm pt-2">
              {editCatFormError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {editCatFormError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
                  <Input
                    type="text"
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">System Code (Read-only)</label>
                  <div className="h-9 px-3 flex items-center rounded-md border border-input/60 bg-muted/40 text-xs font-mono text-muted-foreground select-all">
                    {editingProgramCategory.code || '—'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <select
                    value={editCatStatus}
                    onChange={(e) => setEditCatStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
                  <Input
                    type="number"
                    min={0}
                    value={editCatOrder}
                    onChange={(e) => setNewCatOrder(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <Input
                  type="text"
                  value={editCatDesc}
                  onChange={(e) => setEditCatDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingProgramCategory(null)}>
                Cancel
              </Button>
              <Button
                disabled={!editCatName.trim() || updateProgramCategoryMutation.isPending}
                onClick={() => {
                  setEditCatFormError(null);
                  updateProgramCategoryMutation.mutate({
                    id: editingProgramCategory.id,
                    payload: {
                      name: editCatName.trim(),
                      description: editCatDesc.trim() || null,
                      display_order: editCatOrder,
                      status: editCatStatus,
                    },
                  });
                }}
              >
                {updateProgramCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PROGRAM */}
      {/* ========================================================================= */}
      <Dialog open={isNewProgramOpen} onOpenChange={setIsNewProgramOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create New Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {progFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {progFormError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Program Name *</label>
              <Input
                type="text"
                placeholder="e.g. Strength & Conditioning"
                value={newProgName}
                onChange={(e) => setNewProgName(e.target.value)}
                className="text-sm"
              />
              <span className="text-[10px] text-muted-foreground">Unique system code will be generated automatically.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category *</label>
                <select
                  value={newProgCategory || (programCategories[0]?.id ?? '')}
                  onChange={(e) => setNewProgCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {programCategories.length === 0 ? (
                    <option value="">No categories configured (create category first)</option>
                  ) : (
                    programCategories.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.status === 'INACTIVE'}>
                        {c.name}{c.status === 'INACTIVE' ? ' — Inactive' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Service Structure *</label>
                <select
                  value={newProgDeliveryMode}
                  onChange={(e) => setNewProgDeliveryMode(e.target.value as DeliveryMode)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DELIVERY_MODES.map((dm) => (
                    <option key={dm.value} value={dm.value}>
                      {dm.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                type="text"
                placeholder="Optional program description..."
                value={newProgDesc}
                onChange={(e) => setNewProgDesc(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
                <Input
                  type="number"
                  min={0}
                  value={newProgDisplayOrder}
                  onChange={(e) => setNewProgDisplayOrder(Number(e.target.value))}
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-5">
                <input
                  type="checkbox"
                  id="new_prog_trial"
                  checked={newProgTrial}
                  onChange={(e) => setNewProgTrial(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="new_prog_trial" className="text-xs text-foreground cursor-pointer select-none">
                  Allow trial bookings for this program
                </label>
              </div>
            </div>

            {/* Branch Availability Multi-select */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Branch Availability ({newProgBranchIds.length}/{branches.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProgBranchIds(branches.map((b: any) => b.id))}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => setNewProgBranchIds([])}
                    className="text-[11px] text-muted-foreground hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Select which studio branches offer this program. Packages and trial bookings will only be valid at these branches.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-44 overflow-y-auto pr-1">
                {branches.map((branch: any) => {
                  const isChecked = newProgBranchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProgBranchIds((prev) => [...prev, branch.id]);
                          } else {
                            setNewProgBranchIds((prev) => prev.filter((id) => id !== branch.id));
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="truncate font-medium">{branch.name}</span>
                      {branch.code && (
                        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                          {branch.code}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewProgramOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!newProgName.trim() || createProgramMutation.isPending}
              onClick={() => {
                setProgFormError(null);
                createProgramMutation.mutate();
              }}
            >
              {createProgramMutation.isPending ? 'Creating...' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROGRAM */}
      {/* ========================================================================= */}
      {editingProgram && (
        <Dialog open={Boolean(editingProgram)} onOpenChange={(open) => !open && setEditingProgram(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm pt-2">
              {progFormError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {progFormError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Program Name *</label>
                  <Input
                    type="text"
                    value={editProgName}
                    onChange={(e) => setEditProgName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">System Code (Read-only)</label>
                  <div className="h-9 px-3 flex items-center rounded-md border border-input/60 bg-muted/40 text-xs font-mono text-muted-foreground select-all">
                    {editingProgram.code || '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Category *</label>
                  <select
                    value={editProgCategory}
                    onChange={(e) => setEditProgCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {programCategories.length === 0 ? (
                      <option value="">No categories configured</option>
                    ) : (
                      programCategories.map((c) => (
                        <option key={c.id} value={c.id} disabled={c.status === 'INACTIVE'}>
                          {c.name}{c.status === 'INACTIVE' ? ' — Inactive' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Service Structure *</label>
                  <select
                    value={editProgDeliveryMode}
                    onChange={(e) => setEditProgDeliveryMode(e.target.value as DeliveryMode)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {DELIVERY_MODES.map((dm) => (
                      <option key={dm.value} value={dm.value}>
                        {dm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <Input
                  type="text"
                  value={editProgDesc}
                  onChange={(e) => setEditProgDesc(e.target.value)}
                  placeholder="Optional program description..."
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <select
                    value={editProgStatus}
                    onChange={(e) => setEditProgStatus(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
                  <Input
                    type="number"
                    min={0}
                    value={editProgDisplayOrder}
                    onChange={(e) => setEditProgDisplayOrder(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2 sm:pt-5">
                  <input
                    type="checkbox"
                    id="trial_allowed"
                    checked={editProgTrial}
                    onChange={(e) => setEditProgTrial(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="trial_allowed" className="text-xs text-foreground cursor-pointer select-none">
                    Allow trials
                  </label>
                </div>
              </div>

              {/* Branch Availability Multi-select */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Branch Availability ({editProgBranchIds.length}/{branches.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditProgBranchIds(branches.map((b: any) => b.id))}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => setEditProgBranchIds([])}
                      className="text-[11px] text-muted-foreground hover:underline font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select which studio branches offer this program.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-44 overflow-y-auto pr-1">
                  {branches.map((branch: any) => {
                    const isChecked = editProgBranchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-primary/50 bg-primary/5 text-foreground'
                            : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditProgBranchIds((prev) => [...prev, branch.id]);
                            } else {
                              setEditProgBranchIds((prev) => prev.filter((id) => id !== branch.id));
                            }
                          }}
                          className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate font-medium">{branch.name}</span>
                        {branch.code && (
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                            {branch.code}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingProgram(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={!editProgName.trim() || updateProgramMutation.isPending}
                onClick={() => {
                  setProgFormError(null);
                  updateProgramMutation.mutate({
                    id: editingProgram.id,
                    payload: {
                      name: editProgName.trim(),
                      description: editProgDesc.trim() || null,
                      category: editProgCategory || null,
                      delivery_mode: editProgDeliveryMode,
                      display_order: editProgDisplayOrder,
                      trial_allowed: editProgTrial,
                      status: editProgStatus,
                      available_branch_ids: editProgBranchIds,
                    },
                  });
                }}
              >
                {updateProgramMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARCHIVE PROGRAM CONFIRMATION */}
      {/* ========================================================================= */}
      {programToArchive && (
        <Dialog open={Boolean(programToArchive)} onOpenChange={(open) => !open && setProgramToArchive(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Archive className="w-5 h-5 text-amber-500" />
                Archive {programToArchive.name}?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm pt-2">
              {archiveProgError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {archiveProgError}
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                This program will be removed from new operational selections, but its history and related records will be preserved.
              </p>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProgramToArchive(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={archiveProgramMutation.isPending}
                onClick={() => archiveProgramMutation.mutate(programToArchive.id)}
              >
                {archiveProgramMutation.isPending ? 'Archiving...' : 'Archive Program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARCHIVE PACKAGE CONFIRMATION */}
      {/* ========================================================================= */}
      {packageToArchive && (
        <Dialog open={Boolean(packageToArchive)} onOpenChange={(open) => !open && setPackageToArchive(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Archive className="w-5 h-5 text-amber-500" />
                Archive {packageToArchive.name}?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm pt-2">
              {archivePkgError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {archivePkgError}
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                Archiving deactivates this commercial package from new sales and catalog browsing.
                Existing memberships, contracts, and purchase records will remain intact and valid.
              </p>
              <p className="text-xs text-muted-foreground">
                You can restore an archived package at any time.
              </p>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPackageToArchive(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={archivePackageMutation.isPending}
                onClick={() => archivePackageMutation.mutate(packageToArchive.id)}
              >
                {archivePackageMutation.isPending ? 'Archiving...' : 'Archive Package'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PROGRAM CATEGORY CONFIRMATION */}
      {/* ========================================================================= */}
      {programCategoryToDelete && (
        <Dialog open={Boolean(programCategoryToDelete)} onOpenChange={(open) => !open && setProgramCategoryToDelete(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Delete Program Category
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm pt-2">
              {deleteCatError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {deleteCatError}
                </div>
              )}
              <p className="text-foreground">
                Are you sure you want to permanently delete{' '}
                <strong className="text-foreground font-semibold">{programCategoryToDelete.name}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                Program categories referenced by programs cannot be deleted. Deactivate them instead or reassign programs.
              </p>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProgramCategoryToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteProgramCategoryMutation.isPending}
                onClick={() => deleteProgramCategoryMutation.mutate(programCategoryToDelete.id)}
              >
                {deleteProgramCategoryMutation.isPending ? 'Deleting...' : 'Delete Program Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PACKAGE (NO CODE FIELD) */}
      {/* ========================================================================= */}
      <Dialog open={isNewPackageOpen} onOpenChange={setIsNewPackageOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create New Package</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up package commercial identity, initial version, pricing, and session allocations.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {pkgFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {pkgFormError}
              </div>
            )}

            {/* Section 1: Package Identity */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Program *</label>
                {programs.filter((p) => p.status === 'ACTIVE').length === 0 ? (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-lg space-y-1.5">
                    <p>No active programs exist. Packages must belong to an Active Program.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsNewPackageOpen(false);
                        setIsNewProgramOpen(true);
                      }}
                    >
                      Create Program First
                    </Button>
                  </div>
                ) : (
                  <select
                    value={newPkgProgram}
                    onChange={(e) => setNewPkgProgram(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Program (Required)</option>
                    {programs
                      .filter((p) => p.status === 'ACTIVE')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Package Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Gold Annual Membership"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Branch Availability Section */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Available Branches
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Select which branches offer this package
                </span>
              </div>
              {!newPkgProgram ? (
                <p className="text-xs text-muted-foreground italic">Select a program first to configure branch availability.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {branches.map((b) => {
                    const prog = programs.find((p) => p.id === newPkgProgram);
                    const progBranchIds = prog?.available_branch_ids || [];
                    const isProgramAvailable = progBranchIds.includes(b.id);
                    const isChecked = newPkgBranchIds.includes(b.id);

                    return (
                      <div
                        key={b.id}
                        className={`p-2 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                          !isProgramAvailable
                            ? 'opacity-50 bg-muted/20 border-border/40 cursor-not-allowed'
                            : isChecked
                            ? 'bg-primary/5 border-primary/40'
                            : 'bg-card border-border/60 hover:border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`new_pkg_branch_${b.id}`}
                          disabled={!isProgramAvailable}
                          checked={isChecked && isProgramAvailable}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPkgBranchIds([...newPkgBranchIds, b.id]);
                            } else {
                              setNewPkgBranchIds(newPkgBranchIds.filter((id) => id !== b.id));
                            }
                          }}
                          className="mt-0.5 rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`new_pkg_branch_${b.id}`}
                            className={`font-medium block leading-snug ${
                              isProgramAvailable ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground'
                            }`}
                          >
                            {b.name}
                          </label>
                          {!isProgramAvailable && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                              This Program is not available at this Branch.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Initial Version & Duration */}
            <div className="pt-3 border-t border-border space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Initial Version &amp; Duration</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Duration Value */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Duration Value *</label>
                  <Input
                    type="number"
                    min={1}
                    value={newPkgDurationVal}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value));
                      setNewPkgDurationVal(v);
                      const d = calcDays(v, newPkgDurationUnit);
                      setNewPkgTotalDays(d);
                      setNewPkgValidity(d);
                    }}
                    className="text-sm"
                  />
                </div>
                {/* Duration Unit */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Duration Unit *</label>
                  <select
                    value={newPkgDurationUnit}
                    onChange={(e) => {
                      const u = e.target.value;
                      setNewPkgDurationUnit(u);
                      const d = calcDays(newPkgDurationVal, u);
                      setNewPkgTotalDays(d);
                      setNewPkgValidity(d);
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                </div>
                {/* Total Days */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    Total Days
                    <span className="text-[9px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">auto</span>
                  </label>
                  <Input
                    type="number"
                    readOnly
                    value={newPkgTotalDays}
                    className="text-sm bg-muted/50 cursor-not-allowed text-muted-foreground"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pricing */}
            <div className="pt-3 border-t border-border space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Commercial Pricing</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Sale Price (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 24285"
                    value={newPkgSalePrice}
                    onChange={(e) => setNewPkgSalePrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Display / MRP Price (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 29999"
                    value={newPkgDisplayPrice}
                    onChange={(e) => setNewPkgDisplayPrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Tax Percentage (%)</label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="18"
                    value={newPkgTaxPercentage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPkgTaxPercentage(val ? String(Math.round(Number(val))) : '');
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 sm:pt-5">
                  <input
                    type="checkbox"
                    id="new_pkg_tax_inc"
                    checked={newPkgTaxIncluded}
                    onChange={(e) => setNewPkgTaxIncluded(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="new_pkg_tax_inc" className="text-xs text-foreground cursor-pointer select-none">
                    Prices include tax
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Sessions & Passport Entitlements */}
            <div className="pt-3 border-t border-border space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Sessions &amp; Entitlements</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between h-5 mb-1.5">
                    <label className="text-xs font-medium text-foreground">Home Sessions</label>
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newPkgHomeUnlimited}
                        onChange={(e) => {
                          setNewPkgHomeUnlimited(e.target.checked);
                          if (e.target.checked) setNewPkgMaxSessions('');
                        }}
                        className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    placeholder={newPkgHomeUnlimited ? 'Unlimited' : 'e.g. 72'}
                    disabled={newPkgHomeUnlimited}
                    value={newPkgMaxSessions}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewPkgMaxSessions(v ? String(Math.round(Number(v))) : '');
                    }}
                    className="text-sm h-9 disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground block">Home Branch</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between h-5 mb-1.5">
                    <label className="text-xs font-medium text-foreground">Cross-Branch Sessions</label>
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newPkgCrossUnlimited}
                        onChange={(e) => {
                          setNewPkgCrossUnlimited(e.target.checked);
                          if (e.target.checked) setNewPkgPassportSessions('');
                        }}
                        className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    placeholder={newPkgCrossUnlimited ? 'Unlimited' : 'e.g. 10'}
                    disabled={newPkgCrossUnlimited}
                    value={newPkgPassportSessions}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewPkgPassportSessions(v ? String(Math.round(Number(v))) : '');
                    }}
                    className="text-sm h-9 disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground block">Cross-Branch</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between h-5 mb-1.5">
                    <label className="text-xs font-medium text-foreground">Passport Cost (₹)</label>
                    <span className="text-[10px] text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={newPkgPassportCost}
                    onChange={(e) => setNewPkgPassportCost(e.target.value)}
                    className="text-sm h-9"
                  />
                  <span className="text-[10px] text-muted-foreground block">Extra per session</span>
                </div>
              </div>
            </div>

            {/* Section 5: Channels & Publishing */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newPkgShowWeb}
                    onChange={(e) => setNewPkgShowWeb(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  Show on Web
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newPkgShowApp}
                    onChange={(e) => setNewPkgShowApp(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  Show on App
                </label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="new_pkg_publish_now"
                  checked={newPkgPublishNow}
                  onChange={(e) => setNewPkgPublishNow(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="new_pkg_publish_now" className="text-xs font-semibold text-primary cursor-pointer select-none">
                  Publish immediately (Activate Version 1)
                </label>
              </div>
              {newPkgPublishNow && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    <strong>Immediate Publication:</strong> Version 1 will be activated upon creation and become live for all sales.
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewPackageOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !newPkgName.trim() ||
                !newPkgProgram ||
                newPkgTotalDays <= 0 ||
                createPackageMutation.isPending
              }
              onClick={() => {
                setPkgFormError(null);
                createPackageMutation.mutate();
              }}
            >
              {createPackageMutation.isPending
                ? 'Creating...'
                : newPkgPublishNow
                ? 'Create & Publish Package'
                : 'Create Draft Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PACKAGE (NO CODE FIELD) */}
      {/* ========================================================================= */}
      {editingPackage && (
        <Dialog open={Boolean(editingPackage)} onOpenChange={(open) => !open && setEditingPackage(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update package identity and branch availability. Commercial terms are managed via Package Versions.
              </p>
            </DialogHeader>
            <div className="space-y-4 text-sm pt-2">
              {pkgFormError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {pkgFormError}
                </div>
              )}

              {/* Section 1: Identity */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Program *</label>
                  <select
                    value={editPkgProgram}
                    onChange={(e) => setEditPkgProgram(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Program (Required)</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Package Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Gold Annual Membership"
                      value={editPkgName}
                      onChange={(e) => setEditPkgName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                    <select
                      value={editPkgStatus}
                      onChange={(e) => setEditPkgStatus(e.target.value as any)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
                {editingPackage.code && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50">
                    <span className="font-semibold text-foreground">System Code:</span>
                    <code className="font-mono text-primary font-bold">{editingPackage.code}</code>
                    <span className="text-[10px] text-muted-foreground ml-auto">(backend-managed · read only)</span>
                  </div>
                )}
              </div>

              {/* Branch Availability Section */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Available Branches
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Select which branches offer this package
                  </span>
                </div>
                {!editPkgProgram ? (
                  <p className="text-xs text-muted-foreground italic">Select a program first to configure branch availability.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {branches.map((b) => {
                      const prog = programs.find((p) => p.id === editPkgProgram);
                      const progBranchIds = prog?.available_branch_ids || [];
                      const isProgramAvailable = progBranchIds.includes(b.id);
                      const isChecked = editPkgBranchIds.includes(b.id);

                      return (
                        <div
                          key={b.id}
                          className={`p-2 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                            !isProgramAvailable
                              ? 'opacity-50 bg-muted/20 border-border/40 cursor-not-allowed'
                              : isChecked
                              ? 'bg-primary/5 border-primary/40'
                              : 'bg-card border-border/60 hover:border-border'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`edit_pkg_branch_${b.id}`}
                            disabled={!isProgramAvailable}
                            checked={isChecked && isProgramAvailable}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditPkgBranchIds([...editPkgBranchIds, b.id]);
                              } else {
                                setEditPkgBranchIds(editPkgBranchIds.filter((id) => id !== b.id));
                              }
                            }}
                            className="mt-0.5 rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`edit_pkg_branch_${b.id}`}
                              className={`font-medium block leading-snug ${
                                isProgramAvailable ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground'
                              }`}
                            >
                              {b.name}
                            </label>
                            {!isProgramAvailable && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                This Program is not available at this Branch.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Informational Guidance on Version Terms */}
              <div className="pt-3 border-t border-border">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Package Identity Settings Only</span>
                    <span>
                      Duration, validity, pricing, and session allocations are version-controlled and immutable on published packages.
                      To modify commercial terms, close this dialog and click <strong className="text-foreground">New Version</strong> or manage versions from <strong className="text-foreground">Versions</strong>.
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPackage(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !editPkgName.trim() ||
                  !editPkgProgram ||
                  updatePackageMutation.isPending
                }
                onClick={() => {
                  setPkgFormError(null);
                  updatePackageMutation.mutate();
                }}
              >
                {updatePackageMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PACKAGE VERSION */}
      {/* ========================================================================= */}
      {selectedPackage && (
        <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create New Package Version</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: <span className="font-semibold text-primary">{selectedPackage.name}</span>
              </p>
            </DialogHeader>
            <div className="space-y-4 text-sm pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Version Name Snapshot</label>
                <Input
                  type="text"
                  placeholder={selectedPackage.name}
                  value={newVerName}
                  onChange={(e) => setNewVerName(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Version Duration - Harmonized 3-column row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Duration Value */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Duration Value *</label>
                  <Input
                    type="number"
                    min={1}
                    value={newVerDurationVal}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value));
                      setNewVerDurationVal(v);
                      const d = calcDays(v, newVerDurationUnit);
                      setNewVerTotalDays(d);
                      setNewVerValidity(d);
                    }}
                    className="text-sm"
                  />
                </div>
                {/* Duration Unit */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Duration Unit *</label>
                  <select
                    value={newVerDurationUnit}
                    onChange={(e) => {
                      const u = e.target.value;
                      setNewVerDurationUnit(u);
                      const d = calcDays(newVerDurationVal, u);
                      setNewVerTotalDays(d);
                      setNewVerValidity(d);
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                </div>
                {/* Total Days */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    Total Days
                    <span className="text-[9px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">auto</span>
                  </label>
                  <Input
                    type="number"
                    readOnly
                    value={newVerTotalDays}
                    className="text-sm bg-muted/50 cursor-not-allowed text-muted-foreground"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Commercial Pricing Section */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">Pricing</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Sale Price (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 24285"
                      value={newVerSalePrice}
                      onChange={(e) => setNewVerSalePrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Display / MRP Price (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 29999"
                      value={newVerDisplayPrice}
                      onChange={(e) => setNewVerDisplayPrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Tax Percentage (%)</label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="18"
                      value={newVerTaxPercentage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewVerTaxPercentage(val ? String(Math.round(Number(val))) : '');
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 sm:pt-5">
                    <input
                      type="checkbox"
                      id="price_inc_tax"
                      checked={newVerTaxIncluded}
                      onChange={(e) => setNewVerTaxIncluded(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="price_inc_tax" className="text-xs text-foreground cursor-pointer select-none">
                      Prices include tax
                    </label>
                  </div>
                </div>
              </div>

              {/* Sessions & Entitlements Section */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">Sessions &amp; Entitlements</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-xs font-medium text-foreground">Home Sessions</label>
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newVerHomeUnlimited}
                          onChange={(e) => {
                            setNewVerHomeUnlimited(e.target.checked);
                            if (e.target.checked) setNewVerMaxSessions('');
                          }}
                          className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        Unlimited
                      </label>
                    </div>
                    <Input
                      type="number"
                      placeholder={newVerHomeUnlimited ? 'Unlimited' : 'e.g. 72'}
                      disabled={newVerHomeUnlimited}
                      value={newVerMaxSessions}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewVerMaxSessions(v ? String(Math.round(Number(v))) : '');
                      }}
                      className="text-sm h-9 disabled:bg-muted/50 disabled:text-muted-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground block">Home Branch</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-xs font-medium text-foreground">Cross-Branch Sessions</label>
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newVerCrossUnlimited}
                          onChange={(e) => {
                            setNewVerCrossUnlimited(e.target.checked);
                            if (e.target.checked) setNewVerPassportSessions('');
                          }}
                          className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        Unlimited
                      </label>
                    </div>
                    <Input
                      type="number"
                      placeholder={newVerCrossUnlimited ? 'Unlimited' : 'e.g. 10'}
                      disabled={newVerCrossUnlimited}
                      value={newVerPassportSessions}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewVerPassportSessions(v ? String(Math.round(Number(v))) : '');
                      }}
                      className="text-sm h-9 disabled:bg-muted/50 disabled:text-muted-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground block">Cross-Branch</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-xs font-medium text-foreground">Passport Cost (₹)</label>
                      <span className="text-[10px] text-muted-foreground">Optional</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={newVerPassportCost}
                      onChange={(e) => setNewVerPassportCost(e.target.value)}
                      className="text-sm h-9"
                    />
                    <span className="text-[10px] text-muted-foreground block">Extra per session</span>
                  </div>
                </div>
              </div>

              {/* Channels & Publish */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newVerShowWeb}
                      onChange={(e) => setNewVerShowWeb(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    Show on Web
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newVerShowApp}
                      onChange={(e) => setNewVerShowApp(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    Show on App
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="publish_now"
                    checked={newVerPublishNow}
                    onChange={(e) => setNewVerPublishNow(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="publish_now" className="text-xs font-semibold text-primary cursor-pointer select-none">
                    Publish immediately (Activate Version)
                  </label>
                </div>
                {newVerPublishNow && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                    <span>
                      <strong>Immediate Publication:</strong> Activating this version will automatically retire any currently active version of this package upon creation.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewVersionOpen(false);
                  setSelectedPackage(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={createVersionMutation.isPending || newVerTotalDays <= 0}
                onClick={() =>
                  createVersionMutation.mutate({
                    pkgId: selectedPackage.id,
                    payload: {
                      name_snapshot: newVerName || selectedPackage.name,
                      duration_value: newVerDurationVal,
                      duration_unit: newVerDurationUnit,
                      total_days: newVerTotalDays,
                      validity_days: newVerTotalDays,
                      show_on_web: newVerShowWeb,
                      show_on_app: newVerShowApp,
                      sale_price: newVerSalePrice ? Number(newVerSalePrice) : undefined,
                      display_price: newVerDisplayPrice ? Number(newVerDisplayPrice) : undefined,
                      tax_percentage: newVerTaxPercentage ? Math.round(Number(newVerTaxPercentage)) : 18,
                      prices_include_tax: newVerTaxIncluded,
                      is_unlimited_home: newVerHomeUnlimited,
                      max_sessions: newVerHomeUnlimited ? undefined : (newVerMaxSessions ? Number(newVerMaxSessions) : undefined),
                      is_unlimited_cross: newVerCrossUnlimited,
                      passport_sessions: newVerCrossUnlimited ? undefined : (newVerPassportSessions ? Number(newVerPassportSessions) : undefined),
                      passport_cost: newVerPassportCost ? Number(newVerPassportCost) : undefined,
                      publish_immediately: newVerPublishNow,
                      status: newVerPublishNow ? 'ACTIVE' : 'DRAFT',
                    },
                  })
                }
              >
                {createVersionMutation.isPending
                  ? 'Saving...'
                  : newVerPublishNow
                  ? 'Create & Publish Version'
                  : 'Create Draft Version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW LEGAL POLICY (NO CODE FIELD) */}
      {/* ========================================================================= */}
      <Dialog open={isNewTermsDocOpen} onOpenChange={setIsNewTermsDocOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Legal Policy Document</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Documents can hold versioned legal texts that members accept during onboarding or purchase.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {termsDocFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {termsDocFormError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
              <Input
                type="text"
                placeholder="e.g. Membership Terms"
                value={newTermsName}
                onChange={(e) => setNewTermsName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Policy Type *</label>
              <select
                value={newTermsType}
                onChange={(e) => setNewTermsType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="MEMBERSHIP_TERMS">Membership Terms</option>
                <option value="ATTENDANCE_COMMITMENT_POLICY">Attendance Commitment Policy</option>
                <option value="CANCELLATION_POLICY">Cancellation Policy</option>
                <option value="PRIVACY_NOTICE">Privacy Notice</option>
                <option value="REWARD_POLICY">Reward Policy</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsNewTermsDocOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newTermsName.trim() || createTermsDocMutation.isPending}
              onClick={() => {
                setTermsDocFormError(null);
                createTermsDocMutation.mutate();
              }}
            >
              {createTermsDocMutation.isPending ? 'Creating...' : 'Create & Add Version 1 →'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NEW TERMS VERSION */}
      {/* ========================================================================= */}
      <Dialog open={isNewTermsVersionOpen} onOpenChange={setIsNewTermsVersionOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Draft Version</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target: <span className="font-semibold text-primary">{selectedTermsDoc?.name}</span>
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {termsVerFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {termsVerFormError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Effective From *</label>
              <input
                type="datetime-local"
                value={newVerEffectiveFrom}
                onChange={(e) => setNewVerEffectiveFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-[10px] text-muted-foreground">When this version will become effective once published</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Policy Content</label>
              <textarea
                placeholder="Paste the full legal text here (optional — can be added later)..."
                value={newVerContent}
                onChange={(e) => setNewVerContent(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono"
              />
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Version is created in <strong>Draft</strong> state. You must explicitly publish it to make it live and member-facing.</span>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsNewTermsVersionOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newVerEffectiveFrom || createTermsVersionMutation.isPending}
              onClick={() => {
                setTermsVerFormError(null);
                createTermsVersionMutation.mutate();
              }}
            >
              {createTermsVersionMutation.isPending ? 'Saving...' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PUBLISH TERMS VERSION CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500 shrink-0" />
              Publish Version v{publishTarget?.versionNum}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm py-2">
            {publishError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {publishError}
              </div>
            )}
            <p className="text-muted-foreground">
              Publishing makes this version <strong>live and member-facing</strong>.
              Any existing active version will be <span className="text-amber-600 dark:text-amber-400 font-medium">retired</span> automatically.
            </p>
            <p className="text-xs text-muted-foreground">
              Published versions are <strong>immutable</strong> — you cannot edit content after publishing.
            </p>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsPublishConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={publishTermsVersionMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setPublishError(null);
                publishTermsVersionMutation.mutate();
              }}
            >
              {publishTermsVersionMutation.isPending ? 'Publishing...' : 'Confirm Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ========================================================================= */}
      {/* MODAL: PUBLISH PACKAGE VERSION CONFIRMATION */}
      {/* ========================================================================= */}
      {versionToPublish && (
        <Dialog open={Boolean(versionToPublish)} onOpenChange={(open) => !open && setVersionToPublish(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500 shrink-0" />
                Publish Version v{versionToPublish.versionNum}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Publishing makes <strong>Version v{versionToPublish.versionNum}</strong> live and active for all new purchases of <strong>{versionToPublish.pkgName}</strong>.
              </p>
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                Any currently active version of this package will be <strong className="font-semibold">automatically retired</strong>.
              </div>
              <p className="text-xs text-muted-foreground">
                Published versions are <strong className="text-foreground">immutable</strong> — commercial terms cannot be edited once published.
              </p>
            </div>
            <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVersionToPublish(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={publishVersionDirectMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  publishVersionDirectMutation.mutate({
                    pkgId: versionToPublish.pkgId,
                    verId: versionToPublish.verId,
                  });
                }}
              >
                {publishVersionDirectMutation.isPending ? 'Publishing...' : 'Confirm & Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RETIRE PACKAGE VERSION CONFIRMATION */}
      {/* ========================================================================= */}
      {versionToRetire && (
        <Dialog open={Boolean(versionToRetire)} onOpenChange={(open) => !open && setVersionToRetire(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Retire Version v{versionToRetire.versionNum}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Are you sure you want to retire <strong>Version v{versionToRetire.versionNum}</strong> of <strong>{versionToRetire.pkgName}</strong>?
              </p>
              <div className="p-2.5 bg-muted/50 border border-border/60 rounded-lg text-xs text-muted-foreground">
                This package will have no active version for new purchases until a new version is published. Existing member subscriptions remain completely unaffected.
              </div>
            </div>
            <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVersionToRetire(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={retireVersionDirectMutation.isPending}
                className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                onClick={() => {
                  retireVersionDirectMutation.mutate({
                    pkgId: versionToRetire.pkgId,
                    verId: versionToRetire.verId,
                  });
                }}
              >
                {retireVersionDirectMutation.isPending ? 'Retiring...' : 'Confirm Retire'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISCARD DRAFT VERSION CONFIRMATION */}
      {/* ========================================================================= */}
      {draftToDiscard && (
        <Dialog open={Boolean(draftToDiscard)} onOpenChange={(open) => !open && setDraftToDiscard(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                Discard Draft Version v{draftToDiscard.versionNum}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Are you sure you want to discard this draft version of <strong>{draftToDiscard.pkgName}</strong>?
              </p>
              <p className="text-xs text-destructive font-medium">
                This action is permanent and cannot be undone.
              </p>
            </div>
            <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraftToDiscard(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteDraftVersionMutation.isPending}
                onClick={() => {
                  deleteDraftVersionMutation.mutate(draftToDiscard.verId);
                }}
              >
                {deleteDraftVersionMutation.isPending ? 'Discarding...' : 'Discard Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

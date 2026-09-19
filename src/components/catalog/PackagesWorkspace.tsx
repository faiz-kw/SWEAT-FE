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
} from 'lucide-react';
import { catalogApi } from '@/services/catalogApi';
import type { Package, PackageVersion, Program, TermsDocument, ProgramTypeItem } from '@/types/catalog';
import { useAuth } from '@/contexts';
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
  if (!error) return 'An unexpected error occurred.';
  const status = error.status || error?.response?.status;
  if (status === 401) {
    return '401 Unauthorized: Your session has expired or authentication token is missing. Please log in again.';
  }
  if (status === 403) {
    return '403 Forbidden: Your tenant role lacks permission to manage catalog resources (requires core.settings permission).';
  }
  if (status === 404) {
    return '404 Not Found: The requested catalog endpoint or resource could not be found.';
  }
  if (status === 400) {
    const data = error.data || error?.response?.data;
    if (typeof data === 'object' && data !== null) {
      const messages = Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' | ');
      return `400 Bad Request: ${messages}`;
    }
    return error.message || '400 Bad Request: Invalid input data.';
  }
  if (status >= 500) {
    return '500 Server Error: The tenant database encountered an unexpected server error.';
  }
  return error.message || 'Failed to communicate with tenant catalog service.';
}

const formatCurrency = (amount: any, currency: string = 'INR') => {
  if (amount === undefined || amount === null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return `${currency} ${amount}`;
  const sym = currency === 'INR' || currency === '₹' ? '₹' : currency === 'USD' || currency === '$' ? '$' : `${currency} `;
  return `${sym}${num.toLocaleString('en-IN')}`;
};

export const PackagesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

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

  // Top tabs: Program Types | Programs | Legal Policies (Packages is nested inside Programs)
  const [activeTab, setActiveTab] = useState<'program-types' | 'programs' | 'terms'>('programs');
  
  // Search state
  const [progSearchQuery, setProgSearchQuery] = useState('');
  const [ptSearchQuery, setPtSearchQuery] = useState('');
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
  const [isNewProgramTypeOpen, setIsNewProgramTypeOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Edit Modals
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgStatus, setEditPkgStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [editPkgProgram, setEditPkgProgram] = useState('');
  const [editPkgDurationVal, setEditPkgDurationVal] = useState(6);
  const [editPkgDurationUnit, setEditPkgDurationUnit] = useState('MONTH');
  const [editPkgTotalDays, setEditPkgTotalDays] = useState(180);
  const [editPkgValidity, setEditPkgValidity] = useState(180);
  const [editPkgSalePrice, setEditPkgSalePrice] = useState('');
  const [editPkgDisplayPrice, setEditPkgDisplayPrice] = useState('');
  const [editPkgTaxPercentage, setEditPkgTaxPercentage] = useState('18');
  const [editPkgTaxIncluded, setEditPkgTaxIncluded] = useState(true);
  const [editPkgMaxSessions, setEditPkgMaxSessions] = useState('');
  const [editPkgPassportSessions, setEditPkgPassportSessions] = useState('');
  const [editPkgPassportCost, setEditPkgPassportCost] = useState('');
  const [editPkgShowWeb, setEditPkgShowWeb] = useState(true);
  const [editPkgShowApp, setEditPkgShowApp] = useState(true);
  const [editPkgPublishNow, setEditPkgPublishNow] = useState(true);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgName, setEditProgName] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');
  const [editProgType, setEditProgType] = useState('MEMBERSHIP');
  const [editProgTrial, setEditProgTrial] = useState(false);
  const [editProgStatus, setEditProgStatus] = useState<'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Program Type modal state (no Code field)
  const [newPtName, setNewPtName] = useState('');
  const [newPtDesc, setNewPtDesc] = useState('');
  const [newPtOrder, setNewPtOrder] = useState(0);
  const [ptFormError, setPtFormError] = useState<string | null>(null);

  const [editingProgramType, setEditingProgramType] = useState<ProgramTypeItem | null>(null);
  const [editPtName, setEditPtName] = useState('');
  const [editPtDesc, setEditPtDesc] = useState('');
  const [editPtOrder, setEditPtOrder] = useState(0);
  const [editPtStatus, setEditPtStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editPtFormError, setEditPtFormError] = useState<string | null>(null);

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
  const [newPkgPublishNow, setNewPkgPublishNow] = useState(true);

  // New Version Form state
  const [newVerName, setNewVerName] = useState('');
  const [newVerDurationVal, setNewVerDurationVal] = useState(6);
  const [newVerDurationUnit, setNewVerDurationUnit] = useState('MONTH');
  const [newVerValidity, setNewVerValidity] = useState(180);
  const [newVerTotalDays, setNewVerTotalDays] = useState(180);
  const [newVerShowWeb, setNewVerShowWeb] = useState(true);
  const [newVerShowApp, setNewVerShowApp] = useState(true);
  const [newVerMaxSessions, setNewVerMaxSessions] = useState('');
  const [newVerPassportSessions, setNewVerPassportSessions] = useState('');
  const [newVerPassportCost, setNewVerPassportCost] = useState('');
  const [newVerSalePrice, setNewVerSalePrice] = useState('');
  const [newVerDisplayPrice, setNewVerDisplayPrice] = useState('');
  const [newVerTaxPercentage, setNewVerTaxPercentage] = useState('18');
  const [newVerTaxIncluded, setNewVerTaxIncluded] = useState(true);
  const [newVerPublishNow, setNewVerPublishNow] = useState(false);

  // Program Form state (no Code field)
  const [newProgName, setNewProgName] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgType, setNewProgType] = useState('');
  const [newProgTrial, setNewProgTrial] = useState(false);

  // Queries
  const {
    data: programTypes = [],
    isLoading: isProgramTypesLoading,
    refetch: refetchProgramTypes,
  } = useQuery({
    queryKey: ['program-types'],
    queryFn: () => catalogApi.getProgramTypes(),
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
    queryFn: () => catalogApi.getPrograms(),
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
          max_sessions: newPkgMaxSessions ? Number(newPkgMaxSessions) : undefined,
          passport_sessions: newPkgPassportSessions ? Number(newPkgPassportSessions) : undefined,
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
      setNewPkgSalePrice('');
      setNewPkgDisplayPrice('');
      setNewPkgMaxSessions('');
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
      // 1. Update package identity metadata (preserve code automatically in backend)
      const updatedPkg = await catalogApi.updatePackage(editingPackage.id, {
        name: editPkgName.trim(),
        status: editPkgStatus,
        program: editPkgProgram,
      });

      // 2. Check if commercial version terms modified
      const activeVer = editingPackage.active_version || (editingPackage as any).latest_version;
      const firstPrice = activeVer?.prices?.[0];
      const homeSessionEnt = activeVer?.entitlements?.find(
        (e: any) => e.entitlement_type === 'HOME_BRANCH_SESSION'
      );
      const crossSessionEnt = activeVer?.entitlements?.find(
        (e: any) => e.entitlement_type === 'CROSS_BRANCH_SESSION'
      );

      const hasVersionChanges =
        !activeVer ||
        Number(activeVer.duration_value) !== Number(editPkgDurationVal) ||
        activeVer.duration_unit !== editPkgDurationUnit ||
        Number(activeVer.total_days) !== Number(editPkgTotalDays) ||
        Boolean(activeVer.show_on_web) !== Boolean(editPkgShowWeb) ||
        Boolean(activeVer.show_on_app) !== Boolean(editPkgShowApp) ||
        String(firstPrice?.sale_price ?? firstPrice?.base_price ?? '') !== String(editPkgSalePrice) ||
        String(firstPrice?.display_price ?? '') !== String(editPkgDisplayPrice) ||
        String(firstPrice?.tax_percent ?? firstPrice?.tax_percentage ?? '18') !== String(editPkgTaxPercentage) ||
        Boolean(firstPrice?.prices_include_tax ?? true) !== Boolean(editPkgTaxIncluded) ||
        String(homeSessionEnt?.allocated_units ?? '') !== String(editPkgMaxSessions) ||
        String(crossSessionEnt?.allocated_units ?? '') !== String(editPkgPassportSessions) ||
        String(crossSessionEnt?.extra_unit_price ?? '') !== String(editPkgPassportCost);

      if (hasVersionChanges && editPkgTotalDays > 0) {
        const nextVerNum = (activeVer?.version_number ?? 1) + 1;
        await catalogApi.createPackageVersion(editingPackage.id, {
          name_snapshot: `${editPkgName.trim()} v${nextVerNum}`,
          duration_value: editPkgDurationVal,
          duration_unit: editPkgDurationUnit,
          total_days: editPkgTotalDays,
          validity_days: editPkgValidity,
          show_on_web: editPkgShowWeb,
          show_on_app: editPkgShowApp,
          sale_price: editPkgSalePrice ? Number(editPkgSalePrice) : undefined,
          display_price: editPkgDisplayPrice ? Number(editPkgDisplayPrice) : undefined,
          tax_percentage: editPkgTaxPercentage ? Number(editPkgTaxPercentage) : undefined,
          prices_include_tax: editPkgTaxIncluded,
          max_sessions: editPkgMaxSessions ? Number(editPkgMaxSessions) : undefined,
          passport_sessions: editPkgPassportSessions ? Number(editPkgPassportSessions) : undefined,
          passport_cost: editPkgPassportCost ? Number(editPkgPassportCost) : undefined,
          publish_immediately: editPkgPublishNow,
          status: editPkgPublishNow ? 'ACTIVE' : 'DRAFT',
        });
      }

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
        program_type: newProgType || (programTypes[0]?.id ?? ''),
        trial_allowed: newProgTrial,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setIsNewProgramOpen(false);
      setNewProgName('');
      setNewProgDesc('');
      setNewProgType('');
      setNewProgTrial(false);
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
      setEditingProgram(null);
      setProgFormError(null);
      toast.success('Program updated successfully.');
    },
    onError: (err: any) => {
      setProgFormError(getErrorMessage(err));
    },
  });

  const createProgramTypeMutation = useMutation({
    mutationFn: () =>
      catalogApi.createProgramType({
        name: newPtName.trim(),
        description: newPtDesc.trim() || null,
        display_order: newPtOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-types'] });
      setIsNewProgramTypeOpen(false);
      setNewPtName('');
      setNewPtDesc('');
      setNewPtOrder(0);
      setPtFormError(null);
      toast.success('Program Type created successfully.');
    },
    onError: (err: any) => {
      setPtFormError(getErrorMessage(err));
    },
  });

  const updateProgramTypeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      catalogApi.updateProgramType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-types'] });
      setEditingProgramType(null);
      setEditPtFormError(null);
      toast.success('Program Type updated successfully.');
    },
    onError: (err: any) => {
      setEditPtFormError(getErrorMessage(err));
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

  // Resolve friendly label for Program Type
  const getProgramTypeLabel = (prog: Program) => {
    if (prog.program_type_name) return prog.program_type_name;
    const match = programTypes.find(
      (pt) => pt.id === prog.program_type || pt.code === prog.program_type
    );
    if (match) return match.name || match.code;
    if (typeof prog.program_type === 'string' && prog.program_type.length > 20 && prog.program_type.includes('-')) {
      return 'Program';
    }
    return prog.program_type || 'Program';
  };

  // Filtered program types (search by name or description)
  const filteredProgramTypes = programTypes.filter((pt) => {
    const q = ptSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      pt.name?.toLowerCase().includes(q) ||
      (pt.description && pt.description.toLowerCase().includes(q))
    );
  });

  // Filtered programs (search by name or type or package name)
  const filteredPrograms = programs.filter((prog) => {
    const q = progSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const ptLabel = getProgramTypeLabel(prog).toLowerCase();
    const progPackages = packagesByProgram.get(prog.id) || [];
    const matchesPackageName = progPackages.some((p) => p.name?.toLowerCase().includes(q));
    return (
      prog.name?.toLowerCase().includes(q) ||
      ptLabel.includes(q) ||
      (prog.description && prog.description.toLowerCase().includes(q)) ||
      matchesPackageName
    );
  });

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
    setPkgFormError(null);

    const activeVer = pkg.active_version || (pkg as any).latest_version;
    const durationVal = activeVer?.duration_value ?? 6;
    const durationUnit = activeVer?.duration_unit ?? 'MONTH';
    const totalDays = activeVer?.total_days ?? calcDays(durationVal, durationUnit);
    const validityDays = activeVer?.validity_days ?? totalDays;

    setEditPkgDurationVal(durationVal);
    setEditPkgDurationUnit(durationUnit);
    setEditPkgTotalDays(totalDays);
    setEditPkgValidity(validityDays);

    const firstPrice = activeVer?.prices?.[0];
    setEditPkgSalePrice(firstPrice ? String(firstPrice.sale_price ?? firstPrice.base_price ?? '') : '');
    setEditPkgDisplayPrice(firstPrice?.display_price ? String(firstPrice.display_price) : '');
    setEditPkgTaxPercentage(
      firstPrice?.tax_percent || firstPrice?.tax_percentage
        ? String(firstPrice.tax_percent || firstPrice.tax_percentage)
        : '18'
    );
    setEditPkgTaxIncluded(firstPrice?.prices_include_tax ?? true);

    const homeSessionEnt = activeVer?.entitlements?.find(
      (e: any) => e.entitlement_type === 'HOME_BRANCH_SESSION'
    );
    const crossSessionEnt = activeVer?.entitlements?.find(
      (e: any) => e.entitlement_type === 'CROSS_BRANCH_SESSION'
    );

    setEditPkgMaxSessions(homeSessionEnt?.allocated_units ? String(homeSessionEnt.allocated_units) : '');
    setEditPkgPassportSessions(crossSessionEnt?.allocated_units ? String(crossSessionEnt.allocated_units) : '');
    setEditPkgPassportCost(crossSessionEnt?.extra_unit_price ? String(crossSessionEnt.extra_unit_price) : '');

    setEditPkgShowWeb(activeVer?.show_on_web ?? true);
    setEditPkgShowApp(activeVer?.show_on_app ?? true);
    setEditPkgPublishNow(true);
  };

  const startEditProgram = (prog: Program) => {
    setEditingProgram(prog);
    setEditProgName(prog.name);
    setEditProgDesc(prog.description || '');
    setEditProgType(prog.program_type);
    setEditProgTrial(prog.trial_allowed);
    setEditProgStatus(prog.status);
    setProgFormError(null);
  };

  const startEditProgramType = (pt: ProgramTypeItem) => {
    setEditingProgramType(pt);
    setEditPtName(pt.name);
    setEditPtDesc(pt.description || '');
    setEditPtOrder(pt.display_order);
    setEditPtStatus(pt.status);
    setEditPtFormError(null);
  };

  const openAddPackageForProgram = (programId: string) => {
    if (!requirePermission('create Packages')) return;
    setNewPkgProgram(programId);
    setNewPkgName('');
    setNewPkgDurationVal(6);
    setNewPkgDurationUnit('MONTH');
    setNewPkgTotalDays(calcDays(6, 'MONTH'));
    setNewPkgValidity(calcDays(6, 'MONTH'));
    setNewPkgSalePrice('');
    setNewPkgDisplayPrice('');
    setNewPkgTaxPercentage('18');
    setNewPkgTaxIncluded(true);
    setNewPkgMaxSessions('');
    setNewPkgPassportSessions('');
    setNewPkgPassportCost('');
    setNewPkgShowWeb(true);
    setNewPkgShowApp(true);
    setNewPkgPublishNow(true);
    setPkgFormError(null);
    setIsNewPackageOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-6">
      <PageHeader
        title="Programs & Packages"
        description="Configure your program catalog, commercial package tiers, immutable pricing versions, and legal policies."
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activeTab === 'program-types' && hasCatalogPermission && (
              <Button
                onClick={() => {
                  setPtFormError(null);
                  setNewPtName('');
                  setNewPtDesc('');
                  setNewPtOrder(0);
                  setIsNewProgramTypeOpen(true);
                }}
                className="gap-2 shadow-xs"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Program Type</span>
              </Button>
            )}
            {activeTab === 'programs' && hasCatalogPermission && (
              <Button
                onClick={() => {
                  setProgFormError(null);
                  setNewProgName('');
                  setNewProgDesc('');
                  setNewProgType(programTypes[0]?.id ?? '');
                  setNewProgTrial(false);
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

      <PageBody>
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiTile
            title="Program Types"
            value={programTypes.length}
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
              onClick={() => setActiveTab('program-types')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'program-types'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>Program Types</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {programTypes.length}
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
        {/* TAB 0: PROGRAM TYPES */}
        {/* ========================================================================= */}
        {activeTab === 'program-types' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search program types by name or description..."
                  value={ptSearchQuery}
                  onChange={(e) => setPtSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Loading */}
            {isProgramTypesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/40 rounded-2xl border border-border/60 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isProgramTypesLoading && filteredProgramTypes.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <Settings2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {ptSearchQuery ? 'No matching program types' : 'No program types configured'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {ptSearchQuery
                    ? `No program type matched "${ptSearchQuery}". Try a different search term.`
                    : 'Program Types classify your programs (e.g. Membership, Personal Training, Pilates). Create the first one to get started.'}
                </p>
                {!ptSearchQuery && hasCatalogPermission && (
                  <Button
                    onClick={() => {
                      setPtFormError(null);
                      setNewPtName('');
                      setNewPtDesc('');
                      setNewPtOrder(0);
                      setIsNewProgramTypeOpen(true);
                    }}
                    size="sm"
                  >
                    Create Program Type
                  </Button>
                )}
              </div>
            )}

            {/* Cards grid */}
            {!isProgramTypesLoading && filteredProgramTypes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProgramTypes.map((pt) => (
                  <div
                    key={pt.id}
                    className={`p-4 sm:p-5 bg-card border rounded-2xl space-y-3 shadow-xs transition flex flex-col justify-between ${
                      pt.status === 'INACTIVE'
                        ? 'border-border/40 opacity-60'
                        : 'border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <h4 className="text-base font-semibold text-foreground truncate" title={pt.name}>
                          {pt.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                          <Badge
                            variant={pt.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {pt.status}
                          </Badge>
                          {hasCatalogPermission && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => startEditProgramType(pt)}
                                title="Edit program type"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`w-7 h-7 shrink-0 ${
                                  pt.status === 'ACTIVE'
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-emerald-500 hover:text-emerald-600'
                                }`}
                                onClick={() => {
                                  updateProgramTypeMutation.mutate({
                                    id: pt.id,
                                    payload: { status: pt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                                  });
                                }}
                                title={pt.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              >
                                {pt.status === 'ACTIVE' ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {pt.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words" title={pt.description}>
                          {pt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 flex-wrap gap-1">
                      <span>Display order: {pt.display_order}</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Updated {new Date(pt.updated_at).toLocaleDateString()}
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
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search programs by name or type..."
                  value={progSearchQuery}
                  onChange={(e) => setProgSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
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
                  {progSearchQuery ? 'No matching programs found' : 'No programs registered'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {progSearchQuery
                    ? `No program matched "${progSearchQuery}". Try a different search term.`
                    : 'Programs group packages and classes (e.g. Strength, Pilates, Personal Training). Create your first Program to begin adding packages.'}
                </p>
                {!progSearchQuery && hasCatalogPermission && (
                  <Button
                    onClick={() => {
                      setProgFormError(null);
                      setNewProgName('');
                      setNewProgDesc('');
                      setNewProgType(programTypes[0]?.id ?? '');
                      setNewProgTrial(false);
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
                  const typeLabel = getProgramTypeLabel(prog);
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
                      {/* Program Header Row */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-foreground truncate" title={prog.name}>
                              {prog.name}
                            </h3>
                            <Badge variant="outline" className="text-xs font-medium max-w-[160px] truncate" title={typeLabel}>
                              {typeLabel}
                            </Badge>
                            <Badge
                              variant={prog.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {prog.status}
                            </Badge>
                            {prog.trial_allowed && (
                              <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                                Trials Allowed
                              </Badge>
                            )}
                          </div>
                          {prog.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 break-words">
                              {prog.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <PackageIcon className="w-3.5 h-3.5 text-primary" />
                              {progPkgs.length} {progPkgs.length === 1 ? 'Package' : 'Packages'}
                            </span>
                          </div>
                        </div>

                        {/* Program Actions */}
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          {hasCatalogPermission && (
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
                                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  updateProgramMutation.mutate({
                                    id: prog.id,
                                    payload: { status: prog.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                                  });
                                }}
                                className={`text-xs h-8 gap-1 ${
                                  prog.status === 'ACTIVE'
                                    ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                                }`}
                              >
                                {prog.status === 'ACTIVE' ? (
                                  <>
                                    <ToggleRight className="w-4 h-4" />
                                    <span className="hidden sm:inline">Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Activate</span>
                                  </>
                                )}
                              </Button>
                            </>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleProgramExpanded(prog.id)}
                            className="text-xs h-8 gap-1 px-3"
                          >
                            <span>{isExpanded ? 'Hide Packages' : 'View Packages'}</span>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {progPkgs.map((pkg) => {
                                const activeVer = pkg.active_version || (pkg as any).latest_version;
                                const firstPrice = activeVer?.prices?.[0];
                                const homeEnt = activeVer?.entitlements?.find(
                                  (e: any) => e.entitlement_type === 'HOME_BRANCH_SESSION'
                                );

                                return (
                                  <div
                                    key={pkg.id}
                                    className="bg-card border border-border/70 hover:border-primary/40 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs transition"
                                  >
                                    <div className="space-y-2.5">
                                      {/* Package Header */}
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <h4 className="text-sm font-semibold text-foreground truncate" title={pkg.name}>
                                            {pkg.name}
                                          </h4>
                                        </div>
                                        <Badge
                                          variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'}
                                          className="text-[10px] shrink-0"
                                        >
                                          {pkg.status}
                                        </Badge>
                                      </div>

                                      {/* Active Version & Commercial Details */}
                                      {activeVer ? (
                                        <div className="p-2.5 bg-muted/40 rounded-lg border border-border/40 space-y-1.5 text-xs">
                                          <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                              v{activeVer.version_number} Current
                                            </span>
                                            <span className="font-mono text-[11px]">
                                              {activeVer.duration_value} {activeVer.duration_unit?.toLowerCase()}(s)
                                            </span>
                                          </div>
                                          {firstPrice && (
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(firstPrice.total_price || firstPrice.sale_price, firstPrice.currency || 'INR')}
                                              </span>
                                              {homeEnt?.allocated_units && (
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                  {homeEnt.allocated_units} sessions
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5 shrink-0" />
                                          <span>Draft state (no active version)</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Package Actions Bar */}
                                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setHistoryPackage(pkg)}
                                          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                                          title="View immutable version history"
                                        >
                                          <History className="w-3 h-3" />
                                          <span>Versions</span>
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setAuditPackage(pkg)}
                                          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                                          title="View audit logs"
                                        >
                                          <Activity className="w-3 h-3" />
                                          <span>Audit</span>
                                        </Button>
                                      </div>

                                      {hasCatalogPermission && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedPackage(pkg);
                                              setNewVerName(`${pkg.name} v${(activeVer?.version_number ?? 0) + 1}`);
                                              setNewVerDurationVal(activeVer?.duration_value ?? 6);
                                              setNewVerDurationUnit(activeVer?.duration_unit ?? 'MONTH');
                                              setNewVerTotalDays(activeVer?.total_days ?? 180);
                                              setNewVerValidity(activeVer?.validity_days ?? 180);
                                              setNewVerSalePrice(firstPrice?.sale_price ? String(firstPrice.sale_price) : '');
                                              setNewVerDisplayPrice(firstPrice?.display_price ? String(firstPrice.display_price) : '');
                                              setNewVerTaxPercentage(firstPrice?.tax_percent ? String(firstPrice.tax_percent) : '18');
                                              setNewVerTaxIncluded(firstPrice?.prices_include_tax ?? true);
                                              setNewVerMaxSessions(homeEnt?.allocated_units ? String(homeEnt.allocated_units) : '');
                                              setNewVerShowWeb(activeVer?.show_on_web ?? true);
                                              setNewVerShowApp(activeVer?.show_on_app ?? true);
                                              setNewVerPublishNow(false);
                                              setIsNewVersionOpen(true);
                                            }}
                                            className="h-6 text-[11px] px-2 text-primary hover:text-primary/80 gap-1 font-medium"
                                            title="Create new version snapshot"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>New Version</span>
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => startEditPackage(pkg)}
                                            className="w-6 h-6 text-muted-foreground hover:text-foreground"
                                            title="Edit package"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              togglePackageStatusMutation.mutate({
                                                id: pkg.id,
                                                newStatus: pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                              });
                                            }}
                                            className={`w-6 h-6 ${
                                              pkg.status === 'ACTIVE'
                                                ? 'text-amber-500 hover:text-amber-600'
                                                : 'text-emerald-500 hover:text-emerald-600'
                                            }`}
                                            title={pkg.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                          >
                                            {pkg.status === 'ACTIVE' ? (
                                              <ToggleRight className="w-3.5 h-3.5" />
                                            ) : (
                                              <ToggleLeft className="w-3.5 h-3.5" />
                                            )}
                                          </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              <Badge
                                variant={isCurrent ? 'default' : 'secondary'}
                                className={`text-[10px] shrink-0 ${
                                  isCurrent
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : ''
                                }`}
                              >
                                {isCurrent ? 'CURRENT' : 'RETIRED'}
                              </Badge>
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
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Tax ({price.tax_percent || price.tax_percentage || 0}%)</p>
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
      {/* MODAL: NEW PROGRAM TYPE (NO CODE FIELD) */}
      {/* ========================================================================= */}
      <Dialog open={isNewProgramTypeOpen} onOpenChange={setIsNewProgramTypeOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Program Type</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Program Types classify your Programs (e.g. Membership, Personal Training, Pilates).
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {ptFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {ptFormError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
              <Input
                type="text"
                placeholder="e.g. Membership"
                value={newPtName}
                onChange={(e) => setNewPtName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                type="text"
                placeholder="Optional description..."
                value={newPtDesc}
                onChange={(e) => setNewPtDesc(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
              <Input
                type="number"
                min={0}
                value={newPtOrder}
                onChange={(e) => setNewPtOrder(Number(e.target.value))}
                className="text-sm"
              />
              <span className="text-[10px] text-muted-foreground">Lower number = shown first in dropdowns</span>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsNewProgramTypeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newPtName.trim() || createProgramTypeMutation.isPending}
              onClick={() => {
                setPtFormError(null);
                createProgramTypeMutation.mutate();
              }}
            >
              {createProgramTypeMutation.isPending ? 'Creating...' : 'Create Program Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROGRAM TYPE (NO CODE FIELD) */}
      {/* ========================================================================= */}
      {editingProgramType && (
        <Dialog open={Boolean(editingProgramType)} onOpenChange={(open) => !open && setEditingProgramType(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Program Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm pt-2">
              {editPtFormError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                  {editPtFormError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
                  <Input
                    type="text"
                    value={editPtName}
                    onChange={(e) => setEditPtName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <select
                    value={editPtStatus}
                    onChange={(e) => setEditPtStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <Input
                  type="text"
                  value={editPtDesc}
                  onChange={(e) => setEditPtDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Display Order</label>
                <Input
                  type="number"
                  min={0}
                  value={editPtOrder}
                  onChange={(e) => setEditPtOrder(Number(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingProgramType(null)}>
                Cancel
              </Button>
              <Button
                disabled={!editPtName.trim() || updateProgramTypeMutation.isPending}
                onClick={() => {
                  setEditPtFormError(null);
                  updateProgramTypeMutation.mutate({
                    id: editingProgramType.id,
                    payload: {
                      name: editPtName.trim(),
                      description: editPtDesc.trim() || null,
                      display_order: editPtOrder,
                      status: editPtStatus,
                    },
                  });
                }}
              >
                {updateProgramTypeMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PROGRAM (NO CODE FIELD) */}
      {/* ========================================================================= */}
      <Dialog open={isNewProgramOpen} onOpenChange={setIsNewProgramOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Program Type *</label>
              <select
                value={newProgType || (programTypes[0]?.id ?? '')}
                onChange={(e) => setNewProgType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {programTypes.length === 0 ? (
                  <option value="">Loading / No program types configured</option>
                ) : (
                  programTypes.map((pt) => (
                    <option key={pt.id} value={pt.id} disabled={pt.status === 'INACTIVE'}>
                      {pt.name}{pt.status === 'INACTIVE' ? ' — Inactive' : ''}
                    </option>
                  ))
                )}
              </select>
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
            <div className="flex items-center gap-2 pt-1">
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
      {/* MODAL: EDIT PROGRAM (NO CODE FIELD) */}
      {/* ========================================================================= */}
      {editingProgram && (
        <Dialog open={Boolean(editingProgram)} onOpenChange={(open) => !open && setEditingProgram(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Program Type *</label>
                <select
                  value={editProgType}
                  onChange={(e) => setEditProgType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {programTypes.length === 0 ? (
                    <option value="">Loading / No program types configured</option>
                  ) : (
                    programTypes.map((pt) => (
                      <option key={pt.id} value={pt.id} disabled={pt.status === 'INACTIVE'}>
                        {pt.name}{pt.status === 'INACTIVE' ? ' — Inactive' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="trial_allowed"
                  checked={editProgTrial}
                  onChange={(e) => setEditProgTrial(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="trial_allowed" className="text-xs text-foreground cursor-pointer select-none">
                  Allow trial bookings for this program
                </label>
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
                      program_type: editProgType,
                      trial_allowed: editProgTrial,
                      status: editProgStatus,
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
                {programs.length === 0 ? (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-lg space-y-1.5">
                    <p>No programs exist yet. Packages must belong to a Program.</p>
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
                    {programs.map((p) => (
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
                    placeholder="18"
                    value={newPkgTaxPercentage}
                    onChange={(e) => setNewPkgTaxPercentage(e.target.value)}
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
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Sessions & Passport Entitlements</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Max Sessions</label>
                  <Input
                    type="number"
                    placeholder="e.g. 72"
                    value={newPkgMaxSessions}
                    onChange={(e) => setNewPkgMaxSessions(e.target.value)}
                    className="text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">Home Branch</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Passport Sessions</label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={newPkgPassportSessions}
                    onChange={(e) => setNewPkgPassportSessions(e.target.value)}
                    className="text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">Cross-Branch</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Passport Cost (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={newPkgPassportCost}
                    onChange={(e) => setNewPkgPassportCost(e.target.value)}
                    className="text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground">Extra per session</span>
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
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update package commercial identity, active version terms, pricing, and session allocations.
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
              </div>

              {/* Section 2: Duration */}
              <div className="pt-3 border-t border-border space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Active Version & Duration
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Duration Value */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Duration Value *</label>
                    <Input
                      type="number"
                      min="1"
                      value={editPkgDurationVal}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value));
                        setEditPkgDurationVal(v);
                        setEditPkgTotalDays(calcDays(v, editPkgDurationUnit));
                      }}
                      className="text-sm"
                    />
                  </div>
                  {/* Duration Unit */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Duration Unit *</label>
                    <select
                      value={editPkgDurationUnit}
                      onChange={(e) => {
                        const u = e.target.value;
                        setEditPkgDurationUnit(u);
                        setEditPkgTotalDays(calcDays(editPkgDurationVal, u));
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
                      value={editPkgTotalDays}
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
                      value={editPkgSalePrice}
                      onChange={(e) => setEditPkgSalePrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Display / MRP Price (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 29999"
                      value={editPkgDisplayPrice}
                      onChange={(e) => setEditPkgDisplayPrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Tax Percentage (%)</label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={editPkgTaxPercentage}
                      onChange={(e) => setEditPkgTaxPercentage(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 sm:pt-5">
                    <input
                      type="checkbox"
                      id="edit_pkg_tax_inc"
                      checked={editPkgTaxIncluded}
                      onChange={(e) => setEditPkgTaxIncluded(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="edit_pkg_tax_inc" className="text-xs text-foreground cursor-pointer select-none">
                      Prices include tax
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Sessions & Passport Entitlements */}
              <div className="pt-3 border-t border-border space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Sessions & Passport Entitlements</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Max Sessions</label>
                    <Input
                      type="number"
                      placeholder="e.g. 72"
                      value={editPkgMaxSessions}
                      onChange={(e) => setEditPkgMaxSessions(e.target.value)}
                      className="text-sm"
                    />
                    <span className="text-[10px] text-muted-foreground">Home Branch</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Passport Sessions</label>
                    <Input
                      type="number"
                      placeholder="e.g. 10"
                      value={editPkgPassportSessions}
                      onChange={(e) => setEditPkgPassportSessions(e.target.value)}
                      className="text-sm"
                    />
                    <span className="text-[10px] text-muted-foreground">Cross-Branch</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Passport Cost (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={editPkgPassportCost}
                      onChange={(e) => setEditPkgPassportCost(e.target.value)}
                      className="text-sm"
                    />
                    <span className="text-[10px] text-muted-foreground">Extra per session</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Channels & Publishing */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editPkgShowWeb}
                      onChange={(e) => setEditPkgShowWeb(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    Show on Web
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editPkgShowApp}
                      onChange={(e) => setEditPkgShowApp(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    Show on App
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit_pkg_publish_now"
                    checked={editPkgPublishNow}
                    onChange={(e) => setEditPkgPublishNow(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="edit_pkg_publish_now" className="text-xs font-semibold text-primary cursor-pointer select-none">
                    Publish immediately (Activate Version)
                  </label>
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
                  editPkgTotalDays <= 0 ||
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
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      setNewVerTotalDays(calcDays(v, newVerDurationUnit));
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
                      setNewVerTotalDays(calcDays(newVerDurationVal, u));
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Validity (Days)</label>
                  <Input
                    type="number"
                    min={1}
                    value={newVerValidity}
                    onChange={(e) => setNewVerValidity(Number(e.target.value))}
                    className="text-sm"
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
                    <label className="block text-xs font-medium text-foreground mb-1">Display / MRP (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 29999"
                      value={newVerDisplayPrice}
                      onChange={(e) => setNewVerDisplayPrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Tax %</label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={newVerTaxPercentage}
                      onChange={(e) => setNewVerTaxPercentage(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 sm:pt-6">
                    <input
                      type="checkbox"
                      id="price_inc_tax"
                      checked={newVerTaxIncluded}
                      onChange={(e) => setNewVerTaxIncluded(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="price_inc_tax" className="text-xs text-foreground cursor-pointer select-none">
                      Includes Tax
                    </label>
                  </div>
                </div>
              </div>

              {/* Passport & Sessions Entitlements Section */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">Sessions & Passport</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Max Sessions</label>
                    <Input
                      type="number"
                      placeholder="e.g. 72"
                      value={newVerMaxSessions}
                      onChange={(e) => setNewVerMaxSessions(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Passport Sessions</label>
                    <Input
                      type="number"
                      placeholder="e.g. 10"
                      value={newVerPassportSessions}
                      onChange={(e) => setNewVerPassportSessions(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Passport Cost (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={newVerPassportCost}
                      onChange={(e) => setNewVerPassportCost(e.target.value)}
                      className="text-sm"
                    />
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
                      validity_days: newVerValidity,
                      show_on_web: newVerShowWeb,
                      show_on_app: newVerShowApp,
                      sale_price: newVerSalePrice ? Number(newVerSalePrice) : undefined,
                      display_price: newVerDisplayPrice ? Number(newVerDisplayPrice) : undefined,
                      tax_percentage: newVerTaxPercentage ? Number(newVerTaxPercentage) : 18,
                      prices_include_tax: newVerTaxIncluded,
                      max_sessions: newVerMaxSessions ? Number(newVerMaxSessions) : undefined,
                      passport_sessions: newVerPassportSessions ? Number(newVerPassportSessions) : undefined,
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
    </div>
  );
};

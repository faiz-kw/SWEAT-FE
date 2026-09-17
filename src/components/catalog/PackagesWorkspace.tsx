import React, { useState } from 'react';
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
  BookOpen,
  Send,
  ChevronDown,
  ChevronUp,
  FilePlus,
} from 'lucide-react';
import { catalogApi } from '@/services/catalogApi';
import type { Package, Program, TermsDocument } from '@/types/catalog';
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

export const PackagesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'program-types' | 'programs' | 'packages' | 'terms'>('program-types');
  const [searchQuery, setSearchQuery] = useState('');
  const [progSearchQuery, setProgSearchQuery] = useState('');
  const [ptSearchQuery, setPtSearchQuery] = useState('');

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

  // Program Type modal state
  const [newPtCode, setNewPtCode] = useState('');
  const [newPtName, setNewPtName] = useState('');
  const [newPtDesc, setNewPtDesc] = useState('');
  const [newPtOrder, setNewPtOrder] = useState(0);
  const [ptFormError, setPtFormError] = useState<string | null>(null);

  const [editingProgramType, setEditingProgramType] = useState<import('@/types/catalog').ProgramTypeItem | null>(null);
  const [editPtName, setEditPtName] = useState('');
  const [editPtDesc, setEditPtDesc] = useState('');
  const [editPtOrder, setEditPtOrder] = useState(0);
  const [editPtStatus, setEditPtStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editPtFormError, setEditPtFormError] = useState<string | null>(null);

  // Legal Policies modal state
  const [isNewTermsDocOpen, setIsNewTermsDocOpen] = useState(false);
  const [newTermsCode, setNewTermsCode] = useState('');
  const [newTermsName, setNewTermsName] = useState('');
  const [newTermsType, setNewTermsType] = useState('MEMBERSHIP_TERMS');
  const [termsDocFormError, setTermsDocFormError] = useState<string | null>(null);

  const [isNewTermsVersionOpen, setIsNewTermsVersionOpen] = useState(false);
  const [selectedTermsDoc, setSelectedTermsDoc] = useState<import('@/types/catalog').TermsDocument | null>(null);
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

  // Form states
  const [newPkgCode, setNewPkgCode] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgProgram, setNewPkgProgram] = useState('');
  const [newPkgTotalDays, setNewPkgTotalDays] = useState(180);
  const [newPkgDurationVal, setNewPkgDurationVal] = useState(6);
  const [newPkgDurationUnit, setNewPkgDurationUnit] = useState('MONTH');

  // ─── Duration auto-calc helper ────────────────────────────────────────────
  const calcDays = (val: number, unit: string): number => {
    const multiplier: Record<string, number> = {
      DAY: 1,
      WEEK: 7,
      MONTH: 30,
      YEAR: 365,
    };
    return Math.max(1, val * (multiplier[unit] ?? 1));
  };
  // ─────────────────────────────────────────────────────────────────────────
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

  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgType, setNewProgType] = useState('');
  const [newProgTrial, setNewProgTrial] = useState(false);

  // Queries
  const {
    data: programTypes = [],
    isLoading: isProgramTypesLoading,
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
    isFetching: isPackagesFetching,
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
    isFetching: isTermsFetching,
  } = useQuery({
    queryKey: ['terms-documents'],
    queryFn: () => catalogApi.getTermsDocuments(),
  });

  // Per-document versions (only loaded when a doc is expanded)
  const {
    data: expandedVersions = [],
    isLoading: isVersionsLoading,
  } = useQuery({
    queryKey: ['terms-document-versions', expandedTermsDocId],
    queryFn: () => catalogApi.getTermsDocumentVersions(expandedTermsDocId!),
    enabled: Boolean(expandedTermsDocId),
  });

  // Mutations
  const createPackageMutation = useMutation({
    mutationFn: async () => {
      const pkg = await catalogApi.createPackage({
        code: newPkgCode.trim().toUpperCase(),
        name: newPkgName.trim(),
        program: newPkgProgram,
        status: 'ACTIVE',
      });
      // Also create initial version if commercial values provided
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setIsNewPackageOpen(false);
      setNewPkgCode('');
      setNewPkgName('');
      setNewPkgProgram('');
      setNewPkgSalePrice('');
      setNewPkgDisplayPrice('');
      setNewPkgMaxSessions('');
      setNewPkgPassportSessions('');
      setNewPkgPassportCost('');
      setPkgFormError(null);
    },
    onError: (err: any) => {
      setPkgFormError(getErrorMessage(err));
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async () => {
      if (!editingPackage) return;
      // 1. Update package identity metadata
      const updatedPkg = await catalogApi.updatePackage(editingPackage.id, {
        name: editPkgName.trim(),
        status: editPkgStatus,
        program: editPkgProgram,
      });

      // 2. Check if commercial / version terms were modified or need saving
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
    },
    onError: (err: any) => {
      setPkgFormError(getErrorMessage(err));
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: ({ pkgId, payload }: { pkgId: string; payload: any }) =>
      catalogApi.createPackageVersion(pkgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setIsNewVersionOpen(false);
      setSelectedPackage(null);
    },
  });

  const createProgramMutation = useMutation({
    mutationFn: catalogApi.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setIsNewProgramOpen(false);
      setNewProgCode('');
      setNewProgName('');
      setNewProgDesc('');
      setNewProgType('');
      setNewProgTrial(false);
      setProgFormError(null);
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
    },
    onError: (err: any) => {
      setProgFormError(getErrorMessage(err));
    },
  });

  const createProgramTypeMutation = useMutation({
    mutationFn: () =>
      catalogApi.createProgramType({
        code: newPtCode.trim().toUpperCase(),
        name: newPtName.trim(),
        description: newPtDesc.trim() || null,
        display_order: newPtOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-types'] });
      setIsNewProgramTypeOpen(false);
      setNewPtCode('');
      setNewPtName('');
      setNewPtDesc('');
      setNewPtOrder(0);
      setPtFormError(null);
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
    },
    onError: (err: any) => {
      setEditPtFormError(getErrorMessage(err));
    },
  });

  const createTermsDocMutation = useMutation({
    mutationFn: () =>
      catalogApi.createTermsDocument({
        code: newTermsCode.trim().toUpperCase(),
        name: newTermsName.trim(),
        document_type: newTermsType,
      }),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['terms-documents'] });
      setIsNewTermsDocOpen(false);
      setNewTermsCode('');
      setNewTermsName('');
      setTermsDocFormError(null);
      // Auto-open version creator for the new document
      setSelectedTermsDoc(newDoc);
      setNewVerContent('');
      setNewVerEffectiveFrom(new Date().toISOString().slice(0, 16));
      setTermsVerFormError(null);
      setIsNewTermsVersionOpen(true);
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
    },
    onError: (err: any) => {
      setPublishError(getErrorMessage(err));
    },
  });

  // Filtered packages
  const filteredPackages = packages.filter((pkg) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      pkg.name?.toLowerCase().includes(q) ||
      pkg.code?.toLowerCase().includes(q) ||
      pkg.program_name?.toLowerCase().includes(q)
    );
  });

  // Resolve friendly label for Program Type (avoiding raw UUIDs)
  const getProgramTypeLabel = (prog: Program) => {
    if (prog.program_type_name) return prog.program_type_name;
    if (prog.program_type_code) return prog.program_type_code;
    const match = programTypes.find(
      (pt) => pt.id === prog.program_type || pt.code === prog.program_type
    );
    if (match) return match.name || match.code;
    if (typeof prog.program_type === 'string' && prog.program_type.length > 20 && prog.program_type.includes('-')) {
      return 'Program';
    }
    return prog.program_type || 'Program';
  };

  // Filtered programs
  const filteredPrograms = programs.filter((prog) => {
    const q = progSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const ptLabel = getProgramTypeLabel(prog).toLowerCase();
    return (
      prog.name?.toLowerCase().includes(q) ||
      prog.code?.toLowerCase().includes(q) ||
      ptLabel.includes(q) ||
      prog.program_type?.toLowerCase().includes(q)
    );
  });

  const activePackagesCount = packages.filter((p) => p.status === 'ACTIVE').length;
  const packagesWithActiveVersion = packages.filter((p) => Boolean(p.active_version)).length;

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
    const matchedPt = programTypes.find(
      (pt) => pt.id === prog.program_type || pt.code === prog.program_type
    );
    setEditProgType(matchedPt ? matchedPt.id : (prog.program_type || ''));
    setEditProgTrial(Boolean(prog.trial_allowed));
    setEditProgStatus((prog.status as any) || 'ACTIVE');
    setProgFormError(null);
  };

  const startEditProgramType = (pt: import('@/types/catalog').ProgramTypeItem) => {
    setEditingProgramType(pt);
    setEditPtName(pt.name);
    setEditPtDesc(pt.description || '');
    setEditPtOrder(pt.display_order);
    setEditPtStatus(pt.status);
    setEditPtFormError(null);
  };

  // Filtered program types
  const filteredProgramTypes = programTypes.filter((pt) => {
    const q = ptSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      pt.name?.toLowerCase().includes(q) ||
      pt.code?.toLowerCase().includes(q) ||
      pt.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Catalog & Commercial Packages"
        description="Tenant-authoritative catalog: commercial memberships, immutable published versions, business programs, and legal policies."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'packages') refetchPackages();
                if (activeTab === 'programs') refetchPrograms();
                if (activeTab === 'terms') refetchTerms();
                if (activeTab === 'program-types') queryClient.invalidateQueries({ queryKey: ['program-types'] });
              }}
              disabled={isPackagesFetching || isProgramsFetching || isTermsFetching}
              className="gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isPackagesFetching || isProgramsFetching || isTermsFetching ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh</span>
            </Button>
            {activeTab === 'program-types' && (
              <Button
                onClick={() => {
                  setPtFormError(null);
                  setIsNewProgramTypeOpen(true);
                }}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Program Type</span>
              </Button>
            )}
            {activeTab === 'packages' && (
              <Button
                onClick={() => {
                  setPkgFormError(null);
                  setIsNewPackageOpen(true);
                }}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Package</span>
              </Button>
            )}
            {activeTab === 'terms' && (
              <Button
                onClick={() => {
                  setTermsDocFormError(null);
                  setIsNewTermsDocOpen(true);
                }}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Legal Policy</span>
              </Button>
            )}
            {activeTab === 'programs' && (
              <Button
                onClick={() => {
                  setProgFormError(null);
                  setIsNewProgramOpen(true);
                }}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Program</span>
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <KpiTile
            title="Total Programs"
            value={programs.length}
            icon={Layers}
          />
          <KpiTile
            title="Total Packages"
            value={packages.length}
            icon={PackageIcon}
          />
          <KpiTile
            title="Active Packages"
            value={activePackagesCount}
            variant="success"
            icon={CheckCircle2}
          />
          <KpiTile
            title="Commercialized"
            value={packagesWithActiveVersion}
            description="With active version"
            icon={ShieldCheck}
          />
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl text-sm flex-wrap">
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
              <span>Programs</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {programs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'packages'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PackageIcon className="w-4 h-4" />
              <span>Packages</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {packages.length}
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

        {/* TAB 0: PROGRAM TYPES */}
        {activeTab === 'program-types' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search program types by code, name, or description..."
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
                {!ptSearchQuery && (
                  <Button
                    onClick={() => {
                      setPtFormError(null);
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
                        <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border/40 shrink-0">
                          {pt.code}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                          <Badge
                            variant={pt.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {pt.status}
                          </Badge>
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
                            onClick={() =>
                              updateProgramTypeMutation.mutate({
                                id: pt.id,
                                payload: { status: pt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                              })
                            }
                            title={pt.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {pt.status === 'ACTIVE' ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-foreground truncate" title={pt.name}>{pt.name}</h4>
                        {pt.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words" title={pt.description}>{pt.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 flex-wrap gap-1">
                      <span>Display order: {pt.display_order}</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(pt.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PROGRAMS */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search programs by code, name, or type..."
                  value={progSearchQuery}
                  onChange={(e) => setProgSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {isProgramsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 bg-muted/40 rounded-2xl border border-border/60 animate-pulse p-5" />
                ))}
              </div>
            )}

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

            {!isProgramsLoading && !isProgramsError && filteredPrograms.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {progSearchQuery ? 'No matching programs found' : 'No programs registered'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {progSearchQuery
                    ? `No program matched "${progSearchQuery}". Try a different search term.`
                    : 'Programs group packages and classes (e.g. Strength, Pilates, Personal Training).'}
                </p>
                {!progSearchQuery && (
                  <Button
                    onClick={() => {
                      setProgFormError(null);
                      setIsNewProgramOpen(true);
                    }}
                    size="sm"
                  >
                    Create Program
                  </Button>
                )}
              </div>
            )}

            {!isProgramsLoading && !isProgramsError && filteredPrograms.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrograms.map((prog) => {
                  const typeLabel = getProgramTypeLabel(prog);
                  return (
                    <div
                      key={prog.id}
                      className="p-4 sm:p-5 bg-card border border-border/60 hover:border-border transition-colors rounded-2xl space-y-3 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border/40 shrink-0">
                            {prog.code}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                            <Badge
                              variant="outline"
                              className="text-xs font-medium max-w-[140px] truncate"
                              title={typeLabel}
                            >
                              {typeLabel}
                            </Badge>
                            <Badge
                              variant={prog.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className="text-xs shrink-0"
                            >
                              {prog.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => startEditProgram(prog)}
                              title="Edit program"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-foreground truncate" title={prog.name}>
                            {prog.name}
                          </h4>
                          {prog.description && (
                            <p
                              className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words"
                              title={prog.description}
                            >
                              {prog.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 flex-wrap gap-1">
                        <span>{prog.packages_count ?? 0} packages linked</span>
                        {prog.trial_allowed && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                            Trials Allowed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKAGES */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search packages by code, name, or linked program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Loading */}
            {isPackagesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-muted/40 rounded-2xl border border-border/60 animate-pulse p-5" />
                ))}
              </div>
            )}

            {/* Error */}
            {isPackagesError && (
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-destructive font-semibold text-sm">Failed to load packages from tenant database.</p>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto font-mono">
                  {getErrorMessage(packagesError)}
                </p>
                <Button
                  onClick={() => refetchPackages()}
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
            {!isPackagesLoading && !isPackagesError && filteredPackages.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <PackageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {searchQuery ? 'No matching packages found' : 'No packages configured'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  {searchQuery
                    ? `No package matched "${searchQuery}". Try a different search term.`
                    : 'Create commercial packages with immutable published versions, session allocations, and branch availability.'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => {
                      setPkgFormError(null);
                      setIsNewPackageOpen(true);
                    }}
                    size="sm"
                  >
                    Create First Package
                  </Button>
                )}
              </div>
            )}

            {/* Cards Grid */}
            {!isPackagesLoading && !isPackagesError && filteredPackages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-card border border-border/60 hover:border-primary/50 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            {pkg.code}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-1.5">{pkg.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {pkg.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => startEditPackage(pkg)}
                            title="Edit package metadata"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {pkg.program_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <span>Program: {pkg.program_name}</span>
                        </div>
                      )}

                      {/* Active Version Info */}
                      {pkg.active_version ? (
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Active Version: v{pkg.active_version.version_number}
                            </span>
                            <span className="text-foreground font-mono">
                              {pkg.active_version.duration_value} {pkg.active_version.duration_unit?.toLowerCase()}(s)
                            </span>
                          </div>
                          {pkg.active_version.prices && pkg.active_version.prices.length > 0 && (
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {pkg.active_version.prices[0].currency} {pkg.active_version.prices[0].total_price}
                              <span className="text-xs text-muted-foreground font-normal ml-1">incl. tax</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>No active version published yet (Draft state).</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Version Immutability
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setIsNewVersionOpen(true);
                        }}
                        className="text-xs h-7 text-primary hover:text-primary/80 gap-1 px-2"
                      >
                        <span>New Version</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TERMS & LEGAL */}
        {activeTab === 'terms' && (
          <div className="space-y-4">
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

            {/* Empty */}
            {!isTermsLoading && !isTermsError && termsDocs.length === 0 && (
              <div className="p-12 text-center bg-card border border-dashed border-border/80 rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">No legal policies registered</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  Configure membership terms, attendance commitment, cancellation policies, and privacy notices.
                  Each policy supports versioned content and member acceptance tracking.
                </p>
                <Button
                  onClick={() => {
                    setTermsDocFormError(null);
                    setIsNewTermsDocOpen(true);
                  }}
                  size="sm"
                >
                  Create First Legal Policy
                </Button>
              </div>
            )}

            {/* Cards */}
            {!isTermsLoading && !isTermsError && termsDocs.length > 0 && (
              <div className="space-y-3">
                {termsDocs.map((doc) => {
                  const isExpanded = expandedTermsDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className="bg-card border border-border/60 rounded-2xl shadow-xs overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="p-5 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                              {doc.code}
                            </span>
                            <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                            <Badge
                              variant={doc.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <h4 className="text-base font-semibold text-foreground">{doc.name}</h4>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Active version: {doc.active_version ? `v${doc.active_version.version_number}` : 'None'}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                              {doc.versions_count ?? 0} version{(doc.versions_count ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setSelectedTermsDoc(doc);
                              setNewVerContent('');
                              setNewVerEffectiveFrom(new Date().toISOString().slice(0, 16));
                              setTermsVerFormError(null);
                              setIsNewTermsVersionOpen(true);
                            }}
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            New Version
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground"
                            onClick={() => setExpandedTermsDocId(isExpanded ? null : doc.id)}
                            title={isExpanded ? 'Collapse versions' : 'Show versions'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Versions panel */}
                      {isExpanded && (
                        <div className="border-t border-border/60 bg-muted/20 px-5 py-4 space-y-2">
                          {isVersionsLoading && (
                            <div className="text-xs text-muted-foreground animate-pulse">Loading versions...</div>
                          )}
                          {!isVersionsLoading && expandedVersions.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-3">
                              No versions yet. Click "New Version" to create the first draft.
                            </div>
                          )}
                          {!isVersionsLoading && expandedVersions.map((ver) => (
                            <div
                              key={ver.id}
                              className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/50 gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-mono text-muted-foreground shrink-0">
                                  v{ver.version_number}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={
                                        ver.status === 'ACTIVE' ? 'default'
                                        : ver.status === 'DRAFT' ? 'secondary'
                                        : 'outline'
                                      }
                                      className="text-[10px] h-4"
                                    >
                                      {ver.status}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      Effective: {ver.effective_from ? new Date(ver.effective_from).toLocaleDateString() : '—'}
                                    </span>
                                  </div>
                                  {ver.content_text && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                                      {ver.content_text.slice(0, 80)}{ver.content_text.length > 80 ? '…' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {ver.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 shrink-0 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                                  onClick={() => {
                                    setPublishTarget({ docId: doc.id, versionId: ver.id, versionNum: ver.version_number });
                                    setPublishError(null);
                                    setIsPublishConfirmOpen(true);
                                  }}
                                >
                                  <Send className="w-3 h-3" />
                                  Publish
                                </Button>
                              )}
                              {ver.status === 'ACTIVE' && (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Live
                                </span>
                              )}
                              {ver.status === 'RETIRED' && (
                                <span className="text-[10px] text-muted-foreground/60 font-medium shrink-0">Retired</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* MODAL: NEW LEGAL POLICY (Document) */}
      <Dialog open={isNewTermsDocOpen} onOpenChange={setIsNewTermsDocOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New Legal Policy</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates a policy document. You'll be prompted to add Version 1 immediately after.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm pt-2">
            {termsDocFormError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg break-words">
                {termsDocFormError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Code *</label>
                <Input
                  type="text"
                  placeholder="e.g. MEMBERSHIP-TOS"
                  value={newTermsCode}
                  onChange={(e) => setNewTermsCode(e.target.value.toUpperCase())}
                  className="uppercase font-mono text-sm"
                />
              </div>
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
              disabled={!newTermsCode.trim() || !newTermsName.trim() || createTermsDocMutation.isPending}
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

      {/* MODAL: NEW VERSION */}
      <Dialog open={isNewTermsVersionOpen} onOpenChange={setIsNewTermsVersionOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Draft Version</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target: <span className="font-mono text-primary font-semibold">{selectedTermsDoc?.name}</span>
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

      {/* MODAL: PUBLISH CONFIRMATION */}
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

      {/* MODAL: NEW PROGRAM TYPE */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Code *</label>
                <Input
                  type="text"
                  placeholder="e.g. MEMBERSHIP"
                  value={newPtCode}
                  onChange={(e) => setNewPtCode(e.target.value.toUpperCase())}
                  className="uppercase font-mono text-sm"
                />
                <span className="text-[10px] text-muted-foreground">Unique identifier, uppercase</span>
              </div>
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
              disabled={!newPtCode.trim() || !newPtName.trim() || createProgramTypeMutation.isPending}
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

      {/* MODAL: EDIT PROGRAM TYPE */}
      {editingProgramType && (
        <Dialog open={Boolean(editingProgramType)} onOpenChange={(open) => !open && setEditingProgramType(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Program Type</DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">Code: {editingProgramType.code}</p>
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
                  onChange={(e) => setNewPtOrder(Number(e.target.value))}
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

      {/* MODAL: NEW PACKAGE */}
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
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Package Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. GOLD-ANNUAL"
                    value={newPkgCode}
                    onChange={(e) => setNewPkgCode(e.target.value.toUpperCase())}
                    className="uppercase font-mono text-sm"
                  />
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
                      setNewPkgTotalDays(calcDays(v, newPkgDurationUnit));
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
                      setNewPkgTotalDays(calcDays(newPkgDurationVal, u));
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                </div>
                {/* Total Days — auto-calculated, read-only */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    Total Days
                    <span className="text-[9px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">auto</span>
                  </label>
                  <div className="relative">
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
                !newPkgCode.trim() ||
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

      {/* MODAL: EDIT PACKAGE */}
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
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Package Code</label>
                    <Input
                      type="text"
                      value={editingPackage.code}
                      disabled
                      className="text-sm font-mono bg-muted/50 cursor-not-allowed text-muted-foreground"
                    />
                  </div>
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
                  {/* Total Days — auto-calculated, read-only */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                      Total Days
                      <span className="text-[9px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">auto</span>
                    </label>
                    <div className="relative">
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

      {/* MODAL: NEW VERSION */}
      {selectedPackage && (
        <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create New Package Version</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: <span className="font-mono text-primary font-semibold">{selectedPackage.name}</span>
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
                {/* Total Days — auto-calculated, read-only */}
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

      {/* MODAL: NEW PROGRAM */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Program Code *</label>
                <Input
                  type="text"
                  placeholder="e.g. STRENGTH"
                  value={newProgCode}
                  onChange={(e) => setNewProgCode(e.target.value.toUpperCase())}
                  className="uppercase font-mono text-sm"
                />
              </div>
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
                      {pt.name} ({pt.code}){pt.status === 'INACTIVE' ? ' — Inactive' : ''}
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
              disabled={!newProgCode.trim() || !newProgName.trim() || createProgramMutation.isPending}
              onClick={() => {
                setProgFormError(null);
                createProgramMutation.mutate({
                  code: newProgCode.trim().toUpperCase(),
                  name: newProgName.trim(),
                  description: newProgDesc.trim() || null,
                  program_type: newProgType || (programTypes[0]?.id ?? ''),
                  trial_allowed: newProgTrial,
                });
              }}
            >
              {createProgramMutation.isPending ? 'Creating...' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT PROGRAM */}
      {editingProgram && (
        <Dialog open={Boolean(editingProgram)} onOpenChange={(open) => !open && setEditingProgram(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Program</DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">Code: {editingProgram.code}</p>
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
                        {pt.name} ({pt.code}){pt.status === 'INACTIVE' ? ' — Inactive' : ''}
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
    </div>
  );
};

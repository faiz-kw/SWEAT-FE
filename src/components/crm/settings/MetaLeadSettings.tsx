import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  metaLeadsApi,
  type MetaMapping,
  type MappingInput,
  type MetaImport,
  type MetaMetadata,
  type MetaAuditHistoryItem,
  type MetaDiscoveredPage,
  type MetaDiscoveredForm,
  type MetaFormQuestion,
} from '@/api/endpoints/metaLeadsApi';
import { useApp } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  ShieldAlert,
  UserCheck,
  FileText,
  X,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Info,
  ExternalLink,
  Lock,
  Link2,
  Check,
  Send,
  Search,
  Eye,
  Building,
  User,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
} from 'lucide-react';
import { CRMErrorState } from '../common/CRMErrorState';
import { CRMLoadingState } from '../common/CRMLoadingState';

const DISALLOWED_DEFAULT_FIELDS = [
  'full_name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'consent_whatsapp',
  'consent_email',
  'consent_sms',
];

const controlClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'grid gap-1.5 text-sm font-medium';

function formatError(error: unknown): string {
  const e = error as { data?: unknown; response?: { data?: unknown }; message?: string };
  const data = e.data || e.response?.data;
  if (data && typeof data === 'object') {
    const messages = Object.entries(data as Record<string, unknown>).map(
      ([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`
    );
    if (messages.length) return messages.join(' | ');
  }
  return e.message || 'An unexpected error occurred. Please check the logs.';
}

// Check if mapping is a test configuration using stored metadata
function isTestMapping(mapping: MetaMapping): boolean {
  return (
    mapping.field_defaults?.is_test === 'true' ||
    mapping.field_defaults?.is_test === '1' ||
    mapping.field_defaults?.mode === 'SIMULATOR'
  );
}

// Check if mapping is a verified live mapping linked to an authorized discovered page
function isLiveMapping(mapping: MetaMapping, meta: MetaMetadata): boolean {
  if (isTestMapping(mapping)) return false;
  if (meta.pages && meta.pages.some((p) => p.id === mapping.page_id)) {
    return true;
  }
  return false;
}

// Convert hours to friendly label
function formatFollowupDuration(hours: number): string {
  if (hours === 1) return '1 hour';
  if (hours === 2) return '2 hours';
  if (hours === 4) return '4 hours';
  if (hours === 12) return '12 hours';
  if (hours === 24) return '24 hours (1 day)';
  if (hours === 48) return '2 days';
  if (hours === 72) return '3 days';
  if (hours === 168) return '1 week';
  return `${hours} hours`;
}

// Extract prospect name from received lead field_data
function extractLeadName(item: MetaImport): string | null {
  if (!item.field_data || !Array.isArray(item.field_data)) return null;
  const fullNameField = item.field_data.find((f) => f.name.toLowerCase().includes('full_name'));
  if (fullNameField?.values?.[0]) return fullNameField.values[0];

  const firstNameField = item.field_data.find((f) => f.name.toLowerCase().includes('first_name'));
  const lastNameField = item.field_data.find((f) => f.name.toLowerCase().includes('last_name'));
  if (firstNameField?.values?.[0]) {
    return `${firstNameField.values[0]} ${lastNameField?.values?.[0] || ''}`.trim();
  }

  const nameField = item.field_data.find((f) => f.name.toLowerCase().includes('name'));
  if (nameField?.values?.[0]) return nameField.values[0];

  return null;
}

// ===========================================================================
// Main Component
// ===========================================================================
export function MetaLeadSettings({ canEdit }: { canEdit: boolean }) {
  const { tenantId } = useApp();
  const client = useQueryClient();
  const queryKeyBase = ['meta-leads', tenantId];

  // UI state
  const [formSearch, setFormSearch] = React.useState('');
  const [formModeFilter, setFormModeFilter] = React.useState<'ALL' | 'LIVE' | 'TEST' | 'UNCLASSIFIED'>('ALL');
  const [formStatusFilter, setFormStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [formPage, setFormPage] = React.useState(1);
  const FORMS_PER_PAGE = 6;

  const [importStatusFilter, setImportStatusFilter] = React.useState<'ALL' | 'NEEDS_ATTENTION' | 'ADDED' | 'FAILED'>('ALL');
  const [importPage, setImportPage] = React.useState(1);

  const [editing, setEditing] = React.useState<MetaMapping | null | undefined>(undefined);
  const [historyMapping, setHistoryMapping] = React.useState<MetaMapping | null>(null);
  const [selectedForTest, setSelectedForTest] = React.useState<MetaMapping | null>(null);
  const [testAnswers, setTestAnswers] = React.useState<Record<string, string>>({});
  const [testSubmissionId, setTestSubmissionId] = React.useState('');
  const [testResult, setTestResult] = React.useState<MetaImport | null>(null);
  const [expandedIssueId, setExpandedIssueId] = React.useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = React.useState(false);
  const [expandedDetailsMap, setExpandedDetailsMap] = React.useState<Record<string, boolean>>({});

  // Handle OAuth return params
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.has('meta_connected')) {
        const pagesCount = p.get('pages') || '0';
        toast.success(`Facebook connected successfully! (${pagesCount} pages discovered)`);
        client.invalidateQueries({ queryKey: queryKeyBase });
        window.history.replaceState({}, '', window.location.pathname + '?tab=meta');
      } else if (p.has('meta_error')) {
        const err = p.get('meta_error') || 'Authorization Error';
        const desc = p.get('meta_desc') || '';
        toast.error(`Facebook connection failed: ${err}${desc ? ` - ${desc}` : ''}`);
        window.history.replaceState({}, '', window.location.pathname + '?tab=meta');
      }
    }
  }, []);

  const metadataQuery = useQuery({
    queryKey: [...queryKeyBase, 'metadata'],
    queryFn: metaLeadsApi.metadata,
  });

  const mappingsQuery = useQuery({
    queryKey: [...queryKeyBase, 'mappings', 1],
    queryFn: () => metaLeadsApi.mappings(1),
  });

  // Map user-friendly import filter to backend param
  const backendImportFilter =
    importStatusFilter === 'ADDED'
      ? 'IMPORTED'
      : importStatusFilter === 'FAILED'
      ? 'FAILED'
      : undefined;

  const importsQuery = useQuery({
    queryKey: [...queryKeyBase, 'imports', importPage, backendImportFilter],
    queryFn: () => metaLeadsApi.imports(importPage, backendImportFilter),
  });

  const refreshAll = () => client.invalidateQueries({ queryKey: queryKeyBase });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active, version }: { id: string; is_active: boolean; version: number }) =>
      metaLeadsApi.toggleActive(id, is_active, version),
    onSuccess: (data) => {
      toast.success(`Lead form "${data.name}" is now ${data.is_active ? 'active' : 'paused'}.`);
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const simulateMutation = useMutation({
    mutationFn: metaLeadsApi.simulate,
    onSuccess: (data) => {
      setTestResult(data);
      if (data.status === 'IMPORTED') {
        toast.success(`Test lead received and added to CRM (Lead #${data.lead || 'Created'})`);
      } else {
        toast.warning(`Test lead received with status: ${data.status}`);
      }
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const retryMutation = useMutation({
    mutationFn: (importId: string) => metaLeadsApi.retry(importId),
    onSuccess: (data) => {
      if (data.status === 'IMPORTED') {
        toast.success('Lead processed and added to CRM successfully.');
      } else {
        toast.info(`Lead re-processed: ${data.status}`);
      }
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const disconnectMutation = useMutation({
    mutationFn: metaLeadsApi.disconnect,
    onSuccess: () => {
      toast.success('Facebook account disconnected.');
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  if (metadataQuery.isPending) {
    return <CRMLoadingState message="Loading Facebook & Instagram Leads settings..." />;
  }

  if (metadataQuery.isError) {
    return (
      <CRMErrorState
        title="Cannot load settings"
        message={formatError(metadataQuery.error)}
        onRetry={() => metadataQuery.refetch()}
      />
    );
  }

  const meta = metadataQuery.data;
  const allMappings = mappingsQuery.data?.results || [];
  const allImports = importsQuery.data?.results || [];

  // Filter mappings by search, mode, and status
  const filteredMappings = allMappings.filter((m) => {
    // Search
    if (formSearch.trim()) {
      const q = formSearch.toLowerCase();
      const pageName = meta.pages?.find((p) => p.id === m.page_id)?.name?.toLowerCase() || '';
      const branchName =
        m.branch_mode === 'FIXED'
          ? meta.branches.find((b) => b.id === m.branch)?.name?.toLowerCase() || ''
          : '';
      const matches =
        m.name.toLowerCase().includes(q) ||
        pageName.includes(q) ||
        branchName.includes(q);
      if (!matches) return false;
    }

    // Status filter
    if (formStatusFilter === 'ACTIVE' && !m.is_active) return false;
    if (formStatusFilter === 'PAUSED' && m.is_active) return false;

    // Mode filter based reliably on stored metadata
    const isTest = isTestMapping(m);
    const isLive = isLiveMapping(m, meta);
    if (formModeFilter === 'LIVE' && !isLive) return false;
    if (formModeFilter === 'TEST' && !isTest) return false;
    if (formModeFilter === 'UNCLASSIFIED' && (isTest || isLive)) return false;

    return true;
  });

  // Client-side pagination for lead forms to avoid crowding screen
  const totalFormPages = Math.ceil(filteredMappings.length / FORMS_PER_PAGE) || 1;
  const currentFormPage = Math.min(formPage, totalFormPages);
  const paginatedMappings = filteredMappings.slice(
    (currentFormPage - 1) * FORMS_PER_PAGE,
    currentFormPage * FORMS_PER_PAGE
  );

  // Client-side filtering for recent imports
  const displayedImports = allImports.filter((item) => {
    if (importStatusFilter === 'NEEDS_ATTENTION') {
      return ['NEEDS_MAPPING', 'NEEDS_ASSIGNMENT', 'NEEDS_REVIEW'].includes(item.status);
    }
    if (importStatusFilter === 'ADDED') {
      return item.status === 'IMPORTED';
    }
    if (importStatusFilter === 'FAILED') {
      return item.status === 'FAILED';
    }
    return true;
  });

  // Truthful Setup Progress Derivation
  // Permissions & Connection derived state
  const isPlatformConfigured = Boolean(meta.meta_app_configured || meta.app_id_configured);
  const hasConnectPermission = canEdit;
  const canConnect = isPlatformConfigured && hasConnectPermission;

  const handleTestWithoutFacebook = () => {
    // If mappings exist, select the active mapping or first mapping
    const target = allMappings.find((m) => m.is_active) || allMappings[0];
    if (target) {
      setSelectedForTest(target);
      toast.info(`Opened local simulator for "${target.name}". This creates local test records without connecting to Facebook.`);
      setTimeout(() => {
        const el = document.getElementById('meta-simulator-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      // No mapping exists yet: open form editor with a local simulator template
      setEditing({
        id: '',
        name: 'Local Test Form',
        page_id: 'local_test_page_001',
        form_id: 'local_test_form_001',
        is_active: true,
        version: 1,
        field_mappings: {
          full_name: 'full_name',
          email: 'email',
          phone: 'phone_number',
        },
        field_defaults: {
          is_test: 'true',
          mode: 'SIMULATOR',
        },
        branch_mode: 'FIXED',
        branch: meta.branches[0]?.id || null,
        branch_field: '',
        branch_answers: {},
        lead_source: meta.lead_sources[0]?.id || '',
        initial_stage: 'NEW_LEAD',
        repeat_policy: 'REVIEW',
        create_followup_task: true,
        followup_task_type: 'CALL',
        followup_due_hours: 24,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.info('Configure and save this test lead form to start simulating enquiries.');
    }
  };

  // 1. Facebook Connection State
  const isConnectionActive = (meta.is_connected ?? (meta.connection_status === 'CONNECTED' || meta.connection_status === 'LIVE_CONNECTED')) && meta.connection_status !== 'TOKEN_EXPIRED';
  const isConnectionAttention = meta.connection_status === 'TOKEN_EXPIRED';

  // 2. Lead Forms State (must have at least one active live mapping connected to an authorized live page)
  const hasLiveActiveForms = isConnectionActive && allMappings.some((m) => m.is_active && isLiveMapping(m, meta));
  const hasOnlyTestForms = allMappings.some((m) => isTestMapping(m)) && !hasLiveActiveForms;

  // 3. Testing & Receiving State (ONLY live imported leads with an active connection & active form mark this complete!)
  const hasLiveReceivedLeads =
    isConnectionActive &&
    hasLiveActiveForms &&
    allImports.some((i) => i.mode === 'LIVE' && i.status === 'IMPORTED');
  const hasSimulatorTested = allImports.some((i) => i.mode === 'SIMULATOR' && i.status === 'IMPORTED');

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Header & Connection Status                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Facebook & Instagram Leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Automatically add enquiries from your lead forms to CRM and assign them to the right team.
        </p>
      </header>

      {/* Connection Card */}
      <section className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-semibold text-base text-foreground">
                Facebook Connection
              </h2>
              {/* Exactly one clear connection status badge */}
              {isConnectionActive ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : isConnectionAttention ? (
                <Badge variant="destructive" className="font-medium gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Connection needs attention
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-medium gap-1 text-xs">
                  <Info className="h-3 w-3" />
                  Not connected
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground max-w-2xl">
              {isConnectionActive
                ? `Connected to Facebook as ${meta.connection?.meta_user_name || 'Authorized User'}. Your lead forms will automatically synchronize.`
                : isConnectionAttention
                ? 'Your Facebook connection has expired or permissions were updated. Please reconnect to continue receiving leads.'
                : 'Connect your Facebook account to access your gym’s lead forms and start receiving leads automatically.'}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
            {/* Unified Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {meta.simulator_enabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestWithoutFacebook}
                  className="gap-2 h-9 px-3.5 text-xs font-medium flex-1 sm:flex-initial justify-center"
                  title="Test enquiry ingestion using local simulator without connecting Facebook"
                >
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Test without Facebook
                </Button>
              )}

              {isConnectionActive ? (
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canEdit || disconnectMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Are you sure you want to disconnect Facebook? Incoming leads from your forms will be paused.'
                        )
                      ) {
                        disconnectMutation.mutate();
                      }
                    }}
                    className="h-9 px-3.5 text-xs flex-1 sm:flex-initial"
                  >
                    Disconnect
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => setShowConnectModal(true)}
                    className="h-9 px-3.5 text-xs flex-1 sm:flex-initial"
                  >
                    Reconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={!canConnect}
                  onClick={() => setShowConnectModal(true)}
                  className="gap-2 h-9 px-4 text-xs font-medium flex-1 sm:flex-initial justify-center"
                >
                  <Link2 className="h-4 w-4" />
                  Connect Facebook
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => void refreshAll()}
                title="Refresh connection status"
                className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Clear, properly aligned explanation below the button row */}
            {!isConnectionActive && (
              <div className="w-full sm:w-auto flex sm:justify-end">
                {!isPlatformConfigured ? (
                  <p className="text-xs text-muted-foreground text-left sm:text-right max-w-xs leading-normal">
                    Facebook connection is not set up yet. Contact your platform administrator.
                  </p>
                ) : !hasConnectPermission ? (
                  <p className="text-xs text-muted-foreground text-left sm:text-right max-w-xs leading-normal">
                    You do not have permission to connect Facebook.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Collapsed, permission-protected Technical details */}
        {canEdit && (
          <details className="mt-3 pt-3 border-t text-xs text-muted-foreground group">
            <summary className="cursor-pointer font-medium hover:text-foreground inline-flex items-center gap-1.5 select-none">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Technical details</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3 pb-1">
              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Account Diagnostics</span>
                <p>Status: {meta.connection_status}</p>
                <p>User: {meta.connection?.meta_user_name || 'None'}</p>
                <p className="truncate">User ID: {meta.connection?.meta_user_id || 'None'}</p>
              </div>

              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Token Security</span>
                <p>Storage: Encrypted at rest</p>
                <p>
                  Expires:{' '}
                  {meta.connection?.expires_at
                    ? new Date(meta.connection.expires_at).toLocaleDateString()
                    : 'Standard token'}
                </p>
                <p>Outbound Comms: Protected for test leads</p>
              </div>

              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Authorized Pages</span>
                <p>Discovered pages: {meta.pages?.length || 0}</p>
                <p>Live webhook reception: {meta.live_available ? 'Ready' : 'Pending'}</p>
                <p className="truncate">Tenant: {tenantId}</p>
              </div>
            </div>
          </details>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Truthful Setup Progress (3 Clear Steps)                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-sm text-foreground uppercase tracking-wider">
          Setup Progress
        </h2>

        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3 pt-1">
          {/* Step 1: Connect Facebook */}
          <div
            className={`rounded-lg border p-4 space-y-2 transition-all ${
              isConnectionActive
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                : isConnectionAttention
                ? 'border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Step 1</span>
              {isConnectionActive ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Completed
                </span>
              ) : isConnectionAttention ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Needs attention
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">To do</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">Connect Facebook</h3>
            <p className="text-xs text-muted-foreground">
              {isConnectionActive
                ? `Authorized as ${meta.connection?.meta_user_name || 'Facebook user'}`
                : isConnectionAttention
                ? 'Reconnection required'
                : !meta.meta_app_configured
                ? 'Awaiting platform administrator setup'
                : 'Authorize access to Facebook lead forms'}
            </p>
          </div>

          {/* Step 2: Set up lead forms */}
          <div
            className={`rounded-lg border p-4 space-y-2 transition-all ${
              hasLiveActiveForms
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                : hasOnlyTestForms
                ? 'border-border bg-card'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Step 2</span>
              {hasLiveActiveForms ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Completed
                </span>
              ) : hasOnlyTestForms ? (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Test form only
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">To do</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">Set up lead forms</h3>
            <p className="text-xs text-muted-foreground">
              {hasLiveActiveForms
                ? 'Live form mappings active and routing leads'
                : hasOnlyTestForms
                ? 'Test forms configured. Connect a live form to complete setup.'
                : 'Match questions to CRM fields and choose branch'}
            </p>
          </div>

          {/* Step 3: Test and start receiving leads */}
          <div
            className={`rounded-lg border p-4 space-y-2 transition-all ${
              hasLiveReceivedLeads
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                : hasSimulatorTested
                ? 'border-border bg-card'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Step 3</span>
              {hasLiveReceivedLeads ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Completed
                </span>
              ) : hasSimulatorTested ? (
                <span className="text-xs font-medium text-muted-foreground">
                  Simulator tested
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">Pending live test</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">Test and start receiving leads</h3>
            <p className="text-xs text-muted-foreground">
              {hasLiveReceivedLeads
                ? 'Live leads actively received and imported into CRM'
                : hasSimulatorTested
                ? isConnectionActive
                  ? 'Simulator test passed. Set up a live form to start receiving live leads.'
                  : 'Simulator test passed. Connect Facebook to receive live leads.'
                : 'Submit a test enquiry or publish your Facebook campaign'}
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Form Editor Modal / Inline Form                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editing !== undefined && (
        <MappingEditor
          key={editing?.id || 'new'}
          mapping={editing}
          metadata={meta}
          canEdit={canEdit}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setSelectedForTest(null);
            void refreshAll();
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. Lead forms (Simplified Form List)                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lead forms</h2>
            <p className="text-xs text-muted-foreground">
              Manage the forms connected to your CRM and control where new enquiries are sent.
            </p>
          </div>
          <Button
            disabled={!canEdit}
            onClick={() => setEditing(null)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Set up a form
          </Button>
        </div>

        {/* Search, Status & Mode Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-lg p-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={formSearch}
              onChange={(e) => {
                setFormSearch(e.target.value);
                setFormPage(1);
              }}
              placeholder="Search forms by name, page, or branch..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Mode filter pills */}
            <div className="flex items-center rounded-md border p-0.5 bg-muted/40">
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  formModeFilter === 'ALL'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormModeFilter('ALL');
                  setFormPage(1);
                }}
              >
                All forms
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  formModeFilter === 'LIVE'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormModeFilter('LIVE');
                  setFormPage(1);
                }}
              >
                Live forms
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  formModeFilter === 'TEST'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormModeFilter('TEST');
                  setFormPage(1);
                }}
              >
                Test / Simulator
              </button>
            </div>

            {/* Status filter pills */}
            <div className="flex items-center rounded-md border p-0.5 bg-muted/40">
              <button
                type="button"
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  formStatusFilter === 'ALL'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormStatusFilter('ALL');
                  setFormPage(1);
                }}
              >
                All status
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  formStatusFilter === 'ACTIVE'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormStatusFilter('ACTIVE');
                  setFormPage(1);
                }}
              >
                Active
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  formStatusFilter === 'PAUSED'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFormStatusFilter('PAUSED');
                  setFormPage(1);
                }}
              >
                Paused
              </button>
            </div>
          </div>
        </div>

        {/* Lead Form Cards Grid */}
        {mappingsQuery.isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading lead forms...</div>
        ) : filteredMappings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No lead forms found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {formSearch || formModeFilter !== 'ALL' || formStatusFilter !== 'ALL'
                ? 'Try adjusting your search or filters to find what you are looking for.'
                : 'Click "Set up a form" to connect your first lead form to CRM.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedMappings.map((mapping) => {
              const pageName = meta.pages?.find((p) => p.id === mapping.page_id)?.name;
              const branchName =
                mapping.branch_mode === 'FIXED'
                  ? meta.branches.find((b) => b.id === mapping.branch)?.name || 'Default branch'
                  : 'Route based on form answer';
              const assignedUser = meta.eligible_users?.find((u) => u.id === mapping.assigned_sales_user)?.name;
              const isTest = isTestMapping(mapping);
              const isLive = isLiveMapping(mapping, meta);
              const modeLabel = isTest ? 'Test / Simulator' : isLive ? 'Live mode' : 'Mode unclassified';
              const modeVariant: 'default' | 'secondary' | 'outline' = isTest ? 'secondary' : isLive ? 'default' : 'outline';
              const isDetailsExpanded = !!expandedDetailsMap[mapping.id];

              return (
                <article
                  key={mapping.id}
                  className={`rounded-xl border bg-card p-4 sm:p-5 space-y-3.5 shadow-sm transition-all ${
                    mapping.is_active ? 'border-border' : 'border-dashed opacity-85'
                  }`}
                >
                  {/* Card Header: Form Name, Status & Mode */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground">{mapping.name}</h3>
                        <Badge
                          variant={mapping.is_active ? 'default' : 'secondary'}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {mapping.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge
                          variant={modeVariant}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {modeLabel}
                        </Badge>
                      </div>

                      {/* Facebook Page name when available */}
                      {pageName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Facebook Page: <strong className="text-foreground">{pageName}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Clean 2-Column Summary */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-y py-3">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" /> Destination branch:
                      </span>
                      <p className="font-medium text-foreground">{branchName}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Sales assignment:
                      </span>
                      <p className="font-medium text-foreground">
                        {mapping.assignment_mode === 'SPECIFIC_USER'
                          ? `Assigned to ${assignedUser || 'staff member'}`
                          : 'Use team assignment settings'}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Technical Details */}
                  <div className="text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                      onClick={() =>
                        setExpandedDetailsMap({
                          ...expandedDetailsMap,
                          [mapping.id]: !isDetailsExpanded,
                        })
                      }
                    >
                      <span>{isDetailsExpanded ? 'Hide configuration details' : 'Show configuration details'}</span>
                      {isDetailsExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isDetailsExpanded && (
                      <div className="mt-2.5 rounded-lg border bg-muted/20 p-2.5 space-y-1.5 text-muted-foreground text-[11px]">
                        <p>
                          <strong className="text-foreground">Facebook Form ID:</strong> {mapping.form_id}
                        </p>
                        <p>
                          <strong className="text-foreground">Facebook Page ID:</strong> {mapping.page_id}
                        </p>
                        <p>
                          <strong className="text-foreground">Version:</strong> v{mapping.version}
                        </p>
                        <p>
                          <strong className="text-foreground">Initial pipeline stage:</strong>{' '}
                          {mapping.initial_stage === 'NEW_LEAD' ? 'New lead' : mapping.initial_stage || 'New lead'}
                        </p>
                        <p>
                          <strong className="text-foreground">Repeat enquiry policy:</strong>{' '}
                          {mapping.repeat_policy === 'REVIEW'
                            ? 'Hold repeat enquiries for review'
                            : 'Create a new enquiry'}
                        </p>
                        {mapping.create_followup_task && (
                          <p>
                            <strong className="text-foreground">Follow-up reminder:</strong>{' '}
                            {mapping.followup_task_type} reminder due in{' '}
                            {formatFollowupDuration(mapping.followup_due_hours || 24)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Edit, Pause/Resume, Test, Change history */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => setEditing(mapping)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryMapping(mapping)}
                        title="View change history"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <History className="h-3.5 w-3.5 mr-1" />
                        Change history
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canEdit || toggleActiveMutation.isPending}
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: mapping.id,
                            is_active: !mapping.is_active,
                            version: mapping.version,
                          })
                        }
                        title={mapping.is_active ? 'Pause this form' : 'Resume this form'}
                      >
                        {mapping.is_active ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1 text-amber-600" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Resume
                          </>
                        )}
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => {
                          setSelectedForTest(mapping);
                          setTestAnswers({});
                          setTestSubmissionId(crypto.randomUUID());
                          setTestResult(null);
                        }}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Lead Forms Pagination */}
        {totalFormPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-muted-foreground">
              Showing page {currentFormPage} of {totalFormPages} ({filteredMappings.length} total forms)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentFormPage <= 1}
                onClick={() => setFormPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentFormPage >= totalFormPages}
                onClick={() => setFormPage((p) => Math.min(totalFormPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Test Lead Submission Card (when Test is clicked)                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedForTest && (
        <section id="meta-simulator-panel" className="rounded-xl border bg-card p-5 sm:p-6 space-y-4 shadow-md scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span>Test Lead Submission:</span>
                  <span className="text-primary">{selectedForTest.name}</span>
                </h3>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Local Simulator
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit a safe local test lead to verify routing, duplicate detection, and CRM assignment without spending ad budget or connecting Facebook.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedForTest(null)}
              className="self-end sm:self-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const questions = [
                ...new Set([
                  ...Object.values(selectedForTest.field_mappings),
                  ...(selectedForTest.branch_mode === 'ANSWER' && selectedForTest.branch_field
                    ? [selectedForTest.branch_field]
                    : []),
                ]),
              ];

              simulateMutation.mutate({
                page_id: selectedForTest.page_id,
                form_id: selectedForTest.form_id,
                external_lead_id: testSubmissionId || crypto.randomUUID(),
                field_data: questions.map((name) => ({
                  name,
                  values: [testAnswers[name] || ''],
                })),
              });
            }}
          >
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-emerald-600" />
                Test Lead Safety Guarantees:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>Creates local test records in CRM to test follow-up tasks and branch assignment without connecting Facebook.</li>
                <li>Marked as a test lead so real emails, SMS, or WhatsApp messages are never sent.</li>
                <li>Simulator testing is restricted to local development and test environments.</li>
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                <span>Test Lead ID:</span>
                <Input
                  value={testSubmissionId}
                  onChange={(e) => setTestSubmissionId(e.target.value)}
                  placeholder="e.g. test-lead-001"
                  required
                />
                <span className="text-[11px] text-muted-foreground">
                  Use the same ID to test duplicate handling, or change it for a new enquiry.
                </span>
              </label>
            </div>

            <div className="border-t pt-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Form Questions & Answers
              </h4>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ...new Set([
                    ...Object.values(selectedForTest.field_mappings),
                    ...(selectedForTest.branch_mode === 'ANSWER' && selectedForTest.branch_field
                      ? [selectedForTest.branch_field]
                      : []),
                  ]),
                ].map((question) => (
                  <label key={question} className={labelClass}>
                    <span className="truncate" title={question}>
                      {question}:
                    </span>
                    <Input
                      value={testAnswers[question] || ''}
                      onChange={(e) =>
                        setTestAnswers({ ...testAnswers, [question]: e.target.value })
                      }
                      placeholder={`Answer for ${question}`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const questions = [
                    ...new Set([
                      ...Object.values(selectedForTest.field_mappings),
                      ...(selectedForTest.branch_mode === 'ANSWER' && selectedForTest.branch_field
                        ? [selectedForTest.branch_field]
                        : []),
                    ]),
                  ];
                  const sample: Record<string, string> = {};
                  questions.forEach((q) => {
                    const lk = q.toLowerCase();
                    if (lk.includes('name')) sample[q] = 'Alex Morgan';
                    else if (lk.includes('email')) sample[q] = 'alex.morgan@example.test';
                    else if (lk.includes('phone')) sample[q] = '+919876543210';
                    else if (lk.includes('city') || lk.includes('branch') || lk.includes('location'))
                      sample[q] = 'Andheri';
                    else sample[q] = 'Yes';
                  });
                  setTestAnswers(sample);
                  toast.info('Sample prospect answers populated.');
                }}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                Fill Sample Answers
              </Button>

              <Button
                type="submit"
                disabled={simulateMutation.isPending}
                className="w-full sm:w-auto gap-1.5"
              >
                <Send className="h-4 w-4" />
                {simulateMutation.isPending ? 'Sending test lead...' : 'Send Test Lead'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. Recent lead imports (Renamed from Meta Lead Ingestion Audit Log) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent lead imports</h2>
            <p className="text-xs text-muted-foreground">
              Track incoming enquiries from your Facebook and Instagram lead forms.
            </p>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center rounded-md border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                importStatusFilter === 'ALL'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setImportStatusFilter('ALL');
                setImportPage(1);
              }}
            >
              All imports
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                importStatusFilter === 'NEEDS_ATTENTION'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setImportStatusFilter('NEEDS_ATTENTION');
                setImportPage(1);
              }}
            >
              Needs your attention
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                importStatusFilter === 'ADDED'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setImportStatusFilter('ADDED');
                setImportPage(1);
              }}
            >
              Added to CRM
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                importStatusFilter === 'FAILED'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setImportStatusFilter('FAILED');
                setImportPage(1);
              }}
            >
              Could not import
            </button>
          </div>
        </div>

        {importsQuery.isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading recent imports...</div>
        ) : displayedImports.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No lead imports found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Incoming enquiries from your Facebook and Instagram forms will show up here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedImports.map((item) => {
              const leadName = extractLeadName(item);
              const matchingMapping = allMappings.find(
                (m) => m.page_id === item.page_id && m.form_id === item.form_id
              );
              const formDisplayName = matchingMapping?.name || `Form ${item.form_id}`;
              const branchDisplayName =
                matchingMapping?.branch_mode === 'FIXED'
                  ? meta.branches.find((b) => b.id === matchingMapping.branch)?.name
                  : null;

              // Plain language status mapping
              const isAdded = item.status === 'IMPORTED';
              const isPending = item.status === 'PENDING';
              const isNeedsAttention = ['NEEDS_MAPPING', 'NEEDS_ASSIGNMENT', 'NEEDS_REVIEW'].includes(
                item.status
              );
              const isFailed = item.status === 'FAILED';

              const isIssueExpanded = expandedIssueId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-xl border bg-card p-4 sm:p-5 space-y-3 shadow-xs transition-colors hover:border-muted-foreground/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Plain-language Status Badge */}
                        {isAdded && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Added to CRM
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            Waiting to process
                          </Badge>
                        )}
                        {isNeedsAttention && (
                          <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Needs your attention
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Could not import
                          </Badge>
                        )}

                        {/* Mode badge */}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {item.mode === 'LIVE' ? 'Live lead' : 'Simulator test'}
                        </Badge>

                        {/* Received Time */}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.received_at).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      {/* Lead Name, Form, and Branch */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-sm text-foreground font-medium">
                        <span>{leadName ? <strong>{leadName}</strong> : <span className="text-muted-foreground">Enquiry #{item.external_lead_id.slice(0, 12)}</span>}</span>
                        <span className="text-muted-foreground font-normal">•</span>
                        <span className="text-muted-foreground font-normal">Form: <strong className="text-foreground">{formDisplayName}</strong></span>
                        {branchDisplayName && (
                          <>
                            <span className="text-muted-foreground font-normal">•</span>
                            <span className="text-muted-foreground font-normal">Branch: <strong className="text-foreground">{branchDisplayName}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons: View lead / View issue */}
                    <div className="flex items-center gap-2">
                      {item.lead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/crm/leads?search=${encodeURIComponent(item.lead!)}`;
                          }}
                          className="gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          View lead
                        </Button>
                      )}

                      {(isNeedsAttention || isFailed) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedIssueId(isIssueExpanded ? null : item.id)}
                          className="gap-1 text-xs"
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          {isIssueExpanded ? 'Hide issue' : 'View issue'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Actionable Issue Explanation Banner */}
                  {isIssueExpanded && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 p-3.5 space-y-2 text-xs text-amber-950 dark:text-amber-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">
                            {item.status === 'NEEDS_MAPPING'
                              ? 'Question match required'
                              : item.status === 'NEEDS_ASSIGNMENT'
                              ? 'Branch routing required'
                              : item.status === 'NEEDS_REVIEW'
                              ? 'Repeat enquiry review'
                              : 'Import failed'}
                          </p>
                          <p className="text-muted-foreground">
                            {item.status === 'NEEDS_MAPPING'
                              ? 'This enquiry could not be automatically saved because the form is missing field matches for required CRM contact details.'
                              : item.status === 'NEEDS_ASSIGNMENT'
                              ? 'The prospect’s form answer did not match any assigned branch, and no fallback branch is configured.'
                              : item.status === 'NEEDS_REVIEW'
                              ? 'This person has enquired before. The lead was held to prevent unintentional duplicates.'
                              : item.error_message || 'The enquiry could not be processed due to a validation error.'}
                          </p>
                        </div>

                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(item.id)}
                            className="shrink-0 gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry import
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Protected Technical Details (gated on canEdit) */}
                  {canEdit && (
                    <details className="text-xs text-muted-foreground pt-1 border-t group">
                      <summary className="cursor-pointer hover:text-foreground font-medium inline-flex items-center gap-1 select-none">
                        <span>Technical payload details</span>
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-3 md:grid-cols-2 pt-2.5">
                        <div className="rounded border bg-muted/20 p-2.5 space-y-1">
                          <span className="font-semibold text-foreground text-[11px]">
                            Form Answers Received:
                          </span>
                          <pre className="overflow-x-auto text-[11px] p-2 bg-background rounded border font-mono">
                            {JSON.stringify(item.field_data || [], null, 2)}
                          </pre>
                        </div>
                        <div className="rounded border bg-muted/20 p-2.5 space-y-1">
                          <span className="font-semibold text-foreground text-[11px]">
                            Attribution & Processing Metadata:
                          </span>
                          <pre className="overflow-x-auto text-[11px] p-2 bg-background rounded border font-mono">
                            {JSON.stringify(
                              {
                                external_lead_id: item.external_lead_id,
                                page_id: item.page_id,
                                form_id: item.form_id,
                                campaign_name: item.campaign_name,
                                ad_name: item.ad_name,
                                error_code: item.error_code,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Lead Imports Pagination */}
        {importsQuery.data && importsQuery.data.count > 10 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-muted-foreground">
              Page {importPage} ({importsQuery.data.count} total records)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!importsQuery.data.previous}
                onClick={() => setImportPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!importsQuery.data.next}
                onClick={() => setImportPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. Facebook Connection Modal                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showConnectModal && (
        <MetaOAuthModal
          onClose={() => setShowConnectModal(false)}
          onSuccess={() => {
            setShowConnectModal(false);
            void refreshAll();
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. Mapping History Modal                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {historyMapping && (
        <MappingHistoryModal
          mapping={historyMapping}
          onClose={() => setHistoryMapping(null)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Mapping Editor Form (4 Sections with Question Labels)
// ===========================================================================
function MappingEditor({
  mapping,
  metadata,
  canEdit,
  onClose,
  onSaved,
}: {
  mapping: MetaMapping | null;
  metadata: MetaMetadata;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(mapping?.name || '');
  const [pageId, setPageId] = React.useState(mapping?.page_id || '');
  const [formId, setFormId] = React.useState(mapping?.form_id || '');
  const [active, setActive] = React.useState(mapping?.is_active ?? true);

  // Field mappings list: destination CRM field -> form question
  const [fields, setFields] = React.useState<{ destination: string; question: string }[]>(() => {
    if (mapping?.field_mappings && Object.keys(mapping.field_mappings).length > 0) {
      return Object.entries(mapping.field_mappings).map(([destination, question]) => ({
        destination,
        question,
      }));
    }
    return [
      { destination: 'full_name', question: 'full_name' },
      { destination: 'email', question: 'email' },
      { destination: 'phone', question: 'phone_number' },
    ];
  });

  // Optional defaults
  const [defaults, setDefaults] = React.useState<{ destination: string; value: string }[]>(() => {
    if (mapping?.field_defaults && Object.keys(mapping.field_defaults).length > 0) {
      return Object.entries(mapping.field_defaults)
        .filter(([k]) => !DISALLOWED_DEFAULT_FIELDS.includes(k))
        .map(([destination, value]) => ({ destination, value }));
    }
    return [];
  });

  // Section 3: Branch & Salesperson
  const [branchMode, setBranchMode] = React.useState<'FIXED' | 'ANSWER'>(mapping?.branch_mode || 'FIXED');
  const [branch, setBranch] = React.useState(mapping?.branch || metadata.branches[0]?.id || '');
  const [branchField, setBranchField] = React.useState(mapping?.branch_field || '');
  const [routes, setRoutes] = React.useState<{ answer: string; branchId: string }[]>(() => {
    if (mapping?.branch_answers && Object.keys(mapping.branch_answers).length > 0) {
      return Object.entries(mapping.branch_answers).map(([answer, branchId]) => ({
        answer,
        branchId,
      }));
    }
    return [];
  });
  const [unmatchedBranchPolicy, setUnmatchedBranchPolicy] = React.useState<'HOLD' | 'FALLBACK_BRANCH'>(
    mapping?.unmatched_branch_policy || 'HOLD'
  );
  const [fallbackBranch, setFallbackBranch] = React.useState(mapping?.fallback_branch || '');

  const [assignmentMode, setAssignmentMode] = React.useState<'TENANT_POLICY' | 'SPECIFIC_USER'>(
    mapping?.assignment_mode || 'TENANT_POLICY'
  );
  const [assignedSalesUser, setAssignedSalesUser] = React.useState(
    mapping?.assigned_sales_user || metadata.eligible_users?.[0]?.id || ''
  );

  // Section 4: Follow-up & Rules
  const [initialStage, setInitialStage] = React.useState(mapping?.initial_stage || 'NEW_LEAD');
  const [repeatPolicy, setRepeatPolicy] = React.useState<MetaMapping['repeat_policy']>(
    mapping?.repeat_policy || 'REVIEW'
  );
  const [createFollowup, setCreateFollowup] = React.useState(mapping?.create_followup_task ?? true);
  const [followupType, setFollowupType] = React.useState(mapping?.followup_task_type || 'CALL');
  const [followupHours, setFollowupHours] = React.useState<number>(mapping?.followup_due_hours || 24);

  // Discovered forms and questions from Meta API
  const [discoveredForms, setDiscoveredForms] = React.useState<MetaDiscoveredForm[]>([]);
  const [discoveredQuestions, setDiscoveredQuestions] = React.useState<MetaFormQuestion[]>([]);
  const [isLoadingForms, setIsLoadingForms] = React.useState(false);
  const [isManualQuestionEntry, setIsManualQuestionEntry] = React.useState(false);
  const [versionConflict, setVersionConflict] = React.useState<string | null>(null);

  // Load forms when pageId changes
  React.useEffect(() => {
    if (pageId) {
      setIsLoadingForms(true);
      metaLeadsApi
        .forms(pageId)
        .then((res) => {
          if (res.forms) setDiscoveredForms(res.forms);
        })
        .catch(() => {
          setDiscoveredForms([]);
        })
        .finally(() => setIsLoadingForms(false));
    }
  }, [pageId]);

  // Load questions when formId changes
  React.useEffect(() => {
    if (formId) {
      metaLeadsApi
        .formFields(formId)
        .then((res) => {
          if (res.form?.questions && res.form.questions.length > 0) {
            setDiscoveredQuestions(res.form.questions);
          }
        })
        .catch(() => {
          setDiscoveredQuestions([]);
        });
    }
  }, [formId]);

  const saveMutation = useMutation({
    mutationFn: (payload: MappingInput) => metaLeadsApi.save(payload, mapping?.id),
    onSuccess: () => {
      toast.success(mapping ? 'Lead form updated successfully' : 'New lead form created successfully');
      onSaved();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: Record<string, unknown> } };
      if (err.response?.data?.['expected_version']) {
        setVersionConflict(
          'Conflict detected: Another administrator updated this form while you were editing. Please reload to review the latest settings.'
        );
      } else {
        toast.error(formatError(e));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVersionConflict(null);

    if (!name.trim()) {
      toast.error('Please enter a name for this lead form configuration.');
      return;
    }

    if (!pageId.trim() || !formId.trim()) {
      toast.error('Please choose a Facebook Page and lead form.');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please configure at least one field match.');
      return;
    }

    const hasNameMapping = fields.some(
      (f) => (f.destination === 'full_name' || f.destination === 'first_name') && f.question.trim().length > 0
    );
    const hasContactMapping = fields.some(
      (f) => (f.destination === 'email' || f.destination === 'phone') && f.question.trim().length > 0
    );

    if (!hasNameMapping) {
      toast.error('A prospect name match (Full name or First name) is required.');
      return;
    }

    if (!hasContactMapping) {
      toast.error('At least one contact method (Email or Phone) is required.');
      return;
    }

    const payload: MappingInput = {
      name: name.trim(),
      page_id: pageId.trim(),
      form_id: formId.trim(),
      is_active: active,
      field_mappings: Object.fromEntries(fields.map((f) => [f.destination, f.question.trim()])),
      field_defaults: Object.fromEntries(
        defaults.filter((d) => d.destination && d.value.trim()).map((d) => [d.destination, d.value.trim()])
      ),
      branch_mode: branchMode,
      branch: branchMode === 'FIXED' ? branch || null : null,
      branch_field: branchMode === 'ANSWER' ? branchField.trim() : '',
      branch_answers:
        branchMode === 'ANSWER' ? Object.fromEntries(routes.map((r) => [r.answer.trim(), r.branchId])) : {},
      unmatched_branch_policy: unmatchedBranchPolicy,
      fallback_branch: unmatchedBranchPolicy === 'FALLBACK_BRANCH' ? fallbackBranch || null : null,
      lead_source: mapping?.lead_source || metadata.lead_sources[0]?.id || '',
      initial_stage: initialStage,
      repeat_policy: repeatPolicy,
      assignment_mode: assignmentMode,
      assigned_sales_user: assignmentMode === 'SPECIFIC_USER' ? assignedSalesUser || null : null,
      create_followup_task: createFollowup,
      followup_task_type: followupType,
      followup_due_hours: Number(followupHours) || 24,
      ...(mapping?.version !== undefined ? { expected_version: mapping.version } : {}),
    };

    saveMutation.mutate(payload);
  };

  // Derive plain-language summary sentence before saving
  const selectedFormLabel =
    name.trim() ||
    discoveredForms.find((f) => f.id === formId)?.name ||
    'this form';

  const selectedBranchLabel =
    branchMode === 'FIXED'
      ? metadata.branches.find((b) => b.id === branch)?.name || 'the selected branch'
      : 'branches routed by question answer';

  const selectedAssignmentLabel =
    assignmentMode === 'TENANT_POLICY'
      ? 'team assignment settings'
      : metadata.eligible_users?.find((u) => u.id === assignedSalesUser)?.name
      ? metadata.eligible_users.find((u) => u.id === assignedSalesUser)!.name
      : 'the assigned salesperson';

  const selectedTaskLabel =
    metadata.task_types?.find((t) => t.value === followupType)?.label ||
    (followupType === 'CALL' ? 'Phone call' : followupType === 'WHATSAPP' ? 'WhatsApp message' : 'Follow-up');

  const selectedDurationLabel = formatFollowupDuration(followupHours);

  return (
    <form
      onSubmit={handleSubmit}
      id="lead-form-editor" className="rounded-xl border bg-card p-5 sm:p-6 space-y-6 shadow-xl scroll-mt-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-semibold text-lg text-foreground">
            {mapping?.id ? `Edit form: ${mapping.name}` : 'Set up a new lead form'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure how enquiry answers are saved, routed to branches, and assigned to your team.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canEdit || saveMutation.isPending} className="w-full sm:w-auto">
            {saveMutation.isPending ? 'Saving...' : mapping?.id ? 'Save changes' : 'Save lead form'}
          </Button>
        </div>
      </div>

      {versionConflict && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{versionConflict}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Section 1: Choose your form                                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-primary" />
            1. Choose your form
          </h3>
          <p className="text-xs text-muted-foreground">
            Select the Facebook Page and Lead Form you want to connect.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span>Form configuration name:</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Promo 2026"
              required
            />
          </label>

          <label className={labelClass}>
            <span>Facebook Page:</span>
            {metadata.pages && metadata.pages.length > 0 ? (
              <select
                className={controlClass}
                value={pageId}
                onChange={(e) => {
                  setPageId(e.target.value);
                  setFormId('');
                }}
                required
              >
                <option value="">Select a Facebook Page</option>
                {metadata.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="Enter Facebook Page ID"
                required
              />
            )}
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            <span>Facebook Lead Form:</span>
            {discoveredForms.length > 0 ? (
              <select
                className={controlClass}
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                required
              >
                <option value="">Select a lead form</option>
                {discoveredForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Status: {f.status})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="Enter Facebook Form ID"
                required
              />
            )}
            {isLoadingForms && (
              <span className="text-[11px] text-muted-foreground">Loading forms for page...</span>
            )}
          </label>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Section 2: Match form answers                                     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="space-y-4 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              2. Match form answers
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose where each answer from your form should be saved in CRM.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {discoveredQuestions.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsManualQuestionEntry(!isManualQuestionEntry)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {isManualQuestionEntry ? 'Use question dropdowns' : 'Advanced: enter question keys manually'}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFields([...fields, { destination: '', question: '' }])}
            >
              + Match another answer
            </Button>
          </div>
        </div>

        {/* Field Match Rows */}
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 p-3 sm:p-0 rounded-lg border sm:border-0 bg-muted/20 sm:bg-transparent"
            >
              {/* Form Question */}
              <div className="flex-1 w-full">
                <label className="text-[11px] font-medium text-muted-foreground sm:hidden mb-1 block">
                  Form question:
                </label>
                {discoveredQuestions.length > 0 && !isManualQuestionEntry ? (
                  <select
                    className={controlClass}
                    value={f.question}
                    onChange={(e) => {
                      const updated = [...fields];
                      if (updated[idx]) {
                        updated[idx] = { ...updated[idx], question: e.target.value };
                        setFields(updated);
                      }
                    }}
                    required
                  >
                    <option value="">Select form question</option>
                    {discoveredQuestions.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.label || q.key}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={f.question}
                    onChange={(e) => {
                      const updated = [...fields];
                      if (updated[idx]) {
                        updated[idx] = { ...updated[idx], question: e.target.value };
                        setFields(updated);
                      }
                    }}
                    placeholder="Form question key (e.g. email)"
                    required
                  />
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-center w-full sm:w-auto px-1 sm:px-0">
                <span className="text-[11px] text-muted-foreground sm:hidden font-medium">Maps to CRM field:</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0 shrink-0" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                  className="sm:hidden text-muted-foreground hover:text-destructive p-1 h-7 w-7"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* CRM Destination Field */}
              <div className="flex-1 w-full">
                <label className="text-[11px] font-medium text-muted-foreground sm:hidden mb-1 block">
                  CRM destination field:
                </label>
                <select
                  className={controlClass}
                  value={f.destination}
                  onChange={(e) => {
                    const updated = [...fields];
                    if (updated[idx]) {
                      updated[idx] = { ...updated[idx], destination: e.target.value };
                      setFields(updated);
                    }
                  }}
                  required
                >
                  <option value="">Select CRM field</option>
                  {metadata.destination_fields.map((dest) => (
                    <option key={dest.value} value={dest.value}>
                      {dest.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove Row Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                className="hidden sm:inline-flex shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Collapsed Optional Defaults */}
        <details className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground group">
          <summary className="cursor-pointer font-medium hover:text-foreground inline-flex items-center gap-1.5 select-none">
            <span>Optional defaults</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Set fallback values for optional questions. Static defaults cannot be applied to identity, contact, or consent fields.
            </p>

            <div className="space-y-2.5">
              {defaults.map((d, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-0 rounded-lg border sm:border-0 bg-muted/20 sm:bg-transparent"
                >
                  <select
                    className={`${controlClass} flex-1 w-full`}
                    value={d.destination}
                    onChange={(e) => {
                      const updated = [...defaults];
                      if (updated[idx]) {
                        updated[idx] = { ...updated[idx], destination: e.target.value };
                        setDefaults(updated);
                      }
                    }}
                  >
                    <option value="">Select CRM Field</option>
                    {metadata.destination_fields
                      .filter((f) => !DISALLOWED_DEFAULT_FIELDS.includes(f.value))
                      .map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                  </select>
                  <Input
                    className="flex-1 w-full"
                    value={d.value}
                    onChange={(e) => {
                      const updated = [...defaults];
                      if (updated[idx]) {
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        setDefaults(updated);
                      }
                    }}
                    placeholder="Default fallback value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefaults(defaults.filter((_, i) => i !== idx))}
                    className="self-end sm:self-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDefaults([...defaults, { destination: '', value: '' }])}
              className="text-xs"
            >
              + Add optional default
            </Button>
          </div>
        </details>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Section 3: Choose the branch and salesperson                     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="space-y-4 border-t pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Building className="h-4 w-4 text-primary" />
            3. Choose the branch and salesperson
          </h3>
          <p className="text-xs text-muted-foreground">
            Control which gym location receives these leads and how they are assigned to your team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Question: Which branch should receive these leads? */}
          <label className={labelClass}>
            <span>Which branch should receive these leads?</span>
            <select
              className={controlClass}
              value={branchMode}
              onChange={(e) => setBranchMode(e.target.value as 'FIXED' | 'ANSWER')}
            >
              <option value="FIXED">Send all leads to one branch</option>
              <option value="ANSWER">Route based on form answer (e.g. preferred location)</option>
            </select>
          </label>

          {branchMode === 'FIXED' ? (
            <label className={labelClass}>
              <span>Destination branch:</span>
              <select
                className={controlClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              >
                {metadata.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={labelClass}>
              <span>Form question to route by:</span>
              <Input
                value={branchField}
                onChange={(e) => setBranchField(e.target.value)}
                placeholder="e.g. preferred_location or city"
                required
              />
            </label>
          )}
        </div>

        {/* Dynamic routing table if answer-based */}
        {branchMode === 'ANSWER' && (
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-semibold">Answer Routing Rules:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRoutes([...routes, { answer: '', branchId: '' }])}
              >
                + Add Route
              </Button>
            </div>

            {routes.map((rt, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-0 rounded-lg border sm:border-0 bg-muted/30 sm:bg-transparent"
              >
                <Input
                  value={rt.answer}
                  onChange={(e) => {
                    const updated = [...routes];
                    if (updated[idx]) {
                      updated[idx] = { ...updated[idx], answer: e.target.value };
                      setRoutes(updated);
                    }
                  }}
                  placeholder="When answer is... (e.g. Andheri)"
                  className="flex-1 w-full text-xs"
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0 self-center" />
                <select
                  className={`${controlClass} flex-1 w-full`}
                  value={rt.branchId}
                  onChange={(e) => {
                    const updated = [...routes];
                    if (updated[idx]) {
                      updated[idx] = { ...updated[idx], branchId: e.target.value };
                      setRoutes(updated);
                    }
                  }}
                  required
                >
                  <option value="">Select Branch</option>
                  {metadata.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRoutes(routes.filter((_, i) => i !== idx))}
                  className="self-end sm:self-auto"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t text-xs">
              <label className={labelClass}>
                <span>If the answer does not match any branch:</span>
                <select
                  className={controlClass}
                  value={unmatchedBranchPolicy}
                  onChange={(e) =>
                    setUnmatchedBranchPolicy(e.target.value as 'HOLD' | 'FALLBACK_BRANCH')
                  }
                >
                  <option value="HOLD">Hold for review (Needs branch assignment)</option>
                  <option value="FALLBACK_BRANCH">Send to fallback branch</option>
                </select>
              </label>

              {unmatchedBranchPolicy === 'FALLBACK_BRANCH' && (
                <label className={labelClass}>
                  <span>Fallback branch:</span>
                  <select
                    className={controlClass}
                    value={fallbackBranch}
                    onChange={(e) => setFallbackBranch(e.target.value)}
                    required
                  >
                    <option value="">Select Fallback Branch</option>
                    {metadata.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Question: Who should follow up? */}
        <div className="grid gap-4 sm:grid-cols-2 pt-1">
          <label className={labelClass}>
            <span>Who should follow up?</span>
            <select
              className={controlClass}
              value={assignmentMode}
              onChange={(e) =>
                setAssignmentMode(e.target.value as 'TENANT_POLICY' | 'SPECIFIC_USER')
              }
            >
              <option value="TENANT_POLICY">Use team assignment settings (automatic round-robin)</option>
              <option value="SPECIFIC_USER">Assign to a specific salesperson</option>
            </select>
          </label>

          {assignmentMode === 'SPECIFIC_USER' && (
            <label className={labelClass}>
              <span>Salesperson:</span>
              <select
                className={controlClass}
                value={assignedSalesUser}
                onChange={(e) => setAssignedSalesUser(e.target.value)}
                required
              >
                <option value="">Select team member</option>
                {metadata.eligible_users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Section 4: Set follow-up reminders                                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="space-y-4 border-t pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-primary" />
            4. Set follow-up reminders
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure repeat enquiry rules and automated follow-up reminder tasks for your team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Question: What should happen if this person enquires again? */}
          <label className={labelClass}>
            <span>What should happen if this person enquires again?</span>
            <select
              className={controlClass}
              value={repeatPolicy}
              onChange={(e) => setRepeatPolicy(e.target.value as MetaMapping['repeat_policy'])}
            >
              <option value="REVIEW">Hold repeat enquiries for review</option>
              <option value="CREATE_NEW">Create a new enquiry</option>
            </select>
          </label>

          {/* Initial Stage */}
          <label className={labelClass}>
            <span>Starting pipeline stage:</span>
            <select
              className={controlClass}
              value={initialStage}
              onChange={(e) => setInitialStage(e.target.value)}
            >
              {metadata.initial_stages?.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.value === 'NEW_LEAD' ? 'New lead' : st.label}
                </option>
              )) || <option value="NEW_LEAD">New lead</option>}
            </select>
          </label>
        </div>

        {/* Question: When should the team follow up? */}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={createFollowup}
              onChange={(e) => setCreateFollowup(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Create a follow-up task when a lead arrives</span>
          </label>

          <p className="text-xs text-muted-foreground pl-6">
            Creating a follow-up task adds a reminder for your sales team in CRM; it does not automatically send a message to the prospect.
          </p>

          {createFollowup && (
            <div className="grid gap-3 sm:grid-cols-2 pt-2 pl-6">
              <label className={labelClass}>
                <span>Reminder task type:</span>
                <select
                  className={controlClass}
                  value={followupType}
                  onChange={(e) => setFollowupType(e.target.value)}
                >
                  {metadata.task_types?.map((tt) => (
                    <option key={tt.value} value={tt.value}>
                      {tt.label}
                    </option>
                  )) || (
                    <>
                      <option value="CALL">Phone call</option>
                      <option value="WHATSAPP">WhatsApp message</option>
                      <option value="EMAIL">Email</option>
                    </>
                  )}
                </select>
              </label>

              {/* Readable duration control */}
              <label className={labelClass}>
                <span>When should the team follow up?</span>
                <select
                  className={controlClass}
                  value={followupHours}
                  onChange={(e) => setFollowupHours(Number(e.target.value))}
                >
                  <option value={1}>Within 1 hour</option>
                  <option value={2}>Within 2 hours</option>
                  <option value={4}>Within 4 hours</option>
                  <option value={12}>Within 12 hours</option>
                  <option value={24}>Within 24 hours (1 day)</option>
                  <option value={48}>Within 2 days</option>
                  <option value={72}>Within 3 days</option>
                  <option value={168}>Within 1 week</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Live Derived Summary Before Saving                                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
        <span className="font-semibold text-primary uppercase tracking-wider text-[11px] block">
          Settings summary
        </span>
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {createFollowup ? (
            <>
              Leads from <strong className="text-primary">{selectedFormLabel}</strong> will go to{' '}
              <strong className="text-primary">{selectedBranchLabel}</strong>, be assigned using{' '}
              <strong className="text-primary">{selectedAssignmentLabel}</strong>, and receive a{' '}
              <strong className="text-primary">{selectedTaskLabel}</strong> reminder after{' '}
              <strong className="text-primary">{selectedDurationLabel}</strong>.
            </>
          ) : (
            <>
              Leads from <strong className="text-primary">{selectedFormLabel}</strong> will go to{' '}
              <strong className="text-primary">{selectedBranchLabel}</strong>, and be assigned using{' '}
              <strong className="text-primary">{selectedAssignmentLabel}</strong> (no automatic follow-up reminder).
            </>
          )}
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
          />
          <span>Enable this form for lead intake upon saving</span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canEdit || saveMutation.isPending} className="w-full sm:w-auto">
            {saveMutation.isPending ? 'Saving...' : mapping?.id ? 'Save changes' : 'Save lead form'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ===========================================================================
// Meta OAuth Modal Component
// ===========================================================================
function MetaOAuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [authCode, setAuthCode] = React.useState('');
  const [authState, setAuthState] = React.useState('');
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = React.useState(false);

  const handleLaunchOAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const data = await metaLeadsApi.oauthInit();
      setAuthState(data.state);
      window.open(data.auth_url, '_blank', 'width=650,height=700');
      toast.info('Facebook authorization opened. Complete login in the window.');
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleCompleteCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      toast.error('Please enter the authorization code provided by Facebook.');
      return;
    }
    try {
      setIsSubmittingCode(true);
      const res = await metaLeadsApi.oauthCallback(authCode.trim(), authState.trim());
      if (res.success) {
        toast.success(`Connected Facebook account: ${res.connection.meta_user_name}`);
        onSuccess();
      } else {
        toast.error(res.message || 'Authorization could not be completed.');
      }
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Connect Facebook</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Connecting Facebook grants your CRM access to discover your Facebook Pages, retrieve Lead Ads forms, and automatically receive enquiries in real time.
          </p>

          <Button
            type="button"
            className="w-full gap-2 py-5 text-sm font-semibold"
            onClick={handleLaunchOAuth}
            disabled={isLoadingAuth}
          >
            <ExternalLink className="h-4 w-4" />
            {isLoadingAuth ? 'Preparing Facebook login...' : 'Log in with Facebook'}
          </Button>

          {/* Manual Authorization Code Fallback */}
          <details className="pt-2 border-t text-muted-foreground group">
            <summary className="cursor-pointer font-medium hover:text-foreground inline-flex items-center gap-1 select-none">
              <span>Need to connect using an authorization code?</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <form onSubmit={handleCompleteCallback} className="pt-3 space-y-3">
              <div className="space-y-2">
                <Input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Enter authorization code (code=...)"
                  required
                />
                <Input
                  value={authState}
                  onChange={(e) => setAuthState(e.target.value)}
                  placeholder="State token"
                />
              </div>
              <Button type="submit" size="sm" disabled={isSubmittingCode} className="w-full">
                {isSubmittingCode ? 'Connecting...' : 'Complete connection'}
              </Button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Mapping History Modal
// ===========================================================================
function MappingHistoryModal({
  mapping,
  onClose,
}: {
  mapping: MetaMapping;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['meta-mapping-history', mapping.id],
    queryFn: () => metaLeadsApi.auditHistory(mapping.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-lg text-foreground">Change History: {mapping.name}</h3>
            <p className="text-xs text-muted-foreground">
              Audit trail of configuration updates and status changes.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
          {query.isPending ? (
            <p className="text-muted-foreground p-4 text-center">Loading change history...</p>
          ) : query.isError ? (
            <p className="text-destructive p-4 text-center">{formatError(query.error)}</p>
          ) : query.data && query.data.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center">No audit history entries found.</p>
          ) : (
            query.data?.map((entry: MetaAuditHistoryItem) => (
              <div key={entry.id} className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {entry.action_code}
                  </Badge>
                  <span className="text-muted-foreground text-[11px]">
                    {new Date(entry.occurred_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-foreground">
                  Updated by: <strong>{entry.actor_name}</strong> ({entry.actor_type})
                </p>
                {entry.version && (
                  <p className="text-muted-foreground">Version: v{entry.version}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

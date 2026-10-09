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
  Copy,
  CheckCheck,
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
  const [formStatusFilter, setFormStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [formPage, setFormPage] = React.useState(1);
  const FORMS_PER_PAGE = 6;

  const [importStatusFilter, setImportStatusFilter] = React.useState<
    'ALL' | 'NEEDS_ATTENTION' | 'ADDED' | 'RESOLVED' | 'FAILED'
  >('ALL');
  const [importPage, setImportPage] = React.useState(1);

  const [editing, setEditing] = React.useState<MetaMapping | null | undefined>(undefined);
  const [historyMapping, setHistoryMapping] = React.useState<MetaMapping | null>(null);
  const [resolvingImportId, setResolvingImportId] = React.useState<string | null>(null);
  const [resolveReason, setResolveReason] = React.useState<string>(
    'Duplicate enquiry already handled by sales team'
  );
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [expandedIssueId, setExpandedIssueId] = React.useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = React.useState(false);
  const [expandedDetailsMap, setExpandedDetailsMap] = React.useState<Record<string, boolean>>({});

  const handleCopySubmissionId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Submission ID copied to clipboard');
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

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
        setShowConnectModal(false);
        client.invalidateQueries({ queryKey: queryKeyBase });
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
      : importStatusFilter === 'RESOLVED'
      ? 'RESOLVED'
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

  const retryMutation = useMutation({
    mutationFn: (importId: string) => metaLeadsApi.retry(importId),
    onSuccess: (data) => {
      if (data.status === 'IMPORTED') {
        toast.success('Lead processed and added to CRM successfully.');
      } else if (data.status === 'NEEDS_REVIEW') {
        toast.info('Enquiry re-checked and held for review: this contact already has an active CRM lead.');
      } else if (data.status === 'NEEDS_MAPPING') {
        toast.warning('Enquiry still needs field matching before it can be imported.');
      } else if (data.status === 'NEEDS_ASSIGNMENT') {
        toast.warning('Enquiry still needs branch assignment before it can be imported.');
      } else if (data.status === 'RESOLVED') {
        toast.info('Enquiry is marked as resolved.');
      } else {
        toast.warning(`Enquiry could not be imported: ${data.error_message || 'Check form settings and try again.'}`);
      }
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      metaLeadsApi.resolve(id, { reason, action: 'DISMISSED' }),
    onSuccess: () => {
      toast.success('Repeat enquiry marked as resolved. Existing CRM lead and tasks preserved.');
      setResolvingImportId(null);
      setResolveReason('Duplicate enquiry already handled by sales team');
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

  // Filter mappings by search and status
  const filteredMappings = allMappings.filter((m) => {
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

    if (formStatusFilter === 'ACTIVE' && !m.is_active) return false;
    if (formStatusFilter === 'PAUSED' && m.is_active) return false;

    return true;
  });

  // Client-side pagination for lead forms
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
    if (importStatusFilter === 'RESOLVED') {
      return item.status === 'RESOLVED';
    }
    if (importStatusFilter === 'FAILED') {
      return item.status === 'FAILED';
    }
    return true;
  });

  // Connection and Setup Progress state
  const isPlatformConfigured = Boolean(meta.meta_app_configured || meta.app_id_configured);
  const hasConnectPermission = canEdit;
  const canConnect = isPlatformConfigured && hasConnectPermission;

  const isConnectionActive = Boolean(
    meta.is_connected &&
      (meta.connection_status === 'CONNECTED' || meta.connection_status === 'LIVE_CONNECTED') &&
      !meta.is_synthetic &&
      meta.connection_status !== 'TOKEN_EXPIRED'
  );
  const isConnectionAttention = meta.connection_status === 'TOKEN_EXPIRED';
  const hasActiveForms = allMappings.some((m) => m.is_active);
  const hasReceivedEnquiries = allImports.some((i) => i.status === 'IMPORTED');

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden">
      {/* 1. Header & Connection Status */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Facebook & Instagram Leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Receive enquiries from Facebook and Instagram and send them to the right branch and team.
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
                ? 'Your Facebook connection has expired or permissions were updated. Please reconnect to continue receiving enquiries.'
                : 'Connect your Facebook account to access your gym’s lead forms and start receiving enquiries automatically.'}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {isConnectionActive ? (
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canEdit || disconnectMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Are you sure you want to disconnect Facebook? Incoming enquiries from your forms will be paused.'
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

        {/* Restricted Diagnostic View */}
        {canEdit && (
          <details className="mt-3 pt-3 border-t text-xs text-muted-foreground group">
            <summary className="cursor-pointer font-medium hover:text-foreground inline-flex items-center gap-1.5 select-none">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Connection details</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3 pb-1">
              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Account Status</span>
                <p>Status: {meta.connection_status === 'LIVE_CONNECTED' || meta.connection_status === 'CONNECTED' ? 'Active' : meta.connection_status}</p>
                <p>Authorized user: {meta.connection?.meta_user_name || 'None'}</p>
              </div>

              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Token Security</span>
                <p>Storage: Encrypted at rest</p>
                <p>
                  Token valid until:{' '}
                  {meta.connection?.expires_at
                    ? new Date(meta.connection.expires_at).toLocaleDateString()
                    : 'Standard active token'}
                </p>
              </div>

              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Pages & Webhooks</span>
                <p>Connected pages: {meta.pages?.length || 0}</p>
                <p>Webhook reception: {meta.live_available ? 'Configured' : 'Pending platform setup'}</p>
              </div>
            </div>
          </details>
        )}
      </section>

      {/* 2. Three Clear Setup Steps */}
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

          {/* Step 2: Choose your forms */}
          <div
            className={`rounded-lg border p-4 space-y-2 transition-all ${
              hasActiveForms
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                : allMappings.length > 0
                ? 'border-border bg-card'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Step 2</span>
              {hasActiveForms ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Completed
                </span>
              ) : allMappings.length > 0 ? (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Forms paused
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">To do</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">Choose your forms</h3>
            <p className="text-xs text-muted-foreground">
              {hasActiveForms
                ? `${allMappings.filter((m) => m.is_active).length} form(s) active and routing enquiries`
                : allMappings.length > 0
                ? 'Lead forms are configured but currently paused'
                : 'Match questions to CRM fields and choose branch'}
            </p>
          </div>

          {/* Step 3: Receive enquiries */}
          <div
            className={`rounded-lg border p-4 space-y-2 transition-all ${
              hasReceivedEnquiries
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Step 3</span>
              {hasReceivedEnquiries ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">Waiting for enquiries</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">Receive enquiries</h3>
            <p className="text-xs text-muted-foreground">
              {hasReceivedEnquiries
                ? 'Incoming enquiries are being received and sent to CRM'
                : isConnectionActive
                ? 'Connected. Enquiries from published Facebook ads will arrive here'
                : 'Connect Facebook and activate forms to receive enquiries'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Form Editor Modal */}
      {editing !== undefined && (
        <MappingEditor
          key={editing?.id || 'new'}
          mapping={editing}
          metadata={meta}
          canEdit={canEdit}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void refreshAll();
          }}
        />
      )}

      {/* 4. Lead forms */}
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

        {/* Search & Status Filters */}
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

          <div className="flex items-center rounded-md border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                formStatusFilter === 'ALL'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setFormStatusFilter('ALL');
                setFormPage(1);
              }}
            >
              All forms
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
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
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
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

        {/* Lead Form Cards Grid */}
        {mappingsQuery.isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading lead forms...</div>
        ) : filteredMappings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {allMappings.length === 0 ? 'No lead forms connected' : 'No lead forms match your search'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {allMappings.length === 0
                ? 'Click "Set up a form" to connect your first lead form to CRM.'
                : 'Try adjusting your search or status filter to find what you are looking for.'}
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
              const isDetailsExpanded = !!expandedDetailsMap[mapping.id];

              return (
                <article
                  key={mapping.id}
                  className={`rounded-xl border bg-card p-4 sm:p-5 space-y-3.5 shadow-sm transition-all ${
                    mapping.is_active ? 'border-border' : 'border-dashed opacity-85'
                  }`}
                >
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
                      </div>

                      {pageName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Facebook Page: <strong className="text-foreground">{pageName}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

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

                  {/* Expandable Details */}
                  <div className="text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
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

                  {/* Actions: Edit, Change history, Pause/Resume */}
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

      {/* 5. Recent enquiries */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent enquiries</h2>
            <p className="text-xs text-muted-foreground">
              Track incoming enquiries from your Facebook and Instagram lead forms.
            </p>
          </div>

          {/* Plain Status Filter Tabs */}
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
              All
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
              Needs attention
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
              Added to leads
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                importStatusFilter === 'RESOLVED'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setImportStatusFilter('RESOLVED');
                setImportPage(1);
              }}
            >
              Resolved
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
              Could not add
            </button>
          </div>
        </div>

        {importsQuery.isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading recent enquiries...</div>
        ) : displayedImports.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {allImports.length === 0 ? 'No enquiries received yet' : 'No enquiries match your filter'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {allImports.length === 0
                ? 'Incoming enquiries from your Facebook and Instagram forms will show up here in real time.'
                : 'Try selecting another status filter to view other enquiries.'}
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

              const isAdded = item.status === 'IMPORTED';
              const isPending = item.status === 'PENDING';
              const isNeedsAttention = ['NEEDS_MAPPING', 'NEEDS_ASSIGNMENT', 'NEEDS_REVIEW'].includes(
                item.status
              );
              const isResolved = item.status === 'RESOLVED';
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
                        {isAdded && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Added to leads
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
                            Needs attention
                          </Badge>
                        )}
                        {isResolved && (
                          <Badge className="bg-slate-700 hover:bg-slate-800 text-white gap-1 text-xs">
                            <CheckCheck className="h-3 w-3 text-emerald-400" />
                            Resolved
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Could not add
                          </Badge>
                        )}

                        <span className="text-xs text-muted-foreground">
                          {new Date(item.received_at).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground font-medium">
                          <span>
                            {leadName ? <strong>{leadName}</strong> : <span className="text-muted-foreground">Lead Form Enquiry</span>}
                          </span>
                          <span className="text-muted-foreground font-normal">•</span>
                          <span className="text-muted-foreground font-normal">
                            Form: <strong className="text-foreground">{formDisplayName}</strong>
                          </span>
                          {branchDisplayName && (
                            <>
                              <span className="text-muted-foreground font-normal">•</span>
                              <span className="text-muted-foreground font-normal">
                                Branch: <strong className="text-foreground">{branchDisplayName}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Submission ID:</span>
                          <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px] text-foreground select-all">
                            {item.external_lead_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopySubmissionId(item.external_lead_id)}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                            title="Copy complete submission ID"
                          >
                            {copiedId === item.external_lead_id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

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

                      {item.matched_lead && !item.lead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/crm/leads?search=${encodeURIComponent(item.matched_lead!.id)}`;
                          }}
                          className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          View existing lead
                        </Button>
                      )}

                      {(isNeedsAttention || isFailed || isResolved) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedIssueId(isIssueExpanded ? null : item.id)}
                          className="gap-1 text-xs"
                        >
                          {isResolved ? (
                            <>
                              <CheckCheck className="h-3.5 w-3.5 text-slate-600" />
                              {isIssueExpanded ? 'Hide details' : 'View resolution'}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              {isIssueExpanded ? 'Hide issue' : 'View issue'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Issue / Resolution Banner */}
                  {isIssueExpanded && (
                    <div
                      className={`rounded-lg border p-3.5 space-y-3 text-xs ${
                        isResolved
                          ? 'border-slate-300 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100'
                          : 'border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">
                            {item.status === 'NEEDS_MAPPING'
                              ? 'Question match required'
                              : item.status === 'NEEDS_ASSIGNMENT'
                              ? 'Branch routing required'
                              : item.status === 'NEEDS_REVIEW'
                              ? 'Repeat enquiry review'
                              : item.status === 'RESOLVED'
                              ? 'Repeat enquiry resolved'
                              : 'Could not add enquiry'}
                          </p>
                          <p className="text-muted-foreground">
                            {item.status === 'NEEDS_MAPPING'
                              ? 'This enquiry could not be automatically saved because the form is missing field matches for required CRM contact details.'
                              : item.status === 'NEEDS_ASSIGNMENT'
                              ? "The prospect's form answer did not match any assigned branch, and no fallback branch is configured."
                              : item.status === 'NEEDS_REVIEW'
                              ? 'This person has enquired before. The enquiry was held to prevent unintentional duplicate leads.'
                              : item.status === 'RESOLVED'
                              ? 'This submission was reviewed and marked as resolved. Existing CRM lead and tasks were preserved.'
                              : item.error_message || 'The enquiry could not be processed due to a validation error.'}
                          </p>
                        </div>

                        {canEdit && !isResolved && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={retryMutation.isPending || resolveMutation.isPending}
                              onClick={() => retryMutation.mutate(item.id)}
                              className="shrink-0 gap-1.5"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Retry enquiry
                            </Button>

                            {item.status === 'NEEDS_REVIEW' && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={resolveMutation.isPending}
                                onClick={() =>
                                  setResolvingImportId(resolvingImportId === item.id ? null : item.id)
                                }
                                className="shrink-0 gap-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                {resolvingImportId === item.id ? 'Cancel' : 'Resolve repeat enquiry'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Matching Existing Lead Details Card */}
                      {item.matched_lead && (
                        <div className="rounded-md border border-primary/20 bg-background/90 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-foreground text-sm">
                                Matching CRM Lead: {item.matched_lead.name}
                              </span>
                              {item.matched_lead.status && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                  {item.matched_lead.status}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.location.href = `/crm/leads?search=${encodeURIComponent(
                                  item.matched_lead!.id
                                )}`;
                              }}
                              className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View existing lead
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {item.matched_lead.phone && (
                              <span>
                                Phone: <strong className="font-mono text-foreground">{item.matched_lead.phone}</strong>
                              </span>
                            )}
                            {item.matched_lead.email && (
                              <span>
                                Email: <strong className="text-foreground">{item.matched_lead.email}</strong>
                              </span>
                            )}
                            {item.matched_lead.created_at && (
                              <span>
                                Created: <strong>{new Date(item.matched_lead.created_at).toLocaleDateString()}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Inline Resolution Confirmation Form */}
                      {canEdit && resolvingImportId === item.id && (
                        <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-background p-3.5 space-y-3 shadow-xs">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Resolution Reason
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                              Select or describe why this repeat enquiry is being dismissed. It will be recorded in audit history without adding new leads or tasks.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'Duplicate enquiry already handled by sales team',
                              'Customer contacted via phone/WhatsApp directly',
                              'Existing active member inquiry',
                              'Spam or invalid submission',
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setResolveReason(preset)}
                                className={`text-[11px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                                  resolveReason === preset
                                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <Input
                            value={resolveReason}
                            onChange={(e) => setResolveReason(e.target.value)}
                            placeholder="Enter custom resolution reason..."
                            className="text-xs h-8"
                          />

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={resolveMutation.isPending}
                              onClick={() => setResolvingImportId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={resolveMutation.isPending || !resolveReason.trim()}
                              onClick={() =>
                                resolveMutation.mutate({ id: item.id, reason: resolveReason.trim() })
                              }
                              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <Check className="h-3 w-3" />
                              {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Display Resolution Summary if Resolved */}
                      {isResolved && item.resolution && (
                        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-background/80 p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Resolution Audit Details</span>
                          </div>
                          <p className="text-xs text-foreground">
                            Reason: <span className="font-medium">{item.resolution.reason}</span>
                          </p>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                            <span>
                              Resolved by: <strong className="text-foreground">{item.resolution.resolved_by_name}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              When:{' '}
                              <strong>
                                {new Date(item.resolution.resolved_at).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              CRM lead and follow-up tasks preserved
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Readable Incoming Form Answers (replaces raw JSON) */}
                  {item.field_data && item.field_data.length > 0 && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <span className="font-semibold text-xs text-foreground">Incoming form answers</span>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                        {item.field_data.map((f, i) => (
                          <div key={i} className="bg-background rounded p-2 border">
                            <span className="text-[11px] text-muted-foreground block capitalize">
                              {f.name.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-medium text-foreground">{f.values?.join(', ') || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Restricted Support Diagnostics (gated on canEdit) */}
                  {canEdit && (
                    <details className="text-xs text-muted-foreground pt-1 border-t group">
                      <summary className="cursor-pointer hover:text-foreground font-medium inline-flex items-center gap-1 select-none">
                        <span>Support diagnostics</span>
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 pt-2.5 text-[11px]">
                        <div className="rounded border bg-muted/20 p-2">
                          <span className="text-muted-foreground block">Form ID:</span>
                          <code className="font-mono text-foreground font-medium">{item.form_id || '—'}</code>
                        </div>
                        <div className="rounded border bg-muted/20 p-2">
                          <span className="text-muted-foreground block">Page ID:</span>
                          <code className="font-mono text-foreground font-medium">{item.page_id || '—'}</code>
                        </div>
                        <div className="rounded border bg-muted/20 p-2">
                          <span className="text-muted-foreground block">Campaign:</span>
                          <span className="text-foreground font-medium">{item.campaign_name || 'Direct / None'}</span>
                        </div>
                        <div className="rounded border bg-muted/20 p-2">
                          <span className="text-muted-foreground block">Delivery Status:</span>
                          <span className="text-foreground font-medium">{item.status}</span>
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

      {/* 6. Facebook Connection Modal */}
      {showConnectModal && (
        <MetaOAuthModal
          onClose={() => setShowConnectModal(false)}
          onSuccess={() => {
            setShowConnectModal(false);
            void refreshAll();
          }}
        />
      )}

      {/* 7. Mapping History Modal */}
      {historyMapping && (
        <MappingHistoryModal
          mapping={historyMapping}
          onClose={() => setHistoryMapping(null)}
        />
      )}
    </div>
  );
}


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

    if (!pageId.trim() || !/^\d+$/.test(pageId.trim())) {
      toast.error('Facebook Page ID must contain digits only.');
      return;
    }

    if (!formId.trim() || !/^\d+$/.test(formId.trim())) {
      toast.error('Facebook Form ID must contain digits only.');
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
                onChange={(e) => setPageId(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Facebook Page ID (digits only)"
                inputMode="numeric"
                pattern="[0-9]*"
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
                onChange={(e) => setFormId(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Facebook Form ID (digits only)"
                inputMode="numeric"
                pattern="[0-9]*"
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

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
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  ShieldAlert,
  Settings2,
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
  Globe,
  Radio,
  Check,
  Send,
  Zap,
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

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'IMPORTED':
      return 'default';
    case 'NEEDS_MAPPING':
    case 'NEEDS_ASSIGNMENT':
    case 'NEEDS_REVIEW':
      return 'secondary';
    case 'FAILED':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

// ===========================================================================
// Main Component
// ===========================================================================
export function MetaLeadSettings({ canEdit }: { canEdit: boolean }) {
  const { tenantId } = useApp();
  const client = useQueryClient();
  const queryKeyBase = ['meta-leads', tenantId];

  const [mappingPage, setMappingPage] = React.useState(1);
  const [importPage, setImportPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const [editing, setEditing] = React.useState<MetaMapping | null | undefined>(undefined);
  const [historyMapping, setHistoryMapping] = React.useState<MetaMapping | null>(null);
  const [selected, setSelected] = React.useState<MetaMapping | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = React.useState('');
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<MetaImport | null>(null);
  const [showConnectModal, setShowConnectModal] = React.useState(false);
  const [testTab, setTestTab] = React.useState<'SIMULATOR' | 'LIVE_WEBHOOK'>('SIMULATOR');

  const metadataQuery = useQuery({
    queryKey: [...queryKeyBase, 'metadata'],
    queryFn: metaLeadsApi.metadata,
  });

  const mappingsQuery = useQuery({
    queryKey: [...queryKeyBase, 'mappings', mappingPage],
    queryFn: () => metaLeadsApi.mappings(mappingPage),
  });

  const filterParam = statusFilter === 'ALL' ? undefined : statusFilter === 'NEEDS_ATTENTION' ? undefined : statusFilter;
  const importsQuery = useQuery({
    queryKey: [...queryKeyBase, 'imports', importPage, statusFilter],
    queryFn: () => metaLeadsApi.imports(importPage, filterParam),
  });

  const detailQuery = useQuery({
    queryKey: [...queryKeyBase, 'detail', detailId],
    queryFn: () => metaLeadsApi.detail(detailId!),
    enabled: !!detailId,
  });

  const refreshAll = () => client.invalidateQueries({ queryKey: queryKeyBase });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active, version }: { id: string; is_active: boolean; version: number }) =>
      metaLeadsApi.toggleActive(id, is_active, version),
    onSuccess: (data) => {
      toast.success(`Form mapping ${data.name} is now ${data.is_active ? 'active' : 'paused'}.`);
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const simulateMutation = useMutation({
    mutationFn: metaLeadsApi.simulate,
    onSuccess: (data) => {
      setResult(data);
      if (data.status === 'IMPORTED') {
        toast.success(`Simulator delivery imported successfully as CRM Lead ID ${data.lead || 'N/A'}`);
      } else {
        toast.warning(`Simulator intake saved with status: ${statusLabel(data.status)}`);
      }
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const retryMutation = useMutation({
    mutationFn: (importId: string) => metaLeadsApi.retry(importId),
    onSuccess: (data) => {
      toast.success(`Re-processed event: ${statusLabel(data.status)}`);
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  const disconnectMutation = useMutation({
    mutationFn: metaLeadsApi.disconnect,
    onSuccess: () => {
      toast.success('Meta account disconnected successfully.');
      void refreshAll();
    },
    onError: (e) => toast.error(formatError(e)),
  });

  if (metadataQuery.isPending) {
    return <CRMLoadingState message="Loading Meta Lead Ads configuration..." />;
  }

  if (metadataQuery.isError) {
    return (
      <CRMErrorState
        title="Cannot load Meta settings"
        message={formatError(metadataQuery.error)}
        onRetry={() => metadataQuery.refetch()}
      />
    );
  }

  const meta = metadataQuery.data;

  // Derive questions required for simulation from the selected mapping
  const questions = selected
    ? [
        ...new Set([
          ...Object.values(selected.field_mappings),
          ...(selected.branch_mode === 'ANSWER' && selected.branch_field ? [selected.branch_field] : []),
        ]),
      ]
    : [];

  // Client-side filtering if NEEDS_ATTENTION tab selected
  const displayedImports = importsQuery.data?.results.filter((item) => {
    if (statusFilter === 'NEEDS_ATTENTION') {
      return ['NEEDS_MAPPING', 'NEEDS_ASSIGNMENT', 'NEEDS_REVIEW', 'FAILED'].includes(item.status);
    }
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7-Step Setup Guide / Stepper Banner                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              ✓
            </span>
            <h2 className="font-semibold text-base">Meta Lead Ads Setup Flow</h2>
          </div>
          <Badge variant="outline" className="text-xs">
            Multi-Tenant Isolated: {tenantId || 'SWEAT'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 text-xs">
          {[
            { step: '1', title: 'Connect Account', active: meta.is_connected, desc: 'OAuth & Scopes' },
            { step: '2', title: 'Choose Page/Form', active: (mappingsQuery.data?.results.length ?? 0) > 0, desc: 'Meta Page & Form' },
            { step: '3', title: 'Match Fields', active: (mappingsQuery.data?.results.length ?? 0) > 0, desc: 'Name & Contact' },
            { step: '4', title: 'Branch Routing', active: true, desc: 'Fixed or Answer' },
            { step: '5', title: 'Follow-up Rules', active: true, desc: 'Stage & Tasks' },
            { step: '6', title: 'Test Intake', active: (importsQuery.data?.results.length ?? 0) > 0, desc: 'Sandbox & Live' },
            { step: '7', title: 'Enable Live', active: mappingsQuery.data?.results.some((m) => m.is_active) ?? false, desc: 'Active & Verified' },
          ].map((item) => (
            <div
              key={item.step}
              className={`rounded-lg border p-2.5 space-y-1 transition-colors ${
                item.active
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                  : 'border-muted bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs ${item.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  Step {item.step}
                </span>
                {item.active && <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <p className="font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Step 1: Meta Account Connection Card                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Meta Account Connection
              </h3>
              <Badge
                variant={meta.is_connected ? 'default' : meta.connection_status === 'TOKEN_EXPIRED' ? 'destructive' : 'outline'}
                className="px-2.5 py-0.5 text-xs font-semibold"
              >
                {meta.is_connected
                  ? 'Live Connected'
                  : meta.connection_status === 'TOKEN_EXPIRED'
                  ? 'Token Expired'
                  : 'Not Connected (Simulator Active)'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Securely authenticate your Facebook Business Page to discover Lead Gen forms and enable real-time webhook ingestion.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {meta.is_connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || disconnectMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to disconnect this Meta account? Incoming live leads will be paused.')) {
                      disconnectMutation.mutate();
                    }
                  }}
                >
                  Disconnect
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => setShowConnectModal(true)}
                >
                  Reconnect
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                disabled={!canEdit}
                onClick={() => setShowConnectModal(true)}
                className="gap-1.5"
              >
                <Link2 className="h-4 w-4" />
                Connect Meta Account
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => void refreshAll()} title="Refresh settings">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection details / Diagnostic strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Authorized Meta User</span>
            <p className="text-sm font-semibold text-foreground truncate">
              {meta.connection?.meta_user_name || 'No account connected'}
            </p>
            <p className="text-xs text-muted-foreground">
              {meta.connection?.meta_user_id ? `User ID: ${meta.connection.meta_user_id}` : 'Tenant sandbox mode'}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Token Security & Expiry</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              AES-128 Fernet Encrypted
            </p>
            <p className="text-xs text-muted-foreground">
              {meta.connection?.masked_access_token ? `Token: ${meta.connection.masked_access_token}` : 'Zero plaintext in DB'}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Granted Meta Scopes</span>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {meta.connection?.scopes && meta.connection.scopes.length > 0 ? (
                meta.connection.scopes.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {s}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">pages_show_list, leads_retrieval</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Outbound Comms Protection</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Protected & Isolated
            </p>
            <p className="text-xs text-muted-foreground">
              Test leads never receive real emails, WhatsApp, or SMS.
            </p>
          </div>
        </div>

        {!meta.meta_app_configured && (
          <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Platform App Credentials Pending</p>
              <p className="mt-0.5">
                The Meta App ID and Secret (<code>META_APP_ID</code> and <code>META_APP_SECRET</code>) must be configured in your environment before live OAuth callbacks can complete. In the meantime, full offline simulation and development workflows are active.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Form Mappings Section (Steps 2, 3, 4, 5, 7)                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">Connected Forms & Mappings</h3>
            <p className="text-xs text-muted-foreground">
              Define which CRM branch, lead source, initial pipeline stage, and follow-up tasks apply to each incoming form.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={!canEdit} onClick={() => setEditing(null)}>
              + Add Form Mapping
            </Button>
          </div>
        </div>

        {/* Inline Mapping Editor Modal/Card */}
        {editing !== undefined && (
          <MappingEditor
            key={editing?.id || 'new'}
            mapping={editing}
            metadata={meta}
            canEdit={canEdit}
            onClose={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined);
              setSelected(null);
              void refreshAll();
            }}
          />
        )}

        {/* Change History Modal */}
        {historyMapping && (
          <MappingHistoryModal
            mapping={historyMapping}
            onClose={() => setHistoryMapping(null)}
          />
        )}

        {mappingsQuery.isPending ? (
          <CRMLoadingState message="Loading form mappings..." />
        ) : mappingsQuery.isError ? (
          <CRMErrorState
            title="Cannot load form mappings"
            message={formatError(mappingsQuery.error)}
            onRetry={() => mappingsQuery.refetch()}
          />
        ) : (
          <>
            {!mappingsQuery.data.results.length && (
              <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold">No Meta form mappings created yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click "+ Add Form Mapping" above to link a Facebook Page and Lead Form to your CRM branches and pipelines.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {mappingsQuery.data.results.map((mapping) => {
                const branchName =
                  mapping.branch_mode === 'FIXED'
                    ? meta.branches.find((b) => b.id === mapping.branch)?.name || 'Default Branch'
                    : `Dynamic (${Object.keys(mapping.branch_answers).length} routed answers)`;
                const sourceName = meta.lead_sources.find((s) => s.id === mapping.lead_source)?.name || mapping.lead_source;
                const assignedUser = meta.eligible_users?.find((u) => u.id === mapping.assigned_sales_user)?.name;

                return (
                  <article
                    key={mapping.id}
                    className={`rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-sm transition-all ${
                      mapping.is_active ? 'border-border' : 'border-dashed opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">{mapping.name}</h4>
                          <Badge variant={mapping.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {mapping.is_active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            v{mapping.version}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span>Page: <code className="bg-muted px-1 py-0.5 rounded">{mapping.page_id}</code></span>
                          <span>Form: <code className="bg-muted px-1 py-0.5 rounded">{mapping.form_id}</code></span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y py-2.5">
                      <div>
                        <span className="text-muted-foreground">Routing:</span>
                        <p className="font-medium text-foreground">{branchName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lead Source:</span>
                        <p className="font-medium text-foreground">{sourceName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Initial Stage:</span>
                        <p className="font-medium text-foreground">
                          {statusLabel(mapping.initial_stage || 'NEW_LEAD')}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sales Assignment:</span>
                        <p className="font-medium text-foreground">
                          {mapping.assignment_mode === 'SPECIFIC_USER'
                            ? assignedUser || 'Specific User'
                            : 'Tenant Policy'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
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
                          title="View configuration audit history"
                        >
                          <History className="h-3.5 w-3.5 mr-1" />
                          History
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant={mapping.is_active ? 'ghost' : 'outline'}
                          size="sm"
                          disabled={!canEdit || toggleActiveMutation.isPending}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: mapping.id,
                              is_active: !mapping.is_active,
                              version: mapping.version,
                            })
                          }
                          title={mapping.is_active ? 'Pause this mapping' : 'Enable this mapping'}
                        >
                          {mapping.is_active ? (
                            <>
                              <Pause className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              Enable
                            </>
                          )}
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          disabled={!canEdit || !mapping.is_active}
                          onClick={() => {
                            setSelected(mapping);
                            setAnswers({});
                            setSubmissionId(crypto.randomUUID());
                            setResult(null);
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

            <Pagination
              page={mappingPage}
              previous={!!mappingsQuery.data.previous}
              next={!!mappingsQuery.data.next}
              change={setMappingPage}
              count={mappingsQuery.data.count}
            />
          </>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Step 6: Acceptance Testing & Intake Simulator                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selected && (
        <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span>Acceptance Testing for:</span>
                <span className="text-primary">{selected.name}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify lead intake, mapping, duplicate prevention, and attribution without live ad spend.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Test Tabs */}
          <div className="flex items-center gap-2 border-b pb-2 text-xs">
            <button
              type="button"
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                testTab === 'SIMULATOR'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setTestTab('SIMULATOR')}
            >
              Development Simulator (Offline)
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                testTab === 'LIVE_WEBHOOK'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setTestTab('LIVE_WEBHOOK')}
            >
              Live Meta Webhook (Production)
            </button>
          </div>

          {testTab === 'SIMULATOR' ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                simulateMutation.mutate({
                  page_id: selected.page_id,
                  form_id: selected.form_id,
                  external_lead_id: submissionId,
                  field_data: questions.map((name) => ({ name, values: [answers[name] || ''] })),
                });
              }}
            >
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Development Simulator Safety Guarantees:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                  <li>Creates real CRM records in your tenant database for full lifecycle verification.</li>
                  <li>Attribution records are marked with <code>raw_metadata.is_test = true</code>.</li>
                  <li>Outbound communications (WhatsApp, Email, SMS) are strictly disabled for simulated leads.</li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  <span>Simulation External Lead ID:</span>
                  <Input
                    value={submissionId}
                    onChange={(e) => setSubmissionId(e.target.value)}
                    placeholder="e.g. sim-lead-001"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Change this value to test a new enquiry, or keep the same value to verify duplicate rejection.
                  </span>
                </label>
              </div>

              <div className="border-t pt-3 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Simulate Form Questions & Answers
                </h4>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {questions.map((question) => (
                    <label key={question} className={labelClass}>
                      <span className="truncate" title={question}>
                        Question: <code className="text-xs">{question}</code>
                      </span>
                      <Input
                        value={answers[question] || ''}
                        onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })}
                        placeholder={`Answer for ${question}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sample: Record<string, string> = {};
                    questions.forEach((q) => {
                      if (q.includes('name')) sample[q] = 'Simulated Prospect';
                      else if (q.includes('email')) sample[q] = 'prospect.sim@example.test';
                      else if (q.includes('phone')) sample[q] = '+919876543210';
                      else if (q.includes('city') || q.includes('location')) sample[q] = 'Andheri';
                      else sample[q] = 'Yes';
                    });
                    setAnswers(sample);
                    toast.info('Populated standard test responses.');
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                  Fill Sample Answers
                </Button>

                <Button type="submit" disabled={simulateMutation.isPending} className="gap-1.5">
                  <Send className="h-4 w-4" />
                  {simulateMutation.isPending ? 'Ingesting Event...' : 'Submit Simulated Intake'}
                </Button>
              </div>

              {result && (
                <div
                  className={`rounded-lg border p-4 text-xs space-y-2 ${
                    result.status === 'IMPORTED'
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                      : 'border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Intake Result: {statusLabel(result.status)}</span>
                    <Badge variant={statusBadgeVariant(result.status)}>{result.status}</Badge>
                  </div>
                  <p>
                    <strong>Import ID:</strong> <code className="bg-background px-1 py-0.5 rounded">{result.id}</code>
                  </p>
                  {result.lead && (
                    <p>
                      <strong>CRM Lead Created:</strong>{' '}
                      <code className="bg-background px-1 py-0.5 rounded text-primary font-bold">{result.lead}</code>
                    </p>
                  )}
                  {result.error_message && (
                    <p className="text-destructive">
                      <strong>Issue:</strong> {result.error_message}
                    </p>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Live Webhook Integration Verification
                </h4>
                <p className="text-muted-foreground">
                  Meta delivers live lead advertisements via HTTPS webhooks directly to your platform endpoint. Each delivery is signed with HMAC-SHA256 using your App Secret and processed asynchronously via Celery.
                </p>

                <div className="grid gap-2 pt-2 sm:grid-cols-2">
                  <div className="rounded border bg-background p-2.5 space-y-1">
                    <span className="text-muted-foreground font-medium">Callback Webhook URL:</span>
                    <p className="font-mono text-xs select-all text-primary font-semibold break-all">
                      {window.location.origin}/api/v1/webhooks/meta/leads/
                    </p>
                  </div>
                  <div className="rounded border bg-background p-2.5 space-y-1">
                    <span className="text-muted-foreground font-medium">Verify Token:</span>
                    <p className="font-mono text-xs select-all font-semibold">
                      Configured in META_WEBHOOK_VERIFY_TOKEN
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <span className="font-semibold text-foreground">How to run a live acceptance test with Meta:</span>
                <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                  <li>Ensure your Meta App webhook is subscribed to the <code>leadgen</code> topic for Page <code>{selected.page_id}</code>.</li>
                  <li>Open the official <a href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Meta Lead Ads Testing Tool <ExternalLink className="h-3 w-3" /></a>.</li>
                  <li>Select Page ID <code>{selected.page_id}</code> and Form ID <code>{selected.form_id}</code>.</li>
                  <li>Click <strong>Create Lead</strong>. Meta sends a live webhook payload.</li>
                  <li>Refresh the Ingestion Log below to inspect the imported event, campaign attribution, and created CRM lead.</li>
                </ol>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Ingestion History & Delivery Audit Table                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">Meta Lead Ingestion Audit Log</h3>
            <p className="text-xs text-muted-foreground">
              Real-time delivery log showing webhook events, deduplication, retry tracking, and attribution capture.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className={controlClass}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setImportPage(1);
              }}
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="NEEDS_ATTENTION">Needs Attention (Unmapped / Review / Failed)</option>
              <option value="IMPORTED">Imported</option>
              <option value="NEEDS_MAPPING">Needs Mapping</option>
              <option value="NEEDS_ASSIGNMENT">Needs Assignment</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {importsQuery.isPending ? (
          <CRMLoadingState message="Loading intake history..." />
        ) : importsQuery.isError ? (
          <CRMErrorState
            title="Cannot load ingestion logs"
            message={formatError(importsQuery.error)}
            onRetry={() => importsQuery.refetch()}
          />
        ) : (
          <>
            {!displayedImports.length && (
              <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold">No Meta intake events recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When a prospect submits a lead form or you run a test enquiry, delivery records will appear here.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {displayedImports.map((item) => {
                const isLive = item.mode === 'LIVE';
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border bg-card p-4 text-xs space-y-3 shadow-sm hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadgeVariant(item.status)} className="text-[11px]">
                            {statusLabel(item.status)}
                          </Badge>
                          <Badge
                            variant={isLive ? 'default' : 'outline'}
                            className={`text-[10px] ${isLive ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-amber-700 dark:text-amber-400'}`}
                          >
                            {isLive ? 'LIVE' : 'SIMULATOR'}
                          </Badge>
                          {item.duplicate_delivery && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                              Duplicate Delivery
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            {new Date(item.received_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground">
                          <span>Lead ID: <code className="bg-muted px-1 py-0.5 rounded font-mono">{item.external_lead_id}</code></span>
                          <span>Page: <code className="bg-muted px-1 py-0.5 rounded font-mono">{item.page_id}</code></span>
                          <span>Form: <code className="bg-muted px-1 py-0.5 rounded font-mono">{item.form_id}</code></span>
                        </div>
                        {(item.campaign_name || item.ad_name) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-muted-foreground font-medium">Attribution:</span>
                            {item.campaign_name && (
                              <Badge variant="secondary" className="text-[10px]">
                                Campaign: {item.campaign_name}
                              </Badge>
                            )}
                            {item.ad_name && (
                              <Badge variant="secondary" className="text-[10px]">
                                Ad: {item.ad_name}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.lead && (
                          <span className="font-semibold text-primary">
                            CRM Lead: <code className="bg-primary/10 px-1.5 py-0.5 rounded">{item.lead}</code>
                          </span>
                        )}
                        {['FAILED', 'NEEDS_MAPPING', 'NEEDS_REVIEW'].includes(item.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canEdit || retryMutation.isPending}
                            onClick={() => retryMutation.mutate(item.id)}
                            title="Retry ingestion pipeline"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailId(detailId === item.id ? null : item.id)}
                        >
                          {detailId === item.id ? 'Hide Payload' : 'View Payload'}
                        </Button>
                      </div>
                    </div>

                    {item.error_message && (
                      <div className="rounded border border-destructive/20 bg-destructive/10 p-2.5 text-destructive flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Failure Reason:</strong> {item.error_message}
                        </div>
                      </div>
                    )}

                    {/* Detailed payload expansion */}
                    {detailId === item.id && (
                      <div className="border-t pt-3 space-y-3">
                        {detailQuery.isPending ? (
                          <p className="text-muted-foreground">Loading payload details...</p>
                        ) : detailQuery.isError ? (
                          <p className="text-destructive">{formatError(detailQuery.error)}</p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded border bg-muted/30 p-2.5 space-y-1">
                              <span className="font-semibold text-foreground">Form Field Data Received:</span>
                              <pre className="overflow-x-auto text-[11px] p-2 bg-background rounded border">
                                {JSON.stringify(detailQuery.data?.field_data || [], null, 2)}
                              </pre>
                            </div>
                            <div className="rounded border bg-muted/30 p-2.5 space-y-1">
                              <span className="font-semibold text-foreground">Mapping Snapshot & Metadata:</span>
                              <pre className="overflow-x-auto text-[11px] p-2 bg-background rounded border">
                                {JSON.stringify(
                                  {
                                    mapping_snapshot: detailQuery.data?.mapping_snapshot,
                                    campaign_id: detailQuery.data?.campaign_id,
                                    campaign_name: detailQuery.data?.campaign_name,
                                    adset_id: detailQuery.data?.adset_id,
                                    ad_id: detailQuery.data?.ad_id,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <Pagination
              page={importPage}
              previous={!!importsQuery.data.previous}
              next={!!importsQuery.data.next}
              change={setImportPage}
              count={importsQuery.data.count}
            />
          </>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Meta OAuth Modal                                                    */}
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
    </div>
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
      toast.info('Meta authorization dialog opened. Complete login and copy authorization code if manual callback is required.');
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleCompleteCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      toast.error('Please enter the authorization code provided by Meta.');
      return;
    }
    try {
      setIsSubmittingCode(true);
      const res = await metaLeadsApi.oauthCallback(authCode.trim(), authState.trim());
      if (res.success) {
        toast.success(`Connected Meta account successfully: ${res.connection.meta_user_name}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Connect Meta Business Account</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Authorizing your Meta account grants the SWEAT platform secure access to retrieve your Facebook Pages, discovered Lead Ads forms, and real-time webhook subscriptions.
          </p>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <span className="font-semibold text-foreground">Requested Meta Permissions:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li><code>pages_show_list</code>: View your managed Facebook pages.</li>
              <li><code>leads_retrieval</code>: Securely fetch lead form answers and campaign details.</li>
              <li><code>pages_manage_metadata</code>: Automatically subscribe pages to live lead webhooks.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={handleLaunchOAuth}
              disabled={isLoadingAuth}
            >
              <ExternalLink className="h-4 w-4" />
              {isLoadingAuth ? 'Preparing OAuth...' : '1. Launch Meta Login Window'}
            </Button>
          </div>

          <form onSubmit={handleCompleteCallback} className="border-t pt-3 space-y-3">
            <span className="font-semibold text-foreground">
              2. Complete Connection via Authorization Code
            </span>
            <p className="text-muted-foreground">
              If the popup returns an authorization code or you are testing via UAT:
            </p>
            <div className="space-y-2">
              <Input
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Enter Authorization Code (code=...)"
                required
              />
              <Input
                value={authState}
                onChange={(e) => setAuthState(e.target.value)}
                placeholder="State token (auto-filled if dialog launched)"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingCode}>
                {isSubmittingCode ? 'Exchanging Token...' : 'Complete Connection'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Mapping History Modal
// ===========================================================================
function MappingHistoryModal({ mapping, onClose }: { mapping: MetaMapping; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['meta-mapping-history', mapping.id],
    queryFn: () => metaLeadsApi.auditHistory(mapping.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-base">Configuration Audit Trail: {mapping.name}</h3>
            <p className="text-xs text-muted-foreground">History of modifications, version updates, and status toggles.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
          {query.isPending ? (
            <p className="text-muted-foreground py-6 text-center">Loading audit history...</p>
          ) : query.isError ? (
            <p className="text-destructive py-6 text-center">{formatError(query.error)}</p>
          ) : !query.data?.results.length ? (
            <p className="text-muted-foreground py-6 text-center">No audit trail records found for this mapping.</p>
          ) : (
            query.data.results.map((log: MetaAuditHistoryItem) => (
              <div key={log.id} className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{statusLabel(log.action_code)}</span>
                  <span className="text-muted-foreground">{new Date(log.occurred_at).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-3">
                  <span>Actor: <strong>{log.actor_name}</strong> ({log.actor_type})</span>
                  {log.version && <span>Version: <strong>v{log.version}</strong></span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-3 flex justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Mapping Editor Form (Steps 2, 3, 4, 5, 7)
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
  const [active, setActive] = React.useState(mapping?.is_active ?? false);
  const [source, setSource] = React.useState(mapping?.lead_source || '');

  // Dynamic discovered Pages & Forms
  const [discoveredPages, setDiscoveredPages] = React.useState<MetaDiscoveredPage[]>(metadata.pages || []);
  const [discoveredForms, setDiscoveredForms] = React.useState<MetaDiscoveredForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = React.useState(false);
  const [isManualPageForm, setIsManualPageForm] = React.useState(!metadata.is_connected);

  // Branch routing states
  const [branchMode, setBranchMode] = React.useState<MetaMapping['branch_mode']>(mapping?.branch_mode || 'FIXED');
  const [branch, setBranch] = React.useState(mapping?.branch || '');
  const [branchField, setBranchField] = React.useState(mapping?.branch_field || '');
  const [routes, setRoutes] = React.useState(
    Object.entries(mapping?.branch_answers || {}).map(([answer, branchId]) => ({ answer, branchId }))
  );
  const [unmatchedBranchPolicy, setUnmatchedBranchPolicy] = React.useState<'HOLD' | 'FALLBACK_BRANCH'>(
    mapping?.unmatched_branch_policy || 'HOLD'
  );
  const [fallbackBranch, setFallbackBranch] = React.useState(mapping?.fallback_branch || '');

  // Lead handling states
  const [initialStage, setInitialStage] = React.useState(mapping?.initial_stage || 'NEW_LEAD');
  const [repeatPolicy, setRepeatPolicy] = React.useState<MetaMapping['repeat_policy']>(mapping?.repeat_policy || 'REVIEW');
  const [assignmentMode, setAssignmentMode] = React.useState<'TENANT_POLICY' | 'SPECIFIC_USER'>(
    mapping?.assignment_mode || 'TENANT_POLICY'
  );
  const [assignedSalesUser, setAssignedSalesUser] = React.useState(mapping?.assigned_sales_user || '');

  // Field mappings & defaults states
  const [fields, setFields] = React.useState(
    Object.entries(mapping?.field_mappings || {}).map(([destination, question]) => ({ destination, question }))
  );
  const [defaults, setDefaults] = React.useState(
    Object.entries(mapping?.field_defaults || {}).map(([destination, value]) => ({ destination, value }))
  );
  const [showDefaults, setShowDefaults] = React.useState<boolean>(
    Boolean(mapping?.field_defaults && Object.keys(mapping.field_defaults).length > 0)
  );

  // Follow-up task automation states
  const [createFollowup, setCreateFollowup] = React.useState(mapping?.create_followup_task ?? false);
  const [followupType, setFollowupType] = React.useState(mapping?.followup_task_type || 'CALL');
  const [followupHours, setFollowupHours] = React.useState(mapping?.followup_due_hours || 24);

  // Version conflict detection state
  const [versionConflict, setVersionConflict] = React.useState<string | null>(null);

  // Fetch forms when pageId changes and connected
  React.useEffect(() => {
    if (pageId && metadata.is_connected && !isManualPageForm) {
      setIsLoadingForms(true);
      metaLeadsApi
        .forms(pageId)
        .then((res) => {
          setDiscoveredForms(res.forms || []);
        })
        .catch((e) => {
          console.warn('Could not discover forms for page:', e);
        })
        .finally(() => setIsLoadingForms(false));
    }
  }, [pageId, metadata.is_connected, isManualPageForm]);

  const handleSelectDiscoveredForm = async (fId: string) => {
    setFormId(fId);
    try {
      const res = await metaLeadsApi.formFields(fId);
      if (res.form?.questions && res.form.questions.length > 0) {
        // Auto-match questions to CRM destinations
        const newFields: { destination: string; question: string }[] = [];
        res.form.questions.forEach((q) => {
          const key = q.key.toLowerCase();
          if (key.includes('full_name') || key.includes('name')) {
            newFields.push({ destination: 'full_name', question: q.key });
          } else if (key.includes('email')) {
            newFields.push({ destination: 'email', question: q.key });
          } else if (key.includes('phone')) {
            newFields.push({ destination: 'phone', question: q.key });
          } else if (key.includes('city') || key.includes('location')) {
            newFields.push({ destination: 'city', question: q.key });
          }
        });
        if (newFields.length > 0) {
          setFields(newFields);
          toast.success(`Discovered ${res.form.questions.length} questions and auto-mapped ${newFields.length} CRM fields!`);
        }
      }
    } catch (e) {
      console.warn('Could not auto-fetch questions:', e);
    }
  };

  const hasNameMapping = fields.some(
    (f) => (f.destination === 'full_name' || f.destination === 'first_name') && f.question.trim().length > 0
  );
  const hasContactMapping = fields.some(
    (f) => (f.destination === 'email' || f.destination === 'phone') && f.question.trim().length > 0
  );

  const incompatibleDefaults = defaults.filter((d) => DISALLOWED_DEFAULT_FIELDS.includes(d.destination));

  const allowedDefaultFields = React.useMemo(() => {
    if (metadata.allowed_default_fields && metadata.allowed_default_fields.length > 0) {
      return metadata.allowed_default_fields;
    }
    return metadata.destination_fields.filter((f) => !DISALLOWED_DEFAULT_FIELDS.includes(f.value));
  }, [metadata]);

  const saveMutation = useMutation({
    mutationFn: (payload: MappingInput) => metaLeadsApi.save(payload, mapping?.id),
    onSuccess: () => {
      toast.success(mapping ? 'Mapping updated successfully' : 'New form mapping created');
      onSaved();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: Record<string, unknown> } };
      if (err.response?.data?.['expected_version']) {
        setVersionConflict(
          'Conflict detected: Another administrator updated this form mapping while you were editing. Please reload to review latest settings.'
        );
      } else {
        toast.error(formatError(e));
      }
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setVersionConflict(null);

    if (fields.length === 0) {
      toast.error('Please configure at least one field mapping.');
      return;
    }

    if (fields.some((f) => !f.question.trim() || !f.destination)) {
      toast.error('Please enter the question in your form and choose the CRM field for all mapping rows.');
      return;
    }

    if (new Set(fields.map((f) => f.destination)).size !== fields.length) {
      toast.error('Each CRM destination field may only be mapped once.');
      return;
    }

    if (!hasNameMapping) {
      toast.error('A name mapping (Full name or First name) is required so the lead can be identified.');
      return;
    }

    if (!hasContactMapping) {
      toast.error('At least one contact method (Email or Phone) is required to reach the lead.');
      return;
    }

    if (incompatibleDefaults.length > 0) {
      toast.error('Default values are not permitted for contact, identity, or consent fields.');
      setShowDefaults(true);
      return;
    }

    if (new Set(routes.map((r) => r.answer.trim().toLowerCase())).size !== routes.length) {
      toast.error('Each branch answer option must be unique.');
      return;
    }

    const payload: MappingInput = {
      name,
      page_id: pageId,
      form_id: formId,
      is_active: active,
      field_mappings: Object.fromEntries(fields.map((f) => [f.destination, f.question.trim()])),
      field_defaults: Object.fromEntries(defaults.filter((d) => d.destination && d.value.trim()).map((d) => [d.destination, d.value.trim()])),
      branch_mode: branchMode,
      branch: branchMode === 'FIXED' ? branch || null : null,
      branch_field: branchMode === 'ANSWER' ? branchField.trim() : '',
      branch_answers: branchMode === 'ANSWER' ? Object.fromEntries(routes.map((r) => [r.answer.trim(), r.branchId])) : {},
      unmatched_branch_policy: unmatchedBranchPolicy,
      fallback_branch: unmatchedBranchPolicy === 'FALLBACK_BRANCH' ? fallbackBranch || null : null,
      lead_source: source,
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

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 sm:p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="font-semibold text-lg">{mapping ? `Edit Mapping: ${mapping.name}` : 'New Meta Form Mapping'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure Page/form IDs, field matchings, branch routing, and lead lifecycle rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canEdit || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : mapping ? 'Update Mapping' : 'Save Mapping'}
          </Button>
        </div>
      </div>

      {versionConflict && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{versionConflict}</span>
        </div>
      )}

      {/* Section 1: Page & Form Discovery */}
      <section className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-primary" />
          Step 2: Choose Facebook Page & Lead Form
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span>Mapping Configuration Name:</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Andheri Summer Fitness Campaign Form"
              required
            />
          </label>

          <label className={labelClass}>
            <span>CRM Lead Source:</span>
            <select
              className={controlClass}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            >
              <option value="">Select Lead Source</option>
              {metadata.lead_sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {metadata.is_connected && !isManualPageForm ? (
          <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-3 rounded-lg border">
            <label className={labelClass}>
              <span>Select Authorized Facebook Page:</span>
              <select
                className={controlClass}
                value={pageId}
                onChange={(e) => {
                  setPageId(e.target.value);
                  setFormId('');
                }}
                required
              >
                <option value="">Select a Page...</option>
                {discoveredPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ID: {p.id})
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Select Lead Gen Form:</span>
              <select
                className={controlClass}
                value={formId}
                onChange={(e) => handleSelectDiscoveredForm(e.target.value)}
                disabled={!pageId || isLoadingForms}
                required
              >
                <option value="">
                  {isLoadingForms ? 'Discovering forms...' : !pageId ? 'Select Page first' : 'Select a Form...'}
                </option>
                {discoveredForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Status: {f.status})
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Facebook Page ID:</span>
              <Input
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 109283746501928"
                required
              />
            </label>

            <label className={labelClass}>
              <span>Meta Lead Form ID:</span>
              <Input
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. 981273645019283"
                required
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="text-primary underline hover:text-primary/80"
            onClick={() => setIsManualPageForm(!isManualPageForm)}
          >
            {isManualPageForm ? 'Switch to Discovered Meta Pages/Forms' : 'Or enter Page and Form IDs manually'}
          </button>
        </div>
      </section>

      {/* Section 2: Match Fields */}
      <section className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Step 3: Match Fields (Form Question → CRM Destination)
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFields([...fields, { destination: '', question: '' }])}
          >
            + Add Field
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={field.question}
                onChange={(e) => {
                  const updated = [...fields];
                  if (updated[idx]) {
                    updated[idx] = { ...updated[idx], question: e.target.value };
                    setFields(updated);
                  }
                }}
                placeholder="Form Question Key (e.g. full_name, email, phone_number)"
                className="flex-1"
                required
              />
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                className={`${controlClass} flex-1`}
                value={field.destination}
                onChange={(e) => {
                  const updated = [...fields];
                  if (updated[idx]) {
                    updated[idx] = { ...updated[idx], destination: e.target.value };
                    setFields(updated);
                  }
                }}
                required
              >
                <option value="">Select CRM Destination Field</option>
                {metadata.destination_fields.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFields(fields.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <Badge variant={hasNameMapping ? 'default' : 'destructive'} className="text-[10px]">
            {hasNameMapping ? '✓ Name Mapped' : '✗ Name Mapping Missing'}
          </Badge>
          <Badge variant={hasContactMapping ? 'default' : 'destructive'} className="text-[10px]">
            {hasContactMapping ? '✓ Contact Mapped' : '✗ Email or Phone Missing'}
          </Badge>
        </div>
      </section>

      {/* Section 3: Branch & Salesperson Routing */}
      <section className="space-y-4 border-t pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          Step 4: Branch & Salesperson Routing
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span>Branch Routing Mode:</span>
            <select
              className={controlClass}
              value={branchMode}
              onChange={(e) => setBranchMode(e.target.value as MetaMapping['branch_mode'])}
            >
              <option value="FIXED">Fixed Branch (All enquiries route to one branch)</option>
              <option value="ANSWER">Answer-Based (Route by form question answer)</option>
            </select>
          </label>

          {branchMode === 'FIXED' ? (
            <label className={labelClass}>
              <span>Destination Branch:</span>
              <select
                className={controlClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              >
                <option value="">Select Branch</option>
                {metadata.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={labelClass}>
              <span>Form Question Used for Branch Decision:</span>
              <Input
                value={branchField}
                onChange={(e) => setBranchField(e.target.value)}
                placeholder="e.g. preferred_location or city"
                required
              />
            </label>
          )}
        </div>

        {branchMode === 'ANSWER' && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Answer Routing Table:</span>
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
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={rt.answer}
                  onChange={(e) => {
                    const updated = [...routes];
                    if (updated[idx]) {
                      updated[idx] = { ...updated[idx], answer: e.target.value };
                      setRoutes(updated);
                    }
                  }}
                  placeholder="Answer (e.g. Andheri)"
                  className="flex-1"
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  className={`${controlClass} flex-1`}
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
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t text-xs">
              <label className={labelClass}>
                <span>Unmatched Answer Policy:</span>
                <select
                  className={controlClass}
                  value={unmatchedBranchPolicy}
                  onChange={(e) => setUnmatchedBranchPolicy(e.target.value as 'HOLD' | 'FALLBACK_BRANCH')}
                >
                  <option value="HOLD">Hold for Manual Review (NEEDS_REVIEW)</option>
                  <option value="FALLBACK_BRANCH">Route to Fallback Branch</option>
                </select>
              </label>

              {unmatchedBranchPolicy === 'FALLBACK_BRANCH' && (
                <label className={labelClass}>
                  <span>Fallback Branch:</span>
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

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <label className={labelClass}>
            <span>Sales Assignment Policy:</span>
            <select
              className={controlClass}
              value={assignmentMode}
              onChange={(e) => setAssignmentMode(e.target.value as 'TENANT_POLICY' | 'SPECIFIC_USER')}
            >
              <option value="TENANT_POLICY">Tenant Policy (Automatic Round Robin)</option>
              <option value="SPECIFIC_USER">Assign to Specific Salesperson</option>
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
                <option value="">Select Salesperson</option>
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

      {/* Section 4: Follow-up & Rules */}
      <section className="space-y-4 border-t pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          Step 5: Follow-up & Lifecycle Rules
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span>Initial Pipeline Stage:</span>
            <select
              className={controlClass}
              value={initialStage}
              onChange={(e) => setInitialStage(e.target.value)}
            >
              {metadata.initial_stages?.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              )) || <option value="NEW_LEAD">New Lead</option>}
            </select>
          </label>

          <label className={labelClass}>
            <span>Repeat Lead Submission Policy:</span>
            <select
              className={controlClass}
              value={repeatPolicy}
              onChange={(e) => setRepeatPolicy(e.target.value as MetaMapping['repeat_policy'])}
            >
              <option value="REVIEW">Flag for Review (Do not create duplicate lead)</option>
              <option value="CREATE_NEW">Create New Lead Entry</option>
            </select>
          </label>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={createFollowup}
              onChange={(e) => setCreateFollowup(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            <span>Automatically generate follow-up task upon lead import</span>
          </label>

          {createFollowup && (
            <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
              <label className={labelClass}>
                <span>Follow-up Task Type:</span>
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
                      <option value="CALL">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp Message</option>
                      <option value="EMAIL">Email</option>
                    </>
                  )}
                </select>
              </label>

              <label className={labelClass}>
                <span>Task Due In (Hours):</span>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={followupHours}
                  onChange={(e) => setFollowupHours(Number(e.target.value))}
                />
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Enable & Concurrency */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary"
          />
          <span>Enable this mapping for live ingestion upon saving</span>
        </label>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canEdit || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : mapping ? 'Update Mapping' : 'Save Mapping'}
          </Button>
        </div>
      </section>
    </form>
  );
}

// ===========================================================================
// Pagination Helper Component
// ===========================================================================
function Pagination({
  page,
  previous,
  next,
  change,
  count,
}: {
  page: number;
  previous: boolean;
  next: boolean;
  change: (page: number) => void;
  count: number;
}) {
  if (count <= 10 && page === 1) return null;
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
      <span>Total records: {count}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!previous}
          onClick={() => change(page - 1)}
        >
          Previous
        </Button>
        <span className="font-semibold text-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!next}
          onClick={() => change(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

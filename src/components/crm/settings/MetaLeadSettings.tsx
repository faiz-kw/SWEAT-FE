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
} from 'lucide-react';
import { CRMErrorState } from '../common/CRMErrorState';
import { CRMLoadingState } from '../common/CRMLoadingState';

const controlClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'grid gap-1.5 text-sm font-medium';

function formatError(error: unknown): string {
  const e = error as { data?: unknown; response?: { data?: unknown }; message?: string };
  const data = e.data || e.response?.data;
  if (data && typeof data === 'object') {
    const messages = Object.entries(data as Record<string, unknown>).map(
      ([k, v]) => `${k !== 'detail' && k !== 'non_field_errors' ? `${k}: ` : ''}${Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`
    );
    return messages.join('; ');
  }
  return e.message || 'The operation failed. Please check inputs and retry.';
}

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

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
    onSuccess: (updated) => {
      void refreshAll();
      toast.success(`Form "${updated.name}" is now ${updated.is_active ? 'enabled' : 'paused'}.`);
    },
    onError: (err) => toast.error(formatError(err)),
  });

  const simulateMutation = useMutation({
    mutationFn: metaLeadsApi.simulate,
    onSuccess: (data) => {
      setResult(data);
      void refreshAll();
      void client.invalidateQueries({ queryKey: ['leads'] });
      toast(
        data.duplicate_delivery
          ? 'Existing submission returned; no duplicate lead created.'
          : `Test submission processed: ${statusLabel(data.status)}`
      );
    },
    onError: (error) => toast.error(formatError(error)),
  });

  const retryMutation = useMutation({
    mutationFn: metaLeadsApi.retry,
    onSuccess: (data) => {
      setResult(data);
      void refreshAll();
      void client.invalidateQueries({ queryKey: ['leads'] });
      toast(`Retry result: ${statusLabel(data.status)}`);
    },
    onError: (error) => toast.error(formatError(error)),
  });

  if (metadataQuery.isPending) {
    return <CRMLoadingState message="Loading Meta integration configuration..." />;
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
      {/* ── Top Integration Status Card ────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Meta Lead Ads Integration</h2>
              <Badge variant="secondary" className="text-xs">
                Tenant: {tenantId || 'Default'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure Facebook & Instagram instant form intake, CRM field mappings, branch routing, and lead lifecycle rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={meta.connection_status === 'LIVE_CONNECTED' ? 'default' : 'outline'}
              className="px-2.5 py-1 text-xs"
            >
              {meta.connection_status === 'LIVE_CONNECTED' ? 'Live Connected' : 'Not Connected (Simulation Active)'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => void refreshAll()} title="Refresh settings">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Operating Mode</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Development Simulator
            </p>
            <p className="text-xs text-muted-foreground">
              Real CRM records are created for validation. Real Meta OAuth tokens and live webhook delivery are disabled.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Outbound Communications</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Protected (Outbound Disabled)
            </p>
            <p className="text-xs text-muted-foreground">
              Simulator leads are blocked from sending real emails, WhatsApp, or SMS to members/prospects.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-muted-foreground">Sales Assignment Engine</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <UserCheck className="h-4 w-4 shrink-0 text-primary" />
              {meta.tenant_assignment_policy?.auto_strategy.replace('_', ' ') || 'Round Robin'} ({meta.tenant_assignment_policy?.mode_allowed || 'Both'})
            </p>
            <p className="text-xs text-muted-foreground">
              Reuses tenant assignment policy. Fallback to unassigned:{' '}
              {meta.tenant_assignment_policy?.allow_unassigned_fallback ? 'Allowed' : 'Disabled'}.
            </p>
          </div>
        </div>
      </section>

      {/* ── Form Mappings Section ─────────────────────────────────────────── */}
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
                <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                <h4 className="font-medium text-sm">No Form Mappings Configured</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Add a mapping to specify how answers from your Meta Instant Form route into CRM branches, assign sales representatives, and initialize the prospective member lifecycle.
                </p>
                {canEdit && (
                  <Button size="sm" onClick={() => setEditing(null)} className="mt-2">
                    Create your first mapping
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {mappingsQuery.data.results.map((mapping) => {
                const fixedBranch = meta.branches.find((b) => b.id === mapping.branch);
                const fallbackBranch = meta.branches.find((b) => b.id === mapping.fallback_branch);
                const leadSource = meta.lead_sources.find((s) => s.id === mapping.lead_source);
                const specificUser = meta.eligible_users?.find((u) => u.id === mapping.assigned_sales_user);

                return (
                  <article
                    key={mapping.id}
                    className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-base break-words">{mapping.name}</h4>
                          <p className="text-xs text-muted-foreground break-all mt-0.5">
                            Page: <span className="font-mono">{mapping.page_id}</span> · Form: <span className="font-mono">{mapping.form_id}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={mapping.is_active ? 'secondary' : 'outline'} className="text-xs">
                            {mapping.is_active ? 'Enabled' : 'Paused'}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            v{mapping.version}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                        <div>
                          <span className="text-muted-foreground">Branch Routing:</span>
                          <p className="font-medium mt-0.5">
                            {mapping.branch_mode === 'ANSWER' ? (
                              <span>
                                Form Answer (<span className="font-mono">{mapping.branch_field}</span>)
                                {mapping.unmatched_branch_policy === 'FALLBACK_BRANCH' && fallbackBranch
                                  ? ` · Fallback: ${fallbackBranch.name}`
                                  : ' · Unmatched held'}
                              </span>
                            ) : (
                              fixedBranch?.name || 'Branch not found'
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Lead Source:</span>
                          <p className="font-medium mt-0.5">{leadSource?.name || 'Unknown Source'}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Initial Stage:</span>
                          <p className="font-medium mt-0.5">{statusLabel(mapping.initial_stage || 'NEW_LEAD')}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Sales Assignment:</span>
                          <p className="font-medium mt-0.5">
                            {mapping.assignment_mode === 'SPECIFIC_USER' && specificUser
                              ? `Assigned to ${specificUser.name}`
                              : 'Tenant Auto Policy'}
                          </p>
                        </div>
                      </div>

                      {mapping.create_followup_task && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            Automated follow-up ({mapping.followup_task_type || 'CALL'}) due within {mapping.followup_due_hours || 24}h
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => setEditing(mapping)}
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1" />
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
                          disabled={!canEdit || !meta.simulator_enabled || !mapping.is_active}
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

      {/* ── Test Enquiry Simulator ────────────────────────────────────────── */}
      {selected && (
        <form
          className="rounded-xl border bg-card p-4 sm:p-6 space-y-4 shadow-md"
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span>Simulate Form Submission:</span>
                <span className="text-primary">{selected.name}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit test answers through the authoritative ingestion pipeline to verify mapping, routing, and duplicate protection.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <p>
              <strong>Verification note:</strong> Re-submitting the exact same Submission ID verifies duplicate rejection and idempotency. Generating a new Submission ID tests fresh intake.
            </p>
            <p className="text-muted-foreground">{meta.phone_validation}</p>
          </div>

          <label className={labelClass}>
            <span>Submission External ID (Meta Lead ID)</span>
            <div className="flex gap-2">
              <Input
                required
                maxLength={100}
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubmissionId(crypto.randomUUID())}
              >
                New ID
              </Button>
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {questions.map((questionKey) => (
              <label key={questionKey} className={labelClass}>
                <span className="flex items-center justify-between">
                  <span>Question: <span className="font-mono text-xs">{questionKey}</span></span>
                  {selected.branch_mode === 'ANSWER' && selected.branch_field === questionKey && (
                    <Badge variant="outline" className="text-[10px]">Branch Selector</Badge>
                  )}
                </span>
                <Input
                  maxLength={2000}
                  value={answers[questionKey] || ''}
                  onChange={(e) => setAnswers({ ...answers, [questionKey]: e.target.value })}
                  placeholder={`Enter answer for ${questionKey}`}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <Button disabled={!canEdit || !meta.simulator_enabled || simulateMutation.isPending}>
                {simulateMutation.isPending ? 'Processing...' : 'Run Simulation'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Simulator Execution Feedback Result */}
      {result && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm space-y-1 ${
            result.status === 'IMPORTED'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : result.status === 'FAILED'
              ? 'bg-destructive/10 border-destructive/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="capitalize flex items-center gap-1.5">
              {result.status === 'IMPORTED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : result.status === 'FAILED' ? (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              Simulation Outcome: {statusLabel(result.status)}
            </strong>
            <span className="text-xs font-mono text-muted-foreground">ID: {result.external_lead_id}</span>
          </div>
          <p className="text-xs">
            {result.error_message ||
              (result.status === 'IMPORTED'
                ? 'Test lead was successfully saved into the CRM. You can verify it in the Leads workspace.'
                : 'Enquiry was received and held for review. Review reasons below.')}
          </p>
          {result.lead && (
            <p className="text-xs font-mono text-muted-foreground pt-1">
              Created CRM Lead ID: {result.lead}
            </p>
          )}
        </div>
      )}

      {/* ── Import Operations & History Section ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">Import Operations & Audit History</h3>
            <p className="text-xs text-muted-foreground">
              Monitor incoming lead payloads, diagnostic failure reasons, and perform authorized retries.
            </p>
          </div>

          {/* Filter status tabs */}
          <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NEEDS_ATTENTION', label: 'Needs Attention' },
              { id: 'IMPORTED', label: 'Imported' },
              { id: 'FAILED', label: 'Failed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setImportPage(1);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {importsQuery.isPending ? (
          <CRMLoadingState message="Loading imports..." />
        ) : importsQuery.isError ? (
          <CRMErrorState
            title="Cannot load import history"
            message={formatError(importsQuery.error)}
            onRetry={() => importsQuery.refetch()}
          />
        ) : (
          <>
            {!displayedImports.length && (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No submissions matching the current filter.
              </p>
            )}

            <div className="space-y-3">
              {displayedImports.map((item) => {
                const isHeld = ['NEEDS_MAPPING', 'NEEDS_ASSIGNMENT', 'NEEDS_REVIEW'].includes(item.status);
                const isFailed = item.status === 'FAILED';
                const isSuccess = item.status === 'IMPORTED';

                return (
                  <article key={item.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold font-mono break-all">{item.external_lead_id}</p>
                          <Badge
                            variant={isSuccess ? 'secondary' : isFailed ? 'destructive' : 'outline'}
                            className="capitalize text-xs"
                          >
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Received: {new Date(item.received_at).toLocaleString()} · Attempt {item.attempt_count}
                          {item.mapping_version ? ` · Mapping v${item.mapping_version}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status !== 'IMPORTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canEdit || !meta.simulator_enabled || retryMutation.isPending}
                            onClick={() => retryMutation.mutate(item.id)}
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
                          {detailId === item.id ? 'Hide Details' : 'View Payload'}
                        </Button>
                      </div>
                    </div>

                    {item.error_message && (
                      <div
                        className={`text-xs p-2.5 rounded-md ${
                          isFailed
                            ? 'bg-destructive/10 text-destructive'
                            : isHeld
                            ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <strong>Reason:</strong> {item.error_message}
                      </div>
                    )}

                    {/* Detailed payload expansion */}
                    {detailId === item.id && (
                      <div className="border-t pt-3 space-y-3 text-xs">
                        {detailQuery.isPending ? (
                          <p className="text-muted-foreground">Loading payload details...</p>
                        ) : detailQuery.isError ? (
                          <p className="text-destructive">{formatError(detailQuery.error)}</p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wide mb-1">
                                Form Question Answers
                              </h5>
                              <dl className="grid gap-1.5 sm:grid-cols-2 bg-muted/40 p-3 rounded-lg">
                                {detailQuery.data?.field_data?.map((field) => (
                                  <div key={field.name} className="space-y-0.5">
                                    <dt className="text-muted-foreground font-mono">{field.name}</dt>
                                    <dd className="font-medium break-words">{field.values.join(', ') || '—'}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>

                            {detailQuery.data?.mapping_snapshot && (
                              <div>
                                <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wide mb-1">
                                  Mapping Snapshot at Execution
                                </h5>
                                <pre className="bg-muted p-2 rounded text-[11px] font-mono overflow-x-auto max-h-40">
                                  {JSON.stringify(detailQuery.data.mapping_snapshot, null, 2)}
                                </pre>
                              </div>
                            )}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping History Modal
// ─────────────────────────────────────────────────────────────────────────────

function MappingHistoryModal({ mapping, onClose }: { mapping: MetaMapping; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['meta-mapping-history', mapping.id],
    queryFn: () => metaLeadsApi.auditHistory(mapping.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border bg-card p-6 shadow-xl flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Change History: {mapping.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Durable audit trail of who changed configuration settings and when.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {query.isPending ? (
            <CRMLoadingState message="Loading audit history..." />
          ) : query.isError ? (
            <p className="text-sm text-destructive">{formatError(query.error)}</p>
          ) : !query.data?.results.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No change history recorded yet.</p>
          ) : (
            query.data.results.map((item) => (
              <div key={item.id} className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.action_code}
                    </Badge>
                    {item.version && <span className="font-mono text-muted-foreground">v{item.version}</span>}
                  </div>
                  <span className="text-muted-foreground">{new Date(item.occurred_at).toLocaleString()}</span>
                </div>
                <p className="text-foreground">
                  Changed by: <strong>{item.actor_name}</strong> ({item.actor_type})
                </p>

                {item.before_data && item.after_data && (
                  <details className="mt-1 cursor-pointer">
                    <summary className="text-primary hover:underline text-[11px]">View Modified Attributes</summary>
                    <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-background rounded border text-[11px]">
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-1">Before:</span>
                        <pre className="font-mono overflow-x-auto max-h-32 text-[10px]">
                          {JSON.stringify(item.before_data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-1">After:</span>
                        <pre className="font-mono overflow-x-auto max-h-32 text-[10px]">
                          {JSON.stringify(item.after_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Editor Form
// ─────────────────────────────────────────────────────────────────────────────

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

  // Follow-up task automation states
  const [createFollowup, setCreateFollowup] = React.useState(mapping?.create_followup_task ?? false);
  const [followupType, setFollowupType] = React.useState(mapping?.followup_task_type || 'CALL');
  const [followupHours, setFollowupHours] = React.useState(mapping?.followup_due_hours || 24);

  // Version conflict detection state
  const [versionConflict, setVersionConflict] = React.useState<string | null>(null);

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
          'Conflict detected: Another administrator updated this form mapping while you were editing. Please reload to review the latest settings.'
        );
      } else {
        toast.error(formatError(e));
      }
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setVersionConflict(null);

    // Validate duplicate destination mappings
    if (new Set(fields.map((f) => f.destination)).size !== fields.length) {
      toast.error('Each CRM destination field may only be mapped once.');
      return;
    }

    // Validate duplicate branch routing answers
    if (new Set(routes.map((r) => r.answer.trim().toLowerCase())).size !== routes.length) {
      toast.error('Each branch answer option must be unique.');
      return;
    }

    const payload: MappingInput = {
      name,
      page_id: pageId,
      form_id: formId,
      is_active: active,
      lead_source: source,
      branch_mode: branchMode,
      branch: branchMode === 'FIXED' ? branch || null : null,
      branch_field: branchMode === 'ANSWER' ? branchField : '',
      branch_answers:
        branchMode === 'ANSWER' ? Object.fromEntries(routes.map((r) => [r.answer.trim(), r.branchId])) : {},
      unmatched_branch_policy: branchMode === 'ANSWER' ? unmatchedBranchPolicy : 'HOLD',
      fallback_branch: branchMode === 'ANSWER' && unmatchedBranchPolicy === 'FALLBACK_BRANCH' ? fallbackBranch || null : null,
      field_mappings: Object.fromEntries(fields.map((f) => [f.destination, f.question.trim()])),
      field_defaults: Object.fromEntries(defaults.filter((d) => d.destination && d.value).map((d) => [d.destination, d.value.trim()])),
      initial_stage: initialStage,
      repeat_policy: repeatPolicy,
      assignment_mode: assignmentMode,
      assigned_sales_user: assignmentMode === 'SPECIFIC_USER' ? assignedSalesUser || null : null,
      create_followup_task: createFollowup,
      followup_task_type: followupType,
      followup_due_hours: Number(followupHours) || 24,
      ...(mapping ? { expected_version: mapping.version } : {}),
    };

    saveMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 sm:p-6 space-y-6 shadow-md">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-semibold text-lg">{mapping ? 'Edit Form Mapping' : 'New Form Mapping'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure how form responses translate into prospective member records in your CRM.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {versionConflict && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Concurrent Modification Detected</span>
          </div>
          <p className="text-xs text-destructive">{versionConflict}</p>
          <Button type="button" size="sm" variant="outline" onClick={onSaved}>
            Reload latest version
          </Button>
        </div>
      )}

      <fieldset disabled={!canEdit || saveMutation.isPending} className="space-y-6">
        {/* ── Section 1: Basic Identifiers ─────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            1. Form Identifiers
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Mapping Name</span>
              <Input
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 7-Day Trial Lead Form"
              />
            </label>

            <label className={labelClass}>
              <span>CRM Lead Source (Meta Type)</span>
              <select
                required
                className={controlClass}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Select active Meta lead source</option>
                {metadata.lead_sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Facebook Page ID</span>
              <Input
                required
                maxLength={100}
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 10482910492"
                className="font-mono text-xs"
              />
            </label>

            <label className={labelClass}>
              <span>Meta Form ID</span>
              <Input
                required
                maxLength={100}
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. 89201940124"
                className="font-mono text-xs"
              />
            </label>
          </div>
          {!metadata.lead_sources.length && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No active Lead Source with type 'META' exists. Please create one under CRM Settings → Lead Sources first.
            </p>
          )}
        </div>

        {/* ── Section 2: Form Question -> CRM Field Mapping ───────────────── */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                2. Field Mappings & Default Values
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Map form question keys to supported CRM fields. At least Full Name (or First Name) and one contact method (Email or Phone) are required.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= metadata.destination_fields.length}
              onClick={() => setFields([...fields, { destination: '', question: '' }])}
            >
              + Add Field
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end bg-muted/20 p-2.5 rounded-lg border">
                <label className={labelClass}>
                  <span className="text-xs">Form Question Key</span>
                  <Input
                    required
                    maxLength={100}
                    value={field.question}
                    onChange={(e) =>
                      setFields(fields.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))
                    }
                    placeholder="e.g. full_name or what_is_your_email"
                    className="font-mono text-xs"
                  />
                </label>

                <label className={labelClass}>
                  <span className="text-xs">CRM Field Destination</span>
                  <select
                    required
                    className={controlClass}
                    value={field.destination}
                    onChange={(e) =>
                      setFields(fields.map((f, i) => (i === index ? { ...f, destination: e.target.value } : f)))
                    }
                  >
                    <option value="">Select CRM field</option>
                    {metadata.destination_fields.map((dest) => (
                      <option key={dest.value} value={dest.value}>
                        {dest.label}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(fields.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Configurable Default Values */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Fallback Default Values (Applied when form answer is empty)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDefaults([...defaults, { destination: '', value: '' }])}
                className="text-xs h-7"
              >
                + Add Default
              </Button>
            </div>
            {defaults.map((def, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end bg-muted/10 p-2 rounded border border-dashed">
                <label className={labelClass}>
                  <span className="text-xs">CRM Field</span>
                  <select
                    required
                    className={controlClass}
                    value={def.destination}
                    onChange={(e) =>
                      setDefaults(defaults.map((d, i) => (i === index ? { ...d, destination: e.target.value } : d)))
                    }
                  >
                    <option value="">Select field</option>
                    {metadata.destination_fields.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  <span className="text-xs">Default Value</span>
                  <Input
                    required
                    maxLength={200}
                    value={def.value}
                    onChange={(e) =>
                      setDefaults(defaults.map((d, i) => (i === index ? { ...d, value: e.target.value } : d)))
                    }
                    placeholder="e.g. India or General Fitness"
                  />
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaults(defaults.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 3: Branch Routing ───────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4 text-primary" />
              3. Branch Routing
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Route leads directly to a fixed branch or dynamically select branches based on a question answer.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Routing Mode</span>
              <select
                className={controlClass}
                value={branchMode}
                onChange={(e) => setBranchMode(e.target.value as MetaMapping['branch_mode'])}
              >
                {metadata.branch_modes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {branchMode === 'FIXED' ? (
              <label className={labelClass}>
                <span>Destination Branch</span>
                <select
                  required
                  className={controlClass}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  <option value="">Select branch</option>
                  {metadata.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className={labelClass}>
                <span>Branch Question Key</span>
                <Input
                  required
                  maxLength={100}
                  value={branchField}
                  onChange={(e) => setBranchField(e.target.value)}
                  placeholder="e.g. preferred_center"
                  className="font-mono text-xs"
                />
              </label>
            )}
          </div>

          {branchMode === 'ANSWER' && (
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Answer-to-Branch Mapping Rules</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRoutes([...routes, { answer: '', branchId: '' }])}
                >
                  + Add Option
                </Button>
              </div>

              {routes.map((route, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                  <label className={labelClass}>
                    <span className="text-xs">When answer equals</span>
                    <Input
                      required
                      maxLength={200}
                      value={route.answer}
                      onChange={(e) =>
                        setRoutes(routes.map((r, i) => (i === index ? { ...r, answer: e.target.value } : r)))
                      }
                      placeholder="e.g. Downtown"
                    />
                  </label>

                  <label className={labelClass}>
                    <span className="text-xs">Route to Branch</span>
                    <select
                      required
                      className={controlClass}
                      value={route.branchId}
                      onChange={(e) =>
                        setRoutes(routes.map((r, i) => (i === index ? { ...r, branchId: e.target.value } : r)))
                      }
                    >
                      <option value="">Select branch</option>
                      {metadata.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRoutes(routes.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
                <label className={labelClass}>
                  <span>Handling for Unmatched or Missing Answers</span>
                  <select
                    className={controlClass}
                    value={unmatchedBranchPolicy}
                    onChange={(e) => setUnmatchedBranchPolicy(e.target.value as 'HOLD' | 'FALLBACK_BRANCH')}
                  >
                    <option value="HOLD">Hold for review (Recommended: Needs branch assignment)</option>
                    <option value="FALLBACK_BRANCH">Route to designated fallback branch</option>
                  </select>
                </label>

                {unmatchedBranchPolicy === 'FALLBACK_BRANCH' && (
                  <label className={labelClass}>
                    <span>Designated Fallback Branch</span>
                    <select
                      required
                      className={controlClass}
                      value={fallbackBranch}
                      onChange={(e) => setFallbackBranch(e.target.value)}
                    >
                      <option value="">Select fallback branch</option>
                      {metadata.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3 shrink-0" />
                The system will never silently select an arbitrary branch. Unmatched leads are held for administrator review unless an explicit fallback branch is configured.
              </p>
            </div>
          )}
        </div>

        {/* ── Section 4: Lead Handling & Lifecycle ────────────────────────── */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary" />
              4. Lead Handling & Lifecycle Rules
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify initial pipeline stages, duplicate enquiry behavior, and sales rep allocation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Initial Pipeline Stage</span>
              <select
                className={controlClass}
                value={initialStage}
                onChange={(e) => setInitialStage(e.target.value)}
              >
                {(metadata.initial_stages || [{ value: 'NEW_LEAD', label: 'New Lead' }]).map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Duplicate / Repeat-Enquiry Policy</span>
              <select
                className={controlClass}
                value={repeatPolicy}
                onChange={(e) => setRepeatPolicy(e.target.value as MetaMapping['repeat_policy'])}
              >
                {metadata.repeat_policies.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Sales Representative Allocation</span>
              <select
                className={controlClass}
                value={assignmentMode}
                onChange={(e) => setAssignmentMode(e.target.value as 'TENANT_POLICY' | 'SPECIFIC_USER')}
              >
                <option value="TENANT_POLICY">
                  Follow Tenant Policy ({metadata.tenant_assignment_policy?.auto_strategy.replace('_', ' ') || 'Round Robin'})
                </option>
                <option value="SPECIFIC_USER">Assign to specific staff member</option>
              </select>
            </label>

            {assignmentMode === 'SPECIFIC_USER' && (
              <label className={labelClass}>
                <span>Designated Sales Representative</span>
                <select
                  required
                  className={controlClass}
                  value={assignedSalesUser}
                  onChange={(e) => setAssignedSalesUser(e.target.value)}
                >
                  <option value="">Select sales staff member</option>
                  {(metadata.eligible_users || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {/* ── Section 5: Follow-up Automation ─────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                5. Automated Follow-up Task Creation
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically generate outreach tasks for assigned sales staff upon intake.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={createFollowup}
                onChange={(e) => setCreateFollowup(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span>Enable Task Creation</span>
            </label>
          </div>

          {createFollowup && (
            <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border">
              <label className={labelClass}>
                <span>Follow-up Task Type</span>
                <select
                  className={controlClass}
                  value={followupType}
                  onChange={(e) => setFollowupType(e.target.value)}
                >
                  {(metadata.task_types || [
                    { value: 'CALL', label: 'Phone Call' },
                    { value: 'WHATSAPP', label: 'WhatsApp Message' },
                    { value: 'EMAIL', label: 'Email Outreach' },
                    { value: 'MEETING', label: 'Consultation Meeting' },
                  ]).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                <span>Due Within (Hours from intake)</span>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={followupHours}
                  onChange={(e) => setFollowupHours(parseInt(e.target.value, 10) || 24)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Active Toggle & Action Buttons */}
        <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Enable this form mapping immediately</span>
          </label>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Controls
// ─────────────────────────────────────────────────────────────────────────────

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
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-2">
      <span>
        {count} {count === 1 ? 'record' : 'records'} · Page {page}
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={!previous} onClick={() => change(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!next} onClick={() => change(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

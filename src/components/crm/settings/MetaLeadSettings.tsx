import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { metaLeadsApi, type MetaMapping, type MappingInput, type MetaImport } from '@/api/endpoints/metaLeadsApi';
import { useApp } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CRMErrorState } from '../common/CRMErrorState';
import { CRMLoadingState } from '../common/CRMLoadingState';

const control = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50';
const label = 'grid gap-1.5 text-sm font-medium';
function errorText(error: unknown): string {
  const e = error as { data?: unknown; message?: string };
  return e.data ? JSON.stringify(e.data) : e.message || 'The request failed. Please retry.';
}
function statusLabel(value: string) { return value.toLowerCase().replaceAll('_', ' '); }

export function MetaLeadSettings({ canEdit }: { canEdit: boolean }) {
  const { tenantId } = useApp();
  const client = useQueryClient();
  const key = ['meta-leads', tenantId];
  const [mappingPage, setMappingPage] = React.useState(1);
  const [importPage, setImportPage] = React.useState(1);
  const [editing, setEditing] = React.useState<MetaMapping | null | undefined>(undefined);
  const [selected, setSelected] = React.useState<MetaMapping | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = React.useState('');
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<MetaImport | null>(null);
  const metadata = useQuery({ queryKey: [...key, 'metadata'], queryFn: metaLeadsApi.metadata });
  const mappings = useQuery({ queryKey: [...key, 'mappings', mappingPage], queryFn: () => metaLeadsApi.mappings(mappingPage) });
  const imports = useQuery({ queryKey: [...key, 'imports', importPage], queryFn: () => metaLeadsApi.imports(importPage) });
  const detail = useQuery({ queryKey: [...key, 'detail', detailId], queryFn: () => metaLeadsApi.detail(detailId!), enabled: !!detailId });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const simulate = useMutation({
    mutationFn: metaLeadsApi.simulate,
    onSuccess: (data) => {
      setResult(data);
      void refresh();
      void client.invalidateQueries({ queryKey: ['leads'] });
      toast(data.duplicate_delivery ? 'Existing submission returned; no duplicate created.' : `Test submission: ${statusLabel(data.status)}`);
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const retry = useMutation({
    mutationFn: metaLeadsApi.retry,
    onSuccess: (data) => { setResult(data); void refresh(); toast(`Retry result: ${statusLabel(data.status)}`); },
    onError: (error) => toast.error(errorText(error)),
  });
  if (metadata.isPending) return <CRMLoadingState message="Loading Meta integration settings..." />;
  if (metadata.isError) return <CRMErrorState title="Cannot load Meta settings" message={errorText(metadata.error)} onRetry={() => metadata.refetch()} />;
  const meta = metadata.data;
  const questions = selected ? [...new Set([...Object.values(selected.field_mappings), ...(selected.branch_mode === 'ANSWER' ? [selected.branch_field] : [])])] : [];
  return <div className="space-y-6">
    <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold text-lg">Meta Lead Ads</h2><p className="text-sm text-muted-foreground">Configure enquiry routing for this tenant.</p></div>
        <Badge variant="outline">{meta.connection_status === 'NOT_CONNECTED' ? 'Not connected to Meta' : meta.connection_status}</Badge>
      </div>
      <p className="text-sm">Development import tools are available in this release. Live Meta authorisation and automatic delivery are not enabled.</p>
      <div className="rounded-lg bg-amber-500/10 p-3 text-sm">
        <strong>Test environment only.</strong> Simulation creates real test CRM records. Outbound communications must remain disabled. No Meta account is required.
      </div>
      {!meta.simulator_enabled && <p className="text-sm text-muted-foreground">Simulator unavailable: {meta.simulator_requirement}</p>}
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Form mappings</h3>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()}>Refresh</Button><Button disabled={!canEdit} onClick={() => setEditing(null)}>Add mapping</Button></div>
      </div>
      {editing !== undefined && <MappingEditor key={editing?.id || 'new'} mapping={editing} metadata={meta} canEdit={canEdit} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setSelected(null); void refresh(); }} />}
      {mappings.isPending ? <CRMLoadingState message="Loading mappings..." /> : mappings.isError ? <CRMErrorState title="Cannot load mappings" message={errorText(mappings.error)} onRetry={() => mappings.refetch()} /> : <>
        {!mappings.data.results.length && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No forms configured. Add a mapping to choose the branch, contact fields and repeat-enquiry policy.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {mappings.data.results.map((mapping) => <article key={mapping.id} className="rounded-xl border bg-card p-4 space-y-3 min-w-0">
            <div className="flex flex-wrap justify-between gap-2"><h4 className="font-medium break-words">{mapping.name}</h4><Badge variant={mapping.is_active ? 'secondary' : 'outline'}>{mapping.is_active ? 'Enabled' : 'Paused'}</Badge></div>
            <p className="text-xs text-muted-foreground break-all">Page: {mapping.page_id} · Form: {mapping.form_id} · Version {mapping.version}</p>
            <p className="text-sm">{mapping.branch_mode === 'ANSWER' ? 'Branch selected from form answer' : meta.branches.find((b) => b.id === mapping.branch)?.name || 'Branch unavailable'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!canEdit} onClick={() => setEditing(mapping)}>Edit mapping</Button>
              <Button variant="outline" disabled={!canEdit || !meta.simulator_enabled || !mapping.is_active} onClick={() => { setSelected(mapping); setAnswers({}); setSubmissionId(crypto.randomUUID()); setResult(null); }}>Test this form</Button>
            </div>
          </article>)}
        </div>
        <Pagination page={mappingPage} previous={!!mappings.data.previous} next={!!mappings.data.next} change={setMappingPage} count={mappings.data.count} />
      </>}
    </section>

    {selected && <form className="rounded-xl border bg-card p-4 sm:p-6 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      simulate.mutate({ page_id: selected.page_id, form_id: selected.form_id, external_lead_id: submissionId,
        field_data: questions.map((name) => ({ name, values: [answers[name] || ''] })) });
    }}>
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">Test enquiry · {selected.name}</h3><Button type="button" variant="ghost" onClick={() => setSelected(null)}>Close</Button></div>
      <p className="text-sm text-muted-foreground">Enter fictional test details. Re-submit the same ID and answers to verify duplicate protection. Use a new ID for a new enquiry.</p>
      <p className="text-xs text-muted-foreground">{meta.phone_validation}</p>
      <label className={label}>Submission ID<Input required maxLength={100} value={submissionId} onChange={(e) => setSubmissionId(e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2">{questions.map((name) => <label key={name} className={label}>{name}<Input maxLength={2000} value={answers[name] || ''} onChange={(e) => setAnswers({ ...answers, [name]: e.target.value })} /></label>)}</div>
      <div className="flex flex-wrap gap-2"><Button disabled={!canEdit || !meta.simulator_enabled || simulate.isPending}>{simulate.isPending ? 'Processing...' : 'Submit test enquiry'}</Button><Button type="button" variant="outline" onClick={() => setSubmissionId(crypto.randomUUID())}>New submission ID</Button></div>
    </form>}
    {result && <div role="status" className="rounded-xl border p-4 text-sm space-y-1"><strong className="capitalize">{statusLabel(result.status)}</strong><p>{result.error_message || (result.status === 'IMPORTED' ? 'Test lead saved. Open the CRM Leads workspace to review it.' : 'Submission retained; processing is pending.')}</p>{result.lead && <p className="break-all text-xs text-muted-foreground">CRM lead ID: {result.lead}</p>}</div>}

    <section className="space-y-3">
      <h3 className="font-semibold">Test import history</h3>
      <p className="text-sm text-muted-foreground">Retry uses the latest saved mapping. Imported submissions are never imported again.</p>
      {imports.isPending ? <CRMLoadingState message="Loading imports..." /> : imports.isError ? <CRMErrorState title="Cannot load imports" message={errorText(imports.error)} onRetry={() => imports.refetch()} /> : <>
        {!imports.data.results.length && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No test submissions received.</p>}
        {imports.data.results.map((item) => <article key={item.id} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium break-all">{item.external_lead_id}</p><p className="text-xs text-muted-foreground">{new Date(item.received_at).toLocaleString()} · Attempt {item.attempt_count} · Mapping version {item.mapping_version ?? '—'}</p></div><Badge variant="outline" className="capitalize">{statusLabel(item.status)}</Badge></div>
          <p className="text-sm">{item.error_message || (item.status === 'IMPORTED' ? 'Imported into the test CRM.' : 'Awaiting processing.')}</p>
          <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setDetailId(detailId === item.id ? null : item.id)}>View details</Button>{item.status !== 'IMPORTED' && <Button variant="outline" disabled={!canEdit || !meta.simulator_enabled || retry.isPending} onClick={() => retry.mutate(item.id)}>Retry with current mapping</Button>}</div>
          {detailId === item.id && (detail.isPending ? <p className="text-sm">Loading details...</p> : detail.isError ? <p className="text-sm text-destructive">{errorText(detail.error)}</p> : <dl className="grid gap-2 border-t pt-3 text-sm">{detail.data?.field_data?.map((field) => <div key={field.name} className="grid gap-1 sm:grid-cols-2"><dt className="text-muted-foreground break-all">{field.name}</dt><dd className="break-words">{field.values.join(', ') || '—'}</dd></div>)}</dl>)}
        </article>)}
        <Pagination page={importPage} previous={!!imports.data.previous} next={!!imports.data.next} change={setImportPage} count={imports.data.count} />
      </>}
    </section>
  </div>;
}

function Pagination({ page, previous, next, change, count }: { page: number; previous: boolean; next: boolean; change: (page: number) => void; count: number }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{count} records · Page {page}</span><div className="flex gap-2"><Button variant="ghost" disabled={!previous} onClick={() => change(page - 1)}>Previous</Button><Button variant="ghost" disabled={!next} onClick={() => change(page + 1)}>Next</Button></div></div>;
}

function MappingEditor({ mapping, metadata, canEdit, onClose, onSaved }: {
  mapping: MetaMapping | null; metadata: import('@/api/endpoints/metaLeadsApi').MetaMetadata;
  canEdit: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = React.useState(mapping?.name || '');
  const [pageId, setPageId] = React.useState(mapping?.page_id || '');
  const [formId, setFormId] = React.useState(mapping?.form_id || '');
  const [active, setActive] = React.useState(mapping?.is_active ?? false);
  const [source, setSource] = React.useState(mapping?.lead_source || '');
  const [branchMode, setBranchMode] = React.useState<MetaMapping['branch_mode']>(mapping?.branch_mode || 'FIXED');
  const [branch, setBranch] = React.useState(mapping?.branch || '');
  const [branchField, setBranchField] = React.useState(mapping?.branch_field || '');
  const [repeatPolicy, setRepeatPolicy] = React.useState<MetaMapping['repeat_policy']>(mapping?.repeat_policy || 'REVIEW');
  const [fields, setFields] = React.useState(Object.entries(mapping?.field_mappings || {}).map(([destination, question]) => ({ destination, question })));
  const [routes, setRoutes] = React.useState(Object.entries(mapping?.branch_answers || {}).map(([answer, branchId]) => ({ answer, branchId })));
  const save = useMutation({ mutationFn: (payload: MappingInput) => metaLeadsApi.save(payload, mapping?.id), onSuccess: () => { toast.success('Mapping saved'); onSaved(); }, onError: (e) => toast.error(errorText(e)) });
  return <form className="rounded-xl border bg-card p-4 sm:p-6 space-y-5" onSubmit={(event) => {
    event.preventDefault();
    if (new Set(fields.map((f) => f.destination)).size !== fields.length) { toast.error('Map each CRM destination only once.'); return; }
    if (new Set(routes.map((r) => r.answer.trim().toLowerCase())).size !== routes.length) { toast.error('Map each branch answer only once.'); return; }
    save.mutate({ name, page_id: pageId, form_id: formId, is_active: active, lead_source: source,
      branch_mode: branchMode, branch: branchMode === 'FIXED' ? branch || null : null,
      branch_field: branchMode === 'ANSWER' ? branchField : '',
      branch_answers: branchMode === 'ANSWER' ? Object.fromEntries(routes.map((r) => [r.answer, r.branchId])) : {},
      field_mappings: Object.fromEntries(fields.map((f) => [f.destination, f.question])), repeat_policy: repeatPolicy,
      ...(mapping ? { expected_version: mapping.version } : {}),
    });
  }}>
    <h3 className="font-semibold">{mapping ? 'Edit form mapping' : 'New form mapping'}</h3>
    <fieldset disabled={!canEdit || save.isPending} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Mapping name<Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className={label}>CRM lead source<select required className={control} value={source} onChange={(e) => setSource(e.target.value)}><option value="">Select Meta lead source</option>{metadata.lead_sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className={label}>Development Page identifier<Input required maxLength={100} value={pageId} onChange={(e) => setPageId(e.target.value)} /></label>
        <label className={label}>Development form identifier<Input required maxLength={100} value={formId} onChange={(e) => setFormId(e.target.value)} /></label>
      </div>
      {!metadata.lead_sources.length && <p className="text-sm text-amber-700 dark:text-amber-400">Create an active source with type Meta in the Lead Sources tab first.</p>}
      <p className="text-xs text-muted-foreground">Use your own test identifiers here. Saving a mapping does not connect a Facebook Page.</p>
      <div className="space-y-3"><h4 className="text-sm font-semibold">Form answers → CRM fields</h4><p className="text-xs text-muted-foreground">Map full name or first name, plus email or phone. Enter the form question key exactly.</p>
        {fields.map((field, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className={label}>Form question<Input required maxLength={100} value={field.question} onChange={(e) => setFields(fields.map((f, i) => i === index ? { ...f, question: e.target.value } : f))} /></label>
          <label className={label}>CRM field<select required className={control} value={field.destination} onChange={(e) => setFields(fields.map((f, i) => i === index ? { ...f, destination: e.target.value } : f))}><option value="">Select field</option>{metadata.destination_fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
          <Button type="button" variant="ghost" className="self-end" onClick={() => setFields(fields.filter((_, i) => i !== index))}>Remove</Button>
        </div>)}
        <Button type="button" variant="outline" disabled={fields.length >= metadata.destination_fields.length} onClick={() => setFields([...fields, { destination: '', question: '' }])}>Add field mapping</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Branch routing<select className={control} value={branchMode} onChange={(e) => setBranchMode(e.target.value as MetaMapping['branch_mode'])}>{metadata.branch_modes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        {branchMode === 'FIXED' ? <label className={label}>Destination branch<select required className={control} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">Select branch</option>{metadata.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label> : <label className={label}>Branch question key<Input required maxLength={100} value={branchField} onChange={(e) => setBranchField(e.target.value)} /></label>}
      </div>
      {branchMode === 'ANSWER' && <div className="space-y-3">{routes.map((route, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className={label}>Answer<Input required maxLength={200} value={route.answer} onChange={(e) => setRoutes(routes.map((r, i) => i === index ? { ...r, answer: e.target.value } : r))} /></label><label className={label}>Branch<select required className={control} value={route.branchId} onChange={(e) => setRoutes(routes.map((r, i) => i === index ? { ...r, branchId: e.target.value } : r))}><option value="">Select branch</option>{metadata.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><Button type="button" variant="ghost" className="self-end" onClick={() => setRoutes(routes.filter((_, i) => i !== index))}>Remove</Button></div>)}<Button type="button" variant="outline" onClick={() => setRoutes([...routes, { answer: '', branchId: '' }])}>Add branch answer</Button><p className="text-xs text-muted-foreground">Unknown answers stay in import history for correction. No branch is guessed.</p></div>}
      <label className={label}>If this person already has a lead<select className={control} value={repeatPolicy} onChange={(e) => setRepeatPolicy(e.target.value as MetaMapping['repeat_policy'])}>{metadata.repeat_policies.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      <p className="text-xs text-muted-foreground">Salesperson assignment uses the tenant’s existing Sales Roles & Assignment settings. Retrying a held enquiry uses the current mapping and policy.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />Enable this mapping</label>
      <div className="flex gap-2"><Button type="submit">{save.isPending ? 'Saving...' : 'Save mapping'}</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
    </fieldset>
  </form>;
}

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assessmentApi } from '@/api/endpoints/assessmentApi';
import type { AssessmentListRow } from '@/api/endpoints/assessmentApi';

const PAGE_SIZE = 20;

interface AssessmentRegisterProps {
  /** Opens an existing assessment. The caller decides which step to land on. */
  onOpen?: (row: AssessmentListRow) => void;
  /** Starts a new assessment. */
  onNew?: () => void;
}

/**
 * The assessment register.
 *
 * Paging, search and filtering all happen server-side: a register grows without bound, and a
 * studio with three years of history should not ship every row to the tablet to filter it in
 * the browser. The "Needs review" chip is the approval inbox — before this existed, an
 * assessment sitting in PENDING_REVIEW had no route back to a coach.
 */
export const AssessmentRegister: React.FC<AssessmentRegisterProps> = ({ onOpen, onNew }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [bucket, setBucket] = useState<'' | 'needs_review' | 'in_progress' | 'approved'>('');
  const [assessmentType, setAssessmentType] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce the search box so typing a member's name is one request, not eight.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params = {
    page,
    page_size: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(bucket ? { bucket } : {}),
    ...(assessmentType ? { assessment_type: assessmentType } : {}),
    ...(scanStatus ? { scan_status: scanStatus } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['assessment-register', params],
    queryFn: () => assessmentApi.listAssessments(params),
    placeholderData: (previous) => previous,
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const hasFilters = !!(search || bucket || assessmentType || scanStatus || dateFrom || dateTo);

  return (
    <div className="space-y-4">
      {/* Filter chips, driven by server-computed counts */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: '', label: 'All', count: data?.summary?.total },
          { id: 'needs_review', label: 'Needs review', count: data?.summary?.needs_review },
          { id: 'in_progress', label: 'In progress', count: data?.summary?.in_progress },
          { id: 'approved', label: 'Approved', count: data?.summary?.approved },
        ] as Array<{ id: '' | 'needs_review' | 'in_progress' | 'approved'; label: string; count?: number }>).map((chip) => (
          <button
            key={chip.id || 'all'}
            onClick={() => { setBucket(chip.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              bucket === chip.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card/60 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {chip.label}
            {typeof chip.count === 'number' && <span className="ml-1.5 opacity-80">{chip.count}</span>}
          </button>
        ))}
        {(data?.summary?.scan_failed ?? 0) > 0 && (
          <button
            onClick={() => { setScanStatus('FAILED,PARTIAL'); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-destructive/40 bg-destructive/10 text-destructive"
          >
            Scan issues {data?.summary?.scan_failed}
          </button>
        )}
        {onNew && (
          <Button size="sm" className="ml-auto h-8 text-xs" onClick={onNew}>
            New Assessment
          </Button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by member name, phone or member number"
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={assessmentType}
          onChange={(e) => { setAssessmentType(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="">All types</option>
          <option value="INITIAL">Initial</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="POST_PROGRAM">Post-programme</option>
          <option value="RETURN_TO_TRAINING">Return to training</option>
        </select>
        <select
          value={scanStatus}
          onChange={(e) => { setScanStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="">Any scan state</option>
          <option value="COMPLETED">Scan complete</option>
          <option value="PARTIAL">Scan partial</option>
          <option value="FAILED">Scan failed</option>
          <option value="UNAVAILABLE">Scan unavailable</option>
          <option value="SKIPPED_NO_CONSENT">No consent</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => {
              setSearch(''); setAssessmentType(''); setScanStatus('');
              setDateFrom(''); setDateTo(''); setBucket(''); setPage(1);
            }}
          >
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => refetch()}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Rows */}
      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-card/80 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="col-span-3">Member</div>
          <div className="col-span-2">Date / Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Scan</div>
          <div className="col-span-2">Coach</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading assessments…
          </div>
        ) : !data?.results?.length ? (
          <div className="p-10 text-center space-y-2">
            <ClipboardList className="w-7 h-7 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No assessments found</p>
            <p className="text-xs text-muted-foreground">
              {hasFilters ? 'No assessment matches these filters.' : 'Start the first assessment with New Assessment.'}
            </p>
          </div>
        ) : (
          data.results.map((row) => {
            const actionLabel =
              row.status === 'PENDING_REVIEW' ? 'Review' : row.status === 'APPROVED' ? 'View' : 'Resume';
            return (
              <div
                key={row.id}
                className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-border items-center hover:bg-card/60 transition"
              >
                <div className="col-span-2 md:col-span-3 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{row.member_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {row.member_phone || '—'}{row.branch ? ` · ${row.branch.name}` : ''}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{row.assessment_type_display}</p>
                </div>
                <div className="md:col-span-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      row.status === 'APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : row.status === 'PENDING_REVIEW'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {row.status_display || row.status}
                  </span>
                  {row.posture_score != null && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Posture {row.posture_score}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] text-muted-foreground">{row.scan_status.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-[10px] text-muted-foreground">{row.captures_taken}/4 captures</p>
                </div>
                <div className="md:col-span-2 text-[11px] text-muted-foreground truncate">{row.conducted_by || '—'}</div>
                <div className="md:col-span-1 flex md:justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onOpen?.(row)}>
                    {actionLabel}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Server-side paging */}
      {!!data?.count && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

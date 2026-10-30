import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Activity,
  Snowflake,
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { membershipsApi } from '@/api/endpoints/membershipsApi';
import {
  Membership,
  MembershipContractSnapshot,
  ExtensionCalculationResult,
  FreezeCalculationResult,
} from '../../types/memberships';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermissions } from '../../lib/permissions';
import { useApp } from '@/contexts';
import { useGlobalSearchSync } from '@/hooks/useGlobalSearchSync';

export interface MembershipsWorkspaceProps {
  initialTab?: 'memberships' | 'freezes' | undefined;
}

export const MembershipsWorkspace: React.FC<MembershipsWorkspaceProps> = ({ initialTab = 'memberships' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, user } = usePermissions();
  const { locationId } = useApp();
  const canEdit = can('members.memberships.edit');

  const [activeTab, setActiveTab] = useState<'memberships' | 'freezes'>(
    (initialTab as any) === 'freezes' ? 'freezes' : 'memberships'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const { handleSearchChange } = useGlobalSearchSync(searchTerm, setSearchTerm);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Resolved branch scope: only pass when a specific branch is selected
  const branchId = locationId && locationId !== 'all' ? locationId : undefined;

  // Debounce search — fire backend query 350ms after user stops typing
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchTerm]);

  // Reset page on filter / branch changes
  useEffect(() => { setPage(1); }, [branchId, statusFilter]);

  // Modal states
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [contractSnapshot, setContractSnapshot] = useState<MembershipContractSnapshot | null>(null);
  const [loadingContractId, setLoadingContractId] = useState<string | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);

  // Freeze form
  const [freezeFrom, setFreezeFrom] = useState('');
  const [freezeUntil, setFreezeUntil] = useState('');
  const [freezeReason, setFreezeReason] = useState('');

  // Extend form
  const [extendDays, setExtendDays] = useState<number>(7);
  const [extendReason, setExtendReason] = useState('');

  // Entitlement consume form
  const [consumeType, setConsumeType] = useState('CLASS_SESSIONS');
  const [consumeUnits, setConsumeUnits] = useState('1.0');
  const [consumeReason] = useState('Session check-in');

  // Build server-side query params
  const membershipQueryParams = {
    ...(branchId ? { branch_id: branchId } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    page,
    page_size: PAGE_SIZE,
  };

  // Queries — fully server-side: branch-scoped, searchable, paginated
  const {
    data: membershipPage,
    isLoading: loadingMemberships,
    refetch: refetchMemberships,
    isFetching: fetchingMemberships,
  } = useQuery({
    queryKey: ['memberships', membershipQueryParams],
    queryFn: () => membershipsApi.getMemberships(membershipQueryParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const memberships = membershipPage?.results || [];
  const totalCount = membershipPage?.count || 0;
  const totalPages = membershipPage?.total_pages || 1;

  const {
    data: freezes = [],
    isLoading: loadingFreezes,
    refetch: refetchFreezes,
  } = useQuery({
    queryKey: ['membership-freezes'],
    queryFn: () => membershipsApi.getFreezes(),
  });

  // Real-time calculation quotes
  const {
    data: extendQuote,
    isLoading: loadingExtendQuote,
  } = useQuery({
    queryKey: ['calculate-extension', selectedMembership?.id, extendDays],
    queryFn: () => membershipsApi.calculateExtension(selectedMembership!.id, { days: Number(extendDays) || 1 }),
    enabled: isExtendOpen && Boolean(selectedMembership?.id) && Number(extendDays) > 0,
  });

  const {
    data: freezeQuote,
    isLoading: loadingFreezeQuote,
  } = useQuery({
    queryKey: ['calculate-freeze', selectedMembership?.id, freezeFrom, freezeUntil],
    queryFn: () => membershipsApi.calculateFreeze(selectedMembership!.id, { freeze_from: freezeFrom, freeze_until: freezeUntil }),
    enabled: isFreezeOpen && Boolean(selectedMembership?.id) && Boolean(freezeFrom) && Boolean(freezeUntil) && freezeUntil >= freezeFrom,
  });

  // Mutations
  const freezeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => membershipsApi.applyFreeze(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-freezes'] });
      setIsFreezeOpen(false);
      setSelectedMembership(null);
      setFreezeFrom('');
      setFreezeUntil('');
      setFreezeReason('');
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => membershipsApi.extendMembership(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      setIsExtendOpen(false);
      setSelectedMembership(null);
      setExtendDays(7);
      setExtendReason('');
    },
  });

  const consumeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => membershipsApi.consumeEntitlement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-entitlements'] });
      setIsConsumeOpen(false);
    },
  });

  const handleOpenContract = async (mem: Membership) => {
    setSelectedMembership(mem);
    setLoadingContractId(mem.id);
    setIsContractOpen(true);
    try {
      const snap = await membershipsApi.getContract(mem.id);
      setContractSnapshot(snap);
    } catch (e) {
      console.warn('Could not load contract snapshot from server, using membership fallback terms:', e);
      // Fallback: Synthesize contract terms from membership object
      const fallbackSnap: MembershipContractSnapshot = {
        id: mem.id,
        membership: mem.id,
        package: mem.package,
        package_version: mem.package_version,
        package_name_snapshot: mem.package_name || 'Membership Agreement',
        purchase_price: '0.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '0.00',
        currency: 'INR',
        duration_value: 12,
        duration_unit: 'MONTH',
        start_date: mem.start_date,
        end_date: mem.end_date,
        purchase_branch: mem.purchase_branch || mem.home_branch || '',
        created_at: mem.created_at || new Date().toISOString(),
        entitlements_snapshot: mem.entitlements?.map((ent) => ({
          entitlement_type: ent.entitlement_type,
          allocated_units: ent.allocated_units ? String(ent.allocated_units) : null,
          is_unlimited: ent.is_unlimited,
        })) || [],
      };
      setContractSnapshot(fallbackSnap);
    } finally {
      setLoadingContractId(null);
    }
  };

  const handleOpenFreeze = (mem: Membership) => {
    setSelectedMembership(mem);
    const today = new Date().toISOString().split('T')[0] ?? '';
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] ?? '';
    setFreezeFrom(today);
    setFreezeUntil(nextWeek);
    setFreezeReason('');
    setIsFreezeOpen(true);
  };

  const handleOpenExtend = (mem: Membership) => {
    setSelectedMembership(mem);
    setExtendDays(7);
    setExtendReason('');
    setIsExtendOpen(true);
  };

  const handleOpenConsume = (mem: Membership) => {
    setSelectedMembership(mem);
    setIsConsumeOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Memberships & Entitlements"
        subtitle="Active subscriptions, immutable contract snapshots, session quotas, and lifecycle freezes."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Members · Lifecycle
            </span>
            <span className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground">{totalCount}</span> total
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsManualRefreshing(true);
              const start = Date.now();
              try {
                await Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: ['memberships'] }),
                  queryClient.invalidateQueries({ queryKey: ['membership-freezes'] }),
                  refetchMemberships(),
                  refetchFreezes(),
                ]);
              } finally {
                const elapsed = Date.now() - start;
                setTimeout(() => setIsManualRefreshing(false), Math.max(0, 450 - elapsed));
              }

            }}
            disabled={fetchingMemberships || fetchingFreezes || isManualRefreshing}
            title="Refresh Data"
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5 transition-transform", (fetchingMemberships || fetchingFreezes || isManualRefreshing) && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        }
      />

      <PageBody>
        {/* Navigation Tabs - Responsive Scroll */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('memberships')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'memberships'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Users className="size-3.5" />
            <span>Active Memberships ({totalCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('freezes')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'freezes'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Snowflake className="size-3.5" />
            <span>Freezes & Extensions ({freezes.length})</span>
          </button>
        </div>

        {/* Main Tab Content */}
        {activeTab === 'memberships' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search member, ID, or package..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-9 bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FROZEN">FROZEN</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Memberships Table */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Member & Agreement</th>
                      <th className="px-4 py-3">Package</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Validity</th>
                      <th className="px-4 py-3">Session Quota</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingMemberships ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                          Loading memberships...
                        </td>
                      </tr>
                    ) : memberships.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No memberships found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      memberships.map((mem) => {
                        return (
                          <tr key={mem.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                  {mem.member_name ? mem.member_name.charAt(0).toUpperCase() : 'M'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (mem.user_profile) {
                                          navigate({
                                            to: '/members/client-360',
                                            search: { memberId: mem.user_profile } as never,
                                          });
                                        }
                                      }}
                                      className="font-semibold text-foreground hover:text-primary transition-colors text-left truncate max-w-[160px] cursor-pointer"
                                      title={mem.member_name || 'Member'}
                                    >
                                      {mem.member_name || 'Member'}
                                    </button>
                                    {mem.member_number && (
                                      <span
                                        className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 shrink-0"
                                        title="Member Profile ID"
                                      >
                                        {mem.member_number}
                                      </span>
                                    )}
                                  </div>
                                  {(mem.member_phone || mem.member_email) && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                      {mem.member_phone && <span>{mem.member_phone}</span>}
                                      {mem.member_phone && mem.member_email && <span>·</span>}
                                      {mem.member_email && <span className="truncate max-w-[140px]">{mem.member_email}</span>}
                                    </div>
                                  )}
                                  <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <span className="text-muted-foreground/70">Contract:</span>
                                    <span className="font-semibold text-foreground/80">{mem.membership_number}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-medium text-foreground">{mem.package_name}</div>
                              {mem.purchase_branch_name && (
                                <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                  Purchased at {mem.purchase_branch_name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground">
                              {mem.home_branch_name || 'Main Branch'}
                            </td>
                            <td className="px-4 py-3.5 text-xs">
                              <div className="text-foreground">
                                {mem.start_date} → {mem.end_date}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {mem.entitlements && mem.entitlements.length > 0 ? (
                                <div className="space-y-1.5 min-w-[140px]">
                                  {mem.entitlements.map((ent, idx) => {
                                    const consumed = parseFloat(ent.consumed_units) || 0;
                                    const allocated = ent.allocated_units ? parseFloat(ent.allocated_units) : 0;
                                    const remaining = ent.is_unlimited ? '∞' : Math.max(0, allocated - consumed);
                                    const label = ent.entitlement_type.includes('CROSS')
                                      ? 'Cross Branch'
                                      : ent.entitlement_type.includes('HOME')
                                      ? 'Home Branch'
                                      : ent.entitlement_type.replace(/_/g, ' ');
                                    return (
                                      <div key={idx} className="bg-muted/40 p-1.5 rounded border border-border/60 text-[11px] font-mono">
                                        <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                                          <span>{label}</span>
                                          <span className="font-bold text-foreground">
                                            {ent.is_unlimited ? 'Unlimited' : `${remaining} left`}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                          <span>Alloc: {ent.is_unlimited ? '∞' : allocated}</span>
                                          <span>Used: {consumed}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No quota</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                  mem.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : mem.status === 'FROZEN'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {mem.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenContract(mem)}
                                  disabled={loadingContractId === mem.id}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="View Contract Snapshot"
                                >
                                  {loadingContractId === mem.id ? (
                                    <RefreshCw className="size-3.5 animate-spin text-primary" />
                                  ) : (
                                    <FileText className="size-3.5" />
                                  )}
                                </Button>
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenConsume(mem)}
                                    className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                                    title="Check-In / Consume Session"
                                  >
                                    <Activity className="size-3.5" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenFreeze(mem)}
                                    className="h-7 w-7 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                    title="Freeze Membership"
                                  >
                                    <Snowflake className="size-3.5" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenExtend(mem)}
                                    className="h-7 w-7 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                    title="Extend Package Validity"
                                  >
                                    <Clock className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-xs">
                <span className="text-xs text-muted-foreground">
                  {fetchingMemberships && !loadingMemberships && (
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2 align-middle" />
                  )}
                  Showing page <span className="font-semibold text-foreground">{page}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                  {' '}·{' '}
                  <span className="font-semibold text-foreground">{totalCount}</span> total
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loadingMemberships}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                            pageNum === page
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loadingMemberships}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'freezes' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-xs">
              <h2 className="text-base font-semibold text-foreground">Membership Freezes & Leaves</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approved medical and personal freeze intervals automatically extending membership validity.
              </p>

              {loadingFreezes ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  Loading freezes...
                </div>
              ) : freezes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No freeze records on file.</div>
              ) : (
                <div className="divide-y divide-border/60 mt-4">
                  {freezes.map((f) => (
                    <div key={f.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Snowflake className="size-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-semibold text-foreground">
                            {f.freeze_from} → {f.freeze_until}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md font-medium">
                            {f.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{f.reason_text || 'No reason provided'}</p>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-sm font-bold text-primary">
                          +{f.extend_membership_days || 0} days
                        </span>
                        <span className="text-xs text-muted-foreground block">Validity Extended</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </PageBody>

      {/* Contract Snapshot Modal */}
      <Dialog open={isContractOpen && !!selectedMembership} onOpenChange={setIsContractOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Immutable Contract Snapshot</DialogTitle>
          </DialogHeader>
          {loadingContractId ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs">Loading contract snapshot...</p>
            </div>
          ) : contractSnapshot && selectedMembership ? (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 pb-1">
                <span>Member:</span>
                <strong className="text-foreground font-semibold">{selectedMembership.member_name}</strong>
                {selectedMembership.member_number && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                    {selectedMembership.member_number}
                  </span>
                )}
                <span>· Contract:</span>
                <span className="font-mono text-foreground font-semibold">{selectedMembership.membership_number}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl text-xs border border-border/60">
                <div>
                  <span className="text-muted-foreground block">Package Snapshot:</span>
                  <strong className="text-foreground font-semibold">{contractSnapshot.package_name_snapshot}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Duration:</span>
                  <strong className="text-foreground font-semibold">
                    {contractSnapshot.duration_value} {contractSnapshot.duration_unit}(S)
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Purchase Price:</span>
                  <strong className="text-foreground font-semibold">₹{contractSnapshot.purchase_price}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Final Amount Paid:</span>
                  <strong className="text-primary font-bold">₹{contractSnapshot.final_amount}</strong>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Snapshotted Entitlements
                </span>
                <div className="space-y-1.5">
                  {contractSnapshot.entitlements_snapshot && contractSnapshot.entitlements_snapshot.length > 0 ? (
                    contractSnapshot.entitlements_snapshot.map((es: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-muted/40 rounded-lg text-xs flex justify-between font-mono border border-border/60"
                      >
                        <span className="text-foreground">{es.entitlement_type}</span>
                        <strong className="text-primary">{es.is_unlimited ? 'Unlimited' : `${es.allocated_units} sessions`}</strong>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground italic border border-border/60">
                      No specific session quota snapshots attached.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No contract details available for this plan.
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsContractOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze Membership Modal */}
      <Dialog open={isFreezeOpen && !!selectedMembership} onOpenChange={setIsFreezeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Membership Freeze</DialogTitle>
          </DialogHeader>
          {selectedMembership && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                freezeMutation.mutate({
                  id: selectedMembership.id,
                  data: {
                    freeze_from: freezeFrom,
                    freeze_until: freezeUntil,
                    reason_text: freezeReason,
                  },
                });
              }}
              className="space-y-4 py-2 text-xs sm:text-sm"
            >
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span>Member:</span>
                <span className="font-semibold text-foreground">{selectedMembership.member_name}</span>
                {selectedMembership.member_number && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                    {selectedMembership.member_number}
                  </span>
                )}
                <span>· Contract:</span>
                <span className="font-mono text-foreground font-semibold">{selectedMembership.membership_number}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                <span>Current Plan Expiry:</span>
                <span className="font-semibold text-foreground">{selectedMembership.end_date}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Freeze From</Label>
                  <Input
                    type="date"
                    required
                    value={freezeFrom}
                    onChange={(e) => setFreezeFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Freeze Until</Label>
                  <Input
                    type="date"
                    required
                    value={freezeUntil}
                    onChange={(e) => setFreezeUntil(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Quotation Breakdown */}
              {freezeQuote && (
                <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                  freezeQuote.can_freeze ? 'bg-blue-500/10 border-blue-500/20' : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  <div className="flex items-center justify-between font-semibold text-blue-600 dark:text-blue-400">
                    <span>Freeze Duration:</span>
                    <span>{freezeQuote.freeze_days} Days</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Rate (Per Day):</span>
                    <span className="font-medium text-foreground">₹{freezeQuote.fee_per_day}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total Freeze Fee:</span>
                    <span className="font-bold text-sm text-foreground">₹{freezeQuote.total_fee}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-muted-foreground">
                    <span>Extended Expiry Date:</span>
                    <span className="font-bold text-primary">{freezeQuote.new_end_date}</span>
                  </div>
                  {!freezeQuote.can_freeze && freezeQuote.error && (
                    <div className="text-red-500 font-medium pt-1">
                      {freezeQuote.error}
                    </div>
                  )}
                </div>
              )}

              {/* Lockout Notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Booking Lockout:</strong> During the frozen window ({freezeFrom} to {freezeUntil}), the member cannot book any classes or sessions. On the day after freeze concludes, booking privileges automatically resume.
                </span>
              </div>

              <div>
                <Label className="mb-1 block">Reason</Label>
                <Input
                  type="text"
                  placeholder="e.g. Travel or Medical leave"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFreezeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={freezeMutation.isPending || (freezeQuote && !freezeQuote.can_freeze)}
                >
                  {freezeMutation.isPending ? 'Freezing...' : 'Apply Freeze'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend Membership Modal */}
      <Dialog open={isExtendOpen && !!selectedMembership} onOpenChange={setIsExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Package Validity</DialogTitle>
          </DialogHeader>
          {selectedMembership && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                extendMutation.mutate({
                  id: selectedMembership.id,
                  data: {
                    days: Number(extendDays),
                    reason_text: extendReason,
                  },
                });
              }}
              className="space-y-4 py-2 text-xs sm:text-sm"
            >
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span>Member:</span>
                <span className="font-semibold text-foreground">{selectedMembership.member_name}</span>
                {selectedMembership.member_number && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                    {selectedMembership.member_number}
                  </span>
                )}
                <span>· Contract:</span>
                <span className="font-mono text-foreground font-semibold">{selectedMembership.membership_number}</span>
              </div>

              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedMembership.status === 'EXPIRED'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {selectedMembership.status}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Current Expiry: <strong className="text-foreground">{selectedMembership.end_date}</strong>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Extension Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label className="mb-1 block">Reason for Extension</Label>
                <Input
                  type="text"
                  placeholder="e.g. Vacation extension or customer goodwill"
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                />
              </div>

              {/* Dynamic Extension Fee Breakdown */}
              {extendQuote && (
                <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                  extendQuote.can_extend
                    ? 'bg-muted/40 border-border/60'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Remaining Sessions:</span>
                    <span className="font-semibold text-foreground">
                      {extendQuote.remaining_sessions}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Per-Day Extension Fee:</span>
                    <span className="font-medium text-foreground">
                      ₹{extendQuote.fee_per_day} × {extendQuote.days} days = ₹{(Number(extendQuote.fee_per_day) * extendQuote.days).toFixed(2)}
                    </span>
                  </div>

                  {extendQuote.is_expired && (
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium">
                      <span>Expired Package Activation Surcharge:</span>
                      <span className="font-bold">₹{extendQuote.activation_fee}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="font-semibold text-foreground">Total Fee Payable:</span>
                    <span className="font-bold text-sm text-primary">₹{extendQuote.total_fee}</span>
                  </div>

                  {extendQuote.new_end_date && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>New End Date:</span>
                      <span className="font-bold text-foreground">{extendQuote.new_end_date}</span>
                    </div>
                  )}

                  {!extendQuote.can_extend && extendQuote.error && (
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive font-medium text-[11px] flex items-start gap-1.5 mt-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{extendQuote.error}</span>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExtendOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={extendMutation.isPending || (extendQuote && !extendQuote.can_extend)}
                >
                  {extendMutation.isPending ? 'Extending...' : 'Confirm Extension'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Consume Session Modal */}
      <Dialog open={isConsumeOpen && !!selectedMembership} onOpenChange={setIsConsumeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check-In / Consume Entitlement</DialogTitle>
          </DialogHeader>
          {selectedMembership && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                consumeMutation.mutate({
                  id: selectedMembership.id,
                  data: {
                    entitlement_type: consumeType,
                    units: consumeUnits,
                    reason_text: consumeReason,
                  },
                });
              }}
              className="space-y-4 py-2 text-xs sm:text-sm"
            >
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span>Member:</span>
                <span className="font-semibold text-foreground">{selectedMembership.member_name}</span>
                {selectedMembership.member_number && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                    {selectedMembership.member_number}
                  </span>
                )}
                <span>· Contract:</span>
                <span className="font-mono text-foreground font-semibold">{selectedMembership.membership_number}</span>
              </div>

              <div>
                <Label className="mb-1 block">Entitlement Type</Label>
                <select
                  value={consumeType}
                  onChange={(e) => setConsumeType(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CLASS_SESSIONS">CLASS_SESSIONS</option>
                  <option value="PERSONAL_TRAINING">PERSONAL_TRAINING</option>
                  <option value="OPEN_GYM">OPEN_GYM</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block">Units to Consume</Label>
                <Input
                  type="number"
                  step="0.5"
                  required
                  value={consumeUnits}
                  onChange={(e) => setConsumeUnits(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConsumeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={consumeMutation.isPending}
                >
                  {consumeMutation.isPending ? 'Processing...' : 'Confirm Check-In'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Activity,
  Snowflake,
  Sliders,
  FileText,
  Search,
  RefreshCw,
} from 'lucide-react';
import { membershipsApi } from '@/api/endpoints/membershipsApi';
import {
  Membership,
  ContractSnapshot,
} from '../../types/memberships';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermissions } from '../../lib/permissions';

export const MembershipsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('members.memberships.edit');
  const [activeTab, setActiveTab] = useState<'memberships' | 'entitlements' | 'freezes' | 'policies'>('memberships');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [contractSnapshot, setContractSnapshot] = useState<ContractSnapshot | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);

  // Freeze form
  const [freezeFrom, setFreezeFrom] = useState('');
  const [freezeUntil, setFreezeUntil] = useState('');
  const [freezeReason, setFreezeReason] = useState('');

  // Entitlement consume form
  const [consumeType, setConsumeType] = useState('CLASS_SESSIONS');
  const [consumeUnits, setConsumeUnits] = useState('1.0');
  const [consumeReason] = useState('Session check-in');

  // Queries
  const {
    data: memberships = [],
    isLoading: loadingMemberships,
    refetch: refetchMemberships,
  } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => membershipsApi.getMemberships(),
  });

  const {
    data: entitlements = [],
    isLoading: loadingEntitlements,
    refetch: refetchEntitlements,
  } = useQuery({
    queryKey: ['membership-entitlements'],
    queryFn: () => membershipsApi.getEntitlements(),
  });

  const {
    data: freezes = [],
    isLoading: loadingFreezes,
    refetch: refetchFreezes,
  } = useQuery({
    queryKey: ['membership-freezes'],
    queryFn: () => membershipsApi.getFreezes(),
  });

  const {
    data: policies = [],
    isLoading: loadingPolicies,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: ['membership-change-policies'],
    queryFn: () => membershipsApi.getChangePolicies(),
  });

  // Mutations
  const freezeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => membershipsApi.applyFreeze(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-freezes'] });
      setIsFreezeOpen(false);
      setFreezeFrom('');
      setFreezeUntil('');
      setFreezeReason('');
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
    try {
      const snap = await membershipsApi.getContract(mem.id);
      setContractSnapshot(snap);
      setIsContractOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFreeze = (mem: Membership) => {
    setSelectedMembership(mem);
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setFreezeFrom(today);
    setFreezeUntil(nextWeek);
    setIsFreezeOpen(true);
  };

  const handleOpenConsume = (mem: Membership) => {
    setSelectedMembership(mem);
    setIsConsumeOpen(true);
  };

  const filteredMemberships = memberships.filter((m) => {
    const matchesSearch =
      m.membership_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.member_name && m.member_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.package_name && m.package_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <span className="font-semibold text-foreground">{memberships.length}</span> active plans
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchMemberships();
              refetchEntitlements();
              refetchFreezes();
              refetchPolicies();
            }}
            title="Refresh Data"
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
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
            <span>Active Memberships ({memberships.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('entitlements')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'entitlements'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Activity className="size-3.5" />
            <span>Session Quotas & Ledger ({entitlements.length})</span>
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
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'policies'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Upgrade Rules ({policies.length})</span>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      <th className="px-4 py-3">Member & ID</th>
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
                    ) : filteredMemberships.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No memberships found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMemberships.map((mem) => {
                        const ent = mem.entitlements && mem.entitlements[0];
                        const consumed = ent ? parseFloat(ent.consumed_units) : 0;
                        const allocated = ent && ent.allocated_units ? parseFloat(ent.allocated_units) : 0;
                        const pct = allocated > 0 ? Math.min(100, Math.round((consumed / allocated) * 100)) : 0;

                        return (
                          <tr key={mem.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-foreground">
                                {mem.member_name || 'Member'}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">{mem.membership_number}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-medium text-foreground">{mem.package_name}</div>
                              <div className="text-[11px] text-muted-foreground">Standard Plan</div>
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
                              {ent ? (
                                <div className="w-32">
                                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                                    <span>{consumed} used</span>
                                    <span>{ent.is_unlimited ? '∞' : `${allocated}`}</span>
                                  </div>
                                  {!ent.is_unlimited && (
                                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          pct >= 80 ? 'bg-amber-500' : 'bg-primary'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
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
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="View Contract Snapshot"
                                >
                                  <FileText className="size-3.5" />
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
          </div>
        )}

        {activeTab === 'entitlements' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-xs">
              <h2 className="text-base font-semibold text-foreground">Active Entitlement Instances</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consumable session buckets with automatic deduction and cancellation reversal tracking.
              </p>

              {loadingEntitlements ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  Loading entitlements...
                </div>
              ) : entitlements.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No entitlements found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {entitlements.map((e) => (
                    <div
                      key={e.id}
                      className="p-4 bg-muted/40 border border-border/60 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-primary">
                          {e.entitlement_type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          {e.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {e.is_unlimited ? 'Unlimited' : `${e.remaining_units || 0}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {e.allocated_units ? `${e.allocated_units} allocated` : 'unlimited'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Consumed: {e.consumed_units} session(s)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-xs">
              <h2 className="text-base font-semibold text-foreground">Change & Upgrade Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Versioned contractual rules governing proration, cancellation fees, and package transitions.
              </p>

              {loadingPolicies ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  Loading policies...
                </div>
              ) : policies.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No change policies defined.</div>
              ) : (
                <div className="divide-y divide-border/60 mt-4">
                  {policies.map((p) => (
                    <div key={p.id} className="py-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          {p.policy_name} v{p.version_number}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          {p.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {p.rules?.length || 0} active rule(s) configured for upgrades, downgrades, and cancellations.
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
      <Dialog open={isContractOpen && !!contractSnapshot && !!selectedMembership} onOpenChange={setIsContractOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Immutable Contract Snapshot</DialogTitle>
          </DialogHeader>
          {contractSnapshot && selectedMembership && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Membership: <span className="font-mono text-foreground font-semibold">{selectedMembership.membership_number}</span>
              </p>

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
                  {contractSnapshot.entitlements_snapshot?.map((es, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-muted/40 rounded-lg text-xs flex justify-between font-mono border border-border/60"
                    >
                      <span className="text-foreground">{es.entitlement_type}</span>
                      <strong className="text-primary">{es.is_unlimited ? 'Unlimited' : `${es.allocated_units} sessions`}</strong>
                    </div>
                  ))}
                </div>
              </div>
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
              <p className="text-xs text-muted-foreground">
                Member: <span className="font-semibold text-foreground">{selectedMembership.member_name}</span> ({selectedMembership.membership_number})
              </p>

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
                  disabled={freezeMutation.isPending}
                >
                  {freezeMutation.isPending ? 'Freezing...' : 'Apply Freeze'}
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
              <p className="text-xs text-muted-foreground">
                Member: <span className="font-semibold text-foreground">{selectedMembership.member_name}</span> ({selectedMembership.membership_number})
              </p>

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

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Snowflake,
  ArrowUpRight,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { membershipsApi } from '../../services/membershipsApi';
import {
  Membership,
  MembershipContractSnapshot,
  MembershipEntitlement,
  MembershipFreeze,
  MembershipChangePolicy,
} from '../../types/memberships';

interface MembershipsWorkspaceProps {
  initialTab?: 'memberships' | 'entitlements' | 'freezes' | 'policies';
}

export const MembershipsWorkspace: React.FC<MembershipsWorkspaceProps> = ({
  initialTab = 'memberships',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'memberships' | 'entitlements' | 'freezes' | 'policies'>(
    initialTab
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [contractSnapshot, setContractSnapshot] = useState<MembershipContractSnapshot | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);

  // Freeze Form
  const [freezeFrom, setFreezeFrom] = useState('');
  const [freezeUntil, setFreezeUntil] = useState('');
  const [freezeReason, setFreezeReason] = useState('');

  // Consume Form
  const [consumeType, setConsumeType] = useState('CLASS_SESSIONS');
  const [consumeUnits, setConsumeUnits] = useState('1.00');
  const [consumeReason, setConsumeReason] = useState('Front desk session check-in');

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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Memberships & Entitlements</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Active subscriptions, immutable contract snapshots, session quotas, and lifecycle freezes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                refetchMemberships();
                refetchEntitlements();
                refetchFreezes();
                refetchPolicies();
              }}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 mt-6 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
          <button
            onClick={() => setActiveTab('memberships')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'memberships'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Memberships</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {memberships.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('entitlements')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'entitlements'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Session Quotas & Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {entitlements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('freezes')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'freezes'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            <span>Freezes & Extensions</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {freezes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'policies'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Upgrade & Change Rules</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {policies.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'memberships' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search member, ID, or package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300"
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
            {loadingMemberships ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading memberships...
              </div>
            ) : filteredMemberships.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-900 dark:text-white">No memberships found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Memberships are automatically issued when package orders are settled.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Member & ID</th>
                        <th className="px-6 py-3">Package</th>
                        <th className="px-6 py-3">Branch</th>
                        <th className="px-6 py-3">Validity</th>
                        <th className="px-6 py-3">Session Quota</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMemberships.map((mem) => {
                        const ent = mem.entitlements && mem.entitlements[0];
                        const consumed = ent ? parseFloat(ent.consumed_units) : 0;
                        const allocated = ent && ent.allocated_units ? parseFloat(ent.allocated_units) : 0;
                        const pct = allocated > 0 ? Math.min(100, Math.round((consumed / allocated) * 100)) : 0;

                        return (
                          <tr key={mem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {mem.member_name || 'Member'}
                              </div>
                              <div className="text-xs font-mono text-slate-400">{mem.membership_number}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900 dark:text-white">{mem.package_name}</div>
                              <div className="text-xs text-slate-400">Standard Plan</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                              {mem.home_branch_name || 'Main Branch'}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <div className="text-slate-700 dark:text-slate-300">
                                {mem.start_date} → {mem.end_date}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {ent ? (
                                <div className="w-32">
                                  <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                                    <span>{consumed} used</span>
                                    <span>{ent.is_unlimited ? '∞' : `${allocated}`}</span>
                                  </div>
                                  {!ent.is_unlimited && (
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No quota</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                  mem.status === 'ACTIVE'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    : mem.status === 'FROZEN'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                }`}
                              >
                                {mem.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenContract(mem)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                  title="View Contract Snapshot"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenConsume(mem)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"
                                  title="Check-In / Consume Session"
                                >
                                  <Activity className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenFreeze(mem)}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                                  title="Freeze Membership"
                                >
                                  <Snowflake className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'entitlements' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Active Entitlement Instances</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consumable session buckets with automatic deduction and cancellation reversal tracking.
              </p>

              {loadingEntitlements ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading entitlements...
                </div>
              ) : entitlements.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No entitlements found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {entitlements.map((e) => (
                    <div
                      key={e.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {e.entitlement_type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                          {e.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {e.is_unlimited ? 'Unlimited' : `${e.remaining_units || 0}`}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {e.allocated_units ? `${e.allocated_units} allocated` : 'unlimited'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
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
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Membership Freezes & Leaves</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved medical and personal freeze intervals automatically extending membership validity.
              </p>

              {loadingFreezes ? (
                <div className="p-8 text-center text-slate-500">Loading freezes...</div>
              ) : freezes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No freeze records on file.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-4">
                  {freezes.map((f) => (
                    <div key={f.id} className="py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Snowflake className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {f.freeze_from} → {f.freeze_until}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded">
                            {f.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{f.reason_text || 'No reason provided'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          +{f.extend_membership_days || 0} days
                        </span>
                        <span className="text-xs text-slate-400 block">Extended</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Change & Upgrade Policies</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Versioned contractual rules governing proration, cancellation fees, and package transitions.
              </p>

              {loadingPolicies ? (
                <div className="p-8 text-center text-slate-500">Loading policies...</div>
              ) : policies.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No change policies defined.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-4">
                  {policies.map((p) => (
                    <div key={p.id} className="py-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {p.policy_name} v{p.version_number}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                          {p.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {p.rules?.length || 0} active rule(s) configured for upgrades, downgrades, and cancellations.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contract Snapshot Modal */}
      {isContractOpen && contractSnapshot && selectedMembership && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Immutable Contract Snapshot</h3>
                <p className="text-xs text-slate-500">Membership: {selectedMembership.membership_number}</p>
              </div>
              <button
                onClick={() => setIsContractOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">Package Snapshot:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{contractSnapshot.package_name_snapshot}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Duration:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {contractSnapshot.duration_value} {contractSnapshot.duration_unit}(S)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Purchase Price:</span>
                  <strong className="text-slate-800 dark:text-slate-200">₹{contractSnapshot.purchase_price}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Final Amount Paid:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹{contractSnapshot.final_amount}
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Snapshotted Entitlements
                </span>
                <div className="space-y-1.5">
                  {contractSnapshot.entitlements_snapshot?.map((es, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs flex justify-between font-mono"
                    >
                      <span>{es.entitlement_type}</span>
                      <strong>{es.is_unlimited ? 'Unlimited' : `${es.allocated_units} sessions`}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsContractOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Membership Modal */}
      {isFreezeOpen && selectedMembership && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Membership Freeze</h3>
            <p className="text-xs text-slate-500 mt-1">
              Member: {selectedMembership.member_name} ({selectedMembership.membership_number})
            </p>

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
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Freeze From</label>
                <input
                  type="date"
                  required
                  value={freezeFrom}
                  onChange={(e) => setFreezeFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Freeze Until</label>
                <input
                  type="date"
                  required
                  value={freezeUntil}
                  onChange={(e) => setFreezeUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Travel or Medical leave"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFreezeOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={freezeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {freezeMutation.isPending ? 'Freezing...' : 'Apply Freeze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consume Session Modal */}
      {isConsumeOpen && selectedMembership && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Check-In / Consume Entitlement</h3>
            <p className="text-xs text-slate-500 mt-1">
              Member: {selectedMembership.member_name} ({selectedMembership.membership_number})
            </p>

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
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Entitlement Type</label>
                <select
                  value={consumeType}
                  onChange={(e) => setConsumeType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  <option value="CLASS_SESSIONS">CLASS_SESSIONS</option>
                  <option value="PERSONAL_TRAINING">PERSONAL_TRAINING</option>
                  <option value="OPEN_GYM">OPEN_GYM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Units to Consume</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={consumeUnits}
                  onChange={(e) => setConsumeUnits(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConsumeOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={consumeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {consumeMutation.isPending ? 'Processing...' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

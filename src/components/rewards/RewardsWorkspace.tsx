import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift,
  Award,
  Users,
  Share2,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Coins,
  Wallet,
  ArrowUpRight,
  Sliders,
  Copy,
  Check,
  Percent,
} from 'lucide-react';
import { rewardsApi } from '../../services/rewardsApi';
import {
  ReferralProgram,
  ReferralIdentifier,
  Referral,
  RewardAccount,
  RewardLedger,
  ReferralQualificationRule,
  ReferralBenefitRule,
} from '../../types/rewards';

interface RewardsWorkspaceProps {
  initialTab?: 'referrals' | 'programs' | 'accounts' | 'ledger' | 'rules';
}

export const RewardsWorkspace: React.FC<RewardsWorkspaceProps> = ({
  initialTab = 'referrals',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'referrals' | 'programs' | 'accounts' | 'ledger' | 'rules'
  >(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RewardAccount | null>(null);
  const [grantType, setGrantType] = useState('POINTS');
  const [grantQuantity, setGrantQuantity] = useState('100.00');
  const [grantReasonCode, setGrantReasonCode] = useState('MANUAL_GRANT');
  const [grantReason, setGrantReason] = useState('Customer loyalty reward');
  const [modalError, setModalError] = useState<string | null>(null);

  // Queries
  const {
    data: referrals = [],
    isLoading: loadingReferrals,
    refetch: refetchReferrals,
  } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => rewardsApi.getReferrals(),
  });

  const {
    data: programs = [],
    isLoading: loadingPrograms,
    refetch: refetchPrograms,
  } = useQuery({
    queryKey: ['referral-programs'],
    queryFn: () => rewardsApi.getPrograms(),
  });

  const {
    data: identifiers = [],
    isLoading: loadingIdentifiers,
    refetch: refetchIdentifiers,
  } = useQuery({
    queryKey: ['referral-identifiers'],
    queryFn: () => rewardsApi.getIdentifiers(),
  });

  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['reward-accounts'],
    queryFn: () => rewardsApi.getRewardAccounts(),
  });

  const {
    data: ledgers = [],
    isLoading: loadingLedgers,
    refetch: refetchLedgers,
  } = useQuery({
    queryKey: ['reward-ledgers'],
    queryFn: () => rewardsApi.getRewardLedgers(),
  });

  const {
    data: qualRules = [],
    isLoading: loadingQualRules,
    refetch: refetchQualRules,
  } = useQuery({
    queryKey: ['referral-qualification-rules'],
    queryFn: () => rewardsApi.getQualificationRules(),
  });

  const {
    data: benefitRules = [],
    isLoading: loadingBenefitRules,
    refetch: refetchBenefitRules,
  } = useQuery({
    queryKey: ['referral-benefit-rules'],
    queryFn: () => rewardsApi.getBenefitRules(),
  });

  // Mutations
  const grantMutation = useMutation({
    mutationFn: (data: {
      user_profile_id: string;
      reward_type: string;
      quantity: string;
      reason_code: string;
      reason: string;
    }) => rewardsApi.earnRewards(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reward-ledgers'] });
      setIsGrantOpen(false);
      setSelectedAccount(null);
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err?.message || 'Failed to grant rewards.');
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: (referralId: string) => rewardsApi.qualifyReferral(referralId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['reward-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reward-ledgers'] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics
  const totalReferrals = referrals.length;
  const rewardedCount = referrals.filter((r) => r.status === 'REWARDED').length;
  const qualifiedCount = referrals.filter((r) => r.status === 'QUALIFIED').length;
  const totalPointsCirculation = accounts.reduce(
    (acc, a) => acc + parseFloat(a.points_balance || '0'),
    0
  );
  const totalCreditIssued = accounts.reduce(
    (acc, a) => acc + parseFloat(a.credit_balance || '0'),
    0
  );

  // Filtered referrals
  const filteredReferrals = referrals.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.identifier_used?.toLowerCase().includes(term) ||
      r.referrer_email?.toLowerCase().includes(term) ||
      r.referred_email?.toLowerCase().includes(term) ||
      r.status?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Gift className="w-7 h-7 text-indigo-400" />
            Referrals, Loyalty & Rewards Engine
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track member referral attribution funnels, double-entry loyalty points & store credit ledgers, and qualification rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchReferrals();
              refetchPrograms();
              refetchIdentifiers();
              refetchAccounts();
              refetchLedgers();
              refetchQualRules();
              refetchBenefitRules();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Referrals</div>
          <div className="text-2xl font-bold text-white mt-1">{totalReferrals}</div>
          <div className="text-xs text-zinc-500 mt-1">Invited & attributed</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Rewarded</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{rewardedCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Benefits disbursed</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Points Circulation</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{totalPointsCirculation.toLocaleString()}</div>
          <div className="text-xs text-zinc-500 mt-1">Active member balance</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Wallet Credit</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">${totalCreditIssued.toFixed(2)}</div>
          <div className="text-xs text-zinc-500 mt-1">Spendable balance</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-purple-400 uppercase tracking-wider">Active Programs</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{programs.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Rule sets enabled</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('referrals')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'referrals'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Referral Funnel ({referrals.length})
        </button>
        <button
          onClick={() => setActiveTab('programs')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'programs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          Programs & Codes ({identifiers.length})
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          Member Loyalty Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Double-Entry Ledger ({ledgers.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Qualification & Benefits ({qualRules.length + benefitRules.length})
        </button>
      </div>

      {/* Tab: Referrals Funnel */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search referral code, referrer, referee..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Referral Code</th>
                    <th className="px-5 py-3.5">Program</th>
                    <th className="px-5 py-3.5">Referrer</th>
                    <th className="px-5 py-3.5">Referred User</th>
                    <th className="px-5 py-3.5">Source</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loadingReferrals ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading referrals...
                      </td>
                    </tr>
                  ) : filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        No referrals found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-300">
                          {ref.identifier_used}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-400">{ref.program_name || 'Standard Referral'}</td>
                        <td className="px-5 py-4">
                          <div className="text-zinc-200 font-medium">{ref.referrer_email}</div>
                          <div className="text-xs text-zinc-500">{ref.referrer_type}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-zinc-200 font-medium">
                            {ref.referred_user_email || ref.referred_email || 'Pending Registration'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {ref.source}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ref.status === 'REWARDED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ref.status === 'QUALIFIED'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : ref.status === 'REGISTERED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {ref.status === 'REGISTERED' && (
                            <button
                              onClick={() => qualifyMutation.mutate(ref.id)}
                              disabled={qualifyMutation.isPending}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                            >
                              Qualify & Reward
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Programs & Codes */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((p) => (
              <div key={p.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base">{p.name}</h3>
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">{p.code}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{p.description || 'Active member & trainer referral campaign.'}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Active Referral Share Identifiers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Code Value</th>
                    <th className="px-5 py-3.5">Owner Email</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {identifiers.map((ident) => (
                    <tr key={ident.id} className="hover:bg-zinc-800/30 transition">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-300">{ident.identifier_value}</td>
                      <td className="px-5 py-4 text-zinc-200">{ident.owner_email}</td>
                      <td className="px-5 py-4 text-xs text-zinc-400">{ident.identifier_type}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ident.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => copyToClipboard(ident.identifier_value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 inline-flex items-center gap-1.5 transition"
                        >
                          {copiedCode === ident.identifier_value ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Member Loyalty Accounts */}
      {activeTab === 'accounts' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Points Balance</th>
                  <th className="px-5 py-3.5">Store Credit</th>
                  <th className="px-5 py-3.5">Lifetime Earned</th>
                  <th className="px-5 py-3.5">Lifetime Redeemed</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-4 font-medium text-white">
                      {acc.user_name || 'Member'}
                      <div className="text-xs text-zinc-500 font-mono">{acc.member_number}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-indigo-400">{acc.points_balance} pts</td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">${acc.credit_balance}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{acc.lifetime_earned}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{acc.lifetime_redeemed}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setIsGrantOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition"
                      >
                        Grant Points
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Double-Entry Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Tx Type</th>
                  <th className="px-5 py-3.5">Reward Type</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">Balance After</th>
                  <th className="px-5 py-3.5">Reason Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {ledgers.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-zinc-200">{l.user_name || 'Member'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          l.transaction_type === 'EARN'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {l.transaction_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{l.reward_type}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-white">{l.quantity}</td>
                    <td className="px-5 py-4 font-mono text-indigo-400">{l.balance_after}</td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400">{l.reason_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rules & Qualification */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3">Referral Qualification Trigger Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualRules.map((rule) => (
                <div key={rule.id} className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400 font-semibold">{rule.qualification_event}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{rule.status}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Minimum Order Amount: <span className="text-white font-semibold">${rule.minimum_order_amount || '0.00'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3">Referral Benefit Disbursement Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefitRules.map((rule) => (
                <div key={rule.id} className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">Beneficiary: {rule.beneficiary}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{rule.benefit_type}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Reward Value: <span className="text-emerald-400 font-semibold">{rule.benefit_value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Grant Modal */}
      {isGrantOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-400" />
                Grant Member Rewards
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Credit loyalty points or wallet balance to member account.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Type</label>
                <select
                  value={grantType}
                  onChange={(e) => setGrantType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="POINTS">Points (Loyalty Currency)</option>
                  <option value="CREDIT">Store Wallet Credit ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Quantity</label>
                <input
                  type="number"
                  value={grantQuantity}
                  onChange={(e) => setGrantQuantity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason Code</label>
                <input
                  type="text"
                  value={grantReasonCode}
                  onChange={(e) => setGrantReasonCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description Notes</label>
                <textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsGrantOpen(false);
                  setSelectedAccount(null);
                  setModalError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  grantMutation.mutate({
                    user_profile_id: selectedAccount.user_profile,
                    reward_type: grantType,
                    quantity: grantQuantity,
                    reason_code: grantReasonCode,
                    reason: grantReason,
                  })
                }
                disabled={grantMutation.isPending}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
              >
                {grantMutation.isPending ? 'Granting...' : 'Confirm Grant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

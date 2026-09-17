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
  Coins,
  Sliders,
  Copy,
  Check,
} from 'lucide-react';
import { rewardsApi } from '../../services/rewardsApi';
import {
  RewardAccount,
} from '../../types/rewards';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Referrals, Loyalty & Rewards Engine"
        description="Track member referral attribution funnels, double-entry loyalty points & store credit ledgers, and qualification rules."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchReferrals();
                refetchPrograms();
                refetchIdentifiers();
                refetchAccounts();
                refetchLedgers();
                refetchQualRules();
                refetchBenefitRules();
              }}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 mb-6">
          <KpiTile
            title="Total Referrals"
            value={totalReferrals}
            badge={{ text: 'Attributed', variant: 'neutral' }}
          />
          <KpiTile
            title="Rewarded"
            value={rewardedCount}
            badge={{ text: 'Disbursed', variant: 'success' }}
          />
          <KpiTile
            title="Points Circulation"
            value={totalPointsCirculation.toLocaleString('en-IN')}
            badge={{ text: 'Active Balance', variant: 'info' }}
          />
          <KpiTile
            title="Wallet Credit"
            value={`₹${totalCreditIssued.toFixed(2)}`}
            badge={{ text: 'Spendable', variant: 'warning' }}
          />
          <KpiTile
            title="Active Programs"
            value={programs.length}
            badge={{ text: 'Rule sets', variant: 'info' }}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/40 gap-1 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('referrals')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'referrals'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Referral Funnel</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {referrals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('programs')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'programs'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Programs & Codes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {identifiers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'accounts'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Member Accounts</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {accounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Double-Entry Ledger</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {ledgers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Rules & Benefits</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {qualRules.length + benefitRules.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Referrals Funnel */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search referral code, referrer, referee..."
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 font-semibold">
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
                  <tbody className="divide-y divide-border/60">
                    {loadingReferrals ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Loading referrals...
                        </td>
                      </tr>
                    ) : filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                          No referrals found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-muted/30 transition">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-primary">
                            {ref.identifier_used}
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{ref.program_name || 'Standard Referral'}</td>
                          <td className="px-5 py-4">
                            <div className="text-foreground font-medium text-xs">{ref.referrer_email}</div>
                            <div className="text-[11px] text-muted-foreground">{ref.referrer_type}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-foreground font-medium text-xs">
                              {ref.referred_user_email || ref.referred_email || 'Pending Registration'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {ref.source}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              variant={
                                ref.status === 'REWARDED'
                                  ? 'default'
                                  : ref.status === 'QUALIFIED'
                                  ? 'outline'
                                  : 'secondary'
                              }
                              className="text-xs font-semibold"
                            >
                              {ref.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {ref.status === 'REGISTERED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => qualifyMutation.mutate(ref.id)}
                                disabled={qualifyMutation.isPending}
                                className="text-xs h-7"
                              >
                                Qualify & Reward
                              </Button>
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

        {/* Tab 2: Programs & Codes */}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programs.map((p) => (
                <div key={p.id} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{p.name}</h3>
                      <p className="text-xs text-primary font-mono mt-0.5">{p.code}</p>
                    </div>
                    <Badge variant="default" className="text-xs">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description || 'Active member & trainer referral campaign.'}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border/60">
                <h3 className="text-sm font-semibold text-foreground">Active Referral Share Identifiers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Code Value</th>
                      <th className="px-5 py-3.5">Owner Email</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {identifiers.map((ident) => (
                      <tr key={ident.id} className="hover:bg-muted/30 transition">
                        <td className="px-5 py-4 font-mono font-bold text-primary">{ident.identifier_value}</td>
                        <td className="px-5 py-4 text-foreground text-xs">{ident.owner_email}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{ident.identifier_type}</td>
                        <td className="px-5 py-4">
                          <Badge variant="default" className="text-xs">
                            {ident.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(ident.identifier_value)}
                            className="text-xs h-7 gap-1.5"
                          >
                            {copiedCode === ident.identifier_value ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> <span>Copy Code</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Member Loyalty Accounts */}
        {activeTab === 'accounts' && (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 font-semibold">
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
                <tbody className="divide-y divide-border/60">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-muted/30 transition">
                      <td className="px-5 py-4 font-medium text-foreground text-xs">
                        {acc.user_name || 'Member'}
                        <div className="text-[11px] text-muted-foreground font-mono">{acc.member_number}</div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-primary text-xs">{acc.points_balance} pts</td>
                      <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">₹{acc.credit_balance}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{acc.lifetime_earned}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{acc.lifetime_redeemed}</td>
                      <td className="px-5 py-4">
                        <Badge variant="default" className="text-xs">
                          {acc.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setIsGrantOpen(true);
                          }}
                          className="text-xs h-7"
                        >
                          Grant Points
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Double-Entry Ledger */}
        {activeTab === 'ledger' && (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 font-semibold">
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
                <tbody className="divide-y divide-border/60">
                  {ledgers.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-foreground text-xs">{l.user_name || 'Member'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            l.transaction_type === 'EARN'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {l.transaction_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{l.reward_type}</td>
                      <td className="px-5 py-4 font-mono font-semibold text-foreground text-xs">{l.quantity}</td>
                      <td className="px-5 py-4 font-mono text-primary text-xs">{l.balance_after}</td>
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{l.reason_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Rules & Qualification */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs">
              <h3 className="font-semibold text-foreground mb-3 text-base">Referral Qualification Trigger Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {qualRules.map((rule) => (
                  <div key={rule.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primary font-semibold">{rule.qualification_event}</span>
                      <Badge variant="default" className="text-xs">{rule.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Minimum Order Amount: <span className="text-foreground font-semibold">₹{rule.minimum_order_amount || '0.00'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs">
              <h3 className="font-semibold text-foreground mb-3 text-base">Referral Benefit Disbursement Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefitRules.map((rule) => (
                  <div key={rule.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">Beneficiary: {rule.beneficiary}</span>
                      <Badge variant="outline" className="text-xs">{rule.benefit_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reward Value: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{rule.benefit_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageBody>

      {/* Manual Grant Modal */}
      {selectedAccount && (
        <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <span>Grant Member Rewards</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Credit loyalty points or wallet balance to member account.
              </p>
            </DialogHeader>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-sm pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Reward Type</label>
                <select
                  value={grantType}
                  onChange={(e) => setGrantType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="POINTS">Points (Loyalty Currency)</option>
                  <option value="CREDIT">Store Wallet Credit (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Quantity</label>
                <Input
                  type="number"
                  value={grantQuantity}
                  onChange={(e) => setGrantQuantity(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Reason Code</label>
                <Input
                  type="text"
                  value={grantReasonCode}
                  onChange={(e) => setGrantReasonCode(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description Notes</label>
                <Input
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsGrantOpen(false);
                  setSelectedAccount(null);
                  setModalError(null);
                }}
              >
                Cancel
              </Button>
              <Button
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
              >
                {grantMutation.isPending ? 'Granting...' : 'Confirm Grant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

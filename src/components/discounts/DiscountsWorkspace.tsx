import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Sparkles,
  Percent,
  Plus,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Award,
} from 'lucide-react';
import { discountsApi } from '@/api/endpoints/discountsApi';
import { api } from '@/api/client';
import {
  DiscountCampaign,
  CouponValidationResult,
  DynamicOffer,
  DiscountType,
} from '../../types/discounts';
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
import { usePermissions } from '../../lib/permissions';
import { CRMPageHeader } from '@/components/crm/common/CRMPageHeader';
import { CRMKpiTile } from '@/components/crm/common/CRMKpiTile';
import { CRMFilterBar } from '@/components/crm/common/CRMFilterBar';
import { CRMEmptyState } from '@/components/crm/common/CRMEmptyState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';
import { cn } from '@/lib/utils';

interface DiscountsWorkspaceProps {
  initialTab?: 'campaigns' | 'rules' | 'redemptions' | 'simulator';
  title?: string;
  subtitle?: string;
  mode?: 'offers' | 'coupons' | 'all';
}

export const DiscountsWorkspace: React.FC<DiscountsWorkspaceProps> = ({
  initialTab,
  title,
  subtitle,
  mode = 'all',
}) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('finance.discounts.create') || can('finance.pricing.create') || can('core.settings.edit');
  const defaultTab = initialTab || (mode === 'offers' ? 'rules' : 'campaigns');
  const [activeTab, setActiveTab] = useState<'campaigns' | 'rules' | 'redemptions' | 'simulator'>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');

  const displayTitle =
    title ||
    (mode === 'offers'
      ? 'Offers & Dynamic Rules'
      : mode === 'coupons'
      ? 'Coupons & Promo Codes'
      : 'Coupons & Dynamic Offers');

  const displaySubtitle =
    subtitle ||
    (mode === 'offers'
      ? 'Configure automated member retention incentives, eligibility thresholds, and workout rewards.'
      : mode === 'coupons'
      ? 'Promotional discount campaigns, redeemable voucher codes, and usage limit caps.'
      : 'Automated discount engine, promotional campaigns, usage caps, and personalized retention incentives.');

  // Modals
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isGenerateCodeOpen, setIsGenerateCodeOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DiscountCampaign | null>(null);

  // Form states
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campType, setCampType] = useState<DiscountType>('PERCENTAGE');
  const [campValue, setCampValue] = useState('15.00');
  const [campMaxDiscount, setCampMaxDiscount] = useState('1000.00');
  const [campMinOrder, setCampMinOrder] = useState('500.00');
  const [campUsageLimit, setCampUsageLimit] = useState('100');
  const [campPerUserLimit, setCampPerUserLimit] = useState('1');

  // Code form
  const [customCode, setCustomCode] = useState('');

  // Simulator state
  const [simCode, setSimCode] = useState('SUMMER20');
  const [simSubtotal, setSimSubtotal] = useState('5000');
  const [simUserProfileId, setSimUserProfileId] = useState('');
  const [simUsagePct, setSimUsagePct] = useState('85');
  const [simResult, setSimResult] = useState<CouponValidationResult | null>(null);
  const [simOffers, setSimOffers] = useState<DynamicOffer[]>([]);
  const [simError, setSimError] = useState<string | null>(null);

  // Fetch real user profiles for simulator context
  const { data: userProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['simulator-user-profiles'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/user-profiles/?page_size=100');
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      return list as Array<{
        id: string;
        full_name?: string;
        email?: string;
        phone_snapshot?: string;
      }>;
    },
    staleTime: 60 * 1000,
  });

  React.useEffect(() => {
    if (!simUserProfileId && userProfiles.length > 0) {
      setSimUserProfileId(userProfiles[0].id);
    }
  }, [userProfiles, simUserProfileId]);

  // Queries
  const {
    data: campaigns = [],
    isLoading: loadingCampaigns,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ['discount-campaigns'],
    queryFn: () => discountsApi.getCampaigns(),
  });

  const {
    data: rules = [],
    isLoading: loadingRules,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['discount-rules'],
    queryFn: () => discountsApi.getEligibilityRules(),
  });

  const {
    data: redemptions = [],
    isLoading: loadingRedemptions,
    refetch: refetchRedemptions,
  } = useQuery({
    queryKey: ['discount-redemptions'],
    queryFn: () => discountsApi.getRedemptions(),
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: Partial<DiscountCampaign>) => discountsApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      setIsCreateCampaignOpen(false);
      resetCampaignForm();
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: ({ campaignId, code }: { campaignId: string; code?: string }) =>
      discountsApi.generateCouponCode(campaignId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      setIsGenerateCodeOpen(false);
      setCustomCode('');
    },
  });

  const resetCampaignForm = () => {
    setCampName('');
    setCampDesc('');
    setCampType('PERCENTAGE');
    setCampValue('15.00');
    setCampMaxDiscount('1000.00');
    setCampMinOrder('500.00');
    setCampUsageLimit('100');
    setCampPerUserLimit('1');
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaignMutation.mutate({
      name: campName,
      description: campDesc,
      discount_type: campType,
      discount_value: campValue,
      max_discount: campMaxDiscount ? campMaxDiscount : null,
      minimum_order_amount: campMinOrder ? campMinOrder : null,
      usage_limit: campUsageLimit ? parseInt(campUsageLimit) : null,
      per_user_limit: campPerUserLimit ? parseInt(campPerUserLimit) : null,
      valid_from: new Date().toISOString(),
      status: 'ACTIVE',
    });
  };

  const handleSimulateCoupon = async () => {
    setSimError(null);
    setSimResult(null);
    if (!simUserProfileId) {
      setSimError('Please select an active member user profile to simulate coupon application.');
      return;
    }
    try {
      const res = await discountsApi.validateCoupon({
        code: simCode,
        user_profile_id: simUserProfileId,
        order_subtotal: simSubtotal,
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.response?.data?.reason || err.response?.data?.error || 'Validation failed.');
    }
  };

  const handleSimulateOffers = async () => {
    setSimError(null);
    if (!simUserProfileId) {
      setSimError('Please select an active member user profile to evaluate dynamic offers.');
      return;
    }
    try {
      const res = await discountsApi.evaluateOffers({
        user_profile_id: simUserProfileId,
        usage_percentage: parseFloat(simUsagePct) || 0,
        sessions_consumed: 16,
        sessions_remaining: 4,
      });
      setSimOffers(res.offers || []);
    } catch (err: any) {
      setSimError(err.response?.data?.error || 'Failed to evaluate offers.');
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codes?.some((code) => code.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCampaignsCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalSavingsIssued = redemptions.reduce(
    (acc, r) => acc + (parseFloat(r.discount_amount || '0') || 0),
    0
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title={displayTitle}
        subtitle={displaySubtitle}
        icon={mode === 'offers' ? Sparkles : Tag}
        badgeText={mode === 'offers' ? 'Retention Engine' : 'Promotions'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCampaigns();
                refetchRules();
                refetchRedemptions();
              }}
              className="gap-1.5 h-9"
              title="Refresh discounts"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreateCampaignOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Campaign</span>
              </Button>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <CRMKpiTile
            label="Active Campaigns"
            value={activeCampaignsCount}
            isLoading={loadingCampaigns}
            badge={{ text: `${campaigns.length} Total`, variant: 'info' }}
            hint="Promotions in circulation"
          />
          <CRMKpiTile
            label="Eligibility Rules"
            value={rules.length}
            isLoading={loadingRules}
            badge={{ text: 'Contextual', variant: 'neutral' }}
            hint="Dynamic member criteria"
          />
          <CRMKpiTile
            label="Total Redemptions"
            value={redemptions.length}
            isLoading={loadingRedemptions}
            badge={{ text: 'Verified', variant: 'positive' }}
            hint="Checkout discounts applied"
          />
          <CRMKpiTile
            label="Total Savings Issued"
            value={`₹${totalSavingsIssued.toLocaleString('en-IN')}`}
            isLoading={loadingRedemptions}
            badge={{ text: 'Savings', variant: 'warning' }}
            hint="Customer discount value"
          />
        </div>

        {/* Navigation Tabs (Consistent segmented controls) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2',
              activeTab === 'campaigns'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Campaigns & Codes</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {campaigns.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2',
              activeTab === 'rules'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dynamic Rules</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {rules.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('redemptions')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2',
              activeTab === 'redemptions'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Redemption Audit</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {redemptions.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2',
              activeTab === 'simulator'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Checkout Simulator</span>
          </button>
        </div>

        {/* Tab 1: Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <CRMFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search campaigns or promo codes..."
              onReset={() => setSearchTerm('')}
              hasActiveFilters={Boolean(searchTerm)}
            />

            {loadingCampaigns ? (
              <CRMLoadingState message="Loading discount campaigns..." />
            ) : filteredCampaigns.length === 0 ? (
              <CRMEmptyState
                icon={Tag}
                title="No Campaigns Found"
                description="No discount campaigns match your current filters. Create a promotional voucher campaign to reward prospects and members."
                actionLabel={canCreate ? '+ Create Campaign' : undefined}
                onAction={() => setIsCreateCampaignOpen(true)}
                canAction={canCreate}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={camp.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {camp.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono font-medium">
                          {camp.discount_type === 'PERCENTAGE' ? `${camp.discount_value}% OFF` : `₹${camp.discount_value} OFF`}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-foreground mt-3">{camp.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {camp.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        {camp.max_discount && (
                          <div className="flex items-center justify-between">
                            <span>Max Discount Cap:</span>
                            <span className="font-medium text-foreground">₹{camp.max_discount}</span>
                          </div>
                        )}
                        {camp.minimum_order_amount && (
                          <div className="flex items-center justify-between">
                            <span>Min Order Amount:</span>
                            <span className="font-medium text-foreground">₹{camp.minimum_order_amount}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Total Redemptions:</span>
                          <span className="font-medium text-primary">
                            {camp.redemption_count || 0} {camp.usage_limit ? `/ ${camp.usage_limit}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Associated Codes */}
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                          Active Promo Codes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {camp.codes && camp.codes.length > 0 ? (
                            camp.codes.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-xs font-mono text-primary font-semibold"
                              >
                                {c.code}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No codes generated yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(camp);
                          setIsGenerateCodeOpen(true);
                        }}
                        className="text-xs h-8 text-primary hover:text-primary/80 gap-1 px-2.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Code</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Rules */}
        {activeTab === 'rules' && (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Dynamic Eligibility Rules</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contextual triggers evaluating session consumption, membership age, and automatic upgrade incentives.
              </p>
            </div>

            {loadingRules ? (
              <CRMLoadingState message="Loading eligibility rules..." />
            ) : rules.length === 0 ? (
              <CRMEmptyState
                icon={Sparkles}
                title="No Dynamic Eligibility Rules"
                description="No dynamic retention rules configured. Contextual triggers evaluate session consumption, membership age, and automatic upgrade incentives."
              />
            ) : (
              <div className="divide-y divide-border/60 p-4 sm:p-5">
                {rules.map((r) => (
                  <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{r.name}</h4>
                          <Badge variant="outline" className="text-[11px] font-mono">
                            Priority: {r.priority}
                          </Badge>
                          <span className="text-[11px] px-2 py-0.5 bg-muted rounded text-muted-foreground">
                            {r.rule_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      </div>
                      <Badge variant="default" className="text-xs w-fit">
                        {r.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/40 rounded-xl text-xs border border-border/40">
                        <span className="font-medium text-muted-foreground block mb-1">Evaluation Conditions:</span>
                        {r.conditions && r.conditions.length > 0 ? (
                          r.conditions.map((c) => (
                            <div key={c.id} className="text-foreground font-mono text-[11px]">
                              • {c.condition_type} {c.operator} {c.numeric_value || c.text_value || 'true'}
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic">Always matches</span>
                        )}
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 block mb-1">
                          Produced Offer Action:
                        </span>
                        {r.actions && r.actions.length > 0 ? (
                          r.actions.map((a) => (
                            <div key={a.id} className="text-emerald-700 dark:text-emerald-300">
                              <strong>{a.action_type}</strong>: {a.message || `${a.discount_percentage}% discount`}
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic">No action configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Redemptions */}
        {activeTab === 'redemptions' && (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Discount Redemption Audit</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immutable record of promotional coupons and dynamic offers applied to member orders.
              </p>
            </div>

            {loadingRedemptions ? (
              <CRMLoadingState message="Loading discount redemptions..." />
            ) : redemptions.length === 0 ? (
              <CRMEmptyState
                icon={Award}
                title="No Redemptions Recorded"
                description="No discounts or promotional coupon redemptions have been processed yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Redeemed At</th>
                      <th className="px-5 py-3">Code / Offer</th>
                      <th className="px-5 py-3">Campaign</th>
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3 text-right">Discount Given</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition">
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">
                          {r.coupon_code || 'DYNAMIC OFFER'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-foreground">{r.campaign_name}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                          {r.user_profile_id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3.5 text-xs text-right font-medium text-emerald-600 dark:text-emerald-400">
                          -₹{r.discount_amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Simulator */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulator Inputs */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <span>Coupon Validation Test</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Simulate checkout order subtotal and verify coupon logic, limits, caps, and error reasons.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Member / User Profile *
                  </label>
                  {loadingProfiles ? (
                    <div className="h-9 px-3 rounded-md border border-input bg-muted/20 flex items-center text-xs text-muted-foreground">
                      Loading member profiles...
                    </div>
                  ) : userProfiles.length === 0 ? (
                    <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                      No active member user profiles found. Create a member account to simulate user-specific discounts.
                    </div>
                  ) : (
                    <select
                      value={simUserProfileId}
                      onChange={(e) => setSimUserProfileId(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Member Profile --</option>
                      {userProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || 'Member'} ({p.email || p.phone_snapshot || p.id.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Authoritative profile used by backend to check redemption history and eligibility.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Coupon Code</label>
                  <Input
                    type="text"
                    value={simCode}
                    onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Cart Subtotal (₹)</label>
                  <Input
                    type="number"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <Button
                  onClick={handleSimulateCoupon}
                  disabled={!simUserProfileId}
                  className="w-full h-9 text-xs font-semibold"
                >
                  Validate Coupon
                </Button>
              </div>

              {/* Dynamic Offers Test */}
              <div className="pt-5 border-t border-border/60">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Dynamic Upgrade Incentive Test</span>
                </h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Member Session Usage (%)
                    </label>
                    <Input
                      type="number"
                      value={simUsagePct}
                      onChange={(e) => setSimUsagePct(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSimulateOffers}
                    disabled={!simUserProfileId}
                    className="w-full h-9 text-xs font-semibold"
                  >
                    Check Qualified Offers
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Output */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-4">Simulation Results</h2>

                {simError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong>Rejected:</strong> {simError}
                    </div>
                  </div>
                )}

                {simResult && simResult.is_valid && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Coupon Validated Successfully!</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-500/20">
                      <div>Campaign: {simResult.campaign_name}</div>
                      <div>Type: {simResult.discount_type}</div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Discount: -₹{simResult.discount_amount}
                      </div>
                      <div className="font-bold text-foreground">
                        Final Total: ₹{simResult.final_subtotal}
                      </div>
                    </div>
                  </div>
                )}

                {simOffers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Qualified Dynamic Incentives
                    </span>
                    {simOffers.map((off, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs"
                      >
                        <span className="font-semibold text-amber-700 dark:text-amber-300">{off.rule_name}</span>
                        <p className="text-amber-600 dark:text-amber-400 mt-1">{off.message}</p>
                        <div className="mt-2 text-amber-700 dark:text-amber-300 font-mono">
                          Benefit: {off.discount_percentage ? `${off.discount_percentage}% OFF` : `₹${off.discount_amount} OFF`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!simError && !simResult && simOffers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Select a member profile and enter test parameters on the left to evaluate discounts.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Campaign Modal */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent className="max-w-lg bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Create Discount Campaign
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Campaign Name</label>
              <Input
                type="text"
                required
                placeholder="e.g. Diwali Flash Sale"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                placeholder="Campaign notes and eligibility"
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Discount Type</label>
                <select
                  value={campType}
                  onChange={(e) => setCampType(e.target.value as DiscountType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Discount Value</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={campValue}
                  onChange={(e) => setCampValue(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Max Discount Cap (₹)</label>
                <Input
                  type="number"
                  placeholder="Optional cap"
                  value={campMaxDiscount}
                  onChange={(e) => setCampMaxDiscount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Min Order Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={campMinOrder}
                  onChange={(e) => setCampMinOrder(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Total Usage Cap</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={campUsageLimit}
                  onChange={(e) => setCampUsageLimit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Per User Limit</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={campPerUserLimit}
                  onChange={(e) => setCampPerUserLimit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateCampaignOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createCampaignMutation.isPending}
                className="h-9 text-xs font-semibold"
              >
                {createCampaignMutation.isPending ? 'Saving...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Code Modal */}
      <Dialog open={isGenerateCodeOpen} onOpenChange={setIsGenerateCodeOpen}>
        <DialogContent className="max-w-sm bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Generate Promo Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Add a new promo code for <strong>{selectedCampaign?.name}</strong>. Leave custom code empty to generate a random code.
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Custom Code (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. SUMMER50"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                className="font-mono h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateCodeOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={generateCodeMutation.isPending}
                onClick={() => {
                  if (selectedCampaign) {
                    generateCodeMutation.mutate({
                      campaignId: selectedCampaign.id,
                      code: customCode.trim() || undefined,
                    });
                  }
                }}
                className="h-9 text-xs font-semibold"
              >
                {generateCodeMutation.isPending ? 'Creating...' : 'Create Code'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

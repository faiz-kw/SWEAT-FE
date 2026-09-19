import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Sparkles,
  Percent,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Award,
} from 'lucide-react';
import { discountsApi } from '../../services/discountsApi';
import {
  DiscountCampaign,
  CouponValidationResult,
  DynamicOffer,
  DiscountType,
} from '../../types/discounts';
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
import { usePermissions } from '../../lib/permissions';

interface DiscountsWorkspaceProps {
  initialTab?: 'campaigns' | 'rules' | 'redemptions' | 'simulator';
}

export const DiscountsWorkspace: React.FC<DiscountsWorkspaceProps> = ({ initialTab = 'campaigns' }) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('finance.discounts.create') || can('finance.pricing.create') || can('core.settings.edit');
  const [activeTab, setActiveTab] = useState<'campaigns' | 'rules' | 'redemptions' | 'simulator'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

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
  const [simUserProfileId, setSimUserProfileId] = useState('00000000-0000-0000-0000-000000000001');
  const [simUsagePct, setSimUsagePct] = useState('85');
  const [simResult, setSimResult] = useState<CouponValidationResult | null>(null);
  const [simOffers, setSimOffers] = useState<DynamicOffer[]>([]);
  const [simError, setSimError] = useState<string | null>(null);

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
      resetCampForm();
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: ({ campaignId, code }: { campaignId: string; code?: string }) =>
      discountsApi.generateCode(campaignId, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      setIsGenerateCodeOpen(false);
      setCustomCode('');
    },
  });

  const resetCampForm = () => {
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
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Coupons & Dynamic Offers"
        description="Automated discount engine, promotional campaigns, usage caps, and personalized retention incentives."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCampaigns();
                refetchRules();
                refetchRedemptions();
              }}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreateCampaignOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Create Campaign</span>
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
          <KpiTile
            title="Active Campaigns"
            value={activeCampaignsCount}
            badge={{ text: `${campaigns.length} total`, variant: 'info' }}
          />
          <KpiTile
            title="Eligibility Rules"
            value={rules.length}
            badge={{ text: 'Contextual', variant: 'neutral' }}
          />
          <KpiTile
            title="Total Redemptions"
            value={redemptions.length}
            badge={{ text: 'Logged', variant: 'success' }}
          />
          <KpiTile
            title="Total Savings Issued"
            value={`₹${totalSavingsIssued.toLocaleString('en-IN')}`}
            badge={{ text: 'Discounts', variant: 'warning' }}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/40 gap-1 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Campaigns & Codes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {campaigns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'rules'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dynamic Rules</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {rules.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('redemptions')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'redemptions'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Redemption Audit</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {redemptions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                activeTab === 'simulator'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Checkout Simulator</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search campaigns or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {loadingCampaigns ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span>Loading discount campaigns...</span>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="bg-card rounded-xl p-12 text-center border border-border/60">
                <Tag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-medium text-foreground">No campaigns found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Get started by creating your first promotional coupon campaign.
                </p>
                <Button
                  onClick={() => setIsCreateCampaignOpen(true)}
                  className="mt-4"
                  size="sm"
                >
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="bg-card rounded-2xl border border-border/60 p-5 shadow-xs flex flex-col justify-between hover:border-primary/50 transition"
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
                        className="text-xs h-7 text-primary hover:text-primary/80 gap-1 px-2"
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
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 shadow-xs">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground">Dynamic Eligibility Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contextual triggers evaluating session consumption, membership age, and automatic upgrade incentives.
                </p>
              </div>

              {loadingRules ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading rules...
                </div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No dynamic eligibility rules configured.</div>
              ) : (
                <div className="divide-y divide-border/60">
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
          </div>
        )}

        {/* Tab 3: Redemptions */}
        {activeTab === 'redemptions' && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-border/60">
                <h2 className="text-base font-semibold text-foreground">Discount Redemption Audit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Immutable record of promotional coupons and dynamic offers applied to member orders.
                </p>
              </div>

              {loadingRedemptions ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading redemptions...
                </div>
              ) : redemptions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No discount redemptions recorded yet.</div>
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
                      {redemptions.map((red) => (
                        <tr key={red.id} className="hover:bg-muted/30 transition">
                          <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(red.redeemed_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded">
                              {red.code_str || 'DYNAMIC_OFFER'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-foreground font-medium text-xs">
                            {red.campaign_name || 'Automated Rule'}
                          </td>
                          <td className="px-5 py-3.5 text-foreground text-xs">
                            {red.member_name || red.user_profile}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                            -₹{red.discount_amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Simulator */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulator Inputs */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 shadow-xs space-y-5">
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
                  className="w-full"
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
                    className="w-full"
                  >
                    Check Qualified Offers
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Output */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
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
                    Enter test parameters on the left and run simulation to evaluate discounts.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageBody>

      {/* Create Campaign Modal */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Discount Campaign</DialogTitle>
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
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                placeholder="Campaign notes and eligibility"
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Discount Type</label>
                <select
                  value={campType}
                  onChange={(e) => setCampType(e.target.value as DiscountType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Max Cap (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campMaxDiscount}
                  onChange={(e) => setCampMaxDiscount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Min Order (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campMinOrder}
                  onChange={(e) => setCampMinOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Total Limit</label>
                <Input
                  type="number"
                  value={campUsageLimit}
                  onChange={(e) => setCampUsageLimit(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Per User Limit</label>
                <Input
                  type="number"
                  value={campPerUserLimit}
                  onChange={(e) => setCampPerUserLimit(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCampaignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? 'Saving...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Code Modal */}
      {selectedCampaign && (
        <Dialog open={isGenerateCodeOpen} onOpenChange={setIsGenerateCodeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Promo Code</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Campaign: {selectedCampaign.name}</p>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Custom Code (leave blank for auto-generated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. FLASH50"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGenerateCodeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    generateCodeMutation.mutate({
                      campaignId: selectedCampaign.id,
                      code: customCode || undefined,
                    })
                  }
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? 'Generating...' : 'Generate Code'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

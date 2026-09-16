import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Sparkles,
  Percent,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  Copy,
  Sliders,
  Award,
} from 'lucide-react';
import { discountsApi } from '../../services/discountsApi';
import {
  DiscountCampaign,
  DiscountCode,
  DiscountEligibilityRule,
  DiscountRedemption,
  CouponValidationResult,
  DynamicOffer,
  DiscountType,
} from '../../types/discounts';

interface DiscountsWorkspaceProps {
  initialTab?: 'campaigns' | 'rules' | 'redemptions' | 'simulator';
}

export const DiscountsWorkspace: React.FC<DiscountsWorkspaceProps> = ({ initialTab = 'campaigns' }) => {
  const queryClient = useQueryClient();
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

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
                <Tag className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Coupons & Dynamic Offers</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automated discount engine, promotional campaigns, usage limits, and personalized upgrade incentives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                refetchCampaigns();
                refetchRules();
                refetchRedemptions();
              }}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsCreateCampaignOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 mt-6 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'campaigns'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Campaigns & Codes</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {campaigns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Dynamic Eligibility Rules</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('redemptions')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'redemptions'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Redemption Audit Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {redemptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 relative transition flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Checkout Engine Simulator</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'campaigns' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campaigns or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Campaign Cards Grid */}
            {loadingCampaigns ? (
              <div className="flex items-center justify-center p-12 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading discount campaigns...</span>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-900 dark:text-white">No campaigns found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Get started by creating your first promotional coupon campaign.
                </p>
                <button
                  onClick={() => setIsCreateCampaignOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {camp.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {camp.discount_type === 'PERCENTAGE' ? `${camp.discount_value}% OFF` : `₹${camp.discount_value} OFF`}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-3">{camp.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {camp.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        {camp.max_discount && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Max Discount Cap:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">₹{camp.max_discount}</span>
                          </div>
                        )}
                        {camp.minimum_order_amount && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Min Order Amount:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">₹{camp.minimum_order_amount}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Total Redemptions:</span>
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {camp.redemption_count || 0} {camp.usage_limit ? `/ ${camp.usage_limit}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Associated Codes */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                          Active Promo Codes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {camp.codes && camp.codes.length > 0 ? (
                            camp.codes.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-mono text-indigo-700 dark:text-indigo-300 font-semibold"
                              >
                                {c.code}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No codes generated yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedCampaign(camp);
                          setIsGenerateCodeOpen(true);
                        }}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Code</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Dynamic Eligibility Rules</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contextual triggers evaluating session consumption, membership age, and automatic upgrade incentives.
                  </p>
                </div>
              </div>

              {loadingRules ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading rules...
                </div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No dynamic eligibility rules configured.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rules.map((r) => (
                    <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{r.name}</h4>
                            <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-mono">
                              Priority: {r.priority}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded">
                              {r.rule_type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{r.description}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded">
                          {r.status}
                        </span>
                      </div>

                      {/* Conditions list */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                          <span className="font-medium text-slate-500 block mb-1.5">Evaluation Conditions:</span>
                          {r.conditions && r.conditions.length > 0 ? (
                            r.conditions.map((c) => (
                              <div key={c.id} className="text-slate-700 dark:text-slate-300 font-mono">
                                • {c.condition_type} {c.operator} {c.numeric_value || c.text_value || 'true'}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Always matches</span>
                          )}
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-xs">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400 block mb-1.5">
                            Produced Offer Action:
                          </span>
                          {r.actions && r.actions.length > 0 ? (
                            r.actions.map((a) => (
                              <div key={a.id} className="text-emerald-900 dark:text-emerald-300">
                                <strong>{a.action_type}</strong>: {a.message || `${a.discount_percentage}% discount`}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No action configured</span>
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

        {activeTab === 'redemptions' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Discount Redemption Audit</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable record of promotional coupons and dynamic offers applied to member orders.
                </p>
              </div>

              {loadingRedemptions ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading redemptions...
                </div>
              ) : redemptions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No discount redemptions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Redeemed At</th>
                        <th className="px-6 py-3">Code / Offer</th>
                        <th className="px-6 py-3">Campaign</th>
                        <th className="px-6 py-3">Member</th>
                        <th className="px-6 py-3 text-right">Discount Given</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {redemptions.map((red) => (
                        <tr key={red.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(red.redeemed_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-semibold px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded">
                              {red.code_str || 'DYNAMIC_OFFER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white font-medium text-xs">
                            {red.campaign_name || 'Automated Rule'}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-xs">
                            {red.member_name || red.user_profile}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
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

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Simulator Inputs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Coupon Validation Test</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Simulate checkout order subtotal and verify coupon logic, limits, caps, and error reasons.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={simCode}
                    onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cart Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={handleSimulateCoupon}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm"
                >
                  Validate Coupon
                </button>
              </div>

              {/* Dynamic Offers Test */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Dynamic Upgrade Incentive Test</span>
                </h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Member Session Usage (%)
                    </label>
                    <input
                      type="number"
                      value={simUsagePct}
                      onChange={(e) => setSimUsagePct(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSimulateOffers}
                    className="w-full py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-medium rounded-lg text-sm transition"
                  >
                    Check Qualified Offers
                  </button>
                </div>
              </div>
            </div>

            {/* Results Output */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Simulation Results</h2>

                {simError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong>Rejected:</strong> {simError}
                    </div>
                  </div>
                )}

                {simResult && simResult.is_valid && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm space-y-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Coupon Validated Successfully!</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                      <div>Campaign: {simResult.campaign_name}</div>
                      <div>Type: {simResult.discount_type}</div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Discount: -₹{simResult.discount_amount}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Final Total: ₹{simResult.final_subtotal}
                      </div>
                    </div>
                  </div>
                )}

                {simOffers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Qualified Dynamic Incentives
                    </span>
                    {simOffers.map((off, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs"
                      >
                        <span className="font-semibold text-amber-900 dark:text-amber-300">{off.rule_name}</span>
                        <p className="text-amber-800 dark:text-amber-400 mt-1">{off.message}</p>
                        <div className="mt-2 text-amber-700 dark:text-amber-300 font-mono">
                          Benefit: {off.discount_percentage ? `${off.discount_percentage}% OFF` : `₹${off.discount_amount} OFF`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!simError && !simResult && simOffers.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Enter test parameters on the left and run simulation to evaluate discounts.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {isCreateCampaignOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Discount Campaign</h3>
            <form onSubmit={handleCreateCampaign} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Flash Sale"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={campType}
                    onChange={(e) => setCampType(e.target.value as DiscountType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={campValue}
                    onChange={(e) => setCampValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={campMaxDiscount}
                    onChange={(e) => setCampMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={campMinOrder}
                    onChange={(e) => setCampMinOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Total Limit</label>
                  <input
                    type="number"
                    value={campUsageLimit}
                    onChange={(e) => setCampUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Per User Limit</label>
                  <input
                    type="number"
                    value={campPerUserLimit}
                    onChange={(e) => setCampPerUserLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateCampaignOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {createCampaignMutation.isPending ? 'Saving...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Code Modal */}
      {isGenerateCodeOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Promo Code</h3>
            <p className="text-xs text-slate-500 mt-1">Campaign: {selectedCampaign.name}</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Custom Code (leave blank for auto-generated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FLASH50"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateCodeOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    generateCodeMutation.mutate({
                      campaignId: selectedCampaign.id,
                      code: customCode || undefined,
                    })
                  }
                  disabled={generateCodeMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {generateCodeMutation.isPending ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  Sliders,
  Award,
  Edit,
  Trash2,
  Power,
  Info,
  Calendar,
  Building2,
  Package as PackageIcon,
  Layers,
  Check,
  X,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { discountsApi } from '@/api/endpoints/discountsApi';
import { catalogApi } from '@/api/endpoints/catalogApi';
import { api } from '@/api/client';
import {
  DiscountCampaign,
  DiscountCode,
  DiscountEligibilityRule,
  DiscountRuleCondition,
  DiscountRuleAction,
  DiscountRedemption,
  CouponValidationResult,
  DynamicOffer,
  DiscountType,
  RuleType,
  EvaluationMode,
  ConditionOperator,
  ActionType,
  MemberContextResult,
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
import { CRMErrorState } from '@/components/crm/common/CRMErrorState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/utils/currencyUtils';

interface DiscountsWorkspaceProps {
  initialTab?: 'campaigns' | 'rules' | 'redemptions' | 'simulator';
  title?: string;
  subtitle?: string;
  mode?: 'offers' | 'coupons' | 'all';
}

const CONDITION_TYPE_OPTIONS = [
  { value: 'USAGE_PERCENTAGE_GTE', label: 'Session Usage % >= (e.g. 80%)' },
  { value: 'SESSIONS_REMAINING_LTE', label: 'Sessions Remaining <= (e.g. 3)' },
  { value: 'PACKAGE_AGE_DAYS_GTE', label: 'Package Age (Days) >= (e.g. 60)' },
  { value: 'CONSECUTIVE_DAYS_INACTIVE_GTE', label: 'Inactive Days >= (e.g. 14)' },
  { value: 'CURRENT_PACKAGE_EQUALS', label: 'Current Package = (Package ID)' },
  { value: 'ATTENDANCE_FREQUENCY_DROP_PCT_GTE', label: 'Attendance Drop % >= (e.g. 50%)' },
];

const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'GREATER_THAN_OR_EQUAL', label: '>= (Greater Than or Equal)' },
  { value: 'LESS_THAN_OR_EQUAL', label: '<= (Less Than or Equal)' },
  { value: 'EQUALS', label: '= (Equals)' },
  { value: 'GREATER_THAN', label: '> (Greater Than)' },
  { value: 'LESS_THAN', label: '< (Less Than)' },
  { value: 'NOT_EQUALS', label: '!= (Not Equals)' },
];

const ACTION_TYPE_OPTIONS: Array<{ value: ActionType; label: string }> = [
  { value: 'SHOW_OFFER', label: 'Show Offer (Banner / Notification)' },
  { value: 'APPLY_PERCENTAGE_DISCOUNT', label: 'Apply Percentage Discount (%)' },
  { value: 'APPLY_FIXED_DISCOUNT', label: 'Apply Fixed Discount (₹)' },
  { value: 'ALLOW_UPGRADE_PRICE', label: 'Allow Tier Upgrade Price' },
  { value: 'SHOW_COUPON', label: 'Display Promo Coupon' },
];

const RULE_TYPE_OPTIONS: Array<{ value: RuleType; label: string }> = [
  { value: 'OFFER', label: 'Contextual Retention Offer' },
  { value: 'UPGRADE_OFFER', label: 'Package Upgrade Offer' },
  { value: 'RENEWAL', label: 'Membership Renewal Incentive' },
  { value: 'AUTO_DISCOUNT', label: 'Automated Cart Discount' },
  { value: 'CROSS_SELL', label: 'Cross-Sell Add-On' },
  { value: 'REJOIN', label: 'Win-Back / Rejoin Promo' },
  { value: 'COUPON', label: 'Promotional Coupon Rule' },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
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
  const canEdit = can('finance.discounts.edit') || can('finance.pricing.edit') || can('core.settings.edit') || canCreate;
  const canDelete = can('finance.discounts.delete') || can('core.settings.edit') || canCreate;

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
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);

  const [isGenerateCodeOpen, setIsGenerateCodeOpen] = useState(false);
  const [selectedCampaignForCode, setSelectedCampaignForCode] = useState<DiscountCampaign | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountEligibilityRule | null>(null);

  // Campaign Form State
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campType, setCampType] = useState<DiscountType>('PERCENTAGE');
  const [campValue, setCampValue] = useState('15');
  const [campMaxDiscount, setCampMaxDiscount] = useState('1000.00');
  const [campMinOrder, setCampMinOrder] = useState('500.00');
  const [campUsageLimit, setCampUsageLimit] = useState('100');
  const [campPerUserLimit, setCampPerUserLimit] = useState('1');
  const [campStatus, setCampStatus] = useState<string>('ACTIVE');
  const [campValidFrom, setCampValidFrom] = useState('');
  const [campValidUntil, setCampValidUntil] = useState('');
  const [campBranchId, setCampBranchId] = useState('');
  const [campPackageId, setCampPackageId] = useState('');

  // Code Generation Form State
  const [codeCustomText, setCodeCustomText] = useState('');
  const [codeBranchId, setCodeBranchId] = useState('');
  const [codePackageId, setCodePackageId] = useState('');

  // Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('OFFER');
  const [rulePriority, setRulePriority] = useState('10');
  const [ruleEvaluationMode, setRuleEvaluationMode] = useState<EvaluationMode>('ALL_CONDITIONS');
  const [ruleStatus, setRuleStatus] = useState<'DRAFT' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [ruleBranchId, setRuleBranchId] = useState('');
  const [ruleSourcePackageId, setRuleSourcePackageId] = useState('');
  const [ruleTargetPackageId, setRuleTargetPackageId] = useState('');
  const [ruleConditions, setRuleConditions] = useState<Array<{
    id?: string;
    condition_type: string;
    operator: ConditionOperator;
    numeric_value: string;
    text_value: string;
  }>>([
    {
      condition_type: 'USAGE_PERCENTAGE_GTE',
      operator: 'GREATER_THAN_OR_EQUAL',
      numeric_value: '80',
      text_value: '',
    },
  ]);
  const [ruleActionType, setRuleActionType] = useState<ActionType>('APPLY_PERCENTAGE_DISCOUNT');
  const [ruleActionPercent, setRuleActionPercent] = useState('20.00');
  const [ruleActionAmount, setRuleActionAmount] = useState('');
  const [ruleActionCampaignId, setRuleActionCampaignId] = useState('');
  const [ruleActionMessage, setRuleActionMessage] = useState('Qualified for 20% renewal discount!');
  const [ruleActionAutoApply, setRuleActionAutoApply] = useState(false);

  // Simulator State
  const [simUserProfileId, setSimUserProfileId] = useState('');
  const [selectedMembershipId, setSelectedMembershipId] = useState('');
  const [simCode, setSimCode] = useState('SUMMER20');
  const [simSubtotal, setSimSubtotal] = useState('5000');
  const [simBranchId, setSimBranchId] = useState('');
  const [simPackageId, setSimPackageId] = useState('');
  const [simUseHypothetical, setSimUseHypothetical] = useState(false);
  const [simHypoUsagePct, setSimHypoUsagePct] = useState('85');
  const [simHypoConsumed, setSimHypoConsumed] = useState('17');
  const [simHypoRemaining, setSimHypoRemaining] = useState('3');
  const [simHypoAgeDays, setSimHypoAgeDays] = useState('75');

  const [simResult, setSimResult] = useState<CouponValidationResult | null>(null);
  const [simOffers, setSimOffers] = useState<DynamicOffer[]>([]);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Queries
  const {
    data: campaigns = [],
    isLoading: loadingCampaigns,
    isError: errorCampaigns,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ['discount-campaigns'],
    queryFn: () => discountsApi.getCampaigns(),
  });

  const {
    data: rules = [],
    isLoading: loadingRules,
    isError: errorRules,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['discount-rules'],
    queryFn: () => discountsApi.getEligibilityRules(),
  });

  const {
    data: redemptions = [],
    isLoading: loadingRedemptions,
    isError: errorRedemptions,
    refetch: refetchRedemptions,
  } = useQuery({
    queryKey: ['discount-redemptions'],
    queryFn: () => discountsApi.getRedemptions(),
  });

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['discount-branches'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/branches/');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Packages
  const { data: packages = [] } = useQuery({
    queryKey: ['discount-packages'],
    queryFn: () => catalogApi.getPackages(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Real Member User Profiles
  const { data: userProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['simulator-user-profiles'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/user-profiles/?page_size=100');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{
        id: string;
        full_name?: string;
        email?: string;
        phone_snapshot?: string;
        member_status?: string;
      }>;
    },
    staleTime: 60 * 1000,
  });

  // Auto-select first profile if none selected
  React.useEffect(() => {
    if (!simUserProfileId && userProfiles.length > 0 && userProfiles[0]) {
      setSimUserProfileId(userProfiles[0].id);
    }
  }, [userProfiles, simUserProfileId]);

  // Live Authoritative Member Context Query for Simulator
  const {
    data: liveMemberContext,
    isLoading: loadingMemberContext,
    refetch: refetchMemberContext,
  } = useQuery<MemberContextResult>({
    queryKey: ['discount-member-context', simUserProfileId, selectedMembershipId],
    queryFn: () => discountsApi.getMemberContext(simUserProfileId, selectedMembershipId || undefined),
    enabled: Boolean(simUserProfileId),
    staleTime: 10 * 1000,
  });

  React.useEffect(() => {
    if (liveMemberContext?.membership_id && !selectedMembershipId) {
      setSelectedMembershipId(liveMemberContext.membership_id);
    }
  }, [liveMemberContext, selectedMembershipId]);

  // Campaign Mutations
  const saveCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCampaign) {
        return discountsApi.updateCampaign(editingCampaign.id, data);
      }
      return discountsApi.createCampaign(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      setIsCampaignModalOpen(false);
      setEditingCampaign(null);
      toast.success(editingCampaign ? 'Campaign updated successfully' : 'Campaign created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save campaign');
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: any }) => {
      return discountsApi.generateCode(campaignId, data);
    },
    onSuccess: (newCode) => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      setIsGenerateCodeOpen(false);
      setSelectedCampaignForCode(null);
      setCodeCustomText('');
      setCodeBranchId('');
      setCodePackageId('');
      toast.success(`Promo code ${newCode.code} generated successfully!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to generate code');
    },
  });

  const toggleCodeStatusMutation = useMutation({
    mutationFn: ({ codeId, status }: { codeId: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      return discountsApi.toggleCouponStatus(codeId, status);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      toast.success(`Code ${updated.code} is now ${updated.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update code status');
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (codeId: string) => discountsApi.deleteCoupon(codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      toast.success('Promo code deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Cannot delete code with existing redemptions');
    },
  });

  // Dynamic Rule Mutations
  const toggleRuleStatusMutation = useMutation({
    mutationFn: (ruleId: string) => discountsApi.toggleRuleStatus(ruleId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['discount-rules'] });
      toast.success(`Rule "${updated.name}" is now ${updated.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to toggle rule status');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => discountsApi.deleteEligibilityRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-rules'] });
      toast.success('Dynamic eligibility rule deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete rule');
    },
  });

  // Open Campaign Form (Create or Edit)
  const openCreateCampaignModal = () => {
    setEditingCampaign(null);
    setCampName('');
    setCampDesc('');
    setCampType('PERCENTAGE');
    setCampValue('15');
    setCampMaxDiscount('1000.00');
    setCampMinOrder('500.00');
    setCampUsageLimit('100');
    setCampPerUserLimit('1');
    setCampStatus('ACTIVE');
    setCampValidFrom(formatDateForInput(new Date()));
    setCampValidUntil('');
    setCampBranchId('');
    setCampPackageId('');
    setIsCampaignModalOpen(true);
  };

  const openEditCampaignModal = (camp: DiscountCampaign) => {
    setEditingCampaign(camp);
    setCampName(camp.name);
    setCampDesc(camp.description || '');
    setCampType(camp.discount_type);
    setCampValue(camp.discount_type === 'PERCENTAGE' ? formatPercentage(camp.discount_value) : camp.discount_value);
    setCampMaxDiscount(camp.max_discount || '');
    setCampMinOrder(camp.minimum_order_amount || '');
    setCampUsageLimit(camp.usage_limit ? String(camp.usage_limit) : '');
    setCampPerUserLimit(camp.per_user_limit ? String(camp.per_user_limit) : '1');
    setCampStatus(camp.status);
    setCampValidFrom(camp.valid_from ? formatDateForInput(camp.valid_from) : '');
    setCampValidUntil(camp.valid_until ? formatDateForInput(camp.valid_until) : '');
    setCampBranchId(camp.configuration?.branch_id || '');
    setCampPackageId(camp.configuration?.package_id || '');
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: campName,
      description: campDesc,
      discount_type: campType,
      discount_value: campValue,
      max_discount: campMaxDiscount ? campMaxDiscount : null,
      minimum_order_amount: campMinOrder ? campMinOrder : null,
      usage_limit: campUsageLimit ? parseInt(campUsageLimit) : null,
      per_user_limit: campPerUserLimit ? parseInt(campPerUserLimit) : null,
      status: campStatus,
      valid_from: campValidFrom ? new Date(campValidFrom).toISOString() : new Date().toISOString(),
      valid_until: campValidUntil ? new Date(campValidUntil).toISOString() : null,
      configuration: {
        ...(editingCampaign?.configuration || {}),
        branch_id: campBranchId || null,
        package_id: campPackageId || null,
      },
    };
    saveCampaignMutation.mutate(payload);
  };

  // Open Rule Form (Create or Edit)
  const openCreateRuleModal = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDesc('');
    setRuleType('OFFER');
    setRulePriority('10');
    setRuleEvaluationMode('ALL_CONDITIONS');
    setRuleStatus('ACTIVE');
    setRuleBranchId('');
    setRuleSourcePackageId('');
    setRuleTargetPackageId('');
    setRuleConditions([
      {
        condition_type: 'USAGE_PERCENTAGE_GTE',
        operator: 'GREATER_THAN_OR_EQUAL',
        numeric_value: '80',
        text_value: '',
      },
    ]);
    setRuleActionType('APPLY_PERCENTAGE_DISCOUNT');
    setRuleActionPercent('20');
    setRuleActionAmount('');
    setRuleActionMessage('Exclusive renewal privilege: 20% off your renewal package!');
    setRuleActionAutoApply(false);
    setRuleActionCampaignId('');
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: DiscountEligibilityRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDesc(rule.description || '');
    setRuleType(rule.rule_type);
    setRulePriority(String(rule.priority));
    setRuleEvaluationMode(rule.evaluation_mode);
    setRuleStatus(rule.status === 'EXPIRED' ? 'INACTIVE' : rule.status);
    setRuleBranchId(rule.branch || '');
    setRuleSourcePackageId(rule.source_package || '');
    setRuleTargetPackageId(rule.target_package || '');

    if (rule.conditions && rule.conditions.length > 0) {
      setRuleConditions(
        rule.conditions.map((c) => ({
          id: c.id,
          condition_type: c.condition_type,
          operator: c.operator,
          numeric_value: c.numeric_value ? String(c.numeric_value) : '',
          text_value: c.text_value || '',
        }))
      );
    } else {
      setRuleConditions([]);
    }

    if (rule.actions && rule.actions.length > 0 && rule.actions[0]) {
      const act = rule.actions[0];
      setRuleActionType(act.action_type);
      setRuleActionPercent(act.discount_percentage ? formatPercentage(act.discount_percentage) : '');
      setRuleActionAmount(act.discount_amount ? String(act.discount_amount) : '');
      setRuleActionMessage(act.message || '');
      setRuleActionAutoApply(act.auto_apply || false);
      setRuleActionCampaignId((act.configuration as any)?.target_campaign_id || (act as any).target_campaign || '');
    } else {
      setRuleActionCampaignId('');
      setRuleActionType('APPLY_PERCENTAGE_DISCOUNT');
      setRuleActionPercent('15.00');
      setRuleActionAmount('');
      setRuleActionMessage('');
      setRuleActionAutoApply(false);
    }

    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rulePayload: Partial<DiscountEligibilityRule> = {
        name: ruleName,
        description: ruleDesc,
        rule_type: ruleType,
        priority: parseInt(rulePriority) || 10,
        evaluation_mode: ruleEvaluationMode,
        status: ruleStatus,
        branch: ruleBranchId || null,
        source_package: ruleSourcePackageId || null,
        target_package: ruleTargetPackageId || null,
        valid_from: new Date().toISOString(),
      };

      let savedRule: DiscountEligibilityRule;
      if (editingRule) {
        savedRule = await discountsApi.updateEligibilityRule(editingRule.id, rulePayload);
        await discountsApi.syncConditionsActions(savedRule.id, {
          conditions: ruleConditions.map((c, i) => ({
            condition_type: c.condition_type,
            operator: c.operator,
            numeric_value: c.numeric_value ? c.numeric_value : null,
            text_value: c.text_value ? c.text_value : null,
            sequence: i + 1,
          })),
          actions: [
            {
              action_type: ruleActionType,
              discount_percentage: ruleActionType === 'APPLY_PERCENTAGE_DISCOUNT' ? ruleActionPercent : null,
              discount_amount: ruleActionType === 'APPLY_FIXED_DISCOUNT' ? ruleActionAmount : null,
              target_campaign: (ruleActionType === 'SHOW_COUPON' || ruleActionType === 'APPLY_COUPON' || ruleActionType === 'GENERATE_COUPON') ? ruleActionCampaignId || null : null,
              message: ruleActionMessage,
              auto_apply: ruleActionAutoApply,
            },
          ],
        });
        toast.success(`Rule "${savedRule.name}" updated with conditions & action`);
      } else {
        savedRule = await discountsApi.createEligibilityRule(rulePayload);
        // Create conditions for new rule
        for (let i = 0; i < ruleConditions.length; i++) {
          const c = ruleConditions[i];
          if (c) {
            await discountsApi.addRuleCondition(savedRule.id, {
              condition_type: c.condition_type,
              operator: c.operator,
              numeric_value: c.numeric_value ? c.numeric_value : null,
              text_value: c.text_value ? c.text_value : null,
              sequence: i + 1,
            });
          }
        }
        // Create action for new rule
        await discountsApi.addRuleAction(savedRule.id, {
          action_type: ruleActionType,
          discount_percentage: ruleActionType === 'APPLY_PERCENTAGE_DISCOUNT' ? ruleActionPercent : null,
          discount_amount: ruleActionType === 'APPLY_FIXED_DISCOUNT' ? ruleActionAmount : null,
          target_campaign: (ruleActionType === 'SHOW_COUPON' || ruleActionType === 'APPLY_COUPON' || ruleActionType === 'GENERATE_COUPON') ? ruleActionCampaignId || null : null,
          message: ruleActionMessage,
          auto_apply: ruleActionAutoApply,
        });
        toast.success(`Dynamic Rule "${savedRule.name}" created with configured conditions & action`);
      }

      queryClient.invalidateQueries({ queryKey: ['discount-rules'] });
      setIsRuleModalOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save eligibility rule');
    }
  };

  // Simulator actions
  const handleSimulateCoupon = async () => {
    setSimError(null);
    setSimResult(null);
    if (!simUserProfileId) {
      setSimError('Please select a member user profile.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await discountsApi.validateCoupon({
        code: simCode.trim(),
        user_profile_id: simUserProfileId,
        order_subtotal: simSubtotal,
        branch_id: simBranchId || undefined,
        package_id: simPackageId || undefined,
      });
      setSimResult(res);
      if (res.is_valid) {
        toast.success(`Coupon ${res.code} validated! Save ₹${res.discount_amount}`);
      } else {
        toast.error(`Coupon invalid: ${res.reason}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.reason || err.response?.data?.error || 'Validation request failed.';
      setSimError(msg);
      toast.error(msg);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimulateOffers = async () => {
    setSimError(null);
    setSimOffers([]);
    if (!simUserProfileId) {
      setSimError('Please select a member user profile.');
      return;
    }
    setSimLoading(true);
    try {
      const payload: any = {
        user_profile_id: simUserProfileId,
        branch_id: simBranchId || undefined,
        target_package_id: simPackageId || undefined,
      };

      if (simUseHypothetical) {
        payload.usage_percentage = parseFloat(simHypoUsagePct) || 0;
        payload.sessions_consumed = parseInt(simHypoConsumed) || 0;
        payload.sessions_remaining = parseInt(simHypoRemaining) || 0;
        payload.package_age_days = parseInt(simHypoAgeDays) || 0;
      }
      // When simUseHypothetical is false, we omit metrics entirely so backend
      // resolve_member_context calculates authoritative DB values!

      const res = await discountsApi.evaluateOffers(payload);
      setSimOffers(res.offers || []);
      if (res.offers && res.offers.length > 0) {
        toast.success(`Found ${res.offers.length} qualified dynamic offer(s)!`);
      } else {
        toast.info('No dynamic offers match current member thresholds.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to evaluate dynamic offers.';
      setSimError(msg);
      toast.error(msg);
    } finally {
      setSimLoading(false);
    }
  };

  // Defensive array guards
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeRules = Array.isArray(rules) ? rules : [];
  const safeRedemptions = Array.isArray(redemptions) ? redemptions : [];

  // Filter campaigns
  const filteredCampaigns = safeCampaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codes?.some((code: DiscountCode) => code.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCampaignsCount = safeCampaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalSavingsIssued = safeRedemptions.reduce(
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
        badgeText={mode === 'offers' ? 'Retention Engine' : 'Discounts'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCampaigns();
                refetchRules();
                refetchRedemptions();
                if (simUserProfileId) refetchMemberContext();
                toast.info('Discounts and rules refreshed');
              }}
              className="gap-1.5 h-9"
              title="Refresh discounts"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canCreate && (
              <>
                {mode === 'offers' || (mode === 'all' && activeTab === 'rules') ? (
                  <Button
                    size="sm"
                    onClick={openCreateRuleModal}
                    className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Dynamic Rule</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={openCreateCampaignModal}
                    className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Campaign</span>
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <CRMKpiTile
            label="Active Campaigns"
            value={activeCampaignsCount}
            isLoading={loadingCampaigns}
            badge={{ text: `${safeCampaigns.length} Total`, variant: 'info' }}
            hint="Promotions currently active"
          />
          <CRMKpiTile
            label="Eligibility Rules"
            value={safeRules.length}
            isLoading={loadingRules}
            badge={{ text: `${rules.filter((r) => r.status === 'ACTIVE').length} Active`, variant: 'neutral' }}
            hint="Contextual retention triggers"
          />
          <CRMKpiTile
            label="Total Redemptions"
            value={redemptions.length}
            isLoading={loadingRedemptions}
            badge={{ text: 'Verified', variant: 'positive' }}
            hint="Discounts redeemed by members"
          />
          <CRMKpiTile
            label="Total Savings Issued"
            value={`₹${totalSavingsIssued.toLocaleString('en-IN')}`}
            isLoading={loadingRedemptions}
            badge={{ text: 'Savings', variant: 'warning' }}
            hint="Customer discount value delivered"
          />
        </div>

        {/* Navigation Tabs */}
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
              {safeRules.length}
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
              {safeRedemptions.length}
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

        {/* ========================================================= */}
        {/* TAB 1: CAMPAIGNS & CODES                                   */}
        {/* ========================================================= */}
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
                onAction={openCreateCampaignModal}
                canAction={canCreate}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampaigns.map((camp) => {
                  const branchScopeName = branches.find((b) => b.id === camp.configuration?.branch_id)?.name;
                  const packageScopeName = packages.find((p) => p.id === camp.configuration?.package_id)?.name;

                  return (
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
                          <span className="text-xs text-primary font-mono font-semibold bg-primary/10 px-2 py-0.5 rounded">
                            {camp.discount_type === 'PERCENTAGE'
                              ? `${formatPercentage(camp.discount_value)}% OFF`
                              : `₹${camp.discount_value} OFF`}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-foreground mt-3">{camp.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {camp.description || 'No description provided.'}
                        </p>

                        {/* Scopes */}
                        {(branchScopeName || packageScopeName) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {branchScopeName && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {branchScopeName}
                              </Badge>
                            )}
                            {packageScopeName && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                {packageScopeName}
                              </Badge>
                            )}
                          </div>
                        )}

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
                          {camp.per_user_limit && (
                            <div className="flex items-center justify-between">
                              <span>Per-User Limit:</span>
                              <span className="font-medium text-foreground">{camp.per_user_limit} redemption</span>
                            </div>
                          )}
                        </div>

                        {/* Associated Codes */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Promo Codes ({camp.codes?.length || 0})
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {camp.codes && camp.codes.length > 0 ? (
                              camp.codes.map((c: DiscountCode) => (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-primary">{c.code}</span>
                                    <Badge
                                      variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}
                                      className="text-[10px] px-1.5 py-0 h-4"
                                    >
                                      {c.status}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      {c.redemption_count || 0} used
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        title={c.status === 'ACTIVE' ? 'Deactivate code' : 'Activate code'}
                                        onClick={() =>
                                          toggleCodeStatusMutation.mutate({
                                            codeId: c.id,
                                            status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                          })
                                        }
                                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        title="Delete code"
                                        onClick={() => {
                                          if (confirm(`Delete code ${c.code}?`)) {
                                            deleteCodeMutation.mutate(c.id);
                                          }
                                        }}
                                        className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No promo codes generated yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaignForCode(camp);
                            setCodeCustomText('');
                            setIsGenerateCodeOpen(true);
                          }}
                          className="text-xs h-8 text-primary hover:text-primary/80 gap-1 px-2.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Code</span>
                        </Button>

                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCampaignModal(camp)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DYNAMIC RULES                                       */}
        {/* ========================================================= */}
        {activeTab === 'rules' && (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Dynamic Eligibility Rules</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contextual triggers evaluating session consumption, membership age, and automated upgrade incentives.
                </p>
              </div>

              {canCreate && (
                <Button
                  size="sm"
                  onClick={openCreateRuleModal}
                  className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Dynamic Rule</span>
                </Button>
              )}
            </div>

            {loadingRules ? (
              <CRMLoadingState message="Loading dynamic eligibility rules..." />
            ) : errorRules ? (
              <CRMErrorState
                title="Failed to Load Dynamic Rules"
                message="Unable to communicate with the dynamic rules engine. Please verify network access and retry."
                onRetry={refetchRules}
              />
            ) : safeRules.length === 0 ? (
              <CRMEmptyState
                icon={Sparkles}
                title="No Dynamic Eligibility Rules"
                description="No dynamic retention rules configured. Contextual triggers evaluate session consumption, membership age, and automatic upgrade incentives."
                actionLabel={canCreate ? '+ Create Dynamic Rule' : undefined}
                onAction={openCreateRuleModal}
                canAction={canCreate}
              />
            ) : (
              <div className="divide-y divide-border/60 p-4 sm:p-5 space-y-4">
                {rules.map((r) => {
                  const branchName = branches.find((b) => b.id === r.branch)?.name;
                  const srcPkgName = packages.find((p) => p.id === r.source_package)?.name;
                  const tgtPkgName = packages.find((p) => p.id === r.target_package)?.name;

                  return (
                    <div key={r.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">{r.name}</h4>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              Priority: {r.priority}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {r.rule_type}
                            </Badge>
                            <Badge
                              variant={r.evaluation_mode === 'ALL_CONDITIONS' ? 'default' : 'outline'}
                              className={cn(
                                'text-[11px] font-mono',
                                r.evaluation_mode === 'ALL_CONDITIONS'
                                  ? 'bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-500/30'
                              )}
                              title={
                                r.evaluation_mode === 'ALL_CONDITIONS'
                                  ? 'Flat evaluation: All conditions must match simultaneously (logical AND).'
                                  : 'Flat evaluation: Any single condition matching qualifies the member (logical OR).'
                              }
                            >
                              {r.evaluation_mode === 'ALL_CONDITIONS' ? 'ALL CONDITIONS (AND)' : 'ANY CONDITION (OR)'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.description || 'No description provided.'}
                          </p>

                          {/* Scopes */}
                          {(branchName || srcPkgName || tgtPkgName) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {branchName && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <Building2 className="w-3 h-3 text-muted-foreground" />
                                  Branch: {branchName}
                                </Badge>
                              )}
                              {srcPkgName && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                  Source Pkg: {srcPkgName}
                                </Badge>
                              )}
                              {tgtPkgName && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                  Target Pkg: {tgtPkgName}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {r.status}
                          </Badge>
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRuleStatusMutation.mutate(r.id)}
                                className="h-8 text-xs gap-1"
                                title="Toggle Rule Status"
                              >
                                <Power className="w-3 h-3" />
                                <span>{r.status === 'ACTIVE' ? 'Pause' : 'Activate'}</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditRuleModal(r)}
                                className="h-8 text-xs gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete rule "${r.name}"?`)) {
                                  deleteRuleMutation.mutate(r.id);
                                }
                              }}
                              className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-2"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Conditions & Actions Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/40 rounded-xl text-xs border border-border/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-muted-foreground">
                              Evaluation Criteria ({r.conditions?.length || 0}):
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Logic: {r.evaluation_mode === 'ALL_CONDITIONS' ? 'AND' : 'OR'}
                            </span>
                          </div>
                          {r.conditions && r.conditions.length > 0 ? (
                            r.conditions.map((c: any) => (
                              <div
                                key={c.id}
                                className="text-foreground font-mono text-[11px] bg-background/60 p-1.5 rounded border border-border/40"
                              >
                                • <span className="font-semibold">{c.condition_type}</span>{' '}
                                <span className="text-primary font-bold">{c.operator}</span>{' '}
                                <span className="underline">{c.numeric_value || c.text_value || 'true'}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic block">Always matches (no conditions)</span>
                          )}
                        </div>

                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Configured Offer Action:
                            </span>
                          </div>
                          {r.actions && r.actions.length > 0 ? (
                            r.actions.map((a: any) => (
                              <div key={a.id} className="text-emerald-800 dark:text-emerald-200 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                  <span>{a.action_type}</span>
                                  {a.auto_apply && (
                                    <Badge variant="outline" className="text-[9px] bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
                                      AUTO-APPLY
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-mono text-xs">
                                  Benefit:{' '}
                                  {a.discount_percentage
                                    ? `${formatPercentage(a.discount_percentage)}% OFF`
                                    : a.discount_amount
                                    ? `₹${a.discount_amount} OFF`
                                    : 'Special Incentive'}
                                </div>
                                {a.message && <div className="text-[11px] italic">"{a.message}"</div>}
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic block">No action configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REDEMPTION AUDIT                                    */}
        {/* ========================================================= */}
        {activeTab === 'redemptions' && (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span>Discount Redemption Audit</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immutable authoritative record of promotional coupons and dynamic retention offers redeemed against orders.
              </p>
            </div>

            {loadingRedemptions ? (
              <CRMLoadingState message="Loading discount redemptions..." />
            ) : errorRedemptions ? (
              <CRMErrorState
                title="Failed to Load Redemptions Audit Log"
                message="Unable to communicate with the redemptions service. Please verify network access and retry."
                onRetry={refetchRedemptions}
              />
            ) : safeRedemptions.length === 0 ? (
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
                      <th className="px-5 py-3">Campaign / Rule</th>
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3 text-right">Discount Given</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition">
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {new Date(r.redeemed_at || r.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">
                          {r.code_str || r.discount_code || 'DYNAMIC OFFER'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-foreground">
                          {r.campaign_name || r.campaign || 'Automated Offer'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {r.member_name || (
                            <span className="font-mono text-[11px]">
                              {r.user_profile ? r.user_profile.slice(0, 8) + '...' : 'Unknown'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                          {r.order ? r.order.slice(0, 8) + '...' : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-right font-medium text-emerald-600 dark:text-emerald-400">
                          -₹{parseFloat(r.discount_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CHECKOUT SIMULATOR                                  */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulator Inputs */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <span>Authoritative Checkout Simulator</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Test coupon codes and dynamic retention offers against real member database contexts or simulated what-if metrics.
                </p>
              </div>

              {/* 1. Member Profile Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  1. Select Member User Profile *
                </label>
                {loadingProfiles ? (
                  <div className="h-9 px-3 rounded-md border border-input bg-muted/20 flex items-center text-xs text-muted-foreground">
                    Loading member profiles...
                  </div>
                ) : userProfiles.length === 0 ? (
                  <div className="text-xs text-amber-500 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20">
                    No active member profiles found in database. Create a member to test member-specific discounts.
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
              </div>

              {/* 2. Live Authoritative Member Context Card */}
              {simUserProfileId && (
                <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Authoritative Member Database Context
                    </span>
                    {loadingMemberContext ? (
                      <span className="text-[10px] text-muted-foreground animate-pulse">Loading context...</span>
                    ) : liveMemberContext?.metrics_available ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600">
                        Entitlement Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {liveMemberContext?.has_membership ? 'Membership Active' : 'No Active Membership'}
                      </Badge>
                    )}
                  </div>

                  {/* Multi-membership selection if member has multiple active memberships */}
                  {liveMemberContext?.all_memberships && liveMemberContext.all_memberships.length > 1 && (
                    <div className="pt-2 pb-1 border-t border-border/40">
                      <label className="block text-[11px] font-semibold text-primary mb-1">
                        Select Active Membership Plan ({liveMemberContext.all_memberships.length} active plans found):
                      </label>
                      <select
                        value={selectedMembershipId || liveMemberContext.membership_id || ''}
                        onChange={(e) => setSelectedMembershipId(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground font-medium"
                      >
                        {liveMemberContext.all_memberships.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.package_name} ({m.membership_number}) - Status: {m.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {liveMemberContext && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground">Active Package:</span>{' '}
                        <span className="font-semibold text-foreground">
                          {liveMemberContext.current_package_name || 'Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Branch:</span>{' '}
                        <span className="font-semibold text-foreground">
                          {liveMemberContext.branch_name || 'Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Membership Status:</span>{' '}
                        <span className="font-medium text-foreground">
                          {liveMemberContext.membership_status || 'Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Package Age:</span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.package_age_days !== null && liveMemberContext.package_age_days !== undefined
                            ? `${liveMemberContext.package_age_days} days`
                            : 'Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining Days:</span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.remaining_days !== null && liveMemberContext.remaining_days !== undefined
                            ? `${liveMemberContext.remaining_days} days`
                            : 'Unavailable'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Session Usage:</span>{' '}
                        <span className="font-mono text-foreground font-semibold">
                          {liveMemberContext.usage_percentage !== null && liveMemberContext.usage_percentage !== undefined
                            ? `${formatPercentage(liveMemberContext.usage_percentage)}%`
                            : 'Unavailable'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground">Sessions (Consumed / Allocated):</span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.is_unlimited
                            ? 'Unlimited Plan'
                            : liveMemberContext.sessions_allocated !== null && liveMemberContext.sessions_allocated !== undefined
                            ? `${liveMemberContext.sessions_consumed ?? 'Unavailable'} consumed / ${liveMemberContext.sessions_allocated} allocated (${liveMemberContext.sessions_remaining ?? 'Unavailable'} remaining)`
                            : 'Unavailable (No session allocation record)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!liveMemberContext?.has_membership && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      ℹ️ This member has no active membership record. Rules requiring active package or session usage will fail-closed.
                    </div>
                  )}
                </div>
              )}

              {/* 3. Coupon Simulation Controls */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  A. Coupon Code Validation
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Coupon Code</label>
                    <Input
                      type="text"
                      value={simCode}
                      onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                      className="font-mono text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Cart Subtotal (₹)</label>
                    <Input
                      type="number"
                      value={simSubtotal}
                      onChange={(e) => setSimSubtotal(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Branch Scope (Optional)</label>
                    <select
                      value={simBranchId}
                      onChange={(e) => setSimBranchId(e.target.value)}
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Target Package (Optional)</label>
                    <select
                      value={simPackageId}
                      onChange={(e) => setSimPackageId(e.target.value)}
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                    >
                      <option value="">Any Package</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleSimulateCoupon}
                  disabled={!simUserProfileId || simLoading}
                  className="w-full h-9 text-xs font-semibold"
                >
                  {simLoading ? 'Validating...' : 'Validate Coupon Code'}
                </Button>
              </div>

              {/* 4. Dynamic Offers Simulation Controls */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    B. Dynamic Retention Offers
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Evaluated against live database metrics
                  </span>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleSimulateOffers}
                  disabled={!simUserProfileId || simLoading}
                  className="w-full h-9 text-xs font-semibold"
                >
                  {simLoading ? 'Evaluating...' : 'Evaluate Qualified Dynamic Offers'}
                </Button>
              </div>
            </div>

            {/* Results Output Column */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-4">Authoritative Evaluation Output</h2>

                {simError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Validation Rejected:</strong>
                      <span className="text-xs">{simError}</span>
                    </div>
                  </div>
                )}

                {/* Coupon Result */}
                {simResult && (
                  <div
                    className={cn(
                      'p-4 rounded-xl text-sm space-y-3 border',
                      simResult.is_valid
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {simResult.is_valid ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Coupon Validated Authoritatively</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                          <span>Coupon Not Applicable</span>
                        </>
                      )}
                    </div>

                    {simResult.is_valid ? (
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-500/20">
                        <div>
                          <span className="text-muted-foreground">Campaign:</span> {simResult.campaign_name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span> {simResult.discount_type}
                        </div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Discount: -₹{simResult.discount_amount}
                        </div>
                        <div className="font-bold text-foreground">
                          Final Total: ₹{simResult.final_subtotal}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs pt-2 border-t border-rose-500/20">
                        <strong>Reason:</strong> {simResult.reason || 'Criteria not met.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Qualified Dynamic Offers Result */}
                {simOffers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Qualified Dynamic Incentives ({simOffers.length})
                    </span>
                    {simOffers.map((off, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-800 dark:text-amber-200">
                            {off.rule_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300">
                            {off.rule_type}
                          </Badge>
                        </div>
                        <p className="text-amber-700 dark:text-amber-300">{off.message}</p>
                        <div className="text-amber-800 dark:text-amber-200 font-mono font-bold flex items-center justify-between pt-1 border-t border-amber-500/20">
                          <span>Benefit:</span>
                          <span>
                            {off.discount_percentage
                              ? `${formatPercentage(off.discount_percentage)}% DISCOUNT`
                              : off.discount_amount
                              ? `₹${off.discount_amount} DISCOUNT`
                              : off.action_type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!simError && !simResult && simOffers.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
                    <Sliders className="w-8 h-8 mx-auto text-muted-foreground/50" />
                    <p>Select a member profile and run a coupon test or dynamic offers check.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* CREATE / EDIT CAMPAIGN MODAL                              */}
      {/* ========================================================= */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-background border border-border p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              {editingCampaign ? 'Edit Discount Campaign' : 'Create Discount Campaign'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Campaign Name *</label>
              <Input
                type="text"
                required
                placeholder="e.g. Diwali Flash Sale"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                placeholder="Campaign notes and marketing description"
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Discount Type *</label>
                <select
                  value={campType}
                  onChange={(e) => {
                    const next = e.target.value as DiscountType;
                    setCampType(next);
                    if (next === 'PERCENTAGE' && campValue) {
                      setCampValue(formatPercentage(campValue));
                    }
                  }}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Discount Value {campType === 'PERCENTAGE' ? '(%) *' : '(₹) *'}
                </label>
                <Input
                  type="number"
                  step={campType === 'PERCENTAGE' ? '1' : '0.01'}
                  required
                  value={campValue}
                  onChange={(e) => setCampValue(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Max Discount Cap (₹)</label>
                <Input
                  type="number"
                  placeholder="Optional cap"
                  value={campMaxDiscount}
                  onChange={(e) => setCampMaxDiscount(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Min Order Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={campMinOrder}
                  onChange={(e) => setCampMinOrder(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Total Usage Limit</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={campUsageLimit}
                  onChange={(e) => setCampUsageLimit(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Per-User Limit</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={campPerUserLimit}
                  onChange={(e) => setCampPerUserLimit(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                <select
                  value={campStatus}
                  onChange={(e) => setCampStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Branch Scope (Optional)</label>
                <select
                  value={campBranchId}
                  onChange={(e) => setCampBranchId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Package Scope (Optional)</label>
                <select
                  value={campPackageId}
                  onChange={(e) => setCampPackageId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground"
                >
                  <option value="">All Packages</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dedicated Responsive Validity & Schedule Card */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center">
                <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Campaign Validity & Schedule</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    Valid From (Start) *
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={campValidFrom}
                    onChange={(e) => setCampValidFrom(e.target.value)}
                    className="h-10 text-xs sm:text-sm font-mono w-full min-w-0 bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-foreground">
                      Valid Until (Expiry)
                    </label>
                    {campValidUntil && (
                      <button
                        type="button"
                        onClick={() => setCampValidUntil('')}
                        className="text-[10px] text-destructive hover:underline font-medium"
                      >
                        Clear Expiry
                      </button>
                    )}
                  </div>
                  <Input
                    type="datetime-local"
                    value={campValidUntil}
                    onChange={(e) => setCampValidUntil(e.target.value)}
                    className="h-10 text-xs sm:text-sm font-mono w-full min-w-0 bg-background"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCampaignModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveCampaignMutation.isPending}
                className="h-9 text-xs font-semibold"
              >
                {saveCampaignMutation.isPending
                  ? 'Saving...'
                  : editingCampaign
                  ? 'Update Campaign'
                  : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* GENERATE CODE MODAL                                       */}
      {/* ========================================================= */}
      <Dialog open={isGenerateCodeOpen} onOpenChange={setIsGenerateCodeOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full bg-background border border-border p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Generate Promo Code
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Add a new promo code for campaign <strong>{selectedCampaignForCode?.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Custom Code (Leave blank to generate random)
              </label>
              <Input
                type="text"
                placeholder="e.g. SUMMER50"
                value={codeCustomText}
                onChange={(e) => setCodeCustomText(e.target.value.toUpperCase())}
                className="font-mono h-9 text-xs uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Branch Scope (Optional)</label>
                <select
                  value={codeBranchId}
                  onChange={(e) => setCodeBranchId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="">Inherit Campaign / All</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Package Scope (Optional)</label>
                <select
                  value={codePackageId}
                  onChange={(e) => setCodePackageId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="">Inherit Campaign / All</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
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
                  if (selectedCampaignForCode) {
                    generateCodeMutation.mutate({
                      campaignId: selectedCampaignForCode.id,
                      data: {
                        code: codeCustomText.trim() || undefined,
                        branch_id: codeBranchId || undefined,
                        package_id: codePackageId || undefined,
                      },
                    });
                  }
                }}
                className="h-9 text-xs font-semibold"
              >
                {generateCodeMutation.isPending ? 'Generating...' : 'Generate Code'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* DYNAMIC RULE BUILDER MODAL                                */}
      {/* ========================================================= */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-background border border-border p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {editingRule ? 'Edit Dynamic Eligibility Rule' : 'Create Dynamic Eligibility Rule'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Rule Name *</label>
              <Input
                type="text"
                required
                placeholder="e.g. 80% Session Usage Renewal Incentive"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <Input
                placeholder="Internal business context and trigger notes"
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Rule Type *</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as RuleType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  {RULE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Priority</label>
                <Input
                  type="number"
                  value={rulePriority}
                  onChange={(e) => setRulePriority(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                <select
                  value={ruleStatus}
                  onChange={(e) => setRuleStatus(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>

            {/* Evaluation Mode Banner & Selector */}
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Flat Evaluation Mode:
                </span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-200 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="evalMode"
                      value="ALL_CONDITIONS"
                      checked={ruleEvaluationMode === 'ALL_CONDITIONS'}
                      onChange={() => setRuleEvaluationMode('ALL_CONDITIONS')}
                      className="text-blue-600"
                    />
                    <span>All Conditions (AND)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-200 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="evalMode"
                      value="ANY_CONDITION"
                      checked={ruleEvaluationMode === 'ANY_CONDITION'}
                      onChange={() => setRuleEvaluationMode('ANY_CONDITION')}
                      className="text-blue-600"
                    />
                    <span>Any Condition (OR)</span>
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                {ruleEvaluationMode === 'ALL_CONDITIONS'
                  ? 'All conditions must match simultaneously. The member must satisfy each configured condition threshold to qualify.'
                  : 'Any condition match qualifies the member. If even one configured condition evaluates to true, the offer triggers.'}
              </p>
            </div>

            {/* Scope Filters */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Branch Scope</label>
                <select
                  value={ruleBranchId}
                  onChange={(e) => setRuleBranchId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Source Package</label>
                <select
                  value={ruleSourcePackageId}
                  onChange={(e) => setRuleSourcePackageId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="">Any Active Package</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Target Package</label>
                <select
                  value={ruleTargetPackageId}
                  onChange={(e) => setRuleTargetPackageId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                >
                  <option value="">Any Renewal Package</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditions Builder (Visible in both Create and Edit) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Evaluation Conditions ({ruleConditions.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRuleConditions([
                      ...ruleConditions,
                      {
                        condition_type: 'SESSIONS_REMAINING',
                        operator: 'LESS_THAN_OR_EQUAL',
                        numeric_value: '3',
                        text_value: '',
                      },
                    ])
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Condition</span>
                </Button>
              </div>

              <div className="space-y-2">
                {ruleConditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted/40 rounded-lg border border-border/50 grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] text-muted-foreground mb-0.5 sm:hidden">Attribute</label>
                      <select
                        value={cond.condition_type}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].condition_type = e.target.value;
                          setRuleConditions(updated);
                        }}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        {CONDITION_TYPE_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-7 sm:col-span-4">
                      <label className="block text-[10px] text-muted-foreground mb-0.5 sm:hidden">Operator</label>
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].operator = e.target.value as ConditionOperator;
                          setRuleConditions(updated);
                        }}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        {OPERATOR_OPTIONS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[10px] text-muted-foreground mb-0.5 sm:hidden">Threshold Value</label>
                      <Input
                        type="text"
                        placeholder="Value"
                        value={cond.numeric_value}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].numeric_value = e.target.value;
                          setRuleConditions(updated);
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = ruleConditions.filter((_, i) => i !== idx);
                          setRuleConditions(updated);
                        }}
                        className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                        title="Remove condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Configuration (Visible in both Create and Edit) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Reward Action Configuration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Action Type</label>
                  <select
                    value={ruleActionType}
                    onChange={(e) => setRuleActionType(e.target.value as ActionType)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                  >
                    {ACTION_TYPE_OPTIONS.map((act) => (
                      <option key={act.value} value={act.value}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                </div>

                {ruleActionType === 'APPLY_PERCENTAGE_DISCOUNT' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Discount % *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15.00"
                      value={ruleActionPercent}
                      onChange={(e) => setRuleActionPercent(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {ruleActionType === 'APPLY_FIXED_DISCOUNT' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Discount Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500.00"
                      value={ruleActionAmount}
                      onChange={(e) => setRuleActionAmount(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {(ruleActionType === 'SHOW_COUPON' || ruleActionType === 'APPLY_COUPON' || ruleActionType === 'GENERATE_COUPON') && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Target Campaign *</label>
                    <select
                      value={ruleActionCampaignId}
                      onChange={(e) => setRuleActionCampaignId(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground"
                    >
                      <option value="">-- Choose Campaign --</option>
                      {campaigns.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name} ({camp.discount_type === 'PERCENTAGE' ? `${camp.discount_value}%` : formatCurrency(camp.discount_value)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {ruleActionType === 'ALLOW_UPGRADE_PRICE' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Upgrade Discount %</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 20.00"
                      value={ruleActionPercent}
                      onChange={(e) => setRuleActionPercent(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Offer Banner / Notification Message</label>
                <Input
                  placeholder="e.g. Exclusive renewal privilege: Enjoy your personalized offer!"
                  value={ruleActionMessage}
                  onChange={(e) => setRuleActionMessage(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleActionAutoApply}
                  onChange={(e) => setRuleActionAutoApply(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span>Auto-apply to checkout without requiring coupon code entry</span>
              </label>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 text-xs font-semibold"
              >
                {editingRule ? 'Update Rule' : 'Create Dynamic Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

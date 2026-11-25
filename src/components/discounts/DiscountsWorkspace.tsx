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
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { discountsApi } from '@/api/endpoints/discountsApi';
import { useGlobalSearchSync } from '@/hooks/useGlobalSearchSync';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { SimulatorMemberSelect } from './SimulatorMemberSelect';

interface CheckboxMultiSelectProps {
  label: string;
  allLabel: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
  placeholder?: string;
}

const CheckboxMultiSelect: React.FC<CheckboxMultiSelectProps> = ({
  label,
  allLabel,
  items,
  selectedIds,
  onChange,
  emptyMessage = 'No items available',
  placeholder = 'Search...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const triggerText = React.useMemo(() => {
    if (items.length === 0) return emptyMessage;
    if (selectedIds.length === items.length) return allLabel;
    if (selectedIds.length === 0) return `Select ${label.toLowerCase()}...`;
    if (selectedIds.length === 1) {
      const match = items.find((i) => i.id === selectedIds[0]);
      return match ? match.name : `1 ${label} selected`;
    }
    return `${selectedIds.length} ${label} selected`;
  }, [selectedIds, items, allLabel, label, emptyMessage]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(items.map((i) => i.id));
    }
  };

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground flex items-center justify-between text-left hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        >
          <span className="truncate pr-2">{triggerText}</span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[320px] p-2 z-[70] bg-popover text-popover-foreground border shadow-lg rounded-lg"
        align="start"
      >
        {items.length > 5 && (
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>
        )}
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {/* All option toggle */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleAll();
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none"
          >
            <Checkbox
              checked={isAllSelected}
              className="pointer-events-none"
              tabIndex={-1}
            />
            <span className="text-xs font-medium select-none text-foreground flex-1">
              {allLabel}
            </span>
          </div>

          <div className="h-px bg-border/60 my-1" />

          {/* Item options */}
          {filteredItems.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleItem(item.id);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none"
                >
                  <Checkbox
                    checked={isChecked}
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                  <span
                    className="text-xs select-none text-foreground flex-1 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface SearchableSingleSelectProps {
  label: string;
  allLabel: string;
  items: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
  emptyMessage?: string;
  placeholder?: string;
}

const SearchableSingleSelect: React.FC<SearchableSingleSelectProps> = ({
  label,
  allLabel,
  items,
  value,
  onChange,
  emptyMessage = 'No items available',
  placeholder = 'Search...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const selectedItem = React.useMemo(() => {
    return items.find((i) => i.id === value);
  }, [items, value]);

  const triggerText = selectedItem ? selectedItem.name : allLabel;

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground flex items-center justify-between text-left hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        >
          <span className="truncate pr-2">{triggerText}</span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[320px] p-2 z-[70] bg-popover text-popover-foreground border shadow-lg rounded-lg"
        align="start"
      >
        {items.length > 5 && (
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-8 pl-8 text-xs bg-muted/30"
              autoFocus
            />
          </div>
        )}
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {/* Default / All option */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect('');
            }}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none text-xs",
              !value ? "bg-muted font-medium text-primary" : "text-foreground"
            )}
          >
            <span>{allLabel}</span>
            {!value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </div>

          <div className="h-px bg-border/60 my-1" />

          {/* Item options */}
          {filteredItems.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = item.id === value;
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(item.id);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none text-xs",
                    isSelected ? "bg-muted font-medium text-primary" : "text-foreground"
                  )}
                >
                  <span className="truncate flex-1 pr-2" title={item.name}>
                    {item.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface DiscountsWorkspaceProps {
  initialTab?: 'campaigns' | 'rules' | 'redemptions' | 'simulator';
  title?: string;
  subtitle?: string;
  mode?: 'offers' | 'coupons' | 'all';
}

const CONDITION_TYPE_OPTIONS = [
  { value: 'USAGE_PERCENTAGE_GTE', label: 'Sessions Used (%)' },
  { value: 'SESSIONS_REMAINING_LTE', label: 'Sessions Left' },
  { value: 'PACKAGE_AGE_DAYS_GTE', label: 'Days Since Plan Started' },
  { value: 'CONSECUTIVE_DAYS_INACTIVE_GTE', label: 'Days Without a Visit' },
  { value: 'CURRENT_PACKAGE_EQUALS', label: 'Current Plan' },
  { value: 'ATTENDANCE_FREQUENCY_DROP_PCT_GTE', label: 'Visit Drop (%)' },
];

const CONDITION_LABEL_MAP: Record<string, string> = {
  USAGE_PERCENTAGE_GTE: 'Sessions Used (%)',
  USAGE_PERCENTAGE: 'Sessions Used (%)',
  SESSIONS_REMAINING_LTE: 'Sessions Left',
  SESSIONS_REMAINING: 'Sessions Left',
  PACKAGE_AGE_DAYS_GTE: 'Days Since Plan Started',
  PACKAGE_AGE_DAYS: 'Days Since Plan Started',
  CONSECUTIVE_DAYS_INACTIVE_GTE: 'Days Without a Visit',
  CONSECUTIVE_DAYS_INACTIVE: 'Days Without a Visit',
  CURRENT_PACKAGE_EQUALS: 'Current Plan',
  ATTENDANCE_FREQUENCY_DROP_PCT_GTE: 'Visit Drop (%)',
};

const OPERATOR_LABEL_MAP: Record<string, string> = {
  GREATER_THAN_OR_EQUAL: 'at least (>=)',
  LESS_THAN_OR_EQUAL: 'at most (<=)',
  EQUALS: 'exactly (=)',
  GREATER_THAN: 'more than (>)',
  LESS_THAN: 'less than (<)',
  NOT_EQUALS: 'not equal to (!=)',
};

const formatRuleNumericValue = (condType: string, rawVal: any): string => {
  if (rawVal === null || rawVal === undefined || rawVal === '') return 'true';
  const strVal = String(rawVal).trim();
  const num = Number(strVal);
  const cleanNum = !isNaN(num) ? String(Number(num.toFixed(2))) : strVal;
  if (condType.includes('PERCENTAGE') || condType.includes('PCT')) return `${cleanNum}%`;
  if (condType.includes('DAYS')) return `${cleanNum} days`;
  return cleanNum;
};

const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'GREATER_THAN_OR_EQUAL', label: 'At least (>=)' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'At most (<=)' },
  { value: 'EQUALS', label: 'Exactly (=)' },
  { value: 'GREATER_THAN', label: 'More than (>)' },
  { value: 'LESS_THAN', label: 'Less than (<)' },
  { value: 'NOT_EQUALS', label: 'Not equal to (!=)' },
];

const ACTION_TYPE_OPTIONS: Array<{ value: ActionType; label: string }> = [
  { value: 'SHOW_OFFER', label: 'Show Offer Banner' },
  { value: 'APPLY_PERCENTAGE_DISCOUNT', label: 'Give Percentage Discount (%)' },
  { value: 'APPLY_FIXED_DISCOUNT', label: 'Give Flat Amount Off (₹)' },
  { value: 'ALLOW_UPGRADE_PRICE', label: 'Unlock Upgrade Discount' },
  { value: 'SHOW_COUPON', label: 'Show Promo Coupon' },
];

const RULE_TYPE_OPTIONS: Array<{ value: RuleType; label: string }> = [
  { value: 'OFFER', label: 'Member Retention Offer' },
  { value: 'UPGRADE_OFFER', label: 'Plan Upgrade Offer' },
  { value: 'RENEWAL', label: 'Renewal Discount' },
  { value: 'AUTO_DISCOUNT', label: 'Auto-Applied Checkout Discount' },
  { value: 'CROSS_SELL', label: 'Add-On / Cross-Sell Offer' },
  { value: 'REJOIN', label: 'Rejoin / Win-Back Offer (Expired Members)' },
  { value: 'COUPON', label: 'Promo Code Trigger' },
];

const CAMPAIGN_MEMBER_TYPE_OPTIONS = [
  { id: 'NEW', name: 'New Members / Leads' },
  { id: 'ACTIVE', name: 'Existing Active Members' },
  { id: 'EXPIRED', name: 'Rejoining / Expired Members' },
];

const CAMPAIGN_ORDER_TYPE_OPTIONS = [
  { id: 'NEW_MEMBERSHIP', name: 'New Membership (Lead Conversion)' },
  { id: 'RENEWAL', name: 'Membership Renewal' },
  { id: 'REJOIN', name: 'Rejoin (Expired Member)' },
  { id: 'UPGRADE', name: 'Plan Upgrade' },
  { id: 'NEW_PACKAGE', name: 'Additional / New Package' },
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
  const { handleSearchChange } = useGlobalSearchSync(searchTerm, setSearchTerm);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [redemptionPage, setRedemptionPage] = useState(1);
  const redemptionPageSize = 25;

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
  const [campBranchIds, setCampBranchIds] = useState<string[]>([]);
  const [campProgramIds, setCampProgramIds] = useState<string[]>([]);
  const [campPackageIds, setCampPackageIds] = useState<string[]>([]);
  const [campMemberTypes, setCampMemberTypes] = useState<string[]>(['NEW', 'ACTIVE', 'EXPIRED']);
  const [campOrderTypes, setCampOrderTypes] = useState<string[]>(['NEW_MEMBERSHIP', 'RENEWAL', 'REJOIN', 'UPGRADE', 'NEW_PACKAGE']);
  const isCreateInitializedRef = React.useRef(false);

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
  const [ruleProgramId, setRuleProgramId] = useState('');
  const [ruleSourcePackageId, setRuleSourcePackageId] = useState('');
  const [ruleTargetPackageId, setRuleTargetPackageId] = useState('');
  const [ruleBranchIds, setRuleBranchIds] = useState<string[]>([]);
  const [ruleProgramIds, setRuleProgramIds] = useState<string[]>([]);
  const [rulePackageIds, setRulePackageIds] = useState<string[]>([]);
  const isRuleCreateInitializedRef = React.useRef(false);
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
    isFetching: fetchingRules,
  } = useQuery({
    queryKey: ['discount-rules'],
    queryFn: () => discountsApi.getEligibilityRules(),
  });

  const {
    data: redemptionsPageData,
    isLoading: loadingRedemptions,
    isError: errorRedemptions,
    refetch: refetchRedemptions,
  } = useQuery({
    queryKey: ['discount-redemptions', redemptionPage, redemptionPageSize],
    queryFn: () => discountsApi.getRedemptionsPaginated({ page: redemptionPage, page_size: redemptionPageSize }),
  });

  const { data: redemptionsSummary, refetch: refetchRedemptionsSummary } = useQuery({
    queryKey: ['discount-redemptions-summary'],
    queryFn: () => discountsApi.getRedemptionsSummary(),
  });

  const redemptions = redemptionsPageData?.results || [];
  const totalRedemptionsCount = redemptionsSummary?.total_redemptions ?? redemptionsPageData?.count ?? redemptions.length;

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

  // Fetch Programs dynamically from backend
  const { data: programs = [] } = useQuery({
    queryKey: ['discount-programs'],
    queryFn: () => catalogApi.getPrograms({ status: 'ACTIVE' }),
    staleTime: 5 * 60 * 1000,
  });

  // Active Packages only (strictly active packages under active programs)
  const activePackages = React.useMemo(() => {
    const activeProgramIdSet = new Set(
      (programs || []).filter((prog: any) => prog.status === 'ACTIVE').map((prog: any) => prog.id)
    );
    return (packages || [])
      .filter((p: any) => {
        if (p.status !== 'ACTIVE') return false;
        const progId = p.program || p.program_id;
        if (programs.length > 0 && progId && !activeProgramIdSet.has(progId)) return false;
        return true;
      })
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [packages, programs]);

  // Packages dynamically filtered by selected programs for Campaign Modal
  const availablePackagesForCampaign = React.useMemo(() => {
    if (campProgramIds.length === 0 || (programs.length > 0 && campProgramIds.length === programs.length)) {
      return activePackages;
    }
    const progIdSet = new Set(campProgramIds);
    return activePackages.filter((p: any) => {
      const progId = p.program || p.program_id;
      return progId && progIdSet.has(progId);
    });
  }, [activePackages, campProgramIds, programs.length]);

  // Reactive cleanup: When a program is deselected, prune any packages not belonging to selected programs
  React.useEffect(() => {
    if (campProgramIds.length > 0 && campProgramIds.length < programs.length) {
      const progIdSet = new Set(campProgramIds);
      setCampPackageIds((prev) =>
        prev.filter((pkgId) => {
          const pkg = (packages || []).find((p: any) => p.id === pkgId);
          if (!pkg) return false;
          const progId = pkg.program || (pkg as any).program_id;
          return progId && progIdSet.has(progId);
        })
      );
    }
  }, [campProgramIds, programs.length, packages]);

  // Packages dynamically filtered by selected programs for Dynamic Rules Modal
  const availablePackagesForRule = React.useMemo(() => {
    if (ruleProgramIds.length === 0 || (programs.length > 0 && ruleProgramIds.length === programs.length)) {
      return activePackages;
    }
    const progIdSet = new Set(ruleProgramIds);
    return activePackages.filter((p: any) => {
      const progId = p.program || p.program_id;
      return progId && progIdSet.has(progId);
    });
  }, [activePackages, ruleProgramIds, programs.length]);

  // Reactive cleanup: When a program is deselected in Dynamic Rules, prune any packages not belonging to selected programs
  React.useEffect(() => {
    if (packages.length > 0 && ruleProgramIds.length > 0 && ruleProgramIds.length < programs.length) {
      const progIdSet = new Set(ruleProgramIds);
      setRulePackageIds((prev) =>
        prev.filter((pkgId) => {
          const pkg = packages.find((p: any) => p.id === pkgId);
          if (!pkg) return true;
          const progId = pkg.program || (pkg as any).program_id;
          return progId && progIdSet.has(progId);
        })
      );
    }
  }, [ruleProgramIds, programs.length, packages]);

  // Ensure default selections populate if Dynamic Rule modal opened while lists were loading
  React.useEffect(() => {
    if (isRuleModalOpen && !editingRule && !isRuleCreateInitializedRef.current) {
      let populated = false;
      if (branches.length > 0 && ruleBranchIds.length === 0) {
        setRuleBranchIds(branches.map((b) => b.id));
        populated = true;
      }
      if (programs.length > 0 && ruleProgramIds.length === 0) {
        setRuleProgramIds(programs.map((p) => p.id));
        populated = true;
      }
      if (activePackages.length > 0 && rulePackageIds.length === 0) {
        setRulePackageIds(activePackages.map((p) => p.id));
        populated = true;
      }
      if (populated) {
        isRuleCreateInitializedRef.current = true;
      }
    }
  }, [isRuleModalOpen, editingRule, branches, programs, activePackages, ruleBranchIds.length, ruleProgramIds.length, rulePackageIds.length]);

  React.useEffect(() => {
    if (!isRuleModalOpen) {
      isRuleCreateInitializedRef.current = false;
    }
  }, [isRuleModalOpen]);

  // Ensure default selections populate if modal opened while lists were loading
  React.useEffect(() => {
    if (isCampaignModalOpen && !editingCampaign && !isCreateInitializedRef.current) {
      let populated = false;
      if (branches.length > 0 && campBranchIds.length === 0) {
        setCampBranchIds(branches.map((b) => b.id));
        populated = true;
      }
      if (programs.length > 0 && campProgramIds.length === 0) {
        setCampProgramIds(programs.map((p) => p.id));
        populated = true;
      }
      if (activePackages.length > 0 && campPackageIds.length === 0) {
        setCampPackageIds(activePackages.map((p) => p.id));
        populated = true;
      }
      if (populated) {
        isCreateInitializedRef.current = true;
      }
    }
  }, [isCampaignModalOpen, editingCampaign, branches, programs, activePackages, campBranchIds.length, campProgramIds.length, campPackageIds.length]);

  React.useEffect(() => {
    if (!isCampaignModalOpen) {
      isCreateInitializedRef.current = false;
    }
  }, [isCampaignModalOpen]);



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

  const toggleCampaignStatusMutation = useMutation({
    mutationFn: ({ campaignId, status }: { campaignId: string; status: string }) => {
      return discountsApi.updateCampaign(campaignId, { status } as any);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] });
      toast.success(`Campaign "${updated.name}" is now ${updated.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to update campaign status');
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
    setCampBranchIds(branches.map((b) => b.id));
    setCampProgramIds(programs.map((p) => p.id));
    setCampPackageIds(activePackages.map((p) => p.id));
    setCampMemberTypes(CAMPAIGN_MEMBER_TYPE_OPTIONS.map((m) => m.id));
    setCampOrderTypes(CAMPAIGN_ORDER_TYPE_OPTIONS.map((o) => o.id));
    isCreateInitializedRef.current = true;
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
    const cfg = camp.configuration || {};
    const bIds = Array.isArray(cfg['branch_ids']) && (cfg['branch_ids'] as string[]).length > 0
      ? (cfg['branch_ids'] as string[])
      : cfg['branch_id']
      ? [cfg['branch_id'] as string]
      : branches.map((b) => b.id);
    const progIds = Array.isArray(cfg['program_ids']) && (cfg['program_ids'] as string[]).length > 0
      ? (cfg['program_ids'] as string[])
      : cfg['program_id']
      ? [cfg['program_id'] as string]
      : programs.map((p) => p.id);
    const pkgIds = Array.isArray(cfg['package_ids']) && (cfg['package_ids'] as string[]).length > 0
      ? (cfg['package_ids'] as string[])
      : cfg['package_id']
      ? [cfg['package_id'] as string]
      : activePackages.map((p) => p.id);
    const rawMemTypes = Array.isArray(cfg['allowed_member_types']) && (cfg['allowed_member_types'] as string[]).length > 0
      ? (cfg['allowed_member_types'] as string[]).map((x) => String(x).toUpperCase())
      : typeof cfg['member_type'] === 'string' && cfg['member_type']
      ? (cfg['member_type'] === 'NEW_OR_EXPIRED' ? ['NEW', 'EXPIRED'] : [String(cfg['member_type']).toUpperCase()])
      : CAMPAIGN_MEMBER_TYPE_OPTIONS.map((m) => m.id);
    const normalizedMemTypes = Array.from(new Set(
      rawMemTypes.map((m) => (m === 'REJOIN' || m === 'INACTIVE' ? 'EXPIRED' : m)).filter((m) => ['NEW', 'ACTIVE', 'EXPIRED'].includes(m))
    ));
    const rawOrderTypes = Array.isArray(cfg['order_types']) && (cfg['order_types'] as string[]).length > 0
      ? (cfg['order_types'] as string[]).map((x) => String(x).toUpperCase())
      : CAMPAIGN_ORDER_TYPE_OPTIONS.map((o) => o.id);
    setCampBranchIds(bIds);
    setCampProgramIds(progIds);
    setCampPackageIds(pkgIds);
    setCampMemberTypes(normalizedMemTypes.length > 0 ? normalizedMemTypes : CAMPAIGN_MEMBER_TYPE_OPTIONS.map((m) => m.id));
    setCampOrderTypes(rawOrderTypes);
    setCampBranchId(bIds[0] || '');
    setCampPackageId(pkgIds[0] || '');
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const isAllBranches = campBranchIds.length === branches.length || campBranchIds.length === 0;
    const isAllPrograms = campProgramIds.length === programs.length || campProgramIds.length === 0;
    const isAllPackages = campPackageIds.length === availablePackagesForCampaign.length || campPackageIds.length === 0;
    const isAllMemberTypes = campMemberTypes.length === 0 || campMemberTypes.length === CAMPAIGN_MEMBER_TYPE_OPTIONS.length;
    const isAllOrderTypes = campOrderTypes.length === 0 || campOrderTypes.length === CAMPAIGN_ORDER_TYPE_OPTIONS.length;
    const expandedMemberTypes = isAllMemberTypes
      ? []
      : campMemberTypes.includes('EXPIRED')
      ? Array.from(new Set([...campMemberTypes, 'REJOIN', 'INACTIVE']))
      : campMemberTypes;

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
        branch_ids: isAllBranches ? [] : campBranchIds,
        branch_id: isAllBranches ? null : (campBranchIds.length === 1 ? campBranchIds[0] : null),
        program_ids: isAllPrograms ? [] : campProgramIds,
        package_ids: isAllPackages ? [] : campPackageIds,
        package_id: isAllPackages ? null : (campPackageIds.length === 1 ? campPackageIds[0] : null),
        allowed_member_types: expandedMemberTypes,
        member_type: isAllMemberTypes ? null : (campMemberTypes.length === 2 && campMemberTypes.includes('NEW') && campMemberTypes.includes('EXPIRED') ? 'NEW_OR_EXPIRED' : campMemberTypes.join(',')),
        order_types: isAllOrderTypes ? [] : campOrderTypes,
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
    setRuleProgramId('');
    setRuleSourcePackageId('');
    setRuleTargetPackageId('');
    setRuleBranchIds(branches.map((b) => b.id));
    setRuleProgramIds(programs.map((p) => p.id));
    setRulePackageIds(activePackages.map((p) => p.id));
    isRuleCreateInitializedRef.current = true;
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: DiscountEligibilityRule) => {
    setEditingRule(rule);

    const cleanDesc = (rule.description || '').replace(/<!--\s*SCOPE:\s*\{.*?\}\s*-->/g, '').trim();
    setRuleName(rule.name);
    setRuleDesc(cleanDesc);
    setRuleType(rule.rule_type);
    setRulePriority(String(rule.priority));
    setRuleEvaluationMode(rule.evaluation_mode);
    setRuleStatus(rule.status === 'EXPIRED' ? 'INACTIVE' : rule.status);
    setRuleBranchId(rule.branch || '');
    setRuleSourcePackageId(rule.source_package || '');
    setRuleTargetPackageId(rule.target_package || '');

    const cfg = rule.configuration || {};
    const legacyPkgId = rule.target_package || rule.source_package;
    const targetPkg = legacyPkgId ? (packages || []).find((p: any) => p.id === legacyPkgId) : null;
    const legacyProgId = targetPkg ? (targetPkg.program || (targetPkg as any).program_id) : null;

    // 1. Branch IDs
    const bIds = Array.isArray(cfg['branch_ids']) && (cfg['branch_ids'] as string[]).length > 0
      ? (cfg['branch_ids'] as string[])
      : cfg['branch_id']
      ? [cfg['branch_id'] as string]
      : rule.branch
      ? [rule.branch]
      : branches.map((b) => b.id);

    // 2. Program IDs
    const progIds = Array.isArray(cfg['program_ids']) && (cfg['program_ids'] as string[]).length > 0
      ? (cfg['program_ids'] as string[])
      : cfg['program_id']
      ? [cfg['program_id'] as string]
      : legacyProgId
      ? [legacyProgId]
      : programs.map((p) => p.id);

    // 3. Package IDs
    const availableForProgs = (progIds.length > 0 && progIds.length < programs.length)
      ? activePackages.filter((p: any) => {
          const pId = p.program || p.program_id;
          return progIds.includes(pId);
        })
      : activePackages;

    const pkgIds = Array.isArray(cfg['package_ids']) && (cfg['package_ids'] as string[]).length > 0
      ? (cfg['package_ids'] as string[])
      : cfg['package_id']
      ? [cfg['package_id'] as string]
      : legacyPkgId
      ? [legacyPkgId]
      : availableForProgs.map((p) => p.id);

    setRuleBranchIds(bIds);
    setRuleProgramIds(progIds);
    setRulePackageIds(pkgIds);
    setRuleProgramId(progIds[0] || '');

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
      setRuleActionCampaignId((act.configuration as any)?.target_campaign_id || (act as any).discount_campaign || (act as any).target_campaign || '');
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
      const isAllBranches = ruleBranchIds.length === branches.length || ruleBranchIds.length === 0;
      const isAllPrograms = ruleProgramIds.length === programs.length || ruleProgramIds.length === 0;
      const isAllPackages = rulePackageIds.length === availablePackagesForRule.length || rulePackageIds.length === 0;

      const rulePayload: any = {
        name: ruleName,
        description: ruleDesc.replace(/<!--\s*SCOPE:\s*\{.*?\}\s*-->/g, '').trim(),
        rule_type: ruleType,
        priority: parseInt(rulePriority) || 10,
        evaluation_mode: ruleEvaluationMode,
        status: ruleStatus,
        branch: isAllBranches ? null : (ruleBranchIds.length === 1 ? ruleBranchIds[0] : null),
        source_package: null,
        target_package: isAllPackages ? null : (rulePackageIds.length === 1 ? rulePackageIds[0] : null),
        valid_from: editingRule?.valid_from || new Date().toISOString(),
        configuration: {
          ...(editingRule?.configuration || {}),
          branch_ids: isAllBranches ? [] : ruleBranchIds,
          branch_id: isAllBranches ? null : (ruleBranchIds.length === 1 ? ruleBranchIds[0] : null),
          program_ids: isAllPrograms ? [] : ruleProgramIds,
          package_ids: isAllPackages ? [] : rulePackageIds,
          package_id: isAllPackages ? null : (rulePackageIds.length === 1 ? rulePackageIds[0] : null),
        },
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
              discount_campaign: (ruleActionType === 'SHOW_COUPON' || ruleActionType === 'APPLY_COUPON' || ruleActionType === 'GENERATE_COUPON') ? ruleActionCampaignId || null : null,
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
          discount_campaign: (ruleActionType === 'SHOW_COUPON' || ruleActionType === 'APPLY_COUPON' || ruleActionType === 'GENERATE_COUPON') ? ruleActionCampaignId || null : null,
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

  // Status helper check
  const isCampaignActive = (camp: DiscountCampaign): boolean => {
    if (camp.computed_status) return camp.computed_status === 'ACTIVE';
    return camp.status === 'ACTIVE';
  };

  const isCodeActive = (code: DiscountCode): boolean => {
    if (code.computed_status) return code.computed_status === 'ACTIVE';
    return code.status === 'ACTIVE';
  };

  const activeCampaignsCount = safeCampaigns.filter(isCampaignActive).length;
  const inactiveCampaignsCount = safeCampaigns.filter((c) => !isCampaignActive(c)).length;

  // Filter campaigns
  const filteredCampaigns = safeCampaigns.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codes?.some((code: DiscountCode) => code.code.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') {
      return isCampaignActive(c);
    }

    if (statusFilter === 'INACTIVE') {
      return !isCampaignActive(c);
    }

    return true;
  });

  const totalSavingsIssued = redemptionsSummary?.total_savings
    ? (parseFloat(redemptionsSummary.total_savings) || 0)
    : safeRedemptions.reduce(
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
              onClick={async () => {
                await Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: ['discount-campaigns'] }),
                  queryClient.invalidateQueries({ queryKey: ['discount-rules'] }),
                  queryClient.invalidateQueries({ queryKey: ['discount-redemptions'] }),
                  queryClient.invalidateQueries({ queryKey: ['discount-redemptions-summary'] }),
                  refetchCampaigns(),
                  refetchRules(),
                  refetchRedemptions(),
                  refetchRedemptionsSummary(),
                  simUserProfileId ? refetchMemberContext() : Promise.resolve(),
                ]);
                toast.info('Discounts and rules refreshed');
              }}
              disabled={fetchingRules}
              className="gap-1.5 h-9"
              title="Refresh discounts"
            >
              <RotateCw className={cn("w-3.5 h-3.5 transition-transform", fetchingRules && "animate-spin")} />
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
            value={totalRedemptionsCount}
            isLoading={loadingRedemptions}
            badge={{ text: 'Paid Only', variant: 'positive' }}
            hint="Discounts redeemed on paid orders"
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
              {totalRedemptionsCount}
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
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search campaigns or promo codes..."
              onReset={() => {
                setSearchTerm('');
                setStatusFilter('ACTIVE');
              }}
              hasActiveFilters={Boolean(searchTerm || statusFilter !== 'ACTIVE')}
              activeFiltersCount={(searchTerm ? 1 : 0) + (statusFilter !== 'ACTIVE' ? 1 : 0)}
            >
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    statusFilter === 'ALL'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({safeCampaigns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    statusFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      statusFilter === 'ACTIVE' ? 'bg-white' : 'bg-emerald-500'
                    )}
                  />
                  Active ({activeCampaignsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    statusFilter === 'INACTIVE'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      statusFilter === 'INACTIVE' ? 'bg-white' : 'bg-amber-500'
                    )}
                  />
                  Inactive ({inactiveCampaignsCount})
                </button>
              </div>
            </CRMFilterBar>

            {loadingCampaigns ? (
              <CRMLoadingState message="Loading discount campaigns..." />
            ) : filteredCampaigns.length === 0 ? (
              <CRMEmptyState
                icon={Tag}
                title={
                  statusFilter === 'ACTIVE'
                    ? 'No Active Coupons Found'
                    : statusFilter === 'INACTIVE'
                    ? 'No Inactive Coupons Found'
                    : 'No Campaigns Found'
                }
                description={
                  searchTerm
                    ? `No discount campaigns or promo codes match "${searchTerm}". Try adjusting your search term.`
                    : statusFilter === 'ACTIVE'
                    ? 'No active discount campaigns right now. Create a new campaign or view inactive campaigns.'
                    : statusFilter === 'INACTIVE'
                    ? 'No inactive discount campaigns found.'
                    : 'No discount campaigns match your current filters. Create a promotional voucher campaign to reward prospects and members.'
                }
                actionLabel={
                  searchTerm
                    ? 'Clear Search'
                    : statusFilter !== 'ACTIVE'
                    ? 'Reset to Active'
                    : canCreate
                    ? '+ Create Campaign'
                    : undefined
                }
                onAction={
                  searchTerm
                    ? () => setSearchTerm('')
                    : statusFilter !== 'ACTIVE'
                    ? () => setStatusFilter('ACTIVE')
                    : openCreateCampaignModal
                }
                canAction={Boolean(statusFilter !== 'ACTIVE' || searchTerm || canCreate)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampaigns.map((camp) => {
                  const cCfg = camp.configuration || {};
                  const cBranchIds: string[] = Array.isArray(cCfg['branch_ids']) && (cCfg['branch_ids'] as string[]).length > 0
                    ? (cCfg['branch_ids'] as string[])
                    : cCfg['branch_id'] ? [cCfg['branch_id'] as string] : [];
                  const cProgIds: string[] = Array.isArray(cCfg['program_ids']) && (cCfg['program_ids'] as string[]).length > 0
                    ? (cCfg['program_ids'] as string[])
                    : cCfg['program_id'] ? [cCfg['program_id'] as string] : [];
                  const cPkgIds: string[] = Array.isArray(cCfg['package_ids']) && (cCfg['package_ids'] as string[]).length > 0
                    ? (cCfg['package_ids'] as string[])
                    : cCfg['package_id'] ? [cCfg['package_id'] as string] : [];

                  const branchScopeLabel = cBranchIds.length === 1
                    ? branches.find((b) => b.id === cBranchIds[0])?.name || '1 Branch'
                    : cBranchIds.length > 1
                    ? `${cBranchIds.length} Branches`
                    : null;

                  const programScopeLabel = cProgIds.length === 1
                    ? programs.find((p) => p.id === cProgIds[0])?.name || '1 Program'
                    : cProgIds.length > 1
                    ? `${cProgIds.length} Programs`
                    : null;

                  const packageScopeLabel = cPkgIds.length === 1
                    ? packages.find((p) => p.id === cPkgIds[0])?.name || '1 Package'
                    : cPkgIds.length > 1
                    ? `${cPkgIds.length} Packages`
                    : null;

                  const campIsActive = isCampaignActive(camp);
                  const displayedCodes = camp.codes || [];

                  return (
                    <div
                      key={camp.id}
                      className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={campIsActive ? 'default' : 'secondary'}
                              className={cn(
                                'text-xs font-semibold',
                                campIsActive
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {camp.status}
                            </Badge>
                            {canEdit && (
                              <button
                                type="button"
                                title={campIsActive ? 'Deactivate campaign' : 'Activate campaign'}
                                onClick={() =>
                                  toggleCampaignStatusMutation.mutate({
                                    campaignId: camp.id,
                                    status: campIsActive ? 'PAUSED' : 'ACTIVE',
                                  })
                                }
                                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                              >
                                <Power
                                  className={cn(
                                    'w-3.5 h-3.5',
                                    campIsActive
                                      ? 'text-emerald-500 hover:text-amber-500'
                                      : 'text-muted-foreground hover:text-emerald-500'
                                  )}
                                />
                              </button>
                            )}
                          </div>
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
                        {(branchScopeLabel || programScopeLabel || packageScopeLabel) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {branchScopeLabel && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {branchScopeLabel}
                              </Badge>
                            )}
                            {programScopeLabel && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <Layers className="w-3 h-3 text-muted-foreground" />
                                {programScopeLabel}
                              </Badge>
                            )}
                            {packageScopeLabel && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                {packageScopeLabel}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                          {camp.max_discount && (
                            <div className="flex items-center justify-between">
                              <span>Maximum Discount:</span>
                              <span className="font-medium text-foreground">₹{camp.max_discount}</span>
                            </div>
                          )}
                          {camp.minimum_order_amount && (
                            <div className="flex items-center justify-between">
                              <span>Minimum Order Value:</span>
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
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Promo Codes
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {displayedCodes.length}
                                {camp.codes && camp.codes.length !== displayedCodes.length
                                  ? ` of ${camp.codes.length}`
                                  : ''}
                              </Badge>
                            </div>
                            {camp.codes && camp.codes.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {camp.codes.filter(isCodeActive).length} active
                                </span>
                                {camp.codes.some((c: DiscountCode) => !isCodeActive(c)) && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      {camp.codes.filter((c: DiscountCode) => !isCodeActive(c)).length} inactive
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {displayedCodes.length > 0 ? (
                              displayedCodes.map((c: DiscountCode) => {
                                const codeIsActive = isCodeActive(c);
                                return (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-primary">{c.code}</span>
                                      <Badge
                                        variant={codeIsActive ? 'default' : 'secondary'}
                                        className={cn(
                                          'text-[10px] px-1.5 py-0 h-4',
                                          codeIsActive
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-muted-foreground/20 text-muted-foreground'
                                        )}
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
                                          title={codeIsActive ? 'Deactivate code' : 'Activate code'}
                                          onClick={() =>
                                            toggleCodeStatusMutation.mutate({
                                              codeId: c.id,
                                              status: codeIsActive ? 'INACTIVE' : 'ACTIVE',
                                            })
                                          }
                                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                        >
                                          <Power
                                            className={cn(
                                              'w-3.5 h-3.5',
                                              codeIsActive
                                                ? 'text-emerald-500 hover:text-amber-500'
                                                : 'text-muted-foreground hover:text-emerald-500'
                                            )}
                                          />
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
                                          className="p-1 text-muted-foreground hover:text-rose-500 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : camp.codes && camp.codes.length > 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                No {statusFilter.toLowerCase()} codes ({camp.codes.length} hidden by filter)
                              </span>
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
                  <span>Automatic Offer Rules</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically show or apply offers based on a member's session usage, plan age, or activity.
                </p>
              </div>

              {canCreate && (
                <Button
                  size="sm"
                  onClick={openCreateRuleModal}
                  className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Offer Rule</span>
                </Button>
              )}
            </div>

            {loadingRules ? (
              <CRMLoadingState message="Loading automatic offer rules..." />
            ) : errorRules ? (
              <CRMErrorState
                title="Failed to Load Offer Rules"
                message="Unable to communicate with the offer rules engine. Please verify network access and retry."
                onRetry={refetchRules}
              />
            ) : safeRules.length === 0 ? (
              <CRMEmptyState
                icon={Sparkles}
                title="No Automatic Offer Rules"
                description="Create rules to automatically reward members based on their session usage, plan age, or inactivity."
                actionLabel={canCreate ? '+ Create Offer Rule' : undefined}
                onAction={openCreateRuleModal}
                canAction={canCreate}
              />
            ) : (
              <div className="divide-y divide-border/60 p-4 sm:p-5 space-y-4">
                {rules.map((r) => {
                  const rawDesc = (r.description || '').replace(/<!--\s*SCOPE:\s*\{.*?\}\s*-->/g, '').trim();
                  const rCfg = r.configuration || {};

                  // Scopes from configuration, falling back to legacy single fields
                  let scopeBranchIds: string[] = Array.isArray(rCfg['branch_ids']) && (rCfg['branch_ids'] as string[]).length > 0
                    ? (rCfg['branch_ids'] as string[])
                    : r.branch ? [r.branch] : [];

                  let scopeProgIds: string[] = Array.isArray(rCfg['program_ids']) && (rCfg['program_ids'] as string[]).length > 0
                    ? (rCfg['program_ids'] as string[])
                    : [];

                  let scopePkgIds: string[] = Array.isArray(rCfg['package_ids']) && (rCfg['package_ids'] as string[]).length > 0
                    ? (rCfg['package_ids'] as string[])
                    : r.target_package ? [r.target_package] : [];

                  if (scopePkgIds.length > 0 && scopeProgIds.length === 0) {
                    const targetPkg = packages.find((p) => p.id === scopePkgIds[0]);
                    const progId = targetPkg ? (targetPkg.program || (targetPkg as any).program_id) : null;
                    if (progId) scopeProgIds = [progId];
                  }

                  const branchScopeLabel = scopeBranchIds.length === 1
                    ? branches.find((b) => b.id === scopeBranchIds[0])?.name || '1 Branch'
                    : scopeBranchIds.length > 1
                    ? `${scopeBranchIds.length} Branches`
                    : null;

                  const programScopeLabel = scopeProgIds.length === 1
                    ? programs.find((p) => p.id === scopeProgIds[0])?.name || '1 Program'
                    : scopeProgIds.length > 1
                    ? `${scopeProgIds.length} Programs`
                    : null;

                  const packageScopeLabel = scopePkgIds.length === 1
                    ? packages.find((p) => p.id === scopePkgIds[0])?.name || '1 Package'
                    : scopePkgIds.length > 1
                    ? `${scopePkgIds.length} Packages`
                    : null;

                  const srcPkgName = packages.find((p) => p.id === r.source_package)?.name;

                  return (
                    <div key={r.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">{r.name}</h4>
                            <Badge variant="outline" className="text-[11px]">
                              Priority {r.priority}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {RULE_TYPE_OPTIONS.find((opt) => opt.value === r.rule_type)?.label || r.rule_type}
                            </Badge>
                            <Badge
                              variant={r.evaluation_mode === 'ALL_CONDITIONS' ? 'default' : 'outline'}
                              className={cn(
                                'text-[11px]',
                                r.evaluation_mode === 'ALL_CONDITIONS'
                                  ? 'bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-500/30'
                              )}
                              title={
                                r.evaluation_mode === 'ALL_CONDITIONS'
                                  ? 'The member must meet every condition below to qualify.'
                                  : 'The member only needs to meet at least one condition below to qualify.'
                              }
                            >
                              {r.evaluation_mode === 'ALL_CONDITIONS' ? 'Match All Rules' : 'Match Any Rule'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rawDesc || 'No description provided.'}
                          </p>

                          {/* Scopes */}
                          {(branchScopeLabel || programScopeLabel || packageScopeLabel || srcPkgName) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {branchScopeLabel && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <Building2 className="w-3 h-3 text-muted-foreground" />
                                  {branchScopeLabel}
                                </Badge>
                              )}
                              {programScopeLabel && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <Layers className="w-3 h-3 text-muted-foreground" />
                                  {programScopeLabel}
                                </Badge>
                              )}
                              {packageScopeLabel && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                  {packageScopeLabel}
                                </Badge>
                              )}
                              {srcPkgName && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                  <PackageIcon className="w-3 h-3 text-muted-foreground" />
                                  Source Pkg: {srcPkgName}
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
                              Qualifying Conditions ({r.conditions?.length || 0})
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {r.evaluation_mode === 'ALL_CONDITIONS' ? 'Must match all' : 'Match any'}
                            </span>
                          </div>
                          {r.conditions && r.conditions.length > 0 ? (
                            r.conditions.map((c: any) => {
                              const condLabel = CONDITION_LABEL_MAP[c.condition_type] || c.condition_type;
                              const opLabel = OPERATOR_LABEL_MAP[c.operator] || c.operator;
                              const valLabel = c.condition_type === 'CURRENT_PACKAGE_EQUALS' && c.text_value
                                ? (packages.find((p) => p.id === c.text_value)?.name || c.text_value)
                                : c.numeric_value !== null && c.numeric_value !== undefined && c.numeric_value !== ''
                                ? formatRuleNumericValue(c.condition_type, c.numeric_value)
                                : (c.text_value || 'true');
                              return (
                                <div
                                  key={c.id}
                                  className="text-foreground text-xs bg-background/60 p-2 rounded border border-border/40"
                                >
                                  • <span className="font-semibold">{condLabel}</span>{' '}
                                  <span className="text-primary font-medium">{opLabel}</span>{' '}
                                  <span className="font-semibold">{valLabel}</span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground italic block">Applies to everyone (no conditions)</span>
                          )}
                        </div>

                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Reward &amp; Benefit
                            </span>
                          </div>
                          {r.actions && r.actions.length > 0 ? (
                            r.actions.map((a: any) => {
                              const actionLabel = ACTION_TYPE_OPTIONS.find((opt) => opt.value === a.action_type)?.label || a.action_type;
                              const linkedCamp = a.campaign ? campaigns.find((cp) => cp.id === a.campaign) : null;
                              return (
                                <div key={a.id} className="text-emerald-800 dark:text-emerald-200 space-y-1">
                                  <div className="font-semibold flex items-center gap-1.5">
                                    <span>{actionLabel}</span>
                                    {a.auto_apply && (
                                      <Badge variant="outline" className="text-[9px] bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
                                        Auto-Applied
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs">
                                    Reward:{' '}
                                    {a.discount_percentage
                                      ? `${formatPercentage(a.discount_percentage)}% OFF`
                                      : a.discount_amount
                                      ? `₹${a.discount_amount} OFF`
                                      : linkedCamp
                                      ? `${linkedCamp.name} (${linkedCamp.discount_type === 'PERCENTAGE' ? `${formatPercentage(linkedCamp.discount_value)}% OFF` : formatCurrency(linkedCamp.discount_value)})`
                                      : 'Promo Coupon Offer'}
                                  </div>
                                  {a.message && <div className="text-[11px] italic">"{a.message}"</div>}
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground italic block">No reward configured</span>
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
              <>
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
              {totalRedemptionsCount > redemptionPageSize && (
                <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 text-xs">
                  <span className="text-muted-foreground">
                    Showing {((redemptionPage - 1) * redemptionPageSize) + 1}–{Math.min(redemptionPage * redemptionPageSize, totalRedemptionsCount)} of {totalRedemptionsCount.toLocaleString('en-IN')} paid redemptions
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={redemptionPage <= 1 || loadingRedemptions}
                      onClick={() => setRedemptionPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs px-3"
                    >
                      Previous
                    </Button>
                    <span className="font-medium text-foreground px-2">
                      Page {redemptionPage} of {Math.max(1, Math.ceil(totalRedemptionsCount / redemptionPageSize))}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={redemptionPage >= Math.ceil(totalRedemptionsCount / redemptionPageSize) || loadingRedemptions}
                      onClick={() => setRedemptionPage((p) => p + 1)}
                      className="h-8 text-xs px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
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
                <SimulatorMemberSelect
                  selectedMemberId={simUserProfileId}
                  onSelectMember={(memberId) => {
                    setSimUserProfileId(memberId);
                    setSelectedMembershipId('');
                  }}
                />
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
                    ) : liveMemberContext?.membership_status === 'ACTIVE' ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600">
                        {liveMemberContext?.metrics_available ? 'Active · Entitlement Live' : 'Active Membership'}
                      </Badge>
                    ) : liveMemberContext?.membership_status === 'EXPIRED' ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 bg-rose-600 text-white">
                        Expired Membership
                      </Badge>
                    ) : liveMemberContext?.membership_status === 'FROZEN' ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500 text-white">
                        Frozen Membership
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {liveMemberContext?.has_membership ? (liveMemberContext.membership_status || 'Inactive') : 'No Active Membership'}
                      </Badge>
                    )}
                  </div>

                  {/* Multi-membership selection if member has multiple active memberships */}
                  {liveMemberContext?.all_memberships && liveMemberContext.all_memberships.length > 1 && (
                    <div className="pt-2 pb-1 border-t border-border/40">
                      <label className="block text-[11px] font-semibold text-primary mb-1">
                        Select Membership Plan ({liveMemberContext.all_memberships.length} plans found):
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] pt-2 border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground">
                          {liveMemberContext.membership_status === 'EXPIRED'
                            ? 'Expired Package:'
                            : liveMemberContext.membership_status === 'INACTIVE'
                            ? 'Assigned Package:'
                            : 'Active Package:'}
                        </span>{' '}
                        <span className="font-semibold text-foreground">
                          {liveMemberContext.current_package_name && liveMemberContext.current_package_name !== 'None'
                            ? liveMemberContext.current_package_name
                            : liveMemberContext.membership_status === 'INACTIVE'
                            ? 'None (No active package)'
                            : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Studio Branch:</span>{' '}
                        <span className="font-semibold text-foreground">
                          {liveMemberContext.branch_name || 'Main Branch'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Membership Status:</span>{' '}
                        <span className={cn(
                          "font-semibold",
                          liveMemberContext.membership_status === 'ACTIVE' ? "text-emerald-600 dark:text-emerald-400" :
                          liveMemberContext.membership_status === 'EXPIRED' ? "text-rose-600 dark:text-rose-400" :
                          liveMemberContext.membership_status === 'FROZEN' ? "text-amber-600 dark:text-amber-400" :
                          "text-muted-foreground font-medium"
                        )}>
                          {liveMemberContext.membership_status || 'INACTIVE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {liveMemberContext.has_membership ? 'Package Age:' : 'Account Age:'}
                        </span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.package_age_days !== null && liveMemberContext.package_age_days !== undefined
                            ? `${liveMemberContext.package_age_days} days`
                            : '0 days'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining Days:</span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.remaining_days !== null && liveMemberContext.remaining_days !== undefined
                            ? `${liveMemberContext.remaining_days} days`
                            : '0 days'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Session Usage:</span>{' '}
                        <span className="font-mono text-foreground font-semibold">
                          {liveMemberContext.usage_percentage !== null && liveMemberContext.usage_percentage !== undefined
                            ? `${formatPercentage(liveMemberContext.usage_percentage)}%`
                            : '0.00%'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground">Sessions (Consumed / Allocated):</span>{' '}
                        <span className="font-mono text-foreground">
                          {liveMemberContext.is_unlimited
                            ? 'Unlimited Plan'
                            : liveMemberContext.sessions_allocated !== null && liveMemberContext.sessions_allocated !== undefined
                            ? `${liveMemberContext.sessions_consumed ?? 0} consumed / ${liveMemberContext.sessions_allocated} allocated (${liveMemberContext.sessions_remaining ?? 0} remaining)`
                            : '0 consumed / 0 allocated (No active plan)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!liveMemberContext?.has_membership ? (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>ℹ️ Inactive Member (No Active Plan)</span>
                      </div>
                      <p className="text-muted-foreground">
                        This member is registered in the database but currently has no active membership package.
                        To simulate and test retention rules requiring session usage or active packages, check <strong>"Simulate What-If Metrics"</strong> below.
                        For promo coupons, select a package under <strong>"Target Package (Optional)"</strong> to validate applicability.
                      </p>
                    </div>
                  ) : liveMemberContext?.membership_status === 'EXPIRED' ? (
                    <div className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-lg border border-border/40 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-foreground">
                        <span>ℹ️ Expired Member</span>
                      </div>
                      <p className="text-muted-foreground">
                        Member's previous package has ended. Eligible for Win-Back / Rejoin retention rules and new package checkout offers.
                      </p>
                    </div>
                  ) : null}
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
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs text-foreground font-medium"
                    >
                      <option value="">Any Active Package</option>
                      {activePackages.map((p) => {
                        const progName = p.program_name || programs.find((pr: any) => pr.id === (p.program || (p as any).program_id))?.name;
                        return (
                          <option key={p.id} value={p.id}>
                            {progName ? `${p.name} (${progName})` : p.name}
                          </option>
                        );
                      })}
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

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="simHypoToggle"
                    checked={simUseHypothetical}
                    onChange={(e) => setSimUseHypothetical(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <label htmlFor="simHypoToggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Simulate What-If Metrics (for testing inactive/new members)
                  </label>
                </div>

                {simUseHypothetical && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Session Usage %</label>
                      <Input
                        type="number"
                        value={simHypoUsagePct}
                        onChange={(e) => setSimHypoUsagePct(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. 85"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Package Age (Days)</label>
                      <Input
                        type="number"
                        value={simHypoAgeDays}
                        onChange={(e) => setSimHypoAgeDays(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. 75"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Sessions Consumed</label>
                      <Input
                        type="number"
                        value={simHypoConsumed}
                        onChange={(e) => setSimHypoConsumed(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. 17"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Sessions Remaining</label>
                      <Input
                        type="number"
                        value={simHypoRemaining}
                        onChange={(e) => setSimHypoRemaining(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>
                )}

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
                        {off.campaign_name && (
                          <div className="text-[11px] text-muted-foreground">
                            Target Campaign: <span className="font-medium text-foreground">{off.campaign_name}</span>
                          </div>
                        )}
                        {off.coupon_code && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-muted-foreground text-[11px]">Associated Code:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSimCode(off.coupon_code!);
                                toast.info(`Coupon '${off.coupon_code}' copied to Section A!`);
                              }}
                              className="font-mono font-bold text-xs text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20"
                            >
                              <Tag className="w-3 h-3" />
                              {off.coupon_code} (Use in Section A)
                            </button>
                          </div>
                        )}
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
                <label className="block text-xs font-medium text-foreground mb-1">Maximum Discount (₹)</label>
                <Input
                  type="number"
                  placeholder="Optional cap"
                  value={campMaxDiscount}
                  onChange={(e) => setCampMaxDiscount(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Minimum Order Value (₹)</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Branch Scope (Optional)</label>
                <CheckboxMultiSelect
                  label="Branches"
                  allLabel="All Branches"
                  items={branches.map((b) => ({ id: b.id, name: b.name }))}
                  selectedIds={campBranchIds}
                  onChange={setCampBranchIds}
                  placeholder="Search branches..."
                  emptyMessage="No branches found"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Program Scope (Optional)</label>
                <CheckboxMultiSelect
                  label="Programs"
                  allLabel="All Programs"
                  items={programs.map((p) => ({ id: p.id, name: p.name }))}
                  selectedIds={campProgramIds}
                  onChange={setCampProgramIds}
                  placeholder="Search programs..."
                  emptyMessage="No active programs found"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Package Scope (Optional)</label>
                <CheckboxMultiSelect
                  label="Packages"
                  allLabel="All Packages"
                  items={availablePackagesForCampaign.map((p) => ({ id: p.id, name: p.name }))}
                  selectedIds={campPackageIds}
                  onChange={setCampPackageIds}
                  placeholder="Search active packages..."
                  emptyMessage={
                    campProgramIds.length > 0 && campProgramIds.length < programs.length
                      ? 'No active packages for selected program(s)'
                      : 'No active packages found'
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Who Can Use This Coupon</label>
                <CheckboxMultiSelect
                  label="Member Types"
                  allLabel="All Member Types"
                  items={CAMPAIGN_MEMBER_TYPE_OPTIONS}
                  selectedIds={campMemberTypes}
                  onChange={setCampMemberTypes}
                  placeholder="Select eligible members..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Applicable Transaction Types</label>
                <CheckboxMultiSelect
                  label="Transaction Types"
                  allLabel="All Transactions"
                  items={CAMPAIGN_ORDER_TYPE_OPTIONS}
                  selectedIds={campOrderTypes}
                  onChange={setCampOrderTypes}
                  placeholder="Select transaction types..."
                />
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
                  <option value="">Inherit Campaign / All Active Packages</option>
                  {activePackages.map((p) => {
                    const progName = p.program_name || programs.find((pr: any) => pr.id === (p.program || (p as any).program_id))?.name;
                    return (
                      <option key={p.id} value={p.id}>
                        {progName ? `${p.name} (${progName})` : p.name}
                      </option>
                    );
                  })}
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
              {editingRule ? 'Edit Automatic Offer Rule' : 'Create Automatic Offer Rule'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Offer Rule Name *</label>
              <Input
                type="text"
                required
                placeholder="e.g. 20% Off When 80% Sessions Used"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Notes / Purpose</label>
              <Input
                placeholder="Short note explaining when this offer should apply"
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Offer Category *</label>
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
                <label className="block text-xs font-medium text-foreground mb-1">Priority (Lower runs first)</label>
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
                  When Should This Offer Trigger?
                </span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-200 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="evalMode"
                      value="ALL_CONDITIONS"
                      checked={ruleEvaluationMode === 'ALL_CONDITIONS'}
                      onChange={() => setRuleEvaluationMode('ALL_CONDITIONS')}
                      className="text-blue-600"
                    />
                    <span>Match All Rules</span>
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
                    <span>Match Any Single Rule</span>
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                {ruleEvaluationMode === 'ALL_CONDITIONS'
                  ? 'The member must meet every condition below to qualify for this offer.'
                  : 'The member only needs to meet at least one condition below to qualify for this offer.'}
              </p>
            </div>

            {/* Scope Filters — EXACT SAME 3 DROPDOWNS AS IN CREATE DISCOUNT CAMPAIGN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Valid Locations (Optional)</label>
                <CheckboxMultiSelect
                  label="Branches"
                  allLabel="All Locations"
                  items={branches.map((b) => ({ id: b.id, name: b.name }))}
                  selectedIds={ruleBranchIds}
                  onChange={setRuleBranchIds}
                  placeholder="Search locations..."
                  emptyMessage="No locations found"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Eligible Programs (Optional)</label>
                <CheckboxMultiSelect
                  label="Programs"
                  allLabel="All Programs"
                  items={programs.map((p) => ({ id: p.id, name: p.name }))}
                  selectedIds={ruleProgramIds}
                  onChange={setRuleProgramIds}
                  placeholder="Search programs..."
                  emptyMessage="No active programs found"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Eligible Packages (Optional)</label>
                <CheckboxMultiSelect
                  label="Packages"
                  allLabel="All Packages"
                  items={availablePackagesForRule.map((p) => ({ id: p.id, name: p.name }))}
                  selectedIds={rulePackageIds}
                  onChange={setRulePackageIds}
                  placeholder="Search active packages..."
                  emptyMessage={
                    ruleProgramIds.length > 0 && ruleProgramIds.length < programs.length
                      ? 'No active packages for selected program(s)'
                      : 'No active packages found'
                  }
                />
              </div>
            </div>

            {/* Conditions Builder (Visible in both Create and Edit) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Qualifying Conditions ({ruleConditions.length})
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
                Reward &amp; Benefit
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">What Reward to Give</label>
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
                    <SearchableSingleSelect
                      label="Campaign"
                      allLabel="-- Choose Campaign --"
                      items={campaigns
                        .filter((camp) => camp.status === 'ACTIVE' || camp.id === ruleActionCampaignId)
                        .map((camp) => ({
                          id: camp.id,
                          name: `${camp.name} (${camp.discount_type === 'PERCENTAGE' ? `${formatPercentage(camp.discount_value)}%` : formatCurrency(camp.discount_value)})`,
                        }))}
                      value={ruleActionCampaignId}
                      onChange={setRuleActionCampaignId}
                      placeholder="Search active campaigns..."
                      emptyMessage="No active campaigns available"
                    />
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
                <label className="block text-xs font-medium text-foreground mb-1">Message Shown to Member</label>
                <Input
                  placeholder="e.g. You unlocked a special 20% renewal discount!"
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
                <span>Automatically apply discount at checkout (no promo code needed)</span>
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
                {editingRule ? 'Save Offer Rule' : 'Create Offer Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

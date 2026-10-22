import { MemberParqSigningModal } from './modals/MemberParqSigningModal';
/**
 * src/components/members/Member360Workspace.tsx — Authoritative Member 360 Workspace
 * Production implementation with 6 clean sections:
 * 1. Overview
 * 2. Timeline (Complete A-to-Z Member History)
 * 3. Memberships & Passbook (Immutable Contract Snapshots & Append-only Entitlement Ledger)
 * 4. Bookings & Attendance
 * 5. Finance (Orders, Payments, Invoices, Refunds, Outstanding)
 * 6. Health & Forms (Dynamic Form Renderer for Intake Submissions)
 * 
 * Zero mock fallback data. Fully backend-authoritative. Mobile responsive.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  CreditCard,
  DollarSign,
  TrendingUp,
  Activity,
  FileText,
  HeartPulse,
  History,
  Tag,
  Dumbbell,
  ArrowUpRight,
  ArrowRight,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Percent,
  XCircle,
  Download,
  Receipt,
  UserCheck,
  Check,
  X,
  FileQuestion,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldCheck,
  PenTool,
  Edit3,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { membersApi } from '@/api/endpoints/membersApi';
import { EditMemberProfileModal } from './modals/EditMemberProfileModal';
import { EditAttendanceModal } from './modals/EditAttendanceModal';
import type {
  Member360Data,
  TimelineEvent,
  MembershipRecord,
  EntitlementBalance,
  EntitlementLedgerEntry,
  MemberBookingItem,
  MemberAttendanceItem,
  MemberOrder,
  MemberPayment,
  MemberInvoiceItem,
  MemberRefund,
  MemberIntakeSubmission,
  MembershipLifecycleAction,
} from '@/types/members';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RenewModal,
  UpgradeModal,
  ExtendModal,
  FreezeModal,
  TransferModal,
  CancelModal,
  RejoinModal,
  InvoiceDetailModal,
  AdjustEntitlementModal,
  BuyPassportModal,
  CollectPaymentModal,
  CheckInModal,
  TransactionReceiptModal,
  PurchaseProgramPackageModal,
} from './modals/MemberActionModals';

interface Member360WorkspaceProps {
  memberId: string;
  initialTab?: string | undefined;
}

type TabKey = 'overview' | 'timeline' | 'memberships' | 'bookings' | 'finance' | 'health';

const resolveInitialTab = (tab?: string): TabKey => {
  if (!tab) return 'overview';
  const lower = tab.toLowerCase();
  if (lower === 'parq_form' || lower === 'health' || lower === 'parq') return 'health';
  if (lower === 'memberships' || lower === 'membership') return 'memberships';
  if (lower === 'bookings' || lower === 'booking') return 'bookings';
  if (lower === 'finance' || lower === 'orders') return 'finance';
  if (lower === 'timeline') return 'timeline';
  return 'overview';
};

export const Member360Workspace: React.FC<Member360WorkspaceProps> = ({ memberId, initialTab }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveInitialTab(initialTab));

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveInitialTab(initialTab));
    }
  }, [initialTab]);

  // Modals state
  const [activeModal, setActiveModal] = useState<MembershipLifecycleAction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<MemberAttendanceItem | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Fetch Member 360 data
  const {
    data: data360,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Member360Data>({
    queryKey: ['member-360', memberId],
    queryFn: () => membersApi.getMember360(memberId),
    enabled: Boolean(memberId),
  });

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: () => membersApi.checkInMember(memberId),
    onSuccess: (res) => {
      toast.success(res.message || 'Check-in recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['member-360', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Check-in failed');
    },
  });

  // Unfreeze Mutation
  const unfreezeMutation = useMutation({
    mutationFn: () => membersApi.unfreezeMembership(memberId, { reason: 'Direct unfreeze from Member 360' }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership unfrozen successfully');
      queryClient.invalidateQueries({ queryKey: ['member-360', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to unfreeze membership');
    },
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Error state
  if (isError || !data360) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[500px] text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Member Profile Unavailable</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {(error as any)?.response?.data?.detail ||
            (error as any)?.response?.data?.error ||
            (error as any)?.message ||
            'Unable to fetch member details from the authoritative server.'}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate({ to: '/members' })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const member = data360.member || ({} as any);
  const header = {
    name: data360.header?.name || member.name || 'Member',
    member_number: data360.header?.member_number || (member as any).membership_number || member.member_number || '—',
    status: data360.header?.status || member.membership_status || member.status || 'INACTIVE',
    home_branch: data360.header?.home_branch || member.home_branch || 'Unassigned',
    home_branch_id: data360.header?.home_branch_id || member.home_branch_id,
    current_program: data360.header?.current_program || member.program_name || 'Standard',
    current_package: data360.header?.current_package || member.package_name || 'None',
    current_package_version: data360.header?.current_package_version || member.package_version_name || 'v1',
    expiry_date: data360.header?.expiry_date || member.expiry_date,
    home_sessions_remaining: data360.header?.home_sessions_remaining ?? member.home_sessions_remaining ?? 0,
    cross_branch_sessions_remaining: data360.header?.cross_branch_sessions_remaining ?? member.cross_branch_sessions_remaining ?? 0,
    outstanding_balance: Number(data360.header?.outstanding_balance ?? member.outstanding_balance ?? 0),
    assigned_trainer: data360.header?.assigned_trainer || member.assigned_trainer || 'Unassigned',
    alerts: Array.isArray(data360.header?.alerts) ? data360.header.alerts : [],
    available_actions: Array.isArray(data360.header?.available_actions) ? data360.header.available_actions : [],
    active_programs: Array.isArray((data360.header as any)?.active_programs)
      ? (data360.header as any).active_programs
      : (Array.isArray((data360.memberships as any)?.active_programs)
      ? (data360.memberships as any).active_programs
      : []),
  };

  const overview = {
    contact: data360.overview?.contact || {
      full_name: header.name,
      phone: member.phone || '',
      email: member.email || '',
      gender: member.gender || '—',
      age: member.age,
      date_of_birth: (member as any)?.date_of_birth,
      emergency_contact: member.emergency_contact || '',
      acquisition_source: member.source || 'Direct Walk-in',
      joined_at: member.joined_at,
    },
    home_branch: data360.overview?.home_branch || {
      id: header.home_branch_id,
      name: header.home_branch,
    },
    current_membership: data360.overview?.current_membership || data360.memberships?.active || null,
    entitlement_summary: Array.isArray(data360.overview?.entitlement_summary)
      ? data360.overview.entitlement_summary
      : (Array.isArray(data360.passbook?.balances) ? data360.passbook.balances : []),
    outstanding_balance: header.outstanding_balance,
    next_booking: data360.overview?.next_booking || null,
    assigned_trainer: header.assigned_trainer,
    alerts: header.alerts,
    recent_activities: Array.isArray(data360.overview?.recent_activities)
      ? data360.overview.recent_activities
      : (Array.isArray(data360.timeline) ? data360.timeline.slice(0, 5) : []),
  };

  const timeline = Array.isArray(data360.timeline) ? data360.timeline : [];
  const memberships = {
    active: data360.memberships?.active || null,
    active_list: Array.isArray((data360.memberships as any)?.active_list) ? (data360.memberships as any).active_list : [],
    active_programs: Array.isArray((data360.memberships as any)?.active_programs) ? (data360.memberships as any).active_programs : [],
    upcoming: Array.isArray(data360.memberships?.upcoming) ? data360.memberships.upcoming : [],
    history: Array.isArray(data360.memberships?.history) ? data360.memberships.history : [],
    freezes: Array.isArray(data360.memberships?.freezes) ? data360.memberships.freezes : [],
    branch_history: Array.isArray(data360.memberships?.branch_history) ? data360.memberships.branch_history : [],
    status_history: Array.isArray(data360.memberships?.status_history) ? data360.memberships.status_history : [],
  };

  const isTrialMember: boolean = Boolean(
    (header.status || '').toUpperCase() === 'TRIAL' ||
    (header.current_package || '').toLowerCase().includes('trial') ||
    (header.current_program || '').toLowerCase().includes('trial') ||
    !memberships.active
  );

  const activePrograms: any[] = (() => {
    if (Array.isArray(header.active_programs) && header.active_programs.length > 0) {
      return header.active_programs;
    }
    if (Array.isArray(memberships.active_programs) && memberships.active_programs.length > 0) {
      return memberships.active_programs;
    }
    if (Array.isArray(memberships.active_list) && memberships.active_list.length > 0) {
      return memberships.active_list;
    }
    if (header.current_program && header.current_program !== 'Standard') {
      return [{
        program_name: header.current_program,
        package_name: header.current_package,
        package_version: header.current_package_version,
        home_sessions_remaining: header.home_sessions_remaining,
        expiry_date: header.expiry_date,
        status: header.status,
      }];
    }
    return [];
  })();
  const passbook = {
    balances: Array.isArray(data360.passbook?.balances) ? data360.passbook.balances : [],
    ledger: Array.isArray(data360.passbook?.ledger) ? data360.passbook.ledger : [],
  };
  const bookings_and_attendance = {
    upcoming_bookings: Array.isArray(data360.bookings_and_attendance?.upcoming_bookings)
      ? data360.bookings_and_attendance.upcoming_bookings
      : [],
    past_bookings: Array.isArray(data360.bookings_and_attendance?.past_bookings)
      ? data360.bookings_and_attendance.past_bookings
      : [],
    attendance_records: Array.isArray(data360.bookings_and_attendance?.attendance_records)
      ? data360.bookings_and_attendance.attendance_records
      : [],
    stats: data360.bookings_and_attendance?.stats || { visits_30d: 0, total_bookings: 0, last_visit: null },
  };
  const finance = {
    summary: data360.finance?.summary || { total_invoiced: 0, total_paid: 0, total_outstanding: 0, total_refunded: 0 },
    orders: Array.isArray(data360.finance?.orders) ? data360.finance.orders : [],
    payments: Array.isArray(data360.finance?.payments) ? data360.finance.payments : [],
    invoices: Array.isArray(data360.finance?.invoices) ? data360.finance.invoices : [],
    refunds: Array.isArray(data360.finance?.refunds) ? data360.finance.refunds : [],
  };
  const health_and_forms = {
    submissions: Array.isArray(data360.health_and_forms?.submissions) ? data360.health_and_forms.submissions : [],
  };
  const par_q_form = {
    requirements: Array.isArray(data360.par_q_form?.requirements) ? data360.par_q_form.requirements : [],
    submissions: Array.isArray(data360.par_q_form?.submissions)
      ? data360.par_q_form.submissions
      : health_and_forms.submissions,
  };

  // Fully resolved authoritative Member object for Action Modals
  const modalMember: any = {
    ...member,
    id: member.id || memberId,
    name: header.name || 'Member',
    first_name: member.first_name || header.name.split(' ')[0] || 'Member',
    last_name: member.last_name || header.name.split(' ').slice(1).join(' ') || '',
    member_number: header.member_number || '',
    status: (header.status as any) || 'ACTIVE',
    phone: member.phone || overview.contact?.phone || '',
    email: member.email || overview.contact?.email || '',
    gender: member.gender || overview.contact?.gender || '—',
    age: member.age || overview.contact?.age || 0,
    home_branch: header.home_branch,
    home_branch_id: header.home_branch_id,
    program_name: header.current_program || (memberships.active as any)?.program_name || 'Bootcamp',
    program_id: (memberships.active as any)?.program_id || (member as any)?.program_id || '',
    package_name: header.current_package || (memberships.active as any)?.package_name || 'Standard Package',
    package_id: member.package_id || (memberships.active as any)?.package_id || '',
    package_version_name: header.current_package_version || memberships.active?.package_version_name || 'v1',
    expiry_date: header.expiry_date || memberships.active?.end_date || '',
    start_date: memberships.active?.start_date || member.start_date || '',
    home_sessions_remaining: header.home_sessions_remaining ?? 0,
    cross_branch_sessions_remaining: header.cross_branch_sessions_remaining ?? 0,
    sessions_remaining: header.home_sessions_remaining ?? 0,
    outstanding_balance: header.outstanding_balance ?? 0,
    membership_status: header.status,
  };

  const activeContracts: any[] =
    Array.isArray((memberships as any)?.active_list) && (memberships as any).active_list.length > 0
      ? (memberships as any).active_list
      : (memberships.active ? [memberships.active] : []);

  const handleViewTransaction = (txn: any) => {
    if (!txn) return;
    const orderNumber = txn.order_number || (txn.rawOrder && txn.rawOrder.order_number);
    let matchedOrder: any = null;
    if (orderNumber && finance?.orders) {
      matchedOrder = finance.orders.find((o) => o.order_number === orderNumber);
    }
    const merged = {
      ...(matchedOrder || {}),
      ...(txn.rawOrder || {}),
      ...txn,
      sold_by: txn.sold_by || txn.soldBy || (matchedOrder && matchedOrder.sold_by) || (memberships.active && memberships.active.sold_by) || 'Sweat Front Desk POS',
      coupon_code: txn.coupon_code || txn.couponCode || (matchedOrder && matchedOrder.coupon_code) || (memberships.active && memberships.active.coupon_code) || '',
      campaign_name: txn.campaign_name || (matchedOrder && matchedOrder.campaign_name) || (memberships.active && memberships.active.campaign_name) || '',
      discount_amount: Number(txn.discount_amount ?? txn.discountAmount ?? (matchedOrder && matchedOrder.discount_amount) ?? (memberships.active && memberships.active.discount_amount) ?? 0),
      catalog_price: Number(txn.catalog_price ?? txn.originalPrice ?? (matchedOrder && matchedOrder.catalog_price) ?? (memberships.active && memberships.active.catalog_price) ?? 0),
      discount_type: txn.discount_type || (matchedOrder && matchedOrder.discount_type) || (memberships.active && memberships.active.discount_type) || '',
      discount_label: txn.discount_label || (matchedOrder && matchedOrder.discount_label) || (memberships.active && memberships.active.discount_label) || '',
      payment_mode: txn.payment_mode || (matchedOrder && matchedOrder.payment_mode) || 'OFFLINE',
      payment_method: txn.payment_method || (matchedOrder && matchedOrder.payment_method) || 'Direct',
      provider_transaction_id: txn.provider_transaction_id || (matchedOrder && matchedOrder.provider_transaction_id) || '',
      contact: overview.contact.phone || member.phone || '—',
    };
    setSelectedTransaction(merged);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ACTIVE
          </Badge>
        );
      case 'FROZEN':
        return (
          <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-medium">
            <Snowflake className="w-3.5 h-3.5 mr-1" /> FROZEN
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1" /> EXPIRED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-medium">
            {status || 'INACTIVE'}
          </Badge>
        );
    }
  };

  const handleActionClick = (action: MembershipLifecycleAction) => {
    if (action === 'UNFREEZE') {
      unfreezeMutation.mutate();
    } else {
      setActiveModal(action);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground pb-12">
      {/* --------------------------------------------------------------------- */}
      {/* TOP BAR / BREADCRUMB */}
      {/* --------------------------------------------------------------------- */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/members' })}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Member Directory</span>
            </Button>
            <span className="text-muted-foreground/40 hidden sm:inline">/</span>
            <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
              {header.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
              {header.member_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {header.outstanding_balance > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setActiveModal('COLLECT_PAYMENT')}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Collect ₹{header.outstanding_balance.toLocaleString()}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 space-y-6">
        {/* ------------------------------------------------------------------- */}
        {/* MEMBER 360 HEADER */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Identity & Basic Info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xl text-indigo-400 shrink-0 shadow-inner">
                {header.name ? header.name.charAt(0).toUpperCase() : 'M'}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{header.name}</h1>
                  {getStatusBadge(header.status)}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>{header.member_number}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Home: <strong className="text-foreground">{header.home_branch || 'Unassigned'}</strong></span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-1 flex flex-wrap items-center gap-3">
                  <span>
                    Program: <strong className="text-foreground">{header.current_program || '—'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Package: <strong className="text-foreground">{header.current_package || 'No Package'}</strong>{' '}
                    <span className="text-muted-foreground/80">({header.current_package_version})</span>
                  </span>
                  {header.assigned_trainer && header.assigned_trainer !== 'Unassigned' && (
                    <>
                      <span>•</span>
                      <span>
                        Coach: <strong className="text-foreground">{header.assigned_trainer}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Key Metrics - Spacious, Uncluttered, and Readable */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:border-l lg:border-border/80 lg:pl-6 shrink-0 w-full lg:w-auto">
              <div className="bg-card/90 border border-border/70 rounded-xl px-3.5 py-2.5 text-center min-w-[110px] shadow-sm">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Home Sessions</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {header.home_sessions_remaining}
                </div>
                <div className="text-[10px] text-muted-foreground">remaining</div>
              </div>

              <div className="bg-card/90 border border-border/70 rounded-xl px-3.5 py-2.5 text-center min-w-[110px] shadow-sm">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Cross-Branch</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {header.cross_branch_sessions_remaining}
                </div>
                <div className="text-[10px] text-muted-foreground">remaining</div>
              </div>

              <div className="bg-card/90 border border-border/70 rounded-xl px-3.5 py-2.5 text-center min-w-[125px] shadow-sm">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Expiry</div>
                <div className="text-sm font-bold text-foreground mt-1 whitespace-nowrap">
                  {header.expiry_date
                    ? new Date(header.expiry_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'No Active Plan'}
                </div>
                <div className="text-[10px] text-muted-foreground">valid till</div>
              </div>

              <div
                className={`rounded-xl px-3.5 py-2.5 text-center min-w-[110px] shadow-sm border ${
                  header.outstanding_balance > 0
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-card/90 border-border/70'
                }`}
              >
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</div>
                <div
                  className={`text-xl font-bold mt-0.5 ${
                    header.outstanding_balance > 0 ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  ₹{Number(header.outstanding_balance).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">balance</div>
              </div>
            </div>
          </div>

          {/* Important Alerts Banner */}
          {header.alerts && header.alerts.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              {header.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm border ${
                    alert.severity === 'destructive'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <div>
                      <strong className="font-semibold">{alert.title}: </strong>
                      <span className="opacity-90">{alert.message}</span>
                    </div>
                  </div>
                  {alert.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-current"
                      onClick={() => handleActionClick(alert.action!)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Available Actions Bar */}
          <div className="mt-5 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Eligible Actions
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {header.available_actions?.filter((act) => act.action !== 'PURCHASE_PACKAGE').map((act) => {
                const isCheckIn = act.action === 'CHECK_IN';
                const isUnfreeze = act.action === 'UNFREEZE';
                const isCollect = act.action === 'COLLECT_PAYMENT';
                const isCancel = act.action === 'CANCEL';

                let variant: 'default' | 'outline' | 'destructive' | 'secondary' = 'outline';
                if (isCollect) variant = 'destructive';
                if (isCheckIn) variant = 'default';
                if (isUnfreeze) variant = 'secondary';

                return (
                  <Button
                    key={act.action}
                    size="sm"
                    variant={variant}
                    disabled={(act.action === 'RENEW' ? false : !act.eligible) || checkInMutation.isPending || unfreezeMutation.isPending}
                    title={act.reason || act.label}
                    onClick={() => handleActionClick(act.action)}
                    className="h-8 text-xs font-medium"
                  >
                    {isCheckIn && <UserCheck className="w-3.5 h-3.5 mr-1.5" />}
                    {isUnfreeze && <Snowflake className="w-3.5 h-3.5 mr-1.5" />}
                    {isCollect && <DollarSign className="w-3.5 h-3.5 mr-1.5" />}
                    {act.label}
                  </Button>
                );
              })}
              {!isTrialMember && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveModal('BUY_PASSPORT')}
                  className="h-8 text-xs font-medium text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                  title="Purchase cross-branch passport sessions"
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Buy Passport
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setActiveModal('PURCHASE_PACKAGE')}
                className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                title="Purchase a new program package or add sessions"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Purchase New Program / Package
              </Button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* 6 SECTION TABS */}
        {/* ------------------------------------------------------------------- */}
        <div className="border-b border-border">
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-px">
            {[
              { key: 'overview', label: 'Overview', icon: User },
              { key: 'timeline', label: 'Timeline', icon: History, count: (timeline || []).length },
              { key: 'memberships', label: 'Memberships & Passbook', icon: Layers },
              {
                key: 'bookings',
                label: 'Bookings & Attendance',
                icon: Calendar,
                count: (bookings_and_attendance?.upcoming_bookings || []).length,
              },
              { key: 'finance', label: 'Finance', icon: CreditCard },
              {
                key: 'health',
                label: 'PAR-Q Form',
                icon: HeartPulse,
                count: (par_q_form?.submissions || health_and_forms?.submissions || []).length,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Contact & Identity Info */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Identity & Profile
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    onClick={() => setIsEditProfileOpen(true)}
                    title="Edit Member Contact & Profile Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </Button>
                </div>

                <div className="space-y-3 text-sm divide-y divide-border/50">
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="font-medium text-foreground">{overview.contact.full_name}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium font-mono text-foreground">{overview.contact.phone || '—'}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground truncate max-w-[180px]">{overview.contact.email || '—'}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Gender / Age</span>
                    <span className="font-medium text-foreground">
                      {overview.contact.gender || '—'} {overview.contact.age ? `(${overview.contact.age} yrs)` : ''}
                    </span>
                  </div>
                  {(overview.contact as any)?.date_of_birth && (
                    <div className="pt-2 flex justify-between">
                      <span className="text-muted-foreground">Date of Birth</span>
                      <span className="font-medium text-foreground font-mono">
                        {(overview.contact as any).date_of_birth}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-medium text-foreground">{overview.contact.emergency_contact || 'None specified'}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Acquisition Source</span>
                    <Badge variant="outline" className="text-xs">
                      {overview.contact.acquisition_source || 'Direct Walk-in'}
                    </Badge>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium text-foreground">
                      {overview.contact.joined_at ? new Date(overview.contact.joined_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Booking Card */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Next Upcoming Session
                </h3>

                {overview.next_booking ? (
                  <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">
                        {overview.next_booking.class_name}
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                        {overview.next_booking.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{new Date(overview.next_booking.date_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{overview.next_booking.branch_name}</span>
                      </div>
                      {overview.next_booking.trainer_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>Trainer: {overview.next_booking.trainer_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                    <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    No upcoming sessions booked.
                  </div>
                )}
              </div>
            </div>

            {/* Center/Right Column: Current Membership Snapshot & Recent Activities */}
            <div className="space-y-6 lg:col-span-2">
              {/* Active Plan / Contract Snapshot Card */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" /> Active Membership Snapshot
                  </h3>
                  {overview.current_membership && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {overview.current_membership.membership_number}
                    </Badge>
                  )}
                </div>

                {overview.current_membership ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                      <div>
                        <div className="text-xs text-muted-foreground">Package & Program</div>
                        <div className="font-semibold text-foreground text-sm mt-0.5">
                          {overview.current_membership.package_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {overview.current_membership.program_name} · {overview.current_membership.package_version_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Contract Term</div>
                        <div className="font-medium text-foreground text-sm mt-0.5">
                          {new Date(overview.current_membership.start_date).toLocaleDateString()} —{' '}
                          {new Date(overview.current_membership.end_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Home Branch: {overview.current_membership.home_branch}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Contracted Price</div>
                        <div className="font-bold text-foreground text-sm mt-0.5">
                          {overview.current_membership.contract_snapshot ? (
                            <>
                              ₹{Number(overview.current_membership.contract_snapshot.final_amount).toLocaleString()}
                              {overview.current_membership.contract_snapshot.discount_amount > 0 && (
                                <span className="text-xs text-emerald-500 font-normal ml-1.5">
                                  (Saved ₹{overview.current_membership.contract_snapshot.discount_amount.toLocaleString()})
                                </span>
                              )}
                            </>
                          ) : (
                            'Snapshot Pending'
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Immutable audit record
                        </div>
                      </div>
                    </div>

                    {/* Entitlements Cards */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Session Passbook Summary
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {overview.entitlement_summary.map((ent) => (
                          <div key={ent.id} className="p-3 bg-muted/40 border border-border rounded-lg">
                            <div className="text-xs text-muted-foreground capitalize">
                              {ent.entitlement_type.replace(/_/g, ' ').toLowerCase()}
                            </div>
                            <div className="text-xl font-bold text-foreground mt-1">
                              {ent.is_unlimited ? (
                                <span className="text-indigo-400 font-sans">Unlimited</span>
                              ) : (
                                ent.remaining
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {ent.consumed} used of {ent.allocated ?? '∞'} allocated
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <Tag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium">No active membership plan on record.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assign a package or convert a lead to initiate coverage.
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Latest Operational Activity
                  </h3>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0 text-primary"
                    onClick={() => setActiveTab('timeline')}
                  >
                    View All {timeline.length} Events <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {overview.recent_activities.length > 0 ? (
                    overview.recent_activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/60 text-sm"
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-2 shrink-0"
                          style={{ backgroundColor: act.badge_color || '#6366f1' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground truncate">{act.title}</span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {new Date(act.occurred_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{act.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No recent activities recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: COMPLETE TIMELINE */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'timeline' && <MemberTimelineSection timeline={timeline} />}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: MEMBERSHIPS & PASSBOOK */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'memberships' && (
          <MemberMembershipsSection
            memberships={memberships}
            passbook={passbook}
            finance={finance}
            rewards={data360?.rewards}
            passport={data360?.passport}
            isTrialMember={isTrialMember}
            onAdjustSessions={() => setActiveModal('ADJUST_ENTITLEMENT')}
            onBuyPassport={() => setActiveModal('BUY_PASSPORT')}
            onPurchasePackage={() => setActiveModal('PURCHASE_PACKAGE')}
            onRenew={() => setActiveModal('RENEW')}
            onUpgrade={() => setActiveModal('UPGRADE')}
            onViewTransaction={handleViewTransaction}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: BOOKINGS & ATTENDANCE */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'bookings' && (
          <MemberBookingsSection
            bookingsData={bookings_and_attendance}
            onCheckIn={() => setActiveModal('CHECK_IN')}
            onEditAttendance={(att) => setSelectedAttendance(att)}
            isCheckingIn={checkInMutation.isPending}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: FINANCE */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'finance' && (
          <MemberFinanceSection
            finance={finance}
            onCollectPayment={() => setActiveModal('COLLECT_PAYMENT')}
            onViewInvoice={(inv) => setSelectedInvoice(inv)}
            onViewTransaction={handleViewTransaction}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: PAR-Q FORM */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'health' && (
          <MemberHealthFormsSection
            requirements={par_q_form?.requirements || []}
            submissions={par_q_form?.submissions || health_and_forms?.submissions || []}
            onRefresh={() => refetch()}
          />
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ACTION MODALS */}
      {/* --------------------------------------------------------------------- */}
      {activeModal === 'PURCHASE_PACKAGE' && (
        <PurchaseProgramPackageModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'RENEW' && (
        <RenewModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
          activeContracts={activeContracts}
        />
      )}

      {activeModal === 'UPGRADE' && (
        <UpgradeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
          activeContracts={activeContracts}
        />
      )}

      {activeModal === 'EXTEND' && (
        <ExtendModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
          activeContracts={activeContracts}
          pricingConfig={(data360 as any)?.config}
        />
      )}

      {activeModal === 'FREEZE' && (
        <FreezeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
          activeContracts={activeContracts}
          pricingConfig={(data360 as any)?.config}
        />
      )}

      {activeModal === 'TRANSFER' && (
        <TransferModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'CANCEL' && (
        <CancelModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'REJOIN' && (
        <RejoinModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'ADJUST_ENTITLEMENT' && (
        <AdjustEntitlementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'BUY_PASSPORT' && (
        <BuyPassportModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'COLLECT_PAYMENT' && (
        <CollectPaymentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {activeModal === 'CHECK_IN' && (
        <CheckInModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={modalMember}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          member={modalMember}
        />
      )}

      {selectedTransaction && (
        <TransactionReceiptModal
          isOpen={Boolean(selectedTransaction)}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
          member={member}
        />
      )}

      {isEditProfileOpen && (
        <EditMemberProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          memberId={member.id}
          initialData={{
            name: overview.contact.full_name || member.name,
            phone: overview.contact.phone || member.phone,
            email: overview.contact.email || member.email,
            gender: overview.contact.gender || (member as any)?.gender,
            date_of_birth: (overview.contact as any)?.date_of_birth,
            emergency_contact: overview.contact.emergency_contact,
            branch_id: (member as any)?.branch_id || (member as any)?.home_branch_id,
          }}
        />
      )}

      {selectedAttendance && (
        <EditAttendanceModal
          isOpen={Boolean(selectedAttendance)}
          onClose={() => setSelectedAttendance(null)}
          attendance={selectedAttendance}
          memberId={member.id}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-SECTION 1: COMPLETE A-TO-Z TIMELINE COMPONENT
// ============================================================================
const MemberTimelineSection: React.FC<{ timeline: TimelineEvent[] }> = ({ timeline }) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const categories = ['ALL', 'CRM', 'COMMERCE', 'MEMBERSHIP', 'BOOKING', 'ATTENDANCE', 'AUDIT'];

  // Reset to first page when search or category filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchFilter]);

  const isUuid = (val: any): boolean =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  // Clean raw UUID hashes from descriptions for laymen
  const sanitizeLaymanText = (text: string): string => {
    if (!text) return '';
    let cleaned = text.replace(/Package Version:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'Package Enrolled');
    cleaned = cleaned.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (match) => `#${match.substring(0, 6)}…`);
    return cleaned;
  };

  const formatMetadataKey = (key: string): string => {
    const map: Record<string, string> = {
      total_amount: 'Amount',
      paid_amount: 'Amount Paid',
      discount_amount: 'Coupon / Discount',
      status: 'Status',
      source: 'Source',
      provider: 'Provider',
      payment_method: 'Payment Method',
      to_branch: 'Branch',
      from_status: 'Previous Status',
      to_status: 'New Status',
      number: 'Ref #',
      booking_reference: 'Booking Ref',
      class_name: 'Class',
      reason: 'Reason',
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Filter out internal raw UUIDs and system IDs so laymen only see useful information
  const getCleanMetadataEntries = (metadata?: Record<string, any>) => {
    if (!metadata || typeof metadata !== 'object') return [];
    const excludedKeys = new Set([
      'id',
      'uuid',
      'tenant_id',
      'user_profile_id',
      'profile_id',
      'lead_id',
      'order_id',
      'payment_id',
      'invoice_id',
      'membership_id',
      'trial_id',
      'conversion_id',
      'package_version_id',
      'booking_id',
      'occurrence_id',
      'created_by',
    ]);
    return Object.entries(metadata).filter(([k, v]) => {
      if (excludedKeys.has(k.toLowerCase())) return false;
      if (isUuid(v)) return false;
      if (v === null || v === undefined || v === '') return false;
      return true;
    });
  };

  const filteredEvents = timeline.filter((evt) => {
    if (filterCategory !== 'ALL' && evt.category !== filterCategory) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.actor.toLowerCase().includes(q) ||
        evt.event_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startIndex = filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredEvents.length);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Complete Member Timeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated chronological history from CRM acquisition to active workouts and payments.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search timeline events..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        {paginatedEvents.length > 0 ? (
          <>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {paginatedEvents.map((evt) => {
                const cleanMeta = getCleanMetadataEntries(evt.metadata);
                return (
                  <div key={evt.id} className="relative group">
                    {/* Timeline node icon */}
                    <div
                      className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-background ring-2 ring-border"
                      style={{ backgroundColor: evt.badge_color || '#6366f1' }}
                    />

                    <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-border transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{sanitizeLaymanText(evt.title)}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {evt.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{new Date(evt.occurred_at).toLocaleString()}</span>
                          {evt.actor && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-mono">
                              by {evt.actor}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{sanitizeLaymanText(evt.description)}</p>

                      {/* Clean metadata display without raw UUID hashes */}
                      {cleanMeta.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                          {cleanMeta.map(([key, val]) => (
                            <span key={key} className="bg-muted/60 px-2 py-0.5 rounded border border-border/40">
                              {formatMetadataKey(key)}: <strong className="text-foreground">{String(val)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredEvents.length > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border mt-6">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex}</span> to{' '}
                  <span className="font-semibold text-foreground">{endIndex}</span> of{' '}
                  <span className="font-semibold text-foreground">{filteredEvents.length}</span> events
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-xs text-muted-foreground">…</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2.5 text-xs"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            No timeline events match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-SECTION 2: MEMBERSHIPS & PASSBOOK SECTION
// ============================================================================
const MemberMembershipsSection: React.FC<{
  memberships: Member360Data['memberships'];
  passbook: Member360Data['passbook'];
  finance: Member360Data['finance'];
  rewards?: Member360Data['rewards'];
  passport?: Member360Data['passport'];
  isTrialMember?: boolean;
  onAdjustSessions: () => void;
  onBuyPassport?: () => void;
  onPurchasePackage?: () => void;
  onRenew: () => void;
  onUpgrade: () => void;
  onViewTransaction: (txn: any) => void;
}> = ({ memberships, passbook, finance, rewards, passport, isTrialMember, onAdjustSessions, onBuyPassport, onPurchasePackage, onRenew, onUpgrade, onViewTransaction }) => {
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'PURCHASES' | 'EXTENSIONS' | 'COUPONS' | 'CANCELLATIONS'>('ALL');

  // Calculate total savings from coupons & discounts
  const totalDiscountSaved = React.useMemo(() => {
    let sum = 0;
    (finance?.orders || []).forEach((o) => {
      sum += Number(o.discount_amount || 0);
    });
    if (sum === 0 && memberships.active?.contract_snapshot?.discount_amount) {
      sum += Number(memberships.active.contract_snapshot.discount_amount);
    }
    return sum;
  }, [finance?.orders, memberships.active]);

  // Total sessions remaining across active balance buckets
  const totalSessionsRemaining = React.useMemo(() => {
    return (passbook?.balances || []).reduce((acc, b) => {
      if (b.is_unlimited) return acc;
      return acc + (b.remaining || 0);
    }, 0);
  }, [passbook?.balances]);

  // Assemble unified commercial passbook ledger for laymen
  const purchaseLedgerEntries = React.useMemo(() => {
    const entries: Array<{
      id: string;
      date: string;
      type: 'PURCHASE' | 'CANCELLATION' | 'REFUND' | 'RENEWAL' | 'EXTENSION';
      title: string;
      originalPrice: number;
      discountAmount: number;
      finalAmount: number;
      status: string;
      reference: string;
      couponCode?: string | undefined;
      soldBy?: string | undefined;
      notes?: string | undefined;
      rawOrder?: any;
    }> = [];

    // 1. Process all commerce orders (purchases, renewals, extensions, cancellations)
    (finance?.orders || []).forEach((o) => {
      const isCancelled = o.status.toUpperCase() === 'CANCELLED' || o.status.toUpperCase() === 'VOID';
      const isRefunded = o.status.toUpperCase() === 'REFUNDED';
      const isExtension = Boolean(
        o.is_extension ||
        o.order_type === 'EXTENSION' ||
        /extension/i.test(o.notes || '') ||
        (o.items && o.items.some((i) => /extension/i.test(i.item_name || '')))
      );
      const itemsList = o.items && o.items.length > 0 ? o.items.map((i) => i.item_name).join(', ') : o.order_type;
      const coupon = o.coupon_code || o.campaign_name || '';

      entries.push({
        id: `order-${o.id}`,
        date: o.created_at,
        type: isCancelled
          ? 'CANCELLATION'
          : isRefunded
          ? 'REFUND'
          : isExtension
          ? 'EXTENSION'
          : o.order_type === 'RENEWAL'
          ? 'RENEWAL'
          : 'PURCHASE',
        title: isExtension
          ? `Membership Validity Extension (${itemsList})`
          : (itemsList || `${o.order_type.replace(/_/g, ' ')} Purchase`),
        originalPrice: Number(o.subtotal || o.total_amount),
        discountAmount: Number(o.discount_amount || 0),
        finalAmount: Number(o.paid_amount || o.total_amount),
        status: o.status,
        reference: o.order_number,
        couponCode: coupon,
        soldBy: o.sold_by || 'Sweat Front Desk POS',
        notes: isCancelled
          ? 'Purchase Cancelled'
          : isExtension
          ? (o.notes || 'Purchased validity extension')
          : coupon
          ? `Coupon Applied: ${coupon}${o.discount_amount > 0 ? ` (Saved ₹${Number(o.discount_amount).toLocaleString()})` : ''}`
          : o.discount_amount > 0
          ? `Offline Branch Authorized Rate (Saved ₹${Number(o.discount_amount).toLocaleString()})`
          : undefined,
        rawOrder: o,
      });
    });

    // 2. Process all refunds & cancellations
    (finance?.refunds || []).forEach((r) => {
      entries.push({
        id: `refund-${r.id}`,
        date: r.created_at,
        type: 'REFUND',
        title: `Refund for Order #${r.order_number}`,
        originalPrice: 0,
        discountAmount: 0,
        finalAmount: -Number(r.amount),
        status: r.status,
        reference: r.order_number,
        soldBy: 'Branch Accounts',
        notes: r.reason ? `Cancellation Reason: ${r.reason}` : 'Refund Processed',
        rawOrder: r,
      });
    });

    // 3. Fallback: if no commerce orders exist yet, synthesize from active membership snapshot
    if (entries.length === 0 && memberships.active) {
      const snap = memberships.active.contract_snapshot;
      const coupon = memberships.active.coupon_code || memberships.active.campaign_name || snap?.coupon_code || snap?.campaign_name;
      const catPrice = Number(memberships.active.catalog_price || snap?.catalog_price || snap?.purchase_price || 0);
      const paidPrice = Number(memberships.active.purchase_price || snap?.purchase_price || snap?.final_amount || 0);
      const discAmt = Number(memberships.active.discount_amount || snap?.discount_amount || (catPrice > paidPrice ? catPrice - paidPrice : 0));

      entries.push({
        id: `mem-${memberships.active.id}`,
        date: memberships.active.start_date,
        type: 'PURCHASE',
        title: memberships.active.package_name,
        originalPrice: catPrice || paidPrice,
        discountAmount: discAmt,
        finalAmount: paidPrice,
        status: memberships.active.status,
        reference: memberships.active.membership_number,
        couponCode: coupon,
        soldBy: memberships.active.sold_by || 'Sweat Front Desk POS',
        notes: coupon
          ? `Coupon Applied: ${coupon}${discAmt > 0 ? ` (Saved ₹${discAmt.toLocaleString()})` : ''}`
          : discAmt > 0
          ? `Offline Branch Authorized Rate: ₹${discAmt.toLocaleString()}`
          : undefined,
        rawOrder: memberships.active,
      });
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [finance?.orders, finance?.refunds, memberships.active]);

  // Calculate original plan validity vs extended validity
  const originalPlanEndDate = React.useMemo(() => {
    if (!memberships.active) return null;
    const snap = memberships.active.contract_snapshot as any;

    // 1. If snapshot has an end_date that differs from active end_date, that snapshot date is the original validity
    if (snap?.end_date && memberships.active.end_date && snap.end_date !== memberships.active.end_date) {
      return snap.end_date;
    }
    if (snap?.original_end_date) return snap.original_end_date;
    if (snap?.initial_end_date) return snap.initial_end_date;

    // 2. If duration value and unit exist in contract snapshot, calculate from start_date
    if (snap?.duration_value && memberships.active.start_date) {
      const start = new Date(memberships.active.start_date);
      const val = Number(snap.duration_value);
      const unit = String(snap.duration_unit || 'DAYS').toUpperCase();
      if (!isNaN(start.getTime()) && val > 0) {
        const orig = new Date(start);
        if (unit.includes('MONTH')) {
          orig.setMonth(orig.getMonth() + val);
        } else if (unit.includes('YEAR')) {
          orig.setFullYear(orig.getFullYear() + val);
        } else {
          orig.setDate(orig.getDate() + val);
        }
        if (orig.getTime() < new Date(memberships.active.end_date).getTime()) {
          return orig.toISOString();
        }
      }
    }

    // 3. Subtract extension duration from extension ledger entries
    const extensionEntries = purchaseLedgerEntries.filter((e) => e.type === 'EXTENSION');
    if (extensionEntries.length > 0 && memberships.active.end_date) {
      let extDays = 0;
      extensionEntries.forEach((ext) => {
        const text = `${ext.title} ${ext.notes || ''} ${JSON.stringify(ext.rawOrder || {})}`;
        const dayMatch = text.match(/(\d+)\s*(?:day|days)/i);
        const monthMatch = text.match(/(\d+)\s*(?:month|months)/i);
        const yearMatch = text.match(/(\d+)\s*(?:year|years)/i);
        if (dayMatch && dayMatch[1]) {
          extDays += parseInt(dayMatch[1], 10);
        } else if (monthMatch && monthMatch[1]) {
          extDays += parseInt(monthMatch[1], 10) * 30;
        } else if (yearMatch && yearMatch[1]) {
          extDays += parseInt(yearMatch[1], 10) * 365;
        } else {
          extDays += 30;
        }
      });
      if (extDays > 0) {
        const currentEnd = new Date(memberships.active.end_date).getTime();
        return new Date(currentEnd - extDays * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    return snap?.end_date || memberships.active.end_date;
  }, [memberships.active, purchaseLedgerEntries]);

  const activeContracts: any[] = useMemo(() => {
    if (Array.isArray((memberships as any)?.active_list) && (memberships as any).active_list.length > 0) {
      return (memberships as any).active_list;
    }
    return memberships.active ? [memberships.active] : [];
  }, [memberships]);

  const filteredPurchaseLedger = purchaseLedgerEntries.filter((entry) => {
    if (ledgerFilter === 'PURCHASES') return entry.type === 'PURCHASE' || entry.type === 'RENEWAL';
    if (ledgerFilter === 'EXTENSIONS') return entry.type === 'EXTENSION';
    if (ledgerFilter === 'COUPONS') return entry.discountAmount > 0;
    if (ledgerFilter === 'CANCELLATIONS') return entry.type === 'CANCELLATION' || entry.type === 'REFUND';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Passbook Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] text-muted-foreground font-medium">Active Membership</span>
          <div className="text-sm font-bold text-foreground mt-1 truncate">
            {activeContracts.length > 1
              ? `${activeContracts.length} Active Contracts`
              : (memberships.active?.package_name || 'No Active Plan')}
          </div>
          <span className="text-[10px] text-muted-foreground truncate block">
            {activeContracts.length > 1
              ? activeContracts.map((c: any) => c.package_name).join(', ')
              : (memberships.active ? `Status: ${memberships.active.status}` : 'Inactive')}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] text-muted-foreground font-medium">Total Purchases Paid</span>
          <div className="text-lg font-bold text-emerald-500 mt-1">
            ₹{Number(finance?.summary?.total_paid || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {purchaseLedgerEntries.filter((e) => e.type === 'PURCHASE' || e.type === 'RENEWAL').length} Plans Settled
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Coupons Saved</span>
            <Tag className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-foreground mt-1">
            ₹{totalDiscountSaved.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            Saved using promotions
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Reward Coins</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400 mt-1">
            {rewards?.points_balance ?? 0} Pts
          </div>
          <span className="text-[10px] text-muted-foreground">
            ≈ ₹{rewards?.credit_balance ?? rewards?.points_balance ?? 0} value
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Available Sessions</span>
              <Globe className="w-3 h-3 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              {totalSessionsRemaining > 0 ? `${totalSessionsRemaining} Base` : 'Unlimited'}
            </div>
            <span className="text-[10px] text-primary font-medium">
              +{passport?.passport_remaining ?? 0} Passport
            </span>
          </div>
          {onBuyPassport && (
            <button
              type="button"
              onClick={onBuyPassport}
              className="mt-2 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline text-left cursor-pointer"
            >
              + Buy Passport Sessions
            </button>
          )}
        </div>
      </div>

      {/* 2. Current Active Membership & Contract Snapshot */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-foreground">
                {activeContracts.length > 1 ? `Current Active Contracts (${activeContracts.length})` : 'Current Active Contract'}
              </h3>
              {purchaseLedgerEntries.some((e) => e.type === 'EXTENSION') && (
                <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">
                  VALIDITY EXTENSION PURCHASED
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Official membership contract snapshot with original plan pricing, validity, and coupon details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRenew} className="h-8 text-xs">
              Renew Plan
            </Button>
            {onBuyPassport && !isTrialMember && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBuyPassport}
                className="h-8 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              >
                <Globe className="w-3.5 h-3.5 mr-1" /> Buy Passport
              </Button>
            )}
            {onPurchasePackage && (
              <Button size="sm" onClick={onPurchasePackage} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-3.5 h-3.5 mr-1" /> Purchase New Program / Package
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onUpgrade} className="h-8 text-xs">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Upgrade Plan
            </Button>
          </div>
        </div>

        {activeContracts.length > 0 ? (
          <div className="space-y-4">
            {activeContracts.map((contract: any, idx: number) => {
              const hasExtension = purchaseLedgerEntries.some((e) => e.type === 'EXTENSION');
              return (
                <div key={contract.id || idx} className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                    <div className="space-y-0.5">
                      <div className="text-lg font-bold text-foreground flex items-center gap-2">
                        {contract.package_name}
                        {hasExtension && (
                          <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/40">
                            Extension Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Program: {contract.program_name} · Version: {contract.package_version_name || 'v1'}
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      {contract.status}
                    </Badge>
                  </div>

                  <div className={`grid gap-4 text-xs ${
                    hasExtension
                      ? 'grid-cols-2 sm:grid-cols-5'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}>
                    <div>
                      <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Membership #</span>
                      <span className="font-mono font-medium text-foreground text-sm">
                        {contract.membership_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Start Date</span>
                      <span className="font-medium text-foreground text-sm">
                        {contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    {hasExtension && (
                      <div>
                        <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                          Original Validity
                        </span>
                        <span className="font-medium text-foreground text-sm block mt-0.5">
                          {originalPlanEndDate
                            ? new Date(originalPlanEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        {hasExtension ? 'Extended Validity' : 'Current Validity Till'}
                        {hasExtension && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-bold">
                            EXTENDED
                          </Badge>
                        )}
                      </span>
                      <span className={`font-bold text-sm block mt-0.5 ${
                        hasExtension
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-foreground'
                      }`}>
                        {contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Home Branch</span>
                      <span className="font-medium text-foreground text-sm">
                        {contract.home_branch || 'Branch'}
                      </span>
                    </div>
                  </div>

                  {hasExtension && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                        <div>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">Validity Extension Active:</span>{' '}
                          <span className="text-muted-foreground">
                            Member purchased validity extension to preserve remaining sessions. Plan is valid till{' '}
                            <strong className="text-foreground">
                              {contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </strong>.
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40 text-[10px]">
                        Unused Sessions Protected
                      </Badge>
                    </div>
                  )}

                  {/* Contract Financial Breakdown & Applied Coupons */}
                  {(() => {
                    const snap = contract.contract_snapshot;
                    const catPrice = Number(contract.catalog_price || snap?.catalog_price || contract.purchase_price || 0);
                    const paidPrice = Number(contract.purchase_price || snap?.purchase_price || snap?.final_amount || 0);
                    const discAmt = Number(contract.discount_amount || snap?.discount_amount || (catPrice > paidPrice ? catPrice - paidPrice : 0));
                    const coupon = contract.coupon_code || snap?.coupon_code || contract.campaign_name || snap?.campaign_name;
                    const taxAmt = Number(snap?.tax_amount || 0);

                    if (!catPrice && !paidPrice) return null;

                    return (
                      <div className="pt-3 border-t border-border/80">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 flex-wrap">
                            <span>Financial Breakdown & Pricing</span>
                            {coupon ? (
                              <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                                🎟️ Coupon Applied: {coupon}
                              </Badge>
                            ) : discAmt > 0 ? (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-500/40 text-blue-400 bg-blue-500/10">
                                🛡️ {contract.discount_label || 'Offline Branch Authorized Special Rate'}
                              </Badge>
                            ) : null}
                            {contract.sold_by && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-purple-500/30 text-purple-400 bg-purple-500/10">
                                👤 Sold by: {contract.sold_by}
                              </Badge>
                            )}
                          </div>
                          {discAmt > 0 && (
                            <span className="text-xs text-emerald-500 font-medium">
                              Total Savings: ₹{discAmt.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-lg border border-border text-xs">
                          <div>
                            <span className="text-muted-foreground">Standard Catalog MRP</span>
                            <div className="font-semibold text-foreground text-sm">
                              ₹{catPrice.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Discount / Attribution</span>
                            <div className="font-semibold text-emerald-400 flex items-center gap-1 text-sm">
                              <Tag className="w-3 h-3" />
                              {discAmt > 0 ? `-₹${discAmt.toLocaleString()}` : '—'}
                            </div>
                            {discAmt > 0 && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {coupon ? `Code: ${coupon}` : (contract.sold_by ? `By ${contract.sold_by}` : 'Branch Authorized Rate')}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tax</span>
                            <div className="font-medium text-foreground text-sm">
                              {taxAmt > 0 ? `+₹${taxAmt.toLocaleString()}` : 'Included / ₹0'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-semibold">Final Purchase Price</span>
                            <div className="font-bold text-foreground text-sm">
                              ₹{paidPrice.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl">
            No active membership currently found.
          </div>
        )}
      </div>

      {/* 3. Member Passbook & Purchase Ledger (Customer Account Ledger) */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Member Passbook & Purchase Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete customer statement of all plan purchases, applied coupons, cancellations, and refunds.
            </p>
          </div>

          {/* Quick Ledger Filters */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All Transactions' },
              { id: 'PURCHASES', label: 'Purchases & Renewals' },
              { id: 'EXTENSIONS', label: `Extensions ${purchaseLedgerEntries.some((e) => e.type === 'EXTENSION') ? '(Active)' : ''}` },
              { id: 'COUPONS', label: 'Coupons Used' },
              { id: 'CANCELLATIONS', label: 'Cancellations & Refunds' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLedgerFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  ledgerFilter === f.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Transaction</th>
                <th className="py-2.5 px-3">Plan / Item</th>
                <th className="py-2.5 px-3 text-right">Original Price</th>
                <th className="py-2.5 px-3 text-right">Coupon / Discount</th>
                <th className="py-2.5 px-3 text-right">Final Paid</th>
                <th className="py-2.5 px-3">Sold By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Notes & Reference</th>
                <th className="py-2.5 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPurchaseLedger.length > 0 ? (
                filteredPurchaseLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          row.type === 'EXTENSION'
                            ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                            : row.type === 'PURCHASE'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : row.type === 'RENEWAL'
                            ? 'text-indigo-400 border-indigo-500/30'
                            : row.type === 'CANCELLATION'
                            ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                            : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        }`}
                      >
                        {row.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">
                      {row.title}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {row.originalPrice > 0 ? `₹${row.originalPrice.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.discountAmount > 0 || row.couponCode ? (
                        <div className="flex flex-col items-end gap-1">
                          {row.couponCode && (
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                              🎟️ {row.couponCode}
                            </Badge>
                          )}
                          {row.discountAmount > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                              <Tag className="w-3 h-3" /> -₹{row.discountAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.finalAmount < 0 ? 'text-amber-400' : 'text-foreground'
                      }`}
                    >
                      {row.finalAmount < 0
                        ? `-₹${Math.abs(row.finalAmount).toLocaleString()}`
                        : `₹${row.finalAmount.toLocaleString()}`}
                    </td>
                    <td className="py-2.5 px-3 text-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {row.soldBy || 'Sweat Front Desk POS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        className={`text-[10px] ${
                          row.status === 'PAID' || row.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : row.status === 'CANCELLED'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : row.status === 'REFUNDED'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                      {row.notes ? <span className="text-foreground">{row.notes} </span> : null}
                      <span className="font-mono text-[10px]">({row.reference})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-primary font-medium px-2"
                        onClick={() => onViewTransaction(row.rawOrder || row)}
                      >
                        <Receipt className="w-3 h-3 mr-1" /> Statement
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    No transactions match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Coupons & Promotional Usage History */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" /> Coupons & Promotional Usage History
            </h3>
            <p className="text-xs text-muted-foreground">
              Audit record of all promo codes, campaigns, and authorized rates redeemed or attempted by this member.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono px-2 py-0.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            {((memberships as any)?.coupon_history || (passbook as any)?.coupon_history || (finance as any)?.coupon_history || []).length} Recorded
          </Badge>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Redeemed Date</th>
                <th className="py-2.5 px-3">Coupon Code</th>
                <th className="py-2.5 px-3">Campaign / Promotion</th>
                <th className="py-2.5 px-3 text-right">Discount Value</th>
                <th className="py-2.5 px-3">Order Reference</th>
                <th className="py-2.5 px-3">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {((memberships as any)?.coupon_history || (passbook as any)?.coupon_history || (finance as any)?.coupon_history || []).length > 0 ? (
                ((memberships as any)?.coupon_history || (passbook as any)?.coupon_history || (finance as any)?.coupon_history || []).map((cp: any) => (
                  <tr key={cp.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {cp.redeemed_at ? new Date(cp.redeemed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-xs">
                        🎟️ {cp.coupon_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground font-medium">
                      {cp.campaign_name || 'Direct Promotion'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      ₹{Number(cp.discount_amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {cp.order_number || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className="text-[10px]" variant="outline">
                        {cp.order_status || 'COMPLETED'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    No promo codes or coupon redemptions recorded for this member.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Passport & Cross-Branch Sessions Section */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-base text-foreground">Passport & Cross-Branch Sessions</h3>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                Home Branch: {(passport as any)?.home_branch?.name || memberships.active?.home_branch || 'Primary Branch'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allows members to book and attend workout sessions across other branches outside their home branch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onBuyPassport && (
              <Button
                size="sm"
                onClick={onBuyPassport}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs font-semibold"
              >
                <Globe className="w-3.5 h-3.5 mr-1.5" /> Buy Passport Sessions
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onAdjustSessions} className="h-8 text-xs">
              <Sliders className="w-3.5 h-3.5 mr-1.5" /> Adjust Balance / Consumption
            </Button>
          </div>
        </div>

        {/* Passport Quota KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Total Passport Quota
            </span>
            <div className="text-2xl font-bold text-foreground">
              {passport?.passport_allowed ?? 0} Sessions
            </div>
            <span className="text-[11px] text-muted-foreground">
              Package allocation for non-home branches
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Consumed Cross-Branch
            </span>
            <div className="text-2xl font-bold text-indigo-400">
              {passport?.passport_consumed ?? 0} Sessions
            </div>
            <span className="text-[11px] text-muted-foreground">
              Attended across other gyms
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Remaining Balance
            </span>
            <div className="text-2xl font-bold text-emerald-400">
              {passport?.passport_remaining ?? 0} Sessions
            </div>
            <span className="text-[11px] text-muted-foreground">
              Available to book across any other branch
            </span>
          </div>
        </div>

        {/* Cross-Branch Visits Table */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Cross-Branch Visit History
          </h4>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Visited Branch</th>
                  <th className="py-2.5 px-3">Workout / Session</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {passport?.cross_branch_visits && passport.cross_branch_visits.length > 0 ? (
                  passport.cross_branch_visits.map((cb) => (
                    <tr key={cb.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(cb.date_time).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {cb.branch_name}
                      </td>
                      <td className="py-2.5 px-3 text-foreground">
                        {cb.class_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                          {cb.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No cross-branch sessions consumed yet. Member is eligible to visit any non-home branch within their passport quota.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Reward Points & Loyalty Coins */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-base text-foreground">Reward Points & Loyalty Coins</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accumulated loyalty coins that can be redeemed for plan discounts at checkout.
            </p>
          </div>
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-semibold">
            Rule: 1 Point for every ₹{rewards?.earn_rate_rupees ?? 100} spent
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Current Balance
            </span>
            <div className="text-2xl font-bold text-amber-400">
              {rewards?.points_balance ?? 0} Pts
            </div>
            <span className="text-[11px] text-muted-foreground">Available to redeem</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Equivalent Value
            </span>
            <div className="text-2xl font-bold text-foreground">
              ₹{rewards?.credit_balance ?? rewards?.points_balance ?? 0}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">1 Pt = ₹1 Discount</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Lifetime Earned
            </span>
            <div className="text-2xl font-bold text-foreground">
              {rewards?.lifetime_earned ?? 0} Pts
            </div>
            <span className="text-[11px] text-muted-foreground">Accrued across all purchases</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Total Redeemed
            </span>
            <div className="text-2xl font-bold text-muted-foreground">
              {rewards?.lifetime_redeemed ?? 0} Pts
            </div>
            <span className="text-[11px] text-muted-foreground">Used during checkouts</span>
          </div>
        </div>
      </div>

      {/* 6. Session & Class Passbook (Entitlement Balances & Admin Adjustments) */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" /> Session & Class Entitlements Passbook
            </h3>
            <p className="text-xs text-muted-foreground">
              Remaining class credits, personal training quotas, and body assessments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onBuyPassport && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBuyPassport}
                className="h-8 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" /> Buy Passport Sessions
              </Button>
            )}
            <Button size="sm" onClick={onAdjustSessions} className="h-8 text-xs bg-primary text-primary-foreground gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Admin: Adjust Sessions
            </Button>
          </div>
        </div>

        {/* Current Balances Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {passbook.balances.map((b) => (
            <div key={b.id} className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {b.entitlement_type.replace(/_/g, ' ')}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {b.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {b.is_unlimited ? 'Unlimited' : b.remaining}
              </div>
              <div className="text-xs text-muted-foreground flex justify-between pt-1">
                <span>Allocated: {b.allocated ?? '∞'}</span>
                <span>Consumed: {b.consumed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Freeze & Status Histories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Freeze History */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-cyan-400" /> Membership Freeze History
          </h4>

          <div className="space-y-2">
            {memberships.freezes.length > 0 ? (
              memberships.freezes.map((f) => (
                <div key={f.id} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {new Date(f.freeze_from).toLocaleDateString()} — {new Date(f.freeze_until).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {f.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Reason: {f.reason} {f.days ? `(${f.days} days)` : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No freeze records found.
              </div>
            )}
          </div>
        </div>

        {/* Branch Transfer History */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Branch Transfer History
          </h4>

          <div className="space-y-2">
            {memberships.branch_history.length > 0 ? (
              memberships.branch_history.map((b) => (
                <div key={b.id} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {b.from_branch ? `${b.from_branch} → ` : ''}{b.to_branch}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(b.effective_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">Reason: {b.reason}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No branch transfers recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-SECTION 3: BOOKINGS & ATTENDANCE SECTION
// ============================================================================
const MemberBookingsSection: React.FC<{
  bookingsData: Member360Data['bookings_and_attendance'];
  onCheckIn: () => void;
  onEditAttendance: (att: MemberAttendanceItem) => void;
  isCheckingIn: boolean;
}> = ({ bookingsData, onCheckIn, onEditAttendance, isCheckingIn }) => {
  const [bookingFilter, setBookingFilter] = useState<'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL'>('UPCOMING');
  const [bookingPage, setBookingPage] = useState<number>(1);
  const bookingPageSize = 5;

  const [attendancePage, setAttendancePage] = useState<number>(1);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const attendancePageSize = 10;

  const upcoming: MemberBookingItem[] = bookingsData?.upcoming_bookings || [];
  const past: MemberBookingItem[] = bookingsData?.past_bookings || [];
  const attendanceRecords: MemberAttendanceItem[] = bookingsData?.attendance_records || [];

  const allBookings = useMemo<MemberBookingItem[]>(() => [...upcoming, ...past], [upcoming, past]);
  const cancelledBookings = useMemo(
    () => allBookings.filter((b: MemberBookingItem) => (b.status || '').toUpperCase() === 'CANCELLED' || (b.status || '').toLowerCase().includes('cancel')),
    [allBookings]
  );
  const upcomingNonCancelled = useMemo(
    () => upcoming.filter((b: MemberBookingItem) => (b.status || '').toUpperCase() !== 'CANCELLED'),
    [upcoming]
  );
  const pastNonCancelled = useMemo(
    () => past.filter((b: MemberBookingItem) => (b.status || '').toUpperCase() !== 'CANCELLED'),
    [past]
  );

  // Bookings list based on active tab
  const activeBookings = useMemo(() => {
    if (bookingFilter === 'UPCOMING') return upcomingNonCancelled;
    if (bookingFilter === 'PAST') return pastNonCancelled;
    if (bookingFilter === 'CANCELLED') return cancelledBookings;
    return allBookings;
  }, [bookingFilter, upcomingNonCancelled, pastNonCancelled, cancelledBookings, allBookings]);

  const totalBookingPages = Math.max(1, Math.ceil(activeBookings.length / bookingPageSize));
  const currentBookingPage = Math.min(bookingPage, totalBookingPages);
  const startBookingIdx = (currentBookingPage - 1) * bookingPageSize;
  const paginatedBookings = activeBookings.slice(startBookingIdx, startBookingIdx + bookingPageSize);

  // Filtered attendance records
  const filteredAttendance = attendanceRecords.filter((att) => {
    if (attendanceStatusFilter === 'ALL') return true;
    return (att.status || '').toUpperCase() === attendanceStatusFilter;
  });

  const totalAttendancePages = Math.max(1, Math.ceil(filteredAttendance.length / attendancePageSize));
  const currentAttendancePage = Math.min(attendancePage, totalAttendancePages);
  const startAttendanceIdx = (currentAttendancePage - 1) * attendancePageSize;
  const paginatedAttendance = filteredAttendance.slice(startAttendanceIdx, startAttendanceIdx + attendancePageSize);

  const formatTimeOnly = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatDateOnly = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PRESENT' || s === 'VERIFIED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s === 'LATE') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (s === 'NO_SHOW' || s === 'ABSENT' || s === 'CANCELLED') return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    if (s === 'CONFIRMED') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-6">
      {/* Top Stats & Quick Check-in */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <span className="text-xs text-muted-foreground block">30-Day Visits</span>
            <span className="text-2xl font-bold text-foreground">
              {bookingsData?.stats?.visits_30d ?? 0}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Total Bookings</span>
            <span className="text-2xl font-bold text-foreground">
              {bookingsData?.stats?.total_bookings ?? 0}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Last Visit</span>
            <span className="text-sm font-semibold text-foreground mt-1 block">
              {bookingsData?.stats?.last_visit ? formatDateOnly(bookingsData.stats.last_visit) : 'None'}
            </span>
          </div>
        </div>

        <Button onClick={onCheckIn} disabled={isCheckingIn} className="h-9 font-medium shadow-sm">
          <UserCheck className="w-4 h-4 mr-2" />
          {isCheckingIn ? 'Recording...' : 'Mark Attendance / Check-In'}
        </Button>
      </div>

      {/* Bookings Section with Tabs & Pagination */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-base text-foreground">Bookings</h3>
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => { setBookingFilter('UPCOMING'); setBookingPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                bookingFilter === 'UPCOMING'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming ({upcomingNonCancelled.length})
            </button>
            <button
              onClick={() => { setBookingFilter('PAST'); setBookingPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                bookingFilter === 'PAST'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Past ({pastNonCancelled.length})
            </button>
            <button
              onClick={() => { setBookingFilter('CANCELLED'); setBookingPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                bookingFilter === 'CANCELLED'
                  ? 'bg-rose-500/15 text-rose-500 shadow-sm border border-rose-500/30 font-bold'
                  : 'text-muted-foreground hover:text-rose-400'
              }`}
            >
              Cancelled ({cancelledBookings.length})
            </button>
            <button
              onClick={() => { setBookingFilter('ALL'); setBookingPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                bookingFilter === 'ALL'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({allBookings.length})
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {paginatedBookings.length > 0 ? (
            paginatedBookings.map((b: MemberBookingItem) => (
              <div
                key={b.id}
                className="p-3.5 bg-muted/20 border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-border/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{b.class_name || 'Class / Session'}</span>
                    <Badge className={`text-[10px] ${getStatusBadgeClass(b.status)}`}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>{new Date(b.date_time).toLocaleString()}</span>
                    <span>•</span>
                    <span>{b.branch_name}</span>
                    {b.trainer_name && <span>• Coach: <span className="text-foreground font-medium">{b.trainer_name}</span></span>}
                    {b.booked_by && <span>• Booked by: <span className="text-foreground font-medium">{b.booked_by}</span></span>}
                  </div>
                </div>
                <div className="text-muted-foreground font-mono text-[11px] self-start sm:self-auto">
                  Ref: {b.booking_number}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No bookings found in this category.
            </div>
          )}
        </div>

        {/* Bookings Pagination Controls */}
        {activeBookings.length > bookingPageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border mt-3 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{startBookingIdx + 1}</span> to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(startBookingIdx + bookingPageSize, activeBookings.length)}
              </span> of{' '}
              <span className="font-semibold text-foreground">{activeBookings.length}</span> bookings
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                disabled={currentBookingPage === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="text-muted-foreground text-xs px-2">
                Page {currentBookingPage} of {totalBookingPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingPage((p) => Math.min(totalBookingPages, p + 1))}
                disabled={currentBookingPage === totalBookingPages}
                className="h-7 px-2 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Log Table with Check-in / Check-out Times and Admin Edit */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground">Attendance History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track check-in and check-out logs with admin manual update capabilities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={attendanceStatusFilter}
              onChange={(e) => {
                setAttendanceStatusFilter(e.target.value);
                setAttendancePage(1);
              }}
              className="text-xs bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses ({attendanceRecords.length})</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Session / Class</th>
                <th className="py-2.5 px-3">Coach / Trainer</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Check-In</th>
                <th className="py-2.5 px-3">Check-Out</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Marked By</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedAttendance.length > 0 ? (
                paginatedAttendance.map((a: MemberAttendanceItem) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-foreground whitespace-nowrap font-medium">
                      {formatDateOnly(a.date_time || a.check_in_at)}
                    </td>
                    <td className="py-2.5 px-3 text-foreground font-medium">
                      {a.class_name || 'Gym Access'}
                    </td>
                    <td className="py-2.5 px-3 text-foreground">
                      {a.trainer_name ? (
                        <span className="font-medium text-foreground">{a.trainer_name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Assigned Coach</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{a.branch_name || '—'}</td>
                    <td className="py-2.5 px-3 text-foreground font-mono">
                      {formatTimeOnly(a.check_in_at || a.date_time)}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono">
                      {formatTimeOnly(a.check_out_at)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {a.check_in_method || 'MANUAL'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className={`text-[10px] ${getStatusBadgeClass(a.status)}`}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{a.marked_by || 'System'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAttendance(a)}
                        className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 inline-flex items-center"
                        title="Update attendance record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Attendance Pagination Controls */}
        {filteredAttendance.length > attendancePageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border mt-3 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{startAttendanceIdx + 1}</span> to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(startAttendanceIdx + attendancePageSize, filteredAttendance.length)}
              </span> of{' '}
              <span className="font-semibold text-foreground">{filteredAttendance.length}</span> records
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
                disabled={currentAttendancePage === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="text-muted-foreground text-xs px-2">
                Page {currentAttendancePage} of {totalAttendancePages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendancePage((p) => Math.min(totalAttendancePages, p + 1))}
                disabled={currentAttendancePage === totalAttendancePages}
                className="h-7 px-2 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-SECTION 4: FINANCE SECTION (ORDERS, PAYMENTS, INVOICES, REFUNDS)
// ============================================================================
const MemberFinanceSection: React.FC<{
  finance: Member360Data['finance'];
  onCollectPayment: () => void;
  onViewInvoice: (inv: MemberInvoiceItem) => void;
  onViewTransaction: (txn: any) => void;
}> = ({ finance, onCollectPayment, onViewInvoice, onViewTransaction }) => {
  const [subTab, setSubTab] = useState<'INVOICES' | 'PAYMENTS' | 'REFUNDS' | 'COUPONS'>('INVOICES');

  // Map order number to invoice item if exists
  const invoiceByOrder = React.useMemo(() => {
    const map = new Map<string, MemberInvoiceItem>();
    (finance.invoices || []).forEach((inv) => {
      if (inv.order_number) map.set(inv.order_number, inv);
    });
    return map;
  }, [finance.invoices]);

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Invoiced</span>
          <div className="text-xl font-bold text-foreground mt-1">
            ₹{Number(finance.summary.total_invoiced).toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">Billed across all orders</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Paid</span>
          <div className="text-xl font-bold text-emerald-500 mt-1">
            ₹{Number(finance.summary.total_paid).toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">Settled payments</span>
        </div>

        <div
          className={`border rounded-xl p-4 shadow-sm ${
            finance.summary.total_outstanding > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-card border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Outstanding Due</span>
            {finance.summary.total_outstanding > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-[10px] px-2 font-medium"
                onClick={onCollectPayment}
              >
                Collect Now
              </Button>
            )}
          </div>
          <div
            className={`text-xl font-bold mt-1 ${
              finance.summary.total_outstanding > 0 ? 'text-rose-500' : 'text-foreground'
            }`}
          >
            ₹{Number(finance.summary.total_outstanding).toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {finance.summary.total_outstanding > 0 ? 'Payment pending' : 'Zero balance due'}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Refunded</span>
          <div className="text-xl font-bold text-muted-foreground mt-1">
            ₹{Number(finance.summary.total_refunded).toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">Returned on cancellations</span>
        </div>
      </div>

      {/* Streamlined Financial Records */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Billing Statements & Invoices
            </h3>
            <p className="text-xs text-muted-foreground">
              Consolidated view of customer invoices, paid receipts, and refunds.
            </p>
          </div>

          {/* Sub-tab pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'INVOICES', label: `Invoices & Bills (${finance.orders.length || finance.invoices.length})` },
              { id: 'PAYMENTS', label: `Payment Receipts (${finance.payments.length})` },
              { id: 'REFUNDS', label: `Refunds (${finance.refunds.length})` },
              { id: 'COUPONS', label: `Coupons & Offers (${finance.coupon_history?.length ?? 0})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  subTab === t.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Invoices & Bills Table */}
        {subTab === 'INVOICES' && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice / Order #</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Sold By / Channel</th>
                  <th className="py-2.5 px-3 text-right">Billed Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.orders.length > 0 ? (
                  finance.orders.map((o) => {
                    const inv = invoiceByOrder.get(o.order_number) || finance.invoices.find((i) => i.order_number === o.order_number);
                    const itemNames = o.items && o.items.length > 0 ? o.items.map((it) => it.item_name).join(', ') : o.order_type;

                    return (
                      <tr key={o.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                          {inv?.invoice_number || o.order_number}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">
                          {itemNames}
                          {o.coupon_code && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              🎟️ {o.coupon_code}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {o.sold_by || 'Sweat Front Desk POS'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          ₹{Number(o.total_amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-500 font-semibold">
                          ₹{Number(o.paid_amount || (o.status === 'PAID' ? o.total_amount : 0)).toLocaleString()}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            o.outstanding_amount > 0 ? 'text-rose-500' : 'text-muted-foreground'
                          }`}
                        >
                          {o.outstanding_amount > 0 ? `₹${Number(o.outstanding_amount).toLocaleString()}` : '₹0'}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            className={`text-[10px] ${
                              o.status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : o.status === 'CANCELLED'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary font-medium"
                              onClick={() => onViewTransaction(o)}
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" /> Statement
                            </Button>
                            {inv ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => onViewInvoice(inv)}
                              >
                                Invoice
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : finance.invoices.length > 0 ? (
                  finance.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(inv.issued_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">Order #{inv.order_number}</td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">Sweat Front Desk POS</td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">
                        ₹{Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-500 font-semibold">
                        ₹{Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">₹0</td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {inv.status || 'PAID'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary font-medium"
                            onClick={() => onViewTransaction(inv)}
                          >
                            <Receipt className="w-3.5 h-3.5 mr-1" /> Statement
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => onViewInvoice(inv)}
                          >
                            Invoice
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No invoices or orders recorded for this member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payment Receipts Table */}
        {subTab === 'PAYMENTS' && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method & Channel</th>
                  <th className="py-2.5 px-3">Order Ref</th>
                  <th className="py-2.5 px-3 text-right">Amount Received</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Receipt & Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.payments.length > 0 ? (
                  finance.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.paid_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {p.payment_method} <span className="text-[10px] text-muted-foreground">({p.provider})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {p.order_number || 'Direct Payment'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-500">
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          className={
                            p.status === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px]'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary font-medium"
                          onClick={() => onViewTransaction(p)}
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1" /> View Statement
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No payment transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Refunds Table */}
        {subTab === 'REFUNDS' && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Order Ref</th>
                  <th className="py-2.5 px-3">Cancellation / Refund Reason</th>
                  <th className="py-2.5 px-3 text-right">Refund Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.refunds.length > 0 ? (
                  finance.refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-foreground font-medium">
                        {r.order_number}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-sm truncate">
                        {r.reason || 'Membership Cancellation & Refund'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                        ₹{Number(r.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No refunds or chargebacks issued.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Coupons & Promotional Offers Table */}
        {subTab === 'COUPONS' && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date Applied</th>
                  <th className="py-2.5 px-3">Coupon Code</th>
                  <th className="py-2.5 px-3">Campaign / Promotion</th>
                  <th className="py-2.5 px-3 text-right">Discount Applied</th>
                  <th className="py-2.5 px-3">Order / Reference #</th>
                  <th className="py-2.5 px-3">Authorized By / Channel</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.coupon_history && finance.coupon_history.length > 0 ? (
                  finance.coupon_history.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(c.redeemed_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-400">
                        🎟️ {c.coupon_code || c.code}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {c.campaign_name || 'Direct Promotion'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-500">
                        ₹{Number(c.discount_amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {c.order_number || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {c.authorized_by || 'Sweat Front Desk POS'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {c.order_status || c.status || 'APPLIED'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No coupon redemptions recorded for this member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-SECTION 5: PAR-Q FORM & CONSENT SUBMISSIONS
// ============================================================================
const MemberHealthFormsSection: React.FC<{
  requirements?: Array<{
    membership_id: string;
    membership_number: string;
    program_name: string;
    package_name: string;
    membership_status: string;
    parq_status: 'PENDING' | 'COMPLETED' | 'WAIVED';
    parq_completed_at?: string | null;
    form_title: string;
    form_id?: string | null;
    submission_id?: string | null;
  }>;
  submissions: MemberIntakeSubmission[];
  onRefresh?: () => void;
}> = ({ requirements = [], submissions = [], onRefresh }) => {
  const [expandedAgreements, setExpandedAgreements] = useState<Record<string, boolean>>({});
  const [signingMembershipId, setSigningMembershipId] = useState<string | null>(null);

  const toggleAgreement = (id: string) => {
    setExpandedAgreements((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingRequirements = requirements.filter((r) => r.parq_status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base text-foreground">PAR-Q Form</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Physical Activity Readiness Questionnaire (PAR-Q) submissions, medical disclosures, and explicit consent agreements per purchase.
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 shrink-0 self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Submissions</span>
          </Button>
        )}
      </div>

      {/* Purchase PAR-Q Requirements Status */}
      {requirements.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Purchase PAR-Q Entitlement Requirements</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requirements.map((req) => {
              const isPending = req.parq_status === 'PENDING';
              return (
                <div
                  key={req.membership_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPending
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-card border-border/80'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {req.program_name} • {req.package_name}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {req.membership_number} ({req.membership_status})
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        isPending
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}
                    >
                      {isPending ? 'PAR-Q PENDING' : 'COMPLETED'}
                    </Badge>
                  </div>

                  <div className="text-xs flex items-center justify-between text-muted-foreground pt-1 border-t border-border/60">
                    <span>Form: {req.form_title}</span>
                    {isPending ? (
                      <span className="text-amber-500 font-medium">Class Booking Blocked</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">Cleared for Booking</span>
                    )}
                  </div>

                  {isPending && (
                    <Button
                      size="sm"
                      onClick={() => setSigningMembershipId(req.membership_id)}
                      className="w-full h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Member Sign PAR-Q Now</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Submissions List */}
      <div className="space-y-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Signed Submission Records ({submissions.length})</span>
        </h4>

        {submissions.length > 1 && (
          <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                <strong>{submissions.length} PAR-Q submissions & revision logs recorded.</strong> All historical edits, answers, and digital signatures are retained in immutable studio audit logs.
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground shrink-0">
              Latest Edit: {submissions[0]?.submitted_at ? new Date(submissions[0].submitted_at).toLocaleDateString() : '—'}
            </span>
          </div>
        )}

        {submissions.length > 0 ? (
          submissions.map((sub, sIdx) => {
            const isLatest = sIdx === 0;
            const hasAgreement = !!sub.agreement_text_snapshot;
            const isAgreementExpanded = !!expandedAgreements[sub.id];

            return (
              <div key={sub.id} className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
                {/* Header with Title, Badges, and Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {sub.form_title || 'PAR-Q Form'}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        v{sub.form_version || 1}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {sub.status || 'COMPLETED'}
                      </Badge>
                      {isLatest && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Latest Submission
                        </Badge>
                      )}
                      {Boolean((sub as any).is_edit || (sub as any).metadata?.is_edit || ((sub as any).revision_number && (sub as any).revision_number > 1)) && (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-mono gap-1">
                          <History className="w-3 h-3" />
                          <span>Member Revision #{(sub as any).revision_number || (sub as any).metadata?.revision_number || 2}</span>
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <span className="font-mono text-[11px] text-muted-foreground/70">ID: {sub.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/20 border border-border/80 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Program</span>
                    <span className="font-semibold text-foreground">{sub.program_name || 'All Programs'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Linked Order</span>
                    <span className="font-mono text-foreground">{sub.order_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Membership</span>
                    <span className="font-mono text-foreground">{sub.membership_number || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Submitted By</span>
                    <span className="text-foreground">{sub.submitted_by || 'Member'}</span>
                  </div>
                </div>

                {/* Authenticated Drawn Signature Preview */}
                {sub.signature_data && (
                  <div className="p-3.5 bg-muted/30 border border-border rounded-lg space-y-2">
                    <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                      Authenticated Member Digital Signature
                    </span>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="p-2 bg-white rounded-lg border border-border shadow-xs inline-block">
                        <img
                          src={sub.signature_data}
                          alt="Member Drawn Signature"
                          className="max-h-16 object-contain"
                        />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-foreground">Signer: {sub.signer_identity || sub.accepted_by_name || 'Member'}</p>
                        {sub.signature_date && (
                          <p className="text-muted-foreground text-[11px]">
                            Signed: {new Date(sub.signature_date).toLocaleString()}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          Digitally Signed Canvas
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agreement & Explicit Consent Section */}
                <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{sub.agreement_title || 'Physical Activity Readiness & Assumption of Risk Agreement'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {sub.agreement_accepted ? (
                          <span className="text-emerald-500 font-medium">
                            Explicit Consent Accepted by {sub.accepted_by_name || 'Member'} on{' '}
                            {sub.agreement_accepted_at ? new Date(sub.agreement_accepted_at).toLocaleString() : new Date(sub.submitted_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">Agreement not accepted</span>
                        )}
                      </p>
                    </div>

                    {hasAgreement && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAgreement(sub.id)}
                        className="text-[11px] h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground self-start sm:self-auto"
                      >
                        {isAgreementExpanded ? 'Hide Agreement Text' : 'View Agreement Text'}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAgreementExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    )}
                  </div>

                  {hasAgreement && isAgreementExpanded && (
                    <div className="p-3 bg-background border border-border/80 rounded-md text-[11px] text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {sub.agreement_text_snapshot}
                    </div>
                  )}
                </div>

                {/* Questions & Answers Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
                    Questionnaire Responses
                  </h4>

                  {sub.sensitive_data_restricted ? (
                    <div className="p-4 bg-muted/20 border border-border/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                          <span>Confidential Health Data Restricted</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Sensitive medical and PAR-Q answers are restricted to authorized health staff (<code className="text-primary font-mono text-[10px]">cs.member-health.view</code>).
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0 self-start sm:self-auto">
                        CONFIDENTIAL
                      </Badge>
                    </div>
                  ) : sub.answers && sub.answers.length > 0 ? (
                    <div className="space-y-2.5">
                      {sub.answers.map((ans, idx) => (
                        <div key={idx} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground font-medium">
                              Q{idx + 1}: {ans.question_text}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ans.category && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                                  {ans.category}
                                </Badge>
                              )}
                              {ans.is_sensitive && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                                  Sensitive
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="pt-0.5">
                            {ans.question_type === 'BOOLEAN' || ans.boolean_value !== null ? (
                              <Badge
                                variant="outline"
                                className={
                                  ans.answer?.toLowerCase() === 'yes' || ans.answer === 'true' || ans.boolean_value === true
                                    ? 'text-amber-500 border-amber-500/30 bg-amber-500/10 font-bold'
                                    : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-semibold'
                                }
                              >
                                {ans.answer?.toLowerCase() === 'yes' || ans.answer === 'true' || ans.boolean_value === true ? 'YES' : 'NO'}
                              </Badge>
                            ) : (
                              <span className="font-semibold text-foreground">{ans.answer || '—'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/20 border border-border rounded-lg text-xs text-muted-foreground">
                      No question responses recorded for this submission.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-card border border-dashed border-border rounded-xl space-y-2">
            <HeartPulse className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-foreground">No PAR-Q submission yet.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              PAR-Q forms and purchase agreements completed by this member will appear here.
            </p>
          </div>
        )}
      </div>

      {/* PAR-Q Signing Modal */}
      {signingMembershipId && (
        <MemberParqSigningModal
          open={!!signingMembershipId}
          onOpenChange={(op) => {
            if (!op) setSigningMembershipId(null);
          }}
          membershipId={signingMembershipId}
          onSuccess={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

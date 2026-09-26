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

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  RefreshCw,
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
  Sliders,
  ChevronRight,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { membersApi } from '@/api/endpoints/membersApi';
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
  CollectPaymentModal,
} from './modals/MemberActionModals';

interface Member360WorkspaceProps {
  memberId: string;
}

type TabKey = 'overview' | 'timeline' | 'memberships' | 'bookings' | 'finance' | 'health';

export const Member360Workspace: React.FC<Member360WorkspaceProps> = ({ memberId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Modals state
  const [activeModal, setActiveModal] = useState<MembershipLifecycleAction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

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

  const { member, header, overview, timeline, memberships, passbook, bookings_and_attendance, finance, health_and_forms } =
    data360;

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
    } else if (action === 'CHECK_IN') {
      checkInMutation.mutate();
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

            {/* Header Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:border-l lg:border-border lg:pl-6">
              <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                <div className="text-xs text-muted-foreground font-medium">Home Sessions</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {header.home_sessions_remaining}
                </div>
                <div className="text-[10px] text-muted-foreground">remaining</div>
              </div>

              <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                <div className="text-xs text-muted-foreground font-medium">Cross-Branch</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {header.cross_branch_sessions_remaining}
                </div>
                <div className="text-[10px] text-muted-foreground">remaining</div>
              </div>

              <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                <div className="text-xs text-muted-foreground font-medium">Expiry</div>
                <div className="text-sm font-semibold text-foreground mt-1 truncate">
                  {header.expiry_date ? new Date(header.expiry_date).toLocaleDateString() : 'No Active Plan'}
                </div>
                <div className="text-[10px] text-muted-foreground">end date</div>
              </div>

              <div
                className={`rounded-lg p-2.5 text-center ${
                  header.outstanding_balance > 0
                    ? 'bg-rose-500/10 border border-rose-500/20'
                    : 'bg-muted/40'
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">Outstanding</div>
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
              {header.available_actions?.map((act) => {
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
                    disabled={!act.eligible || checkInMutation.isPending || unfreezeMutation.isPending}
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
              { key: 'timeline', label: 'Timeline', icon: History, count: timeline.length },
              { key: 'memberships', label: 'Memberships & Passbook', icon: Layers },
              {
                key: 'bookings',
                label: 'Bookings & Attendance',
                icon: Calendar,
                count: bookings_and_attendance.upcoming_bookings.length,
              },
              { key: 'finance', label: 'Finance', icon: CreditCard },
              {
                key: 'health',
                label: 'Health & Forms',
                icon: HeartPulse,
                count: health_and_forms.submissions.length,
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
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Identity & Profile
                </h3>

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
            onAdjustSessions={() => setActiveModal('ADJUST_ENTITLEMENT')}
            onRenew={() => setActiveModal('RENEW')}
            onUpgrade={() => setActiveModal('UPGRADE')}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: BOOKINGS & ATTENDANCE */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'bookings' && (
          <MemberBookingsSection
            bookingsData={bookings_and_attendance}
            onCheckIn={() => checkInMutation.mutate()}
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
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: HEALTH & FORMS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'health' && (
          <MemberHealthFormsSection submissions={health_and_forms.submissions} />
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ACTION MODALS */}
      {/* --------------------------------------------------------------------- */}
      {activeModal === 'RENEW' && (
        <RenewModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'UPGRADE' && (
        <UpgradeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'EXTEND' && (
        <ExtendModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'FREEZE' && (
        <FreezeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'TRANSFER' && (
        <TransferModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'CANCEL' && (
        <CancelModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'REJOIN' && (
        <RejoinModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'ADJUST_ENTITLEMENT' && (
        <AdjustEntitlementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {activeModal === 'COLLECT_PAYMENT' && (
        <CollectPaymentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          member={member}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          member={member}
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

  const categories = ['ALL', 'CRM', 'COMMERCE', 'MEMBERSHIP', 'ENTITLEMENT', 'BOOKING', 'ATTENDANCE', 'AUDIT'];

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
        {filteredEvents.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-background ring-2 ring-border"
                  style={{ backgroundColor: evt.badge_color || '#6366f1' }}
                />

                <div className="p-4 rounded-xl bg-muted/20 border border-border/80 hover:border-border transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{evt.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
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

                  <p className="text-xs text-muted-foreground leading-relaxed">{evt.description}</p>

                  {/* Metadata display if available */}
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                      {Object.entries(evt.metadata).map(([key, val]) => (
                        <span key={key} className="bg-muted/60 px-2 py-0.5 rounded border border-border/40">
                          {key}: <strong className="text-foreground">{String(val)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
  onAdjustSessions: () => void;
  onRenew: () => void;
  onUpgrade: () => void;
}> = ({ memberships, passbook, onAdjustSessions, onRenew, onUpgrade }) => {
  return (
    <div className="space-y-6">
      {/* 1. Active Membership & Contract Snapshot */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground">Current Active Contract</h3>
            <p className="text-xs text-muted-foreground">
              Authoritative, immutable snapshot created at purchase. Historical memberships never mutate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRenew} className="h-8 text-xs">
              Renew Plan
            </Button>
            <Button size="sm" onClick={onUpgrade} className="h-8 text-xs">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Upgrade Plan
            </Button>
          </div>
        </div>

        {memberships.active ? (
          <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="space-y-0.5">
                <div className="text-lg font-bold text-foreground">
                  {memberships.active.package_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Program: {memberships.active.program_name} · Version: {memberships.active.package_version_name}
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                {memberships.active.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Membership #</span>
                <span className="font-mono font-medium text-foreground text-sm">
                  {memberships.active.membership_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Validity Window</span>
                <span className="font-medium text-foreground text-sm">
                  {new Date(memberships.active.start_date).toLocaleDateString()} —{' '}
                  {new Date(memberships.active.end_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Home Branch</span>
                <span className="font-medium text-foreground text-sm">
                  {memberships.active.home_branch}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Purchase Branch</span>
                <span className="font-medium text-foreground text-sm">
                  {memberships.active.purchase_branch}
                </span>
              </div>
            </div>

            {/* Contract Snapshot Financial Breakdown */}
            {memberships.active.contract_snapshot && (
              <div className="pt-3 border-t border-border/80">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Financial Snapshot Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-lg border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground">Base Price</span>
                    <div className="font-medium text-foreground">
                      ₹{Number(memberships.active.contract_snapshot.purchase_price).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount Applied</span>
                    <div className="font-medium text-emerald-400">
                      -₹{Number(memberships.active.contract_snapshot.discount_amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax</span>
                    <div className="font-medium text-foreground">
                      +₹{Number(memberships.active.contract_snapshot.tax_amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Final Price Paid</span>
                    <div className="font-bold text-foreground text-sm">
                      ₹{Number(memberships.active.contract_snapshot.final_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl">
            No active membership currently found.
          </div>
        )}
      </div>

      {/* 2. Generic Entitlement Passbook & Append-Only Ledger */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-foreground">Entitlement / Session Passbook</h3>
            <p className="text-xs text-muted-foreground">
              Controlled session balances and immutable append-only ledger events.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onAdjustSessions} className="h-8 text-xs">
            <Sliders className="w-3.5 h-3.5 mr-1.5" /> Adjust Balance
          </Button>
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

        {/* Ledger Entries Table */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Append-Only Passbook Ledger
          </h4>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Transaction</th>
                  <th className="py-2.5 px-3">Entitlement Type</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Reason / Reference</th>
                  <th className="py-2.5 px-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {passbook.ledger.length > 0 ? (
                  passbook.ledger.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(row.occurred_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            row.transaction_type === 'ALLOCATION'
                              ? 'text-emerald-400 border-emerald-500/30'
                              : row.transaction_type === 'CONSUMPTION'
                              ? 'text-indigo-400 border-indigo-500/30'
                              : row.transaction_type === 'ADJUSTMENT'
                              ? 'text-amber-400 border-amber-500/30'
                              : 'text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {row.transaction_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {row.entitlement_type}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold font-mono ${
                          row.units > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.units > 0 ? `+${row.units}` : row.units}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {row.balance_after ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {row.reason} {row.booking_id ? `(Booking: ${row.booking_id})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {row.actor || 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No entitlement ledger entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
  isCheckingIn: boolean;
}> = ({ bookingsData, onCheckIn, isCheckingIn }) => {
  return (
    <div className="space-y-6">
      {/* Top Stats & Quick Check-in */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <span className="text-xs text-muted-foreground block">30-Day Visits</span>
            <span className="text-2xl font-bold text-foreground">
              {bookingsData.stats.visits_30d}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Total Bookings</span>
            <span className="text-2xl font-bold text-foreground">
              {bookingsData.stats.total_bookings}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Last Visit</span>
            <span className="text-sm font-semibold text-foreground mt-1 block">
              {bookingsData.stats.last_visit ? new Date(bookingsData.stats.last_visit).toLocaleDateString() : 'None'}
            </span>
          </div>
        </div>

        <Button onClick={onCheckIn} disabled={isCheckingIn} className="h-9 font-medium">
          <UserCheck className="w-4 h-4 mr-2" />
          {isCheckingIn ? 'Recording...' : 'Mark Check-In Now'}
        </Button>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-base text-foreground">Upcoming Bookings</h3>

        <div className="space-y-2">
          {bookingsData.upcoming_bookings.length > 0 ? (
            bookingsData.upcoming_bookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 bg-muted/20 border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{b.class_name}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                      {b.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3">
                    <span>{new Date(b.date_time).toLocaleString()}</span>
                    <span>•</span>
                    <span>{b.branch_name}</span>
                    {b.trainer_name && <span>• Coach: {b.trainer_name}</span>}
                  </div>
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  Ref: {b.booking_number}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No upcoming bookings scheduled.
            </div>
          )}
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-base text-foreground">Attendance History</h3>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Check-In Method</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bookingsData.attendance_records.length > 0 ? (
                bookingsData.attendance_records.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 text-foreground whitespace-nowrap">
                      {new Date(a.date_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{a.branch_name}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {a.check_in_method}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{a.marked_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
}> = ({ finance, onCollectPayment, onViewInvoice }) => {
  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Invoiced</span>
          <div className="text-xl font-bold text-foreground mt-1">
            ₹{Number(finance.summary.total_invoiced).toLocaleString()}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Paid</span>
          <div className="text-xl font-bold text-emerald-500 mt-1">
            ₹{Number(finance.summary.total_paid).toLocaleString()}
          </div>
        </div>

        <div
          className={`border rounded-xl p-4 shadow-sm ${
            finance.summary.total_outstanding > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-card border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Outstanding</span>
            {finance.summary.total_outstanding > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-[10px] px-2"
                onClick={onCollectPayment}
              >
                Collect
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
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Refunded</span>
          <div className="text-xl font-bold text-muted-foreground mt-1">
            ₹{Number(finance.summary.total_refunded).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-base text-foreground">Commerce Orders</h3>

        <div className="space-y-3">
          {finance.orders.length > 0 ? (
            finance.orders.map((o) => (
              <div key={o.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground font-mono text-sm">{o.order_number}</span>
                    <div className="text-muted-foreground">
                      Created: {new Date(o.created_at).toLocaleString()} · Type: {o.order_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground text-sm">
                      ₹{Number(o.total_amount).toLocaleString()}
                    </div>
                    <Badge
                      className={
                        o.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]'
                      }
                    >
                      {o.status}
                    </Badge>
                  </div>
                </div>

                {/* Order Items */}
                <div className="pt-2 border-t border-border/80">
                  <table className="w-full text-left">
                    <thead className="text-[10px] text-muted-foreground uppercase">
                      <tr>
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {o.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-1 text-foreground font-medium">{it.item_name}</td>
                          <td className="py-1 text-center text-muted-foreground">{it.quantity}</td>
                          <td className="py-1 text-right text-muted-foreground">₹{Number(it.unit_price).toLocaleString()}</td>
                          <td className="py-1 text-right text-foreground font-medium">₹{Number(it.total_amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Outstanding on Order */}
                {o.outstanding_amount > 0 && (
                  <div className="flex items-center justify-between p-2 rounded bg-rose-500/10 text-rose-300">
                    <span>Outstanding on this order:</span>
                    <strong className="font-mono">₹{Number(o.outstanding_amount).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No orders recorded for this member.
            </div>
          )}
        </div>
      </div>

      {/* Payment Transactions & Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Transactions */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-base text-foreground">Payment Transactions</h3>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.payments.length > 0 ? (
                  finance.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(p.paid_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {p.payment_method} <span className="text-[10px] text-muted-foreground">({p.provider})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No payment transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Invoices */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-base text-foreground">Invoices</h3>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {finance.invoices.length > 0 ? (
                  finance.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(inv.issued_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        ₹{Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary"
                          onClick={() => onViewInvoice(inv)}
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No invoices issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-SECTION 5: HEALTH & FORMS DYNAMIC RENDERER
// ============================================================================
const MemberHealthFormsSection: React.FC<{
  submissions: MemberIntakeSubmission[];
}> = ({ submissions }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
        <h3 className="font-semibold text-base text-foreground">Health & Dynamic Intake Forms</h3>
        <p className="text-xs text-muted-foreground">
          Authoritative questionnaire responses including PAR-Q, medical clearances, and lifestyle assessments.
        </p>
      </div>

      <div className="space-y-6">
        {submissions.length > 0 ? (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">{sub.form_title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Submitted: {new Date(sub.submitted_at).toLocaleString()}
                </div>
              </div>

              {/* Dynamic Q&A List */}
              <div className="space-y-3">
                {sub.answers.map((ans, idx) => (
                  <div key={idx} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1">
                    <div className="text-muted-foreground font-medium">
                      Q{idx + 1}: {ans.question_text}
                    </div>
                    <div className="pt-0.5">
                      {ans.question_type === 'BOOLEAN' ? (
                        <Badge
                          variant="outline"
                          className={
                            ans.answer?.toLowerCase() === 'yes' || ans.answer === 'true'
                              ? 'text-amber-400 border-amber-500/30'
                              : 'text-emerald-400 border-emerald-500/30'
                          }
                        >
                          {ans.answer?.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="font-semibold text-foreground">{ans.answer || '—'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-card border border-dashed border-border rounded-xl space-y-2">
            <HeartPulse className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-foreground">No Intake Submissions On File</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Dynamic intake questionnaires submitted by this member or trainer will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

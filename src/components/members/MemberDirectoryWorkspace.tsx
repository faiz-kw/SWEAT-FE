/**
 * src/components/members/MemberDirectoryWorkspace.tsx — Authoritative Member Directory
 * Direct backend integration. Zero mock records.
 * Full server-side search, filters, quick views, and backend-driven pagination.
 * Responsive from 320px to 1440px+.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '@/contexts/app-context';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Snowflake,
  AlertTriangle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { membersApi, type MemberFilterParams } from '@/api/endpoints/membersApi';
import type { Member } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CollectPaymentModal } from './modals/MemberActionModals';

type QuickViewTab = 'all' | 'active' | 'expiring_soon' | 'expired' | 'frozen' | 'outstanding';

export const MemberDirectoryWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locationId } = useApp();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickView, setQuickView] = useState<QuickViewTab>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Debounce search input by 300ms to eliminate duplicate or runaway requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Global branch scope change resets to page 1
  useEffect(() => {
    setPage(1);
  }, [locationId]);

  // New Member Modal State
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberGender, setNewMemberGender] = useState('M');

  // Quick Collect Payment Modal State
  const [paymentMember, setPaymentMember] = useState<Member | null>(null);

  // Backend authoritative query parameters
  const queryParams: MemberFilterParams = {
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    location: (locationId && locationId !== 'all') ? locationId : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    quick_view: quickView !== 'all' ? quickView : undefined,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['members', queryParams],
    queryFn: () => membersApi.getMembers(queryParams),
    staleTime: 30000,
  });

  const members = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = data?.total_pages || 1;

  // Stale page guard: reset to page 1 if current page exceeds newly filtered total_pages
  useEffect(() => {
    if (data?.total_pages && page > data.total_pages) {
      setPage(1);
    }
  }, [page, data?.total_pages]);

  const handleQuickViewChange = (tabId: QuickViewTab) => {
    setQuickView(tabId);
    if (tabId !== 'all') {
      setSelectedStatus('all');
    }
    setPage(1);
  };

  const handleStatusChange = (statusVal: string) => {
    setSelectedStatus(statusVal);
    if (statusVal !== 'all' && ['active', 'frozen', 'expired', 'expiring_soon'].includes(quickView)) {
      setQuickView('all');
    }
    setPage(1);
  };

  // New Member Mutation
  const createMemberMutation = useMutation({
    mutationFn: () =>
      membersApi.createMember({
        name: newMemberName,
        email: newMemberEmail || undefined,
        phone: newMemberPhone || undefined,
        gender: newMemberGender,
      }),
    onSuccess: (newMem) => {
      toast.success(`Member ${newMem.name} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setIsNewMemberOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      navigate({
        to: '/members/client-360',
        search: { memberId: newMem.id } as never,
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create member');
    },
  });

  const handleOpen360 = (memberId: string) => {
    navigate({
      to: '/members/client-360',
      search: { memberId } as never,
    });
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
          Active
        </Badge>
      );
    }
    if (s === 'FROZEN') {
      return (
        <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium flex items-center gap-1">
          <Snowflake className="w-3 h-3" />
          Frozen
        </Badge>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-background overflow-x-hidden">
      {/* 1. Header with Breadcrumbs & Actions */}
      <div className="border-b border-border/60 bg-card/40 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
              <span>Operations</span>
              <span>/</span>
              <span className="text-foreground">Member Directory</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Member Directory
              <Badge variant="secondary" className="text-xs font-mono ml-1">
                {isLoading ? '...' : isError ? '—' : `${totalCount} total`}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live operational members, session balances, contracts, and outstanding collections.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewMemberOpen(true)}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </Button>
          </div>
        </div>

        {/* 2. Quick Views Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'all', label: 'All Members', icon: Users },
            { id: 'active', label: 'Active', icon: CheckCircle2 },
            { id: 'expiring_soon', label: 'Expiring Soon', icon: Clock },
            { id: 'frozen', label: 'Frozen', icon: Snowflake },
            { id: 'expired', label: 'Expired', icon: AlertTriangle },
            { id: 'outstanding', label: 'Outstanding Balance', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = quickView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleQuickViewChange(tab.id as QuickViewTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 sm:px-6 border-b border-border/40 bg-card/20">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Member ID, Name, Phone, or Email..."
              className="pl-9 bg-background h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FROZEN">Frozen</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
            >
              <option value={15}>15 / page</option>
              <option value={30}>30 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Body: Table & Cards */}
      <div className="flex-1 p-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-36 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
                <Skeleton className="w-24 h-6" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center my-6">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">Unable to load members</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {(error as any)?.message || 'An error occurred while connecting to the member service.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-12 text-center my-6">
            <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-medium text-foreground">
              {debouncedSearch || quickView !== 'all' || selectedStatus !== 'all' || (locationId && locationId !== 'all')
                ? 'No members match the current filters.'
                : 'No members found.'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {debouncedSearch || quickView !== 'all' || selectedStatus !== 'all' || (locationId && locationId !== 'all')
                ? 'No member records matched your active search or filter criteria.'
                : 'There are no member accounts in this tenant yet. You can add one or convert a lead.'}
            </p>
            {(debouncedSearch || quickView !== 'all' || selectedStatus !== 'all' || (locationId && locationId !== 'all')) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  setQuickView('all');
                  setSelectedStatus('all');
                  setPage(1);
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto scrollbar-thin shadow-sm">
              <table className="w-full min-w-[880px] text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3 whitespace-nowrap">Member</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Home Branch</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Current Package</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Sessions Left</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Outstanding</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {members.map((member) => {
                    const hasOutstanding = member.outstanding_balance > 0;
                    return (
                      <tr
                        key={member.id}
                        onClick={() => handleOpen360(member.id)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                              {member.first_name?.[0] || 'M'}
                              {member.last_name?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{member.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {member.membership_number}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>{member.phone || 'No phone'}</span>
                                {member.email && <span>·</span>}
                                <span className="truncate max-w-[150px]">{member.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs font-medium text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-foreground">{member.home_branch || 'Main Branch'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-foreground max-w-[210px] truncate" title={member.package_name || 'Standard Plan'}>
                            {member.package_name || 'Standard Plan'}
                          </div>
                          <div className="text-[11px] text-muted-foreground max-w-[210px] truncate" title={`${member.program_name || ''} · ${member.package_version_name || ''}`}>
                            {member.program_name} · <span className="font-mono">{member.package_version_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(member.membership_status)}
                        </td>

                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          {member.expiry_date ? (
                            <span className="font-mono text-foreground">{member.expiry_date}</span>
                          ) : (
                            <span className="text-muted-foreground">No active plan</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold" title="Home Branch Sessions">
                              {member.home_sessions_remaining}H
                            </span>
                            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold" title="Cross Branch Sessions">
                              {member.cross_branch_sessions_remaining}X
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {hasOutstanding ? (
                            <span className="text-xs font-bold text-rose-500 font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                              ₹{member.outstanding_balance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">₹0.00</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {hasOutstanding && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                onClick={() => setPaymentMember(member)}
                              >
                                Collect
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-primary hover:bg-primary/10 gap-1"
                              onClick={() => handleOpen360(member.id)}
                            >
                              <span>360</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (<= 768px) */}
            <div className="md:hidden space-y-3">
              {members.map((member) => {
                const hasOutstanding = member.outstanding_balance > 0;
                return (
                  <div
                    key={member.id}
                    onClick={() => handleOpen360(member.id)}
                    className="p-4 rounded-xl border border-border bg-card shadow-sm active:scale-[0.99] transition-transform space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {member.first_name?.[0] || 'M'}
                          {member.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{member.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {member.membership_number} · {member.home_branch}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(member.membership_status)}
                    </div>

                    <div className="bg-muted/40 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase font-semibold">Package</div>
                        <div className="font-medium text-foreground truncate">{member.package_name || 'Standard'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase font-semibold">Expiry Date</div>
                        <div className="font-mono text-foreground">{member.expiry_date || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase font-semibold">Sessions</div>
                        <div className="font-mono font-medium">
                          {member.home_sessions_remaining} Home / {member.cross_branch_sessions_remaining} Cross
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase font-semibold">Outstanding</div>
                        <div className={`font-mono font-bold ${hasOutstanding ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          ₹{member.outstanding_balance.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">{member.phone}</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {hasOutstanding && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 text-rose-600 border-rose-500/30"
                            onClick={() => setPaymentMember(member)}
                          >
                            Collect
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-2.5 gap-1"
                          onClick={() => handleOpen360(member.id)}
                        >
                          <span>Open 360</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-muted-foreground border-t border-border/40">
              <div>
                Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                <span className="font-semibold text-foreground">{totalCount}</span> members
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <span className="px-2 font-mono text-xs font-medium text-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Member Creation Modal */}
      <Dialog open={isNewMemberOpen} onOpenChange={setIsNewMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Add New Member
            </DialogTitle>
            <DialogDescription>
              Create a new member profile in PerformanceOS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <select
                  value={newMemberGender}
                  onChange={(e) => setNewMemberGender(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMemberMutation.mutate()}
              disabled={createMemberMutation.isPending || !newMemberName.trim()}
            >
              {createMemberMutation.isPending ? 'Creating...' : 'Create & View 360'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect Payment Modal from Directory */}
      {paymentMember && (
        <CollectPaymentModal
          isOpen={Boolean(paymentMember)}
          onClose={() => setPaymentMember(null)}
          member={paymentMember}
          defaultAmount={paymentMember.outstanding_balance}
        />
      )}
    </div>
  );
};

/**
 * src/components/members/RenewalsWorkspace.tsx — Authoritative Member Renewals Workspace
 * Dedicated workspace replacing mock routes. Connects directly to backend tenant REST APIs.
 * Supports:
 * - Dynamic filtering: Expiring Soon (30 Days), Expired, All Up for Renewal
 * - Branch scope & multi-branch filtering
 * - Debounced server search
 * - Direct triggering of real RenewModal with carry-forward & payment gating
 * - Mobile responsive down to 320px
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '@/contexts/app-context';
import {
  Calendar,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  DollarSign,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { membersApi } from '@/api/endpoints/membersApi';
import type { Member } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RenewModal } from './modals/MemberActionModals';

type RenewalTab = 'expiring_soon' | 'expired' | 'all';

export const RenewalsWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locationId } = useApp();

  const [activeTab, setActiveTab] = useState<RenewalTab>('expiring_soon');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [selectedRenewMember, setSelectedRenewMember] = useState<Member | null>(null);

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  // Reset page when tab or branch changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, locationId]);

  const branchId = locationId && locationId !== 'all' ? locationId : undefined;

  // Query backend members with quick_view for renewals
  const {
    data: responseData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['member-renewals', activeTab, debouncedSearch, branchId, page],
    queryFn: () =>
      membersApi.getMembers({
        quick_view: activeTab === 'all' ? undefined : activeTab,
        status: activeTab === 'all' ? 'ACTIVE' : undefined,
        search: debouncedSearch || undefined,
        branch_id: branchId,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const members = responseData?.results || [];
  const totalCount = responseData?.count || 0;
  const totalPages = responseData?.total_pages || Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const calculateDaysLeft = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground pb-12">
      {/* Top Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Membership Renewals</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Authoritative workspace for managing expiring memberships, contracts, and continuous retention.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
        {/* Tab Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab('expiring_soon')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'expiring_soon'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expiring Soon (30 Days)
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'expired'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Already Expired
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Active Contracts
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, email, or #..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-semibold text-base">Failed to load renewals data</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {(error as any)?.message || 'An unexpected error occurred while querying membership renewals.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                Retry Query
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-base">No Memberships Requiring Renewal</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === 'expiring_soon'
                  ? 'All active member contracts are well within validity. No memberships expiring within the next 30 days.'
                  : activeTab === 'expired'
                  ? 'No expired memberships found matching current criteria.'
                  : 'No active contracts match current search query.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Home Branch</th>
                    <th className="py-3 px-4">Contract Expiry</th>
                    <th className="py-3 px-4">Sessions Left</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {members.map((member) => {
                    const daysLeft = calculateDaysLeft(member.expiry_date);
                    const isExpired = daysLeft !== null && daysLeft < 0;
                    const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-muted/20 transition-colors group cursor-pointer"
                        onClick={() => navigate({ to: '/_shell/members/client-360', search: { memberId: member.id } })}
                      >
                        {/* Member identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                {member.name}
                                {member.membership_number && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    ({member.membership_number})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                {member.phone && <span>{member.phone}</span>}
                                {member.email && <span className="truncate max-w-[150px]">{member.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Package / Plan */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{member.package_name || 'Standard Membership'}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {member.program_name || 'Fitness Program'}
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span>{member.home_branch || 'Primary Branch'}</span>
                          </div>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{member.expiry_date || 'N/A'}</div>
                            {isExpired ? (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 mt-0.5">
                                Expired {Math.abs(daysLeft!)} days ago
                              </Badge>
                            ) : isExpiringSoon ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] py-0 px-1.5 mt-0.5">
                                Expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 mt-0.5">
                                Active ({daysLeft}d left)
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Sessions Left */}
                        <td className="py-3 px-4">
                          <div className="font-semibold">
                            {member.home_sessions_remaining !== null && member.home_sessions_remaining !== undefined
                              ? `${member.home_sessions_remaining} sessions`
                              : 'Unlimited'}
                          </div>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3 px-4">
                          {member.outstanding_balance && member.outstanding_balance > 0 ? (
                            <span className="font-semibold text-rose-500">
                              ₹{member.outstanding_balance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Paid
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setSelectedRenewMember(member)}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              Renew
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-medium"
                              onClick={() =>
                                navigate({
                                  to: '/_shell/members/client-360',
                                  search: { memberId: member.id },
                                })
                              }
                            >
                              360
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          {!isLoading && totalCount > 0 && (
            <div className="border-t border-border px-4 py-3 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
                <span className="font-medium text-foreground">{totalCount}</span> members
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>
                <span className="px-2 font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2.5"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real Renew Modal Trigger */}
      {selectedRenewMember && (
        <RenewModal
          isOpen={true}
          onClose={() => {
            setSelectedRenewMember(null);
            refetch();
          }}
          member={selectedRenewMember}
        />
      )}
    </div>
  );
};
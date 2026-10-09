/**
 * src/components/members/TransfersWorkspace.tsx — Authoritative Member Transfers Workspace
 * Dedicated workspace replacing mock routes. Connects directly to backend tenant REST APIs.
 * Supports:
 * - Real branch transfer history querying via /api/v1/membership-branch-histories/
 * - Multi-branch scope filtering
 * - Debounced server search
 * - Initiating new branch transfers via real TransferModal
 * - Mobile responsive down to 320px
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '@/contexts/app-context';
import {
  Building2,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Plus,
  User,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { membershipsApi } from '@/api/endpoints/membershipsApi';
import { membersApi } from '@/api/endpoints/membersApi';
import type { MembershipBranchHistory } from '@/types/memberships';
import type { Member } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TransferModal } from './modals/MemberActionModals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const TransfersWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locationId } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // New transfer modal state
  const [isSelectMemberOpen, setIsSelectMemberOpen] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [selectedTransferMember, setSelectedTransferMember] = useState<Member | null>(null);

  // Debounce main table search
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

  // Debounce member selector search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchTerm]);

  const branchId = locationId && locationId !== 'all' ? locationId : undefined;

  // Query backend branch histories
  const {
    data: responseData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['membership-branch-histories', debouncedSearch, branchId, page],
    queryFn: () =>
      membershipsApi.getBranchHistories({
        branch_id: branchId,
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  // Query members for new transfer selection
  const { data: memberSearchResults, isLoading: isSearchingMembers } = useQuery({
    queryKey: ['transfer-member-search', debouncedMemberSearch],
    queryFn: () =>
      membersApi.getMembers({
        search: debouncedMemberSearch || undefined,
        page: 1,
        page_size: 10,
      }),
    enabled: isSelectMemberOpen,
  });

  const histories = responseData?.results || [];
  const totalCount = responseData?.count || 0;
  const totalPages = responseData?.total_pages || Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground pb-12">
      {/* Top Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Branch Transfers</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Authoritative ledger of home branch relocations, transfers, and inter-studio reassignments.
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
            <Button
              size="sm"
              onClick={() => setIsSelectMemberOpen(true)}
              className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Initiate Transfer
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transfers by member, membership #, or reason..."
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
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-semibold text-base">Failed to load transfer records</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {(error as any)?.message || 'An error occurred while fetching branch transfer history.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                Retry Query
              </Button>
            </div>
          ) : histories.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="font-semibold text-base">No Branch Transfers Recorded</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No home-branch relocations or transfers found matching the selected branch scope or search term.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4">Member / Membership</th>
                    <th className="py-3 px-4">From Branch</th>
                    <th className="py-3 px-4">To Branch</th>
                    <th className="py-3 px-4">Transfer Type</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Transferred By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {histories.map((hist) => {
                    const effectiveFormatted = new Date(hist.effective_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={hist.id}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        {/* Member */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {hist.member_name || 'Member'}
                            {hist.membership_number && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({hist.membership_number})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* From Branch */}
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                            {hist.from_branch_name || 'Initial Home'}
                          </Badge>
                        </td>

                        {/* To Branch */}
                        <td className="py-3 px-4">
                          <Badge className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {hist.to_branch_name || 'Target Branch'}
                          </Badge>
                        </td>

                        {/* Transfer Type */}
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">
                            {hist.change_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {effectiveFormatted}
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                          {hist.reason || 'Standard home branch transfer'}
                        </td>

                        {/* Changed By */}
                        <td className="py-3 px-4 text-muted-foreground">
                          {hist.changed_by_name || 'Staff'}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          {hist.member_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs font-medium"
                              onClick={() =>
                                navigate({
                                  to: '/_shell/members/client-360',
                                  search: { memberId: hist.member_id! },
                                })
                              }
                            >
                              360
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          )}
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
                <span className="font-medium text-foreground">{totalCount}</span> transfers
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

      {/* Select Member Dialog for Transfer */}
      <Dialog open={isSelectMemberOpen} onOpenChange={setIsSelectMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              Select Member for Branch Transfer
            </DialogTitle>
            <DialogDescription>
              Search for the member you want to transfer to another studio branch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Search member by name, phone, email..."
                className="pl-9 text-xs"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-lg">
              {isSearchingMembers ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Searching members...
                </div>
              ) : (memberSearchResults?.results || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No active members found.
                </div>
              ) : (
                (memberSearchResults?.results || []).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedTransferMember(m);
                      setIsSelectMemberOpen(false);
                    }}
                    className="p-3 hover:bg-muted/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.home_branch || 'Primary Branch'} · {m.phone || m.email || ''}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {m.membership_status || 'ACTIVE'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Real Transfer Modal */}
      {selectedTransferMember && (
        <TransferModal
          isOpen={true}
          onClose={() => {
            setSelectedTransferMember(null);
            refetch();
          }}
          member={selectedTransferMember}
        />
      )}
    </div>
  );
};
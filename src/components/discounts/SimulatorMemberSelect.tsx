import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  User,
  ChevronDown,
  Check,
  RotateCw,
  Building2,
  Package as PackageIcon,
  Phone,
  Mail,
  Hash,
} from 'lucide-react';
import { membersApi } from '@/api/endpoints/membersApi';
import type { Member } from '@/types/members';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SimulatorMemberSelectProps {
  selectedMemberId: string;
  onSelectMember: (memberId: string, member?: Member) => void;
  disabled?: boolean;
}

export const SimulatorMemberSelect: React.FC<SimulatorMemberSelectProps> = ({
  selectedMemberId,
  onSelectMember,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [accumulatedMembers, setAccumulatedMembers] = useState<Member[]>([]);

  // 300ms Debounce for server-side search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const isSearching = debouncedSearchQuery.length > 0;

  // 1. Fetch browsable members list (paginated, 50 per page)
  const {
    data: listData,
    isLoading: loadingList,
    isFetching: fetchingList,
  } = useQuery({
    queryKey: ['simulator-members-list', page],
    queryFn: () => membersApi.getMembers({ page, page_size: 50 }),
    staleTime: 60 * 1000,
  });

  // Accumulate members as user pages through the list
  useEffect(() => {
    if (listData?.results) {
      setAccumulatedMembers((prev) => {
        if (page === 1) return listData.results;
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = listData.results.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newOnes];
      });
    }
  }, [listData, page]);

  // 2. Fetch search results directly from backend when searching
  const {
    data: searchData,
    isLoading: loadingSearch,
    isFetching: fetchingSearch,
  } = useQuery({
    queryKey: ['simulator-members-search', debouncedSearchQuery],
    queryFn: () => membersApi.getMembers({ search: debouncedSearchQuery, page_size: 50 }),
    enabled: isSearching,
    staleTime: 30 * 1000,
  });

  // Active list to render
  const displayedMembers = useMemo(() => {
    return isSearching ? (searchData?.results || []) : accumulatedMembers;
  }, [isSearching, searchData, accumulatedMembers]);

  const totalCount = isSearching ? (searchData?.count || 0) : (listData?.count || 0);
  const isSearchPending = searchQuery.trim() !== debouncedSearchQuery;
  const isLoading = isSearching
    ? loadingSearch || fetchingSearch || isSearchPending
    : loadingList;

  // 3. Fallback direct member fetch for currently selected member if not in loaded list
  const { data: directMember } = useQuery({
    queryKey: ['simulator-member-detail', selectedMemberId],
    queryFn: () => membersApi.getMember(selectedMemberId),
    enabled: Boolean(selectedMemberId) && !displayedMembers.some((m) => m.id === selectedMemberId),
    staleTime: 5 * 60 * 1000,
  });

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return (
      displayedMembers.find((m) => m.id === selectedMemberId) ||
      (directMember?.id === selectedMemberId ? directMember : null)
    );
  }, [selectedMemberId, displayedMembers, directMember]);

  // Auto-select first member when initial data loads if none selected
  useEffect(() => {
    if (!selectedMemberId && accumulatedMembers.length > 0 && accumulatedMembers[0]) {
      onSelectMember(accumulatedMembers[0].id, accumulatedMembers[0]);
    }
  }, [accumulatedMembers, selectedMemberId, onSelectMember]);

  const renderStatusBadge = (status?: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Active
        </span>
      );
    }
    if (s === 'FROZEN') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Frozen
        </span>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Expired
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground border border-border">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'w-full min-h-[50px] p-2.5 rounded-lg border border-input bg-background hover:bg-muted/30 transition-colors flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-primary',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {selectedMember ? (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
                {selectedMember.first_name?.[0]?.toUpperCase() || selectedMember.name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                    {selectedMember.name || `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`.trim() || 'Gym Member'}
                  </span>
                  {renderStatusBadge(selectedMember.membership_status || selectedMember.status)}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                    #{selectedMember.member_number || selectedMember.id?.slice(0, 8)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap truncate">
                  {selectedMember.email && <span className="truncate">{selectedMember.email}</span>}
                  {selectedMember.phone && <span>· {selectedMember.phone}</span>}
                  {selectedMember.home_branch && <span>· Studio: {selectedMember.home_branch}</span>}
                  {selectedMember.package_name && selectedMember.package_name !== 'None' && (
                    <span className="text-primary font-medium">· {selectedMember.package_name}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-4 h-4 text-muted-foreground/60" />
              <span>-- Choose Member Profile --</span>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedMember && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMember('', undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onSelectMember('', undefined);
                  }
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Clear selected member"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[520px] p-3 z-[70] bg-popover text-popover-foreground border shadow-xl rounded-xl space-y-3"
        align="start"
      >
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name, phone, email, member #..."
            className="pl-9 pr-9 h-9 text-xs bg-muted/30 focus-visible:ring-1"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Query Info Header */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>
            {isSearching
              ? `Found ${totalCount} member${totalCount === 1 ? '' : 's'} matching "${debouncedSearchQuery}"`
              : `Showing ${accumulatedMembers.length} of ${totalCount || accumulatedMembers.length} members`}
          </span>
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-primary hover:underline font-medium"
            >
              Show all members
            </button>
          )}
        </div>

        {/* Members List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border/40 rounded-lg border border-border/60 bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-primary" />
              <span>{isSearching ? 'Searching backend database...' : 'Loading member directory...'}</span>
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                {isSearching ? `No members found matching "${debouncedSearchQuery}"` : 'No members found'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isSearching
                  ? 'Try searching by first or last name, phone (+91), email address, or member ID.'
                  : 'No active members are currently registered in this organization.'}
              </p>
            </div>
          ) : (
            displayedMembers.map((m) => {
              const isSelected = selectedMemberId === m.id;
              const displayName =
                m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Gym Member';

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectMember(m.id, m);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors',
                    isSelected && 'bg-primary/5 border-l-2 border-primary'
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Top Row: Name, Member #, Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{displayName}</span>
                      {renderStatusBadge(m.membership_status || m.status)}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                        #{m.member_number || m.id?.slice(0, 8)}
                      </span>
                    </div>

                    {/* Middle Row: Contact & Branch */}
                    <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                      {m.email && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={m.email}>
                          <Mail className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{m.email}</span>
                        </span>
                      )}
                      {m.phone && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                          <span>{m.phone}</span>
                        </span>
                      )}
                      {m.home_branch && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Building2 className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                          <span>{m.home_branch}</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Package / Plan */}
                    {m.package_name && m.package_name !== 'None' && (
                      <div className="text-[11px] flex items-center gap-1.5 text-primary">
                        <PackageIcon className="w-3 h-3 shrink-0" />
                        <span className="font-medium truncate">{m.package_name}</span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Load More Button for Browsing */}
        {!isSearching && listData && accumulatedMembers.length < listData.count && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={fetchingList}
            className="w-full text-xs h-8 text-primary border-primary/20 hover:bg-primary/5"
          >
            {fetchingList ? (
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Loading more members...
              </span>
            ) : (
              `Load more members (${listData.count - accumulatedMembers.length} remaining)`
            )}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

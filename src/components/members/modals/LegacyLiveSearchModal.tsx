import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Database,
  Search,
  Loader2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { membersApi } from '@/api/endpoints/membersApi';

interface LegacyLiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const LegacyLiveSearchModal: React.FC<LegacyLiveSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncingUid, setSyncingUid] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      if (initialQuery.trim()) {
        executeSearch(initialQuery.trim());
      } else {
        setResults([]);
        setHasSearched(false);
        setErrorMessage(null);
      }
    }
  }, [isOpen, initialQuery]);

  const executeSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);
    try {
      const res = await membersApi.legacySearch(q.trim());
      setResults(res.results || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to search old database';
      setErrorMessage(msg);
      toast.error('Search failed: ' + msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSyncAndOpen = async (candidate: any) => {
    setSyncingUid(candidate.primary_uid);
    try {
      const res = await membersApi.legacySync({
        primary_uid: candidate.primary_uid,
      });

      toast.success(res.message || 'Member successfully synced!');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-kpis'] });

      const memberProfile = res.member?.overview || res.member;
      const memberId = memberProfile?.id || candidate.primary_uid;

      onClose();
      navigate({
        to: '/members/client-360',
        search: { memberId } as never,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to sync member';
      toast.error('Sync error: ' + msg);
    } finally {
      setSyncingUid(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2 text-primary font-semibold text-base">
            <Database className="w-5 h-5 text-indigo-500" />
            <DialogTitle>Live Old Portal Search & Sync</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Search the original database in real-time by mobile number, email, or name. Automatically merges multiple accounts and syncs active plans & sessions.
          </DialogDescription>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(searchQuery);
            }}
            className="flex items-center gap-2 mt-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter 10-digit mobile (e.g. 9930454942), email, or name..."
                className="pl-9 text-xs"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search Live DB
            </Button>
          </form>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isSearching && (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs text-muted-foreground">Connecting to legacy database and checking records...</p>
            </div>
          )}

          {!isSearching && errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isSearching && hasSearched && results.length === 0 && !errorMessage && (
            <div className="py-10 text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/10">
              <Database className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <div className="text-sm font-medium text-foreground">No records found in old database</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No user or lead matched "{searchQuery}". Double-check the 10-digit phone number or email address.
              </p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Matching Members Found ({results.length})</span>
                <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Live MySQL Match
                </span>
              </div>

              {results.map((candidate, idx) => {
                const isSyncing = syncingUid === candidate.primary_uid;
                const activePlan = candidate.active_plan;
                const linkedCount = (candidate.linked_uids || []).length;

                return (
                  <div
                    key={candidate.primary_uid || idx}
                    className="p-4 bg-card border border-border rounded-xl shadow-xs space-y-3 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {candidate.name || 'Unknown Member'}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            UID: {candidate.primary_uid}
                          </Badge>
                          {linkedCount > 1 && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                              {linkedCount} Accounts Merged
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {candidate.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground/70" />
                              {candidate.phone}
                            </span>
                          )}
                          {candidate.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground/70" />
                              {candidate.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isSyncing}
                        onClick={() => handleSyncAndOpen(candidate)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs shrink-0 self-start sm:self-center"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Sync & Open 360
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Active Plan Detail Box */}
                    {activePlan ? (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                              ACTIVE PLAN
                            </Badge>
                            <span className="font-bold text-foreground">{activePlan.plan_name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {activePlan.start_date} → {activePlan.end_date}
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <div className="font-bold text-emerald-500 text-sm">
                            {activePlan.remaining_sessions} Sessions Left
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {activePlan.consumed_sessions} of {activePlan.max_sessions} used
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
                        <span>No current active plan in legacy system.</span>
                        {candidate.all_plans?.length > 0 && (
                          <span className="font-mono text-[10px]">
                            {candidate.all_plans.length} past expired plans
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Active & Past Packages
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Purchases & Payments
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Class Bookings & Attendance
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

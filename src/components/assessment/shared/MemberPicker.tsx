import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react';
import { membersApi } from '@/api/endpoints/membersApi';

/**
 * Picks the member an assessment belongs to.
 *
 * Choosing from the directory rather than typing a name is what links the assessment to a
 * real member record. Without that link there is no previous assessment to compare against,
 * no entitlement to check, and nothing to show on the member's own history — the record is
 * just a name in a box.
 *
 * Selecting also fills in details the assessment otherwise has to guess at: phone, home
 * branch, and the date of birth and sex the metabolic equation needs. A walk-in or
 * prospective member who is not in the system yet can still be entered by hand.
 */

export interface SelectedMember {
  user_profile_id: string;
  name: string;
  phone: string;
  member_number?: string;
  branch_id?: string;
  date_of_birth?: string;
  gender?: string;
}

interface MemberPickerProps {
  value: SelectedMember | null;
  onSelect: (member: SelectedMember | null) => void;
  /** Manual entry, used when the person is not in the directory. */
  manualName: string;
  setManualName: (v: string) => void;
  manualPhone: string;
  setManualPhone: (v: string) => void;
  manualMode: boolean;
  setManualMode: (v: boolean) => void;
}

export const MemberPicker: React.FC<MemberPickerProps> = ({
  value,
  onSelect,
  manualName,
  setManualName,
  manualPhone,
  setManualPhone,
  manualMode,
  setManualMode,
}) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close the list when focus moves elsewhere on the page.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['member-picker', debounced],
    queryFn: () => membersApi.getMembers({ page_size: 8, ...(debounced ? { search: debounced } : {}) }),
    enabled: !manualMode,
    placeholderData: (previous) => previous,
  });

  const results = useMemo(() => (data?.results || []) as any[], [data]);

  const choose = (row: any) => {
    onSelect({
      user_profile_id: row.id,
      name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      phone: row.phone || '',
      member_number: row.member_number,
      branch_id: row.home_branch_id,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
    });
    setOpen(false);
    setQuery('');
  };

  if (manualMode) {
    return (
      <div className="sm:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-muted-foreground">
            Full name <span className="text-destructive">*</span>
          </label>
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-[11px] text-primary hover:underline"
          >
            Search the directory instead
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-xs text-foreground"
          />
          <input
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="+91"
            className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-xs text-foreground"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Not linked to a member record, so there will be nothing to compare against at reassessment.
        </p>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-muted-foreground">
          Member <span className="text-destructive">*</span>
        </label>
        <button
          type="button"
          onClick={() => { setManualMode(true); onSelect(null); }}
          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Not in the system
        </button>
      </div>

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{value.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {value.phone || 'No phone on record'}
              {value.member_number ? ` · ${value.member_number}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Clear selected member"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name, phone or member number"
            className="w-full h-10 rounded-lg bg-muted border border-border pl-9 pr-9 text-xs text-foreground"
          />
          {isFetching && (
            <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}

          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-64 overflow-auto">
              {results.length === 0 ? (
                <div className="p-3 text-center space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {debounced ? `No member matches "${debounced}".` : 'Start typing to search.'}
                  </p>
                  {debounced && (
                    <button
                      type="button"
                      onClick={() => { setManualMode(true); setManualName(debounced); setOpen(false); }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Enter "{debounced}" manually instead
                    </button>
                  )}
                </div>
              ) : (
                results.map((row: any) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => choose(row)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim()}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {row.phone || 'No phone'}
                        {row.member_number ? ` · ${row.member_number}` : ''}
                        {row.home_branch ? ` · ${row.home_branch}` : ''}
                      </p>
                    </div>
                    <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

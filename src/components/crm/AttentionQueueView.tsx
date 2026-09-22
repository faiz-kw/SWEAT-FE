import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  User,
  Phone,
  Building2,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import { crmApi } from '@/services/crmApi';
import type { Lead, NextBestAction } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

interface AttentionQueueViewProps {
  branchFilter: string;
  searchQuery: string;
  onOpenLeadDetail: (lead: Lead) => void;
  onBookTrialClick?: (lead: Lead) => void;
  onStatusTransitionClick?: (lead: Lead) => void;
}

export function AttentionQueueView({
  branchFilter,
  searchQuery,
  onOpenLeadDetail,
  onBookTrialClick,
  onStatusTransitionClick,
}: AttentionQueueViewProps) {
  const [page, setPage] = React.useState(1);
  const [reasonFilter, setReasonFilter] = React.useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['crm-attention-queue', page, branchFilter, searchQuery, reasonFilter, severityFilter],
    queryFn: () =>
      crmApi.getAttentionQueue({
        page,
        page_size: 15,
        branch: branchFilter !== 'ALL' ? branchFilter : undefined,
        search: searchQuery || undefined,
        reason: reasonFilter !== 'ALL' ? reasonFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      }),
  });

  const leads = data?.results || [];
  const metrics = data?.metrics;
  const totalPages = data?.total_pages || 1;
  const totalCount = data?.count || 0;

  const handleExecuteAction = (lead: Lead, action?: NextBestAction | null) => {
    if (!action) {
      onOpenLeadDetail(lead);
      return;
    }
    if (action.action_code === 'BOOK_TRIAL' && onBookTrialClick) {
      onBookTrialClick(lead);
    } else if (action.action_code === 'CHANGE_LEAD_STAGE' && onStatusTransitionClick) {
      onStatusTransitionClick(lead);
    } else {
      onOpenLeadDetail(lead);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-filters Bar */}
      <div className="p-3 bg-card/60 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>Filter Queue:</span>
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Stuck Reasons</option>
            <option value="STAGE_SLA_BREACHED">Stage SLA Breached</option>
            <option value="FOLLOWUP_OVERDUE">Follow-up Overdue</option>
            <option value="TRIAL_RESCHEDULE_REQUESTED">Trial Reschedule Requested</option>
            <option value="TRIAL_CONFIRMATION_PENDING">Trial Confirmation Pending</option>
            <option value="TRIAL_NO_SHOW">Trial No-Show</option>
            <option value="POST_TRIAL_FOLLOWUP_DUE">Post-Trial Follow-up Due</option>
            <option value="TRIAL_NOT_BOOKED">Trial Not Booked</option>
            <option value="NO_FOLLOWUP">No Follow-up Scheduled</option>
            <option value="NO_RESPONSE">No Customer Response</option>
            <option value="COMMUNICATION_FAILED">Communication Failed</option>
            <option value="UNASSIGNED_LEAD">Unassigned Lead</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isLoading ? 'Counting...' : `${totalCount} leads require attention`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2 text-xs"
            title="Refresh attention queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-card rounded-xl border border-border text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm">Evaluating active pipeline leads...</span>
        </div>
      ) : isError ? (
        <CRMErrorState
          title="Attention Queue Unavailable"
          description="Failed to load stuck leads and next best actions from backend."
          onRetry={() => refetch()}
        />
      ) : leads.length === 0 ? (
        <CRMEmptyState
          title="No Leads Require Immediate Attention"
          description="All active prospects are within configured stage SLA windows, have scheduled follow-ups, or completed trial engagements."
          icon={CheckCircle2}
        />
      ) : (
        <div className="space-y-3">
          {/* Attention Leads Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Lead & Contact</th>
                    <th className="px-4 py-3">Primary Reason & Urgency</th>
                    <th className="px-4 py-3">Pipeline Stage</th>
                    <th className="px-4 py-3">Assigned Rep / Branch</th>
                    <th className="px-4 py-3 text-right">Prescribed Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {leads.map((lead) => {
                    const att = lead.attention;
                    const isCritical = att?.severity === 'CRITICAL';
                    const isHigh = att?.severity === 'HIGH';

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onOpenLeadDetail(lead)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        {/* Column 1: Lead & Contact */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5 group-hover:text-primary transition-colors">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {lead.phone_normalized || lead.email_normalized || 'No direct phone'}
                          </div>
                        </td>

                        {/* Column 2: Reason & Severity */}
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                isCritical
                                  ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                                  : isHigh
                                  ? 'border-amber-500 text-amber-600 bg-amber-500/10'
                                  : 'border-primary text-primary bg-primary/10'
                              }`}
                            >
                              {att?.severity || 'MEDIUM'}
                            </Badge>
                            <span className="font-semibold text-foreground text-xs">
                              {att?.primary_reason_display || 'Action Required'}
                            </span>
                          </div>
                          {att?.overdue_by_seconds && att.overdue_by_seconds > 0 ? (
                            <div className="text-[11px] text-rose-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Overdue by {formatDuration(att.overdue_by_seconds)}</span>
                            </div>
                          ) : null}
                        </td>

                        {/* Column 3: Stage */}
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground">
                            {lead.current_status?.replace(/_/g, ' ')}
                          </div>
                          {att?.stage_age_seconds !== undefined && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDuration(att.stage_age_seconds)} in stage
                            </div>
                          )}
                        </td>

                        {/* Column 4: Branch & Rep */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          <div className="text-foreground font-medium">
                            {lead.branch_name || 'General Branch'}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {lead.assigned_sales_name ? (
                              `Rep: ${lead.assigned_sales_name}`
                            ) : (
                              <span className="text-amber-500 font-semibold">Unassigned</span>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Action CTA */}
                        <td
                          className="px-4 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            onClick={() => handleExecuteAction(lead, att?.recommended_action)}
                            className="gap-1.5 text-xs font-semibold h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {att?.recommended_action?.display_name || 'Review Lead'}
                            </span>
                            <ArrowRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
                <span>
                  Page {page} of {totalPages} ({totalCount} total stuck leads)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 px-2"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

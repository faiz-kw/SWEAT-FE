import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  CheckSquare,
  Sliders,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { approvalsApi } from '../../services/approvalsApi';
import { ApprovalRequest, ApprovalActionType, ApprovalStatus } from '../../types/approvals';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ApprovalsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'governance'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter] = useState<string>('ALL');

  // Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<ApprovalActionType>('APPROVED');
  const [decisionComment, setDecisionComment] = useState('');
  const [allowSelfApproval, setAllowSelfApproval] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Queries
  const {
    data: requests = [],
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: () => approvalsApi.getApprovalRequests(),
  });

  const {
    data: actions = [],
    refetch: refetchActions,
  } = useQuery({
    queryKey: ['approval-actions'],
    queryFn: () => approvalsApi.getApprovalActions(),
  });

  // Mutations
  const decisionMutation = useMutation({
    mutationFn: ({
      requestId,
      action,
      comment,
      allow_self_approval,
    }: {
      requestId: string;
      action: ApprovalActionType;
      comment: string;
      allow_self_approval?: boolean;
    }) =>
      approvalsApi.submitDecision(requestId, {
        action,
        comment,
        allow_self_approval,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      queryClient.invalidateQueries({ queryKey: ['approval-actions'] });
      setSelectedRequest(null);
      setDecisionComment('');
      setAllowSelfApproval(false);
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err?.message || 'Failed to submit approval decision.');
    },
  });

  // Derived counts
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');
  const multiSigCount = requests.filter((r) => r.required_approvals > 1).length;

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const filteredPending = pendingRequests.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.request_type.toLowerCase().includes(term) ||
      r.entity_type.toLowerCase().includes(term) ||
      r.requested_by_email?.toLowerCase().includes(term);
    const matchesType = typeFilter === 'ALL' || r.request_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredHistory = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Administrative Approvals & Governance"
        subtitle="Segregation of duties, multi-signature authorizations, discount waivers, and financial overrides."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Automation · Approvals
            </span>
            <span className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground">{pendingRequests.length}</span> pending action
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRequests();
              refetchActions();
            }}
            title="Refresh"
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      <PageBody>
        {/* Responsive KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiTile label="Pending Action" value={pendingRequests.length} hint="Awaiting review" tone="warning" />
          <KpiTile label="Approved" value={approvedRequests.length} hint="Sign-offs executed" tone="positive" />
          <KpiTile label="Rejected" value={rejectedRequests.length} hint="Policy non-compliant" tone="negative" />
          <KpiTile label="Multi-Sig Quorums" value={multiSigCount} hint=">1 signature required" tone="default" />
          <KpiTile label="Audit Trail" value={actions.length} hint="Signed action events" />
        </div>

        {/* Navigation Tabs - Responsive Scroll */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Clock className="size-3.5" />
            Pending Approvals ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <CheckSquare className="size-3.5" />
            Decision History ({filteredHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'governance'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Sliders className="size-3.5" />
            Governance Rules & Matrix
          </button>
        </div>

        {/* Tab: Pending Approvals */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search request type, requester..."
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Request Type</th>
                      <th className="px-4 py-3">Target Entity</th>
                      <th className="px-4 py-3">Requested By</th>
                      <th className="px-4 py-3">Quorum Needed</th>
                      <th className="px-4 py-3">Requested At</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingRequests ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                          Loading approval queue...
                        </td>
                      </tr>
                    ) : filteredPending.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No pending approvals awaiting review. Everything is clear!
                        </td>
                      </tr>
                    ) : (
                      filteredPending.map((req) => (
                        <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-semibold text-xs text-primary">
                            {req.request_type}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-foreground font-medium">{req.entity_type}</span>
                            <div className="text-[11px] text-muted-foreground font-mono">{req.entity_id.slice(0, 8)}...</div>
                          </td>
                          <td className="px-4 py-3.5 text-foreground">{req.requested_by_email || 'Staff'}</td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                              {req.actions?.length || 0} / {req.required_approvals} signed
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5">{getStatusBadge(req.status)}</td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType('APPROVED');
                              }}
                              className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType('REJECTED');
                              }}
                              className="text-xs h-7 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Decision History */}
        {activeTab === 'history' && (
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Resolved At</th>
                    <th className="px-4 py-3">Request Type</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Signatures & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredHistory.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {req.resolved_at ? new Date(req.resolved_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-primary">{req.request_type}</td>
                      <td className="px-4 py-3.5 text-xs text-foreground">{req.entity_type}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{req.requested_by_email}</td>
                      <td className="px-4 py-3.5">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3.5 text-xs text-foreground">
                        {req.actions && req.actions.length > 0 ? (
                          <div className="space-y-1">
                            {req.actions.map((a) => (
                              <div key={a.id} className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    a.action === 'APPROVED'
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {a.action}
                                </span>
                                <span>{a.approver_email}</span>
                                {a.comment && <span className="text-muted-foreground italic">"{a.comment}"</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'Resolved'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Governance Rules */}
        {activeTab === 'governance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
              <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Segregation of Duties (SoD) Policy
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Staff members submitting financial overrides, discount exceptions, or contract cancellations cannot sign off on their own requests. A distinct manager or director must validate the action.
              </p>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Enforcement Status: STRICT FAIL-CLOSED (ACTIVE)
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
              <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Multi-Signature Authorization Quorum
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                High-value transactions (refunds exceeding ₹50,000, contract terminations with waived balances) require two concurrent managerial approvals before outbox events unlock.
              </p>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-primary font-semibold">
                Default Quorum: 1 Sign-Off | Critical Overrides: 2 Sign-Offs
              </div>
            </div>
          </div>
        )}
      </PageBody>

      {/* Action Review Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'APPROVED' ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <XCircle className="size-5 text-rose-500" />
              )}
              Confirm Approval Action: {actionType}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Reviewing {selectedRequest.request_type} for entity {selectedRequest.entity_type}.
              </p>

              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                  {modalError}
                </div>
              )}

              <div>
                <Label className="mb-1 block">Decision Notes / Comment</Label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder="Justification or compliance audit note..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="selfApproval"
                  checked={allowSelfApproval}
                  onChange={(e) => setAllowSelfApproval(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="selfApproval" className="text-xs text-muted-foreground cursor-pointer">
                  Override Segregation of Duties (emergency admin only)
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setModalError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'APPROVED' ? 'default' : 'destructive'}
              onClick={() =>
                selectedRequest &&
                decisionMutation.mutate({
                  requestId: selectedRequest.id,
                  action: actionType,
                  comment: decisionComment,
                  allow_self_approval: allowSelfApproval,
                })
              }
              disabled={decisionMutation.isPending}
            >
              {decisionMutation.isPending ? 'Submitting...' : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

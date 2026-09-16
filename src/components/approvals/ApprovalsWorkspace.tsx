import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Sliders,
  FileText,
  User,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { approvalsApi } from '../../services/approvalsApi';
import { ApprovalRequest, ApprovalAction, ApprovalStatus } from '../../types/approvals';

interface ApprovalsWorkspaceProps {
  initialTab?: 'pending' | 'history' | 'governance';
}

export const ApprovalsWorkspace: React.FC<ApprovalsWorkspaceProps> = ({
  initialTab = 'pending',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'governance'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Decision Modal
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
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
    queryFn: () => approvalsApi.getRequests(),
  });

  const {
    data: actions = [],
    isLoading: loadingActions,
    refetch: refetchActions,
  } = useQuery({
    queryKey: ['approval-actions'],
    queryFn: () => approvalsApi.getActions(),
  });

  // Mutation
  const decisionMutation = useMutation({
    mutationFn: (data: {
      requestId: string;
      action: 'APPROVED' | 'REJECTED';
      comment: string;
      allow_self_approval: boolean;
    }) =>
      approvalsApi.actOnRequest(data.requestId, {
        action: data.action,
        comment: data.comment,
        allow_self_approval: data.allow_self_approval,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      queryClient.invalidateQueries({ queryKey: ['approval-actions'] });
      setSelectedRequest(null);
      setDecisionComment('');
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err?.message || 'Failed to submit approval action.');
    },
  });

  // Metrics
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');
  const multiSigCount = requests.filter((r) => r.required_approvals > 1).length;

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            Administrative Approvals & Governance
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enforce segregation of duties, multi-signature authorizations, discount waivers, and financial overrides.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchRequests();
              refetchActions();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Action</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingRequests.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Awaiting manager review</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Approved</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{approvedRequests.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Sign-offs executed</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">Rejected</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{rejectedRequests.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Policy non-compliant</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Multi-Sig Quorums</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{multiSigCount}</div>
          <div className="text-xs text-zinc-500 mt-1">&gt;1 signature required</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audit Trail</div>
          <div className="text-2xl font-bold text-zinc-200 mt-1">{actions.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Signed action events</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approvals ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Decision History ({filteredHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'governance'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Governance Rules & Quorum Matrix
        </button>
      </div>

      {/* Tab: Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search request type, requester..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Request Type</th>
                    <th className="px-5 py-3.5">Target Entity</th>
                    <th className="px-5 py-3.5">Requested By</th>
                    <th className="px-5 py-3.5">Quorum Needed</th>
                    <th className="px-5 py-3.5">Requested At</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading approval queue...
                      </td>
                    </tr>
                  ) : filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        No pending approvals awaiting review. Everything is clear!
                      </td>
                    </tr>
                  ) : (
                    filteredPending.map((req) => (
                      <tr key={req.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-5 py-4 font-mono font-semibold text-xs text-indigo-300">
                          {req.request_type}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-zinc-200 font-medium">{req.entity_type}</span>
                          <div className="text-xs text-zinc-500 font-mono">{req.entity_id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-5 py-4 text-zinc-200">{req.requested_by_email || 'Staff'}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {req.actions?.length || 0} / {req.required_approvals} signed
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-400">
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(req.status)}</td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('APPROVED');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('REJECTED');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          >
                            Reject
                          </button>
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
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Resolved At</th>
                  <th className="px-5 py-3.5">Request Type</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Requested By</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Signatures & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredHistory.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {req.resolved_at ? new Date(req.resolved_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-indigo-300">{req.request_type}</td>
                    <td className="px-5 py-4 text-xs text-zinc-200">{req.entity_type}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{req.requested_by_email}</td>
                    <td className="px-5 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-5 py-4 text-xs text-zinc-300">
                      {req.actions && req.actions.length > 0 ? (
                        <div className="space-y-1">
                          {req.actions.map((a) => (
                            <div key={a.id} className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  a.action === 'APPROVED'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {a.action}
                              </span>
                              <span>{a.approver_email}</span>
                              {a.comment && <span className="text-zinc-500 italic">"{a.comment}"</span>}
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
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              Segregation of Duties (SoD) Policy
            </h3>
            <p className="text-xs text-zinc-400">
              Staff members submitting financial overrides, discount exceptions, or contract cancellations cannot sign off on their own requests. A distinct manager or director must validate the action.
            </p>
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs text-emerald-400 font-semibold">
              Enforcement Status: STRICT FAIL-CLOSED (ACTIVE)
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Multi-Signature Authorization Quorum
            </h3>
            <p className="text-xs text-zinc-400">
              High-value transactions (refunds exceeding $500, contract terminations with waived balances) require two concurrent managerial approvals before outbox events unlock.
            </p>
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs text-indigo-400 font-semibold">
              Default Quorum: 1 Sign-Off | Critical Overrides: 2 Sign-Offs
            </div>
          </div>
        </div>
      )}

      {/* Action Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {actionType === 'APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                Confirm Approval Action: {actionType}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Reviewing {selectedRequest.request_type} for entity {selectedRequest.entity_type}.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Decision Notes / Comment</label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder="Justification or compliance audit note..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="selfApproval"
                  checked={allowSelfApproval}
                  onChange={(e) => setAllowSelfApproval(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="selfApproval" className="text-xs text-zinc-400">
                  Override Segregation of Duties (emergency admin only)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setModalError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  decisionMutation.mutate({
                    requestId: selectedRequest.id,
                    action: actionType,
                    comment: decisionComment,
                    allow_self_approval: allowSelfApproval,
                  })
                }
                disabled={decisionMutation.isPending}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition disabled:opacity-50 ${
                  actionType === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {decisionMutation.isPending ? 'Submitting...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

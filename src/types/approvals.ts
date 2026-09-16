export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalAction {
  id: string;
  approval_request: string;
  approver_user: string;
  approver_email?: string;
  action: 'APPROVED' | 'REJECTED';
  comment?: string;
  acted_at: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  organization: string;
  request_type: string;
  entity_type: string;
  entity_id: string;
  requested_by_user: string;
  requested_by_email?: string;
  requested_payload: Record<string, any>;
  status: ApprovalStatus;
  required_approvals: number;
  resolved_at?: string;
  actions?: ApprovalAction[];
  created_at: string;
  updated_at: string;
}

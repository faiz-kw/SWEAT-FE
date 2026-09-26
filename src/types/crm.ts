/**
 * src/types/crm.ts — Frontend TypeScript Interfaces for Layer 2 Module B: CRM, Leads & Trials
 */

export type LeadStatus =
  | 'NEW_LEAD'
  | 'TRIAL_BOOKED'
  | 'TRIAL_CONFIRMED'
  | 'TRIAL_ATTENDED'
  | 'NO_SHOW'
  | 'FOLLOW_UP_PENDING'
  | 'INTERESTED'
  | 'HOT_LEAD'
  | 'PAYMENT_PENDING'
  | 'CONVERTED'
  | 'NOT_INTERESTED'
  | 'LOST';

export interface Lead {
  id: string;
  organization: string;
  branch?: string | null;
  branch_name?: string | null;
  lead_source?: string | null;
  source_name?: string | null;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone_normalized?: string | null;
  email_normalized?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  company_name?: string | null;
  area?: string | null;
  country?: string | null;
  interested_program?: string | null;
  interested_program_name?: string | null;
  fitness_goal?: string | null;
  referred_by_user?: string | null;
  referred_by_user_name?: string | null;
  referred_by_name?: string | null;
  billing_name?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  do_not_contact?: boolean;
  consent_whatsapp?: boolean;
  consent_email?: boolean;
  consent_sms?: boolean;
  current_status: LeadStatus;
  assigned_sales_user?: string | null;
  assigned_sales_name?: string | null;
  assigned_trainer_user?: string | null;
  first_touch_source?: string | null;
  latest_touch_source?: string | null;
  campaign_reference?: string | null;
  converted_user_profile?: string | null;
  attributions?: LeadAttribution[];
  latest_attribution?: LeadAttribution | null;
  sla?: LeadSlaInfo | null;
  attention?: LeadAttentionSummary | null;
  last_activity?: {
    activity_type: string;
    outcome?: string | null;
    activity_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export type TouchType = 'FIRST_TOUCH' | 'LEAD_CAPTURE' | 'ASSISTED_TOUCH';

export interface LeadAttribution {
  id: string;
  organization?: string;
  lead?: string;
  lead_source?: string | null;
  lead_source_name?: string | null;
  touch_type: TouchType;
  platform?: string | null;
  campaign_name?: string | null;
  campaign_external_id?: string | null;
  ad_set_name?: string | null;
  ad_set_external_id?: string | null;
  ad_name?: string | null;
  ad_external_id?: string | null;
  form_name?: string | null;
  form_external_id?: string | null;
  external_lead_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page_url?: string | null;
  referrer_url?: string | null;
  capture_method?: string | null;
  captured_at: string;
  raw_metadata?: Record<string, any>;
  created_at: string;
}

export type SlaStatus = 'ON_TRACK' | 'BREACHED' | 'DISABLED';

export interface LeadSlaInfo {
  stage_entered_at: string;
  stage_age_seconds: number;
  sla_policy_id?: string | null;
  sla_target_value?: number | null;
  sla_target_unit?: 'MINUTES' | 'HOURS' | 'DAYS' | null;
  sla_due_at?: string | null;
  sla_status: SlaStatus;
}

export interface LeadTimelineEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  title: string;
  description: string;
  actor: string;
  channel: string;
  metadata?: Record<string, any>;
}

export interface LeadMetadata {
  statuses: Array<{ value: LeadStatus; label: string }>;
  initial_status: LeadStatus;
  genders: string[];
  countries: string[];
  goal_suggestions: string[];
}

export interface EligibleAgent {
  id: string;
  user_id?: string;
  name: string;
  display_name?: string;
  email: string;
  phone?: string | null;
  user_type?: string;
  role_code?: string | null;
  role_name?: string | null;
  role_label?: string | null;
  home_branch_id?: string | null;
  home_branch_name?: string | null;
  branch?: string | null;
  is_available?: boolean;
  availability_status?: 'AVAILABLE' | 'ON_LEAVE' | 'OUTSIDE_BRANCH' | 'NO_PERMISSION' | 'INACTIVE';
  availability_reason?: string | null;
}

export interface CRMAgentAssignmentRoleOption {
  id: string;
  code: string;
  name: string;
  scope: string;
  description?: string;
  user_count: number;
  is_system?: boolean;
}

export interface CRMAgentAssignmentUserOption {
  id: string;
  name: string;
  email: string;
  user_type?: string;
  home_branch_id?: string | null;
  home_branch_name?: string | null;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    scope_type?: string;
  }>;
}

export interface CRMAgentAssignmentConfig {
  id: string;
  allowed_role_codes: string[];
  excluded_user_ids: string[];
  require_branch_match: boolean;
  allow_all_staff_fallback: boolean;
  assignment_mode_allowed?: 'MANUAL' | 'AUTO' | 'BOTH';
  default_assignment_mode?: 'MANUAL' | 'AUTO';
  auto_assignment_strategy?: 'ROUND_ROBIN' | 'LEAST_OPEN_LEADS' | 'MANUAL_ONLY';
  allow_unassigned_fallback?: boolean;
  consider_leave_availability?: boolean;
  notify_manager_on_unassigned?: boolean;
  round_robin_state?: Record<string, string>;
  available_roles?: CRMAgentAssignmentRoleOption[];
  available_users?: CRMAgentAssignmentUserOption[];
  created_at?: string;
  updated_at?: string;
}

export interface ReferrerOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  member_number?: string | null;
}

export interface DuplicateCheckResult {
  has_duplicate: boolean;
  matches: Array<{
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    current_status: LeadStatus;
    created_at?: string | null;
  }>;
}

export interface CreateLeadPayload {
  first_name: string;
  last_name: string;
  phone_normalized?: string | null;
  email_normalized?: string | null;
  assignment_mode?: 'MANUAL' | 'AUTO';
  gender?: string | null;
  date_of_birth?: string | null;
  country?: string | null;
  area?: string | null;
  branch?: string | null;
  interested_program?: string | null;
  fitness_goal?: string | null;
  lead_source?: string | null;
  referred_by_user?: string | null;
  referred_by_name?: string | null;
  assigned_sales_user?: string | null;
  billing_name?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  attribution?: {
    lead_source_id?: string | null;
    platform?: string | null;
    campaign_name?: string | null;
    campaign_external_id?: string | null;
    ad_set_name?: string | null;
    ad_set_external_id?: string | null;
    ad_name?: string | null;
    ad_external_id?: string | null;
    form_name?: string | null;
    form_external_id?: string | null;
    external_lead_id?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    landing_page_url?: string | null;
    referrer_url?: string | null;
    capture_method?: string | null;
  };
}

export interface LeadSource {
  id: string;
  organization: string;
  code: string;
  name: string;
  source_type: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface LeadStatusHistory {
  id: string;
  lead: string;
  from_status?: string | null;
  to_status: string;
  reason_code?: string | null;
  reason_text?: string | null;
  changed_by_user?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead: string;
  content: string;
  is_pinned: boolean;
  created_by_user?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialBooking {
  id: string;
  lead: string;
  lead_name?: string;
  branch: string;
  branch_name?: string;
  assigned_trainer_profile?: string | null;
  trainer_name?: string | null;
  trial_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'BOOKED' | 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED' | 'CONVERTED';
  booking_source: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'VISIT'
  | 'MEETING'
  | 'FOLLOW_UP'
  | 'TRIAL'
  | 'PAYMENT_LINK'
  | 'OTHER';

export interface LeadActivity {
  id: string;
  lead: string;
  lead_name?: string;
  lead_phone?: string;
  lead_status?: string;
  branch_name?: string;
  activity_type: ActivityType;
  outcome?: string | null;
  notes?: string | null;
  performed_by_user?: string | null;
  performed_by_name?: string | null;
  activity_at: string;
  external_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export type FollowupTaskType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'MEETING'
  | 'PAYMENT'
  | 'TRIAL_FOLLOWUP'
  | 'REJOIN'
  | 'OTHER';

export interface SalesFollowupTask {
  id: string;
  lead: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_status?: string;
  branch_id?: string | null;
  branch_name?: string | null;
  assigned_to_user: string;
  assigned_to_name?: string;
  created_by_user?: string;
  created_by_name?: string;
  task_type: FollowupTaskType | string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  due_at: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  outcome?: string | null;
  next_followup_at?: string | null;
  is_overdue?: boolean;
  last_activity?: {
    activity_type: string;
    outcome?: string | null;
    activity_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface WorkQueueCounts {
  overdue: number;
  due_today: number;
  due_later: number;
  high_priority: number;
  completed_today: number;
  total_pending: number;
}

export interface CreateActivityPayload {
  lead: string;
  activity_type: ActivityType;
  outcome?: string;
  notes?: string;
  activity_at?: string;
  external_reference?: string;
}

export interface CreateFollowupPayload {
  lead: string;
  assigned_to_user?: string;
  task_type: FollowupTaskType | string;
  due_at: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  outcome?: string;
}

export interface CRMStageSlaPolicy {
  id: string;
  organization: string;
  canonical_stage: LeadStatus;
  display_label: string;
  response_target_value: number;
  response_target_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  is_enabled: boolean;
  escalation_enabled: boolean;
  escalation_after_value?: number | null;
  escalation_after_unit?: 'MINUTES' | 'HOURS' | 'DAYS' | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CRMTrialReminderPolicy {
  id: string;
  organization: string;
  immediate_whatsapp: boolean;
  immediate_email: boolean;
  immediate_sms: boolean;
  reminder_offsets: number[];
  ask_attendance_confirmation: boolean;
  confirmation_wait_duration_value: number;
  confirmation_wait_duration_unit: 'HOURS' | 'DAYS';
  no_response_action: 'CREATE_FOLLOWUP' | 'NOTIFY_AGENT' | 'NONE';
  ai_calling_enabled: boolean;
  post_attended_followup_enabled: boolean;
  post_attended_followup_delay_value?: number | null;
  post_attended_followup_delay_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  no_show_followup_enabled: boolean;
  no_show_followup_delay_value?: number | null;
  no_show_followup_delay_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  created_at: string;
  updated_at: string;
}

export type TrialBookingStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type TrialConfirmationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RESCHEDULE_REQUESTED'
  | 'DECLINED'
  | 'CANCELLED';

export type TrialConfirmationChannel =
  | 'MANUAL'
  | 'PHONE'
  | 'IN_PERSON'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'API';

export interface TrialBooking {
  id: string;
  organization: string;
  branch: string;
  branch_name?: string;
  lead: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  class_occurrence: string;
  class_name?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  trainer_name?: string;
  status: TrialBookingStatus;
  confirmation_status: TrialConfirmationStatus;
  confirmation_channel?: TrialConfirmationChannel | null;
  confirmation_requested_at?: string | null;
  confirmed_at?: string | null;
  cancellation_reason?: string | null;
  rescheduled_from?: string | null;
  is_rescheduled?: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialStatusHistory {
  id: string;
  trial_booking: string;
  from_status: string;
  to_status: string;
  reason_code?: string | null;
  changed_by_user?: string | null;
  changed_by_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface TrialSlot {
  occurrence_id: string;
  class_name: string;
  class_template_id?: string;
  class_category?: string;
  program_id?: string | null;
  program_name?: string | null;
  branch_id: string;
  branch_name: string;
  trainer_id?: string | null;
  trainer_name?: string;
  date?: string;
  occurrence_date?: string;
  start_at?: string;
  end_at?: string;
  start_time: string;
  end_time: string;
  delivery_mode?: string;
  booking_capacity?: number;
  capacity?: number;
  total_capacity: number;
  booked_count?: number;
  total_booked: number;
  remaining_capacity: number;
  available_spots?: number;
  trial_capacity: number;
  trial_booked: number;
  trial_booked_count?: number;
  remaining_trial_capacity: number;
  available_trial_spots?: number;
  is_available: boolean;
  policy_allowed: boolean;
  policy_message?: string;
}

export interface TrialSummaryCounts {
  total: number;
  booked: number;
  confirmed: number;
  attended: number;
  no_show: number;
  rescheduled: number;
  cancelled: number;
  reschedule_requested: number;
  today: number;
  upcoming: number;
}

export interface TrialReminderSchedulePoint {
  name: string;
  scheduled_at: string;
  channel: string;
  status: 'PENDING' | 'PAST';
  offset_minutes?: number;
}

export interface BookTrialPayload {
  lead_id: string;
  class_occurrence_id: string;
  branch_id?: string;
  notes?: string;
}

export interface RescheduleTrialPayload {
  new_class_occurrence_id: string;
  notes?: string;
}

export interface CRMCommunicationChannel {
  id: string;
  name: string;
  channel_type: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'VOICE_AI';
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'COMING_SOON';
  sender_identity: string;
  description: string;
  features: string[];
}

export interface NotificationTemplateItem {
  id: string;
  name: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  event_type: string;
  subject?: string;
  body: string;
  is_active: boolean;
  is_default: boolean;
}

export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'VOICE_AI';
export type CommunicationDirection = 'OUTBOUND' | 'INBOUND';
export type CommunicationStatus = 'QUEUED' | 'SUBMITTED' | 'SENT' | 'DELIVERED' | 'READ' | 'RECEIVED' | 'REPLIED' | 'FAILED' | 'CANCELLED';
export type CommunicationResolutionStatus = 'RESOLVED' | 'UNRESOLVED' | 'AMBIGUOUS';

export interface CommunicationStatusEvent {
  id: string;
  provider_event_id?: string | null;
  from_status: string;
  to_status: string;
  occurred_at: string;
  raw_metadata?: Record<string, any>;
  created_at: string;
}

export interface CommunicationMessage {
  id: string;
  organization: string;
  lead?: string | null;
  lead_name?: string | null;
  lead_phone?: string | null;
  lead_email?: string | null;
  resolution_status: CommunicationResolutionStatus;
  sender_identifier?: string;
  raw_sender_data?: Record<string, any>;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  purpose: 'TRANSACTIONAL' | 'MARKETING';
  recipient: string;
  sender: string;
  template?: string | null;
  template_reference?: string;
  subject?: string;
  body_snapshot: string;
  provider?: string;
  provider_message_id?: string | null;
  status: CommunicationStatus;
  idempotency_key?: string | null;
  queued_at: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  received_at?: string | null;
  replied_at?: string | null;
  failed_at?: string | null;
  failure_code?: string;
  failure_reason?: string;
  trigger_type: string;
  related_trial?: string | null;
  related_followup?: string | null;
  in_reply_to?: string | null;
  created_by_user?: string | null;
  created_by_user_name?: string;
  status_events?: CommunicationStatusEvent[];
  replies_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface SendCommunicationPayload {
  channel: CommunicationChannel;
  recipient: string;
  lead_id?: string;
  template_id?: string;
  subject?: string;
  body?: string;
  purpose?: 'TRANSACTIONAL' | 'MARKETING';
  idempotency_key?: string;
  trigger_type?: string;
}

// =========================================================================
// Automation Engine Types (Phase 6)
// =========================================================================

export type WorkflowStatus = 'ACTIVE' | 'INACTIVE';
export type WorkflowVersionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export type AutomationExecutionStatus = 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StepExecutionStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type AutomationStepType = 'ACTION' | 'CONDITION' | 'WAIT' | 'END';

export interface AutomationCondition {
  field: string;
  operator: string;
  value: any;
}

export interface AutomationTriggerConfig {
  conditions?: AutomationCondition[];
}

export interface AutomationStep {
  id: string;
  type: AutomationStepType;
  // ACTION
  action_code?: string;
  config?: Record<string, any>;
  next_step_id?: string;
  // CONDITION
  condition?: AutomationCondition;
  yes_step_id?: string;
  no_step_id?: string;
  // WAIT
  duration_value?: number;
  duration_unit?: 'MINUTES' | 'HOURS' | 'DAYS';
}

export interface AutomationWorkflowVersion {
  id: string;
  workflow: string;
  version_number: number;
  status: WorkflowVersionStatus;
  trigger_type: string;
  trigger_config: AutomationTriggerConfig;
  steps_definition: AutomationStep[];
  published_at?: string | null;
  published_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: WorkflowStatus;
  current_version?: string | null;
  current_version_detail?: AutomationWorkflowVersion | null;
  draft_version_detail?: AutomationWorkflowVersion | null;
  executions_count: number;
  failures_count: number;
  created_by_name?: string | null;
  trigger_type?: string;
  created_at: string;
  updated_at: string;
  versions?: AutomationWorkflowVersion[];
}

export interface AutomationStepExecution {
  id: string;
  step_id: string;
  step_type: string;
  status: StepExecutionStatus;
  resume_at?: string | null;
  attempt_count: number;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_code?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
}

export interface AutomationExecution {
  id: string;
  workflow: string;
  workflow_name: string;
  workflow_version: string;
  version_number: number;
  trigger_event_type: string;
  trigger_event_id: string;
  aggregate_type: string;
  aggregate_id: string;
  status: AutomationExecutionStatus;
  current_step_id?: string;
  waiting_until?: string | null;
  context_data?: Record<string, any>;
  execution_depth: number;
  attempt_count: number;
  error_code?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  step_executions?: AutomationStepExecution[];
}

export interface AutomationMetadata {
  triggers: Array<{ code: string; display_name: string; domain: string; description: string }>;
  operators: Array<{ code: string; display_name: string; description: string }>;
  condition_fields: Array<{ field: string; display_name: string; type: string; allowed_operators: string[] }>;
  actions: Array<{ code: string; display_name: string; domain: string; description: string; required_fields: string[] }>;
  wait_units: Array<{ code: string; label: string }>;
  channels: Array<{ code: string; label: string }>;
  dynamic_values: {
    lead_sources: Array<{ id: string; code: string; name: string }>;
    branches: Array<{ id: string; code: string; name: string }>;
    users: Array<{ id: string; email: string; full_name: string }>;
    lead_stages: Array<{ code: string; label: string }>;
    templates: Array<{ id: string; name: string; channel: string; event_type: string; body_template: string }>;
  };
}

// ---------------------------------------------------------------------------
// Phase 7: Stuck Lead & Next Best Action Engine Types
// ---------------------------------------------------------------------------

export type StuckReasonCode =
  | 'STAGE_SLA_BREACHED'
  | 'FOLLOWUP_OVERDUE'
  | 'TRIAL_RESCHEDULE_REQUESTED'
  | 'TRIAL_CONFIRMATION_PENDING'
  | 'TRIAL_NO_SHOW'
  | 'POST_TRIAL_FOLLOWUP_DUE'
  | 'TRIAL_NOT_BOOKED'
  | 'NO_FOLLOWUP'
  | 'NO_RESPONSE'
  | 'COMMUNICATION_FAILED'
  | 'UNASSIGNED_LEAD';

export type AttentionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface NextBestAction {
  action_code: string;
  display_name: string;
  reason: string;
  priority: AttentionSeverity;
  suggested_urgency: AttentionSeverity;
  target_ui_action:
    | 'ASSIGN_AGENT'
    | 'SCHEDULE_FOLLOWUP'
    | 'SEND_MESSAGE'
    | 'UPDATE_STAGE'
    | 'LOG_ACTIVITY'
    | 'BOOK_TRIAL'
    | 'CONFIRM_TRIAL'
    | 'RESCHEDULE_TRIAL'
    | 'VIEW_LEAD_360';
  required_permission: string;
  is_automation_executable: boolean;
  related_entity_id?: string | null;
}

export interface AttentionReasonItem {
  code: StuckReasonCode;
  display_name: string;
  description: string;
  severity: AttentionSeverity;
  overdue_seconds: number;
  due_at?: string | null;
  related_entity_id?: string | null;
  recommended_action_code?: string;
}

export interface LeadAttentionSummary {
  is_stuck: boolean;
  primary_reason?: StuckReasonCode | null;
  primary_reason_display?: string | null;
  severity: AttentionSeverity;
  overdue_by_seconds: number;
  stage_age_seconds: number;
  recommended_action?: NextBestAction | null;
}

export interface LeadAttentionFull extends LeadAttentionSummary {
  stage_entered_at?: string | null;
  sla_due_at?: string | null;
  last_activity_at?: string | null;
  next_followup_at?: string | null;
  reasons: AttentionReasonItem[];
  evaluated_at: string;
}

export interface AttentionQueueMetrics {
  stuck_leads: number;
  sla_breached: number;
  overdue_tasks: number;
  awaiting_response: number;
  total_active_leads: number;
}

export interface AttentionQueueResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Lead[];
  metrics: AttentionQueueMetrics;
}

export interface CRMAttentionPolicy {
  id: string;
  organization: string;
  is_enabled: boolean;
  sla_breach_attention_enabled: boolean;
  no_followup_attention_enabled: boolean;
  overdue_followup_attention_enabled: boolean;
  no_response_attention_enabled: boolean;
  no_response_wait_hours?: number | null;
  trial_not_booked_attention_enabled: boolean;
  trial_confirmation_attention_enabled: boolean;
  trial_no_show_attention_enabled: boolean;
  post_trial_followup_attention_enabled: boolean;
  unassigned_lead_attention_enabled: boolean;
  unassigned_wait_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// Phase 8 — Lead → Member Conversion Types
// ============================================================

export type PaymentProvider = 'CASH' | 'RAZORPAY' | 'ICICI_POS' | 'BANK_TRANSFER' | 'STRIPE' | 'OTHER';

export interface ConversionEligibility {
  eligible: boolean;
  reason: 'eligible' | 'already_converted' | 'no_branch' | string;
  message: string;
  existing_conversions?: Array<{
    id: string;
    converted_at: string;
    order_id: string | null;
    membership_id: string | null;
  }>;
}

export interface ConversionEntitlement {
  entitlement_type: string;
  allocated_units: string | null;
  is_unlimited: boolean;
}

export interface ConversionQuote {
  program: { id: string; name: string; code: string };
  package: { id: string; name: string; code: string };
  package_version: {
    id: string;
    version_number: number;
    name: string;
    duration_value: number;
    duration_unit: string;
    total_days: number | null;
    status: string;
  };
  package_price: {
    id: string;
    base_price: string;
    tax_percent: string;
    prices_include_tax: boolean;
    currency: string;
    effective_from: string;
    effective_until: string | null;
  };
  pricing: {
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total_payable: string;
    currency: string;
  };
  coupon: {
    is_valid: boolean;
    reason?: string;
    discount_amount?: string;
    coupon_code?: string;
  } | null;
  entitlements: ConversionEntitlement[];
  payment_providers: PaymentProvider[];
}

export interface ConversionPayload {
  package_version_id: string;
  branch_id: string;
  payment_provider: PaymentProvider;
  payment_amount: string;
  payment_method?: string;
  coupon_code?: string;
  start_date?: string;
  idempotency_key?: string;
}

export interface ConversionResult {
  conversion_id: string;
  lead_id: string;
  lead_status: 'CONVERTED';
  order_id: string;
  order_number: string;
  order_status: string;
  invoice_id: string | null;
  invoice_number: string | null;
  membership_id: string;
  membership_number: string;
  user_profile_id: string;
  identity_created: boolean;
  converted_at: string;
}

// Catalog types for package browser in wizard
export interface CatalogProgram {
  id: string;
  name: string;
  code: string;
  status: string;
  description?: string | null;
}

export interface CatalogPackage {
  id: string;
  program: string;
  program_name?: string;
  name: string;
  code: string;
  status: string;
  package_type?: string;
}

export interface CatalogPackageVersion {
  id: string;
  package: string;
  package_name?: string;
  program_name?: string;
  version_number: number;
  name_snapshot: string;
  status: string;
  duration_value: number;
  duration_unit: string;
  total_days: number | null;
  effective_price?: string | null;
  currency?: string;
}

// -------------------------------------------------------------------------
// CRM Phase 9: Marketing Acquisition Campaign Performance & Commercial Layer
// -------------------------------------------------------------------------

export interface CampaignPerformanceItem {
  id: string;
  campaign_name: string;
  platform: string;
  leads_count: number;
  trials_count: number;
  conversions_count: number;
  conversion_rate: number;
  paid_revenue: string;
}

export interface CampaignPerformanceSummary {
  total_campaigns: number;
  total_leads: number;
  total_trials: number;
  total_conversions: number;
  overall_conversion_rate: number;
  total_paid_revenue: string;
}

export interface CampaignPerformanceResponse {
  summary: CampaignPerformanceSummary;
  campaigns: CampaignPerformanceItem[];
}

export interface CampaignDrilldownConversion {
  id: string;
  lead_id: string;
  lead_name: string;
  member_name: string;
  converted_at: string;
  order_id: string | null;
  order_number: string | null;
  order_total: string;
  order_status: string | null;
}

export interface CampaignDrilldownRevenue {
  order_id: string;
  order_number: string;
  lead_name: string | null;
  amount: string;
  status: string;
  payment_provider: string;
  created_at: string;
}

export interface LeadOffersResponse {
  lead_id: string;
  lead_name: string;
  current_status: string;
  branch_id: string | null;
  branch_name: string | null;
  campaigns: any[];
  available_coupons: any[];
  redemptions: any[];
  conversion_offer: {
    conversion_id: string;
    converted_at: string;
    order_id: string | null;
    has_discount: boolean;
    coupon_code: string | null;
    campaign_name: string | null;
    discount_amount: string;
  } | null;
  rules: any[];
}

export interface CRMDashboardFilters {
  date_from: string;
  date_to: string;
  preset: string;
  branch_id: string;
  agent_id: string;
  lead_source_id: string;
  campaign_name: string;
  program_id: string;
  platform: string;
}

export interface CRMDashboardSummary {
  total_leads: number;
  new_leads: number;
  open_leads: number;
  converted_members: number;
  conversion_rate: number;
  trials_booked: number;
  trials_attended: number;
  trial_no_shows: number;
  overdue_followups: number;
  leads_requiring_attention: number;
  paid_revenue: string;
  gross_revenue: string;
  refund_amount: string;
}

export interface CRMLeadFunnelStage {
  status: string;
  display_label: string;
  count: number;
  percentage_of_total: number;
  conversion_from_previous_stage: number | null;
}

export interface CRMSourcePerformanceItem {
  source_id: string | null;
  source_name: string;
  source_type: string;
  leads: number;
  trials: number;
  conversions: number;
  conversion_rate: number;
  paid_revenue: string;
}

export interface CRMCampaignSummaryItem {
  id: string;
  campaign_name: string;
  platform: string;
  leads: number;
  trials: number;
  conversions: number;
  conversion_rate: number;
  paid_revenue: string;
}

export interface CRMTrialPerformanceSummary {
  booked: number;
  confirmed: number;
  attended: number;
  no_show: number;
  cancelled: number;
  converted_after_trial: number;
  attendance_rate: number;
  top_programs: Array<{ program_id: string; program_name: string; count: number }>;
}

export interface CRMFollowupPerformanceSummary {
  due_today: number;
  overdue: number;
  upcoming: number;
  completed: number;
  total_pending: number;
  completion_rate: number;
}

export interface CRMAttentionPerformanceSummary {
  stuck_leads: number;
  sla_breached: number;
  overdue_tasks: number;
  awaiting_response: number;
  total_active_leads: number;
}

export interface CRMAgentPerformanceItem {
  agent_id: string;
  agent_name: string;
  email: string;
  assigned_leads: number;
  activities: number;
  completed_followups: number;
  trials_booked: number;
  conversions: number;
  paid_revenue: string;
}

export interface CRMBranchPerformanceItem {
  branch_id: string;
  branch_name: string;
  code: string;
  leads: number;
  trials: number;
  conversions: number;
  conversion_rate: number;
  paid_revenue: string;
}

export interface CRMTrendBucket {
  date: string;
  display_date: string;
  leads: number;
  trials: number;
  conversions: number;
  paid_revenue: number;
}

export interface CRMDashboardResponse {
  filters: CRMDashboardFilters;
  summary: CRMDashboardSummary;
  funnel: CRMLeadFunnelStage[];
  sources: CRMSourcePerformanceItem[];
  campaigns: CRMCampaignSummaryItem[];
  trials: CRMTrialPerformanceSummary;
  followups: CRMFollowupPerformanceSummary;
  attention: CRMAttentionPerformanceSummary;
  agents: CRMAgentPerformanceItem[];
  branches: CRMBranchPerformanceItem[];
  trends: CRMTrendBucket[];
}




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
  current_status: LeadStatus;
  assigned_sales_user?: string | null;
  assigned_sales_name?: string | null;
  assigned_trainer_user?: string | null;
  first_touch_source?: string | null;
  latest_touch_source?: string | null;
  campaign_reference?: string | null;
  converted_user_profile?: string | null;
  created_at: string;
  updated_at: string;
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

export interface SalesFollowupTask {
  id: string;
  lead: string;
  lead_name?: string;
  assigned_to_user: string;
  assigned_to_name?: string;
  task_type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  due_at: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  outcome?: string | null;
  next_followup_at?: string | null;
  created_at: string;
  updated_at: string;
}

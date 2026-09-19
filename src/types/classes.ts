/**
 * Layer 2 Phase 4 TypeScript Types: Module E (Group Classes, Scheduling, Content Studio & Demand)
 */

export type DeliveryMode = 'OFFLINE' | 'ONLINE' | 'HYBRID';
export type ClassTemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ClassOccurrenceStatus = 'SCHEDULED' | 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TrainerOccurrenceRole = 'LEAD' | 'ASSISTANT' | 'SUBSTITUTE';

export interface ClassCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface ClassTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  category_name?: string;
  program?: string;
  program_name?: string;
  default_duration_minutes: number;
  default_capacity: number;
  default_trial_capacity: number;
  default_waitlist_capacity: number;
  default_delivery_mode: DeliveryMode;
  allow_booking: boolean;
  allow_trial: boolean;
  allow_waitlist: boolean;
  allow_reschedule: boolean;
  status: ClassTemplateStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ClassScheduleRule {
  id: string;
  class_template: string;
  template_name?: string;
  branch: string;
  branch_name?: string;
  days_of_week: number[]; // 1=Mon .. 7=Sun
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  capacity_override?: number;
  trial_capacity_override?: number;
  waitlist_capacity_override?: number;
  delivery_mode: DeliveryMode;
  valid_from: string; // YYYY-MM-DD
  valid_until?: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface ClassOccurrenceTrainerInfo {
  id: string;
  trainer_profile: string;
  trainer_name: string;
  trainer_code: string;
  trainer_role: TrainerOccurrenceRole;
  status: string;
}

export interface ClassOccurrence {
  id: string;
  class_template: string;
  template_name?: string;
  schedule_rule?: string;
  branch: string;
  branch_name?: string;
  occurrence_date: string;
  start_at: string;
  end_at: string;
  delivery_mode: DeliveryMode;
  capacity: number;
  trial_capacity: number;
  waitlist_capacity: number;
  status: ClassOccurrenceStatus;
  assigned_trainers?: ClassOccurrenceTrainerInfo[];
  created_at?: string;
}

export interface ClassContentItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'VIDEO' | 'PDF' | 'AUDIO' | 'PLAYLIST' | 'DOCUMENT';
  media_file?: string;
  external_url?: string;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface ClassContentAssignment {
  id: string;
  occurrence: string;
  content_item: string;
  content_title?: string;
  rotation_cycle_number: number;
  rotation_position: number;
  assignment_method: 'ROTATION' | 'MANUAL' | 'OVERRIDE';
  assigned_at: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
}

export interface ClassDemandPlanningRun {
  id: string;
  branch: string;
  branch_name?: string;
  planning_from: string;
  planning_to: string;
  algorithm_version?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary_notes?: string;
  created_at?: string;
}

export interface ClassScheduleRecommendation {
  id: string;
  planning_run: string;
  class_template: string;
  template_name?: string;
  branch: string;
  branch_name?: string;
  recommended_date: string;
  recommended_start_time: string;
  predicted_demand_score?: number;
  recommendation_reason?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPLIED';
}

export interface ClassPrice {
  id: string;
  class_template: string;
  branch?: string;
  branch_name?: string;
  version_number: number;
  currency: string;
  price: string | number;
  tax_percent: string | number;
  effective_from: string;
  effective_until?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  created_at?: string;
}

export interface ClassBranchAvailability {
  id: string;
  class_template: string;
  branch: string;
  branch_name?: string;
  status: 'ENABLED' | 'DISABLED';
  capacity_override?: number;
  trial_capacity_override?: number;
  waitlist_capacity_override?: number;
  created_at?: string;
}

export interface ClassContentMapping {
  id: string;
  content_item: string;
  content_title?: string;
  class_template?: string;
  class_category?: string;
  program?: string;
  trainer_specialty?: string;
  branch?: string;
  delivery_mode?: DeliveryMode;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface TrainerProfileOption {
  id: string;
  trainer_code: string;
  trainer_name?: string;
  specialties?: Array<{ id: string; name: string; code: string }>;
  trainer_status?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

export interface ProgramOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

export interface ClassesMetadataOption<T = string> {
  value: T;
  label: string;
  full_name?: string;
}

export interface ClassesMetadata {
  statuses: ClassesMetadataOption<string>[];
  delivery_modes: ClassesMetadataOption<DeliveryMode>[];
  recurrence_types: ClassesMetadataOption<string>[];
  weekdays: ClassesMetadataOption<number>[];
  trainer_roles: ClassesMetadataOption<TrainerOccurrenceRole>[];
  content_types: ClassesMetadataOption<string>[];
  branch_avail_statuses: ClassesMetadataOption<string>[];
}



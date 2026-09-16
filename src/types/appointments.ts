/**
 * Layer 2 Phase 5 TypeScript Types: Module F (Individual Appointments)
 */

export type AppointmentStatus = 'RESERVED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentDeliveryMode = 'OFFLINE' | 'ONLINE' | 'HYBRID';
export type AppointmentBookingSource = 'WEB' | 'MOBILE_APP' | 'FRONT_DESK' | 'ADMIN' | 'API' | 'OTHER';
export type TrainerAppointmentRole = 'LEAD' | 'ASSISTANT' | 'SUBSTITUTE';

export interface AppointmentTypeSpecialtyRequirement {
  id: string;
  appointment_type: string;
  trainer_specialty: string;
  specialty_name?: string;
  specialty_code?: string;
  minimum_proficiency_level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  is_mandatory: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AppointmentType {
  id: string;
  organization?: string;
  code: string;
  name: string;
  description?: string;
  default_duration_minutes: number;
  default_delivery_mode: AppointmentDeliveryMode;
  requires_trainer: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  specialty_requirements?: AppointmentTypeSpecialtyRequirement[];
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentTrainerInfo {
  id: string;
  appointment: string;
  trainer_profile: string;
  trainer_name?: string;
  trainer_code?: string;
  role: TrainerAppointmentRole;
  status: 'ASSIGNED' | 'CONFIRMED' | 'CANCELLED' | 'REPLACED';
  assigned_at?: string;
}

export interface Appointment {
  id: string;
  appointment_type: string;
  appointment_type_name?: string;
  user_profile: string;
  member_name?: string;
  member_number?: string;
  branch: string;
  branch_name?: string;
  membership_id?: string;
  entitlement_id?: string;
  start_at: string;
  end_at: string;
  delivery_mode: AppointmentDeliveryMode;
  online_join_url?: string;
  status: AppointmentStatus;
  booking_source: AppointmentBookingSource;
  notes?: string;
  assigned_trainers?: AppointmentTrainerInfo[];
  created_at?: string;
  updated_at?: string;
}

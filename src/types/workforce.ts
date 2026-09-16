/**
 * src/types/workforce.ts — Frontend TypeScript Interfaces for Layer 2 Module A: Workforce & Trainers
 */

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CONSULTANT' | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'NOTICE_PERIOD' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';
export type TrainerStatus = 'ACTIVE' | 'INACTIVE';
export type ProficiencyLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type DeliveryMode = 'GROUP' | 'INDIVIDUAL' | 'ONLINE';

export interface SpecialtySummary {
  id: string;
  code: string;
  name: string;
  proficiency_level: ProficiencyLevel;
  allow_group: boolean;
  allow_individual: boolean;
  allow_online: boolean;
  is_primary: boolean;
}

export interface TrainerProfile {
  id: string;
  employee_profile: string;
  trainer_code: string;
  trainer_name?: string;
  employee_code?: string;
  email?: string;
  bio?: string;
  experience_years?: number | string;
  trainer_status: TrainerStatus;
  can_teach_all_specialties: boolean;
  minimum_schedule_buffer_minutes: number;
  specialties?: SpecialtySummary[];
  created_at: string;
  updated_at: string;
}

export interface TrainerSpecialty {
  id: string;
  organization: string;
  code: string;
  name: string;
  category?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface TrainerSpecialtyAssignment {
  id: string;
  trainer_profile: string;
  trainer_specialty: string;
  specialty_code?: string;
  specialty_name?: string;
  trainer_code?: string;
  branch?: string | null;
  proficiency_level: ProficiencyLevel;
  allow_group: boolean;
  allow_individual: boolean;
  allow_online: boolean;
  is_primary: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface EmployeeWorkSchedule {
  id: string;
  employee_profile: string;
  employee_name?: string;
  branch: string;
  branch_name?: string;
  day_of_week: number; // 1=Mon ... 7=Sun
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_until?: string | null;
  schedule_type: 'REGULAR' | 'TEMPORARY';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface EmployeeScheduleException {
  id: string;
  employee_profile: string;
  employee_name?: string;
  branch?: string | null;
  branch_name?: string | null;
  exception_date: string;
  exception_type: 'LEAVE' | 'WEEKLY_OFF' | 'UNAVAILABLE' | 'SPECIAL_SHIFT' | 'OTHER';
  is_available: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface AvailabilityCheckResult {
  is_available: boolean;
  reason: string;
  details?: {
    code?: string;
    trainer_id?: string;
    trainer_code?: string;
    branch_id?: string;
    buffer_minutes?: number;
    type?: string;
  };
}

export interface EligibleTrainer {
  trainer_id: string;
  trainer_code: string;
  full_name: string;
  email: string;
  buffer_minutes: number;
  details: {
    code?: string;
    branch_id?: string;
  };
}

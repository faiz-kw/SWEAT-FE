/**
 * src/services/workforceApi.ts — API Client for Layer 2 Module A: Workforce & Trainers
 */

import { api } from '../client';
import type {
  TrainerProfile,
  TrainerSpecialty,
  TrainerSpecialtyAssignment,
  EmployeeWorkSchedule,
  EmployeeScheduleException,
  AvailabilityCheckResult,
  EligibleTrainer,
} from '@/types/workforce';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const workforceApi = {
  // Trainers
  getTrainers: async (params?: {
    trainer_status?: string;
    search?: string;
    branch_id?: string;
  }): Promise<TrainerProfile[]> => {
    const query = new URLSearchParams();
    if (params?.trainer_status && params.trainer_status !== 'ALL') {
      query.append('trainer_status', params.trainer_status);
    }
    if (params?.branch_id && params.branch_id !== 'ALL' && params.branch_id !== '') {
      query.append('branch_id', params.branch_id);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const qStr = query.toString();
    const endpoint = `/tenant/trainer-profiles/${qStr ? `?${qStr}` : ''}`;
    const res = await api.get<PaginatedResponse<TrainerProfile> | TrainerProfile[]>(endpoint);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getTrainer: async (id: string): Promise<TrainerProfile> => {
    const res = await api.get<TrainerProfile>(`/tenant/trainer-profiles/${id}/`);
    return res.data;
  },

  createTrainer: async (payload: Record<string, any>): Promise<TrainerProfile> => {
    const res = await api.post<TrainerProfile>('/tenant/trainer-profiles/', payload);
    return res.data;
  },

  updateTrainer: async (id: string, payload: Record<string, any>): Promise<TrainerProfile> => {
    const res = await api.patch<TrainerProfile>(`/tenant/trainer-profiles/${id}/`, payload);
    return res.data;
  },

  deleteTrainer: async (id: string): Promise<void> => {
    await api.delete(`/tenant/trainer-profiles/${id}/`);
  },

  checkAvailability: async (
    trainerId: string,
    params: {
      start_datetime: string;
      branch_id: string;
      duration_minutes?: number;
      delivery_mode?: string;
      specialty_code?: string;
      min_proficiency?: string;
    }
  ): Promise<AvailabilityCheckResult> => {
    const query = new URLSearchParams();
    query.append('start_datetime', params.start_datetime);
    query.append('branch_id', params.branch_id);
    if (params.duration_minutes) query.append('duration_minutes', String(params.duration_minutes));
    if (params.delivery_mode) query.append('delivery_mode', params.delivery_mode);
    if (params.specialty_code) query.append('specialty_code', params.specialty_code);
    if (params.min_proficiency) query.append('min_proficiency', params.min_proficiency);

    const res = await api.get<AvailabilityCheckResult>(
      `/tenant/trainer-profiles/${trainerId}/check-availability/?${query.toString()}`
    );
    return res.data;
  },

  findEligibleTrainers: async (params: {
    start_datetime: string;
    branch_id: string;
    duration_minutes?: number;
    delivery_mode?: string;
    specialty_code?: string;
    min_proficiency?: string;
  }): Promise<EligibleTrainer[]> => {
    const query = new URLSearchParams();
    query.append('start_datetime', params.start_datetime);
    query.append('branch_id', params.branch_id);
    if (params.duration_minutes) query.append('duration_minutes', String(params.duration_minutes));
    if (params.delivery_mode) query.append('delivery_mode', params.delivery_mode);
    if (params.specialty_code) query.append('specialty_code', params.specialty_code);
    if (params.min_proficiency) query.append('min_proficiency', params.min_proficiency);

    const res = await api.get<{ count: number; results: EligibleTrainer[] }>(
      `/tenant/trainer-profiles/find-eligible/?${query.toString()}`
    );
    return res.data.results ?? [];
  },

  // Specialties
  getSpecialties: async (): Promise<TrainerSpecialty[]> => {
    const res = await api.get<PaginatedResponse<TrainerSpecialty> | TrainerSpecialty[]>('/tenant/trainer-specialties/');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  // Schedules
  getWorkSchedules: async (
    employeeProfileId?: string,
    branchId?: string,
    filters?: { week_start?: string; week_end?: string; for_date?: string }
  ): Promise<EmployeeWorkSchedule[]> => {
    const params = new URLSearchParams();
    if (employeeProfileId) params.append('employee_profile_id', employeeProfileId);
    if (branchId) params.append('branch_id', branchId);
    if (filters?.week_start) params.append('week_start', filters.week_start);
    if (filters?.week_end) params.append('week_end', filters.week_end);
    if (filters?.for_date) params.append('for_date', filters.for_date);
    const qStr = params.toString();
    const res = await api.get<PaginatedResponse<EmployeeWorkSchedule> | EmployeeWorkSchedule[]>(
      `/tenant/work-schedules/${qStr ? `?${qStr}` : ''}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  bulkSyncWorkSchedules: async (payload: {
    employee_profile_id: string;
    branch_id: string;
    week_start_date?: string;
    week_end_date?: string | null;
    apply_mode?: 'SPECIFIC_WEEK' | 'RECURRING_FROM_WEEK';
    schedules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      valid_from?: string;
      valid_until?: string | null;
      schedule_type?: string;
    }>;
  }): Promise<EmployeeWorkSchedule[]> => {
    const res = await api.post<EmployeeWorkSchedule[]>('/tenant/work-schedules/bulk-sync/', payload);
    return res.data;
  },

  // Schedule Exceptions
  getScheduleExceptions: async (params?: {
    employee_profile_id?: string;
    branch_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<EmployeeScheduleException[]> => {
    const query = new URLSearchParams();
    if (params?.employee_profile_id) query.append('employee_profile_id', params.employee_profile_id);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    const qStr = query.toString();
    const res = await api.get<PaginatedResponse<EmployeeScheduleException> | EmployeeScheduleException[]>(
      `/tenant/schedule-exceptions/${qStr ? `?${qStr}` : ''}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  createScheduleException: async (payload: Partial<EmployeeScheduleException>): Promise<EmployeeScheduleException> => {
    const res = await api.post<EmployeeScheduleException>('/tenant/schedule-exceptions/', payload);
    return res.data;
  },

  deleteScheduleException: async (id: string): Promise<void> => {
    await api.delete(`/tenant/schedule-exceptions/${id}/`);
  },
};

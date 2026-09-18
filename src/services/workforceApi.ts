/**
 * src/services/workforceApi.ts — API Client for Layer 2 Module A: Workforce & Trainers
 */

import { api } from './api';
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
  getTrainers: async (params?: { trainer_status?: string; search?: string }): Promise<TrainerProfile[]> => {
    const query = new URLSearchParams();
    if (params?.trainer_status && params.trainer_status !== 'ALL') {
      query.append('trainer_status', params.trainer_status);
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
  getWorkSchedules: async (employeeProfileId?: string): Promise<EmployeeWorkSchedule[]> => {
    const qStr = employeeProfileId ? `?employee_profile_id=${employeeProfileId}` : '';
    const res = await api.get<PaginatedResponse<EmployeeWorkSchedule> | EmployeeWorkSchedule[]>(
      `/tenant/work-schedules/${qStr}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  // Schedule Exceptions
  getScheduleExceptions: async (employeeProfileId?: string): Promise<EmployeeScheduleException[]> => {
    const qStr = employeeProfileId ? `?employee_profile_id=${employeeProfileId}` : '';
    const res = await api.get<PaginatedResponse<EmployeeScheduleException> | EmployeeScheduleException[]>(
      `/tenant/schedule-exceptions/${qStr}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },
};

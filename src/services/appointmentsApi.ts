/**
 * Layer 2 Phase 5 API Service: Module F (Individual Appointments)
 * Zero mock data fallback — all responses come directly from authenticated tenant APIs.
 */

import { api } from './api';
import {
  AppointmentType,
  AppointmentTypeSpecialtyRequirement,
  Appointment,
  AppointmentTrainerInfo,
} from '../types/appointments';

export const appointmentsApi = {
  // --- Appointment Types ---
  async getAppointmentTypes(): Promise<AppointmentType[]> {
    const res = await api.get<any>('/tenant/appointment-types/');
    return res.data?.results || res.data || [];
  },

  async createAppointmentType(data: Partial<AppointmentType>): Promise<AppointmentType> {
    const res = await api.post<AppointmentType>('/tenant/appointment-types/', data);
    return res.data;
  },

  // --- Appointments ---
  async getAppointments(filters?: {
    branch_id?: string;
    user_profile_id?: string;
    date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    const res = await api.get<any>('/tenant/appointments/', { params: filters });
    return res.data?.results || res.data || [];
  },

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    const res = await api.post<Appointment>('/tenant/appointments/', data);
    return res.data;
  },

  async assignTrainer(
    appointmentId: string,
    trainerProfileId: string,
    role: string = 'LEAD'
  ): Promise<AppointmentTrainerInfo> {
    const res = await api.post<AppointmentTrainerInfo>(
      `/tenant/appointments/${appointmentId}/assign-trainer/`,
      { trainer_profile_id: trainerProfileId, role }
    );
    return res.data;
  },

  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    const res = await api.post<Appointment>(
      `/tenant/appointments/${appointmentId}/cancel/`,
      { reason }
    );
    return res.data;
  },

  async completeAppointment(appointmentId: string): Promise<Appointment> {
    const res = await api.post<Appointment>(
      `/tenant/appointments/${appointmentId}/complete/`
    );
    return res.data;
  },
};

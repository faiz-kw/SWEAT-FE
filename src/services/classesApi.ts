/**
 * Layer 2 Phase 4 API Service: Module E (Group Classes, Scheduling, Content Studio & Demand Planning)
 * Zero mock data fallback — all responses come directly from authenticated tenant APIs.
 */

import { api } from './api';
import {
  ClassCategory,
  ClassTemplate,
  ClassScheduleRule,
  ClassOccurrence,
  ClassContentItem,
  ClassContentMapping,
  ClassDemandPlanningRun,
  ClassScheduleRecommendation,
  ClassPrice,
  ClassBranchAvailability,
  TrainerProfileOption,
  BranchOption,
  ProgramOption,
  ClassesMetadata,
} from '../types/classes';

export const classesApi = {
  // --- Class Categories ---
  async getCategories(): Promise<ClassCategory[]> {
    const res = await api.get<any>('/tenant/class-categories/');
    return res.data?.results || res.data || [];
  },

  async createCategory(data: Partial<ClassCategory>): Promise<ClassCategory> {
    const res = await api.post<ClassCategory>('/tenant/class-categories/', data);
    return res.data;
  },

  async updateCategory(id: string, data: Partial<ClassCategory>): Promise<ClassCategory> {
    const res = await api.patch<ClassCategory>(`/tenant/class-categories/${id}/`, data);
    return res.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/tenant/class-categories/${id}/`);
  },

  // --- Class Templates ---
  async getTemplates(categoryId?: string): Promise<ClassTemplate[]> {
    const params = categoryId ? { category_id: categoryId } : {};
    const res = await api.get<any>('/tenant/class-templates/', { params });
    return res.data?.results || res.data || [];
  },

  async createTemplate(data: Partial<ClassTemplate>): Promise<ClassTemplate> {
    const res = await api.post<ClassTemplate>('/tenant/class-templates/', data);
    return res.data;
  },

  async updateTemplate(id: string, data: Partial<ClassTemplate>): Promise<ClassTemplate> {
    const res = await api.patch<ClassTemplate>(`/tenant/class-templates/${id}/`, data);
    return res.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/tenant/class-templates/${id}/`);
  },

  // --- Class Schedule Rules ---
  async getScheduleRules(branchId?: string): Promise<ClassScheduleRule[]> {
    const params = branchId ? { branch_id: branchId } : {};
    const res = await api.get<any>('/tenant/class-schedule-rules/', { params });
    return res.data?.results || res.data || [];
  },

  async createScheduleRule(data: Partial<ClassScheduleRule>): Promise<ClassScheduleRule> {
    const res = await api.post<ClassScheduleRule>('/tenant/class-schedule-rules/', data);
    return res.data;
  },

  async updateScheduleRule(id: string, data: Partial<ClassScheduleRule>): Promise<ClassScheduleRule> {
    const res = await api.patch<ClassScheduleRule>(`/tenant/class-schedule-rules/${id}/`, data);
    return res.data;
  },

  async deleteScheduleRule(id: string): Promise<void> {
    await api.delete(`/tenant/class-schedule-rules/${id}/`);
  },

  async generateOccurrencesFromRule(ruleId: string, fromDate: string, toDate: string): Promise<any> {
    const res = await api.post<any>(`/tenant/class-schedule-rules/${ruleId}/generate-occurrences/`, {
      from_date: fromDate,
      to_date: toDate,
    });
    return res.data;
  },

  // --- Class Occurrences ---
  async getOccurrences(filters?: {
    branch_id?: string;
    occurrence_date?: string;
    status?: string;
    trainer_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ClassOccurrence[]> {
    const res = await api.get<any>('/tenant/class-occurrences/', { params: filters });
    return res.data?.results || res.data || [];
  },

  async getBookingsForOccurrence(occurrenceId: string): Promise<any[]> {
    const res = await api.get<any>('/tenant/bookings/', { params: { occurrence_id: occurrenceId } });
    return res.data?.results || res.data || [];
  },

  async recordAttendance(
    bookingId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NO_SHOW',
    biometrics?: {
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      distance_meters?: number | null;
      face_verified?: boolean;
      liveness_score?: number | null;
      liveness_method?: string;
      selfie_image?: string;
      challenges_passed?: string[];
      check_in_method?: string;
    }
  ): Promise<any> {
    const res = await api.post<any>(`/tenant/bookings/${bookingId}/record-attendance/`, {
      status,
      check_in_method: biometrics?.check_in_method || (biometrics?.face_verified ? 'FACE_LIVENESS' : 'MANUAL'),
      ...biometrics,
    });
    return res.data;
  },

  async trainerCheckIn(
    occurrenceId: string,
    biometrics: {
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      distance_meters?: number | null;
      face_verified?: boolean;
      liveness_score?: number | null;
      liveness_method?: string;
      selfie_image?: string;
      challenges_passed?: string[];
    }
  ): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/trainer-check-in/`, {
      ...biometrics,
      liveness_method: biometrics.liveness_method || 'FACE_LIVENESS',
    });
    return res.data;
  },

  async getBranchHolidays(branchId?: string): Promise<any[]> {
    const params = branchId ? { branch_id: branchId } : {};
    const res = await api.get<any>('/tenant/branch-operating-exceptions/', { params });
    return res.data?.results || res.data || [];
  },

  async createOccurrence(data: any): Promise<ClassOccurrence> {
    const res = await api.post<ClassOccurrence>('/tenant/class-occurrences/', data);
    return res.data;
  },

  async updateOccurrence(id: string, data: Partial<ClassOccurrence>): Promise<ClassOccurrence> {
    const res = await api.patch<ClassOccurrence>(`/tenant/class-occurrences/${id}/`, data);
    return res.data;
  },

  async cancelOccurrence(id: string): Promise<ClassOccurrence> {
    const res = await api.patch<ClassOccurrence>(`/tenant/class-occurrences/${id}/`, { status: 'CANCELLED' });
    return res.data;
  },

  async assignTrainer(occurrenceId: string, trainerProfileId: string, trainerRole: string = 'LEAD'): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/assign-trainer/`, {
      trainer_profile_id: trainerProfileId,
      trainer_role: trainerRole,
    });
    return res.data;
  },

  async assignContent(occurrenceId: string): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/assign-content/`);
    return res.data;
  },

  async rotateContent(occurrenceId: string): Promise<any> {
    return this.assignContent(occurrenceId);
  },

  // --- Branch Availability & Pricing ---
  async getBranchAvailabilities(templateId?: string): Promise<ClassBranchAvailability[]> {
    const res = await api.get<any>('/tenant/class-branch-availabilities/');
    const all = res.data?.results || res.data || [];
    if (templateId) {
      return all.filter((a: any) => a.class_template === templateId);
    }
    return all;
  },

  async createBranchAvailability(data: Partial<ClassBranchAvailability>): Promise<ClassBranchAvailability> {
    const res = await api.post<ClassBranchAvailability>('/tenant/class-branch-availabilities/', data);
    return res.data;
  },

  async getClassPrices(templateId?: string): Promise<ClassPrice[]> {
    const res = await api.get<any>('/tenant/class-prices/');
    const all = res.data?.results || res.data || [];
    if (templateId) {
      return all.filter((p: any) => p.class_template === templateId);
    }
    return all;
  },

  async createClassPrice(data: Partial<ClassPrice>): Promise<ClassPrice> {
    const res = await api.post<ClassPrice>('/tenant/class-prices/', data);
    return res.data;
  },

  // --- External Dependencies (Real Backend Endpoints) ---
  async getBranches(): Promise<BranchOption[]> {
    const res = await api.get<any>('/tenant/branches/');
    return res.data?.results || res.data || [];
  },

  async getBranchWorkingHours(branchId: string): Promise<any[]> {
    const res = await api.get<any>('/tenant/branch-working-hours/', { params: { branch: branchId } });
    return res.data?.results || res.data || [];
  },

  async getBranchOperatingExceptions(branchId: string): Promise<any[]> {
    const res = await api.get<any>('/tenant/branch-operating-exceptions/', { params: { branch: branchId } });
    return res.data?.results || res.data || [];
  },

  async getTrainers(): Promise<TrainerProfileOption[]> {
    const res = await api.get<any>('/tenant/trainer-profiles/');
    return res.data?.results || res.data || [];
  },

  async getPrograms(): Promise<ProgramOption[]> {
    const res = await api.get<any>('/tenant/programs/');
    return res.data?.results || res.data || [];
  },

  // --- Content Studio ---
  async getContentItems(): Promise<ClassContentItem[]> {
    const res = await api.get<any>('/tenant/class-content-items/');
    return res.data?.results || res.data || [];
  },

  async createContentItem(data: Partial<ClassContentItem>): Promise<ClassContentItem> {
    const res = await api.post<ClassContentItem>('/tenant/class-content-items/', data);
    return res.data;
  },

  async updateContentItem(id: string, data: Partial<ClassContentItem>): Promise<ClassContentItem> {
    const res = await api.patch<ClassContentItem>(`/tenant/class-content-items/${id}/`, data);
    return res.data;
  },

  async deleteContentItem(id: string): Promise<void> {
    await api.delete(`/tenant/class-content-items/${id}/`);
  },

  async getContentMappings(): Promise<ClassContentMapping[]> {
    const res = await api.get<any>('/tenant/class-content-mappings/');
    return res.data?.results || res.data || [];
  },

  async createContentMapping(data: Partial<ClassContentMapping>): Promise<ClassContentMapping> {
    const res = await api.post<ClassContentMapping>('/tenant/class-content-mappings/', data);
    return res.data;
  },

  // --- Demand Planning & Recommendations ---
  async getDemandRuns(branchId?: string): Promise<ClassDemandPlanningRun[]> {
    const params = branchId ? { branch_id: branchId } : {};
    const res = await api.get<any>('/tenant/class-demand-planning-runs/', { params });
    return res.data?.results || res.data || [];
  },

  async getRecommendations(runId?: string): Promise<ClassScheduleRecommendation[]> {
    const params = runId ? { planning_run_id: runId } : {};
    const res = await api.get<any>('/tenant/class-schedule-recommendations/', { params });
    return res.data?.results || res.data || [];
  },

  // --- Classes Metadata & Configuration ---
  async getClassesMetadata(): Promise<ClassesMetadata> {
    const res = await api.get<ClassesMetadata>('/tenant/classes/metadata/');
    return res.data;
  },

  // --- Audit Events ---
  async getAuditEvents(params?: { entity_type?: string; entity_id?: string; action?: string }): Promise<any[]> {
    const res = await api.get<any>('/tenant/business-audit-events/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },
};

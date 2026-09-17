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
  ClassContentAssignment,
  ClassDemandPlanningRun,
  ClassScheduleRecommendation,
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

  // --- Class Templates ---
  async getTemplates(): Promise<ClassTemplate[]> {
    const res = await api.get<any>('/tenant/class-templates/');
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

  async generateOccurrencesFromRule(ruleId: string, fromDate: string, toDate: string): Promise<any> {
    const res = await api.post<any>(`/tenant/class-schedule-rules/${ruleId}/generate-occurrences/`, {
      from_date: fromDate,
      to_date: toDate,
    });
    return res.data;
  },

  // --- Class Occurrences ---
  async getOccurrences(filters?: { branch_id?: string; occurrence_date?: string; status?: string }): Promise<ClassOccurrence[]> {
    const res = await api.get<any>('/tenant/class-occurrences/', { params: filters });
    return res.data?.results || res.data || [];
  },

  async createOccurrence(data: Partial<ClassOccurrence>): Promise<ClassOccurrence> {
    const res = await api.post<ClassOccurrence>('/tenant/class-occurrences/', data);
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

  // --- Content Studio ---
  async getContentItems(): Promise<ClassContentItem[]> {
    const res = await api.get<any>('/tenant/class-content-items/');
    return res.data?.results || res.data || [];
  },

  async createContentItem(data: Partial<ClassContentItem>): Promise<ClassContentItem> {
    const res = await api.post<ClassContentItem>('/tenant/class-content-items/', data);
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
};

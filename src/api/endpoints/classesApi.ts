/**
 * Layer 2 Phase 4 API Service: Module E (Group Classes, Scheduling, Content Studio & Demand Planning)
 * Zero mock data fallback — all responses come directly from authenticated tenant APIs.
 */

import { api } from '../client';
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
  ClassCancellationPreview,
} from '@/types/classes';

export const classesApi = {
  // --- Class Categories ---
  async getCategories(params?: { status?: string }): Promise<ClassCategory[]> {
    const res = await api.get<any>('/tenant/class-categories/', { params: params || { status: 'ACTIVE' } });
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
  async getTemplates(paramsOrCategoryId?: string | { category_id?: string; status?: string }): Promise<ClassTemplate[]> {
    const params = typeof paramsOrCategoryId === 'string'
      ? { category_id: paramsOrCategoryId, status: 'ACTIVE' }
      : { status: 'ACTIVE', ...(paramsOrCategoryId || {}) };
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

  async getScheduleRulesPaginated(params?: {
    branch_id?: string | undefined;
    category_id?: string | undefined;
    category_code?: string | undefined;
    status?: string | undefined;
    date?: string | undefined;
    from_date?: string | undefined;
    to_date?: string | undefined;
    day_of_week?: string | number | undefined;
    search?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    results: ClassScheduleRule[];
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    summary?: { total_count?: number; active_count?: number; inactive_count?: number };
  }> {
    const res = await api.get<any>('/tenant/class-schedule-rules/', { params: params as any });
    const data = res.data;
    const results: ClassScheduleRule[] = Array.isArray(data) ? data : (data?.results || []);
    const pageSize = params?.page_size || data?.page_size || 24;
    const count = typeof data?.count === 'number' ? data.count : results.length;
    const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : Math.max(1, Math.ceil(count / pageSize));
    return {
      results,
      count,
      total_pages: totalPages,
      current_page: data?.current_page || params?.page || 1,
      page_size: pageSize,
      summary: data?.summary,
    };
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
    branch_id?: string | undefined;
    category_id?: string | undefined;
    category_code?: string | undefined;
    occurrence_date?: string | undefined;
    status?: string | undefined;
    trainer_id?: string | undefined;
    from_date?: string | undefined;
    to_date?: string | undefined;
    membership_id?: string | undefined;
    user_profile_id?: string | undefined;
    search?: string | undefined;
    check_in_status?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
    ordering?: string | undefined;
  }): Promise<ClassOccurrence[]> {
    const res = await api.get<any>('/tenant/class-occurrences/', { params: (filters || {}) as any });
    return res.data?.results || res.data || [];
  },

  async getOccurrencesPaginated(filters?: {
    branch_id?: string | undefined;
    category_id?: string | undefined;
    category_code?: string | undefined;
    occurrence_date?: string | undefined;
    status?: string | undefined;
    trainer_id?: string | undefined;
    from_date?: string | undefined;
    to_date?: string | undefined;
    membership_id?: string | undefined;
    user_profile_id?: string | undefined;
    search?: string | undefined;
    check_in_status?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    results: ClassOccurrence[];
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
  }> {
    const res = await api.get<any>('/tenant/class-occurrences/', { params: (filters || {}) as any });
    const data = res.data;
    const results: ClassOccurrence[] = Array.isArray(data) ? data : (data?.results || []);
    const pageSize = filters?.page_size || data?.page_size || 20;
    const count = typeof data?.count === 'number' ? data.count : results.length;
    const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : Math.max(1, Math.ceil(count / pageSize));
    return {
      results,
      count,
      total_pages: totalPages,
      current_page: data?.current_page || filters?.page || 1,
      page_size: pageSize,
    };
  },

  async getOccurrence(occurrenceId: string): Promise<ClassOccurrence> {
    const res = await api.get<any>(`/tenant/class-occurrences/${occurrenceId}/`);
    return res.data;
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

  async getCancellationPreview(id: string): Promise<ClassCancellationPreview> {
    const res = await api.get<ClassCancellationPreview>(`/tenant/class-occurrences/${id}/cancellation-preview/`);
    return res.data;
  },

  async cancelOccurrence(
    id: string,
    payload?: {
      reason?: string;
      notify_members?: boolean;
      restore_credits?: boolean;
      mode?: 'CANCELLED' | 'DEACTIVATED';
    }
  ): Promise<any> {
    const res = await api.post(`/tenant/class-occurrences/${id}/cancel/`, payload || {});
    return res.data;
  },

  async restoreOccurrence(id: string): Promise<any> {
    const res = await api.post(`/tenant/class-occurrences/${id}/restore/`, {});
    return res.data;
  },

  async deleteOccurrence(id: string): Promise<void> {
    await api.delete(`/tenant/class-occurrences/${id}/`);
  },

  async updateOccurrenceVideo(
    occurrenceId: string,
    videoUrl: string,
    description?: string,
    extra?: { targeted_muscles?: string[]; equipment_required?: string[] }
  ): Promise<any> {
    const res = await api.post(`/tenant/class-occurrences/${occurrenceId}/update-video/`, {
      video_url: videoUrl,
      description,
      targeted_muscles: extra?.targeted_muscles,
      equipment_required: extra?.equipment_required,
    });
    return res.data;
  },

  async getAvailableTags(): Promise<{ muscles: string[]; equipment: string[]; all_tags?: any[] }> {
    try {
      const res = await api.get<any>('/tenant/class-occurrences/available-tags/');
      return res.data || { muscles: [], equipment: [] };
    } catch (err) {
      return { muscles: [], equipment: [] };
    }
  },

  async assignTrainer(occurrenceId: string, trainerProfileId: string, trainerRole: string = 'LEAD'): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/assign-trainer/`, {
      trainer_profile_id: trainerProfileId,
      trainer_role: trainerRole,
    });
    return res.data;
  },

  async unassignTrainer(occurrenceId: string, trainerProfileId?: string, assignmentId?: string): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/unassign-trainer/`, {
      trainer_profile_id: trainerProfileId,
      assignment_id: assignmentId,
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

  // --- Trainer Class Video Streaming ---
  async getTrainerClassVideo(occurrenceId: string): Promise<{
    occurrence_id: string;
    class_name: string;
    movement_title?: string;
    trainer_name?: string;
    video_url?: string;
    embed_player_url?: string;
    is_assigned_trainer: boolean;
    description?: string;
    instructions?: string;
    targeted_muscles?: string[];
    equipment_required?: string[];
  }> {
    const res = await api.get<any>(`/tenant/class-occurrences/${occurrenceId}/trainer-video/`);
    return res.data;
  },

  async assignOccurrenceVideo(occurrenceId: string, videoId: string | null): Promise<any> {
    const res = await api.post<any>(`/tenant/class-occurrences/${occurrenceId}/assign-video/`, {
      video_id: videoId,
    });
    return res.data;
  },

  async getAvailableWorkoutVideos(params?: {
    category?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
  }): Promise<{
    count: number;
    results: Array<{
      id: string;
      title: string;
      description: string;
      video_url: string;
      embed_url: string;
      date: string;
      category_code: string;
      program: string;
      sheet: string;
      targeted_muscles: string;
      equipment_required: string;
      classification_status: string;
    }>;
  }> {
    const res = await api.get<any>('/tenant/class-occurrences/available-videos/', { params: (params || {}) as any });
    return res.data;
  },

  async simulateWorkoutVideos(data: FormData | { rows: any[]; target_month?: string }): Promise<any> {
    const isFormData = data instanceof FormData;
    const res = await api.post<any>(
      '/tenant/excel-imports/simulate-workout-videos/',
      data,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return res.data;
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

  async createBranchAvailability(data: any): Promise<ClassBranchAvailability> {
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

  async createClassPrice(data: any): Promise<ClassPrice> {
    const res = await api.post<ClassPrice>('/tenant/class-prices/', data);
    return res.data;
  },

  // --- External Dependencies (Real Backend Endpoints) ---
  async getBranches(): Promise<BranchOption[]> {
    const res = await api.get<any>('/tenant/branches/?status=ACTIVE');
    const list = res.data?.results || res.data || [];
    return Array.isArray(list)
      ? list.filter((b: any) => b.is_active !== false && b.status !== 'INACTIVE')
      : [];
  },

  async getBranchWorkingHours(branchId: string): Promise<any[]> {
    const res = await api.get<any>('/tenant/branch-working-hours/', { params: { branch: branchId } });
    return res.data?.results || res.data || [];
  },

  async getBranchOperatingExceptions(branchId: string): Promise<any[]> {
    const res = await api.get<any>('/tenant/branch-operating-exceptions/', { params: { branch: branchId } });
    return res.data?.results || res.data || [];
  },

  async getTrainers(params?: { trainer_status?: string; page_size?: number }): Promise<TrainerProfileOption[]> {
    const res = await api.get<any>('/tenant/trainer-profiles/', {
      params: { trainer_status: 'ACTIVE', page_size: 250, ...(params || {}) }
    });
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

  async createContentItem(data: any): Promise<ClassContentItem> {
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

  async createContentMapping(data: any): Promise<ClassContentMapping> {
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
  async getAuditEvents(params?: { entity_type?: string | undefined; entity_id?: string | undefined; action?: string | undefined }): Promise<any[]> {
    const res = await api.get<any>('/tenant/business-audit-events/', { params: (params || {}) as any });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },
};

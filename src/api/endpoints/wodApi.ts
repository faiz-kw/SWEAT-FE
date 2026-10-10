/**
 * Workout of the Day (WOD) — Phase 1 API Service
 * Admin-Only Workout Content Library, Tag Master, Video Upload & Link Auto-Download, and Excel Import.
 */

import { api } from '../client';

export type WODTagGroup =
  | 'PROGRAM'
  | 'SECTION'
  | 'USER_LEVEL'
  | 'INTENSITY'
  | 'MUSCLE_GROUP'
  | 'BODY_TARGET'
  | 'BREATHING'
  | 'EQUIPMENT'
  | 'MOVEMENT_FAMILY';

export interface WorkoutTag {
  id: string;
  organization?: string;
  tag_group: WODTagGroup | string;
  code: string;
  name: string;
  description?: string | null;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type WODContentKind = 'MOVEMENT' | 'SETUP' | 'INSTRUCTION' | 'TECHNIQUE' | 'OTHER';
export type WODClassificationStatus = 'COMPLETE' | 'INCOMPLETE' | 'NEEDS_REVIEW';
export type WODItemStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type WODVideoProvider = 'UPLOAD' | 'GOOGLE_DRIVE' | 'YOUTUBE' | 'ZATA' | 'EXTERNAL' | null;
export type WODVideoDownloadStatus = 'NONE' | 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export interface WorkoutContentItem {
  id: string;
  organization: string;
  movement_name: string;
  description?: string | null;
  feedback?: string | null;
  resistance_springs?: string | null;
  breathing_notes?: string | null;
  regression_text?: string | null;
  regression_url?: string | null;

  video_provider?: WODVideoProvider;
  video_url?: string | null;
  private_video_url?: string | null;

  video_file?: string | null;
  video_storage_path?: string | null;
  video_file_name?: string | null;
  video_file_size?: number | null;
  video_mime_type?: string | null;
  video_download_status: WODVideoDownloadStatus;
  video_download_error?: string | null;
  video_downloaded_at?: string | null;

  has_video: boolean;
  has_stored_video: boolean;
  playback_video_url: string;

  folder_number?: string | null;
  cue_1?: string | null;
  cue_2?: string | null;
  cue_3?: string | null;

  shot_by?: string | null;
  shot_date?: string | null;
  editor?: string | null;
  edit_date?: string | null;
  edit_checked: boolean;

  requirement_cut?: string | null;
  youtube_public: boolean;
  reference_shoot_url?: string | null;

  content_kind: WODContentKind;
  is_wod_eligible: boolean;
  classification_status: WODClassificationStatus;
  missing_requirements: string[];
  status: WODItemStatus;

  tags: WorkoutTag[];
  tags_by_group: Record<string, WorkoutTag[]>;
  raw_import_data?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface WODContentSummary {
  total_count: number;
  active_count: number;
  wod_eligible_count: number;
  complete_count: number;
  incomplete_count: number;
  needs_review_count: number;
  setup_instruction_count: number;
  missing_video_count: number;
  video_downloaded_count: number;
  video_failed_count: number;
}

export interface WODPaginatedResponse {
  results: WorkoutContentItem[];
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  summary: WODContentSummary;
}

export interface WODImportPreviewRow {
  row_number: number;
  movement_name: string;
  content_kind: WODContentKind;
  description?: string | null;
  feedback?: string | null;
  resistance_springs?: string | null;
  breathing_notes?: string | null;
  regression_text?: string | null;
  regression_url?: string | null;
  video_provider?: WODVideoProvider;
  video_url?: string | null;
  private_video_url?: string | null;
  folder_number?: string | null;
  cue_1?: string | null;
  cue_2?: string | null;
  cue_3?: string | null;
  shot_by?: string | null;
  shot_date?: string | null;
  editor?: string | null;
  edit_date?: string | null;
  edit_checked: boolean;
  requirement_cut?: string | null;
  youtube_public: boolean;
  reference_shoot_url?: string | null;
  tags_by_group: Record<string, string[]>;
  classification_status: WODClassificationStatus;
  is_wod_eligible: boolean;
  missing_video: boolean;
  broken_video_link: boolean;
  missing_tags: boolean;
  is_duplicate: boolean;
  exists_in_db: boolean;
  issues: string[];
  raw_import_data: Record<string, any>;
}

export interface WODImportPreviewResponse {
  summary: {
    total_rows: number;
    movement_rows: number;
    setup_instruction_rows: number;
    complete_rows: number;
    incomplete_rows: number;
    needs_review_rows: number;
    missing_video_rows: number;
    broken_video_rows: number;
    missing_tags_rows: number;
    duplicate_rows: number;
  };
  rows: WODImportPreviewRow[];
}

export interface WODImportConfirmResponse {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  downloaded_videos_count: number;
  failed_video_downloads_count: number;
  total_processed: number;
  item_ids: string[];
}

export const wodApi = {
  // --- Workout Tags ---
  async getTags(params?: { tag_group?: string; status?: string; search?: string }): Promise<WorkoutTag[]> {
    const res = await api.get<any>('/tenant/wod/tags/', { params: params as any });
    return Array.isArray(res.data) ? res.data : res.data?.results || [];
  },

  async createTag(data: Partial<WorkoutTag>): Promise<WorkoutTag> {
    const res = await api.post<WorkoutTag>('/tenant/wod/tags/', data);
    return res.data;
  },

  async updateTag(id: string, data: Partial<WorkoutTag>): Promise<WorkoutTag> {
    const res = await api.patch<WorkoutTag>(`/tenant/wod/tags/${id}/`, data);
    return res.data;
  },

  async activateTag(id: string): Promise<WorkoutTag> {
    const res = await api.post<WorkoutTag>(`/tenant/wod/tags/${id}/activate/`);
    return res.data;
  },

  async deactivateTag(id: string): Promise<WorkoutTag> {
    const res = await api.post<WorkoutTag>(`/tenant/wod/tags/${id}/deactivate/`);
    return res.data;
  },

  // --- Workout Content Items ---
  async getContentItems(params?: {
    search?: string;
    program?: string;
    section?: string;
    user_level?: string;
    intensity?: string;
    muscle_group?: string;
    body_target?: string;
    equipment?: string;
    breathing?: string;
    movement_family?: string;
    content_kind?: string;
    status?: string;
    classification_status?: string;
    is_wod_eligible?: string | boolean;
    missing_video?: string | boolean;
    video_download_status?: string;
    page?: number;
    page_size?: number;
  }): Promise<WODPaginatedResponse> {
    const res = await api.get<any>('/tenant/wod/content-items/', { params: params as any });
    const data = res.data;
    const results: WorkoutContentItem[] = Array.isArray(data) ? data : data?.results || [];
    const pageSize = params?.page_size || data?.page_size || 50;
    const count = typeof data?.count === 'number' ? data.count : results.length;
    const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : Math.max(1, Math.ceil(count / pageSize));
    return {
      results,
      count,
      total_pages: totalPages,
      current_page: data?.current_page || params?.page || 1,
      page_size: pageSize,
      summary: data?.summary || {
        total_count: count,
        active_count: 0,
        wod_eligible_count: 0,
        complete_count: 0,
        incomplete_count: 0,
        needs_review_count: 0,
        setup_instruction_count: 0,
        missing_video_count: 0,
        video_downloaded_count: 0,
        video_failed_count: 0,
      },
    };
  },

  async getContentItem(id: string): Promise<WorkoutContentItem> {
    const res = await api.get<WorkoutContentItem>(`/tenant/wod/content-items/${id}/`);
    return res.data;
  },

  async createContentItem(data: Record<string, any> | FormData): Promise<WorkoutContentItem> {
    const res = await api.post<WorkoutContentItem>('/tenant/wod/content-items/', data);
    return res.data;
  },

  async updateContentItem(id: string, data: Record<string, any> | FormData): Promise<WorkoutContentItem> {
    const res = await api.patch<WorkoutContentItem>(`/tenant/wod/content-items/${id}/`, data);
    return res.data;
  },

  async deleteContentItem(id: string): Promise<void> {
    await api.delete(`/tenant/wod/content-items/${id}/`);
  },

  async activateContentItem(id: string): Promise<WorkoutContentItem> {
    const res = await api.post<WorkoutContentItem>(`/tenant/wod/content-items/${id}/activate/`);
    return res.data;
  },

  async deactivateContentItem(id: string): Promise<WorkoutContentItem> {
    const res = await api.post<WorkoutContentItem>(`/tenant/wod/content-items/${id}/deactivate/`);
    return res.data;
  },

  async setWodEligibility(id: string, is_wod_eligible: boolean): Promise<WorkoutContentItem> {
    const res = await api.post<WorkoutContentItem>(`/tenant/wod/content-items/${id}/set-wod-eligibility/`, {
      is_wod_eligible,
    });
    return res.data;
  },

  async uploadVideo(id: string, videoFile: File): Promise<WorkoutContentItem> {
    const formData = new FormData();
    formData.append('video_file', videoFile);
    const res = await api.post<WorkoutContentItem>(`/tenant/wod/content-items/${id}/upload-video/`, formData);
    return res.data;
  },

  async downloadVideoFromLink(id: string, video_url?: string): Promise<WorkoutContentItem> {
    const res = await api.post<WorkoutContentItem>(
      `/tenant/wod/content-items/${id}/download-video/`,
      video_url ? { video_url } : {}
    );
    return res.data;
  },

  async downloadPendingVideos(): Promise<{ processed_count: number; completed_count: number; failed_count: number }> {
    const res = await api.post<any>('/tenant/wod/content-items/download-pending-videos/');
    return res.data;
  },

  async previewImport(file?: File, rows?: any[]): Promise<WODImportPreviewResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<WODImportPreviewResponse>('/tenant/wod/content-items/import/preview/', formData);
      return res.data;
    }
    const res = await api.post<WODImportPreviewResponse>('/tenant/wod/content-items/import/preview/', { rows });
    return res.data;
  },

  async confirmImport(payload: {
    file?: File;
    rows?: any[];
    duplicate_strategy?: 'UPDATE' | 'SKIP';
    auto_download_videos?: boolean;
  }): Promise<WODImportConfirmResponse> {
    if (payload.file && !payload.rows) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.duplicate_strategy) {
        formData.append('duplicate_strategy', payload.duplicate_strategy);
      }
      formData.append('auto_download_videos', String(payload.auto_download_videos ?? true));
      const res = await api.post<WODImportConfirmResponse>('/tenant/wod/content-items/import/confirm/', formData);
      return res.data;
    }
    const res = await api.post<WODImportConfirmResponse>('/tenant/wod/content-items/import/confirm/', {
      rows: payload.rows,
      duplicate_strategy: payload.duplicate_strategy || 'UPDATE',
      auto_download_videos: payload.auto_download_videos ?? true,
    });
    return res.data;
  },
};

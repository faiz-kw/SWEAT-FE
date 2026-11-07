import { api } from '../client';
import { CMSBanner, ProgramCategoryMedia, CMSMediaAsset } from '@/types/cms';

export const cmsApi = {
  // --- Banners ---
  async getBanners(params?: { placement?: string; is_active?: boolean }): Promise<CMSBanner[]> {
    const res = await api.get<any>('/cms/banners/', { params });
    return res.data?.results || res.data || [];
  },

  async createBanner(data: Partial<CMSBanner>): Promise<CMSBanner> {
    const res = await api.post<CMSBanner>('/cms/banners/', data);
    return res.data;
  },

  async updateBanner(id: string, data: Partial<CMSBanner>): Promise<CMSBanner> {
    const res = await api.patch<CMSBanner>(`/cms/banners/${id}/`, data);
    return res.data;
  },

  async deleteBanner(id: string): Promise<void> {
    await api.delete(`/cms/banners/${id}/`);
  },

  async reorderBanners(items: { id: string; display_order: number }[]): Promise<any> {
    const res = await api.post('/cms/banners/reorder/', { items });
    return res.data;
  },

  async uploadBannerMedia(file: File, mediaType?: 'VIDEO' | 'IMAGE'): Promise<{ url: string; file_name: string; media_type: 'VIDEO' | 'IMAGE'; file_size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    if (mediaType) {
      formData.append('media_type', mediaType);
    }
    const res = await api.post<any>('/cms/banners/upload-media/', formData);
    return res.data;
  },

  // --- Category Media ---
  async getCategories(params?: { is_active?: boolean }): Promise<ProgramCategoryMedia[]> {
    const res = await api.get<any>('/cms/categories/', { params });
    return res.data?.results || res.data || [];
  },

  async updateCategoryMedia(id: string, data: Partial<ProgramCategoryMedia>): Promise<ProgramCategoryMedia> {
    const res = await api.patch<ProgramCategoryMedia>(`/cms/categories/${id}/`, data);
    return res.data;
  },

  async syncCategories(): Promise<any> {
    const res = await api.post('/cms/categories/sync-categories/');
    return res.data;
  },

  // --- Media Library ---
  async getMediaAssets(params?: { media_type?: string; search?: string }): Promise<CMSMediaAsset[]> {
    const res = await api.get<any>('/cms/media/', { params });
    return res.data?.results || res.data || [];
  },

  async createMediaAsset(data: Partial<CMSMediaAsset>): Promise<CMSMediaAsset> {
    const res = await api.post<CMSMediaAsset>('/cms/media/', data);
    return res.data;
  },

  async updateMediaAsset(id: string, data: Partial<CMSMediaAsset>): Promise<CMSMediaAsset> {
    const res = await api.patch<CMSMediaAsset>(`/cms/media/${id}/`, data);
    return res.data;
  },

  async deleteMediaAsset(id: string): Promise<void> {
    await api.delete(`/cms/media/${id}/`);
  },
};

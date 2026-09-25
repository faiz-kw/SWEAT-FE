import { api } from '../client';
import type {
  Package,
  PackageVersion,
  Program,
  ProgramTypeItem,
  ProgramCategory,
  TermsDocument,
  TermsDocumentVersion,
  TermsAcceptance,
} from '@/types/catalog';

export const catalogApi = {
  // Packages
  async getPackages(params?: { program_id?: string; status?: string }): Promise<Package[]> {
    const res = await api.get<any>('/tenant/packages/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async getPackage(id: string): Promise<Package> {
    const res = await api.get<Package>(`/tenant/packages/${id}/`);
    return res.data;
  },

  async createPackage(payload: {
    code?: string;
    name: string;
    program?: string | null;
    status?: string;
  }): Promise<Package> {
    const res = await api.post<Package>('/tenant/packages/', payload);
    return res.data;
  },

  async updatePackage(
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      program?: string | null;
      status?: string;
    }>
  ): Promise<Package> {
    const res = await api.patch<Package>(`/tenant/packages/${id}/`, payload);
    return res.data;
  },

  async createPackageVersion(
    packageId: string,
    payload: {
      name_snapshot: string;
      duration_value: number;
      duration_unit: string;
      total_days?: number | null;
      validity_days?: number | null;
      is_trial_package?: boolean;
      is_trial?: boolean;
      only_for_trial?: boolean;
      show_on_web?: boolean;
      show_on_app?: boolean;
      description_snapshot?: string | null;
      status?: string;
      sale_price?: number | string;
      base_price?: number | string;
      display_price?: number | string;
      prices_include_tax?: boolean;
      tax_percentage?: number | string;
      max_sessions?: number | string;
      passport_sessions?: number | string;
      passport_cost?: number | string;
      publish_immediately?: boolean;
      [key: string]: any;
    }
  ): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(
      `/tenant/packages/${packageId}/create-version/`,
      payload
    );
    return res.data;
  },

  async publishPackageVersion(
    packageId: string,
    packageVersionId: string
  ): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(
      `/tenant/packages/${packageId}/publish-version/`,
      { package_version_id: packageVersionId }
    );
    return res.data;
  },

  async cloneModifyPackageVersion(
    packageId: string,
    packageVersionId: string,
    modifications: Record<string, any>
  ): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(
      `/tenant/packages/${packageId}/clone-modify-version/`,
      {
        package_version_id: packageVersionId,
        modifications,
      }
    );
    return res.data;
  },

  // Programs
  async getPrograms(params?: { category_id?: string; status?: string }): Promise<Program[]> {
    const res = await api.get<any>('/tenant/programs/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async getProgram(id: string): Promise<Program> {
    const res = await api.get<Program>(`/tenant/programs/${id}/`);
    return res.data;
  },

  async createProgram(payload: {
    code?: string;
    name: string;
    program_type: string;
    category?: string | null;
    description?: string | null;
    trial_allowed?: boolean;
  }): Promise<Program> {
    const res = await api.post<Program>('/tenant/programs/', payload);
    return res.data;
  },

  async updateProgram(
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      program_type: string;
      category?: string | null;
      description?: string | null;
      trial_allowed?: boolean;
      status?: string;
    }>
  ): Promise<Program> {
    const res = await api.patch<Program>(`/tenant/programs/${id}/`, payload);
    return res.data;
  },

  // Program Categories
  async getProgramCategories(): Promise<ProgramCategory[]> {
    const res = await api.get<any>('/tenant/program-categories/');
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createProgramCategory(payload: {
    code?: string;
    name: string;
    description?: string | null;
    display_order?: number;
  }): Promise<ProgramCategory> {
    const res = await api.post<ProgramCategory>('/tenant/program-categories/', payload);
    return res.data;
  },

  // Program Types
  async getProgramTypes(params?: { status?: string }): Promise<ProgramTypeItem[]> {
    const res = await api.get<any>('/tenant/program-types/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createProgramType(payload: {
    code?: string;
    name: string;
    description?: string | null;
    display_order?: number;
  }): Promise<ProgramTypeItem> {
    const res = await api.post<ProgramTypeItem>('/tenant/program-types/', payload);
    return res.data;
  },

  async updateProgramType(
    id: string,
    payload: Partial<{
      name: string;
      description?: string | null;
      display_order?: number;
      status?: 'ACTIVE' | 'INACTIVE';
    }>
  ): Promise<ProgramTypeItem> {
    const res = await api.patch<ProgramTypeItem>(`/tenant/program-types/${id}/`, payload);
    return res.data;
  },

  // Terms Documents
  async getTermsDocuments(params?: { status?: string }): Promise<TermsDocument[]> {
    const res = await api.get<any>('/tenant/terms-documents/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createTermsDocument(payload: {
    code?: string;
    name: string;
    document_type: string;
    status?: string;
  }): Promise<TermsDocument> {
    const res = await api.post<TermsDocument>('/tenant/terms-documents/', payload);
    return res.data;
  },

  async publishTermsVersion(
    termsDocumentId: string,
    termsDocumentVersionId: string
  ): Promise<TermsDocumentVersion> {
    const res = await api.post<TermsDocumentVersion>(
      `/tenant/terms-documents/${termsDocumentId}/publish-version/`,
      { terms_document_version_id: termsDocumentVersionId }
    );
    return res.data;
  },

  async getTermsDocumentVersions(termsDocumentId: string): Promise<TermsDocumentVersion[]> {
    const res = await api.get<any>('/tenant/terms-document-versions/', {
      params: { terms_document_id: termsDocumentId },
    });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createTermsDocumentVersion(payload: {
    terms_document: string;
    content_text?: string | null;
    effective_from: string;
    effective_until?: string | null;
  }): Promise<TermsDocumentVersion> {
    const res = await api.post<TermsDocumentVersion>('/tenant/terms-document-versions/', payload);
    return res.data;
  },

  // Terms Acceptances
  async getTermsAcceptances(params?: { user_profile_id?: string; lead_id?: string }): Promise<TermsAcceptance[]> {
    const res = await api.get<any>('/tenant/terms-acceptances/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async recordTermsAcceptance(payload: {
    terms_document_version_id: string;
    accepted_via: string;
    lead_id?: string | null;
    user_profile_id?: string | null;
    order_id?: string | null;
    device_metadata?: Record<string, any>;
  }): Promise<TermsAcceptance> {
    const res = await api.post<TermsAcceptance>('/tenant/terms-acceptances/', payload);
    return res.data;
  },

  // Audit Events
  async getAuditEvents(params?: { entity_type?: string; entity_id?: string; action?: string }): Promise<any[]> {
    const res = await api.get<any>('/tenant/business-audit-events/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },
};

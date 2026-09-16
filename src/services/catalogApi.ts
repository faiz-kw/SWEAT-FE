import { api } from './api';
import type {
  Package,
  PackageVersion,
  Program,
  ProgramCategory,
  TermsDocument,
  TermsDocumentVersion,
  TermsAcceptance,
} from '@/types/catalog';

export const catalogApi = {
  // Packages
  async getPackages(params?: { program_id?: string; status?: string }): Promise<Package[]> {
    const res = await api.get<any>('/api/v1/tenant/packages/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createPackage(payload: {
    code: string;
    name: string;
    program?: string | null;
    status?: string;
  }): Promise<Package> {
    const res = await api.post<Package>('/api/v1/tenant/packages/', payload);
    return res.data;
  },

  async createPackageVersion(
    packageId: string,
    payload: {
      name_snapshot: string;
      duration_value: number;
      duration_unit: string;
      validity_days?: number | null;
      is_trial_package?: boolean;
      description_snapshot?: string | null;
      status?: string;
    }
  ): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(
      `/api/v1/tenant/packages/${packageId}/create-version/`,
      payload
    );
    return res.data;
  },

  async publishPackageVersion(
    packageId: string,
    packageVersionId: string
  ): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(
      `/api/v1/tenant/packages/${packageId}/publish-version/`,
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
      `/api/v1/tenant/packages/${packageId}/clone-modify-version/`,
      {
        package_version_id: packageVersionId,
        modifications,
      }
    );
    return res.data;
  },

  // Programs
  async getPrograms(params?: { category_id?: string; status?: string }): Promise<Program[]> {
    const res = await api.get<any>('/api/v1/tenant/programs/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createProgram(payload: {
    code: string;
    name: string;
    program_type: string;
    category?: string | null;
    description?: string | null;
    trial_allowed?: boolean;
  }): Promise<Program> {
    const res = await api.post<Program>('/api/v1/tenant/programs/', payload);
    return res.data;
  },

  // Program Categories
  async getProgramCategories(): Promise<ProgramCategory[]> {
    const res = await api.get<any>('/api/v1/tenant/program-categories/');
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createProgramCategory(payload: {
    code: string;
    name: string;
    description?: string | null;
    display_order?: number;
  }): Promise<ProgramCategory> {
    const res = await api.post<ProgramCategory>('/api/v1/tenant/program-categories/', payload);
    return res.data;
  },

  // Terms Documents
  async getTermsDocuments(params?: { status?: string }): Promise<TermsDocument[]> {
    const res = await api.get<any>('/api/v1/tenant/terms-documents/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createTermsDocument(payload: {
    code: string;
    name: string;
    document_type: string;
    status?: string;
  }): Promise<TermsDocument> {
    const res = await api.post<TermsDocument>('/api/v1/tenant/terms-documents/', payload);
    return res.data;
  },

  async publishTermsVersion(
    termsDocumentId: string,
    termsDocumentVersionId: string
  ): Promise<TermsDocumentVersion> {
    const res = await api.post<TermsDocumentVersion>(
      `/api/v1/tenant/terms-documents/${termsDocumentId}/publish-version/`,
      { terms_document_version_id: termsDocumentVersionId }
    );
    return res.data;
  },

  // Terms Acceptances
  async getTermsAcceptances(params?: { user_profile_id?: string; lead_id?: string }): Promise<TermsAcceptance[]> {
    const res = await api.get<any>('/api/v1/tenant/terms-acceptances/', { params });
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
    const res = await api.post<TermsAcceptance>('/api/v1/tenant/terms-acceptances/', payload);
    return res.data;
  },
};

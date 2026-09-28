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
  async getPackages(params?: { program_id?: string; branch_id?: string; status?: string }): Promise<Package[]> {
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
    program: string;
    available_branch_ids?: string[];
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
      available_branch_ids?: string[];
      status?: string;
    }>
  ): Promise<Package> {
    const res = await api.patch<Package>(`/tenant/packages/${id}/`, payload);
    return res.data;
  },

  async deactivatePackage(id: string): Promise<Package> {
    const res = await api.post<Package>(`/tenant/packages/${id}/deactivate/`);
    return res.data;
  },

  async reactivatePackage(id: string): Promise<Package> {
    const res = await api.post<Package>(`/tenant/packages/${id}/reactivate/`);
    return res.data;
  },

  async archivePackage(id: string): Promise<Package> {
    const res = await api.post<Package>(`/tenant/packages/${id}/archive/`);
    return res.data;
  },

  async restorePackage(id: string): Promise<Package> {
    const res = await api.post<Package>(`/tenant/packages/${id}/restore/`);
    return res.data;
  },

  async deletePackage(id: string): Promise<void> {
    await api.delete(`/tenant/packages/${id}/`);
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
      branch_id?: string | null;
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

  async publishPackageVersionDirect(versionId: string): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(`/tenant/package-versions/${versionId}/publish/`);
    return res.data;
  },

  async retirePackageVersion(versionId: string): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(`/tenant/package-versions/${versionId}/retire/`);
    return res.data;
  },

  async reusePackageVersion(versionId: string): Promise<PackageVersion> {
    const res = await api.post<PackageVersion>(`/tenant/package-versions/${versionId}/reuse/`);
    return res.data;
  },

  async deletePackageVersion(versionId: string): Promise<void> {
    await api.delete(`/tenant/package-versions/${versionId}/`);
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

  async getPackageVersions(params?: { package_id?: string; status?: string }): Promise<PackageVersion[]> {
    const res = await api.get<any>('/tenant/package-versions/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  // Package Prices
  async getPackagePrices(params?: { package_version_id?: string }): Promise<any[]> {
    const res = await api.get<any>('/tenant/package-prices/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createPackagePrice(payload: {
    package_version: string;
    branch?: string | null;
    currency?: string;
    base_price: number | string;
    display_price?: number | string | null;
    prices_include_tax?: boolean;
    tax_percent?: number | string;
    effective_from?: string;
    effective_until?: string | null;
    status?: string;
  }): Promise<any> {
    const res = await api.post<any>('/tenant/package-prices/', payload);
    return res.data;
  },

  async updatePackagePrice(
    id: string,
    payload: Partial<{
      branch?: string | null;
      currency?: string;
      base_price: number | string;
      display_price?: number | string | null;
      prices_include_tax?: boolean;
      tax_percent?: number | string;
      effective_from?: string;
      effective_until?: string | null;
      status?: string;
    }>
  ): Promise<any> {
    const res = await api.patch<any>(`/tenant/package-prices/${id}/`, payload);
    return res.data;
  },

  async deletePackagePrice(id: string): Promise<void> {
    await api.delete(`/tenant/package-prices/${id}/`);
  },

  // Package Branch Availability
  async getPackageBranchAvailabilities(params?: { package_id?: string; branch_id?: string }): Promise<any[]> {
    const res = await api.get<any>('/tenant/package-branch-availability/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async updatePackageBranchAvailability(
    id: string,
    payload: { status?: 'ENABLED' | 'DISABLED'; available_from?: string; available_until?: string }
  ): Promise<any> {
    const res = await api.patch<any>(`/tenant/package-branch-availability/${id}/`, payload);
    return res.data;
  },

  // Package Entitlement Definitions
  async getPackageEntitlementDefinitions(params?: { package_version_id?: string }): Promise<any[]> {
    const res = await api.get<any>('/tenant/package-entitlement-definitions/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async createPackageEntitlementDefinition(payload: {
    package_version: string;
    entitlement_type: string;
    allocated_units?: number | string | null;
    is_unlimited?: boolean;
    extra_unit_price?: number | string | null;
    validity_days?: number | null;
    reference_type?: string | null;
    reference_id?: string | null;
    status?: string;
  }): Promise<any> {
    const res = await api.post<any>('/tenant/package-entitlement-definitions/', payload);
    return res.data;
  },

  async updatePackageEntitlementDefinition(
    id: string,
    payload: Partial<{
      entitlement_type?: string;
      allocated_units?: number | string | null;
      is_unlimited?: boolean;
      extra_unit_price?: number | string | null;
      validity_days?: number | null;
      status?: string;
    }>
  ): Promise<any> {
    const res = await api.patch<any>(`/tenant/package-entitlement-definitions/${id}/`, payload);
    return res.data;
  },

  // Programs
  async getPrograms(params?: {
    category_id?: string;
    program_type_id?: string;
    branch_id?: string;
    delivery_mode?: string;
    trial_allowed?: boolean | string;
    status?: string;
    context?: string;
  }): Promise<Program[]> {
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
    category?: string | null;
    program_type?: string;
    description?: string | null;
    trial_allowed?: boolean;
    delivery_mode?: string;
    display_order?: number;
    available_branch_ids?: string[];
    status?: string;
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
      delivery_mode?: string;
      display_order?: number;
      available_branch_ids?: string[];
      status?: string;
    }>
  ): Promise<Program> {
    const res = await api.patch<Program>(`/tenant/programs/${id}/`, payload);
    return res.data;
  },

  async deactivateProgram(id: string): Promise<Program> {
    const res = await api.post<Program>(`/tenant/programs/${id}/deactivate/`);
    return res.data;
  },

  async reactivateProgram(id: string): Promise<Program> {
    const res = await api.post<Program>(`/tenant/programs/${id}/reactivate/`);
    return res.data;
  },

  async archiveProgram(id: string): Promise<Program> {
    const res = await api.post<Program>(`/tenant/programs/${id}/archive/`);
    return res.data;
  },

  async restoreProgram(id: string): Promise<Program> {
    const res = await api.post<Program>(`/tenant/programs/${id}/restore/`);
    return res.data;
  },

  async deleteProgram(id: string): Promise<void> {
    await api.delete(`/tenant/programs/${id}/`);
  },

  // Program Branch Availability
  async getProgramBranchAvailabilities(params?: {
    program_id?: string;
    branch_id?: string;
    is_active?: boolean | string;
  }): Promise<any[]> {
    const res = await api.get<any>('/tenant/program-branch-availability/', { params });
    const data = res.data;
    return Array.isArray(data) ? data : data?.results || [];
  },

  async updateProgramBranchAvailability(
    id: string,
    payload: { is_active?: boolean; effective_from?: string; effective_to?: string }
  ): Promise<any> {
    const res = await api.patch<any>(`/tenant/program-branch-availability/${id}/`, payload);
    return res.data;
  },

  async deactivateProgramBranchAvailability(id: string): Promise<any> {
    const res = await api.post<any>(`/tenant/program-branch-availability/${id}/deactivate/`);
    return res.data;
  },

  async reactivateProgramBranchAvailability(id: string): Promise<any> {
    const res = await api.post<any>(`/tenant/program-branch-availability/${id}/reactivate/`);
    return res.data;
  },

  async getProgramCategories(params?: { status?: string }): Promise<ProgramCategory[]> {
    const res = await api.get<any>('/tenant/program-categories/', { params });
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

  async updateProgramCategory(
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description?: string | null;
      display_order?: number;
      status?: string;
    }>
  ): Promise<ProgramCategory> {
    const res = await api.patch<ProgramCategory>(`/tenant/program-categories/${id}/`, payload);
    return res.data;
  },

  async deactivateProgramCategory(id: string): Promise<ProgramCategory> {
    const res = await api.post<ProgramCategory>(`/tenant/program-categories/${id}/deactivate/`);
    return res.data;
  },

  async reactivateProgramCategory(id: string): Promise<ProgramCategory> {
    const res = await api.post<ProgramCategory>(`/tenant/program-categories/${id}/reactivate/`);
    return res.data;
  },

  async deleteProgramCategory(id: string): Promise<void> {
    await api.delete(`/tenant/program-categories/${id}/`);
  },

  // Program Types (Internal / Compatibility)
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

  async deactivateProgramType(id: string): Promise<ProgramTypeItem> {
    const res = await api.post<ProgramTypeItem>(`/tenant/program-types/${id}/deactivate/`);
    return res.data;
  },

  async reactivateProgramType(id: string): Promise<ProgramTypeItem> {
    const res = await api.post<ProgramTypeItem>(`/tenant/program-types/${id}/reactivate/`);
    return res.data;
  },

  async deleteProgramType(id: string): Promise<void> {
    await api.delete(`/tenant/program-types/${id}/`);
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

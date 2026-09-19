export type ProgramType =
  | 'MEMBERSHIP'
  | 'FITNESS'
  | 'PERSONAL_TRAINING'
  | 'PILATES'
  | 'ONLINE'
  | 'HYBRID'
  | 'OTHER'
  | string;

export type DurationUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type PackageVersionStatus = 'DRAFT' | 'FUTURE' | 'ACTIVE' | 'RETIRED';

export type EntitlementType =
  | 'HOME_BRANCH_SESSION'
  | 'CROSS_BRANCH_SESSION'
  | 'CLASS_SESSION'
  | 'PERSONAL_TRAINING_SESSION'
  | 'ASSESSMENT'
  | 'OPEN_ACCESS'
  | 'OTHER';

export interface ProgramTypeItem {
  id: string;
  organization: string;
  code: string;
  name: string;
  description?: string | null;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface ProgramCategory {
  id: string;
  organization: string;
  code: string;
  name: string;
  description?: string | null;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  programs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  organization: string;
  category?: string | null;
  category_name?: string | null;
  code: string;
  name: string;
  description?: string | null;
  program_type: ProgramType;
  program_type_id?: string | null;
  program_type_name?: string | null;
  program_type_code?: string | null;
  trial_allowed: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  packages_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PackagePrice {
  id: string;
  package_version: string;
  branch?: string | null;
  branch_name?: string | null;
  currency: string;
  base_price: string;
  sale_price?: string;
  display_price?: string | null;
  prices_include_tax?: boolean;
  tax_percent: string;
  tax_percentage?: string;
  total_price: string;
  effective_from: string;
  effective_until?: string | null;
  status: 'FUTURE' | 'ACTIVE' | 'EXPIRED';
  created_at: string;
}

export interface PackageEntitlementDefinition {
  id: string;
  package_version: string;
  entitlement_type: EntitlementType;
  allocated_units?: string | null;
  is_unlimited: boolean;
  validity_days?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  configuration?: Record<string, any> | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface PackageBranchAvailability {
  id: string;
  package: string;
  branch: string;
  branch_name?: string;
  branch_code?: string;
  status: 'ENABLED' | 'DISABLED';
  available_from?: string | null;
  available_until?: string | null;
}

export interface PackageVersion {
  id: string;
  package: string;
  package_code?: string;
  package_name?: string;
  version_number: number;
  name_snapshot: string;
  description_snapshot?: string | null;
  duration_value: number;
  duration_unit: DurationUnit;
  total_days?: number | null;
  validity_days?: number | null;
  is_trial_package?: boolean;
  is_trial?: boolean;
  only_for_trial?: boolean;
  show_on_web?: boolean;
  show_on_app?: boolean;
  published_at?: string | null;
  effective_from: string;
  effective_until?: string | null;
  status: PackageVersionStatus;
  prices?: PackagePrice[];
  entitlement_definitions?: PackageEntitlementDefinition[];
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  organization: string;
  program?: string | null;
  program_name?: string | null;
  code: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  versions?: PackageVersion[];
  versions_count?: number;
  latest_version?: {
    id: string;
    version_number: number;
    name_snapshot: string;
    duration_value: number;
    duration_unit: DurationUnit;
    status: PackageVersionStatus;
  } | null;
  active_version?: {
    id: string;
    version_number: number;
    name_snapshot: string;
    duration_value: number;
    duration_unit: DurationUnit;
    total_days?: number | null;
    validity_days?: number | null;
    show_on_web?: boolean;
    show_on_app?: boolean;
    status?: PackageVersionStatus;
    prices: Array<{
      branch_id?: string | null;
      currency: string;
      base_price: string;
      sale_price?: string;
      display_price?: string | null;
      prices_include_tax?: boolean;
      tax_percent?: string;
      tax_percentage?: string;
      total_price: string;
    }>;
    entitlements?: Array<{
      entitlement_type: string;
      allocated_units?: string | null;
      extra_unit_price?: string | null;
    }>;
  } | null;
  branch_availabilities?: PackageBranchAvailability[];
  created_at: string;
  updated_at: string;
}

export interface TermsDocument {
  id: string;
  organization: string;
  code: string;
  name: string;
  document_type: string;
  status: 'ACTIVE' | 'INACTIVE';
  active_version?: {
    id: string;
    version_number: number;
    effective_from?: string | null;
  } | null;
  versions_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TermsDocumentVersion {
  id: string;
  terms_document: string;
  terms_document_code?: string;
  terms_document_name?: string;
  version_number: number;
  content_text?: string | null;
  effective_from: string;
  effective_until?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TermsAcceptance {
  id: string;
  terms_document_version: string;
  document_code?: string;
  version_number?: number;
  lead?: string | null;
  user_profile?: string | null;
  order_id?: string | null;
  accepted_at: string;
  accepted_via: 'WEB' | 'MOBILE_APP' | 'FRONT_DESK' | 'API';
  ip_address?: string | null;
  created_at: string;
}

import { api } from '../client';

export interface IntakeQuestionOption {
  id: string;
  question: string;
  option_text: string;
  option_value: string;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IntakeQuestion {
  id: string;
  intake_form: string;
  question_text: string;
  question_type: 'TEXT' | 'NUMBER' | 'DATE' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'SCALE';
  category: 'FITNESS' | 'LIFESTYLE' | 'PSYCHOLOGY' | 'MEDICAL' | 'SALES' | 'OTHER';
  is_required: boolean;
  is_sensitive: boolean;
  display_order: number;
  status: 'ACTIVE' | 'INACTIVE';
  options?: IntakeQuestionOption[];
  created_at?: string;
  updated_at?: string;
}

export interface IntakeForm {
  id: string;
  organization?: string;
  name: string;
  form_type: string;
  version_number: number;
  effective_from?: string;
  effective_until?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  agreement_title?: string;
  agreement_text?: string;
  is_required_for_purchase?: boolean;
  requires_explicit_consent?: boolean;
  reassessment_days?: number;
  is_default_for_all_programs?: boolean;
  assigned_programs?: string[];
  questions?: IntakeQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface ApplicableParqResponse {
  configured: boolean;
  form: IntakeForm | null;
  is_reusable: boolean;
  requires_completion: boolean;
  reassessment_days: number;
  agreement_title: string;
  agreement_text: string;
  requires_explicit_consent: boolean;
  existing_submission: any;
  message?: string;
}

export const formsApi = {
  getForms: async (params?: { status?: string }): Promise<IntakeForm[]> => {
    const res = await api.get('/tenant/intake-forms/', { params });
    const data: any = res.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getForm: async (id: string): Promise<IntakeForm> => {
    const res = await api.get(`/tenant/intake-forms/${id}/`);
    return res.data as IntakeForm;
  },

  createForm: async (data: Partial<IntakeForm>): Promise<IntakeForm> => {
    const res = await api.post('/tenant/intake-forms/', data);
    return res.data as IntakeForm;
  },

  updateForm: async (id: string, data: Partial<IntakeForm>): Promise<IntakeForm> => {
    const res = await api.patch(`/tenant/intake-forms/${id}/`, data);
    return res.data as IntakeForm;
  },

  deleteForm: async (id: string): Promise<void> => {
    await api.delete(`/tenant/intake-forms/${id}/`);
  },

  createQuestion: async (data: Partial<IntakeQuestion>): Promise<IntakeQuestion> => {
    const res = await api.post('/tenant/intake-questions/', data);
    return res.data as IntakeQuestion;
  },

  updateQuestion: async (id: string, data: Partial<IntakeQuestion>): Promise<IntakeQuestion> => {
    const res = await api.patch(`/tenant/intake-questions/${id}/`, data);
    return res.data as IntakeQuestion;
  },

  deleteQuestion: async (id: string): Promise<void> => {
    await api.delete(`/tenant/intake-questions/${id}/`);
  },

  createOption: async (data: Partial<IntakeQuestionOption>): Promise<IntakeQuestionOption> => {
    const res = await api.post('/tenant/intake-question-options/', data);
    return res.data as IntakeQuestionOption;
  },

  updateOption: async (id: string, data: Partial<IntakeQuestionOption>): Promise<IntakeQuestionOption> => {
    const res = await api.patch(`/tenant/intake-question-options/${id}/`, data);
    return res.data as IntakeQuestionOption;
  },

  deleteOption: async (id: string): Promise<void> => {
    await api.delete(`/tenant/intake-question-options/${id}/`);
  },

  getApplicableParq: async (params?: { program_id?: string; lead_id?: string; user_profile_id?: string }): Promise<ApplicableParqResponse> => {
    const res = await api.get('/tenant/intake-forms/applicable-parq/', { params });
    return res.data;
  },

  submitPurchaseParq: async (formId: string, data: {
    answers: Array<{
      question_id: string;
      text_value?: string;
      numeric_value?: number;
      boolean_value?: boolean;
      date_value?: string;
      json_value?: any;
    }>;
    lead_id?: string;
    user_profile_id?: string;
    program_id?: string;
    order_id?: string;
    agreement_accepted: boolean;
    agreement_text_snapshot?: string;
    accepted_by_name?: string;
    signer_type?: string;
    channel?: string;
    idempotency_key?: string;
  }): Promise<any> => {
    const res = await api.post(`/tenant/intake-forms/${formId}/submit-purchase/`, data);
    return res.data;
  },
};

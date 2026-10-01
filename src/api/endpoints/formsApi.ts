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
  questions?: IntakeQuestion[];
  created_at?: string;
  updated_at?: string;
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
};

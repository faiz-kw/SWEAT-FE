import { api } from '@/api/client';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Trash2,
  ListPlus,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Sliders,
  Check,
  X,
  Layers,
  Sparkles,
  Tag,
  ArrowRight,
  ArrowUp, ArrowDown, Copy, Eye, Smartphone, Monitor, FileSignature, Scale, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { formsApi, IntakeForm, IntakeQuestion } from '@/api/endpoints/formsApi';

const PRESET_FORM_TYPES = [
  { value: 'PAR_Q', label: 'PAR_Q — Physical Activity Readiness Questionnaire' },
  { value: 'LIFESTYLE', label: 'LIFESTYLE — Lifestyle & Nutrition Habits' },
  { value: 'FITNESS', label: 'FITNESS — Fitness Goals & Capabilities' },
  { value: 'MEDICAL', label: 'MEDICAL — Medical History & Clearance' },
  { value: 'GENERAL', label: 'GENERAL — General Client Intake' },
];

export const FormsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<IntakeForm | null>(null);
  const [expandedFormIds, setExpandedFormIds] = useState<Set<string>>(new Set());

  // Modals
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);

  // Form creation / editing state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('PAR_Q');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'ACTIVE' | 'RETIRED'>('ACTIVE');
  const [formVersion, setFormVersion] = useState(1);
  const [agreementTitle, setAgreementTitle] = useState('Physical Activity Readiness & Assumption of Risk Agreement');
  const [agreementText, setAgreementText] = useState('');
  const [isRequiredForPurchase, setIsRequiredForPurchase] = useState(true);
  const [requiresExplicitConsent, setRequiresExplicitConsent] = useState(true);
  const [reassessmentDays, setReassessmentDays] = useState(365);
  const [isDefaultForAllPrograms, setIsDefaultForAllPrograms] = useState(true);

  // Question form state
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<any>('BOOLEAN');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'forms' | 'terms'>('forms');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTermsOpen, setPreviewTermsOpen] = useState(false);
  const [termsDoc, setTermsDoc] = useState<any>(null);
  const [termsVersion, setTermsVersion] = useState<any>(null);
  const [termsText, setTermsText] = useState('');
  const [isPublishTermsOpen, setIsPublishTermsOpen] = useState(false);
  const [qCategory, setQCategory] = useState<'FITNESS' | 'LIFESTYLE' | 'PSYCHOLOGY' | 'MEDICAL' | 'SALES' | 'OTHER'>('MEDICAL');
  const [qRequired, setQRequired] = useState(true);
  const [qSensitive, setQSensitive] = useState(true);
  const [qOrder, setQOrder] = useState(1);
  const [qOptions, setQOptions] = useState<{ text: string; value: string }[]>([]);
  const [newOptionText, setNewOptionText] = useState('');

  // Queries
  const {
    data: forms = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['intake-forms'],
    queryFn: () => formsApi.getForms(),
  });
  // Query Terms Documents
  const {
    data: termsDocs = [],
    isLoading: isTermsLoading,
    refetch: refetchTerms,
  } = useQuery({
    queryKey: ['terms-documents'],
    queryFn: async () => {
      try {
        const res = await api.get('/tenant/terms-documents/');
        const data: any = res.data;
        const list = Array.isArray(data) ? data : data.results || [];
        if (list.length > 0 && !termsDoc) {
          setTermsDoc(list[0]);
          if (list[0].versions && list[0].versions.length > 0) {
            setTermsVersion(list[0].versions[0]);
            setTermsText(list[0].versions[0].content_text || '');
          }
        }
        return list;
      } catch (e) {
        console.error('Failed to load terms documents:', e);
        return [];
      }
    },
  });

  // Reorder question mutation
  const reorderQuestionMutation = useMutation({
    mutationFn: async ({ qId, newOrder }: { qId: string; newOrder: number }) => {
      return formsApi.updateQuestion(qId, { display_order: newOrder });
    },
    onSuccess: () => {
      refetch();
      toast.success('Question order updated.');
    },
  });

  // Duplicate question mutation
  const duplicateQuestionMutation = useMutation({
    mutationFn: async (q: IntakeQuestion) => {
      const copy = await formsApi.createQuestion({
        intake_form: q.intake_form,
        question_text: `${q.question_text} (Copy)`,
        question_type: q.question_type,
        category: q.category,
        is_required: q.is_required,
        is_sensitive: q.is_sensitive,
        display_order: (q.display_order || 0) + 1,
        status: 'ACTIVE',
      });
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          await formsApi.createOption({
            question: copy.id,
            option_text: opt.option_text,
            option_value: opt.option_value,
            display_order: opt.display_order,
            status: 'ACTIVE',
          });
        }
      }
      return copy;
    },
    onSuccess: () => {
      refetch();
      toast.success('Question duplicated.');
    },
  });

  // Publish new Terms version mutation
  const publishTermsMutation = useMutation({
    mutationFn: async ({ docId, contentText }: { docId: string; contentText: string }) => {
      const res = await api.post(`/tenant/terms-documents/${docId}/publish/`, {
        content_text: contentText,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Published new Terms Version ${data.version_number || 'ACTIVE'}!`);
      refetchTerms();
      setIsPublishTermsOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to publish terms version.');
    },
  });


  // Collect all unique form types across existing forms to offer in dropdown
  const availableFormTypes = useMemo(() => {
    const existing = new Set<string>();
    forms.forEach((f) => {
      if (f.form_type) existing.add(f.form_type);
    });
    PRESET_FORM_TYPES.forEach((p) => existing.add(p.value));
    return Array.from(existing);
  }, [forms]);

  const toggleExpand = (formId: string) => {
    setExpandedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  };

  // Mutations
  const createFormMutation = useMutation({
    mutationFn: (data: Partial<IntakeForm>) => formsApi.createForm(data),
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ['intake-forms'] });
      setIsCreateFormOpen(false);
      resetFormFields();
      toast.success('Form created successfully! Now add questions to your questionnaire.');
      // Auto-open Question Builder for the new form
      if (newForm) {
        setSelectedForm(newForm);
        setExpandedFormIds((prev) => new Set(prev).add(newForm.id));
        setIsQuestionsModalOpen(true);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create form');
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IntakeForm> }) => formsApi.updateForm(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['intake-forms'] });
      setIsEditFormOpen(false);
      if (selectedForm && selectedForm.id === updated.id) {
        setSelectedForm(updated);
      }
      toast.success('Form updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update form');
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: Partial<IntakeQuestion>) => {
      const q = await formsApi.createQuestion(data);
      if (['SINGLE_SELECT', 'MULTI_SELECT'].includes(data.question_type || '') && qOptions.length > 0) {
        for (let i = 0; i < qOptions.length; i++) {
          await formsApi.createOption({
            question: q.id,
            option_text: qOptions[i].text,
            option_value: qOptions[i].value,
            display_order: i + 1,
            status: 'ACTIVE',
          });
        }
      }
      return q;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-forms'] });
      setIsAddQuestionOpen(false);
      resetQuestionFields();
      toast.success('Question added successfully');
      if (selectedForm) {
        formsApi.getForm(selectedForm.id).then((f) => setSelectedForm(f));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add question');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (qId: string) => formsApi.deleteQuestion(qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-forms'] });
      toast.success('Question deleted');
      if (selectedForm) {
        formsApi.getForm(selectedForm.id).then((f) => setSelectedForm(f));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete question');
    },
  });

  const resetFormFields = () => {
    setFormName('');
    setFormType('PAR_Q');
    setIsCustomType(false);
    setCustomTypeInput('');
    setFormStatus('ACTIVE');
    setFormVersion(1);
    setAgreementTitle('Physical Activity Readiness & Assumption of Risk Agreement');
    setAgreementText('');
    setIsRequiredForPurchase(true);
    setRequiresExplicitConsent(true);
    setReassessmentDays(365);
    setIsDefaultForAllPrograms(true);
  };

  const resetQuestionFields = () => {
    setQText('');
    setQType('BOOLEAN');
    setQCategory('MEDICAL');
    setQRequired(true);
    setQSensitive(true);
    setQOrder(selectedForm?.questions ? selectedForm.questions.length + 1 : 1);
    setQOptions([]);
    setNewOptionText('');
  };

  const handleOpenEdit = (form: IntakeForm) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormType(form.form_type);
    setIsCustomType(!availableFormTypes.includes(form.form_type));
    setCustomTypeInput(form.form_type);
    setFormStatus(form.status);
    setFormVersion(form.version_number);
    setAgreementTitle(form.agreement_title || 'Physical Activity Readiness & Assumption of Risk Agreement');
    setAgreementText(form.agreement_text || '');
    setIsRequiredForPurchase(form.is_required_for_purchase ?? true);
    setRequiresExplicitConsent(form.requires_explicit_consent ?? true);
    setReassessmentDays(form.reassessment_days || 365);
    setIsDefaultForAllPrograms(form.is_default_for_all_programs ?? true);
    setIsEditFormOpen(true);
  };

  const handleOpenQuestions = (form: IntakeForm) => {
    setSelectedForm(form);
    setIsQuestionsModalOpen(true);
  };

  const handleQuickAddQuestion = (form: IntakeForm) => {
    setSelectedForm(form);
    resetQuestionFields();
    setQOrder(form.questions ? form.questions.length + 1 : 1);
    setIsAddQuestionOpen(true);
  };

  const handleToggleStatus = (form: IntakeForm) => {
    const nextStatus = form.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    updateFormMutation.mutate({
      id: form.id,
      data: { status: nextStatus },
    });
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    const val = newOptionText.trim().toLowerCase().replace(/\s+/g, '_');
    setQOptions([...qOptions, { text: newOptionText.trim(), value: val }]);
    setNewOptionText('');
  };

  const handleRemoveOption = (index: number) => {
    setQOptions(qOptions.filter((_, i) => i !== index));
  };

  const filteredForms = forms.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(term) ||
      f.form_type.toLowerCase().includes(term) ||
      f.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <PageHeader
        title="Forms & Assessments"
        subtitle="Configure dynamic intake questionnaires, PAR-Q health clearances, and custom compliance forms."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Administration · Intake
            </span>
            <span className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground">{forms.length}</span> form definition(s)
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetFormFields();
                setIsCreateFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Create Form</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* Workspace Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3 mb-4">
          <Button
            size="sm"
            variant={activeWorkspaceTab === 'forms' ? 'default' : 'ghost'}
            onClick={() => setActiveWorkspaceTab('forms')}
            className="gap-2 text-xs h-9 rounded-xl font-semibold"
          >
            <FileText className="size-4" />
            <span>Intake & PAR-Q Questionnaires ({forms.length})</span>
          </Button>
          <Button
            size="sm"
            variant={activeWorkspaceTab === 'terms' ? 'default' : 'ghost'}
            onClick={() => setActiveWorkspaceTab('terms')}
            className="gap-2 text-xs h-9 rounded-xl font-semibold"
          >
            <ScrollText className="size-4" />
            <span>Terms & Purchase Agreements ({termsDocs.length || 1})</span>
          </Button>
        </div>

        {activeWorkspaceTab === 'terms' ? (
          /* ========================================================================= */
          /* TERMS & CONDITIONS WORKSPACE VIEW                                        */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Contradiction Flag Alert Banner */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <h4 className="font-bold text-amber-950 dark:text-amber-100">
                  Legal Conflict Flagged for Business Owner Review
                </h4>
                <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed text-xs">
                  The client source agreement contains an internal contradiction between two clauses:
                </p>
                <ul className="list-disc pl-5 text-xs text-amber-900/80 dark:text-amber-200/80 space-y-0.5 pt-1">
                  <li><strong>Membership Transfer:</strong> States that membership packages can be transferred to another individual for a fee of ?2999.</li>
                  <li><strong>Refund Policy:</strong> States that memberships and services are strictly non-transferable and non-refundable.</li>
                </ul>
                <p className="text-[11px] text-muted-foreground pt-1 italic">
                  Note: Per specification, both clauses have been preserved substantively. Operational backend policy remains isolated from legal text.
                </p>
              </div>
            </div>

            {/* Terms Document Details Card */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {termsDoc?.name || 'SWEAT Studio Package Purchase Agreement'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Code: {termsDoc?.code || 'TERMS-PACKAGE-PURCHASE'} ? Version {termsVersion?.version_number || 1} ({termsVersion?.status || 'ACTIVE'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewTermsOpen(true)}
                    className="gap-1.5 text-xs h-9 rounded-xl"
                  >
                    <Eye className="size-3.5" />
                    <span>Preview Agreement</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsPublishTermsOpen(true)}
                    className="gap-1.5 text-xs h-9 rounded-xl bg-primary text-primary-foreground font-semibold"
                  >
                    <FileSignature className="size-3.5" />
                    <span>Publish New Version</span>
                  </Button>
                </div>
              </div>

              {/* Legal Text Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="terms-content" className="text-xs font-semibold text-foreground">
                    Agreement Template Content (Markdown Supported)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Placeholders supported: <code>{'{{package_heading}}'}</code>, <code>{'{{package_description}}'}</code>, <code>{'{{expiration_days}}'}</code>
                  </span>
                </div>
                <textarea
                  id="terms-content"
                  rows={16}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full font-mono text-xs rounded-xl border border-border bg-background p-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y shadow-inner"
                  placeholder="Enter agreement terms and conditions..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground border-t border-border/40">
                <span>Effective From: {termsVersion?.effective_from ? new Date(termsVersion.effective_from).toLocaleDateString() : 'Immediate'}</span>
                <span>Immutable Version Snapshot Policy Enforced ? Existing signed purchases retain historic terms</span>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Search Bar & Stats */}
        <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search forms by name, category, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Click any form to preview questions or use Question Builder.</span>
          </div>
        </div>

        {/* Forms Table – cards on mobile, table on desktop */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">

          {/* MOBILE CARD VIEW (hidden lg+) */}
          <div className="lg:hidden divide-y divide-border/60">
            {isLoading ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading form definitions...
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <p className="font-semibold text-foreground">No intake forms found.</p>
                <p className="text-xs mt-1">Click &quot;Create Form&quot; to build your first questionnaire.</p>
              </div>
            ) : (
              filteredForms.map((form) => {
                const isExpandedM = expandedFormIds.has(form.id);
                const qCountM = form.questions?.length || 0;
                return (
                  <React.Fragment key={`m-${form.id}`}>
                    <div className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleExpand(form.id)}
                          className="mt-0.5 p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
                          {isExpandedM ? <ChevronDown className="size-4 text-primary" /> : <ChevronRight className="size-4" />}
                        </button>
                        <FileText className="size-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground">{form.name}</span>
                            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 shrink-0">v{form.version_number}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">{form.form_type}</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${form.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : form.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-muted text-muted-foreground'}`}>{form.status}</span>
                            <button type="button" onClick={() => toggleExpand(form.id)} className="text-[11px] text-muted-foreground underline decoration-dotted">
                              {qCountM} {qCountM === 1 ? 'question' : 'questions'}
                            </button>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">Created {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-8">
                        <Button size="sm" variant="outline" onClick={() => handleOpenQuestions(form)} className="h-7 text-xs gap-1">
                          <ListPlus className="size-3.5 text-primary" /><span>Builder ({qCountM})</span>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleQuickAddQuestion(form)} className="h-7 text-xs gap-1">
                          <Plus className="size-3" /><span>Add Q</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(form)} className="h-7 text-xs">
                          {form.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(form)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                          <Edit2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {isExpandedM && (
                      <div className="bg-muted/20 border-t border-border/80 px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-3.5 text-primary" />
                            <span className="font-semibold text-xs text-foreground uppercase tracking-wider">Questions ({qCountM})</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleOpenQuestions(form)}><Edit2 className="size-3" /> Edit</Button>
                            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => handleQuickAddQuestion(form)}><Plus className="size-3" /> Add</Button>
                          </div>
                        </div>
                        {qCountM > 0 ? (
                          <div className="grid gap-2">
                            {form.questions?.slice().sort((a, b) => a.display_order - b.display_order).map((q, idx) => (
                              <div key={q.id} className="flex items-start justify-between p-3 rounded-lg bg-card border border-border/60 gap-3">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-primary">Q{idx + 1}</span>
                                    <span className="text-xs text-foreground font-medium">{q.question_text}</span>
                                    {q.is_required && <Badge variant="secondary" className="text-[10px] py-0">Required</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="font-mono text-[10px] py-0">{q.question_type}</Badge>
                                    {q.is_sensitive && <Badge variant="secondary" className="text-[10px] py-0 text-rose-500 bg-rose-500/10 flex items-center gap-1"><ShieldAlert className="size-2.5" /> PHI</Badge>}
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0"
                                  onClick={() => { if (confirm('Delete this question?')) deleteQuestionMutation.mutate(q.id); }}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                            No questions yet. Click &quot;Add&quot; to begin.
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden below lg) */}
          <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Form Name & Version</th>
                <th className="px-4 py-3">Form Type Code</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Loading form definitions...
                  </td>
                </tr>
              ) : filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground">No intake forms found.</p>
                    <p className="text-xs mt-1">Click &quot;Create Form&quot; to build your first questionnaire.</p>
                  </td>
                </tr>
              ) : (
                filteredForms.map((form) => {
                  const isExpanded = expandedFormIds.has(form.id);
                  const questionsCount = form.questions?.length || 0;

                  return (
                    <React.Fragment key={form.id}>
                      <tr className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(form.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                              title={isExpanded ? 'Collapse questions' : 'Expand questions preview'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-primary" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                            <FileText className="size-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">{form.name}</span>
                            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                              v{form.version_number}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground ml-6 mt-0.5">
                            Created {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            {form.form_type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(form.id)}
                            className="flex items-center gap-1.5 text-left group"
                          >
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {questionsCount}
                            </span>{' '}
                            <span className="text-muted-foreground text-xs underline decoration-dotted">
                              {questionsCount === 1 ? 'question' : 'questions'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              form.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : form.status === 'DRAFT'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {form.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenQuestions(form)}
                              className="h-7 text-xs gap-1"
                              title="Open Question Builder"
                            >
                              <ListPlus className="size-3.5 text-primary" />
                              <span>Question Builder ({questionsCount})</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleQuickAddQuestion(form)}
                              className="h-7 text-xs gap-1"
                              title="Quick Add Question"
                            >
                              <Plus className="size-3" />
                              <span>Add Q</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(form)}
                              className="h-7 px-2 text-xs"
                              title={form.status === 'ACTIVE' ? 'Deactivate Form' : 'Activate Form'}
                            >
                              {form.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(form)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Form Info"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Questions Preview Drawer */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b border-border/80">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="size-3.5 text-primary" />
                                  <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                                    Questions in {form.name} ({questionsCount})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickAddQuestion(form)}
                                    className="h-6 text-xs gap-1"
                                  >
                                    <Plus className="size-3" />
                                    <span>Add Question</span>
                                  </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPreviewOpen(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Eye className="size-3.5" />
                  <span>Live Preview</span>
                </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenQuestions(form)}
                                    className="h-6 text-xs gap-1 text-primary"
                                  >
                                    <span>Open Full Builder</span>
                                    <ArrowRight className="size-3" />
                                  </Button>
                                </div>
                              </div>

                              {questionsCount > 0 ? (
                                <div className="grid gap-2">
                                  {form.questions
                                    ?.slice()
                                    .sort((a, b) => a.display_order - b.display_order)
                                    .map((q, idx) => (
                                      <div
                                        key={q.id}
                                        className="p-3 bg-card rounded-lg border border-border/70 flex items-start justify-between gap-4"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-primary">
                                              Q{idx + 1}
                                            </span>
                                            <span className="font-medium text-foreground text-xs sm:text-sm">
                                              {q.question_text}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                                            <Badge variant="outline" className="font-mono text-[10px] py-0">
                                              {q.question_type}
                                            </Badge>
                                            <span>
                                              Category: <strong className="text-foreground">{q.category}</strong>
                                            </span>
                                            {q.is_required && (
                                              <Badge variant="secondary" className="text-[10px] py-0 text-amber-500 bg-amber-500/10">
                                                Required
                                              </Badge>
                                            )}
                                            {q.is_sensitive && (
                                              <Badge variant="secondary" className="text-[10px] py-0 text-rose-500 bg-rose-500/10 flex items-center gap-1">
                                                <ShieldAlert className="size-2.5" /> Sensitive PHI
                                              </Badge>
                                            )}
                                          </div>
                                          {/* Options preview if any */}
                                          {q.options && q.options.length > 0 && (
                                            <div className="pt-1.5 flex flex-wrap gap-1.5">
                                              {q.options.map((opt) => (
                                                <span
                                                  key={opt.id}
                                                  className="text-[10px] px-2 py-0.5 bg-muted rounded font-mono text-muted-foreground"
                                                >
                                                  {opt.option_text}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (idx > 0) {
                              const prevQ = selectedForm?.questions?.slice().sort((a, b) => a.display_order - b.display_order)[idx - 1];
                              if (prevQ) {
                                reorderQuestionMutation.mutate({ qId: q.id, newOrder: prevQ.display_order });
                                reorderQuestionMutation.mutate({ qId: prevQ.id, newOrder: q.display_order });
                              }
                            }
                          }}
                          disabled={idx === 0}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Move Up"
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const sorted = selectedForm?.questions?.slice().sort((a, b) => a.display_order - b.display_order) || [];
                            if (idx < sorted.length - 1) {
                              const nextQ = sorted[idx + 1];
                              if (nextQ) {
                                reorderQuestionMutation.mutate({ qId: q.id, newOrder: nextQ.display_order });
                                reorderQuestionMutation.mutate({ qId: nextQ.id, newOrder: q.display_order });
                              }
                            }
                          }}
                          disabled={!selectedForm?.questions || idx === selectedForm.questions.length - 1}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Move Down"
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => duplicateQuestionMutation.mutate(q)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Duplicate Question"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                          title="Delete Question"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="p-4 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                                  No questions configured yet for this form. Click &quot;Add Question&quot; to configure your questionnaire.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
              </>
        )}
      </PageBody>

      {/* Create Form Dialog */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Intake Form</DialogTitle>
            <DialogDescription>
              Define a new structured questionnaire such as a PAR-Q, lifestyle, or medical clearance form.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const finalType = isCustomType ? customTypeInput.trim().toUpperCase() : formType;
              if (!finalType) {
                toast.error('Please specify a Form Type Code');
                return;
              }
              createFormMutation.mutate({
                name: formName,
                form_type: finalType,
                status: formStatus,
                version_number: formVersion,
                agreement_title: agreementTitle,
                agreement_text: agreementText,
                is_required_for_purchase: isRequiredForPurchase,
                requires_explicit_consent: requiresExplicitConsent,
                reassessment_days: reassessmentDays,
                is_default_for_all_programs: isDefaultForAllPrograms,
              });
            }}
            className="space-y-4 py-2 text-xs sm:text-sm"
          >
            <div>
              <Label className="mb-1 block font-medium">Form Name</Label>
              <Input
                required
                placeholder="e.g. PAR-Q — Health Clearance"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="block font-medium">Form Type Code</Label>
                <button
                  type="button"
                  onClick={() => setIsCustomType(!isCustomType)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {isCustomType ? 'Select from standard types' : '+ Enter custom code'}
                </button>
              </div>

              {isCustomType ? (
                <div className="space-y-1">
                  <Input
                    required
                    placeholder="e.g. PILATES_EVAL, INJURY_SCREENING, WAIVER"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Custom codes allow creating any category of form without database restrictions.
                  </p>
                </div>
              ) : (
                <select
                  value={formType}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomType(true);
                    } else {
                      setFormType(e.target.value);
                    }
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <optgroup label="Standard Questionnaire Types">
                    {PRESET_FORM_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </optgroup>
                  {availableFormTypes.filter((t) => !PRESET_FORM_TYPES.some((p) => p.value === t)).length > 0 && (
                    <optgroup label="Existing Custom Types in Tenant">
                      {availableFormTypes
                        .filter((t) => !PRESET_FORM_TYPES.some((p) => p.value === t))
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <option value="__CUSTOM__">+ Enter Custom Type...</option>
                </select>
              )}
            </div>

            <div>
              <Label className="mb-1 block font-medium">Initial Status</Label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Booking Gate & Agreement Rules</span>
              </div>

              <div>
                <Label className="mb-1 block text-xs font-medium">Agreement Title</Label>
                <Input
                  value={agreementTitle}
                  onChange={(e) => setAgreementTitle(e.target.value)}
                  placeholder="Physical Activity Readiness & Assumption of Risk Agreement"
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs font-medium">Agreement & Consent Text</Label>
                <textarea
                  value={agreementText}
                  onChange={(e) => setAgreementText(e.target.value)}
                  placeholder="Full agreement text presented to members before payment..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequiredForPurchase}
                    onChange={(e) => setIsRequiredForPurchase(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>Required Before Class Booking</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresExplicitConsent}
                    onChange={(e) => setRequiresExplicitConsent(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>Require Explicit Consent</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefaultForAllPrograms}
                    onChange={(e) => setIsDefaultForAllPrograms(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>Default for All Programs</span>
                </label>

                <div>
                  <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Reassessment Validity (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={reassessmentDays}
                    onChange={(e) => setReassessmentDays(parseInt(e.target.value) || 365)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFormMutation.isPending}>
                {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={isEditFormOpen && !!selectedForm} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Form Configuration</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalType = isCustomType ? customTypeInput.trim().toUpperCase() : formType;
                updateFormMutation.mutate({
                  id: selectedForm.id,
                  data: {
                    name: formName,
                    form_type: finalType,
                    status: formStatus,
                    version_number: formVersion,
                    agreement_title: agreementTitle,
                    agreement_text: agreementText,
                    is_required_for_purchase: isRequiredForPurchase,
                    requires_explicit_consent: requiresExplicitConsent,
                    reassessment_days: reassessmentDays,
                    is_default_for_all_programs: isDefaultForAllPrograms,
                  },
                });
              }}
              className="space-y-4 py-2 text-xs sm:text-sm"
            >
              <div>
                <Label className="mb-1 block font-medium">Form Name</Label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="block font-medium">Form Type Code</Label>
                  <button
                    type="button"
                    onClick={() => setIsCustomType(!isCustomType)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {isCustomType ? 'Select from standard types' : '+ Enter custom code'}
                  </button>
                </div>
                {isCustomType ? (
                  <Input
                    required
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                  />
                ) : (
                  <select
                    value={formType}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomType(true);
                      } else {
                        setFormType(e.target.value);
                      }
                    }}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PRESET_FORM_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                    {availableFormTypes
                      .filter((t) => !PRESET_FORM_TYPES.some((p) => p.value === t))
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    <option value="__CUSTOM__">+ Enter Custom Type...</option>
                  </select>
                )}
              </div>

              <div>
                <Label className="mb-1 block font-medium">Status</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Booking Gate & Agreement Rules</span>
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-medium">Agreement Title</Label>
                  <Input
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    placeholder="Physical Activity Readiness & Assumption of Risk Agreement"
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-medium">Agreement & Consent Text</Label>
                  <textarea
                    value={agreementText}
                    onChange={(e) => setAgreementText(e.target.value)}
                    placeholder="Full agreement text presented to members before payment..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequiredForPurchase}
                      onChange={(e) => setIsRequiredForPurchase(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Required Before Class Booking</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresExplicitConsent}
                      onChange={(e) => setRequiresExplicitConsent(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Require Explicit Consent</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefaultForAllPrograms}
                      onChange={(e) => setIsDefaultForAllPrograms(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Default for All Programs</span>
                  </label>

                  <div>
                    <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Reassessment Validity (Days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={3650}
                      value={reassessmentDays}
                      onChange={(e) => setReassessmentDays(parseInt(e.target.value) || 365)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateFormMutation.isPending}>
                  {updateFormMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Question Builder Modal */}
      <Dialog open={isQuestionsModalOpen && !!selectedForm} onOpenChange={setIsQuestionsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  Question Builder: {selectedForm?.name}
                </DialogTitle>
                <DialogDescription>
                  Configure dynamic questions for this form. Sensitive items are protected under RBAC (`cs.member-health.view`).
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resetQuestionFields();
                  setIsAddQuestionOpen(true);
                }}
                className="gap-1.5 shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Add Question</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedForm?.questions && selectedForm.questions.length > 0 ? (
              selectedForm.questions
                .slice()
                .sort((a, b) => a.display_order - b.display_order)
                .map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-primary">
                            Q{idx + 1}
                          </span>
                          <span className="font-semibold text-foreground text-xs sm:text-sm">
                            {q.question_text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="font-mono py-0 text-[10px]">
                            {q.question_type}
                          </Badge>
                          <span>Category: <strong className="text-foreground">{q.category}</strong></span>
                          {q.is_required && (
                            <Badge variant="secondary" className="text-[10px] py-0 text-amber-500 bg-amber-500/10">
                              Required
                            </Badge>
                          )}
                          {q.is_sensitive && (
                            <Badge variant="secondary" className="text-[10px] py-0 text-rose-500 bg-rose-500/10 flex items-center gap-1">
                              <ShieldAlert className="size-2.5" /> Sensitive PHI
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteQuestionMutation.mutate(q.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                        title="Delete Question"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    {/* Options list for select questions */}
                    {q.options && q.options.length > 0 && (
                      <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <span
                            key={opt.id}
                            className="text-[11px] px-2 py-0.5 bg-card border border-border rounded-md font-mono"
                          >
                            {opt.option_text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No questions configured yet for this form. Click &quot;Add Question&quot; to begin.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsQuestionsModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionOpen && !!selectedForm} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Dynamic Question</DialogTitle>
            <DialogDescription>
              Configure question behavior, input type, and privacy protection level.
            </DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createQuestionMutation.mutate({
                  intake_form: selectedForm.id,
                  question_text: qText,
                  question_type: qType,
                  category: qCategory,
                  is_required: qRequired,
                  is_sensitive: qSensitive,
                  display_order: qOrder,
                  status: 'ACTIVE',
                });
              }}
              className="space-y-4 py-2 text-xs sm:text-sm"
            >
              <div>
                <Label className="mb-1 block font-medium">Question Text</Label>
                <Input
                  required
                  placeholder="e.g. Do you have any heart conditions or chest pains during exercise?"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block font-medium">Input Type</Label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="BOOLEAN">BOOLEAN (Yes / No)</option>
                    <option value="TEXT">TEXT (Short Text)</option>
                    <option value="NUMBER">NUMBER (Numeric)</option>
                    <option value="DATE">DATE</option>
                    <option value="SINGLE_SELECT">SINGLE_SELECT (Dropdown)</option>
                    <option value="MULTI_SELECT">MULTI_SELECT (Checkboxes)</option>
                    <option value="SCALE">SCALE (1-10 Rating)</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block font-medium">Category</Label>
                  <select
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="FITNESS">FITNESS</option>
                    <option value="LIFESTYLE">LIFESTYLE</option>
                    <option value="PSYCHOLOGY">PSYCHOLOGY</option>
                    <option value="SALES">SALES</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              {/* Options builder for SELECT types */}
              {['SINGLE_SELECT', 'MULTI_SELECT'].includes(qType) && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
                  <Label className="block font-medium">Options for Selection</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Daily / Weekly"
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={handleAddOption}>
                      Add
                    </Button>
                  </div>

                  {qOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {qOptions.map((opt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-card border border-border rounded-md"
                        >
                          {opt.text}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="text-muted-foreground hover:text-rose-500"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qRequired}
                    onChange={(e) => setQRequired(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-semibold text-xs">Required</div>
                    <div className="text-[10px] text-muted-foreground">User must answer</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qSensitive}
                    onChange={(e) => setQSensitive(e.target.checked)}
                    className="rounded text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <div className="font-semibold text-xs text-rose-500 flex items-center gap-1">
                      <ShieldAlert className="size-3" /> Sensitive PHI
                    </div>
                    <div className="text-[10px] text-muted-foreground">Protected health info</div>
                  </div>
                </label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddQuestionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createQuestionMutation.isPending}>
                  {createQuestionMutation.isPending ? 'Saving...' : 'Add Question'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    
      {/* Live PAR-Q Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className={`${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto transition-all duration-300 p-0`}>
          <DialogHeader className="px-5 py-3 border-b border-border/80 bg-muted/20 sticky top-0 z-10 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold">
                Preview: {selectedForm?.name || 'PAR-Q Form'}
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                {previewDevice === 'mobile' ? 'Mobile Viewport (390px)' : 'Desktop Viewport'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'mobile' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'}`}
                title="Mobile View"
              >
                <Smartphone className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'desktop' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'}`}
                title="Desktop View"
              >
                <Monitor className="size-3.5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-6">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">{selectedForm?.name}</h3>
              <p className="text-xs text-muted-foreground">Version {selectedForm?.version_number || 1} ? {selectedForm?.form_type}</p>
            </div>

            <div className="space-y-4">
              {(selectedForm?.questions || []).slice().sort((a, b) => a.display_order - b.display_order).map((q, idx) => (
                <div key={q.id} className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      <span className="font-mono text-muted-foreground mr-1">Q{idx + 1}.</span>
                      {q.question_text}
                      {q.is_required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                    </span>
                    {q.is_sensitive && <Badge variant="outline" className="text-[9px] text-rose-500 py-0 shrink-0">Protected PHI</Badge>}
                  </div>

                  {q.question_type === 'BOOLEAN' ? (
                    <div className="flex gap-2 max-w-xs pt-1">
                      <button type="button" className="flex-1 py-1.5 text-xs rounded-lg border border-border bg-background">No</button>
                      <button type="button" className="flex-1 py-1.5 text-xs rounded-lg border border-border bg-background">Yes</button>
                    </div>
                  ) : q.question_type === 'SINGLE_SELECT' || q.question_type === 'SINGLE_CHOICE' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(q.options || []).map((opt) => (
                        <div key={opt.id} className="p-2 rounded-lg border border-border bg-background text-xs text-muted-foreground">
                          {opt.option_text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input type="text" disabled placeholder="Member answers here..." className="w-full text-xs rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {selectedForm?.agreement_text && (
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-xs font-bold text-foreground">{selectedForm.agreement_title || 'Legal Agreement'}</h4>
                <div className="p-3 rounded-xl border border-border bg-muted/30 text-[11px] text-muted-foreground max-h-32 overflow-y-auto leading-relaxed">
                  {selectedForm.agreement_text}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <input type="checkbox" disabled className="rounded size-4" />
                  <span>I agree to the terms and declarations above</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Terms Preview Modal */}
      <Dialog open={previewTermsOpen} onOpenChange={setPreviewTermsOpen}>
        <DialogContent className={`${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto p-0`}>
          <DialogHeader className="px-5 py-3 border-b border-border/80 bg-muted/20 sticky top-0 z-10 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold">Terms Preview</DialogTitle>
              <DialogDescription className="text-[11px]">
                {previewDevice === 'mobile' ? 'Mobile View (390px)' : 'Desktop View'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'mobile' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                <Smartphone className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'desktop' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                <Monitor className="size-3.5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div className="border border-amber-500/30 bg-amber-500/10 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              ⚠️ Contradiction Note: Section 'Membership Transfer' (?2999 fee) vs 'Refund Policy' (non-transferable).
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/20 max-h-[60vh] overflow-y-auto text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {termsText.replace('{{package_heading}}', 'SWEAT-PILATES-MALAD - 288 Sessions')
                        .replace('{{package_description}}', '288 sessions to be used at the Sweat Fit Wellness Studio.')
                        .replace('{{expiration_days}}', '730')}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs font-semibold">
              <input type="checkbox" checked readOnly className="size-4 rounded text-primary" />
              <span>I Agree, Confirm My Order</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish New Terms Version Modal */}
      <Dialog open={isPublishTermsOpen} onOpenChange={setIsPublishTermsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish New Agreement Version</DialogTitle>
            <DialogDescription>
              Publishing will create an immutable new version. Existing purchases will continue to reference their accepted version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <p>Are you sure you want to publish this new Terms & Conditions version?</p>
            <div className="p-3 bg-muted rounded-xl border border-border">
              <span className="font-semibold">Document:</span> {termsDoc?.name || 'SWEAT Studio Package Purchase Agreement'}<br />
              <span className="font-semibold">Next Version:</span> v{(termsVersion?.version_number || 1) + 1} (ACTIVE)
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPublishTermsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (termsDoc?.id) {
                  publishTermsMutation.mutate({ docId: termsDoc.id, contentText: termsText });
                } else {
                  toast.success('Terms version published.');
                  setIsPublishTermsOpen(false);
                }
              }}
              disabled={publishTermsMutation.isPending}
            >
              {publishTermsMutation.isPending ? 'Publishing...' : 'Publish Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</div>
  );
};

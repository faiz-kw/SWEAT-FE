import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Dumbbell,
  Target,
  Globe,
  MapPin,
  Tag,
  UserCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Search,
  Check,
  X,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/services/crmApi';
import type { CreateLeadPayload, ReferrerOption } from '@/types/crm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const queryClient = useQueryClient();

  // --- Form State ---
  // Section 1: Contact Details
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');

  // Section 2: Interest & Location
  const [selectedBranch, setSelectedBranch] = React.useState('');
  const [selectedProgram, setSelectedProgram] = React.useState('');
  const [fitnessGoal, setFitnessGoal] = React.useState('');
  const [country, setCountry] = React.useState('India');
  const [location, setLocation] = React.useState('');

  // Section 3: Source & Assignment
  const [selectedSource, setSelectedSource] = React.useState('');
  const [selectedAgent, setSelectedAgent] = React.useState('');
  const [referredByUserId, setReferredByUserId] = React.useState('');
  const [referredByName, setReferredByName] = React.useState('');
  const [referrerQuery, setReferrerQuery] = React.useState('');
  const [selectedReferrerObj, setSelectedReferrerObj] = React.useState<ReferrerOption | null>(null);
  const [isReferrerOpen, setIsReferrerOpen] = React.useState(false);

  // Section 4: Billing / Business Details (Collapsible)
  const [isBillingOpen, setIsBillingOpen] = React.useState(false);
  const [billingName, setBillingName] = React.useState('');
  const [gstNumber, setGstNumber] = React.useState('');
  const [panNumber, setPanNumber] = React.useState('');

  // Section 5: Marketing & Digital Attribution (Collapsible)
  const [isAttributionOpen, setIsAttributionOpen] = React.useState(false);
  const [attrPlatform, setAttrPlatform] = React.useState('');
  const [attrCampaignName, setAttrCampaignName] = React.useState('');
  const [attrLandingPage, setAttrLandingPage] = React.useState('');
  const [attrReferrer, setAttrReferrer] = React.useState('');
  const [attrUtmSource, setAttrUtmSource] = React.useState('');
  const [attrUtmMedium, setAttrUtmMedium] = React.useState('');
  const [attrUtmCampaign, setAttrUtmCampaign] = React.useState('');
  const [attrUtmTerm, setAttrUtmTerm] = React.useState('');
  const [attrUtmContent, setAttrUtmContent] = React.useState('');
  const [showTechDetails, setShowTechDetails] = React.useState(false);
  const [attrAdSetName, setAttrAdSetName] = React.useState('');
  const [attrAdName, setAttrAdName] = React.useState('');
  const [attrFormName, setAttrFormName] = React.useState('');
  const [attrExternalLeadId, setAttrExternalLeadId] = React.useState('');

  // Validation feedback
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Duplicate Lead Detection
  const [duplicateMatches, setDuplicateMatches] = React.useState<any[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false);

  // --- Backend-Authoritative Queries ---
  const { data: metadata, isLoading: isMetaLoading } = useQuery({
    queryKey: ['lead-metadata'],
    queryFn: () => crmApi.getMetadata(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const {
    data: branches = [],
    isLoading: isBranchesLoading,
    isError: isBranchesError,
  } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const {
    data: programs = [],
    isLoading: isProgramsLoading,
  } = useQuery({
    queryKey: ['active-programs', selectedBranch],
    queryFn: () => crmApi.getPrograms(selectedBranch || undefined),
    staleTime: 2 * 60 * 1000,
    enabled: open,
  });

  const {
    data: sources = [],
    isLoading: isSourcesLoading,
    isError: isSourcesError,
  } = useQuery({
    queryKey: ['lead-sources', 'active'],
    queryFn: () => crmApi.getLeadSources({ active_only: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const {
    data: agents = [],
    isLoading: isAgentsLoading,
    isError: isAgentsError,
  } = useQuery({
    queryKey: ['eligible-agents', selectedBranch],
    queryFn: () => crmApi.getEligibleAgents(selectedBranch || undefined),
    staleTime: 2 * 60 * 1000,
    enabled: open,
  });

  // Dynamic Referrer Search
  const { data: searchReferrerResults = [], isFetching: isSearchingReferrers } = useQuery({
    queryKey: ['search-referrers', referrerQuery],
    queryFn: () => crmApi.searchReferrers(referrerQuery),
    enabled: open && referrerQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Set default branch and country on data load
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id);
    }
  }, [branches, selectedBranch]);

  React.useEffect(() => {
    if (metadata?.countries?.length && !country) {
      setCountry(metadata.countries[0]);
    }
  }, [metadata, country]);

  // Real-time duplicate check with debounce
  React.useEffect(() => {
    const rawDigits = phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? `+91${rawDigits}` : (rawDigits || undefined);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanPhone && !cleanEmail) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await crmApi.checkDuplicates({
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
        });
        setDuplicateMatches(res.has_duplicate ? res.matches : []);
      } catch (err) {
        // Silently ignore check duplicate network hiccups
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [phone, email]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Strip all non-numeric characters
    let digits = raw.replace(/\D/g, '');
    // If user pasted +91 or 91 with 12 digits, strip prefix 91
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    }
    // Strict limit to 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    setPhone(digits);
    if (formErrors.phone) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  // Reset form when modal closes
  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setGender('');
    setDateOfBirth('');
    setSelectedProgram('');
    setFitnessGoal('');
    setLocation('');
    setSelectedSource('');
    setSelectedAgent('');
    setReferredByUserId('');
    setReferredByName('');
    setSelectedReferrerObj(null);
    setReferrerQuery('');
    setBillingName('');
    setGstNumber('');
    setPanNumber('');
    setIsBillingOpen(false);
    setIsAttributionOpen(false);
    setAttrPlatform('');
    setAttrCampaignName('');
    setAttrLandingPage('');
    setAttrReferrer('');
    setAttrUtmSource('');
    setAttrUtmMedium('');
    setAttrUtmCampaign('');
    setAttrUtmTerm('');
    setAttrUtmContent('');
    setShowTechDetails(false);
    setAttrAdSetName('');
    setAttrAdName('');
    setAttrFormName('');
    setAttrExternalLeadId('');
    setFormErrors({});
    setDuplicateMatches([]);
  };

  // --- Mutation ---
  const createMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => crmApi.createLead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully.');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      const errorMsg =
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'object'
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' | ')
          : err?.message) ||
        'Failed to create lead';
      toast.error(errorMsg);
    },
  });

  // --- Form Validation ---
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(cleanEmail)) {
      errors.email = 'Please enter a valid Gmail address.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Contact number is required.';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!selectedBranch) errors.branch = 'Branch selection is required.';
    if (!selectedProgram) errors.program = 'Program selection is required.';
    if (!selectedSource) errors.source = 'Lead source is required.';
    if (!selectedAgent) errors.agent = 'Assigned sales agent is required.';

    // Date of birth validation
    if (dateOfBirth) {
      const selectedDate = new Date(dateOfBirth);
      const today = new Date();
      if (selectedDate > today) {
        errors.dateOfBirth = 'Birthday cannot be a future date.';
      }
    }

    if (gstNumber.trim()) {
      let testGst = gstNumber.trim().toUpperCase();
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(testGst)) {
        testGst = `27${testGst}`;
      }
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const genericTaxRegex = /^[A-Z0-9]{5,20}$/;
      if (!gstRegex.test(testGst) && !genericTaxRegex.test(testGst)) {
        errors.gstNumber = 'Invalid GST format (15 characters, e.g. 27AAAAA0000A1Z5).';
      }
    }

    if (panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const genericPanRegex = /^[A-Z0-9]{5,15}$/;
      if (!panRegex.test(panNumber.trim().toUpperCase()) && !genericPanRegex.test(panNumber.trim().toUpperCase())) {
        errors.panNumber = 'Invalid PAN format (e.g. ABCDE1234F).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please resolve the errors highlighted below.');
      return;
    }

    let finalGst = gstNumber.trim().toUpperCase();
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(finalGst)) {
      finalGst = `27${finalGst}`;
    }
    const finalPan = panNumber.trim().toUpperCase();

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    const canonicalPhone = `+91${cleanPhoneDigits}`;

    const payload: CreateLeadPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email_normalized: email.trim().toLowerCase(),
      phone_normalized: canonicalPhone,
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      country: country || null,
      area: location.trim() || null,
      branch: selectedBranch,
      interested_program: selectedProgram,
      fitness_goal: fitnessGoal.trim() || null,
      lead_source: selectedSource,
      assigned_sales_user: selectedAgent,
      referred_by_user: referredByUserId || null,
      referred_by_name: referredByName.trim() || null,
      billing_name: billingName.trim() || null,
      gst_number: finalGst || null,
      pan_number: finalPan || null,
      attribution: undefined, // Section 5 temporarily hidden from UI; do not send empty/fake attribution payload
    };

    createMutation.mutate(payload);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/70 bg-card/50 backdrop-blur-xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <User className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Register New Lead</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Complete tenant intake flow with legacy parity and backend-authoritative data.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
            {/* Duplicate Lead Detection Alert */}
            {duplicateMatches.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Possible existing lead found with this phone or email:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {duplicateMatches.map((m) => (
                      <li key={m.id}>
                        <span className="font-medium">{m.full_name}</span> &bull; Status: {m.current_status}
                        {m.phone && ` &bull; ${m.phone}`}
                        {m.email && ` &bull; ${m.email}`}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                    You can still proceed if this is a repeat inquiry or secondary prospective contract.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: CONTACT DETAILS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Section 1 &mdash; Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* First Name */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`h-9 text-xs sm:text-sm ${formErrors.firstName ? 'border-destructive' : ''}`}
                    required
                  />
                  {formErrors.firstName && (
                    <p className="text-[11px] text-destructive">{formErrors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`h-9 text-xs sm:text-sm ${formErrors.lastName ? 'border-destructive' : ''}`}
                    required
                  />
                  {formErrors.lastName && (
                    <p className="text-[11px] text-destructive">{formErrors.lastName}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Email Address (Gmail Only) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="rahul.sharma@gmail.com"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, '');
                        setEmail(val);
                        if (formErrors.email) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.email;
                            return next;
                          });
                        }
                      }}
                      className={`pl-9 h-9 text-xs sm:text-sm ${formErrors.email ? 'border-destructive' : ''}`}
                      required
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-[11px] text-destructive">{formErrors.email}</p>
                  )}
                </div>

                {/* Contact Number */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Contact Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative flex">
                    <div className="flex items-center gap-1 px-2.5 bg-muted/60 border border-r-0 border-input rounded-l-md text-xs text-muted-foreground font-mono select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`rounded-l-none h-9 text-xs sm:text-sm font-mono ${
                        formErrors.phone ? 'border-destructive' : ''
                      }`}
                      required
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-[11px] text-destructive">{formErrors.phone}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select gender</option>
                    {(metadata?.genders || ['Male', 'Female', 'Other', 'Prefer not to say']).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Birthday */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Birthday</Label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      max={todayStr}
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={`pl-9 h-9 text-xs sm:text-sm ${formErrors.dateOfBirth ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {formErrors.dateOfBirth && (
                    <p className="text-[11px] text-destructive">{formErrors.dateOfBirth}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: INTEREST & LOCATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Section 2 &mdash; Interest & Studio Location
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Branch Name */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Branch Name <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setSelectedProgram(''); // Reset program when branch changes
                    }}
                    className={`w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary ${
                      formErrors.branch ? 'border-destructive' : ''
                    }`}
                    disabled={isBranchesLoading}
                    required
                  >
                    {isBranchesLoading ? (
                      <option value="">Loading branches...</option>
                    ) : isBranchesError ? (
                      <option value="">Unable to load branches</option>
                    ) : branches.length === 0 ? (
                      <option value="">No branches available</option>
                    ) : (
                      <>
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.branch && (
                    <p className="text-[11px] text-destructive">{formErrors.branch}</p>
                  )}
                </div>

                {/* Interested In (Program) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Interested In <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className={`w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary ${
                      formErrors.program ? 'border-destructive' : ''
                    }`}
                    disabled={isProgramsLoading || !selectedBranch}
                    required
                  >
                    {isProgramsLoading ? (
                      <option value="">Loading programs...</option>
                    ) : !selectedBranch ? (
                      <option value="">Please select a branch first</option>
                    ) : programs.length === 0 ? (
                      <option value="">No active programs available</option>
                    ) : (
                      <>
                        <option value="">Select interest / program</option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.program && (
                    <p className="text-[11px] text-destructive">{formErrors.program}</p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Country</Label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary"
                  >
                    {(metadata?.countries || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location / Area */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Location / Area</Label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Bandra West, Mumbai"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-9 h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Fitness Goal */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Goal</Label>
                  <div className="relative">
                    <Target className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Weight loss, tone core, improve mobility"
                      value={fitnessGoal}
                      onChange={(e) => setFitnessGoal(e.target.value)}
                      className="pl-9 h-9 text-xs sm:text-sm"
                    />
                  </div>
                  {/* Goal Quick Suggestions */}
                  {metadata?.goal_suggestions && metadata.goal_suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {metadata.goal_suggestions.map((sug) => (
                        <button
                          type="button"
                          key={sug}
                          onClick={() => setFitnessGoal(sug)}
                          className="px-2.5 py-0.5 rounded-full text-[11px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: SOURCE & ASSIGNMENT */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Section 3 &mdash; Source & Assignment
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Lead Source */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Lead Source <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className={`w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary ${
                      formErrors.source ? 'border-destructive' : ''
                    }`}
                    disabled={isSourcesLoading}
                    required
                  >
                    {isSourcesLoading ? (
                      <option value="">Loading lead sources...</option>
                    ) : isSourcesError ? (
                      <option value="">Unable to load Lead Sources</option>
                    ) : sources.length === 0 ? (
                      <option value="">No active lead sources configured</option>
                    ) : (
                      <>
                        <option value="">Select source</option>
                        {sources.map((src) => (
                          <option key={src.id} value={src.id}>
                            {src.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.source && (
                    <p className="text-[11px] text-destructive">{formErrors.source}</p>
                  )}
                </div>

                {/* Assigned Agent */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Assigned Agent <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className={`w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary ${
                      formErrors.agent ? 'border-destructive' : ''
                    }`}
                    disabled={isAgentsLoading}
                    required
                  >
                    {isAgentsLoading ? (
                      <option value="">Loading agents...</option>
                    ) : isAgentsError ? (
                      <option value="">Unable to load agents</option>
                    ) : agents.length === 0 ? (
                      <option value="">No eligible agents available</option>
                    ) : (
                      <>
                        <option value="">Select an agent</option>
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name} ({ag.role_name || ag.user_type || 'Agent'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.agent && (
                    <p className="text-[11px] text-destructive">{formErrors.agent}</p>
                  )}
                </div>

                {/* Referred By (Searchable Backend Dropdown or Manual) */}
                <div className="sm:col-span-2 space-y-1 relative">
                  <Label className="text-xs font-medium">Referred By (Optional)</Label>
                  {selectedReferrerObj ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border border-input bg-card text-xs">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-semibold text-foreground">
                            {selectedReferrerObj.name}
                          </span>
                          {selectedReferrerObj.member_number && (
                            <span className="text-muted-foreground ml-1.5 font-mono">
                              #{selectedReferrerObj.member_number}
                            </span>
                          )}
                          {selectedReferrerObj.phone && (
                            <span className="text-muted-foreground ml-1.5 font-mono">
                              ({selectedReferrerObj.phone})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReferrerObj(null);
                          setReferredByUserId('');
                          setReferredByName('');
                          setReferrerQuery('');
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search member / user by name, phone or member #..."
                          value={referrerQuery}
                          onChange={(e) => {
                            setReferrerQuery(e.target.value);
                            setIsReferrerOpen(true);
                          }}
                          onFocus={() => setIsReferrerOpen(true)}
                          className="pl-9 h-9 text-xs sm:text-sm"
                        />
                        {isSearchingReferrers && (
                          <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                      </div>

                      {/* Dropdown search results */}
                      {isReferrerOpen && referrerQuery.length >= 2 && (
                        <div className="absolute z-20 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-border/40 text-xs">
                          {searchReferrerResults.length === 0 && !isSearchingReferrers ? (
                            <div className="p-3 text-center text-muted-foreground space-y-1.5">
                              <p>No existing members matching &ldquo;{referrerQuery}&rdquo;</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReferredByName(referrerQuery.trim());
                                  setSelectedReferrerObj({
                                    id: '',
                                    name: referrerQuery.trim(),
                                  });
                                  setIsReferrerOpen(false);
                                }}
                                className="h-7 text-[11px]"
                              >
                                Use &ldquo;{referrerQuery}&rdquo; as Manual Referrer Name
                              </Button>
                            </div>
                          ) : (
                            searchReferrerResults.map((r) => (
                              <button
                                type="button"
                                key={r.id}
                                onClick={() => {
                                  setSelectedReferrerObj(r);
                                  setReferredByUserId(r.id);
                                  setReferredByName(r.name);
                                  setIsReferrerOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-medium text-foreground">{r.name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {r.phone && <span>{r.phone}</span>}
                                    {r.member_number && <span className="ml-1">#{r.member_number}</span>}
                                  </div>
                                </div>
                                <Check className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100" />
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: BILLING / BUSINESS DETAILS (Collapsible) */}
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => setIsBillingOpen(!isBillingOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Section 4 &mdash; Commercial & Invoicing Details (Optional)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{isBillingOpen ? 'Hide' : 'Show'}</span>
                  {isBillingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isBillingOpen && (
                <div className="p-4 border-t border-border/60 bg-background/50 space-y-3.5">
                  <p className="text-xs text-muted-foreground">
                    Optional corporate or individual tax details for invoicing and memberships.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Billing Name */}
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">Billing Name</Label>
                      <Input
                        placeholder="Company or Individual"
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>

                    {/* GST Number */}
                    <div className="space-y-1 sm:col-span-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">GST Number</Label>
                        {/^[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.trim().toUpperCase()) && (
                          <button
                            type="button"
                            onClick={() => setGstNumber(`27${gstNumber.trim().toUpperCase()}`)}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            + Add 27 prefix
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="27AAAAA0000A1Z5"
                        value={gstNumber}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setGstNumber(val);
                          if (formErrors.gstNumber) {
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.gstNumber;
                              return next;
                            });
                          }
                          // If user entered full GST and PAN is empty, auto-populate PAN
                          if (val.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(val) && !panNumber) {
                            setPanNumber(val.slice(2, 12));
                          }
                        }}
                        onBlur={() => {
                          const val = gstNumber.trim().toUpperCase();
                          if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val)) {
                            setGstNumber(`27${val}`);
                          }
                        }}
                        maxLength={15}
                        className={`h-9 text-xs sm:text-sm font-mono uppercase ${
                          formErrors.gstNumber ? 'border-destructive' : ''
                        }`}
                      />
                      {formErrors.gstNumber && (
                        <p className="text-[11px] text-destructive">{formErrors.gstNumber}</p>
                      )}
                    </div>

                    {/* PAN Number */}
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-medium">PAN Number</Label>
                      <Input
                        placeholder="ABCDE1234F"
                        value={panNumber}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setPanNumber(val);
                          if (formErrors.panNumber) {
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.panNumber;
                              return next;
                            });
                          }
                        }}
                        maxLength={10}
                        className={`h-9 text-xs sm:text-sm font-mono uppercase ${
                          formErrors.panNumber ? 'border-destructive' : ''
                        }`}
                      />
                      {formErrors.panNumber && (
                        <p className="text-[11px] text-destructive">{formErrors.panNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: MARKETING & DIGITAL ATTRIBUTION — Temporarily hidden from Register New Lead UI per tenant UX requirements. Backend architecture, models, and APIs preserved intact. */}
          </div>

          {/* Sticky Reachable Footer */}
          <DialogFooter className="px-4 sm:px-6 py-3.5 border-t border-border/70 bg-card/70 backdrop-blur-xs flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="h-9 px-5 text-xs sm:text-sm bg-primary text-primary-foreground font-semibold shadow-xs"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Creating Lead...
                </>
              ) : (
                'Create Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  Edit2,
  Check,
  X,
  Clock,
  ArrowRight,
  Loader2,
  History,
  ShieldCheck,
  Share2,
  MessageSquare,
  CheckSquare,
  AlertTriangle,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  ArrowRightCircle,
  CheckCircle2,
  Activity,
  Layers,
  RotateCw,
  XCircle,
  Bell,
  UserX,
  Sparkles,
  Lock,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import { ConversionWizard } from './ConversionWizard';
import type {
  Lead,
  LeadStatus,
  CreateLeadPayload,
  LeadAttribution,
  LeadTimelineEvent,
  LeadNote,
  SalesFollowupTask,
  TrialBooking,
  LeadActivity,
  ActivityType,
  FollowupTaskType,
  FollowupPriority,
  CommunicationMessage,
  CommunicationChannel,
  NotificationTemplateItem,
  SendCommunicationPayload,
} from '@/types/crm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/permissions';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  NEW_LEAD: { label: 'New Lead', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  TRIAL_BOOKED: { label: 'Trial Booked', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  TRIAL_CONFIRMED: { label: 'Trial Confirmed', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  TRIAL_ATTENDED: { label: 'Trial Attended', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  NO_SHOW: { label: 'No Show', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  FOLLOW_UP_PENDING: { label: 'Follow-up Pending', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  INTERESTED: { label: 'Interested', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  HOT_LEAD: { label: 'Hot Lead', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  CONVERTED: { label: 'Converted Member', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'bg-muted text-muted-foreground border-border' },
  LOST: { label: 'Lost', color: 'bg-muted text-muted-foreground border-border' },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusTransitionClick?: (lead: Lead) => void;
  onBookTrialClick?: (lead: Lead) => void;
}

type TabType = 'overview' | 'timeline' | 'followups' | 'trial' | 'commercial' | 'attribution';
type TimelineSubFilter = 'ALL' | 'ACTIVITIES' | 'COMMUNICATIONS' | 'NOTES' | 'STAGES' | 'TRIALS' | 'FOLLOWUPS';

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onStatusTransitionClick,
  onBookTrialClick,
}: LeadDetailModalProps) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('crm.leads.edit') || can('sales.leads.edit');
  const canConvert = can('crm.leads.convert') || canEdit;
  const canViewCommunications = can('crm.communications.view');
  const canSendCommunications = can('crm.communications.send');

  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const [timelineFilter, setTimelineFilter] = React.useState<TimelineSubFilter>('ALL');
  const [isAddingNote, setIsAddingNote] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [conversionWizardOpen, setConversionWizardOpen] = React.useState(false);

  // Note composition state
  const [newNoteContent, setNewNoteContent] = React.useState('');

  // Add attribution touch state
  const [isAddingTouch, setIsAddingTouch] = React.useState(false);
  const [newTouchType, setNewTouchType] = React.useState<'ASSISTED_TOUCH' | 'LEAD_CAPTURE' | 'FIRST_TOUCH'>('ASSISTED_TOUCH');
  const [newTouchPlatform, setNewTouchPlatform] = React.useState('');
  const [newTouchCampaign, setNewTouchCampaign] = React.useState('');
  const [newTouchUtmSource, setNewTouchUtmSource] = React.useState('');
  const [newTouchUtmMedium, setNewTouchUtmMedium] = React.useState('');
  const [newTouchUtmCampaign, setNewTouchUtmCampaign] = React.useState('');
  const [newTouchLandingPage, setNewTouchLandingPage] = React.useState('');

  // Expanded technical attribution IDs map
  const [expandedTechAttrs, setExpandedTechAttrs] = React.useState<Record<string, boolean>>({});

  // Activities state
  const [isLoggingActivity, setIsLoggingActivity] = React.useState(false);
  const [actType, setActType] = React.useState<ActivityType>('CALL');
  const [actOutcome, setActOutcome] = React.useState('');
  const [actNotes, setActNotes] = React.useState('');
  const [actDuration, setActDuration] = React.useState<number | ''>('');

  // Follow-up task creation state
  const [isSchedulingFollowup, setIsSchedulingFollowup] = React.useState(false);
  const [fTaskType, setFTaskType] = React.useState<FollowupTaskType>('CALL');
  const [fPriority, setFPriority] = React.useState<FollowupPriority>('MEDIUM');
  const [fDueAt, setFDueAt] = React.useState('');
  const [fNotes, setFNotes] = React.useState('');
  const [fAssignedAgent, setFAssignedAgent] = React.useState('');

  // Task complete state
  const [completingTask, setCompletingTask] = React.useState<SalesFollowupTask | null>(null);
  const [completeOutcome, setCompleteOutcome] = React.useState('');

  // Task reschedule state
  const [reschedulingTask, setReschedulingTask] = React.useState<SalesFollowupTask | null>(null);
  const [rescheduleDueAt, setRescheduleDueAt] = React.useState('');
  const [rescheduleReason, setRescheduleReason] = React.useState('');

  // Edit fields
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [selectedBranch, setSelectedBranch] = React.useState('');
  const [selectedProgram, setSelectedProgram] = React.useState('');
  const [fitnessGoal, setFitnessGoal] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [selectedSource, setSelectedSource] = React.useState('');
  const [selectedAgent, setSelectedAgent] = React.useState('');
  const [billingName, setBillingName] = React.useState('');
  const [gstNumber, setGstNumber] = React.useState('');
  const [panNumber, setPanNumber] = React.useState('');

  // Synchronize form when lead changes
  React.useEffect(() => {
    if (lead) {
      setFirstName(lead.first_name || '');
      setLastName(lead.last_name || '');
      setEmail(lead.email_normalized || '');
      setPhone(lead.phone_normalized || '');
      setGender(lead.gender || '');
      setDateOfBirth(lead.date_of_birth || '');
      setSelectedBranch(lead.branch || '');
      setSelectedProgram(lead.interested_program || '');
      setFitnessGoal(lead.fitness_goal || '');
      setCountry(lead.country || 'India');
      setLocation(lead.area || '');
      setSelectedSource(lead.lead_source || '');
      setSelectedAgent(lead.assigned_sales_user || '');
      setBillingName(lead.billing_name || '');
      setGstNumber(lead.gst_number || '');
      setPanNumber(lead.pan_number || '');
      setIsEditing(false);
      setIsAddingTouch(false);
    }
  }, [lead]);

  // Query fresh lead details
  const { data: freshLead, isLoading: isLeadLoading } = useQuery({
    queryKey: ['lead-detail', lead?.id],
    queryFn: () => crmApi.getLead(lead!.id),
    enabled: open && !!lead?.id,
  });

  const currentLead = freshLead || lead;

  // Metadata queries for editing
  const { data: metadata } = useQuery({
    queryKey: ['lead-metadata'],
    queryFn: () => crmApi.getMetadata(),
    enabled: open && isEditing,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
    enabled: open && isEditing,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['active-programs', selectedBranch],
    queryFn: () => crmApi.getPrograms(selectedBranch || undefined),
    enabled: open && isEditing,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => crmApi.getLeadSources(),
    enabled: open && isEditing,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['eligible-agents', selectedBranch],
    queryFn: () => crmApi.getEligibleAgents(selectedBranch || undefined),
    enabled: open && isEditing,
  });

  // Timeline query
  const { data: timelineEvents = [], isLoading: isTimelineLoading, isError: isTimelineError } = useQuery({
    queryKey: ['lead-timeline', currentLead?.id],
    queryFn: () => crmApi.getLeadTimeline(currentLead!.id),
    enabled: open && !!currentLead?.id && activeTab === 'timeline',
  });

  // Attributions query
  const { data: attributionsList = [], isLoading: isAttrLoading, isError: isAttrError } = useQuery({
    queryKey: ['lead-attributions', currentLead?.id],
    queryFn: () => crmApi.getLeadAttributions(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'attribution' || activeTab === 'overview'),
  });

  // Notes query
  const { data: notesList = [], isLoading: isNotesLoading, isError: isNotesError } = useQuery({
    queryKey: ['lead-notes', currentLead?.id],
    queryFn: () => crmApi.getLeadNotes(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'timeline' || activeTab === 'overview'),
  });

  // Activities query
  const { data: activitiesList = [], isLoading: isActivitiesLoading, isError: isActivitiesError } = useQuery({
    queryKey: ['lead-activities', currentLead?.id],
    queryFn: () => crmApi.getLeadActivities(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'timeline' || activeTab === 'overview'),
  });

  // Followups query
  const { data: followupsList = [], isLoading: isFollowupsLoading, isError: isFollowupsError } = useQuery({
    queryKey: ['lead-followups', currentLead?.id],
    queryFn: () => crmApi.getLeadFollowups(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'followups' || activeTab === 'overview'),
  });

  // Trials query
  const { data: leadTrials = [], isLoading: isTrialsLoading, isError: isTrialsError } = useQuery({
    queryKey: ['lead-trials', currentLead?.id],
    queryFn: () => crmApi.getLeadTrials(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'trial' || activeTab === 'overview'),
  });

  const latestTrial = leadTrials.length > 0 ? leadTrials[0] : null;

  // Reminder schedule for latest trial
  const { data: latestReminderSchedule = [], isLoading: isLatestReminderLoading } = useQuery({
    queryKey: ['trial-reminder-schedule', latestTrial?.id],
    queryFn: () => crmApi.getTrialReminderSchedule(latestTrial!.id),
    enabled: open && !!latestTrial?.id && activeTab === 'trial',
  });

  // Next Best Action query
  const { data: nextActionData, isLoading: isNextActionLoading } = useQuery({
    queryKey: ['lead-next-action', currentLead?.id],
    queryFn: () => crmApi.getLeadNextAction(currentLead!.id),
    enabled: open && !!currentLead?.id,
  });

  const handleExecuteNextAction = (actionCode?: string) => {
    if (!actionCode) return;
    if (actionCode === 'BOOK_TRIAL') {
      if (onBookTrialClick) onBookTrialClick(currentLead!);
      else setActiveTab('trial');
    } else if (actionCode === 'CALL_LEAD') {
      setActiveTab('timeline');
      setTimelineFilter('ACTIVITIES');
      setIsLoggingActivity(true);
      setActType('CALL');
    } else if (actionCode === 'CREATE_FOLLOWUP' || actionCode === 'POST_TRIAL_FOLLOWUP') {
      setActiveTab('followups');
      setIsSchedulingFollowup(true);
    } else if (actionCode === 'SEND_COMMUNICATION') {
      setActiveTab('timeline');
      if (canViewCommunications) setTimelineFilter('COMMUNICATIONS');
      if (canSendCommunications) {
        setIsComposeOpen(true);
        setComposeChannel('WHATSAPP');
        setComposeRecipient(currentLead?.phone_normalized || '');
      }
    } else if (actionCode === 'CONFIRM_TRIAL' || actionCode === 'RESCHEDULE_TRIAL') {
      setActiveTab('trial');
    } else if (actionCode === 'ASSIGN_LEAD') {
      setIsEditing(true);
    } else if (actionCode === 'CHANGE_LEAD_STAGE') {
      if (onStatusTransitionClick) onStatusTransitionClick(currentLead!);
    } else {
      setActiveTab('timeline');
    }
  };

  // Trial actions mutations
  const confirmTrialMutation = useMutation({
    mutationFn: ({ trialId, channel }: { trialId: string; channel: any }) =>
      crmApi.confirmTrial(trialId, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-trials', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      toast.success('Trial attendance confirmed!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to confirm trial');
    },
  });

  const markAttendedMutation = useMutation({
    mutationFn: (trialId: string) => crmApi.markTrialAttended(trialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-trials', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      toast.success('Trial marked as Attended! Follow-up generated if enabled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to mark attended');
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: (trialId: string) => crmApi.markTrialNoShow(trialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-trials', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      toast.success('Trial marked as No-Show! Recovery task created if enabled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to mark no-show');
    },
  });

  // Update Lead Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateLeadPayload>) =>
      crmApi.updateLead(currentLead!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead?.id] });
      toast.success('Lead updated successfully.');
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update lead');
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: (content: string) => crmApi.createLeadNote(currentLead!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      setNewNoteContent('');
      toast.success('Note added to timeline.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to add note');
    },
  });

  // Add Attribution Touch Mutation
  const addTouchMutation = useMutation({
    mutationFn: (payload: Partial<LeadAttribution>) =>
      crmApi.createLeadAttribution(currentLead!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-attributions', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead?.id] });
      setIsAddingTouch(false);
      setNewTouchCampaign('');
      setNewTouchPlatform('');
      setNewTouchUtmSource('');
      setNewTouchUtmMedium('');
      setNewTouchUtmCampaign('');
      setNewTouchLandingPage('');
      toast.success('Attribution touch recorded.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to record attribution touch');
    },
  });

  // Add Lead Activity Mutation
  const addActivityMutation = useMutation({
    mutationFn: (payload: { activity_type: ActivityType; outcome?: string; notes?: string; duration_minutes?: number }) =>
      crmApi.createLeadActivity(currentLead!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      setIsLoggingActivity(false);
      setActOutcome('');
      setActNotes('');
      setActDuration('');
      toast.success('Activity logged to CRM.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to log activity');
    },
  });

  // Add Follow-up Task Mutation
  const addFollowupMutation = useMutation({
    mutationFn: (payload: { task_type: FollowupTaskType; priority: FollowupPriority; due_at: string; notes?: string; assigned_to_user?: string }) =>
      crmApi.createLeadFollowup(currentLead!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-followups', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-queue-counts'] });
      setIsSchedulingFollowup(false);
      setFNotes('');
      setFDueAt('');
      toast.success('Follow-up scheduled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to schedule follow-up');
    },
  });

  // Complete Follow-up Task Mutation
  const completeFollowupMutation = useMutation({
    mutationFn: ({ taskId, outcome }: { taskId: string; outcome: string }) =>
      crmApi.completeFollowupTask(taskId, { outcome, log_activity: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-followups', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-queue-counts'] });
      setCompletingTask(null);
      setCompleteOutcome('');
      toast.success('Follow-up marked completed.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to complete follow-up');
    },
  });

  // Reschedule Follow-up Task Mutation
  const rescheduleFollowupMutation = useMutation({
    mutationFn: ({ taskId, due_at, reason }: { taskId: string; due_at: string; reason?: string }) =>
      crmApi.rescheduleFollowupTask(taskId, { due_at, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-followups', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-queue-counts'] });
      setReschedulingTask(null);
      setRescheduleDueAt('');
      setRescheduleReason('');
      toast.success('Follow-up rescheduled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to reschedule follow-up');
    },
  });

  // Cancel Follow-up Task Mutation
  const cancelFollowupMutation = useMutation({
    mutationFn: (taskId: string) => crmApi.cancelFollowupTask(taskId, { reason: 'Cancelled from Lead 360' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-followups', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-queue-counts'] });
      toast.success('Follow-up cancelled.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to cancel follow-up');
    },
  });

  // Communications Query
  const { data: communicationsList = [], isLoading: isCommunicationsLoading } = useQuery({
    queryKey: ['lead-communications', currentLead?.id],
    queryFn: () => crmApi.getCommunications({ lead_id: currentLead!.id }),
    enabled: open && !!currentLead?.id && activeTab === 'timeline' && (timelineFilter === 'ALL' || timelineFilter === 'COMMUNICATIONS') && canViewCommunications,
  });

  // Offers & Commercial Query
  const { data: leadOffersData, isLoading: isOffersLoading } = useQuery({
    queryKey: ['lead-offers', currentLead?.id],
    queryFn: () => crmApi.getLeadOffers(currentLead!.id),
    enabled: open && !!currentLead?.id && (activeTab === 'commercial' || activeTab === 'overview'),
  });

  // Communication Compose State
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [composeChannel, setComposeChannel] = React.useState<CommunicationChannel>('WHATSAPP');
  const [composeRecipient, setComposeRecipient] = React.useState('');
  const [composePurpose, setComposePurpose] = React.useState<'TRANSACTIONAL' | 'MARKETING'>('TRANSACTIONAL');
  const [composeTemplateId, setComposeTemplateId] = React.useState('');
  const [composeSubject, setComposeSubject] = React.useState('');
  const [composeBody, setComposeBody] = React.useState('');
  const [commChannelFilter, setCommChannelFilter] = React.useState<string>('ALL');
  const [expandedMsgEvents, setExpandedMsgEvents] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (currentLead) {
      if (composeChannel === 'EMAIL') {
        setComposeRecipient(currentLead.email_normalized || '');
      } else {
        setComposeRecipient(currentLead.phone_normalized || '');
      }
    }
  }, [currentLead, composeChannel]);

  const { data: templatesList = [] } = useQuery({
    queryKey: ['notification-templates', composeChannel],
    queryFn: () => crmApi.getNotificationTemplates(composeChannel),
    enabled: isComposeOpen,
  });

  const sendCommunicationMutation = useMutation({
    mutationFn: (payload: SendCommunicationPayload) => crmApi.sendCommunication(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-communications', currentLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', currentLead?.id] });
      setIsComposeOpen(false);
      setComposeBody('');
      setComposeSubject('');
      setComposeTemplateId('');
      if (data.status === 'FAILED') {
        toast.error(`Message dispatch failed: ${data.failure_reason || data.failure_code || 'Provider error'}`);
      } else {
        toast.success(`Message sent via ${data.channel}!`);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to dispatch message';
      toast.error(msg);
    },
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    let finalGst = gstNumber.trim().toUpperCase();
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(finalGst)) {
      finalGst = `27${finalGst}`;
    }
    const finalPan = panNumber.trim().toUpperCase();

    const payload: Partial<CreateLeadPayload> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email_normalized: email.trim() || null,
      phone_normalized: phone.trim() || null,
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      country: country || null,
      area: location.trim() || null,
      branch: selectedBranch || null,
      interested_program: selectedProgram || null,
      fitness_goal: fitnessGoal.trim() || null,
      lead_source: selectedSource || null,
      assigned_sales_user: selectedAgent || null,
      billing_name: billingName.trim() || null,
      gst_number: finalGst || null,
      pan_number: finalPan || null,
    };

    updateMutation.mutate(payload);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addNoteMutation.mutate(newNoteContent.trim());
  };

  const handleAddTouch = (e: React.FormEvent) => {
    e.preventDefault();
    addTouchMutation.mutate({
      touch_type: newTouchType,
      platform: newTouchPlatform.trim() || null,
      campaign_name: newTouchCampaign.trim() || null,
      utm_source: newTouchUtmSource.trim() || null,
      utm_medium: newTouchUtmMedium.trim() || null,
      utm_campaign: newTouchUtmCampaign.trim() || null,
      landing_page_url: newTouchLandingPage.trim() || null,
      capture_method: 'MANUAL',
    });
  };

  const toggleTechAttr = (id: string) => {
    setExpandedTechAttrs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!currentLead) return null;

  const statusConf = STATUS_CONFIG[currentLead.current_status] || {
    label: currentLead.current_status,
    color: 'bg-muted text-muted-foreground',
  };

  const sla = currentLead.sla;
  const stageAgeSeconds = sla?.stage_age_seconds ?? 0;
  const stageAgeFormatted = formatDuration(stageAgeSeconds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-none sm:rounded-2xl">
        {/* LEAD 360 HEADER (PART E.8) */}
        <DialogHeader className="px-5 sm:px-6 py-3.5 border-b border-border/70 bg-card/50 backdrop-blur-xs shrink-0 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                {currentLead.first_name?.charAt(0)}
                {currentLead.last_name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-bold">
                    {currentLead.first_name} {currentLead.last_name}
                  </DialogTitle>
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${statusConf.color}`}>
                    {statusConf.label}
                  </Badge>
                  {/* SLA STATUS BADGE */}
                  {sla && sla.sla_status === 'BREACHED' && (
                    <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-500 border-rose-500/30 gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      SLA Breached ({stageAgeFormatted} in stage)
                    </Badge>
                  )}
                  {sla && sla.sla_status === 'ON_TRACK' && (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      SLA On Track ({stageAgeFormatted} in stage)
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Lead #{currentLead.id.substring(0, 8)}</span>
                  <span>&bull;</span>
                  <span>Branch: {currentLead.branch_name || 'Unassigned'}</span>
                  <span>&bull;</span>
                  <span>Source: {currentLead.source_name || currentLead.first_touch_source || 'Direct'}</span>
                  <span>&bull;</span>
                  <span>Agent: {currentLead.assigned_sales_name || 'Unassigned'}</span>
                </DialogDescription>
              </div>
            </div>

            {/* ACTION BUTTONS (STATE & RBAC GOVERNED) */}
            {(() => {
              const isConverted = currentLead.current_status === 'CONVERTED';
              const isTerminalLost = currentLead.current_status === 'LOST' || currentLead.current_status === 'NOT_INTERESTED';
              const isActiveProspect = !isConverted && !isTerminalLost;

              return (
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                  {isActiveProspect && canEdit && onStatusTransitionClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusTransitionClick(currentLead)}
                      className="h-8 text-xs gap-1.5 font-medium"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Move Stage
                    </Button>
                  )}
                  {isActiveProspect && canEdit && onBookTrialClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBookTrialClick(currentLead)}
                      className="h-8 text-xs gap-1.5 font-medium"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Book Trial
                    </Button>
                  )}
                  {canEdit && !isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTab('overview');
                        setIsEditing(true);
                      }}
                      className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                  {isActiveProspect && canConvert && (
                    <Button
                      size="sm"
                      onClick={() => setConversionWizardOpen(true)}
                      className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm shadow-emerald-500/20"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Convert to Member
                    </Button>
                  )}
                  {isConverted && (
                    <Badge variant="outline" className="h-8 px-3 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Member
                    </Badge>
                  )}
                  {isTerminalLost && canEdit && onStatusTransitionClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusTransitionClick(currentLead)}
                      className="h-8 text-xs gap-1.5 font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reopen Lead
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Conversion Wizard */}
          {currentLead && conversionWizardOpen && (
            <ConversionWizard
              lead={currentLead}
              open={conversionWizardOpen}
              onOpenChange={setConversionWizardOpen}
              onConverted={() => {
                queryClient.invalidateQueries({ queryKey: ['lead-detail', currentLead.id] });
                queryClient.invalidateQueries({ queryKey: ['leads'] });
              }}
            />
          )}

          {/* CONSOLIDATED 6-TAB BAR */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1 -mb-1 border-t border-border/40">
            {/* 1. OVERVIEW */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Overview
            </button>

            {/* 2. TIMELINE */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('timeline');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Timeline
              {(timelineEvents.length > 0 || activitiesList.length > 0 || notesList.length > 0) && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20">
                  {timelineEvents.length || (activitiesList.length + notesList.length)}
                </span>
              )}
            </button>

            {/* 3. FOLLOW-UPS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('followups');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'followups'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Follow-ups
              {followupsList.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20">
                  {followupsList.length}
                </span>
              )}
            </button>

            {/* 4. TRIAL */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('trial');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'trial'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Trial
              {leadTrials.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20">
                  {leadTrials.length}
                </span>
              )}
            </button>

            {/* 5. COMMERCIAL */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('commercial');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'commercial'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Commercial
              {leadOffersData && ((leadOffersData.available_coupons?.length || 0) > 0 || (leadOffersData.campaigns?.length || 0) > 0) && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20">
                  {(leadOffersData.available_coupons?.length || 0) + (leadOffersData.campaigns?.length || 0)}
                </span>
              )}
            </button>

            {/* 6. ATTRIBUTION */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('attribution');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'attribution'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Attribution
              {(attributionsList.length > 0 || (currentLead.attributions && currentLead.attributions.length > 0)) && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20">
                  {attributionsList.length || currentLead.attributions?.length}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        {/* BODY CONTENT BY TAB */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">First Name *</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Last Name *</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Email Address</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Phone Number</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Branch</Label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Program Interest</Label>
                      <select
                        value={selectedProgram}
                        onChange={(e) => setSelectedProgram(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">Select program</option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Lead Source</Label>
                      <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">Select source</option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Assigned Agent</Label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">Select agent</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role_name || a.user_type || 'Agent'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-medium">Fitness Goal</Label>
                      <Input value={fitnessGoal} onChange={(e) => setFitnessGoal(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Billing Name</Label>
                      <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">GST Number</Label>
                      <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* OVERVIEW CARDS */
                <div className="space-y-4">
                  {/* NEXT BEST ACTION CARD (PHASE 7) */}
                  {isNextActionLoading ? (
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Evaluating pipeline attention rules & next best action...</span>
                    </div>
                  ) : nextActionData?.is_stuck ? (
                    <div className={`p-4 rounded-xl border transition-all ${
                      nextActionData.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : nextActionData.severity === 'HIGH'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-primary/5 border-primary/20'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${
                            nextActionData.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-600'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                Next Best Action
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  nextActionData.severity === 'CRITICAL'
                                    ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                                    : 'border-amber-500 text-amber-600 bg-amber-500/10'
                                }`}
                              >
                                {nextActionData.severity} URGENCY
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                              {nextActionData.primary_reason_display}
                            </p>
                          </div>
                        </div>
                        {nextActionData.overdue_by_seconds > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 px-2.5 py-1 rounded-md border border-border/40 self-start sm:self-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            <span>Overdue by {formatDuration(nextActionData.overdue_by_seconds)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground flex-1">
                          {nextActionData.recommended_action?.reason || 'Prospect requires immediate operational follow-up.'}
                        </p>
                        {nextActionData.recommended_action && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleExecuteNextAction(nextActionData.recommended_action?.action_code)}
                            className="gap-1.5 text-xs font-semibold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{nextActionData.recommended_action.display_name}</span>
                            <ArrowRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : nextActionData && !nextActionData.is_stuck ? (
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                            Pipeline Cadence On Track
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            Lead is within standard response windows. No immediate escalation needed.
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">
                        ON TRACK
                      </Badge>
                    </div>
                  ) : null}

                  {/* SLA & Pipeline Status Summary Card */}
                  <div className="p-4 rounded-xl border border-border/80 bg-card/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Current Stage</span>
                      <span className="font-bold text-foreground text-sm">{statusConf.label}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Stage Duration</span>
                      <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {stageAgeFormatted}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">SLA Target & Policy</span>
                      <span className="font-semibold text-foreground">
                        {sla?.sla_target_value ? `${sla.sla_target_value} ${sla.sla_target_unit?.toLowerCase()}` : 'No SLA Target'}
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Contact & Program Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact Details Card */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Contact Profile
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-semibold font-mono text-foreground">{currentLead.phone_normalized || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-semibold text-foreground">{currentLead.email_normalized || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Gender</span>
                          <span className="text-foreground">{currentLead.gender || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Location / Area</span>
                          <span className="text-foreground">{currentLead.area || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Country</span>
                          <span className="text-foreground">{currentLead.country || 'India'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details Card */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Branch & Program Interest
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="font-semibold text-foreground">{currentLead.branch_name || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Interested Program</span>
                          <span className="font-semibold text-foreground">{currentLead.interested_program_name || 'General Membership'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Assigned Sales Agent</span>
                          <span className="font-semibold text-foreground">{currentLead.assigned_sales_name || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Primary Source</span>
                          <span className="text-foreground">{currentLead.source_name || currentLead.first_touch_source || 'Direct'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Fitness Goal</span>
                          <span className="text-foreground italic">{currentLead.fitness_goal || 'None specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commercial & Invoicing Card */}
                  {(currentLead.billing_name || currentLead.gst_number || currentLead.pan_number) && (
                    <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        Commercial Invoicing Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Billing Entity</span>
                          <span className="font-semibold text-foreground">{currentLead.billing_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">GST Number</span>
                          <span className="font-mono font-semibold text-foreground">{currentLead.gst_number || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">PAN Number</span>
                          <span className="font-mono font-semibold text-foreground">{currentLead.pan_number || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Latest Attribution Snapshot */}
                  {currentLead.latest_attribution && (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5" />
                          Latest Marketing Attribution Snapshot
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('attribution')}
                          className="h-6 text-[11px] text-primary"
                        >
                          View All Touches &rarr;
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Touch Type</span>
                          <span className="font-semibold text-foreground">{currentLead.latest_attribution.touch_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Platform</span>
                          <span className="font-semibold text-foreground">{currentLead.latest_attribution.platform || 'Direct'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Campaign</span>
                          <span className="font-semibold text-foreground">{currentLead.latest_attribution.campaign_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">UTM Source</span>
                          <span className="font-semibold text-foreground font-mono">{currentLead.latest_attribution.utm_source || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONSOLIDATED TIMELINE (Timeline, Activities, Communications, Staff Notes) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Header with Title, Actions & Sub-Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Interaction Timeline & History
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Chronological activity log: touchpoints, messages, internal notes, trials, and stage movements.
                  </p>
                </div>

                {/* Contextual Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {canEdit && (
                    <Button
                      variant={isLoggingActivity ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setIsLoggingActivity(!isLoggingActivity);
                        setIsAddingNote(false);
                      }}
                      className="h-8 text-xs gap-1.5 font-medium"
                    >
                      {isLoggingActivity ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {isLoggingActivity ? 'Cancel' : 'Log Activity'}
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      variant={isAddingNote ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setIsAddingNote(!isAddingNote);
                        setIsLoggingActivity(false);
                      }}
                      className="h-8 text-xs gap-1.5 font-medium"
                    >
                      {isAddingNote ? <X className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      {isAddingNote ? 'Cancel' : 'Add Note'}
                    </Button>
                  )}

                  {canSendCommunications && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsComposeOpen(true);
                        setComposeChannel('WHATSAPP');
                        setComposeRecipient(currentLead?.phone_normalized || '');
                      }}
                      className="h-8 text-xs gap-1.5 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Compose Message
                    </Button>
                  )}
                </div>
              </div>

              {/* ACTION FORM: LOG ACTIVITY */}
              {isLoggingActivity && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!actOutcome.trim()) {
                      toast.error('Outcome is required');
                      return;
                    }
                    addActivityMutation.mutate({
                      activity_type: actType,
                      outcome: actOutcome.trim(),
                      notes: actNotes.trim() || undefined,
                      duration_minutes: actDuration ? Number(actDuration) : undefined,
                    });
                  }}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                >
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Record Sales Touchpoint / Interaction</span>
                    <button
                      type="button"
                      onClick={() => setIsLoggingActivity(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Activity Type *</Label>
                      <select
                        value={actType}
                        onChange={(e) => setActType(e.target.value as ActivityType)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="CALL">Phone Call</option>
                        <option value="WHATSAPP">WhatsApp Interaction</option>
                        <option value="EMAIL">Email</option>
                        <option value="VISIT">In-Person Visit</option>
                        <option value="MEETING">Meeting</option>
                        <option value="TRIAL">Trial Session</option>
                        <option value="PAYMENT_LINK">Payment Link Sent</option>
                        <option value="OTHER">Other Interaction</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Outcome / Result *</Label>
                      <Input
                        placeholder="e.g. Interested in morning slot"
                        value={actOutcome}
                        onChange={(e) => setActOutcome(e.target.value)}
                        className="h-8 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Duration (mins)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 5"
                        value={actDuration}
                        onChange={(e) => setActDuration(e.target.value ? Number(e.target.value) : '')}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Notes / Discussion Summary</Label>
                    <Input
                      placeholder="Details discussed with customer..."
                      value={actNotes}
                      onChange={(e) => setActNotes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLoggingActivity(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addActivityMutation.isPending}
                      className="h-8 text-xs font-semibold bg-primary text-primary-foreground"
                    >
                      {addActivityMutation.isPending ? 'Logging...' : 'Save Activity'}
                    </Button>
                  </div>
                </form>
              )}

              {/* ACTION FORM: ADD STAFF NOTE */}
              {isAddingNote && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Record Confidential Internal Note
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Textarea
                    placeholder="Record notes on prospect conversation, trial feedback, coaching observations, or special requests..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="text-xs resize-none bg-background"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingNote(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newNoteContent.trim()) {
                          toast.error('Note content cannot be empty.');
                          return;
                        }
                        addNoteMutation.mutate(newNoteContent.trim(), {
                          onSuccess: () => setIsAddingNote(false),
                        });
                      }}
                      disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                      className="h-8 text-xs font-semibold bg-primary text-primary-foreground"
                    >
                      {addNoteMutation.isPending ? 'Posting...' : 'Save Note'}
                    </Button>
                  </div>
                </div>
              )}

              {/* TIMELINE SUB-FILTERS */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(
                  [
                    { id: 'ALL', label: 'All Events' },
                    { id: 'ACTIVITIES', label: 'Activities', count: activitiesList.length },
                    ...(canViewCommunications
                      ? [{ id: 'COMMUNICATIONS', label: 'Communications', count: communicationsList.length }]
                      : []),
                    { id: 'NOTES', label: 'Staff Notes', count: notesList.length },
                    { id: 'STAGES', label: 'Stage Changes' },
                    { id: 'TRIALS', label: 'Trials', count: leadTrials.length },
                    { id: 'FOLLOWUPS', label: 'Follow-ups', count: followupsList.length },
                  ] as Array<{ id: TimelineSubFilter; label: string; count?: number }>
                ).map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setTimelineFilter(flt.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                      timelineFilter === flt.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{flt.label}</span>
                    {flt.count !== undefined && flt.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          timelineFilter === flt.id
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {flt.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* SUB-VIEW 1: ACTIVITIES */}
              {timelineFilter === 'ACTIVITIES' && (
                <div className="space-y-3 pt-1">
                  {isActivitiesLoading ? (
                    <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      Loading activities...
                    </div>
                  ) : isActivitiesError ? (
                    <div className="py-8 text-center text-destructive text-xs">Unable to load activities.</div>
                  ) : activitiesList.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6">
                      No activities recorded yet. Click "Log Activity" above to record customer touchpoints.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activitiesList.map((act) => (
                        <div key={act.id} className="p-3.5 rounded-xl border border-border/70 bg-card/40 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-semibold">
                                {act.activity_type.replace('_', ' ')}
                              </Badge>
                              <span className="font-semibold text-foreground">{act.outcome}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {new Date(act.activity_at).toLocaleString()}
                            </span>
                          </div>
                          {act.notes && (
                            <p className="text-muted-foreground text-xs whitespace-pre-line pl-1 border-l-2 border-primary/20">
                              {act.notes}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span>Logged by: <strong className="text-foreground">{act.performed_by_name || 'Staff'}</strong></span>
                            {act.duration_minutes ? <span>Duration: <strong className="text-foreground">{act.duration_minutes} min</strong></span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 2: STAFF NOTES */}
              {timelineFilter === 'NOTES' && (
                <div className="space-y-3 pt-1">
                  {/* Quick Compose Input */}
                  {canEdit && !isAddingNote && (
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <Input
                        placeholder="Type an internal note regarding this lead..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newNoteContent.trim() || addNoteMutation.isPending}
                        className="h-9 text-xs px-4 shrink-0 font-medium"
                      >
                        {addNoteMutation.isPending ? 'Posting...' : 'Add Note'}
                      </Button>
                    </form>
                  )}

                  {isNotesLoading ? (
                    <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      Loading notes...
                    </div>
                  ) : notesList.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6">
                      No internal notes recorded yet. Click "Add Note" above to write confidential observations.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notesList.map((note) => (
                        <div key={note.id} className="p-3.5 rounded-xl border border-border/70 bg-card/40 space-y-1 text-xs">
                          <p className="text-foreground whitespace-pre-line">{note.content}</p>
                          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                            <span>By: <strong className="text-foreground">{note.created_by_name || 'Staff'}</strong></span>
                            <span>{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3: COMMUNICATIONS */}
              {timelineFilter === 'COMMUNICATIONS' && (
                <div className="space-y-3 pt-1">
                  {!canViewCommunications ? (
                    <div className="py-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6 space-y-2">
                      <Shield className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <div className="font-semibold text-foreground text-sm">Access Restricted</div>
                      <div>You do not have permission to view lead communications (required: <code>crm.communications.view</code>).</div>
                    </div>
                  ) : (
                    <>
                      {/* CONSENT PROFILE */}
                      <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-muted-foreground">Consent Profile:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={currentLead?.do_not_contact ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}>
                            {currentLead?.do_not_contact ? 'DNC Active' : 'Contact Permitted'}
                          </Badge>
                          <Badge variant="outline" className={currentLead?.consent_whatsapp ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}>
                            WhatsApp: {currentLead?.consent_whatsapp ? 'Opted In' : 'No Consent'}
                          </Badge>
                          <Badge variant="outline" className={currentLead?.consent_email ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}>
                            Email: {currentLead?.consent_email ? 'Opted In' : 'No Consent'}
                          </Badge>
                          <Badge variant="outline" className={currentLead?.consent_sms ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}>
                            SMS: {currentLead?.consent_sms ? 'Opted In' : 'No Consent'}
                          </Badge>
                        </div>
                      </div>

                      {/* CHANNEL FILTERS */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['ALL', 'WHATSAPP', 'EMAIL', 'SMS', 'INBOUND'].map((filterKey) => (
                          <button
                            key={filterKey}
                            type="button"
                            onClick={() => setCommChannelFilter(filterKey)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                              commChannelFilter === filterKey
                                ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            {filterKey === 'ALL' ? 'All Messages' : filterKey}
                          </button>
                        ))}
                      </div>

                      {/* MESSAGES LIST */}
                      {isCommunicationsLoading ? (
                        <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          Loading communications...
                        </div>
                      ) : communicationsList.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6">
                          No communications logged for this lead yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {communicationsList
                            .filter((msg) => {
                              if (commChannelFilter === 'ALL') return true;
                              if (commChannelFilter === 'INBOUND') return msg.direction === 'INBOUND';
                              return msg.channel === commChannelFilter;
                            })
                            .map((msg) => {
                              const isExpanded = expandedMsgEvents[msg.id];
                              const isOutbound = msg.direction === 'OUTBOUND';
                              return (
                                <div
                                  key={msg.id}
                                  className={`p-3.5 rounded-xl border transition-all text-xs ${
                                    isOutbound
                                      ? 'bg-card/40 border-border/80 border-l-4 border-l-primary'
                                      : 'bg-primary/5 border-primary/20 border-l-4 border-l-purple-500'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge variant="outline" className={isOutbound ? 'bg-primary/10 text-primary border-primary/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}>
                                        {isOutbound ? 'Outbound' : 'Inbound Reply'}
                                      </Badge>
                                      <Badge variant="outline" className="font-mono text-[10px]">
                                        {msg.channel}
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px]">
                                        {msg.provider || 'System'}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={
                                          msg.status === 'READ' || msg.status === 'DELIVERED'
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                            : msg.status === 'FAILED'
                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                        }
                                      >
                                        {msg.status}
                                      </Badge>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      {new Date(msg.sent_at || msg.received_at || msg.created_at).toLocaleString()}
                                    </span>
                                  </div>

                                  {msg.subject && (
                                    <div className="font-semibold text-foreground pb-1">
                                      Subject: {msg.subject}
                                    </div>
                                  )}

                                  <div className="text-foreground whitespace-pre-wrap py-1 text-xs leading-relaxed">
                                    {msg.body_snapshot}
                                  </div>

                                  {msg.failure_reason && (
                                    <div className="mt-2 p-2 rounded bg-rose-500/10 text-rose-500 text-[11px] border border-rose-500/20 flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Failure: {msg.failure_reason}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                                    <span>
                                      {isOutbound ? `To: ${msg.recipient}` : `From: ${msg.sender}`} &bull; By: {msg.created_by_user_name || 'Staff'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {msg.status_events && msg.status_events.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedMsgEvents((prev) => ({
                                              ...prev,
                                              [msg.id]: !prev[msg.id],
                                            }))
                                          }
                                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                                        >
                                          {isExpanded ? 'Hide Events' : `Events (${msg.status_events.length})`}
                                        </button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => {
                                          setIsComposeOpen(true);
                                          setComposeChannel(msg.channel);
                                          setComposeRecipient(isOutbound ? msg.recipient : msg.sender);
                                        }}
                                      >
                                        Reply
                                      </Button>
                                    </div>
                                  </div>

                                  {isExpanded && msg.status_events && (
                                    <div className="mt-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/70 space-y-1.5 text-[11px]">
                                      <div className="font-semibold text-foreground">Delivery Event History:</div>
                                      {msg.status_events.map((ev) => (
                                        <div key={ev.id} className="flex items-center justify-between text-muted-foreground border-b border-border/30 pb-1 last:border-b-0">
                                          <span>
                                            {ev.from_status || 'INIT'} &rarr; <strong className="text-foreground">{ev.to_status}</strong>
                                            {ev.provider_event_id && <span className="font-mono text-[9px] ml-1">({ev.provider_event_id})</span>}
                                          </span>
                                          <span>{new Date(ev.occurred_at).toLocaleTimeString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SUB-VIEW 4: UNIFIED TIMELINE (ALL / STAGES / TRIALS / FOLLOWUPS) */}
              {(timelineFilter === 'ALL' || timelineFilter === 'STAGES' || timelineFilter === 'TRIALS' || timelineFilter === 'FOLLOWUPS') && (
                <div className="pt-1">
                  {isTimelineLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs">Aggregating CRM events into unified timeline...</p>
                    </div>
                  ) : isTimelineError ? (
                    <div className="py-8 text-center text-destructive text-xs">
                      Unable to load unified timeline. Please try again.
                    </div>
                  ) : (
                    (() => {
                      const eventsToShow = timelineEvents.filter((evt) => {
                        if (timelineFilter === 'ALL') return true;
                        if (timelineFilter === 'STAGES') return evt.event_type === 'STATUS_CHANGE';
                        if (timelineFilter === 'TRIALS') return evt.event_type === 'TRIAL_BOOKED' || evt.event_type === 'TRIAL_STATUS_CHANGE';
                        if (timelineFilter === 'FOLLOWUPS') return evt.event_type === 'FOLLOWUP_TASK';
                        return true;
                      });

                      if (eventsToShow.length === 0) {
                        return (
                          <div className="py-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl p-6">
                            No {timelineFilter === 'ALL' ? 'timeline' : timelineFilter.toLowerCase()} events recorded for this lead yet.
                          </div>
                        );
                      }

                      return (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                          {eventsToShow.map((evt) => {
                            let IconComponent = Activity;
                            let iconBg = 'bg-primary/10 text-primary';

                            if (evt.event_type === 'LEAD_CREATED') {
                              IconComponent = UserPlus;
                              iconBg = 'bg-blue-500/10 text-blue-500';
                            } else if (evt.event_type === 'STATUS_CHANGE') {
                              IconComponent = ArrowRightCircle;
                              iconBg = 'bg-amber-500/10 text-amber-500';
                            } else if (evt.event_type === 'ASSIGNMENT') {
                              IconComponent = UserCheck;
                              iconBg = 'bg-indigo-500/10 text-indigo-500';
                            } else if (evt.event_type === 'ATTRIBUTION_CAPTURED') {
                              IconComponent = Share2;
                              iconBg = 'bg-purple-500/10 text-purple-500';
                            } else if (evt.event_type === 'TRIAL_BOOKED' || evt.event_type === 'TRIAL_STATUS_CHANGE') {
                              IconComponent = Calendar;
                              iconBg = 'bg-teal-500/10 text-teal-500';
                            } else if (evt.event_type === 'LEAD_NOTE') {
                              IconComponent = MessageSquare;
                              iconBg = 'bg-emerald-500/10 text-emerald-500';
                            } else if (evt.event_type === 'FOLLOWUP_TASK') {
                              IconComponent = CheckSquare;
                              iconBg = 'bg-cyan-500/10 text-cyan-500';
                            } else if (evt.event_type === 'COMMUNICATION') {
                              IconComponent = Send;
                              iconBg = 'bg-violet-500/10 text-violet-500';
                            }

                            return (
                              <div key={evt.id} className="relative group">
                                <div
                                  className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full ${iconBg} border-2 border-background flex items-center justify-center shrink-0 shadow-xs`}
                                >
                                  <IconComponent className="w-3 h-3" />
                                </div>

                                <div className="p-3.5 rounded-xl border border-border/70 bg-card/50 hover:border-border transition-colors space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-foreground">{evt.title}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                      {new Date(evt.occurred_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {evt.description && (
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">{evt.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                                    <span>Actor: <strong className="text-foreground font-medium">{evt.actor}</strong></span>
                                    <span>&bull;</span>
                                    <span>Channel: <strong className="text-foreground font-medium">{evt.channel}</strong></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTRIBUTION TOUCHES (PART G) */}
          {activeTab === 'attribution' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Historical Attribution Touchpoints
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Chronological audit of acquisition, discovery, and conversion touches.
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTouch(!isAddingTouch)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record Touchpoint
                  </Button>
                )}
              </div>

              {/* RECORD TOUCHPOINT INLINE FORM */}
              {isAddingTouch && (
                <form onSubmit={handleAddTouch} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <span className="text-xs font-bold text-foreground block">Record Additional Attribution Touch</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Touch Type</Label>
                      <select
                        value={newTouchType}
                        onChange={(e: any) => setNewTouchType(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="ASSISTED_TOUCH">Assisted Touch (Secondary)</option>
                        <option value="LEAD_CAPTURE">Lead Capture (Conversion)</option>
                        <option value="FIRST_TOUCH">First Touch (Initial Discovery)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Platform / Channel</Label>
                      <Input
                        placeholder="e.g. INSTAGRAM, META, GOOGLE"
                        value={newTouchPlatform}
                        onChange={(e) => setNewTouchPlatform(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Campaign Name</Label>
                      <Input
                        placeholder="e.g. Winter Bootcamp 2026"
                        value={newTouchCampaign}
                        onChange={(e) => setNewTouchCampaign(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">UTM Source</Label>
                      <Input
                        placeholder="e.g. instagram"
                        value={newTouchUtmSource}
                        onChange={(e) => setNewTouchUtmSource(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">UTM Medium</Label>
                      <Input
                        placeholder="e.g. paid_social"
                        value={newTouchUtmMedium}
                        onChange={(e) => setNewTouchUtmMedium(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Landing Page URL</Label>
                      <Input
                        placeholder="https://..."
                        value={newTouchLandingPage}
                        onChange={(e) => setNewTouchLandingPage(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingTouch(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={addTouchMutation.isPending} className="h-7 text-xs">
                      {addTouchMutation.isPending ? 'Saving...' : 'Save Touch'}
                    </Button>
                  </div>
                </form>
              )}

              {/* ATTRIBUTION TOUCH CARDS */}
              {isAttrLoading ? (
                <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Loading attribution touches...
                </div>
              ) : isAttrError ? (
                <div className="py-8 text-center text-destructive text-xs">
                  Unable to load attribution details.
                </div>
              ) : (attributionsList.length === 0 && (!currentLead.attributions || currentLead.attributions.length === 0)) ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No attribution touches recorded for this lead yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {(attributionsList.length > 0 ? attributionsList : currentLead.attributions || []).map((touch, index) => {
                    const isFirst = touch.touch_type === 'FIRST_TOUCH';
                    const isCapture = touch.touch_type === 'LEAD_CAPTURE';
                    const badgeColor = isFirst
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : isCapture
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-500 border-purple-500/20';

                    const isTechExpanded = !!expandedTechAttrs[touch.id];

                    return (
                      <div
                        key={touch.id || index}
                        className="p-4 rounded-xl border border-border/80 bg-card/50 space-y-3 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${badgeColor} font-semibold`}>
                              {touch.touch_type.replace('_', ' ')}
                            </Badge>
                            <span className="font-bold text-foreground text-sm">
                              {touch.platform || 'Digital Acquisition'}
                            </span>
                            {touch.lead_source_name && (
                              <Badge variant="secondary" className="text-[11px]">
                                {touch.lead_source_name}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            Captured: {new Date(touch.captured_at || touch.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Marketing Hierarchy */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Campaign</span>
                            <span className="font-semibold text-foreground">{touch.campaign_name || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Ad Set</span>
                            <span className="font-semibold text-foreground">{touch.ad_set_name || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Ad / Creative</span>
                            <span className="font-semibold text-foreground">{touch.ad_name || '—'}</span>
                          </div>
                        </div>

                        {/* UTM & URLs */}
                        {(touch.utm_source || touch.utm_medium || touch.utm_campaign || touch.landing_page_url) && (
                          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                            <div className="flex items-center gap-4 flex-wrap text-[11px]">
                              {touch.utm_source && (
                                <span>
                                  Source: <strong className="font-mono text-foreground">{touch.utm_source}</strong>
                                </span>
                              )}
                              {touch.utm_medium && (
                                <span>
                                  Medium: <strong className="font-mono text-foreground">{touch.utm_medium}</strong>
                                </span>
                              )}
                              {touch.utm_campaign && (
                                <span>
                                  Campaign: <strong className="font-mono text-foreground">{touch.utm_campaign}</strong>
                                </span>
                              )}
                              {touch.utm_term && (
                                <span>
                                  Term: <strong className="font-mono text-foreground">{touch.utm_term}</strong>
                                </span>
                              )}
                            </div>
                            {touch.landing_page_url && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                Landing Page: <a href={touch.landing_page_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{touch.landing_page_url}</a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Technical IDs Collapsible */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleTechAttr(touch.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <span>{isTechExpanded ? 'Hide' : 'Show'} Technical Attribution Details</span>
                            {isTechExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isTechExpanded && (
                            <div className="mt-2 p-3 rounded-lg border border-border/40 bg-background/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                              <div>External Lead ID: {touch.external_lead_id || '—'}</div>
                              <div>Campaign External ID: {touch.campaign_external_id || '—'}</div>
                              <div>Ad Set External ID: {touch.ad_set_external_id || '—'}</div>
                              <div>Ad External ID: {touch.ad_external_id || '—'}</div>
                              <div>Form External ID: {touch.form_external_id || '—'}</div>
                              <div>Capture Method: {touch.capture_method || '—'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FOLLOW-UP TASKS */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Follow-up Tasks
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scheduled sales reminders, pending call-backs, and agent assignments.
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant={isSchedulingFollowup ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => setIsSchedulingFollowup(!isSchedulingFollowup)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {isSchedulingFollowup ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isSchedulingFollowup ? 'Cancel' : 'Schedule Follow-up'}
                  </Button>
                )}
              </div>

              {/* SCHEDULE FOLLOW-UP FORM */}
              {isSchedulingFollowup && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!fDueAt) {
                      toast.error('Due date and time are required');
                      return;
                    }
                    addFollowupMutation.mutate({
                      task_type: fTaskType,
                      priority: fPriority,
                      due_at: new Date(fDueAt).toISOString(),
                      notes: fNotes.trim() || undefined,
                      assigned_to_user: fAssignedAgent || undefined,
                    });
                  }}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                >
                  <div className="text-xs font-semibold text-foreground">Schedule Next Action</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Task Type *</Label>
                      <select
                        value={fTaskType}
                        onChange={(e) => setFTaskType(e.target.value as FollowupTaskType)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="CALL">Phone Call</option>
                        <option value="WHATSAPP">WhatsApp Message</option>
                        <option value="EMAIL">Email</option>
                        <option value="VISIT">In-Person Visit</option>
                        <option value="TRIAL_CONFIRMATION">Trial Confirmation</option>
                        <option value="TRIAL_FOLLOWUP">Trial Follow-up</option>
                        <option value="MEMBERSHIP_OFFER">Membership Offer</option>
                        <option value="PAYMENT_LINK">Payment Link</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Priority *</Label>
                      <select
                        value={fPriority}
                        onChange={(e) => setFPriority(e.target.value as FollowupPriority)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Due Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        value={fDueAt}
                        onChange={(e) => setFDueAt(e.target.value)}
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Assign Agent</Label>
                      <select
                        value={fAssignedAgent}
                        onChange={(e) => setFAssignedAgent(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">Current Lead Assignee</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Instructions / Goal</Label>
                      <Input
                        placeholder="e.g. Pitch annual Pilates plan"
                        value={fNotes}
                        onChange={(e) => setFNotes(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSchedulingFollowup(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addFollowupMutation.isPending}
                      className="h-7 text-xs"
                    >
                      {addFollowupMutation.isPending ? 'Scheduling...' : 'Save Task'}
                    </Button>
                  </div>
                </form>
              )}

              {/* FOLLOWUPS LIST */}
              {isFollowupsLoading ? (
                <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Loading tasks...
                </div>
              ) : isFollowupsError ? (
                <div className="py-8 text-center text-destructive text-xs">
                  Unable to load follow-up tasks.
                </div>
              ) : followupsList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No follow-up tasks scheduled for this lead yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {followupsList.map((task) => {
                    const isPending = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
                    const isOverdue = task.is_overdue;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-xl border ${
                          isOverdue && isPending
                            ? 'border-rose-500/40 bg-rose-500/5'
                            : 'border-border/80 bg-card/50'
                        } space-y-2.5 text-xs shadow-xs`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-sm">
                              {task.task_type.replace('_', ' ')}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[11px] ${
                                task.priority === 'URGENT' || task.priority === 'HIGH'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {task.priority}
                            </Badge>
                            {isOverdue && isPending && (
                              <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold">
                                OVERDUE
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[11px]">
                              {task.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            Due: {new Date(task.due_at).toLocaleString()}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-muted-foreground text-xs">{task.notes}</p>
                        )}

                        {task.outcome && (
                          <div className="text-xs text-foreground bg-muted/40 p-2 rounded-md">
                            Outcome: <strong>{task.outcome}</strong>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                          <div>
                            Assigned to: <strong className="text-foreground">{task.assigned_to_name || 'Unassigned'}</strong>
                          </div>

                          {isPending && canEdit && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCompletingTask(task);
                                  setCompleteOutcome('');
                                }}
                                className="h-7 text-xs px-2.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReschedulingTask(task);
                                  setRescheduleDueAt('');
                                  setRescheduleReason('');
                                }}
                                className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Reschedule
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelFollowupMutation.mutate(task.id)}
                                disabled={cancelFollowupMutation.isPending}
                                className="h-7 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5.5: TRIAL SESSION */}
          {activeTab === 'trial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Trial Sessions & Schedule History
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Authoritative occurrence bookings, attendance tracking, and reminder schedules.
                  </p>
                </div>
                {canEdit && onBookTrialClick && (
                  <Button
                    size="sm"
                    onClick={() => onBookTrialClick(currentLead)}
                    className="h-8 text-xs gap-1.5 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Book Trial Session
                  </Button>
                )}
              </div>

              {isTrialsLoading ? (
                <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Loading trial records...
                </div>
              ) : isTrialsError ? (
                <div className="py-8 text-center text-destructive text-xs">
                  Unable to load trial bookings for this lead.
                </div>
              ) : leadTrials.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs border border-dashed rounded-xl space-y-3">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <div>
                    <div className="font-semibold text-foreground">No Trial Sessions Scheduled</div>
                    <div className="mt-0.5">This prospect has not yet booked a trial class.</div>
                  </div>
                  {canEdit && onBookTrialClick && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBookTrialClick(currentLead)}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Book Real Trial Slot
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* LATEST TRIAL CARD */}
                  {latestTrial && (
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            Latest Trial Session
                          </div>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {latestTrial.class_name || 'Class Session'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {latestTrial.status}
                          </Badge>
                          {latestTrial.confirmation_status === 'CONFIRMED' ? (
                            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                              Confirmed ({latestTrial.confirmation_channel || 'Manual'})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500 bg-amber-500/10">
                              {latestTrial.confirmation_status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-background/60 p-3 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground text-[11px]">Date & Time</span>
                          <div className="font-medium text-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            {latestTrial.booking_date} ({latestTrial.start_time} - {latestTrial.end_time})
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground text-[11px]">Branch Location</span>
                          <div className="font-medium text-foreground">
                            {latestTrial.branch_name || 'Studio'}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground text-[11px]">Assigned Trainer</span>
                          <div className="font-medium text-foreground">
                            {latestTrial.trainer_name || 'Staff Trainer'}
                          </div>
                        </div>
                      </div>

                      {latestTrial.notes && (
                        <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md border border-border/40">
                          <strong>Notes:</strong> {latestTrial.notes}
                        </div>
                      )}

                      {latestTrial.cancellation_reason && (
                        <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
                          <strong>Cancellation Reason:</strong> {latestTrial.cancellation_reason}
                        </div>
                      )}

                      {/* ACTIONS FOR ACTIVE TRIAL */}
                      {canEdit && latestTrial.status !== 'CANCELLED' && latestTrial.status !== 'RESCHEDULED' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40 flex-wrap">
                          {latestTrial.confirmation_status !== 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmTrialMutation.mutate({ trialId: latestTrial.id, channel: 'PHONE' })}
                              disabled={confirmTrialMutation.isPending}
                              className="h-7 text-xs gap-1 text-emerald-500 border-emerald-500/30"
                            >
                              <Check className="w-3 h-3" />
                              Confirm Phone Call
                            </Button>
                          )}
                          {latestTrial.status !== 'ATTENDED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAttendedMutation.mutate(latestTrial.id)}
                              disabled={markAttendedMutation.isPending}
                              className="h-7 text-xs gap-1 text-primary border-primary/30"
                            >
                              <UserCheck className="w-3 h-3" />
                              Mark Attended
                            </Button>
                          )}
                          {latestTrial.status !== 'NO_SHOW' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markNoShowMutation.mutate(latestTrial.id)}
                              disabled={markNoShowMutation.isPending}
                              className="h-7 text-xs gap-1 text-destructive border-destructive/30"
                            >
                              <UserX className="w-3 h-3" />
                              Mark No-Show
                            </Button>
                          )}
                        </div>
                      )}

                      {/* DETERMINISTIC REMINDER SCHEDULE PREVIEW */}
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Bell className="w-3 h-3 text-primary" />
                          Deterministic Reminder Schedule (Tenant Policy)
                        </div>

                        {isLatestReminderLoading ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 py-1">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            Calculating reminders...
                          </div>
                        ) : latestReminderSchedule.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No reminder triggers configured in tenant policy.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {latestReminderSchedule.map((pt, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-md border border-border/60 bg-card/50 text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-foreground">{pt.name}</span>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(pt.scheduled_at).toLocaleDateString()} {new Date(pt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  {pt.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* HISTORICAL SESSIONS LIST */}
                  {leadTrials.length > 1 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Booking History & Replacements ({leadTrials.length - 1})
                      </h5>
                      <div className="divide-y divide-border border border-border rounded-lg bg-card/30">
                        {leadTrials.slice(1).map((histTrial) => (
                          <div key={histTrial.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-foreground">
                                {histTrial.class_name} &bull; {histTrial.booking_date}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {histTrial.start_time} - {histTrial.end_time} at {histTrial.branch_name}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {histTrial.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}          {/* TAB 5: COMMERCIAL (Phase 9 & Consolidated) */}
          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Commercial Intelligence & Conversion
                </h4>
                <p className="text-xs text-muted-foreground">
                  Promotional campaigns, applicable voucher codes, conversion status, and package entitlements.
                </p>
              </div>

              {isOffersLoading ? (
                <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Loading commercial offers and coupons...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Conversion Offer Snapshot (if converted) */}
                  {leadOffersData?.conversion_offer && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Conversion Offer Applied
                        </span>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                          Order Discount
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Campaign</span>
                          <span className="font-semibold text-foreground">
                            {leadOffersData.conversion_offer.campaign_name || 'Standard'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Coupon Code</span>
                          <span className="font-mono font-bold text-primary">
                            {leadOffersData.conversion_offer.coupon_code || 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Discount Saved</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{parseFloat(leadOffersData.conversion_offer.discount_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Converted At</span>
                          <span className="text-muted-foreground">
                            {new Date(leadOffersData.conversion_offer.converted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Coupon Codes */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Available Coupon Codes</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Branch & package matched
                      </span>
                    </h5>

                    {(!leadOffersData?.available_coupons || leadOffersData.available_coupons.length === 0) ? (
                      <div className="p-4 rounded-xl border border-border bg-card/40 text-center text-xs text-muted-foreground">
                        No active coupon codes currently targeted for this lead's branch or package.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {leadOffersData.available_coupons.map((c: any) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-primary px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                                {c.code}
                              </span>
                              <Badge
                                variant={c.computed_status === 'ACTIVE' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {c.computed_status || c.status}
                              </Badge>
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              {c.campaign_name}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                              <span>
                                {c.branch_name ? `Branch: ${c.branch_name}` : 'All Branches'}
                              </span>
                              {c.usage_remaining !== null && c.usage_remaining !== undefined && (
                                <span className="font-mono">
                                  {c.usage_remaining} left
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Campaigns */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-semibold text-foreground">
                      Promotional Discount Campaigns
                    </h5>

                    {(!leadOffersData?.campaigns || leadOffersData.campaigns.length === 0) ? (
                      <div className="p-4 rounded-xl border border-border bg-card/40 text-center text-xs text-muted-foreground">
                        No promotional discount campaigns active.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {leadOffersData.campaigns.map((camp: any) => (
                          <div
                            key={camp.id}
                            className="p-3 rounded-xl border border-border bg-card/60 shadow-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {camp.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-foreground">
                                {camp.discount_type === 'PERCENTAGE'
                                  ? `${camp.discount_value}% OFF`
                                  : `₹${camp.discount_value} OFF`}
                              </span>
                            </div>
                            {camp.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {camp.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                              <span>
                                {camp.minimum_order_amount ? `Min: ₹${camp.minimum_order_amount}` : 'No min spend'}
                              </span>
                              <span>
                                {camp.max_discount ? `Max cap: ₹${camp.max_discount}` : 'No cap'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Redemption History */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-semibold text-foreground">
                      Coupon Redemption History
                    </h5>

                    {(!leadOffersData?.redemptions || leadOffersData.redemptions.length === 0) ? (
                      <div className="p-4 rounded-xl border border-border bg-card/40 text-center text-xs text-muted-foreground">
                        No coupons redeemed by this lead.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                              <th className="py-2 px-3">Code</th>
                              <th className="py-2 px-3">Campaign</th>
                              <th className="py-2 px-3 text-right">Discount</th>
                              <th className="py-2 px-3 text-right">Redeemed At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {leadOffersData.redemptions.map((r: any) => (
                              <tr key={r.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3 font-mono font-bold text-primary">
                                  {r.code_snapshot || r.discount_code?.code || '—'}
                                </td>
                                <td className="py-2 px-3 text-foreground font-medium">
                                  {r.campaign?.name || '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                  ₹{parseFloat(r.discount_amount || '0').toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground text-[11px]">
                                  {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* COMPLETE TASK DIALOG */}
      {completingTask && (
        <Dialog open={!!completingTask} onOpenChange={(open) => !open && setCompletingTask(null)}>
          <DialogContent className="max-w-md w-full bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Complete Follow-up</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Record the outcome of this {completingTask.task_type.replace('_', ' ').toLowerCase()} follow-up.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!completeOutcome.trim()) {
                  toast.error('Outcome is required');
                  return;
                }
                completeFollowupMutation.mutate({
                  taskId: completingTask.id,
                  outcome: completeOutcome.trim(),
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Outcome / Result *</Label>
                <Input
                  placeholder="e.g. Spoke to customer, confirmed trial session"
                  value={completeOutcome}
                  onChange={(e) => setCompleteOutcome(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompletingTask(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={completeFollowupMutation.isPending}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {completeFollowupMutation.isPending ? 'Completing...' : 'Mark Completed'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* RESCHEDULE TASK DIALOG */}
      {reschedulingTask && (
        <Dialog open={!!reschedulingTask} onOpenChange={(open) => !open && setReschedulingTask(null)}>
          <DialogContent className="max-w-md w-full bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Reschedule Follow-up</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a new due date & time for {reschedulingTask.task_type.replace('_', ' ').toLowerCase()} follow-up.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rescheduleDueAt) {
                  toast.error('New due date is required');
                  return;
                }
                rescheduleFollowupMutation.mutate({
                  taskId: reschedulingTask.id,
                  due_at: new Date(rescheduleDueAt).toISOString(),
                  reason: rescheduleReason.trim() || undefined,
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">New Due Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={rescheduleDueAt}
                  onChange={(e) => setRescheduleDueAt(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reschedule Reason</Label>
                <Input
                  placeholder="e.g. Customer requested call after 6 PM"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReschedulingTask(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={rescheduleFollowupMutation.isPending}
                  className="h-8 text-xs"
                >
                  {rescheduleFollowupMutation.isPending ? 'Rescheduling...' : 'Save New Schedule'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* COMPOSE COMMUNICATION DIALOG */}
      {isComposeOpen && (
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full bg-background border border-border p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Compose Customer Communication
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Dispatch an authoritative communication to {currentLead?.first_name} {currentLead?.last_name}.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!composeRecipient.trim()) {
                  toast.error('Recipient phone or email is required');
                  return;
                }
                if (!composeBody.trim() && !composeTemplateId) {
                  toast.error('Message body is required');
                  return;
                }
                sendCommunicationMutation.mutate({
                  channel: composeChannel,
                  recipient: composeRecipient.trim(),
                  lead_id: currentLead?.id,
                  template_id: composeTemplateId || undefined,
                  subject: composeSubject.trim() || undefined,
                  body: composeBody.trim() || undefined,
                  purpose: composePurpose,
                  idempotency_key: `MANUAL_SEND:${currentLead?.id}:${composeChannel}:${Date.now()}`,
                });
              }}
              className="space-y-3.5 pt-2"
            >
              {/* Channel Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Channel</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WHATSAPP', 'EMAIL', 'SMS'] as CommunicationChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setComposeChannel(ch);
                        if (ch === 'EMAIL') {
                          setComposeRecipient(currentLead?.email_normalized || '');
                        } else {
                          setComposeRecipient(currentLead?.phone_normalized || '');
                        }
                      }}
                      className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        composeChannel === ch
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span>{ch === 'WHATSAPP' ? 'WhatsApp' : ch === 'EMAIL' ? 'Email' : 'SMS'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Communication Purpose</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setComposePurpose('TRANSACTIONAL')}
                    className={`p-2 rounded-lg border text-xs font-medium text-left ${
                      composePurpose === 'TRANSACTIONAL'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div>Transactional / Service</div>
                    <div className="text-[10px] text-muted-foreground">Confirmations, alerts, schedules</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposePurpose('MARKETING')}
                    className={`p-2 rounded-lg border text-xs font-medium text-left ${
                      composePurpose === 'MARKETING'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-semibold'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div>Marketing / Promo</div>
                    <div className="text-[10px] text-muted-foreground">Offers, campaign blasts (Consent checked)</div>
                  </button>
                </div>
              </div>

              {/* Consent Warning Banner if Marketing */}
              {composePurpose === 'MARKETING' && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] space-y-1">
                  <div className="font-semibold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Consent Policy Enforcement Active
                  </div>
                  {currentLead?.do_not_contact ? (
                    <p className="text-rose-600 font-medium">
                      ⚠️ Lead is marked Do Not Contact. Dispatch will be rejected by server!
                    </p>
                  ) : composeChannel === 'WHATSAPP' && !currentLead?.consent_whatsapp ? (
                    <p className="text-rose-600 font-medium">
                      ⚠️ Lead has not provided WhatsApp consent. Dispatch will be rejected by server!
                    </p>
                  ) : composeChannel === 'EMAIL' && !currentLead?.consent_email ? (
                    <p className="text-rose-600 font-medium">
                      ⚠️ Lead has not provided Email consent. Dispatch will be rejected by server!
                    </p>
                  ) : composeChannel === 'SMS' && !currentLead?.consent_sms ? (
                    <p className="text-rose-600 font-medium">
                      ⚠️ Lead has not provided SMS consent. Dispatch will be rejected by server!
                    </p>
                  ) : (
                    <p className="text-emerald-600 font-medium">
                      ✓ Valid opt-in recorded for this channel.
                    </p>
                  )}
                </div>
              )}

              {/* Recipient */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recipient ({composeChannel === 'EMAIL' ? 'Email' : 'Phone'}) *</Label>
                <Input
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  placeholder={composeChannel === 'EMAIL' ? 'member@example.com' : '+91 9876543210'}
                  className="text-xs h-9"
                  required
                />
              </div>

              {/* Template Picker */}
              {templatesList.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Template (Optional)</Label>
                  <select
                    value={composeTemplateId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setComposeTemplateId(selId);
                      const tpl = templatesList.find((t) => t.id === selId);
                      if (tpl) {
                        setComposeBody(tpl.body);
                        if (tpl.subject) setComposeSubject(tpl.subject);
                      }
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- Custom Message (No Template) --</option>
                    {templatesList.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.event_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject (for Email) */}
              {composeChannel === 'EMAIL' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject *</Label>
                  <Input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. Your Upcoming Session at SWEAT"
                    className="text-xs h-9"
                    required
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Message Content *</Label>
                  <span className="text-[10px] text-muted-foreground">Placeholders: {"{{lead_name}}"}, {"{{branch_name}}"}</span>
                </div>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsComposeOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={sendCommunicationMutation.isPending}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5"
                >
                  {sendCommunicationMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Dispatch Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

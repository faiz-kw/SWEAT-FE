/**
 * src/lib/crmLabels.ts
 * Centralized formatting utility for backend CRM enum values and status codes.
 * Ensures no raw technical identifiers (e.g. FITNESS_ASSESSMENT, PERSONAL_TRAINING) leak into UI.
 */

const KNOWN_LABELS: Record<string, string> = {
  // Programs & Specialties
  FITNESS_ASSESSMENT: 'Fitness Assessment',
  PERSONAL_TRAINING: 'Personal Training',
  GROUP_CLASS: 'Group Class',
  REFORMER_PILATES: 'Reformer Pilates',
  HIIT: 'HIIT Workout',
  STRENGTH: 'Strength & Conditioning',
  YOGA: 'Yoga Session',
  RECOVERY: 'Recovery & Mobility',
  NUTRITION_CONSULTATION: 'Nutrition Consultation',

  // Trial Lifecycles
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  ATTENDED: 'Attended',
  NO_SHOW: 'No-Show',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  RESCHEDULE_REQUESTED: 'Reschedule Requested',
  DECLINED: 'Declined',
  PENDING: 'Pending',

  // Confirmation Channels
  PHONE: 'Phone Call',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS Message',
  EMAIL: 'Email',
  SYSTEM: 'System Auto',
  MANUAL: 'Manual Staff Entry',

  // Activity Types
  CALL: 'Phone Call',
  VISIT: 'Studio Visit',
  MEETING: 'In-Person Consultation',
  FOLLOW_UP: 'Follow-up Call',
  TRIAL: 'Trial Session',
  PAYMENT_LINK: 'Payment Link Sent',
  OTHER: 'General Outreach',

  // Lead Sources
  WALK_IN: 'Walk-In',
  WEBSITE: 'Website Inquiry',
  MOBILE_APP: 'Mobile App',
  META: 'Meta (Instagram / Facebook)',
  GOOGLE: 'Google Search / Ads',
  REFERRAL: 'Member Referral',
  TRAINER: 'Trainer Outreach',
  EMPLOYEE: 'Staff Outreach',
  SALES: 'Sales Representative',
  CAMPAIGN: 'Promotional Campaign',

  // Task Priorities
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',

  // Sla Statuses
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  BREACHED: 'SLA Breached',
  MET: 'SLA Met',
};

/**
 * Convert backend SCREAMING_SNAKE_CASE enum strings into human-friendly Title Case labels.
 */
export function formatCrmLabel(raw: string | null | undefined, fallback = '—'): string {
  if (!raw) return fallback;
  const trimmed = String(raw).trim();
  if (!trimmed) return fallback;

  if (KNOWN_LABELS[trimmed]) {
    return KNOWN_LABELS[trimmed];
  }

  // Fallback: Title-case snake_case strings
  return trimmed
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

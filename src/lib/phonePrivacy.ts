/**
 * src/lib/phonePrivacy.ts — Centralized Frontend Phone Number Privacy & Masking Utilities.
 *
 * Works in tandem with backend RBAC enforcement ('core.privacy.view_phone_number').
 * Guarantees consistent masking (******7890) across every table, card, modal, and search view,
 * and prevents edit forms from submitting masked placeholders back to the API.
 */

export const MASKED_PHONE_PLACEHOLDER = 'Phone number hidden';

/**
 * Returns true if the string is already masked (******7890, +91-XXXXX-7890, or placeholder).
 */
export function isMaskedPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const trimmed = String(phone).trim();
  if (!trimmed) return false;
  return (
    trimmed.includes('***') ||
    trimmed.toUpperCase().includes('XXXXX') ||
    trimmed.toLowerCase() === MASKED_PHONE_PLACEHOLDER.toLowerCase()
  );
}

/**
 * Masks any raw phone string to ******7890 (or 'Phone number hidden' if < 4 digits).
 * Idempotent if called on an already-masked value.
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';
  if (isMaskedPhone(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `******${digits.slice(-4)}`;
  }
  return MASKED_PHONE_PLACEHOLDER;
}

/**
 * Formats a phone number for display according to the user's dynamic RBAC permission.
 * Defense-in-depth: even if a cached/legacy payload contains an unmasked phone,
 * unauthorized users will still see ******7890.
 */
export function formatDisplayPhone(
  phone?: string | null,
  canViewPhoneNumber = false
): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';
  if (canViewPhoneNumber) {
    return trimmed;
  }
  return maskPhoneNumber(trimmed);
}

/**
 * Returns true only when the user is authorized to see raw numbers and the value is unmasked.
 * Use this to gate tel: links and copy-to-clipboard actions.
 */
export function canExposeRawPhoneAction(
  phone?: string | null,
  canViewPhoneNumber = false
): boolean {
  if (!canViewPhoneNumber || !phone) return false;
  const trimmed = String(phone).trim();
  return Boolean(trimmed) && !isMaskedPhone(trimmed);
}

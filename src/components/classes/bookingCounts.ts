/**
 * Booked-seat counting for the class attendance modal.
 *
 * Mirrors the backend rule behind the class list `booking_count`
 * (SEAT_HOLDING_BOOKING_STATUSES in serializers_classes.py): a booking holds a seat
 * unless it was cancelled, rescheduled away, or is only on the waitlist.
 * NO_SHOW still holds a seat, so it is counted.
 */
const SEAT_RELEASED_STATUSES: ReadonlySet<string> = new Set([
  'CANCELLED',
  'LATE_CANCELLED',
  'RESCHEDULED',
  'WAITLISTED',
  'WAITLIST',
]);

/**
 * A roster row is a trial when it is a CRM TrialBooking row or a Booking of type TRIAL.
 *
 * GET /tenant/bookings/ returns CRM trial rows as
 * `{ is_trial: true, booking_type: 'PROSPECT', booking_source: 'TRIAL' }`, so checking
 * `booking_type === 'TRIAL'` alone misses them.
 */
export function isTrialBooking(row: { is_trial?: boolean | null; booking_type?: string | null }): boolean {
  if (row.is_trial === true) return true;
  const bookingType = String(row.booking_type ?? '').toUpperCase();
  return bookingType === 'TRIAL' || bookingType === 'PROSPECT';
}

export function countSeatHoldingBookings(rows: ReadonlyArray<{ status?: string | null }>): number {
  return rows.filter((row) => !SEAT_RELEASED_STATUSES.has(String(row.status ?? '').toUpperCase())).length;
}

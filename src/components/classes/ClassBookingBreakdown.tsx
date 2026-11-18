import * as React from 'react';

interface ClassBookingBreakdownProps {
  memberCount?: number;
  trialCount?: number;
}

/**
 * Small line under the "N / capacity Booked" badge showing how the booked seats split
 * between class (member) bookings and trial bookings. Renders nothing when both are zero
 * or when the API did not send the split.
 */
export function ClassBookingBreakdown({ memberCount, trialCount }: ClassBookingBreakdownProps) {
  const members = memberCount ?? 0;
  const trials = trialCount ?? 0;
  if (members === 0 && trials === 0) return null;

  return (
    <div className="mt-1 flex items-center gap-1.5 text-2xs font-medium">
      {members > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
          {members} Class
        </span>
      )}
      {trials > 0 && (
        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
          {trials} Trial
        </span>
      )}
    </div>
  );
}

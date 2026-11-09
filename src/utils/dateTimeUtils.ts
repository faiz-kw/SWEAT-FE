/**
 * Robust Centralized Date and Time Formatting Utilities.
 * Handles occurrences, bookings, schedule rules, and ISO timestamps.
 * Guarantees NEVER to display "Invalid Date", "NaN", or "undefined".
 */

export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '--';
  // If timeStr is an ISO string like "2026-09-28T10:00:00Z"
  // If timeStr is an ISO string like "2026-09-28T10:00:00Z"
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  // If timeStr is "HH:MM:SS" or "HH:MM"
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
      const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${hStr}:${mStr} ${period}`;
    }
  }

  // Fallback try Date parse
  const d = new Date(`1970-01-01T${clean}`);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return clean || '--';
}

export function formatOccurrenceDate(dateStr?: string | null, startAt?: string | null): string {
  if (dateStr) {
    // If YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  if (startAt) {
    const d = new Date(startAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  return 'Date Pending';
}

export interface OccurrenceDateTimeParts {
  date: string;
  time: string;
  full: string;
}

export function getOccurrenceDateTimeParts(occ?: {
  occurrence_date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}): OccurrenceDateTimeParts {
  if (!occ) {
    return { date: '--', time: '--', full: '--' };
  }

  const date = formatOccurrenceDate(occ.occurrence_date, occ.start_at);

  let startTimeStr = '--';
  let endTimeStr = '--';

  if (occ.start_time) {
    startTimeStr = formatTime12h(occ.start_time);
  } else if (occ.start_at) {
    startTimeStr = formatTime12h(occ.start_at);
  }

  if (occ.end_time) {
    endTimeStr = formatTime12h(occ.end_time);
  } else if (occ.end_at) {
    endTimeStr = formatTime12h(occ.end_at);
  }

  const time =
    endTimeStr !== '--' && startTimeStr !== '--'
      ? `${startTimeStr} – ${endTimeStr}`
      : startTimeStr !== '--'
      ? startTimeStr
      : '--';

  const full = time !== '--' ? `${date} · ${time}` : date;

  return { date, time, full };
}

export function formatOccurrenceDateTime(occ?: {
  occurrence_date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}): string {
  return getOccurrenceDateTimeParts(occ).full;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Formats any ISO string, Date object, or date string into DD/MM/YYYY.
 * e.g., "2026-11-07" -> "07/11/2026", "2026-10-30T10:00:00Z" -> "30/10/2026"
 */
export function formatDateDDMMYYYY(val?: string | Date | null): string {
  if (!val) return '—';
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const parts = clean.split('/');
      return `${pad2(parseInt(parts[1], 10))}/${pad2(parseInt(parts[0], 10))}/${parts[2]}`;
    }
  }
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return typeof val === 'string' ? val : '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Formats any ISO string or Date into DD/MM/YYYY, hh:mm:ss A
 * e.g., "07/11/2026, 10:38:25 PM"
 */
export function formatDateTimeDDMMYYYY(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return typeof val === 'string' ? val : '—';

  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

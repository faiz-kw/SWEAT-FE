/**
 * src/lib/roster-date-utils.ts
 * 
 * Helper utilities for week-based workforce roster scheduling (Mon-Sun ISO week standard).
 */

export interface WeekDayInfo {
  id: number; // 1 = Monday ... 7 = Sunday
  name: string; // "Mon"
  fullName: string; // "Monday"
  dateStr: string; // "2026-09-21"
  dayOfMonth: number; // 21
  monthShort: string; // "Sep"
  isToday: boolean;
}

export interface WeekInfo {
  startDate: string; // Monday "YYYY-MM-DD"
  endDate: string; // Sunday "YYYY-MM-DD"
  formattedRange: string; // "21 Sep – 27 Sep 2026"
  isCurrentWeek: boolean;
  days: WeekDayInfo[];
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = [
  { id: 1, name: 'Mon', fullName: 'Monday' },
  { id: 2, name: 'Tue', fullName: 'Tuesday' },
  { id: 3, name: 'Wed', fullName: 'Wednesday' },
  { id: 4, name: 'Thu', fullName: 'Thursday' },
  { id: 5, name: 'Fri', fullName: 'Friday' },
  { id: 6, name: 'Sat', fullName: 'Saturday' },
  { id: 7, name: 'Sun', fullName: 'Sunday' },
];

/**
 * Format a Date object to YYYY-MM-DD using local time
 */
export function formatToDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object safely without UTC timezone shift
 */
export function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Get the Monday Date for any given reference date
 */
export function getMonday(refDate?: string | Date): Date {
  const d = refDate ? (typeof refDate === 'string' ? parseDateStr(refDate) : new Date(refDate)) : new Date();
  const day = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
}

/**
 * Return comprehensive week details for a given reference date
 */
export function getWeekInfo(refDate?: string | Date): WeekInfo {
  const monday = getMonday(refDate);
  const todayStr = formatToDateStr(new Date());

  const days: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    const dateStr = formatToDateStr(dayDate);
    const meta = DAY_NAMES[i];

    days.push({
      id: meta.id,
      name: meta.name,
      fullName: meta.fullName,
      dateStr,
      dayOfMonth: dayDate.getDate(),
      monthShort: MONTH_NAMES_SHORT[dayDate.getMonth()],
      isToday: dateStr === todayStr,
    });
  }

  const startDate = days[0].dateStr;
  const endDate = days[6].dateStr;

  const startObj = parseDateStr(startDate);
  const endObj = parseDateStr(endDate);

  const formattedRange = `${startObj.getDate()} ${MONTH_NAMES_SHORT[startObj.getMonth()]} – ${endObj.getDate()} ${MONTH_NAMES_SHORT[endObj.getMonth()]} ${endObj.getFullYear()}`;
  const isCurrentWeek = days.some((d) => d.isToday);

  return {
    startDate,
    endDate,
    formattedRange,
    isCurrentWeek,
    days,
  };
}

/**
 * Shift week forward or backward by N weeks
 */
export function shiftWeek(startDateStr: string, deltaWeeks: number): string {
  const currentMon = parseDateStr(startDateStr);
  currentMon.setDate(currentMon.getDate() + deltaWeeks * 7);
  return formatToDateStr(currentMon);
}

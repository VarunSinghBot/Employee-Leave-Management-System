// Date-only helpers. All leave dates are handled as UTC midnight to avoid timezone drift.

const DAY_MS = 24 * 60 * 60 * 1000;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const toDateKey = (date: Date | string): string => new Date(date).toISOString().slice(0, 10);

export const todayKey = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// Inclusive count of calendar days between two dates
export const countLeaveDays = (from: Date | string, to: Date | string): number => {
  const start = typeof from === "string" ? parseDateOnly(toDateKey(from)) : from;
  const end = typeof to === "string" ? parseDateOnly(toDateKey(to)) : to;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
};

// Splits a leave range into days per month, e.g. { "2026-11": 3, "2026-12": 2 }
export const daysByMonth = (from: Date, to: Date): Record<string, number> => {
  const result: Record<string, number> = {};
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    const key = new Date(t).toISOString().slice(0, 7);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
};

export const daysInYear = (from: Date, to: Date, year: number): number =>
  Object.entries(daysByMonth(from, to))
    .filter(([month]) => month.startsWith(`${year}-`))
    .reduce((sum, [, days]) => sum + days, 0);

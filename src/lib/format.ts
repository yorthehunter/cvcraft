// Date display. Dates are stored as "2023" or "2024-12" and shown at that precision.

/** "2024-12" → "12/2024"; "2023" → "2023". */
export function formatDate(d: string): string {
  const [year, month] = d.split("-");
  return month ? `${month}/${year}` : year;
}

export type DateRange = { start: string; end?: string };

/** Two ranges are the same if they'd print the same. */
export const sameRange = (a: DateRange, b: DateRange) => a.start === b.start && a.end === b.end;

/** "12/2024–Present", "2023–2024". */
export const formatRange = (start: string, end?: string) => `${formatDate(start)}–${end ? formatDate(end) : "Present"}`;

/**
 * A position shows its own dates only when they'd add information: the employer
 * has several positions, or this one doesn't span the whole employer range.
 */
export function showPositionDates(w: { startDate: string; endDate?: string; positions: { startDate: string; endDate?: string }[] }): boolean {
  const employer = { start: w.startDate, end: w.endDate };
  return w.positions.length > 1 || w.positions.some((p) => !sameRange({ start: p.startDate, end: p.endDate }, employer));
}

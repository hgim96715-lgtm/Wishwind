/** Local calendar day, independent of daylight-saving hour lengths. */
export function gardenDay(date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
function hash(value: string): number {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** A shuffled ring advances by one display each day: stable today, no permanent omissions. */
export function dailyGardenOrder<T extends { id: string }>(rows: readonly T[], day: number, size = 20): T[] {
  if (!rows.length) return [];
  const ordered = [...rows].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  const start = ((day * size) % ordered.length + ordered.length) % ordered.length;
  return [...ordered.slice(start), ...ordered.slice(0, start)];
}

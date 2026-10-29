/** Calendar day (YYYY-MM-DD) of a UTC instant in the given IANA timezone. */
export function dayInTimezone(instant: Date | string, timeZone: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

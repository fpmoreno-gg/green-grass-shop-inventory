// "YYYY-MM-DD" in the device's own timezone. toISOString() is UTC, which in
// US evenings is already tomorrow — that made loans due today read as
// overdue after ~6pm and shifted every "return in N days" pick by a day.
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isOverdue(expectedReturnDate: string) {
  return expectedReturnDate < localDateString();
}

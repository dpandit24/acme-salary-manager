/**
 * Current pay on `as_of` is the row with the greatest effective_from <= as_of (salary rule 5).
 * CompensationsRepository.find_current implements the same rule in SQL for many employees at once.
 */
export function select_current<T extends { effective_from: string }>(rows: readonly T[], as_of: string): T | null {
  let current: T | null = null;
  for (const row of rows) {
    if (row.effective_from <= as_of && (current === null || row.effective_from > current.effective_from)) current = row;
  }
  return current;
}

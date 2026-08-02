import { SLOT_LOCK_DURATION_MS, SLOT_LOCK_DURATION_MINUTES } from "./constants";

export const SLOT_LOCK_DURATION_SECONDS = SLOT_LOCK_DURATION_MINUTES * 60;

/** Compare UUIDs case-insensitively (Supabase/auth may differ in casing). */
export function uuidEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  return a.toLowerCase() === b.toLowerCase();
}

export function getLockExpiresAtIso(lockedAt: string): string {
  return new Date(new Date(lockedAt).getTime() + SLOT_LOCK_DURATION_MS).toISOString();
}

export function getLockRemainingSeconds(lockedAt: string): number {
  const expiresMs = new Date(lockedAt).getTime() + SLOT_LOCK_DURATION_MS;
  const remaining = Math.floor((expiresMs - Date.now()) / 1000);
  return Math.max(0, Math.min(SLOT_LOCK_DURATION_SECONDS, remaining));
}

import {
  BUY_NOW_LOCK_MINUTES,
  BUY_NOW_LOCK_MS,
  CART_LOCK_MINUTES,
  SLOT_LOCK_DURATION_MS,
  SLOT_LOCK_DURATION_MINUTES,
} from "./constants";

export const SLOT_LOCK_DURATION_SECONDS = SLOT_LOCK_DURATION_MINUTES * 60;

export function uuidEquals(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) {
    return false;
  }
  return a.toLowerCase() === b.toLowerCase();
}

export function getLockExpiresAtIso(
  lockedAt: string,
  lockExpiresAt?: string | null
): string {
  if (lockExpiresAt) {
    return lockExpiresAt;
  }
  return new Date(new Date(lockedAt).getTime() + BUY_NOW_LOCK_MS).toISOString();
}

export function getLockRemainingSeconds(
  lockedAt: string,
  lockExpiresAt?: string | null
): number {
  const lockedMs = new Date(lockedAt).getTime();
  const expiresMs = lockExpiresAt
    ? new Date(lockExpiresAt).getTime()
    : lockedMs + SLOT_LOCK_DURATION_MS;

  const maxSeconds = lockExpiresAt
    ? Math.max(1, Math.round((expiresMs - lockedMs) / 1000))
    : SLOT_LOCK_DURATION_SECONDS;

  const remaining = Math.floor((expiresMs - Date.now()) / 1000);
  return Math.max(0, Math.min(maxSeconds, remaining));
}

export function getCartRemainingSeconds(expiresAt: string): number {
  const remaining = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, Math.min(CART_LOCK_MINUTES * 60, remaining));
}

export function formatRemainingSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getLockExpiresAtIsoFromSlot(slot: {
  locked_at: string | null;
  lock_expires_at?: string | null;
}): string | null {
  if (slot.lock_expires_at) {
    return slot.lock_expires_at;
  }
  if (!slot.locked_at) {
    return null;
  }
  return getLockExpiresAtIso(slot.locked_at);
}

export const SLOT_LOCK_DURATION_MINUTES = 8;
export const SLOT_LOCK_DURATION_MS = SLOT_LOCK_DURATION_MINUTES * 60 * 1000;

export type LockErrorCode =
  | "SLOT_NOT_FOUND"
  | "BREAK_NOT_ACTIVE"
  | "SLOT_ALREADY_SOLD"
  | "SLOT_LOCKED_BY_OTHER"
  | "SLOT_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export type LockResult =
  | {
      ok: true;
      slotId: string;
      breakId: string;
      lockedAt: string;
      expiresAt: string;
    }
  | {
      ok: false;
      code: LockErrorCode;
      message: string;
    };

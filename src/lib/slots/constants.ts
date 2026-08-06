export const BUY_NOW_LOCK_MINUTES = 1;
export const CART_LOCK_MINUTES = 5;
/** Stripe API minimum for Checkout Session expires_at is 30 minutes. */
export const STRIPE_SESSION_EXPIRY_MINUTES = 30;

export const BUY_NOW_LOCK_MS = BUY_NOW_LOCK_MINUTES * 60 * 1000;
export const CART_LOCK_MS = CART_LOCK_MINUTES * 60 * 1000;

/** @deprecated Use BUY_NOW_LOCK_MINUTES for buy-now; cart uses CART_LOCK_MINUTES */
export const SLOT_LOCK_DURATION_MINUTES = BUY_NOW_LOCK_MINUTES;
export const SLOT_LOCK_DURATION_MS = BUY_NOW_LOCK_MS;

export type SlotLockType = "buy_now" | "cart";

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

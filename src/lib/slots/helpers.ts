import type { SlotLockType } from "./constants";
import { getLockExpiresAtIsoFromSlot, uuidEquals } from "./time";
import type { BreakSlot, BreakStatus } from "@/lib/breaks/types";

export function getSlotLockExpiresAt(
  slot: Pick<BreakSlot, "locked_at" | "lock_expires_at">
): Date | null {
  const iso = getLockExpiresAtIsoFromSlot(slot);
  return iso ? new Date(iso) : null;
}

export function isSlotLockActive(
  slot: Pick<BreakSlot, "status" | "locked_at" | "lock_expires_at">
): boolean {
  if (slot.status !== "locked") {
    return false;
  }

  const expiresAt = getSlotLockExpiresAt(slot);
  return expiresAt !== null && expiresAt.getTime() > Date.now();
}

export function isSlotLockedByUser(
  slot: Pick<BreakSlot, "status" | "user_id" | "locked_at" | "lock_expires_at">,
  userId: string | null | undefined
): boolean {
  return (
    Boolean(userId) &&
    slot.status === "locked" &&
    isSlotLockActive(slot) &&
    uuidEquals(slot.user_id, userId)
  );
}

export function isSlotLockedByOtherUser(
  slot: Pick<BreakSlot, "status" | "user_id" | "locked_at" | "lock_expires_at">,
  userId: string | null | undefined
): boolean {
  return (
    isSlotLockActive(slot) &&
    Boolean(slot.user_id) &&
    !uuidEquals(slot.user_id, userId)
  );
}

export function isSlotInUserCart(
  slot: BreakSlot,
  userId: string | null | undefined
): boolean {
  return (
    slot.status === "locked" &&
    slot.lock_type === "cart" &&
    isSlotLockedByUser(slot, userId)
  );
}

export function canAddSlotToCart(
  slot: BreakSlot,
  breakStatus: BreakStatus,
  userId: string | null | undefined
): boolean {
  if (breakStatus !== "active" || !userId) {
    return false;
  }

  return slot.status === "available";
}

export function isSlotAvailableForCart(
  slot: BreakSlot,
  breakStatus: BreakStatus,
  userId: string | null | undefined
): boolean {
  if (breakStatus !== "active") {
    return false;
  }

  if (slot.status === "available") {
    return true;
  }

  return isSlotInUserCart(slot, userId);
}

export function isSlotAvailableForBuyNow(
  slot: BreakSlot,
  breakStatus: BreakStatus,
  userId: string | null | undefined
): boolean {
  if (breakStatus !== "active") {
    return false;
  }

  if (slot.status === "available") {
    return true;
  }

  return (
    slot.status === "locked" &&
    slot.lock_type === "buy_now" &&
    isSlotLockedByUser(slot, userId)
  );
}

export function canUserCheckoutSlot(
  slot: BreakSlot,
  breakStatus: BreakStatus,
  userId: string | null | undefined
): boolean {
  return isSlotAvailableForBuyNow(slot, breakStatus, userId);
}

export function normalizeSlotForDisplay(slot: BreakSlot): BreakSlot {
  if (slot.status === "locked" && !isSlotLockActive(slot)) {
    return {
      ...slot,
      status: "available",
      user_id: null,
      locked_at: null,
      lock_type: null,
      lock_expires_at: null,
    };
  }

  return slot;
}

export function getSlotLockTypeLabel(slot: Pick<BreakSlot, "lock_type">): SlotLockType | null {
  return slot.lock_type ?? null;
}

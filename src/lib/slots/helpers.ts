import { SLOT_LOCK_DURATION_MS } from "./constants";
import type { BreakSlot, BreakStatus } from "@/lib/breaks/types";

export function getSlotLockExpiresAt(slot: Pick<BreakSlot, "locked_at">): Date | null {
  if (!slot.locked_at) {
    return null;
  }

  return new Date(new Date(slot.locked_at).getTime() + SLOT_LOCK_DURATION_MS);
}

export function isSlotLockActive(slot: Pick<BreakSlot, "status" | "locked_at">): boolean {
  if (slot.status !== "locked" || !slot.locked_at) {
    return false;
  }

  const expiresAt = getSlotLockExpiresAt(slot);
  return expiresAt !== null && expiresAt.getTime() > Date.now();
}

export function isSlotLockedByUser(
  slot: Pick<BreakSlot, "status" | "user_id" | "locked_at">,
  userId: string | null | undefined
): boolean {
  return (
    Boolean(userId) &&
    slot.status === "locked" &&
    slot.user_id === userId &&
    isSlotLockActive(slot)
  );
}

export function canUserCheckoutSlot(
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

  return isSlotLockedByUser(slot, userId);
}

export function normalizeSlotForDisplay(slot: BreakSlot): BreakSlot {
  if (slot.status === "locked" && !isSlotLockActive(slot)) {
    return {
      ...slot,
      status: "available",
      user_id: null,
      locked_at: null,
    };
  }

  return slot;
}

import { revalidatePublicBreaksList } from "@/lib/breaks/revalidate-public-list";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUY_NOW_LOCK_MINUTES } from "./constants";
import { getLockExpiresAtIso, uuidEquals } from "./time";
import type { LockErrorCode, LockResult } from "./constants";

function mapErrorMessage(code: LockErrorCode): string {
  return code;
}

function parseRpcError(error: { message?: string }): LockErrorCode {
  const message = error.message ?? "";

  if (message.includes("SLOT_NOT_FOUND")) return "SLOT_NOT_FOUND";
  if (message.includes("BREAK_NOT_ACTIVE")) return "BREAK_NOT_ACTIVE";
  if (message.includes("SLOT_ALREADY_SOLD")) return "SLOT_ALREADY_SOLD";
  if (message.includes("SLOT_LOCKED_BY_OTHER")) return "SLOT_LOCKED_BY_OTHER";
  if (message.includes("SLOT_UNAVAILABLE")) return "SLOT_UNAVAILABLE";

  return "UNKNOWN";
}

type LockRow = {
  slot_id: string;
  break_id: string;
  locked_at: string;
  expires_at: string;
};

type SlotRow = {
  id: string;
  break_id: string;
  status: string;
  user_id: string | null;
  locked_at: string | null;
  lock_type?: string | null;
  lock_expires_at?: string | null;
};

function buildLockSuccess(row: SlotRow): LockResult {
  if (!row.locked_at) {
    return { ok: false, code: "UNKNOWN", message: mapErrorMessage("UNKNOWN") };
  }

  return {
    ok: true,
    slotId: row.id,
    breakId: row.break_id,
    lockedAt: row.locked_at,
    expiresAt: getLockExpiresAtIso(row.locked_at, row.lock_expires_at),
  };
}

export async function resumeOrLockBuyNowSlot(slotId: string, userId: string): Promise<LockResult> {
  await releaseExpiredSlotLocks();

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin
    .from("break_slots")
    .select("id, break_id, status, user_id, locked_at, lock_type, lock_expires_at")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) {
    return { ok: false, code: "SLOT_NOT_FOUND", message: mapErrorMessage("SLOT_NOT_FOUND") };
  }

  const row = slot as SlotRow;

  if (
    row.status === "locked" &&
    row.lock_type === "buy_now" &&
    row.locked_at &&
    uuidEquals(row.user_id, userId)
  ) {
    const remaining = new Date(getLockExpiresAtIso(row.locked_at, row.lock_expires_at)).getTime() - Date.now();
    if (remaining > 0) {
      return buildLockSuccess(row);
    }
  }

  return lockSlotBuyNow(slotId, userId);
}

/** @deprecated Use resumeOrLockBuyNowSlot */
export const resumeOrLockBreakSlot = resumeOrLockBuyNowSlot;

export async function lockSlotBuyNow(slotId: string, userId: string): Promise<LockResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("lock_slot_buy_now", {
    p_slot_id: slotId,
    p_user_id: userId,
    p_duration_minutes: BUY_NOW_LOCK_MINUTES,
  });

  if (error) {
    const code = parseRpcError(error);
    return { ok: false, code, message: mapErrorMessage(code) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as LockRow | undefined;

  if (!row?.locked_at) {
    return { ok: false, code: "UNKNOWN", message: mapErrorMessage("UNKNOWN") };
  }

  revalidatePublicBreaksList();

  return {
    ok: true,
    slotId: row.slot_id,
    breakId: row.break_id,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
  };
}

/** @deprecated Use lockSlotBuyNow */
export const lockBreakSlot = lockSlotBuyNow;

export async function releaseSlotLock(slotId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("release_slot_lock", {
    p_slot_id: slotId,
    p_user_id: userId,
  });

  if (error) {
    return false;
  }

  const released = Boolean(data);
  if (released) {
    revalidatePublicBreaksList();
  }

  return released;
}

export async function releaseExpiredSlotLocks(): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("release_expired_slot_locks");

  if (error) {
    // Wallet cleanup bugs (credit_reserved_check) must never crash page loads / checkout.
    if (process.env.NODE_ENV !== "production") {
      console.error("[releaseExpiredSlotLocks]", error.message);
    }
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

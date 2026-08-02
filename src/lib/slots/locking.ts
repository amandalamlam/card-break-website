import { createAdminClient } from "@/lib/supabase/admin";
import { getLockExpiresAtIso, uuidEquals } from "@/lib/slots/time";
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
};

function buildLockSuccess(row: Pick<SlotRow, "id" | "break_id" | "locked_at">): LockResult {
  if (!row.locked_at) {
    return { ok: false, code: "UNKNOWN", message: mapErrorMessage("UNKNOWN") };
  }

  return {
    ok: true,
    slotId: row.id,
    breakId: row.break_id,
    lockedAt: row.locked_at,
    expiresAt: getLockExpiresAtIso(row.locked_at),
  };
}

/**
 * Resumes an existing active lock for the same user when possible, otherwise acquires a new lock.
 * Pre-check avoids false SLOT_LOCKED_BY_OTHER when the user returns via "Continue checkout".
 */
export async function resumeOrLockBreakSlot(slotId: string, userId: string): Promise<LockResult> {
  await releaseExpiredSlotLocks();

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin
    .from("break_slots")
    .select("id, break_id, status, user_id, locked_at")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) {
    return { ok: false, code: "SLOT_NOT_FOUND", message: mapErrorMessage("SLOT_NOT_FOUND") };
  }

  const row = slot as SlotRow;

  if (row.status === "locked" && row.locked_at && uuidEquals(row.user_id, userId)) {
    return buildLockSuccess(row);
  }

  return lockBreakSlot(slotId, userId);
}

export async function lockBreakSlot(slotId: string, userId: string): Promise<LockResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("lock_break_slot", {
    p_slot_id: slotId,
    p_user_id: userId,
  });

  if (error) {
    const code = parseRpcError(error);
    return { ok: false, code, message: mapErrorMessage(code) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as LockRow | undefined;

  if (!row?.locked_at) {
    return { ok: false, code: "UNKNOWN", message: mapErrorMessage("UNKNOWN") };
  }

  return {
    ok: true,
    slotId: row.slot_id,
    breakId: row.break_id,
    lockedAt: row.locked_at,
    expiresAt: getLockExpiresAtIso(row.locked_at),
  };
}

export async function releaseSlotLock(slotId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("release_slot_lock", {
    p_slot_id: slotId,
    p_user_id: userId,
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function releaseExpiredSlotLocks(): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("release_expired_slot_locks");

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : 0;
}

import { createAdminClient } from "@/lib/supabase/admin";
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

  if (!row) {
    return { ok: false, code: "UNKNOWN", message: mapErrorMessage("UNKNOWN") };
  }

  return {
    ok: true,
    slotId: row.slot_id,
    breakId: row.break_id,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
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

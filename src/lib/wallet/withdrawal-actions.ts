import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SubmitWithdrawalResult,
  Withdrawal,
  WithdrawalActionResult,
  WithdrawalMethod,
  WithdrawalWithProfile,
} from "./withdrawals";

function parseWithdrawalRpcError(error: { message?: string }): string {
  const message = error.message ?? "UNKNOWN";

  if (message.includes("INVALID_AMOUNT")) return "INVALID_AMOUNT";
  if (message.includes("MISSING_DETAILS")) return "MISSING_DETAILS";
  if (message.includes("INSUFFICIENT_CREDIT")) return "INSUFFICIENT_CREDIT";
  if (message.includes("WITHDRAWAL_NOT_FOUND")) return "WITHDRAWAL_NOT_FOUND";
  if (message.includes("WITHDRAWAL_NOT_PENDING")) return "WITHDRAWAL_NOT_PENDING";
  if (message.includes("USER_NOT_FOUND")) return "USER_NOT_FOUND";

  return "UNKNOWN";
}

export async function submitWithdrawal(
  userId: string,
  amount: number,
  method: WithdrawalMethod,
  details: string
): Promise<SubmitWithdrawalResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("submit_withdrawal", {
    p_user_id: userId,
    p_amount: amount,
    p_method: method,
    p_details: details,
  });

  if (error) {
    const code = parseWithdrawalRpcError(error);
    return { ok: false, code, message: code };
  }

  if (data == null) {
    return { ok: false, code: "UNKNOWN", message: "UNKNOWN" };
  }

  return { ok: true, withdrawalId: Number(data) };
}

export async function cancelWithdrawal(
  userId: string,
  withdrawalId: number
): Promise<WithdrawalActionResult> {
  const admin = createAdminClient();

  const { error } = await admin.rpc("cancel_withdrawal", {
    p_user_id: userId,
    p_withdrawal_id: withdrawalId,
  });

  if (error) {
    const code = parseWithdrawalRpcError(error);
    return { ok: false, code, message: code };
  }

  return { ok: true };
}

export async function completeWithdrawal(withdrawalId: number): Promise<WithdrawalActionResult> {
  const admin = createAdminClient();

  const { error } = await admin.rpc("complete_withdrawal", {
    p_withdrawal_id: withdrawalId,
  });

  if (error) {
    const code = parseWithdrawalRpcError(error);
    return { ok: false, code, message: code };
  }

  return { ok: true };
}

export async function rejectWithdrawal(withdrawalId: number): Promise<WithdrawalActionResult> {
  const admin = createAdminClient();

  const { error } = await admin.rpc("reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
  });

  if (error) {
    const code = parseWithdrawalRpcError(error);
    return { ok: false, code, message: code };
  }

  return { ok: true };
}

export async function countRecentWithdrawals(userId: string, hours = 1): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { count, error } = await admin
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getUserWithdrawals(userId: string, limit = 10): Promise<Withdrawal[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("withdrawals")
    .select("id, user_id, amount, method, details, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeWithdrawal);
}

export async function getWithdrawalsForAdmin(status?: "pending"): Promise<WithdrawalWithProfile[]> {
  const admin = createAdminClient();

  let query = admin
    .from("withdrawals")
    .select(
      "id, user_id, amount, method, details, status, created_at, updated_at, profiles (email, phone)"
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const withdrawal = normalizeWithdrawal(row);
    const profiles = (row as { profiles: WithdrawalWithProfile["profiles"] | WithdrawalWithProfile["profiles"][] })
      .profiles;
    const profile = Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;

    return {
      ...withdrawal,
      profiles: profile,
    };
  });
}

function normalizeWithdrawal(row: Record<string, unknown>): Withdrawal {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    amount: Number(row.amount),
    method: row.method as Withdrawal["method"],
    details: String(row.details),
    status: row.status as Withdrawal["status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

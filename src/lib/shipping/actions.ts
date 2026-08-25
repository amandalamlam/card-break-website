import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeShippingDetails, sanitizeShippingText } from "./sanitize";
import type {
  AdminShippingBreakGroup,
  AdminShippingParticipantRow,
  CompletedBreakShipping,
  ShippingActionResult,
  ShippingOption,
  ShippingRequest,
  ShippingRequestWithContext,
  SubmitShippingResult,
} from "./types";

function parseSubmitError(error: { message?: string }): string {
  const message = error.message ?? "UNKNOWN";
  if (message.includes("SHIPPING_ALREADY_REQUESTED")) return "SHIPPING_ALREADY_REQUESTED";
  if (message.includes("BREAK_NOT_COMPLETED")) return "BREAK_NOT_COMPLETED";
  if (message.includes("NO_PAID_SLOTS")) return "NO_PAID_SLOTS";
  if (message.includes("INVALID_SHIPPING_OPTION")) return "INVALID_SHIPPING_OPTION";
  if (message.includes("MISSING_SHIPPING_DETAILS")) return "MISSING_SHIPPING_DETAILS";
  if (message.includes("BREAK_NOT_FOUND")) return "BREAK_NOT_FOUND";
  return "UNKNOWN";
}

export async function getActiveShippingOptions(): Promise<ShippingOption[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shipping_options")
    .select("id, name, instructions, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ShippingOption[];
}

export async function getAllShippingOptions(): Promise<ShippingOption[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shipping_options")
    .select("id, name, instructions, is_active, created_at, updated_at")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ShippingOption[];
}

function parseSlotNames(snapshot: string | null | undefined): string[] {
  return String(snapshot ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

type UserShippingBreakRow = {
  break_id: string;
  title: string;
  video_url: string | null;
  slot_names: string;
};

async function fetchUserShippingBreakRows(userId: string): Promise<UserShippingBreakRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("get_user_shipping_breaks", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UserShippingBreakRow[];
}

function mapUserShippingBreakRow(
  row: UserShippingBreakRow,
  requestByBreak: Map<string, ShippingRequest>
): CompletedBreakShipping {
  return {
    breakId: row.break_id,
    title: row.title,
    videoUrl: row.video_url,
    slotNames: parseSlotNames(row.slot_names),
    shippingRequest: requestByBreak.get(row.break_id) ?? null,
  };
}

export async function getUserCompletedBreaksForShipping(
  userId: string
): Promise<CompletedBreakShipping[]> {
  const admin = createAdminClient();

  const [rows, { data: requests, error: requestsError }] = await Promise.all([
    fetchUserShippingBreakRows(userId),
    admin.from("shipping_requests").select("*").eq("user_id", userId),
  ]);

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  const requestByBreak = new Map(
    ((requests ?? []) as ShippingRequest[]).map((request) => [request.break_id, request])
  );

  return rows.map((row) => mapUserShippingBreakRow(row, requestByBreak));
}

export async function getShippingRequestForUserBreak(
  userId: string,
  breakId: string
): Promise<{ break: CompletedBreakShipping | null; options: ShippingOption[] }> {
  const admin = createAdminClient();

  const [rows, { data: request, error: requestError }] = await Promise.all([
    fetchUserShippingBreakRows(userId),
    admin
      .from("shipping_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("break_id", breakId)
      .maybeSingle(),
  ]);

  if (requestError) {
    throw new Error(requestError.message);
  }

  const row = rows.find((item) => item.break_id === breakId);
  if (!row) {
    return { break: null, options: [] };
  }

  const requestByBreak = new Map<string, ShippingRequest>();
  if (request) {
    requestByBreak.set(breakId, request as ShippingRequest);
  }

  const breakItem = mapUserShippingBreakRow(row, requestByBreak);
  const options = breakItem.shippingRequest ? [] : await getActiveShippingOptions();

  return { break: breakItem, options };
}

export async function submitShippingRequest(
  userId: string,
  breakId: string,
  shippingOptionId: number,
  shippingDetails: string
): Promise<SubmitShippingResult> {
  const admin = createAdminClient();
  const details = sanitizeShippingDetails(shippingDetails);

  if (!details) {
    return { ok: false, code: "MISSING_SHIPPING_DETAILS" };
  }

  const { data, error } = await admin.rpc("submit_shipping_request", {
    p_user_id: userId,
    p_break_id: breakId,
    p_shipping_option_id: shippingOptionId,
    p_shipping_details: details,
  });

  if (error) {
    return { ok: false, code: parseSubmitError(error) };
  }

  return { ok: true, requestId: Number(data) };
}

async function getPaidParticipantUserIdsForBreak(breakId: string): Promise<string[]> {
  const admin = createAdminClient();
  const userIds = new Set<string>();

  const { data: directOrders, error: directError } = await admin
    .from("orders")
    .select("user_id")
    .eq("break_id", breakId)
    .eq("status", "paid");

  if (directError) {
    throw new Error(directError.message);
  }

  for (const row of directOrders ?? []) {
    if (row.user_id) {
      userIds.add(row.user_id);
    }
  }

  const { data: orderItems, error: itemsError } = await admin
    .from("order_items")
    .select("order_id, orders!inner(user_id, status)")
    .eq("break_id", breakId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  for (const row of orderItems ?? []) {
    const order = row.orders as { user_id: string; status: string } | { user_id: string; status: string }[];
    const resolved = Array.isArray(order) ? (order[0] ?? null) : order;

    if (resolved?.status === "paid" && resolved.user_id) {
      userIds.add(resolved.user_id);
    }
  }

  return [...userIds];
}

async function getBreakParticipantsForAdmin(
  breakId: string
): Promise<AdminShippingParticipantRow[]> {
  const admin = createAdminClient();
  const userIds = await getPaidParticipantUserIdsForBreak(breakId);

  if (userIds.length === 0) {
    return [];
  }

  const [{ data: profiles }, { data: requests }] = await Promise.all([
    admin.from("profiles").select("id, email, phone").in("id", userIds),
    admin.from("shipping_requests").select("*").eq("break_id", breakId).in("user_id", userIds),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile as { email: string; phone: string }])
  );
  const requestMap = new Map(
    ((requests ?? []) as ShippingRequest[]).map((request) => [request.user_id, request])
  );

  const participants = await Promise.all(
    userIds.map(async (userId) => {
      const { data: snapshot } = await admin.rpc("build_user_break_slot_snapshot", {
        p_user_id: userId,
        p_break_id: breakId,
      });

      const slotNames = String(snapshot ?? "").trim();
      if (!slotNames) {
        return null;
      }

      const profile = profileMap.get(userId);

      return {
        userId,
        email: profile?.email ?? "—",
        phone: profile?.phone ?? "—",
        slotNames,
        shippingRequest: requestMap.get(userId) ?? null,
      } satisfies AdminShippingParticipantRow;
    })
  );

  return participants
    .filter((row): row is AdminShippingParticipantRow => row !== null)
    .sort((left, right) => left.email.localeCompare(right.email));
}

export async function getAdminShippingBreakOverview(): Promise<AdminShippingBreakGroup[]> {
  const admin = createAdminClient();

  const { data: breaks, error } = await admin
    .from("breaks")
    .select("id, title, video_url")
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const groups = await Promise.all(
    (breaks ?? []).map(async (breakRow) => ({
      breakId: breakRow.id,
      title: breakRow.title,
      videoUrl: breakRow.video_url,
      participants: await getBreakParticipantsForAdmin(breakRow.id),
    }))
  );

  return groups;
}

export async function getShippingRequestsForAdmin(): Promise<ShippingRequestWithContext[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("shipping_requests")
    .select(
      `
      id,
      user_id,
      break_id,
      slot_names_snapshot,
      option_name,
      shipping_details,
      status,
      admin_notes,
      created_at,
      updated_at,
      breaks ( id, title, video_url ),
      profiles ( email, phone )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const item = row as ShippingRequestWithContext & {
      breaks: ShippingRequestWithContext["breaks"] | ShippingRequestWithContext["breaks"][];
      profiles: ShippingRequestWithContext["profiles"] | ShippingRequestWithContext["profiles"][];
    };

    return {
      ...item,
      breaks: Array.isArray(item.breaks) ? (item.breaks[0] ?? null) : item.breaks,
      profiles: Array.isArray(item.profiles) ? (item.profiles[0] ?? null) : item.profiles,
    };
  });
}

export async function updateShippingRequestAdmin(
  requestId: number,
  input: {
    optionName: string;
    shippingDetails: string;
    status: "pending" | "shipped" | "completed";
    adminNotes: string | null;
  }
): Promise<ShippingActionResult> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("shipping_requests")
    .update({
      option_name: sanitizeShippingText(input.optionName, 200),
      shipping_details: sanitizeShippingDetails(input.shippingDetails),
      status: input.status,
      admin_notes: input.adminNotes ? sanitizeShippingText(input.adminNotes, 2000) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { ok: false, code: "UNKNOWN" };
  }

  return { ok: true };
}

export async function upsertShippingOptionAdmin(input: {
  id?: number;
  name: string;
  instructions: string;
  isActive: boolean;
}): Promise<ShippingActionResult & { optionId?: number }> {
  const admin = createAdminClient();
  const payload = {
    name: sanitizeShippingText(input.name, 200),
    instructions: sanitizeShippingText(input.instructions, 2000),
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await admin.from("shipping_options").update(payload).eq("id", input.id);
    if (error) {
      return { ok: false, code: "UNKNOWN" };
    }
    return { ok: true, optionId: input.id };
  }

  const { data, error } = await admin
    .from("shipping_options")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, code: "UNKNOWN" };
  }

  return { ok: true, optionId: Number(data.id) };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { revalidatePublicBreaksList } from "@/lib/breaks/revalidate-public-list";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sanitizeBreakDescription } from "@/lib/breaks/sanitize-html";
import { parseSlotsInput } from "@/lib/breaks/slots-input";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppLocale } from "@/i18n/routing";

export type CreateBreakState = {
  error?: string;
  success?: boolean;
};

export async function createBreakAction(
  locale: AppLocale,
  _prevState: CreateBreakState,
  formData: FormData
): Promise<CreateBreakState> {
  await requireAdmin(locale);

  const title = String(formData.get("title") ?? "").trim();
  const description = sanitizeBreakDescription(String(formData.get("description") ?? ""));
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const slotsRaw = String(formData.get("slots") ?? "").trim();

  if (!title) {
    return { error: "Title is required." };
  }

  let slots: ReturnType<typeof parseSlotsInput>;
  try {
    slots = parseSlotsInput(slotsRaw);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid slots input." };
  }

  if (slots.length === 0) {
    return { error: "Add at least one slot." };
  }

  const admin = createAdminClient();

  const { data: breakRow, error: breakError } = await admin
    .from("breaks")
    .insert({
      title,
      description,
      image_url: imageUrl || null,
      status: "active",
    })
    .select("id")
    .single();

  if (breakError || !breakRow) {
    return { error: breakError?.message ?? "Failed to create break." };
  }

  const slotRows = slots.map((slot) => ({
    break_id: breakRow.id,
    name: slot.name,
    price: slot.price,
    status: "available" as const,
  }));

  const { error: slotsError } = await admin.from("break_slots").insert(slotRows);

  if (slotsError) {
    await admin.from("breaks").delete().eq("id", breakRow.id);
    return { error: slotsError.message };
  }

  revalidatePath("/", "layout");
  revalidatePublicBreaksList();

  redirect({ href: `/breaks/${breakRow.id}`, locale });
  return { success: true };
}

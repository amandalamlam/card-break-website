import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
};

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, phone, store_credit, credit_reserved, role")
    .eq("id", user.id)
    .single();

  return profile;
});

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  return { user, profile };
});

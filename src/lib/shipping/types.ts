export type ShippingRequestStatus = "pending" | "shipped" | "completed";

export type AdminShippingDisplayStatus = "unrequested" | "pending" | "shipped" | "completed";

export type AdminShippingParticipantRow = {
  userId: string;
  email: string;
  phone: string;
  slotNames: string;
  shippingRequest: ShippingRequest | null;
};

export type AdminShippingBreakGroup = {
  breakId: string;
  title: string;
  videoUrl: string | null;
  participants: AdminShippingParticipantRow[];
};

export type ShippingOption = {
  id: number;
  name: string;
  instructions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShippingRequest = {
  id: number;
  user_id: string;
  break_id: string;
  slot_names_snapshot: string;
  option_name: string;
  shipping_details: string;
  status: ShippingRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompletedBreakShipping = {
  breakId: string;
  title: string;
  videoUrl: string | null;
  slotNames: string[];
  shippingRequest: ShippingRequest | null;
};

export type ShippingRequestWithContext = ShippingRequest & {
  breaks: { id: string; title: string; video_url: string | null } | null;
  profiles: { email: string; phone: string } | null;
};

export type SubmitShippingResult =
  | { ok: true; requestId: number }
  | { ok: false; code: string };

export type ShippingActionResult =
  | { ok: true }
  | { ok: false; code: string };

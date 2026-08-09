export type BreakStatus = "active" | "sold_out" | "completed" | "cancelled";
export type SlotStatus = "available" | "locked" | "sold" | "refunded";

export type Break = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: BreakStatus;
  video_url: string | null;
  created_at: string;
};

export type BreakSlot = {
  id: string;
  break_id: string;
  name: string;
  price: number;
  status: SlotStatus;
  user_id: string | null;
  locked_at: string | null;
  lock_type?: "buy_now" | "cart" | null;
  lock_expires_at?: string | null;
};

export type BreakWithSlots = Break & {
  break_slots: BreakSlot[];
};

export type BreakListItem = Break & {
  available_count: number;
  total_count: number;
};

export type AdminBreakDetail = BreakListItem & {
  break_slots: BreakSlot[];
};

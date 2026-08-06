export type CartStatus = "active" | "checkout" | "expired";

export type CartItem = {
  id: string;
  cart_id: string;
  user_id: string;
  break_id: string;
  slot_id: string;
  break_title: string;
  position_name: string;
  price: number;
  created_at: string;
};

export type Cart = {
  id: string;
  user_id: string;
  expires_at: string;
  status: CartStatus;
  created_at: string;
  updated_at: string;
};

export type CartWithItems = Cart & {
  items: CartItem[];
  remainingSeconds: number;
  totalAmount: number;
};

export type AddToCartResult =
  | { ok: true; cartId: string; cartItemId: string; expiresAt: string; isNewCart: boolean }
  | { ok: false; code: string };

export type CartActionResult =
  | { ok: true }
  | { ok: false; code: string };

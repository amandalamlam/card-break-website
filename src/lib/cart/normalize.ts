import type { CartItem, CartWithItems } from "@/lib/cart/types";

export function computeCartTotalAmount(items: Pick<CartItem, "price">[]): number {
  return items.reduce((sum, item) => {
    const price = typeof item.price === "number" ? item.price : Number(item.price);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
}

/** Keep totalAmount aligned with line items (avoids stale cached totals on Vercel). */
export function normalizeCartWithItems(cart: CartWithItems | null): CartWithItems | null {
  if (!cart) {
    return null;
  }

  return {
    ...cart,
    totalAmount: computeCartTotalAmount(cart.items),
  };
}

export function removeItemFromCart(cart: CartWithItems, itemId: string): CartWithItems | null {
  const items = cart.items.filter((item) => item.id !== itemId);
  if (items.length === 0) {
    return null;
  }

  return normalizeCartWithItems({ ...cart, items });
}

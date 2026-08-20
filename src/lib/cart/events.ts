export const CART_UPDATED_EVENT = "cart:updated";
export const CART_EXPIRED_EVENT = "cart:expired";

export function dispatchCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function dispatchCartExpired() {
  window.dispatchEvent(new Event(CART_EXPIRED_EVENT));
}

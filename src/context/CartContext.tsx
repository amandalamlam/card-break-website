"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { dispatchCartExpired, dispatchCartUpdated } from "@/lib/cart/events";
import type { CartWithItems } from "@/lib/cart/types";
import { getCartRemainingSeconds } from "@/lib/slots/time";

type CartContextValue = {
  cart: CartWithItems | null;
  itemCount: number;
  cartSlotIds: Set<string>;
  remainingSeconds: number | null;
  expiredBannerVisible: boolean;
  badgePulse: boolean;
  refreshCart: () => Promise<void>;
  triggerBadgePulse: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  isLoggedIn: boolean;
};

export function CartProvider({ children, isLoggedIn }: CartProviderProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [expiredBannerVisible, setExpiredBannerVisible] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const expiryHandledRef = useRef(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null);
      setRemainingSeconds(null);
      return;
    }

    try {
      const response = await fetch("/api/cart/items", { cache: "no-store" });

      if (!response.ok) {
        setCart(null);
        setRemainingSeconds(null);
        return;
      }

      const data = (await response.json()) as { cart: CartWithItems | null };
      setCart(data.cart);

      if (data.cart?.expires_at && data.cart.items.length > 0) {
        setRemainingSeconds(getCartRemainingSeconds(data.cart.expires_at));
        expiryHandledRef.current = false;
      } else {
        setRemainingSeconds(null);
      }
    } catch {
      setCart(null);
      setRemainingSeconds(null);
    }
  }, [isLoggedIn]);

  const triggerBadgePulse = useCallback(() => {
    setBadgePulse(true);
    window.setTimeout(() => setBadgePulse(false), 650);
  }, []);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!cart?.expires_at || cart.items.length === 0) {
      return;
    }

    const tick = () => setRemainingSeconds(getCartRemainingSeconds(cart.expires_at));
    tick();

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [cart?.expires_at, cart?.items.length]);

  useEffect(() => {
    if (remainingSeconds !== 0 || !cart || cart.items.length === 0 || expiryHandledRef.current) {
      return;
    }

    expiryHandledRef.current = true;

    void (async () => {
      await refreshCart();
      setExpiredBannerVisible(true);
      dispatchCartExpired();
      router.refresh();

      window.setTimeout(() => {
        setExpiredBannerVisible(false);
      }, 3000);
    })();
  }, [cart, remainingSeconds, refreshCart, router]);

  useEffect(() => {
    function handleCartUpdated() {
      void refreshCart();
    }

    window.addEventListener("cart:updated", handleCartUpdated);
    return () => window.removeEventListener("cart:updated", handleCartUpdated);
  }, [refreshCart]);

  const itemCount = cart?.items.length ?? 0;
  const cartSlotIds = useMemo(
    () => new Set(cart?.items.map((item) => item.slot_id) ?? []),
    [cart?.items]
  );

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      cartSlotIds,
      remainingSeconds,
      expiredBannerVisible,
      badgePulse,
      refreshCart,
      triggerBadgePulse,
    }),
    [
      badgePulse,
      cart,
      cartSlotIds,
      expiredBannerVisible,
      itemCount,
      refreshCart,
      remainingSeconds,
      triggerBadgePulse,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

export { dispatchCartUpdated };

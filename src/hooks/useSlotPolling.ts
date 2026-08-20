"use client";

import { useCallback, useEffect, useState } from "react";
import { CART_EXPIRED_EVENT, CART_UPDATED_EVENT } from "@/lib/cart/events";
import type { BreakSlot } from "@/lib/breaks/types";

const POLL_INTERVAL_MS = 8000;

type SlotsApiResponse = {
  ok: boolean;
  slots?: BreakSlot[];
  error?: string;
};

export function useSlotPolling(
  breakId: string,
  initialSlots: BreakSlot[],
  enabled = true
) {
  const [slots, setSlots] = useState<BreakSlot[]>(initialSlots);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (typeof document !== "undefined" && document.hidden) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/slots?breakId=${breakId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as SlotsApiResponse;

      if (!response.ok || !data.ok || !data.slots) {
        setError(data.error ?? "Failed to refresh slots");
        return;
      }

      setError(null);
      setSlots(data.slots);
    } catch {
      setError("Failed to refresh slots");
    } finally {
      setIsRefreshing(false);
    }
  }, [breakId, enabled]);

  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      void refresh();
      intervalId = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    const handleCartChange = () => {
      void refresh();
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(CART_UPDATED_EVENT, handleCartChange);
    window.addEventListener(CART_EXPIRED_EVENT, handleCartChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(CART_UPDATED_EVENT, handleCartChange);
      window.removeEventListener(CART_EXPIRED_EVENT, handleCartChange);
    };
  }, [breakId, enabled, refresh]);

  return { slots, refresh, isRefreshing, error };
}

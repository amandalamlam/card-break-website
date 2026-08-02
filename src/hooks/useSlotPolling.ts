"use client";

import { useCallback, useEffect, useState } from "react";
import type { BreakSlot } from "@/lib/breaks/types";

const POLL_INTERVAL_MS = 8000;

type SlotsApiResponse = {
  ok: boolean;
  slots?: BreakSlot[];
  error?: string;
};

export function useSlotPolling(breakId: string, initialSlots: BreakSlot[]) {
  const [slots, setSlots] = useState<BreakSlot[]>(initialSlots);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
  }, [breakId]);

  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  useEffect(() => {
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

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [breakId, refresh]);

  return { slots, refresh, isRefreshing, error };
}

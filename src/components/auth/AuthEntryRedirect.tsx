"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthSession } from "@/context/AuthSessionContext";
import { isGuestAuthEntryPath } from "@/lib/auth/redirect";

export function AuthEntryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthSession();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isGuestAuthEntryPath(pathname)) {
      return;
    }

    router.replace("/");
    router.refresh();
  }, [isAuthenticated, isLoading, pathname, router]);

  return null;
}

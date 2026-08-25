"use client";

import NextTopLoader from "nextjs-toploader";

export function NavigationProgressBar() {
  return (
    <NextTopLoader
      color="#d4a853"
      height={3}
      showSpinner={false}
      showAtBottom
      zIndex={99999}
      shadow={false}
    />
  );
}

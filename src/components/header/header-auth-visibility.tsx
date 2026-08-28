type HeaderAuthActionsProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  showGuestAuth: boolean;
  showLogout: boolean;
  loginLabel: string;
  signupLabel: string;
};

export function HeaderAuthSkeleton() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3" aria-hidden>
      <div className="h-8 w-[3.25rem] animate-pulse rounded-lg bg-surface-elevated/80 sm:w-16" />
      <div className="h-8 w-[3.25rem] animate-pulse rounded-lg bg-surface-elevated/80 sm:w-16" />
    </div>
  );
}

export function getHeaderAuthVisibility({
  isAuthenticated,
  isLoading,
  isAuthPage,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthPage: boolean;
}) {
  if (isLoading) {
    return {
      showGuestAuth: false,
      showLogout: false,
      showSkeleton: true,
    };
  }

  if (isAuthenticated) {
    return {
      showGuestAuth: false,
      showLogout: true,
      showSkeleton: false,
    };
  }

  if (isAuthPage) {
    return {
      showGuestAuth: false,
      showLogout: false,
      showSkeleton: false,
    };
  }

  return {
    showGuestAuth: true,
    showLogout: false,
    showSkeleton: false,
  };
}

export type HeaderAuthVisibility = ReturnType<typeof getHeaderAuthVisibility>;

export type { HeaderAuthActionsProps };

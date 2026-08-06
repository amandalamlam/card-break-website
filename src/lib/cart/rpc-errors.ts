type SupabaseRpcError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function getSupabaseRpcErrorText(error: SupabaseRpcError): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" ");
}

export function parseCartRpcError(error: SupabaseRpcError): string {
  const message = getSupabaseRpcErrorText(error);

  if (!message) {
    return "UNKNOWN";
  }

  if (message.includes("SLOT_NOT_FOUND")) return "SLOT_NOT_FOUND";
  if (message.includes("SLOT_LOCKED_BY_OTHER")) return "SLOT_LOCKED_BY_OTHER";
  if (message.includes("SLOT_UNAVAILABLE")) return "SLOT_UNAVAILABLE";
  if (message.includes("SLOT_ALREADY_IN_CART")) return "SLOT_ALREADY_IN_CART";
  if (message.includes("BREAK_NOT_ACTIVE")) return "BREAK_NOT_ACTIVE";
  if (message.includes("CART_EMPTY")) return "CART_EMPTY";
  if (message.includes("CART_EXPIRED")) return "CART_EXPIRED";
  if (message.includes("CART_ITEM_NOT_FOUND")) return "CART_ITEM_NOT_FOUND";
  if (message.includes("INSUFFICIENT_CREDIT")) return "INSUFFICIENT_CREDIT";
  if (message.includes("SLOT_LOCK_EXPIRED")) return "LOCK_EXPIRED";

  if (message.includes("add_slot_to_cart") && message.includes("does not exist")) {
    return "MIGRATION_REQUIRED";
  }

  if (message.includes("relation \"carts\"") && message.includes("does not exist")) {
    return "MIGRATION_REQUIRED";
  }

  if (
    message.includes("credit_reserved_check") ||
    message.includes("profiles_credit_reserved") ||
    message.includes("credit_reserved")
  ) {
    return "WALLET_CLEANUP_FAILED";
  }

  return "UNKNOWN";
}

export const CART_RPC_ERROR_I18N_KEYS: Record<string, string> = {
  SLOT_LOCKED_BY_OTHER: "addToCartErrors.lockedByOther",
  SLOT_UNAVAILABLE: "addToCartErrors.unavailable",
  SLOT_ALREADY_IN_CART: "addToCartErrors.alreadyInCart",
  BREAK_NOT_ACTIVE: "addToCartErrors.breakInactive",
  CART_EXPIRED: "addToCartErrors.cartExpired",
  LOCK_EXPIRED: "addToCartErrors.lockExpired",
  MIGRATION_REQUIRED: "addToCartErrors.migrationRequired",
  WALLET_CLEANUP_FAILED: "addToCartErrors.walletCleanupFailed",
};

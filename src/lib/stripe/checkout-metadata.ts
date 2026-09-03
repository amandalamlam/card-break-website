type CheckoutMetadataInput = {
  orderId: string;
  userId: string;
  breakId?: string;
  slotId?: string;
  creditAmount?: number;
  stripeAmount?: number;
  checkoutMode?: "buy_now" | "cart";
  cartId?: string;
};

export function buildCheckoutMetadata(input: CheckoutMetadataInput): Record<string, string> {
  const metadata: Record<string, string> = {
    order_id: input.orderId,
    user_id: input.userId,
  };

  if (input.breakId) {
    metadata.break_id = input.breakId;
  }
  if (input.slotId) {
    metadata.slot_id = input.slotId;
  }
  if (input.checkoutMode) {
    metadata.checkout_mode = input.checkoutMode;
  }
  if (input.cartId) {
    metadata.cart_id = input.cartId;
  }
  if (input.creditAmount !== undefined) {
    metadata.credit_amount = String(input.creditAmount);
  }
  if (input.stripeAmount !== undefined) {
    metadata.stripe_amount = String(input.stripeAmount);
  }

  return metadata;
}

import { roundMoney } from "@/lib/wallet/types";
import { toStripeAmount } from "./server";

type CartCheckoutItem = {
  break_title: string;
  position_name: string;
  price: number | string;
};

/**
 * Build Stripe line items for cart hybrid checkout.
 * When credit is applied, allocates the net Stripe amount proportionally across items.
 */
export function buildCartStripeLineItems(
  items: CartCheckoutItem[],
  total: number,
  stripeAmount: number,
  appliedCredit: number
): Array<{
  quantity: number;
  price_data: {
    currency: "hkd";
    unit_amount: number;
    product_data: { name: string; description: string };
  };
}> {
  if (stripeAmount <= 0 || items.length === 0) {
    return [];
  }

  const creditNote =
    appliedCredit > 0 ? `Store credit applied: HK$${appliedCredit.toFixed(2)}` : "Cart checkout";

  if (appliedCredit <= 0 || total <= 0) {
    return items.map((item) => ({
      quantity: 1,
      price_data: {
        currency: "hkd" as const,
        unit_amount: toStripeAmount(Number(item.price)),
        product_data: {
          name: `${item.break_title} — ${item.position_name}`,
          description: creditNote,
        },
      },
    }));
  }

  let allocated = 0;
  return items.map((item, index) => {
    const itemPrice = Number(item.price);
    let netItemAmount: number;

    if (index === items.length - 1) {
      netItemAmount = roundMoney(Math.max(0, stripeAmount - allocated));
    } else {
      netItemAmount = roundMoney((itemPrice / total) * stripeAmount);
      allocated += netItemAmount;
    }

    return {
      quantity: 1,
      price_data: {
        currency: "hkd" as const,
        unit_amount: toStripeAmount(netItemAmount),
        product_data: {
          name: `${item.break_title} — ${item.position_name}`,
          description: creditNote,
        },
      },
    };
  });
}

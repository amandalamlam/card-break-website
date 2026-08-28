export type OrderItemDescriptionInput = {
  break_title: string;
  position_name: string;
};

/**
 * Groups order line items by break title.
 * Same break: `Break Title (Slot A, Slot B)`
 * Different breaks: separated by newline.
 */
export function formatOrderItemsDescription(items: OrderItemDescriptionInput[]): string {
  if (items.length === 0) {
    return "";
  }

  const breakOrder: string[] = [];
  const slotsByBreak = new Map<string, string[]>();

  for (const item of items) {
    const breakTitle = item.break_title.trim() || "—";
    const slotName = item.position_name.trim();

    if (!slotName) {
      continue;
    }

    if (!slotsByBreak.has(breakTitle)) {
      breakOrder.push(breakTitle);
      slotsByBreak.set(breakTitle, []);
    }

    const slots = slotsByBreak.get(breakTitle)!;
    if (!slots.includes(slotName)) {
      slots.push(slotName);
    }
  }

  return breakOrder
    .map((breakTitle) => {
      const slots = slotsByBreak.get(breakTitle) ?? [];
      return `${breakTitle} (${slots.join(", ")})`;
    })
    .join("\n");
}

import type { BreakSlot } from "./types";

export type ParsedSlotInput = {
  name: string;
  price: number;
};

export function parseSlotsInput(raw: string): ParsedSlotInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, priceText] = line.split(",").map((part) => part.trim());
      const price = Number(priceText);

      if (!name || Number.isNaN(price) || price < 0) {
        throw new Error(`Invalid slot line: "${line}". Use format: Team Name,300`);
      }

      return { name, price };
    });
}

export function formatSlotsInput(slots: Pick<BreakSlot, "name" | "price">[]): string {
  return slots.map((slot) => `${slot.name},${slot.price}`).join("\n");
}

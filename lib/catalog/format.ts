import type { DimensionUnit } from "@/types/database";

/**
 * UI-only toggle for hiding all price displays. Pricing varies by customer for
 * now, so the marketing surface and cart UI render no rupee amounts. All
 * underlying calculations and stored values are unaffected — flip to `true`
 * to restore price visibility everywhere.
 */
export const SHOW_PRICE = false;

/**
 * Prices are stored in paise (integer) to avoid float drift. UI surfaces
 * always render rupees, locale-aware.
 */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPaiseToINR(paise: number): string {
  const rupees = Math.round(paise) / 100;
  return inrFormatter.format(rupees);
}

const CM_PER_UNIT: Record<DimensionUnit, number> = {
  cm: 1,
  inch: 2.54,
  feet: 30.48,
  meter: 100,
};

/** Convert a length in `unit` to canonical centimetres. */
export function toCm(value: number, unit: DimensionUnit): number {
  return value * CM_PER_UNIT[unit];
}

const SQ_CM_PER_SQ_FT = 30.48 * 30.48; // 929.0304

/** Area in square feet for a width × height supplied in `unit`. */
export function toSqFt(width: number, height: number, unit: DimensionUnit): number {
  const wCm = toCm(width, unit);
  const hCm = toCm(height, unit);
  return (wCm * hCm) / SQ_CM_PER_SQ_FT;
}

/**
 * Final unit price in paise for a cart row.
 *   final = round(area_sqft × ratePerSqftPaise) + materialModifierPaise
 * `ratePerSqftPaise` is `products.base_price`.
 */
export function priceForDimensions(
  ratePerSqftPaise: number,
  width: number,
  height: number,
  unit: DimensionUnit,
  materialModifierPaise: number,
): number {
  const areaSqFt = toSqFt(width, height, unit);
  return Math.round(areaSqFt * ratePerSqftPaise) + materialModifierPaise;
}

const UNIT_ABBR: Record<DimensionUnit, string> = {
  cm: "cm",
  inch: "in",
  feet: "ft",
  meter: "m",
};

export function formatDimensions(
  width: number,
  height: number,
  unit: DimensionUnit,
): string {
  return `${width} × ${height} ${UNIT_ABBR[unit]}`;
}

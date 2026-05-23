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

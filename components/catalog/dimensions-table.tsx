import { cn } from "@/lib/utils";
import { SHOW_PRICE } from "@/lib/catalog/format";
import { MAX_DIM_FT, MIN_DIM_FT } from "@/lib/catalog/search";

type DimensionsTableProps = {
  className?: string;
};

const UNITS: Array<{ label: string; range: string }> = [
  { label: "Feet", range: `${MIN_DIM_FT} – ${MAX_DIM_FT}` },
  { label: "Inches", range: `${MIN_DIM_FT * 12} – ${MAX_DIM_FT * 12}` },
  { label: "Centimetres", range: `${MIN_DIM_FT * 30.48} – ${MAX_DIM_FT * 30.48}` },
  { label: "Metres", range: `${(MIN_DIM_FT * 0.3048).toFixed(2)} – ${(MAX_DIM_FT * 0.3048).toFixed(2)}` },
];

export function DimensionsTable({ className }: DimensionsTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border", className)}>
      <div className="border-b border-border/70 bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium">Custom width × height</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter any width and height per side within the range below.
          {SHOW_PRICE ? " Final price is calculated per square foot." : null}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/20">
          <tr className="text-left">
            <th scope="col" className="px-4 py-3 font-medium">Unit</th>
            <th scope="col" className="px-4 py-3 font-medium">Range (each side)</th>
          </tr>
        </thead>
        <tbody>
          {UNITS.map((u, i) => (
            <tr
              key={u.label}
              className={cn("border-t border-border/70", i % 2 === 1 && "bg-muted/20")}
            >
              <td className="px-4 py-3 font-medium">{u.label}</td>
              <td className="px-4 py-3 text-muted-foreground">{u.range}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

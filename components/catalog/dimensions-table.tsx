import { cn } from "@/lib/utils";
import type { ProductDimensions, ProductSize } from "@/types/database";

const SIZE_LABEL: Record<ProductSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
};

type DimensionsTableProps = {
  dimensions: ProductDimensions;
  availableSizes: ProductSize[];
  className?: string;
};

const SIZE_ORDER: ProductSize[] = ["S", "M", "L"];

export function DimensionsTable({
  dimensions,
  availableSizes,
  className,
}: DimensionsTableProps) {
  const rows = SIZE_ORDER.filter((s) => availableSizes.includes(s))
    .map((size) => ({ size, dims: dimensions[size] }))
    .filter((row): row is { size: ProductSize; dims: { w_cm: number; h_cm: number } } =>
      row.dims !== undefined,
    );

  if (rows.length === 0) return null;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th scope="col" className="px-4 py-3 font-medium">Size</th>
            <th scope="col" className="px-4 py-3 font-medium">Width</th>
            <th scope="col" className="px-4 py-3 font-medium">Height</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ size, dims }, i) => (
            <tr
              key={size}
              className={cn(
                "border-t border-border/70",
                i % 2 === 1 && "bg-muted/20",
              )}
            >
              <td className="px-4 py-3 font-medium">
                {SIZE_LABEL[size]}
                <span className="ml-1 text-xs uppercase text-muted-foreground">
                  ({size})
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{dims.w_cm} cm</td>
              <td className="px-4 py-3 text-muted-foreground">{dims.h_cm} cm</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_VALUES,
  MATERIAL_VALUES,
  SIZE_VALUES,
} from "@/lib/catalog/search";
import { formatPaiseToINR } from "@/lib/catalog/format";
import type {
  Category,
  MaterialPriceModifier,
  Product,
  ProductDimensions,
  ProductMaterial,
  ProductSize,
} from "@/types/database";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
  type ActionResult,
  type ProductInput,
} from "@/app/admin/products/actions";

import { ImageUploader } from "./image-uploader";

const formSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use kebab-case (a-z, 0-9, hyphens)"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(5000),
  category: z.enum(CATEGORY_VALUES as [string, ...string[]]),
  base_price: z.number().int().min(0).max(100_000_00),
  available_sizes: z
    .array(z.enum(SIZE_VALUES as [string, ...string[]]))
    .min(1, "Pick at least one size"),
  available_materials: z
    .array(z.enum(MATERIAL_VALUES as [string, ...string[]]))
    .min(1, "Pick at least one material"),
  stock: z.number().int().min(0).max(100_000),
  tags_csv: z.string().trim().max(400),
  meta_title: z.string().trim().max(160),
  meta_description: z.string().trim().max(320),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_LABEL: Record<Category, string> = {
  abstract: "Abstract",
  botanical: "Botanical",
  geometric: "Geometric",
  mural: "Mural",
  kids: "Kids",
  minimal: "Minimal",
};

const MATERIAL_LABEL: Record<ProductMaterial, string> = {
  "matte-vinyl": "Matte vinyl",
  "glossy-vinyl": "Glossy vinyl",
  "fabric-texture": "Fabric texture",
  "magnetic-base": "Magnetic base",
};

const SIZE_LABEL: Record<ProductSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
};

type Mode = "create" | "edit";

type ProductFormProps =
  | { mode: "create"; initial?: undefined; productId?: undefined }
  | { mode: "edit"; initial: Product; productId: string };

export function ProductForm(props: ProductFormProps) {
  const { mode } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<string[]>(props.initial?.images ?? []);
  const [modifiers, setModifiers] = useState<MaterialPriceModifier>(
    props.initial?.material_price_modifier ?? {},
  );
  const [dimensions, setDimensions] = useState<ProductDimensions>(
    props.initial?.dimensions ?? {},
  );
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: props.initial?.slug ?? "",
      name: props.initial?.name ?? "",
      description: props.initial?.description ?? "",
      category: (props.initial?.category as Category) ?? "abstract",
      base_price: props.initial?.base_price ?? 0,
      available_sizes: (props.initial?.available_sizes as ProductSize[]) ?? [],
      available_materials:
        (props.initial?.available_materials as ProductMaterial[]) ?? [],
      stock: props.initial?.stock ?? 0,
      tags_csv: props.initial?.tags?.join(", ") ?? "",
      meta_title: props.initial?.meta_title ?? "",
      meta_description: props.initial?.meta_description ?? "",
    },
  });

  const watchSizes = (form.watch("available_sizes") as ProductSize[]) ?? [];
  const watchMaterials =
    (form.watch("available_materials") as ProductMaterial[]) ?? [];
  const basePrice = form.watch("base_price");

  function toggleSize(size: ProductSize) {
    const current = new Set(watchSizes);
    if (current.has(size)) current.delete(size);
    else current.add(size);
    form.setValue(
      "available_sizes",
      Array.from(current),
      { shouldValidate: true },
    );
  }

  function toggleMaterial(material: ProductMaterial) {
    const current = new Set(watchMaterials);
    if (current.has(material)) {
      current.delete(material);
      const nextMods = { ...modifiers };
      delete nextMods[material];
      setModifiers(nextMods);
    } else {
      current.add(material);
    }
    form.setValue(
      "available_materials",
      Array.from(current),
      { shouldValidate: true },
    );
  }

  function setModifier(material: ProductMaterial, paise: number) {
    setModifiers((prev) => ({ ...prev, [material]: paise }));
  }

  function setDimension(
    size: ProductSize,
    key: "w_cm" | "h_cm",
    value: number,
  ) {
    setDimensions((prev) => {
      const existing = prev[size] ?? { w_cm: 0, h_cm: 0 };
      return { ...prev, [size]: { ...existing, [key]: value } };
    });
  }

  function buildPayload(values: FormValues): ProductInput {
    const tags = (values.tags_csv ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const trimmedModifiers: MaterialPriceModifier = {};
    for (const material of values.available_materials as ProductMaterial[]) {
      const v = modifiers[material];
      if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
        trimmedModifiers[material] = Math.trunc(v);
      }
    }

    const trimmedDimensions: ProductDimensions = {};
    for (const size of values.available_sizes as ProductSize[]) {
      const d = dimensions[size];
      if (d && d.w_cm > 0 && d.h_cm > 0) {
        trimmedDimensions[size] = {
          w_cm: Math.trunc(d.w_cm),
          h_cm: Math.trunc(d.h_cm),
        };
      }
    }

    return {
      slug: values.slug,
      name: values.name,
      description: values.description,
      category: values.category as Category,
      base_price: values.base_price,
      images,
      available_sizes: values.available_sizes as ProductSize[],
      available_materials: values.available_materials as ProductMaterial[],
      material_price_modifier: trimmedModifiers,
      dimensions: trimmedDimensions,
      tags,
      stock: values.stock,
      meta_title: values.meta_title?.trim() ? values.meta_title.trim() : null,
      meta_description: values.meta_description?.trim()
        ? values.meta_description.trim()
        : null,
    };
  }

  function applyResult(result: ActionResult, slug: string) {
    if (result.ok) {
      router.push("/admin/products");
      router.refresh();
      return;
    }
    setServerError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.fieldErrors) {
      for (const [key, msg] of Object.entries(result.fieldErrors)) {
        const known = ["slug", "name", "description", "base_price", "stock"];
        if (known.includes(key)) {
          form.setError(key as keyof FormValues, { message: msg });
        }
      }
    }
    // slug is referenced for logging context if needed downstream
    void slug;
  }

  function onSubmit(values: FormValues) {
    if (images.length === 0) {
      setServerError("Add at least one image before saving.");
      return;
    }
    setServerError("");
    setFieldErrors({});
    const payload = buildPayload(values);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(payload)
          : await updateProductAction(props.productId, payload);
      applyResult(result, payload.slug);
    });
  }

  function onDelete() {
    if (mode !== "edit") return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setServerError("");
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteProductAction(props.productId);
      if (result.ok) {
        router.push("/admin/products");
        router.refresh();
        return;
      }
      setServerError(result.error);
      setDeleting(false);
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-8"
      noValidate
    >
      <section className="grid gap-6 rounded-2xl border border-border bg-card/40 p-6 lg:grid-cols-2">
        <Field
          id="slug"
          label="Slug"
          hint="Used in /catalog/<slug>. Lowercase, hyphens only."
          error={form.formState.errors.slug?.message ?? fieldErrors.slug}
        >
          <input
            id="slug"
            {...form.register("slug")}
            placeholder="marigold-bloom"
            className={inputClass}
          />
        </Field>

        <Field
          id="name"
          label="Name"
          error={form.formState.errors.name?.message ?? fieldErrors.name}
        >
          <input
            id="name"
            {...form.register("name")}
            placeholder="Marigold Bloom"
            className={inputClass}
          />
        </Field>

        <Field
          id="category"
          label="Category"
          error={form.formState.errors.category?.message ?? fieldErrors.category}
        >
          <select
            id="category"
            {...form.register("category")}
            className={inputClass}
          >
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="base_price"
          label="Base price (paise)"
          hint={`= ${formatPaiseToINR(basePrice || 0)}`}
          error={
            form.formState.errors.base_price?.message ?? fieldErrors.base_price
          }
        >
          <input
            id="base_price"
            type="number"
            inputMode="numeric"
            min={0}
            {...form.register("base_price", { valueAsNumber: true })}
            className={inputClass}
          />
        </Field>

        <Field
          id="stock"
          label="Stock"
          error={form.formState.errors.stock?.message ?? fieldErrors.stock}
        >
          <input
            id="stock"
            type="number"
            inputMode="numeric"
            min={0}
            {...form.register("stock", { valueAsNumber: true })}
            className={inputClass}
          />
        </Field>

        <Field
          id="tags_csv"
          label="Tags"
          hint="Comma-separated, e.g. monsoon, jaipur, mustard"
          error={form.formState.errors.tags_csv?.message}
        >
          <input
            id="tags_csv"
            {...form.register("tags_csv")}
            placeholder="monsoon, jaipur, mustard"
            className={inputClass}
          />
        </Field>

        <Field
          id="description"
          label="Description"
          hint="Long form — shown on the product page."
          error={
            form.formState.errors.description?.message ??
            fieldErrors.description
          }
          className="lg:col-span-2"
        >
          <textarea
            id="description"
            {...form.register("description")}
            rows={6}
            className={cn(inputClass, "resize-y")}
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-semibold">Variants</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the sizes and materials customers can order. Material price
          modifiers add to the base price.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sizes
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIZE_VALUES.map((size) => {
                const active = watchSizes.includes(size);
                return (
                  <button
                    type="button"
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={pillClass(active)}
                  >
                    {SIZE_LABEL[size]}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.available_sizes ? (
              <p className="mt-1.5 text-xs text-destructive">
                {form.formState.errors.available_sizes.message as string}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Materials
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MATERIAL_VALUES.map((material) => {
                const active = watchMaterials.includes(material);
                return (
                  <button
                    type="button"
                    key={material}
                    onClick={() => toggleMaterial(material)}
                    className={pillClass(active)}
                  >
                    {MATERIAL_LABEL[material]}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.available_materials ? (
              <p className="mt-1.5 text-xs text-destructive">
                {form.formState.errors.available_materials.message as string}
              </p>
            ) : null}
          </div>
        </div>

        {watchMaterials.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Material price modifier (paise, can be negative)
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {watchMaterials.map((material) => (
                <label
                  key={material}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span className="text-sm">{MATERIAL_LABEL[material]}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={modifiers[material] ?? 0}
                    onChange={(e) =>
                      setModifier(material, Number(e.target.value) || 0)
                    }
                    className="w-32 rounded-md border border-border bg-background px-2 py-1 text-right text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {watchSizes.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dimensions (cm)
            </p>
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Width (cm)</th>
                    <th className="px-3 py-2">Height (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {watchSizes.map((size) => (
                    <tr key={size} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">
                        {SIZE_LABEL[size]}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={dimensions[size]?.w_cm ?? ""}
                          onChange={(e) =>
                            setDimension(
                              size,
                              "w_cm",
                              Number(e.target.value) || 0,
                            )
                          }
                          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={dimensions[size]?.h_cm ?? ""}
                          onChange={(e) =>
                            setDimension(
                              size,
                              "h_cm",
                              Number(e.target.value) || 0,
                            )
                          }
                          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-display text-lg font-semibold">Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          First image is the cover. Drag order with the arrow buttons.
        </p>
        <div className="mt-4">
          <ImageUploader value={images} onChange={setImages} />
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-border bg-card/40 p-6 lg:grid-cols-2">
        <Field
          id="meta_title"
          label="Meta title"
          hint="Optional — defaults to product name."
          error={form.formState.errors.meta_title?.message}
        >
          <input
            id="meta_title"
            {...form.register("meta_title")}
            maxLength={160}
            className={inputClass}
          />
        </Field>

        <Field
          id="meta_description"
          label="Meta description"
          hint="Optional — defaults to product description."
          error={form.formState.errors.meta_description?.message}
        >
          <input
            id="meta_description"
            {...form.register("meta_description")}
            maxLength={320}
            className={inputClass}
          />
        </Field>
      </section>

      {serverError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={isPending || deleting}>
            {isPending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create product"
                : "Save changes"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => router.push("/admin/products")}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
        {mode === "edit" ? (
          <Button
            type="button"
            size="lg"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending || deleting}
          >
            {deleting ? "Deleting…" : "Delete product"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function pillClass(active: boolean) {
  return cn(
    "rounded-full border px-4 py-1.5 text-sm transition",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:border-foreground/40",
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

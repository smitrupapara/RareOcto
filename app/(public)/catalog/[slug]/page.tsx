import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs, buildProductBreadcrumbs } from "@/components/catalog/breadcrumbs";
import { DimensionsTable } from "@/components/catalog/dimensions-table";
import { FavoriteToggle } from "@/components/catalog/favorite-toggle";
import { ProductBuyBox } from "@/components/catalog/product-buy-box";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductJsonLd } from "@/components/catalog/product-jsonld";
import { RelatedProducts } from "@/components/catalog/related-products";
import { ReviewForm } from "@/components/catalog/review-form";
import { ReviewList } from "@/components/catalog/review-list";
import { ReviewSummary } from "@/components/catalog/review-summary";
import { getCurrentUser } from "@/lib/auth";
import {
  getProductBySlug,
  getReviewAggregate,
  isFavorite,
} from "@/lib/catalog/queries";
import { og } from "@/lib/cloudinary/transforms";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rareocto.com";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: "Product not found — RareOcto",
      robots: { index: false, follow: false },
    };
  }

  const title = product.meta_title ?? `${product.name} — RareOcto`;
  const description =
    product.meta_description ??
    (product.description.length > 160
      ? `${product.description.slice(0, 157)}…`
      : product.description);
  const url = `${SITE_URL}/catalog/${product.slug}`;
  const cover = product.images[0];
  const ogImage = cover ? og(cover) : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: RouteProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [aggregate, user] = await Promise.all([
    getReviewAggregate(product.id),
    getCurrentUser(),
  ]);
  const initialIsFavorite = user ? await isFavorite(user.id, product.id) : false;
  const isAuthed = Boolean(user);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Breadcrumbs items={buildProductBreadcrumbs(product.category, product.name)} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              RareOcto
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-3">
              <ReviewSummary aggregate={aggregate} />
            </div>
          </div>

          <ProductBuyBox
            productId={product.id}
            basePrice={product.base_price}
            stock={product.stock}
            availableSizes={product.available_sizes}
            availableMaterials={product.available_materials}
            materialPriceModifier={product.material_price_modifier}
            isAuthed={isAuthed}
          />

          <div className="flex items-center gap-2">
            <FavoriteToggle
              productId={product.id}
              isAuthed={isAuthed}
              initialIsFavorite={initialIsFavorite}
              showLabel
            />
          </div>
        </div>
      </div>

      <section className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            About this piece
          </h2>
          <div className="mt-4 space-y-4 text-pretty text-base leading-relaxed text-foreground/90">
            {product.description.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
        <aside className="lg:col-span-1">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Dimensions
          </h2>
          <div className="mt-4">
            <DimensionsTable
              dimensions={product.dimensions}
              availableSizes={product.available_sizes}
            />
          </div>
        </aside>
      </section>

      <section id="reviews" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              reviews
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              What people say
            </h2>
          </div>
          <ReviewSummary aggregate={aggregate} size="lg" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ReviewList productId={product.id} />
          </div>
          <div className="lg:col-span-1">
            <ReviewForm productId={product.id} isAuthed={isAuthed} />
          </div>
        </div>
      </section>

      <RelatedProducts productId={product.id} category={product.category} />

      <ProductJsonLd product={product} aggregate={aggregate} />
    </div>
  );
}

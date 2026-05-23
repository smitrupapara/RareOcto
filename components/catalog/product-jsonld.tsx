import { og } from "@/lib/cloudinary/transforms";
import type { Product } from "@/types/database";
import type { ReviewAggregate } from "@/lib/catalog/queries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rareocto.com";

type ProductJsonLdProps = {
  product: Product;
  aggregate: ReviewAggregate;
};

export function ProductJsonLd({ product, aggregate }: ProductJsonLdProps) {
  const url = `${SITE_URL}/catalog/${product.slug}`;
  const images = product.images.slice(0, 6).map((id) => og(id));
  const priceRupees = (product.base_price / 100).toFixed(2);

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.meta_description ?? product.description.slice(0, 280),
    sku: product.slug,
    brand: { "@type": "Brand", name: "RareOcto" },
    image: images,
    url,
    category: product.category,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: priceRupees,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (aggregate.count > 0) {
    json.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregate.average.toFixed(2),
      reviewCount: aggregate.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Catalog", item: `${SITE_URL}/catalog` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: `${SITE_URL}/catalog?category=${product.category}`,
      },
      { "@type": "ListItem", position: 4, name: product.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}

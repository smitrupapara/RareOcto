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
  // `base_price` is paise per sq ft. The minimum order is 1×1 ft = 1 sq ft, so the
  // starting price (in rupees) equals base_price / 100.
  const startingPriceRupees = (product.base_price / 100).toFixed(2);
  const primaryCategory = product.category[0];

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.meta_description ?? product.description.slice(0, 280),
    sku: product.slug,
    brand: { "@type": "Brand", name: "RareOcto" },
    image: images,
    url,
    category: product.category.join(", "),
    offers: {
      "@type": "AggregateOffer",
      url,
      priceCurrency: "INR",
      lowPrice: startingPriceRupees,
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

  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Catalog", item: `${SITE_URL}/catalog` },
  ];
  if (primaryCategory) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: primaryCategory,
      item: `${SITE_URL}/catalog?category=${primaryCategory}`,
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: primaryCategory ? 4 : 3,
    name: product.name,
    item: url,
  });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
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

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RareOcto — magnetic wallpaper";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rareocto.com";

type RouteProps = { params: Promise<{ slug: string }> };

type ProductRow = {
  name: string;
  category: string;
  description: string;
  images: string[];
};

async function fetchProduct(slug: string): Promise<ProductRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=name,category,description,images`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    },
  );

  if (!res.ok) return null;
  const rows: ProductRow[] = await res.json();
  return rows[0] ?? null;
}

function cloudinaryOg(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !publicId) return "";
  const clean = publicId.startsWith("/") ? publicId.slice(1) : publicId;
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_1200,h_630,f_auto,q_auto/${clean}`;
}

export default async function OGImage({ params }: RouteProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  // If no product or no image, redirect to the static site OG
  const cover = product?.images?.[0];
  const productImageUrl = cover ? cloudinaryOg(cover) : null;

  const categoryLabel = product?.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : "Magnetic Wallpaper";

  const description =
    product?.description && product.description.length > 100
      ? `${product.description.slice(0, 97)}…`
      : product?.description ?? "Stick. Peel. Repeat.";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background: "#0d1117",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background product image (blurred, right half) */}
        {productImageUrl ? (
          <img
            src={productImageUrl}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "560px",
              height: "630px",
              objectFit: "cover",
              opacity: 0.9,
            }}
          />
        ) : null}

        {/* Gradient overlay left-to-right */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: productImageUrl
              ? "linear-gradient(to right, #0d1117 52%, transparent 100%)"
              : "linear-gradient(135deg, #0d1117 0%, #1a2234 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 64px",
            width: "700px",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <img
              src={`${SITE_URL}/logo.webp`}
              style={{ width: "40px", height: "40px", borderRadius: "8px" }}
            />
            <span
              style={{
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: "22px",
                color: "#e8e9ec",
                letterSpacing: "-0.5px",
              }}
            >
              RareOcto
            </span>
          </div>

          {/* Product info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Category pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#5b8ef0",
                  background: "rgba(91,142,240,0.12)",
                  borderRadius: "100px",
                  padding: "4px 12px",
                }}
              >
                {categoryLabel}
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                fontFamily: "sans-serif",
                fontWeight: 800,
                fontSize: product?.name && product.name.length > 30 ? "38px" : "48px",
                lineHeight: 1.1,
                color: "#f0f1f4",
                letterSpacing: "-1px",
              }}
            >
              {product?.name ?? "Magnetic Wallpaper"}
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: "17px",
                lineHeight: 1.55,
                color: "#8b9bb4",
                maxWidth: "520px",
              }}
            >
              {description}
            </div>
          </div>

          {/* Footer tag */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              letterSpacing: "0.12em",
              color: "#3d4f6b",
            }}
          >
            STICK · PEEL · REPEAT
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

import type { Metadata } from "next";
export const siteURL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export function metadata(
  title: string,
  description: string,
  path: string,
  noindex = false,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: path,
      siteName: "DramaMatch",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
export function safeJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

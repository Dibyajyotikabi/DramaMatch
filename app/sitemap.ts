import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/providers";
import { siteURL } from "@/lib/seo";
import { collectionPaths, collectionFor } from "@/lib/seo/collections";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const paths = [
    "",
    "/collections",
    ...catalog.flatMap((d) => [`/drama/${d.slug}`, `/dramas-like/${d.slug}`]),
    ...collectionPaths(catalog)
      .filter(
        (p) =>
          (collectionFor(p.category, p.slug, catalog)?.items.length ?? 0) >= 3,
      )
      .map((p) => `/${p.category}/${p.slug}`),
  ];
  return paths.map((path) => ({
    url: siteURL + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}

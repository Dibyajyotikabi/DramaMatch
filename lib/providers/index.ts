import "server-only";
import { cache } from "react";
import { dramas } from "../data/catalog";
import { searchCatalog } from "../search/engine";
import type { DramaProvider } from "./types";
export const provider: DramaProvider = {
  list: async () => dramas,
  bySlug: async (slug) => dramas.find((d) => d.slug === slug),
  search: async (query) => searchCatalog(dramas, query),
};
export const getCatalog = cache(() => provider.list());
export const getDrama = cache((slug: string) => provider.bySlug(slug));

import type { Drama, SearchResult } from "../types";
/** Providers normalize their records into our own domain types; UI and scoring never consume vendor payloads. */
export interface DramaProvider {
  list(): Promise<Drama[]>;
  bySlug(slug: string): Promise<Drama | undefined>;
  search(query: string): Promise<SearchResult[]>;
}

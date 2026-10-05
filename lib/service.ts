/**
 * One entry point for the UI and API routes: live TMDB data when a key is
 * configured, the built-in catalog otherwise (or if TMDB is unreachable).
 */
import { catalog, titleById } from "./catalog";
import { defaultFilters, interpret, recommend, similarTo } from "./engine";
import {
  liveDetails,
  liveHome,
  liveSearch,
  liveSuggest,
  type Home,
  type LiveSuggestion,
} from "./live";
import { ROWS, TOP10, WALL } from "./rows";
import { liveEnabled } from "./tmdb";
import type { Filters, Kind, Pick, TitleDetails } from "./types";

export interface SearchResponse {
  source: "live" | "catalog";
  query: string;
  summary: string;
  corrected?: string;
  understood: boolean;
  hints: { minRating?: number; era?: string; kind?: Kind };
  total: number;
  picks: Pick[];
}

const MAX = 60;

export async function search(
  query: string,
  partial: Partial<Filters> = {},
  probe = false,
): Promise<SearchResponse> {
  const intent = interpret(query);
  const filters: Filters = { ...defaultFilters(intent), ...partial };
  const hints = {
    minRating: intent.minRating,
    era: intent.era,
    kind: intent.kind,
  };

  if (liveEnabled()) {
    try {
      const live = await liveSearch(
        intent,
        probe ? { ...filters, minRating: 0, era: "any" } : filters,
      );
      if (live.picks.length) {
        return {
          source: "live",
          query: intent.query,
          summary: live.summary,
          corrected: live.corrected,
          understood: live.understood,
          hints,
          total: live.picks.length,
          picks: probe ? [] : live.picks.slice(0, MAX),
        };
      }
    } catch (e) {
      console.error("Live search failed, using the built-in catalog:", e);
    }
  }

  const picks = recommend(
    intent,
    probe ? { ...filters, minRating: 0, era: "any" } : filters,
  );
  return {
    source: "catalog",
    query: intent.query,
    summary: intent.summary,
    corrected: intent.corrected,
    understood: intent.understood,
    hints,
    total: picks.length,
    picks: probe ? [] : picks.slice(0, MAX),
  };
}

export async function details(id: string): Promise<TitleDetails | null> {
  const local = titleById(id);
  if (local)
    return { ...local, ratingSource: "IMDb", similar: similarTo(local, 12) };
  if (!liveEnabled()) return null;
  try {
    return await liveDetails(id);
  } catch (e) {
    console.error("Live details failed:", e);
    return null;
  }
}

export async function suggestLive(q: string): Promise<LiveSuggestion[]> {
  if (!liveEnabled() || q.trim().length < 2) return [];
  try {
    return await liveSuggest(q.trim());
  } catch {
    return [];
  }
}

export function catalogHome(): Home {
  return { live: false, top10: TOP10, rows: ROWS, wall: WALL };
}

export async function home(): Promise<Home> {
  if (liveEnabled()) {
    try {
      return await liveHome();
    } catch (e) {
      console.error("Live home rows failed, using the built-in catalog:", e);
    }
  }
  return catalogHome();
}

export const catalogSize = catalog.length;

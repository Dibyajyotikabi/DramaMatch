export type Kind = "movie" | "series";

export interface Title {
  id: string;
  title: string;
  year: number;
  /** IMDb user rating (0–10), snapshot at catalog time. */
  rating: number;
  /** Approximate IMDb vote count, in thousands. Used as a popularity signal. */
  votes: number;
  kind: Kind;
  genres: string[];
  country: string;
  /** Director (movies) or creator/showrunner (series). May be empty. */
  director: string;
  cast: string[];
  tags: string[];
  blurb: string;
}

export interface Era {
  id: string;
  label: string;
  from: number;
  to: number;
}

export interface Filters {
  minRating: number;
  era: string;
  kind: Kind | "any";
}

export interface Intent {
  query: string;
  seeds: Title[];
  people: string[];
  tags: Record<string, number>;
  genres: Record<string, number>;
  excludeGenres: string[];
  excludeTags: string[];
  countries: string[];
  kind?: Kind;
  minRating?: number;
  era?: string;
  terms: string[];
  /** The query with typos fixed, when we changed anything ("Did you mean…"). */
  corrected?: string;
  /** Human-readable summary of what we understood, e.g. "something comforting". */
  summary: string;
  understood: boolean;
}

export interface Pick {
  title: Title;
  score: number;
  reason: string;
}

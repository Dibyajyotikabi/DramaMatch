export type Country = "KR" | "CN";
export type Ending = "happy" | "bittersweet" | "sad" | "open" | "unknown";
export interface Person {
  name: string;
  slug: string;
  kind: "actor" | "actress";
}
export interface DramaDNA {
  romance: number;
  chemistry: number;
  comedy: number;
  angst: number;
  action: number;
  mystery: number;
  pace: "slow" | "medium" | "fast";
  ending: Ending;
  loveTriangle: "none" | "mild" | "heavy";
  leadType: string[];
  setting: string[];
  tropes: string[];
  moods: string[];
  themes: string[];
  toxicity: number;
  spoilerSafeNotes: string;
}
export interface Drama {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  country: Country;
  type: "tv" | "movie";
  year: number;
  synopsis: string;
  poster: string;
  genres: string[];
  actors: Person[];
  episodeCount: number;
  rating: number;
  popularity: number;
  dna: DramaDNA;
  color: string;
}
export interface Preferences {
  seed?: string;
  query?: string;
  country?: Country;
  wanted: string[];
  mood?: string;
  avoid: string[];
}
export interface Match {
  drama: Drama;
  score: number;
  reasons: string[];
  tags: string[];
  breakdown: { label: string; score: number; weight: number }[];
  matched: number;
  total: number;
}
export interface SearchResult {
  id: string;
  label: string;
  group: "Dramas" | "Movies" | "Actors" | "Actresses" | "Genres" | "Tropes";
  subtitle: string;
  slug: string;
  poster?: string;
}

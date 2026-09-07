import type { Preferences } from "../types";
export const wantedOptions = [
  "Romance",
  "Chemistry",
  "Green flag",
  "Comedy",
  "Slow burn",
  "Action",
  "Mystery",
  "Youth",
  "Historical",
  "Fantasy",
];
export const moodOptions = [
  "Comfort me",
  "Give me butterflies",
  "Make me cry",
  "Keep me hooked",
  "Make me laugh",
  "Make me think",
];
export const avoidOptions = [
  "Sad ending",
  "Love triangle",
  "Toxic leads",
  "Slow pacing",
  "Breakups",
  "Fantasy",
];
export function parseQuery(query: string): Partial<Preferences> {
  const q = query.toLowerCase();
  const wanted: string[] = [];
  const avoid: string[] = [];
  for (const [pattern, label] of [
    [/romance|romantic/, "Romance"],
    [/chemistry/, "Chemistry"],
    [/green.flag/, "Green flag"],
    [/comedy|funny/, "Comedy"],
    [/slow.burn/, "Slow burn"],
    [/action/, "Action"],
    [/mystery|thriller/, "Mystery"],
    [/youth|school|college/, "Youth"],
    [/historical|costume/, "Historical"],
  ] as const)
    if (pattern.test(q)) wanted.push(label);
  if (/fantasy|xianxia/.test(q) && !/(?:no|without|avoid)\s+fantasy/.test(q))
    wanted.push("Fantasy");
  if (/happy.end|no.sad.end|avoid.sad.end|without.sad.end/.test(q))
    avoid.push("Sad ending");
  if (/(?:no|without|avoid)(?:\s+a)?\s+love.triangle/.test(q))
    avoid.push("Love triangle");
  if (/(?:no|without|avoid)\s+toxic|green.flag/.test(q))
    avoid.push("Toxic leads");
  if (/(?:no|without|avoid)\s+slow|fast.pac/.test(q)) avoid.push("Slow pacing");
  if (/(?:no|without|avoid)\s+breakups?/.test(q)) avoid.push("Breakups");
  if (/(?:no|without|avoid)\s+fantasy/.test(q)) avoid.push("Fantasy");
  const mood = /comfort|cozy|cosy|healing/.test(q)
    ? "Comfort me"
    : /butterflies/.test(q)
      ? "Give me butterflies"
      : /cry|tearjerk/.test(q)
        ? "Make me cry"
        : /laugh|funny/.test(q)
          ? "Make me laugh"
          : /hook|suspense/.test(q)
            ? "Keep me hooked"
            : undefined;
  return {
    query,
    wanted,
    avoid,
    mood,
    country: /k.?drama|korean/.test(q)
      ? "KR"
      : /c.?drama|chinese/.test(q)
        ? "CN"
        : undefined,
  };
}
export function readPreferences(params: URLSearchParams): Preferences {
  const query = (params.get("q") ?? "").slice(0, 200);
  const parsed = parseQuery(query);
  return {
    seed: params.get("seed")?.slice(0, 100),
    query,
    country:
      params.get("country") === "KR"
        ? "KR"
        : params.get("country") === "CN"
          ? "CN"
          : parsed.country,
    wanted: params.has("wanted")
      ? (params.get("wanted") ?? "")
          .split(",")
          .filter((v) => wantedOptions.includes(v))
          .slice(0, 10)
      : (parsed.wanted ?? []),
    mood: moodOptions.includes(params.get("mood") ?? "")
      ? params.get("mood")!
      : parsed.mood,
    avoid: params.has("avoid")
      ? (params.get("avoid") ?? "")
          .split(",")
          .filter((v) => avoidOptions.includes(v))
      : (parsed.avoid ?? []),
  };
}
export function preferencesURL(p: Preferences) {
  const q = new URLSearchParams();
  if (p.seed) q.set("seed", p.seed);
  if (p.query) q.set("q", p.query);
  if (p.country) q.set("country", p.country);
  q.set("wanted", p.wanted.join(","));
  q.set("avoid", p.avoid.join(","));
  if (p.mood) q.set("mood", p.mood);
  return q.toString();
}

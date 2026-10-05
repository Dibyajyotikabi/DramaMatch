import { catalog as defaultCatalog } from "./catalog";
import type { Era, Filters, Intent, Kind, Pick, Title } from "./types";

/* ───────────────────────── Options shown in the chat ───────────────────────── */

export const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 6, label: "6+" },
  { value: 7, label: "7+" },
  { value: 7.5, label: "7.5+" },
  { value: 8, label: "8+" },
  { value: 8.5, label: "8.5+" },
];

export const ERAS: Era[] = [
  { id: "any", label: "Any year", from: 0, to: 9999 },
  { id: "2020s", label: "2020s", from: 2020, to: 2029 },
  { id: "2010s", label: "2010s", from: 2010, to: 2019 },
  { id: "2000s", label: "2000s", from: 2000, to: 2009 },
  { id: "1990s", label: "1990s", from: 1990, to: 1999 },
  { id: "classic", label: "Before 1990", from: 0, to: 1989 },
];

export const TAG_LABELS: Record<string, string> = {
  feelgood: "Feel-good",
  cozy: "Cozy",
  tearjerker: "Tearjerker",
  dark: "Dark",
  mindbending: "Mind-bending",
  epic: "Epic",
  inspiring: "Inspiring",
  funny: "Funny",
  romantic: "Romantic",
  scary: "Scary",
  tense: "Edge-of-your-seat",
  twisty: "Full of twists",
  slowburn: "Slow burn",
  revenge: "Revenge",
  family: "Family-friendly",
  actionpacked: "Action-packed",
  nostalgic: "Nostalgic",
  comingofage: "Coming-of-age",
  bittersweet: "Bittersweet",
  thoughtful: "Thought-provoking",
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: "American",
  UK: "British",
  IE: "Irish",
  KR: "Korean",
  CN: "Chinese",
  TW: "Taiwanese",
  HK: "Hong Kong",
  JP: "Japanese",
  IN: "Indian",
  FR: "French",
  ES: "Spanish",
  DE: "German",
  IT: "Italian",
  MX: "Mexican",
  BR: "Brazilian",
  DK: "Danish",
  IR: "Iranian",
  AU: "Australian",
};

/* ───────────────────────────── Text helpers ───────────────────────────── */

export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+.]+/g, " ")
    .replace(/(^|\s)\.+|\.+(\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (text: string, phrase: string) =>
  ` ${text} `.includes(` ${phrase} `);

const bigrams = (s: string) => {
  const t = s.replace(/\s+/g, "");
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
};

/** Sørensen–Dice similarity on character bigrams (typo-tolerant matching). */
export function similarity(a: string, b: string) {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.length || !y.length) return 0;
  const counts = new Map<string, number>();
  for (const g of x) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of y) {
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      hits++;
      counts.set(g, n - 1);
    }
  }
  return (2 * hits) / (x.length + y.length);
}

/* ───────────────────────────── Vocabulary ───────────────────────────── */

interface Mood {
  re: RegExp;
  label: string;
  tags?: Record<string, number>;
  genres?: Record<string, number>;
}

const MOODS: Mood[] = [
  {
    re: /\b(sad|down|blue|depressed|lonely|heartbroken|broken hearted|heartbreak|upset|gloomy|miserable|unhappy|bad day|rough day|feeling low)\b/,
    label: "something comforting",
    tags: { feelgood: 1, cozy: 0.9, inspiring: 0.4, funny: 0.3 },
    genres: { Comedy: 0.4, Family: 0.3 },
  },
  {
    re: /\b(cry|crying|tearjerker|tear jerker|tears|emotional|weep|sob|heart wrenching)\b/,
    label: "a good cry",
    tags: { tearjerker: 1.3 },
    genres: { Drama: 0.3 },
  },
  {
    re: /\b(happy|cheerful|good mood|great mood|joyful|joy|excited|upbeat|feel good|feelgood|uplifted|sunny|positive)\b/,
    label: "something upbeat",
    tags: { feelgood: 1.1, funny: 0.6 },
    genres: { Comedy: 0.5, Adventure: 0.3 },
  },
  {
    re: /\b(laugh|laughs|funny|comedy|comedies|hilarious|silly|lighthearted|light hearted|goofy|sitcom|sitcoms)\b/,
    label: "a good laugh",
    tags: { funny: 1.3 },
    genres: { Comedy: 1 },
  },
  {
    re: /\b(romantic|romance|romances|in love|love story|love stories|date night|crush|butterflies|romcom|romcoms|rom com|rom coms|valentine|valentines|first love|swoon|kiss|date|girlfriend|boyfriend|partner|bae|wife|husband|anniversary)\b/,
    label: "romance",
    tags: { romantic: 1.3 },
    genres: { Romance: 1 },
  },
  {
    re: /\b(stressed|stress|anxious|anxiety|tired|exhausted|overwhelmed|burnt out|burned out|relax|relaxing|chill|chilled|calm|cozy|cosy|comfort|comforting|wholesome|soothing|sleepy|lazy|sunday|rainy)\b/,
    label: "something cozy",
    tags: { cozy: 1.3, feelgood: 0.7 },
    genres: { Comedy: 0.3, Family: 0.3, Animation: 0.2 },
  },
  {
    re: /\b(bored|boring|restless|energetic|pumped|hyped|adrenaline|action|fights?|explosions?|badass|kick ass)\b/,
    label: "pure adrenaline",
    tags: { actionpacked: 1.2, tense: 0.4 },
    genres: { Action: 1, Adventure: 0.4 },
  },
  {
    re: /\b(scared|scary|scare me|horror|spooky|creepy|terrifying|haunted|ghosts?|zombies?|halloween|frightening|chills)\b/,
    label: "a proper scare",
    tags: { scary: 1.3 },
    genres: { Horror: 1.1 },
  },
  {
    re: /\b(thrill|thriller|thrillers|thrilling|suspense|suspenseful|tense|edge of my seat|edge of the seat|gripping|intense|nail biting)\b/,
    label: "edge-of-your-seat suspense",
    tags: { tense: 1.2, twisty: 0.5 },
    genres: { Thriller: 1 },
  },
  {
    re: /\b(mystery|mysteries|detective|detectives|whodunit|whodunnit|crime|murder|heist|investigation|cops?)\b/,
    label: "a mystery to crack",
    tags: { twisty: 0.8, tense: 0.4 },
    genres: { Mystery: 0.9, Crime: 0.8 },
  },
  {
    re: /\b(twists?|twisty|plot twists?|mind ?bending|mind ?blowing|mindblowing|trippy|weird|confusing|thought provoking|thinking|deep|smart|clever|curious|philosophical|brainy|complex)\b/,
    label: "something mind-bending",
    tags: { mindbending: 1.3, twisty: 0.8, thoughtful: 0.5 },
    genres: { "Sci-Fi": 0.4, Mystery: 0.4 },
  },
  {
    re: /\b(inspired|inspiring|inspirational|motivated|motivation|motivational|uplifting|hopeful|hope|underdog|true story|real story|based on a true story|real life)\b/,
    label: "something inspiring",
    tags: { inspiring: 1.3, feelgood: 0.4 },
    genres: { Biography: 0.5, Sport: 0.3 },
  },
  {
    re: /\b(nostalgic|nostalgia|old school|childhood|retro|throwback|90s kid|vintage)\b/,
    label: "a nostalgic classic",
    tags: { nostalgic: 1.3 },
  },
  {
    re: /\b(adventure|adventures|adventurous|epic|epics|journey|quest|explore|escape|escapist|grand|spectacle)\b/,
    label: "an epic adventure",
    tags: { epic: 1.2 },
    genres: { Adventure: 1, Fantasy: 0.3 },
  },
  {
    re: /\b(angry|furious|pissed|rage|revenge|vengeance|payback|avenge)\b/,
    label: "some satisfying revenge",
    tags: { revenge: 1.3, actionpacked: 0.4 },
    genres: { Action: 0.4, Thriller: 0.3 },
  },
  {
    re: /\b(dark|gritty|disturbing|bleak|twisted|grim|brutal|noir)\b/,
    label: "something dark",
    tags: { dark: 1.3 },
    genres: { Crime: 0.3, Thriller: 0.3 },
  },
  {
    re: /\b(family|kids|kid friendly|children|with my parents|with my mom|with my dad|all ages)\b/,
    label: "family movie night",
    tags: { family: 1.3, feelgood: 0.3 },
    genres: { Family: 1, Animation: 0.5 },
  },
  {
    re: /\b(sci ?fi|scifi|science fiction|space|aliens?|future|futuristic|robots?|time travel|dystopian|dystopia)\b/,
    label: "sci-fi",
    genres: { "Sci-Fi": 1.3 },
  },
  {
    re: /\b(fantasy|magic|magical|wizards?|witch|witches|dragons?|fairy tales?|fairytales?|mythology|myth|xianxia|wuxia)\b/,
    label: "fantasy",
    tags: { epic: 0.3 },
    genres: { Fantasy: 1.3 },
  },
  {
    re: /\b(animated|animation|cartoons?|pixar|ghibli|disney)\b/,
    label: "animation",
    genres: { Animation: 1.4 },
  },
  {
    re: /\b(war|wars|soldiers?|military|battle|ww2|wwii)\b/,
    label: "war stories",
    genres: { War: 1.3 },
  },
  {
    re: /\b(history|historical|period piece|period drama|costume drama|palace|dynasty|joseon|ancient)\b/,
    label: "history",
    genres: { History: 1.2 },
  },
  {
    re: /\b(music|musical|musicals|songs?|singing|dance|dancing|band|concert)\b/,
    label: "music",
    genres: { Music: 1.3 },
  },
  {
    re: /\b(sports?|football|soccer|cricket|boxing|basketball|baseball|wrestling|athlete|chess)\b/,
    label: "sports",
    tags: { inspiring: 0.4 },
    genres: { Sport: 1.3 },
  },
  {
    re: /\b(coming of age|teen|teens|teenage|teenager|high school|school|college|youth|growing up)\b/,
    label: "coming-of-age",
    tags: { comingofage: 1.3 },
  },
  {
    re: /\b(bittersweet|melancholy|melancholic|wistful|slow burn|slowburn|quiet|nostalgic love)\b/,
    label: "something bittersweet",
    tags: { bittersweet: 1.1, slowburn: 0.6 },
  },
  {
    re: /(?<![kcj] |[kcj])\b(serious|meaningful|moving|drama|dramas|heavy)\b/,
    label: "a serious drama",
    tags: { thoughtful: 0.6 },
    genres: { Drama: 0.9 },
  },
  {
    re: /\b(with friends|with my friends|friends night|group watch|party|hangout|sleepover)\b/,
    label: "a fun group watch",
    tags: { funny: 1, feelgood: 0.8, actionpacked: 0.5 },
    genres: { Comedy: 0.6, Adventure: 0.4 },
  },
  {
    re: /\b(western|westerns|cowboys?)\b/,
    label: "westerns",
    genres: { Western: 1.4 },
  },
  {
    re: /\b(biography|biopic|biopics|biographical)\b/,
    label: "biopics",
    genres: { Biography: 1.3 },
  },
];

const COUNTRIES: { re: RegExp; codes: string[]; label: string }[] = [
  {
    re: /\b(korean|korea|k ?dramas?|k ?movies?|k ?films?|hallyu|seoul)\b/,
    codes: ["KR"],
    label: "Korean",
  },
  {
    re: /\b(chinese|china|c ?dramas?|mandarin|taiwanese|taiwan|hong kong|cantonese|wuxia|xianxia)\b/,
    codes: ["CN", "TW", "HK"],
    label: "Chinese",
  },
  {
    re: /\b(japanese|japan|j ?dramas?|anime)\b/,
    codes: ["JP"],
    label: "Japanese",
  },
  {
    re: /\b(indian|india|bollywood|hindi|tollywood|telugu|tamil|kollywood|malayalam|mollywood|kannada|desi|bengali)\b/,
    codes: ["IN"],
    label: "Indian",
  },
  { re: /\b(hollywood|american|usa)\b/, codes: ["US"], label: "Hollywood" },
  {
    re: /\b(british|england|english film|uk|irish|ireland)\b/,
    codes: ["UK", "IE"],
    label: "British",
  },
  { re: /\b(french|france)\b/, codes: ["FR"], label: "French" },
  { re: /\b(spanish|spain)\b/, codes: ["ES", "MX"], label: "Spanish" },
  { re: /\b(german|germany)\b/, codes: ["DE"], label: "German" },
  { re: /\b(italian|italy)\b/, codes: ["IT"], label: "Italian" },
];

const ALIASES: Record<string, string> = {
  srk: "Shah Rukh Khan",
  "king khan": "Shah Rukh Khan",
  "big b": "Amitabh Bachchan",
  bigb: "Amitabh Bachchan",
  rdj: "Robert Downey Jr.",
  leo: "Leonardo DiCaprio",
  "mr perfectionist": "Aamir Khan",
  bhaijaan: "Salman Khan",
  thalaiva: "Rajinikanth",
  ntr: "N.T. Rama Rao Jr.",
  "jr ntr": "N.T. Rama Rao Jr.",
  ghibli: "Hayao Miyazaki",
};

/** Single words that are also titles; only treat them as a title when typed alone. */
const COMMON_TITLE_WORDS = new Set(
  "it up her hero room queen soul joker heat dark signal reset moving stranger mouse burning wonder chef arrival animal friends frozen kingdom wednesday alien aliens logan rocky queen coco jaws free guy anand premam gravity stree hunt the hunt the platform the office the bear the boys sicario coherence".split(
    " ",
  ),
);

/** Words never treated as a person's first or last name on their own. */
const NAME_STOP = new Set(
  "the and with like movie movies film films show shows series something some about from that this what want need feel feeling mood watch night tonight best good great love life time stone black white young grant wood hill song rain lee kim park jung choi kang yoo jang shin seo lim ahn oh han yang zhang wang chen liu li xiao zhao bai luo hu wu sun will mark frank grace rose hope joy may bill art summer long green brown smith jones khan kapoor kumar singh shah rao reddy jack john james chris tom paul michael david daniel emma anne amy ryan brad jake matt adam ben sam dev ram sean kate julia moon star stars ali day knight hall moss eve rich king prince field fields price bell holly hunter howard mann bird cruise ford young cole nam bae ha cha gong go jo ko lim hwang yeo kwak ok lin tang tan xing zheng shen nie qin lei cao ding hong love little gold ice snow".split(
    " ",
  ),
);

const STOP = new Set(
  "a an the and or of to in on for with i im i m me my we us you your it its is am are was be been feel feeling feels mood want wanna need looking look something some anything any movie movies film films show shows series watch watching tonight today now like similar more please give recommend recommendation suggest really very kind sort just that this these those what which who about from by at as so get got lets let can could would should good great".split(
    " ",
  ),
);

/* ───────────────────────────── Index ───────────────────────────── */

interface Index {
  titles: { key: string; title: Title }[];
  people: Map<string, string>; // normalized full name -> canonical
  tokens: Map<string, Set<string>>; // name token -> canonical names
  credits: Map<string, number>;
  /** Known words -> weight; anything else is a candidate typo. */
  vocab: Map<string, number>;
  byLength: Map<number, string[]>;
}

/** Everyday words people type that should never be "corrected". */
const COMMON_WORDS =
  "about after again also always another away back because been before best better between big both bring call came come could cool day days did does done down each even ever every everything few find first friend fun girl give going gone good great guy guys hard have help here high home hour hours into just keep kind know last late least leave left less light little live long look lost lot lots made make many maybe mean might more most much must name need never next nice night none nothing once only open other over own part people place play pretty put quite rather read real right same say see seen side since soon start still story such sure take tell than thank thanks their them then there they thing things think though through today together too true try turn under until upon used wait watched week weekend well went were when where while whole why wish woman women work world year years yes yet vibe vibes episode watchlist someone wanna gonna kinda gimme pls hey hello hi lol tonite kdrama kdramas cdrama cdramas jdrama jdramas kmovie kmovies scifi romcom romcoms anime bollywood tollywood date wife husband boyfriend girlfriend partner mom dad mother father brother sister son daughter baby alone myself bed couch weekend evening morning sunday saturday friday holiday christmas summer winter rain cold hot short long hours minutes english hindi subtitles dubbed netflix prime disney hulu".split(
    " ",
  );

const indexCache = new WeakMap<Title[], Index>();

function buildIndex(list: Title[]): Index {
  const cached = indexCache.get(list);
  if (cached) return cached;
  const titles: Index["titles"] = [];
  const people = new Map<string, string>();
  const tokens = new Map<string, Set<string>>();
  const credits = new Map<string, number>();
  for (const t of list) {
    const key = normalize(t.title);
    titles.push({ key, title: t });
    if (key.startsWith("the ") && key.split(" ").length > 2)
      titles.push({ key: key.slice(4), title: t });
    const colon = t.title.split(":")[0];
    if (colon !== t.title) titles.push({ key: normalize(colon), title: t });
    for (const name of [t.director, ...t.cast].filter(Boolean)) {
      const n = normalize(name);
      people.set(n, name);
      credits.set(name, (credits.get(name) ?? 0) + 1);
      for (const tok of n.split(" ")) {
        if (tok.length < 4 || NAME_STOP.has(tok)) continue;
        if (!tokens.has(tok)) tokens.set(tok, new Set());
        tokens.get(tok)!.add(name);
      }
    }
  }
  const vocab = new Map<string, number>();
  const add = (w: string, weight: number) => {
    if (w.length < 2 || /\d/.test(w)) return;
    vocab.set(w, Math.max(vocab.get(w) ?? 0, weight));
  };
  for (const w of [...COMMON_WORDS, ...STOP]) add(w, 1);
  for (const w of Object.keys(NEGATABLE)) add(w, 3);
  for (const m of MOODS)
    for (const w of m.re.source.split(/[^a-z]+/)) if (w.length >= 3) add(w, 4);
  for (const c of COUNTRIES)
    for (const w of c.re.source.split(/[^a-z]+/)) if (w.length >= 3) add(w, 4);
  for (const a of Object.keys(ALIASES)) for (const w of a.split(" ")) add(w, 3);
  for (const { key, title } of titles)
    for (const w of key.split(" ")) add(w, 2 + Math.log10(title.votes + 1));
  for (const [n, name] of people)
    for (const w of n.split(" ")) add(w, 2 + (credits.get(name) ?? 1) / 4);
  const byLength = new Map<number, string[]>();
  for (const w of vocab.keys()) {
    if (!byLength.has(w.length)) byLength.set(w.length, []);
    byLength.get(w.length)!.push(w);
  }
  const index = { titles, people, tokens, credits, vocab, byLength };
  indexCache.set(list, index);
  return index;
}

/* ───────────────────────────── Spelling ───────────────────────────── */

/** Optimal-string-alignment distance (Levenshtein + transpositions), capped at max + 1. */
export function editDistance(a: string, b: string, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push([i]);
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        rows[0][j] = j;
        continue;
      }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, rows[i - 2][j - 2] + 1);
      rows[i][j] = v;
      if (v < best) best = v;
    }
    if (i > 0 && best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

function isSubsequence(a: string, b: string) {
  let i = 0;
  for (const ch of b) if (ch === a[i]) i++;
  return i === a.length;
}

function closestWord(word: string, index: Index): string | null {
  const max = word.length >= 8 ? 2 : 1;
  let best: string | null = null;
  let bestScore = Infinity;
  for (let len = word.length - max; len <= word.length + max; len++) {
    for (const w of index.byLength.get(len) ?? []) {
      const d = editDistance(word, w, max);
      if (d > max) continue;
      // Lower is better: distance first, then dropped/doubled letters, same first
      // letter, and more meaningful words.
      const score =
        d * 10 -
        (isSubsequence(word, w) || isSubsequence(w, word) ? 4 : 0) -
        (w[0] === word[0] ? 3 : 0) -
        Math.min(4, index.vocab.get(w) ?? 0);
      if (score < bestScore) {
        bestScore = score;
        best = w;
      }
    }
  }
  return best;
}

/** Fix likely typos word by word ("romantik", "intersteller", "dicapro"). */
export function correctWords(text: string, list: Title[] = defaultCatalog) {
  const index = buildIndex(list);
  const fixes: [string, string][] = [];
  const words = text.split(" ").map((w) => {
    if (w.length < 4 || /\d/.test(w) || index.vocab.has(w)) return w;
    const fix = closestWord(w, index);
    if (!fix) return w;
    fixes.push([w, fix]);
    return fix;
  });
  return { text: words.join(" "), fixes };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Rewrites the user's original wording with corrections applied, for "Did you mean…". */
function applyFixes(raw: string, fixes: [string, string][]) {
  let out = raw;
  for (const [from, to] of fixes) {
    const pattern = from.split(" ").map(escapeRe).join("[^a-z0-9]+");
    out = out.replace(
      new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`, "i"),
      (_m, pre) => pre + to,
    );
  }
  return out;
}

/* ───────────────────────────── Interpretation ───────────────────────────── */

const NEGATABLE: Record<string, { genres?: string[]; tags?: string[] }> = {
  scary: { genres: ["Horror"], tags: ["scary"] },
  horror: { genres: ["Horror"], tags: ["scary"] },
  scares: { genres: ["Horror"], tags: ["scary"] },
  romance: { genres: ["Romance"] },
  romantic: { genres: ["Romance"] },
  love: { genres: ["Romance"] },
  sad: { tags: ["tearjerker"] },
  crying: { tags: ["tearjerker"] },
  tearjerker: { tags: ["tearjerker"] },
  tearjerkers: { tags: ["tearjerker"] },
  violence: { tags: ["dark"] },
  violent: { tags: ["dark"] },
  gore: { tags: ["dark"], genres: ["Horror"] },
  dark: { tags: ["dark"] },
  animation: { genres: ["Animation"] },
  animated: { genres: ["Animation"] },
  anime: { genres: ["Animation"] },
  cartoons: { genres: ["Animation"] },
  action: { genres: ["Action"] },
  war: { genres: ["War"] },
  musicals: { genres: ["Music"] },
  musical: { genres: ["Music"] },
  slow: { tags: ["slowburn"] },
  fantasy: { genres: ["Fantasy"] },
  comedy: { genres: ["Comedy"] },
  thriller: { genres: ["Thriller"] },
  thrillers: { genres: ["Thriller"] },
};

export function interpret(
  query: string,
  list: Title[] = defaultCatalog,
): Intent {
  const index = buildIndex(list);
  const raw = query.trim().slice(0, 200);
  const fixes: [string, string][] = [];
  let text = normalize(raw);
  const intent: Intent = {
    query: raw,
    seeds: [],
    people: [],
    tags: {},
    genres: {},
    excludeGenres: [],
    excludeTags: [],
    countries: [],
    terms: [],
    summary: "",
    understood: false,
  };
  const labels: string[] = [];
  {
    // Spelling: fix unknown words before anything else reads the query.
    const c = correctWords(text, list);
    text = c.text;
    fixes.push(...c.fixes);
  }
  const strip = (phrase: string) => {
    text = ` ${text} `.replace(` ${phrase} `, " ").replace(/\s+/g, " ").trim();
  };

  // Negations ("no horror", "nothing too sad", "without romance").
  text = text.replace(
    /\b(no|not|without|nothing|non|avoid|except|hate|dont want|don t want|skip)\s+(too\s+|so\s+|very\s+|any\s+)?([a-z]+)/g,
    (m, _neg, _adv, word: string) => {
      const n = NEGATABLE[word];
      if (!n) return m;
      intent.excludeGenres.push(...(n.genres ?? []));
      intent.excludeTags.push(...(n.tags ?? []));
      return " ";
    },
  );

  // Rating hints: "8+", "rated 7.5 or above", "above 8", "best".
  const ratingMatch =
    text.match(
      /\b([5-9](?:\.[0-9])?)\s*(?:\+|plus|or (?:above|higher|more))/,
    ) ??
    text.match(
      /\b(?:above|over|at least|minimum|min|rated|rating|imdb)\s*([5-9](?:\.[0-9])?)\b/,
    );
  if (ratingMatch) {
    intent.minRating = Number(ratingMatch[1]);
    text = text.replace(ratingMatch[0], " ");
  } else if (
    /\b(best|top rated|highest rated|highly rated|masterpieces?|greatest|acclaimed|must watch|all time)\b/.test(
      text,
    )
  ) {
    intent.minRating = 8;
  }

  // Era hints: "90s", "2010s", "recent", "old classics".
  const decade = text.match(/\b(?:19|20)?([0-9])0s\b/);
  if (decade) {
    const d = Number(decade[1]);
    const full =
      decade[0].length === 5
        ? Number(decade[0].slice(0, 4))
        : d >= 3
          ? 1900 + d * 10
          : 2000 + d * 10;
    intent.era =
      full >= 2020
        ? "2020s"
        : full >= 2010
          ? "2010s"
          : full >= 2000
            ? "2000s"
            : full >= 1990
              ? "1990s"
              : "classic";
    text = text.replace(decade[0], " ");
  } else if (
    /\b(new|recent|latest|newest|this year|last year|modern|current)\b/.test(
      text,
    )
  ) {
    intent.era = "2020s";
  } else if (
    /\b(old|older|classic|classics|golden age|black and white|vintage)\b/.test(
      text,
    )
  ) {
    intent.era = "classic";
  }

  // Kind hints.
  const wantsSeries =
    /\b(series|tv|binge|bingeworthy|shows|tv show|sitcoms?|seasons?|episodes?|k ?dramas?|c ?dramas?|j ?dramas?)\b/.test(
      text,
    );
  const wantsMovie = /\b(movies?|films?|cinema|flicks?)\b/.test(text);
  if (wantsSeries && !wantsMovie) intent.kind = "series";
  if (wantsMovie && !wantsSeries) intent.kind = "movie";

  // Aliases.
  for (const [alias, name] of Object.entries(ALIASES)) {
    if (has(text, alias) && index.credits.has(name)) {
      intent.people.push(name);
      strip(alias);
    }
  }

  // Full person names (longest first).
  const names = [...index.people.keys()].sort((a, b) => b.length - a.length);
  for (const n of names) {
    if (n.length < 2) continue;
    if (has(text, n)) {
      const name = index.people.get(n)!;
      if (!intent.people.includes(name)) intent.people.push(name);
      strip(n);
    } else if (n.includes(" ") && n.replace(/ /g, "").length >= 8) {
      const compact = n.replace(/ /g, "");
      if (
        text.split(" ").includes(compact) ||
        has(text.replace(/(\w) (\w)/g, "$1$2"), compact)
      ) {
        const name = index.people.get(n)!;
        if (!intent.people.includes(name)) intent.people.push(name);
        text = text
          .replace(new RegExp(n.split(" ").join(" ?"), "i"), " ")
          .trim();
      }
    }
  }

  // Exact titles (longest key first so "Dune: Part Two" beats "Dune").
  const keys = [...index.titles].sort(
    (a, b) => b.key.length - a.key.length || b.title.votes - a.title.votes,
  );
  const bare = text
    .replace(
      /\b(movies?|films?|shows?|series|something|anything|stuff)\s+(like|similar to)\b/g,
      " ",
    )
    .replace(
      /\b(like|similar to|same as|loved|liked|enjoyed|fan of|i loved|i liked)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  for (const { key, title } of keys) {
    if (key.length < 2 || intent.seeds.includes(title)) continue;
    const single = !key.includes(" ");
    const common = COMMON_TITLE_WORDS.has(key) || (single && key.length <= 3);
    const hit = common ? bare === key : has(text, key);
    if (hit) {
      intent.seeds.push(title);
      strip(key);
      if (intent.seeds.length >= 3) break;
    }
  }

  // Fuzzy multi-word names and titles ("shah ruk khan", "crash landing on yu").
  if (!intent.people.length && !intent.seeds.length) {
    const words = text.split(" ").filter(Boolean).slice(0, 14);
    let best: {
      score: number;
      phrase: string;
      person?: string;
      title?: Title;
    } = {
      score: 0,
      phrase: "",
    };
    for (let size = Math.min(6, words.length); size >= 2; size--) {
      for (let i = 0; i + size <= words.length; i++) {
        const phrase = words.slice(i, i + size).join(" ");
        if (phrase.length < 7) continue;
        for (const [n, name] of index.people) {
          if (Math.abs(n.split(" ").length - size) > 1) continue;
          const sc = similarity(phrase, n);
          if (sc > best.score) best = { score: sc, phrase, person: name };
        }
        for (const { key, title } of index.titles) {
          if (key.length < 7 || Math.abs(key.split(" ").length - size) > 1)
            continue;
          const sc = similarity(phrase, key);
          if (sc > best.score) best = { score: sc, phrase, title };
        }
      }
    }
    if (best.score >= 0.8) {
      if (best.person) {
        intent.people.push(best.person);
        if (normalize(best.person) !== best.phrase)
          fixes.push([best.phrase, best.person]);
      } else if (best.title) {
        intent.seeds.push(best.title);
        if (normalize(best.title.title) !== best.phrase)
          fixes.push([best.phrase, best.title.title]);
      }
      strip(best.phrase);
    }
  }

  // Surname / first-name only ("nolan", "dicaprio", "miyazaki").
  if (!intent.people.length) {
    for (const tok of text.split(" ")) {
      const set = index.tokens.get(tok);
      if (!set || set.size !== 1) continue;
      const name = [...set][0];
      if (!intent.people.includes(name)) intent.people.push(name);
      strip(tok);
    }
  }

  // Moods, genres, countries.
  for (const mood of MOODS) {
    if (!mood.re.test(text)) continue;
    labels.push(mood.label);
    for (const [k, v] of Object.entries(mood.tags ?? {}))
      intent.tags[k] = Math.max(intent.tags[k] ?? 0, v);
    for (const [k, v] of Object.entries(mood.genres ?? {}))
      intent.genres[k] = Math.max(intent.genres[k] ?? 0, v);
  }
  if (
    !labels.includes("romance") &&
    !intent.seeds.length &&
    !intent.people.length &&
    /\blove\b/.test(text)
  ) {
    labels.push("romance");
    intent.tags.romantic = 1.3;
    intent.genres.Romance = 1;
  }
  const anime = /\banime\b/.test(text);
  if (anime) {
    intent.genres.Animation = Math.max(intent.genres.Animation ?? 0, 1.4);
    labels.push("anime");
  }
  const countryLabels: string[] = [];
  for (const c of COUNTRIES) {
    if (c.re.test(text)) {
      intent.countries.push(...c.codes);
      if (!(anime && c.label === "Japanese")) countryLabels.push(c.label);
    }
  }

  // Loose title match when nothing else was understood ("shawshank", "intersteller").
  const understoodSoFar =
    intent.seeds.length ||
    intent.people.length ||
    labels.length ||
    intent.countries.length;
  if (!understoodSoFar && bare.length >= 4) {
    const words = bare
      .split(" ")
      .filter((w) => !STOP.has(w) && !COMMON_TITLE_WORDS.has(w));
    if (words.length) {
      const partial = index.titles
        .filter(({ key }) => words.every((w) => key.split(" ").includes(w)))
        .sort((a, b) => b.title.votes - a.title.votes);
      if (partial.length && words.join("").length >= 4) {
        intent.seeds.push(partial[0].title);
      } else {
        const phrase = words.join(" ");
        let best: { score: number; title?: Title } = { score: 0 };
        for (const { key, title } of index.titles) {
          const s = similarity(phrase, key);
          if (s > best.score) best = { score: s, title };
        }
        if (best.title && best.score >= 0.72) {
          intent.seeds.push(best.title);
          fixes.push([phrase, best.title.title]);
        } else {
          // Fuzzy person names.
          let bp = { score: 0, name: "" };
          for (const [n, name] of index.people) {
            const s = similarity(phrase, n);
            if (s > bp.score) bp = { score: s, name };
          }
          if (bp.score >= 0.78) {
            intent.people.push(bp.name);
            fixes.push([phrase, bp.name]);
          }
        }
      }
      if (!intent.seeds.length && !intent.people.length)
        intent.terms = words.filter((w) => w.length >= 3);
    }
  }

  // Summary.
  const parts: string[] = [];
  if (labels.length) parts.push(labels.slice(0, 3).join(", "));
  if (intent.seeds.length)
    parts.push(`like ${intent.seeds.map((s) => s.title).join(" & ")}`);
  if (intent.people.length) parts.push(`with ${intent.people.join(" & ")}`);
  if (countryLabels.length)
    parts.push(
      countryLabels
        .join(" & ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase()) +
        (intent.kind === "series"
          ? " shows"
          : intent.kind === "movie"
            ? " films"
            : " picks"),
    );
  else if (intent.kind && parts.length)
    parts.push(intent.kind === "series" ? "series only" : "movies only");
  intent.understood = Boolean(
    intent.seeds.length ||
    intent.people.length ||
    labels.length ||
    intent.countries.length ||
    intent.excludeGenres.length ||
    intent.excludeTags.length ||
    intent.kind,
  );
  intent.summary = parts.join(" · ");
  if (fixes.length) {
    let corrected = applyFixes(raw, fixes);
    for (const name of [
      ...intent.people,
      ...intent.seeds.map((t) => t.title),
    ]) {
      const pattern = normalize(name)
        .split(" ")
        .map(escapeRe)
        .join("[^a-z0-9]+");
      corrected = corrected.replace(new RegExp(pattern, "i"), name);
    }
    if (normalize(corrected) !== normalize(raw)) intent.corrected = corrected;
  }
  if (!intent.summary && intent.kind)
    intent.summary = intent.kind === "series" ? "great series" : "great movies";
  return intent;
}

/* ───────────────────────────── Ranking ───────────────────────────── */

const jaccard = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const s = new Set(a);
  const inter = b.filter((x) => s.has(x)).length;
  return inter / (a.length + b.length - inter);
};

export function likeness(a: Title, b: Title) {
  let s = jaccard(a.genres, b.genres) * 0.34 + jaccard(a.tags, b.tags) * 0.38;
  if (a.country === b.country) s += 0.1;
  if (a.kind === b.kind) s += 0.04;
  if (a.director && a.director === b.director) s += 0.12;
  const shared = a.cast.filter((c) => b.cast.includes(c)).length;
  s += Math.min(0.16, shared * 0.08);
  s += Math.max(0, 1 - Math.abs(a.year - b.year) / 40) * 0.04;
  return Math.min(1, s);
}

const quality = (t: Title) =>
  Math.min(1, Math.max(0, (t.rating - 6) / 3.3)) * 0.75 +
  Math.min(1, Math.log10(t.votes + 1) / Math.log10(2500)) * 0.25;

function sumWeights(w: Record<string, number>) {
  return Object.values(w).reduce((a, b) => a + b, 0);
}

export function eraOf(id: string) {
  return ERAS.find((e) => e.id === id) ?? ERAS[0];
}

export function recommend(
  intent: Intent,
  filters: Filters,
  list: Title[] = defaultCatalog,
): Pick[] {
  const era = eraOf(filters.era);
  const seedIds = new Set(intent.seeds.map((s) => s.id));
  const tagTotal = sumWeights(intent.tags);
  const genreTotal = sumWeights(intent.genres);
  const personTitles = list.filter((t) =>
    intent.people.some((p) => t.director === p || t.cast.includes(p)),
  );
  const anchors = intent.seeds.length ? intent.seeds : personTitles;
  const terms = intent.terms;

  const picks: Pick[] = [];
  for (const t of list) {
    if (seedIds.has(t.id)) continue;
    if (t.rating < filters.minRating) continue;
    if (t.year < era.from || t.year > era.to) continue;
    if (filters.kind !== "any" && t.kind !== filters.kind) continue;
    if (intent.countries.length && !intent.countries.includes(t.country))
      continue;
    if (intent.excludeGenres.some((g) => t.genres.includes(g))) continue;
    if (intent.excludeTags.some((g) => t.tags.includes(g))) continue;

    let rel = 0;
    let reason = "";
    let reasonWeight = 0;
    const note = (w: number, r: string) => {
      if (w > reasonWeight) {
        reasonWeight = w;
        reason = r;
      }
    };

    const person = intent.people.find(
      (p) => t.director === p || t.cast.includes(p),
    );
    if (person) {
      rel += 2.4;
      note(
        10,
        t.director === person ? `Directed by ${person}` : `Stars ${person}`,
      );
    }

    if (anchors.length) {
      let best = 0;
      let bestSeed = anchors[0];
      for (const s of anchors) {
        const l = likeness(s, t);
        if (l > best) {
          best = l;
          bestSeed = s;
        }
      }
      const weight = intent.seeds.length ? 2.4 : 1.2;
      rel += best * weight;
      const shared = bestSeed.tags
        .filter((x) => t.tags.includes(x))
        .map((x) => TAG_LABELS[x]?.toLowerCase());
      const sameDirector =
        bestSeed.director && bestSeed.director === t.director;
      note(
        best * 6,
        sameDirector
          ? `From ${t.director}, who made ${bestSeed.title}`
          : `If you liked ${bestSeed.title}${shared.length ? ` — also ${shared.slice(0, 2).join(" & ")}` : ""}`,
      );
    }

    if (tagTotal) {
      const hit = t.tags.filter((x) => intent.tags[x]);
      const s =
        hit.reduce((a, x) => a + intent.tags[x], 0) /
        Math.max(1.2, tagTotal * 0.65);
      rel += Math.min(1, s) * 1.5;
      if (hit.length) {
        const top = hit
          .sort((a, b) => intent.tags[b] - intent.tags[a])
          .slice(0, 2);
        const label = top
          .map((x, i) => (i ? TAG_LABELS[x].toLowerCase() : TAG_LABELS[x]))
          .join(" & ");
        const genre =
          t.genres.find(
            (g) => !label.toLowerCase().includes(g.toLowerCase()),
          ) ?? "";
        note(Math.min(1, s) * 5, `${label} ${genre.toLowerCase()}`.trim());
      }
    }
    if (genreTotal) {
      const hit = t.genres.filter((g) => intent.genres[g]);
      const s =
        hit.reduce((a, g) => a + intent.genres[g], 0) /
        Math.max(1, genreTotal * 0.7);
      rel += Math.min(1, s) * 1.0;
      if (hit.length) note(Math.min(1, s) * 3, hit.slice(0, 2).join(" · "));
    }
    if (intent.countries.length) rel += 0.2;

    if (terms.length) {
      const hay = normalize(
        `${t.title} ${t.blurb} ${t.genres.join(" ")} ${t.cast.join(" ")} ${t.director}`,
      );
      const hits = terms.filter(
        (w) => has(hay, w) || hay.includes(` ${w}`),
      ).length;
      if (!hits) continue;
      rel += (hits / terms.length) * 2;
      note(4, `Matches “${terms.join(" ")}”`);
    }

    const needsRelevance =
      intent.seeds.length || intent.people.length || tagTotal || genreTotal;
    if (needsRelevance && rel < 0.35) continue;

    const q = quality(t);
    const score = rel + q * (needsRelevance ? 0.9 : 1);
    if (!reason)
      reason =
        t.rating >= 8.5
          ? "A crowd favourite"
          : t.rating >= 8
            ? "Highly rated"
            : "Worth a watch";
    picks.push({ title: t, score, reason });
  }

  picks.sort(
    (a, b) =>
      b.score - a.score ||
      b.title.rating - a.title.rating ||
      a.title.id.localeCompare(b.title.id),
  );
  return picks;
}

/* ───────────────────────────── Autocomplete ───────────────────────────── */

export interface Suggestion {
  type: "title" | "person" | "mood";
  label: string;
  detail: string;
  value: string;
  /** True when this is a typo-tolerant guess rather than a literal match. */
  fuzzy?: boolean;
  id?: string;
}

export const MOOD_SUGGESTIONS = [
  {
    emoji: "🥲",
    label: "I'm feeling low",
    value: "I'm feeling sad, cheer me up",
  },
  { emoji: "😂", label: "Make me laugh", value: "something funny" },
  { emoji: "💘", label: "In a romantic mood", value: "romantic" },
  { emoji: "😱", label: "Scare me", value: "scary horror" },
  { emoji: "🤯", label: "Blow my mind", value: "mind-bending twists" },
  { emoji: "☕", label: "Cozy & calm", value: "cozy and relaxing" },
  { emoji: "😭", label: "Need a good cry", value: "a tearjerker to cry" },
  { emoji: "🔥", label: "Adrenaline", value: "action packed adrenaline" },
  { emoji: "🌸", label: "K-drama night", value: "romantic k-drama" },
  { emoji: "🎬", label: "Bollywood", value: "feel-good bollywood" },
  { emoji: "✨", label: "Anime magic", value: "anime" },
  { emoji: "🌟", label: "Inspire me", value: "inspiring true story" },
];

export function suggest(
  query: string,
  list: Title[] = defaultCatalog,
  limit = 7,
): Suggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const index = buildIndex(list);
  const out = new Map<string, Suggestion & { rank: number }>();
  const push = (key: string, s: Suggestion & { rank: number }) => {
    const prev = out.get(key);
    if (!prev || prev.rank < s.rank) out.set(key, s);
  };
  const titleItem = (t: Title, rank: number, fuzzy = false) =>
    push(`t:${t.id}`, {
      type: "title",
      label: t.title,
      detail: `${t.kind === "movie" ? "Movie" : "Series"} · ${t.year} · ★ ${t.rating.toFixed(1)}`,
      value: t.title,
      id: t.id,
      fuzzy,
      rank: rank + Math.log10(t.votes + 1) / 4,
    });
  const personItem = (name: string, rank: number, fuzzy = false) => {
    const credits = index.credits.get(name) ?? 1;
    push(`p:${name}`, {
      type: "person",
      label: name,
      detail: `${credits} ${credits === 1 ? "title" : "titles"}`,
      value: name,
      fuzzy,
      rank: rank + Math.min(credits, 10) / 10,
    });
  };

  const literal = (text: string, fuzzy: boolean) => {
    for (const { key, title } of index.titles) {
      const pos = key.indexOf(text);
      if (pos === -1 || (pos > 0 && key[pos - 1] !== " ")) continue;
      titleItem(title, (pos === 0 ? 3 : 2) - (fuzzy ? 0.6 : 0), fuzzy);
    }
    for (const [n, name] of index.people) {
      const pos = n.indexOf(text);
      if (pos === -1 || (pos > 0 && n[pos - 1] !== " ")) continue;
      personItem(name, (pos === 0 ? 2.9 : 1.9) - (fuzzy ? 0.6 : 0), fuzzy);
    }
  };
  literal(q, false);

  // Typo tolerance: correct finished words, then compare against prefixes of names.
  if (q.length >= 3) {
    const words = q.split(" ");
    const last = words.pop()!;
    const fixed = correctWords(words.join(" "), list).text;
    const corrected = [fixed, last].filter(Boolean).join(" ");
    if (corrected !== q) literal(corrected, true);
    if (out.size < limit) {
      const qc = q.replace(/ /g, "");
      const score = (key: string) => {
        const head = key.replace(/ /g, "").slice(0, qc.length + 1);
        return Math.max(similarity(q, key), similarity(qc, head) - 0.05);
      };
      for (const { key, title } of index.titles) {
        const sc = score(key);
        if (sc >= 0.62) titleItem(title, sc * 2.2, true);
      }
      for (const [n, name] of index.people) {
        const sc = score(n);
        if (sc >= 0.62) personItem(name, sc * 2.1, true);
      }
    }
  }

  for (const m of MOOD_SUGGESTIONS) {
    const n = normalize(m.label + " " + m.value);
    if (n.includes(q))
      push(`m:${m.label}`, {
        type: "mood",
        label: `${m.emoji} ${m.label}`,
        detail: "Mood",
        value: m.value,
        rank: 1.5,
      });
  }
  return [...out.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ rank: _rank, ...s }) => s);
}

export function defaultFilters(intent: Intent): Filters {
  return {
    minRating: intent.minRating ?? 0,
    era: intent.era ?? "any",
    kind: (intent.kind as Kind | undefined) ?? "any",
  };
}

/** "More like this" for a single title. */
export function similarTo(
  t: Title,
  n = 12,
  list: Title[] = defaultCatalog,
): Title[] {
  return list
    .filter((x) => x.id !== t.id)
    .map((x) => ({ x, s: likeness(t, x) + quality(x) * 0.35 }))
    .sort((a, b) => b.s - a.s || a.x.id.localeCompare(b.x.id))
    .slice(0, n)
    .map((r) => r.x);
}

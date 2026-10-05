# DramaMatch

**What should I watch tonight?** Type how you feel, a star you love, or a movie you can't stop thinking about. DramaMatch asks two quick questions (minimum IMDb rating and release era), then suggests movies and series that fit.

- One big, Google-style search box with instant autocomplete (titles and people) and voice input in Chrome.
- Understands moods ("I'm feeling low", "need a good cry", "blow my mind"), stars ("Shah Rukh Khan", "srk", "nolan"), titles ("movies like Inception", typo-tolerant: "intersteller"), countries ("cozy k-drama", "bollywood"), eras ("90s", "recent"), ratings ("8+", "best"), types ("series", "movies") and exclusions ("no romance", "nothing scary").
- 450+ hand-picked titles across Hollywood, Bollywood and South Indian cinema, K-dramas, C-dramas, anime and world cinema.
- Every pick explains why it was chosen, with Trailer and IMDb links.
- Runs entirely in the browser after the first load: no API keys, no database, no sign-up, no tracking. Light and dark themes, works on mobile.

## Run locally

Requires Node.js 20.9+.

```sh
npm install
npm run dev          # http://localhost:3000
```

Production build:

```sh
npm run build
npm start            # http://localhost:3000
```

Checks:

```sh
npm run typecheck
npm test
```

## Deploy

It's a standard Next.js app with a single statically rendered page, so it deploys as-is to Vercel, Netlify or any Node host. Set `NEXT_PUBLIC_SITE_URL` to your public URL so social previews use the right host.

## How it works

| File | What it does |
| --- | --- |
| `lib/catalog.ts` | The curated catalog, one compact row per title |
| `lib/engine.ts` | Reads a query (moods, people, titles, hints), ranks titles and builds the "why" line |
| `components/matcher.tsx` | The search box, chat flow and results UI |
| `app/` | Layout, page and global styles |
| `tests/engine.test.ts` | Behaviour tests for the engine and catalog |

Ranking combines how well a title matches what you asked for (shared cast or director, likeness to a title you named, mood tags and genres) with its IMDb rating and popularity. Rating, era and type are hard filters. If nothing matches, the app says so instead of padding the list.

### Adding titles

Add a row to `lib/catalog.ts`:

```ts
["Title", 2024, 8.1, 120, "m", "Drama|Romance", "KR", "Director", "Lead One|Lead Two", "romantic|cozy", "One-line pitch."],
```

The fields are: year, IMDb rating, IMDb votes in thousands, `m`(ovie) or `s`(eries), genres, country code, director or creator, cast, mood tags and a short blurb. Mood tags come from `TAG_LABELS` in `lib/engine.ts`. Run `npm test` afterwards.

## Data notes

Ratings and vote counts are an IMDb snapshot and won't update live. Blurbs are original one-liners written for this app. DramaMatch isn't affiliated with IMDb; the IMDb button just opens an IMDb search for the title.

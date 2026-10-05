# DramaMatch

> **Latest version: 2.0.0 (October 2026), on GitHub branch `claude/ecstatic-thompson-89f4l0`.**
> This GitHub version is newer than older local copies and than the `main` branch, which still has the old drama site.
> The app's footer shows its version, so you can compare: if yours doesn't say **v2.0.0**, update your local copy:
>
> ```sh
> git fetch origin
> git checkout claude/ecstatic-thompson-89f4l0
> git pull
> npm install
> ```
>
> Your `.env.local` (API keys) is never uploaded to GitHub, so add your key again on each new computer (**Connect API** in the app, or see below).

**What should I watch tonight?** Type how you feel, a star, or any movie or show. DramaMatch fixes typos, asks two quick questions (minimum rating and era) and lines up movies and series that fit.

- **Every movie and series, live.** With a free TMDB key, search, Top 10, trending and genre rows, posters, cast, trailers and "More like this" all come from TMDB in real time.
- **Works with no setup.** Without a key, the app runs on a built-in catalog of 450+ hand-picked titles with IMDb ratings. It also falls back to that catalog automatically if TMDB is unreachable.
- **Understands people.** Moods ("I'm feeling low", "blow my mind"), stars ("srk", "nolan"), titles ("something like Naruto"), countries ("cozy k-drama", "bollywood"), eras ("90s"), ratings ("8+"), types ("series") and exclusions ("no romance").
- **Forgives typos.** "sharukh khan", "intersteller", "romantik kdrama" and "horor" all work. The chat says "Did you mean…", and autocomplete corrects as you type.
- A cinematic dark UI: a drifting poster wall, Top 10 and mood rows, poster cards, a detail view with trailer, cast and similar titles, My List (saved on the device), share links, Surprise me, and voice search in Chrome.

## Clean start on your computer (recommended once)

If you have an old copy, start fresh so no old files get in the way:

1. **Keep your key (optional):** if your old folder has a `.env.local`, copy it somewhere safe.
2. **Delete the old `DramaMatch` folder.**
3. **Get the latest version:**
   ```sh
   git clone https://github.com/Dibyajyotikabi/DramaMatch.git
   cd DramaMatch
   git checkout claude/ecstatic-thompson-89f4l0
   npm install
   npm run dev -- --port 3100
   ```
4. Open http://localhost:3100, check that the footer says **v2.0.0**, click **Connect API**, paste your TMDB key and press **Test & save**. (Or put your saved `.env.local` back into the folder before step 3's `npm run dev`.)

Already have the latest code but something seems stuck? `npm run fresh` deletes the build cache and `node_modules` and reinstalls. Your `.env.local` is kept.

## Run locally

Requires Node.js 20.9+.

```sh
npm install
cp .env.example .env.local   # then paste your TMDB key (see below)
npm run dev                  # http://localhost:3000
```

If port 3000 is busy: `npm run dev -- --port 3100`.

### Turn on live data (2 minutes, free)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API**, request an API key (choose "Developer"), and copy the **API Key**.
3. With `npm run dev` running, click **Connect API** in the top bar, paste the key and press **Test & save**. The app checks the key, saves it to `.env.local` and switches to live data straight away.

   Prefer files? Put `TMDB_API_KEY=your_key_here` in `.env.local` and restart. `npm run check:tmdb` verifies it.

The Connect API box only appears while you run the app on your own computer (development mode, localhost). Visitors to a deployed site never see it; set keys in your host's environment variables instead. To allow it on your own production server, set `ALLOW_SETUP=1` (it still accepts only requests from that machine).

Optional: add `OMDB_API_KEY` (free at [omdbapi.com](https://www.omdbapi.com/apikey.aspx)) to show the real IMDb rating on title pages. Live lists and filters use TMDB's audience rating, which is labelled "TMDB".

Never commit `.env.local`, and never use a key you didn't create. Keys found in other people's repositories get revoked.

## Deploy (Vercel)

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Under **Environment Variables** add `TMDB_API_KEY` (and `OMDB_API_KEY` if you have one) and `NEXT_PUBLIC_SITE_URL` (your final URL).
3. Deploy. Home rows refresh every 6 hours; searches are cached at the edge.

Any Node host that runs Next.js works too: `npm run build && npm start`.

TMDB's terms require the attribution shown in the footer whenever live data is on. TMDB's API is free for non-commercial use; if you make money from the app, check [TMDB's API terms](https://www.themoviedb.org/api-terms-of-use) for commercial licensing.

## Checks

```sh
npm run typecheck
npm test            # engine, typo correction, and the full live path against a mock TMDB
npm run build
```

`npm run mock:tmdb` starts a local stand-in for TMDB (port 4010). It lets you try live mode without a key:

```sh
TMDB_API_KEY=test TMDB_API_BASE=http://localhost:4010/3 TMDB_IMAGE_BASE=http://localhost:4010/img npm run dev
```

## How it works

| File | What it does |
| --- | --- |
| `lib/engine.ts` | Reads a query (moods, people, titles, places, eras, ratings, exclusions), fixes typos, and ranks catalog titles |
| `lib/tmdb.ts` | TMDB client: requests, caching, genre mapping, conversion into the app's title format |
| `lib/live.ts` | Turns a reading of the query into TMDB calls (discover, search, credits, recommendations) and ranks the results |
| `lib/service.ts` | Single entry point: live when a key is set, catalog otherwise or on failure |
| `lib/catalog.ts` | The built-in catalog, one row per title |
| `app/api/*` | `search`, `suggest`, `title` (details) and `posters` endpoints |
| `components/` | Search box, chat flow, rows, cards, detail view |

API keys stay on the server; the browser only talks to the app's own `/api` routes.

## Data notes

Catalog ratings are an IMDb snapshot and don't update. Live ratings come from TMDB and update continuously. Poster art and trailers belong to their owners. DramaMatch isn't affiliated with IMDb or TMDB.

# DramaMatch

A responsive K-drama and C-drama discovery app. Search a title, performer, genre, trope, or a short request; answer three visual questions; get explainable recommendations without an LLM or an account.

## Run locally

Requires Node.js 20.9+ (Node 22 recommended).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. If that port is occupied, use `npm run dev -- --port 3100`.

```sh
npm run typecheck
npm test
npm run build
npm start -- --port 3100
# In another terminal, with the production server running:
npm run test:http
```

If a restricted local environment blocks Turbopack worker sockets, use `npm run build -- --webpack`; both bundlers are supported.

The seed provider works immediately without credentials. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before a deployment/build so canonicals, sitemap URLs, and structured data use the correct host. Deploy to any Next.js-compatible Node host; the application is not a static export because search and personalized results run on the server.

## Product

- Warm editorial homepage, system-aware light/dark theme, local watchlist.
- 150 ms debounced universal search; aborts stale requests, caches the last 50 queries, supports arrows, Enter, and Escape.
- Grouped drama/movie/actor/actress/genre/trope suggestions and a free-text fallback.
- Three steps only: wants, mood, exclusions. Back and refinement preserve selections.
- Server-calculated match scores, nine results when eligible, expandable explanations with all six weighted contributions.
- More like this, Not for me with Undo, Refine, and Save.
- Drama detail pages with cast links, trope links, DNA, content notes, and an ending disclosure control.
- Similar-drama pages with original intros, specific shared-story reasons, comparisons, related collections, and a quiz CTA.
- All requested country, actor/actress, trope, mood, and genre routes.
- 16 curated seed titles, including all eight requested dramas and two films.

## Architecture

| Module | Responsibility |
| --- | --- |
| `lib/types.ts` | Vendor-neutral Drama, DNA, preferences, and match contracts |
| `lib/data/` | Curated catalog and import validation |
| `lib/providers/` | Server-only metadata boundary; seed provider and optional TMDB import helper |
| `lib/search/` | Search index logic, rule-based request parsing, URL validation |
| `lib/recommendation/engine.ts` | Pure deterministic ranking, independent of React and providers |
| `lib/seo/` | Metadata, curated collections, indexability |
| `components/` | Small interactive islands and reusable editorial UI |
| `app/` | App Router server pages, handlers, sitemap, robots, OG image |
| `database/migrations/` | PostgreSQL/Supabase schema, indexes, and RLS policies |
| `scripts/seed.ts` | Validated, transaction-wrapped SQL seed export |
| `tests/` | Behavior tests for ranking, exclusions, search, parsing, and catalog integrity |

The provider implements `DramaProvider.list`, `bySlug`, and `search`. Replace the provider in `lib/providers/index.ts` to use PostgreSQL or another source. The scorer accepts plain domain objects and never imports vendor SDKs. The optional TMDB helper only fetches raw metadata server-side; it is an import boundary, not a complete live catalog adapter. TMDB does not provide DramaDNA, so records must be enriched and reviewed before publishing. No secrets are passed to browser components.

## Matching rules

The percentage is the rounded weighted sum of normalized 0–1 signals. It is a **preference fit score**, not a predicted enjoyment probability.

| Signal | Weight |
| --- | ---: |
| Seed story / performer / query similarity | 30% |
| Wanted attributes | 30% |
| Mood | 15% |
| Genre | 10% |
| Ending compatibility | 10% |
| Editorial quality / sample popularity | 5% |

Title similarity combines seven DNA axes (55%), genres (25%), tropes (15%), and pacing (5%). Wanted numeric traits match proportionally; tags match exactly. Performer matches prefer actual catalog credits. With no seed, neutral prior values are used and the quiz drives ranking. Ordering is stable, with rating then slug breaking ties. The seed title itself is excluded. Matches below 50% are omitted so unrelated stories do not fill a quota.

Hard exclusions run **before** ranking and are never silently relaxed:

- Sad ending: only confirmed happy endings remain; unknown/open/bittersweet are also removed.
- Love triangle: only `none`; even `mild` is removed.
- Toxic leads: toxicity must be at most 3/10.
- Slow pacing: slow titles removed.
- Breakups: removes editorial `Separation` themes or `Second chance` tropes. This is a conservative tag-based approximation, not exhaustive scene annotation.
- Fantasy: fantasy genre removed.

Country restrictions are hard filters. A narrow combination can return fewer than five titles or a helpful empty state. No unrelated titles are added to fill a quota. The parser supports the example requests and common English patterns; it is deliberately rule based and is not a general language understanding system. Arbitrary unmatched requests fall back to quiz preferences.

## Database and adding titles

The default MVP does not require or connect to a database. The migration is PostgreSQL/Supabase-ready, with normalized cast and DNA tables, external IDs, search indexes, publication gating, and read-only public RLS. Apply migrations once, in filename order, as a database owner/migration role.

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_initial.sql
npm run --silent seed:sql > /tmp/dramamatch-seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/dramamatch-seed.sql
```

The seed export does not connect to a database or print credentials. Existing records are preserved by `ON CONFLICT DO NOTHING`; future editorial updates should use a deliberate migration/upsert. Supabase roles and table grants are environment-specific; public writes are not permitted by the supplied policies. Keep service keys in server-only environment variables.

To add titles:

1. Add a normalized record in `lib/data/catalog.ts`, with complete DNA and reviewed spoiler-safe notes.
2. Add an authorized local poster under `public/posters/`, or configure an allowed image origin.
3. Run tests and build. Route generation, search, person pages, collections, and SQL export pick it up automatically.
4. Rebuild/redeploy after seed edits. For a database-backed catalog, add a provider-level cache and invalidation on editorial publish.

## Performance and accessibility

Server components and static generation are used for editorial routes. Search and recommendation handlers return CDN cache headers; the browser also caches repeat searches. Next Image provides responsive WebP/AVIF optimization, intrinsic layout reservation, and lazy loading; the leading detail/result poster is prioritized. Local system typography avoids font requests and layout shifts. There are no component frameworks, vendor UI SDKs, animation packages, autoplay media, tracking scripts, authentication, or LLM dependencies.

Semantic controls, visible focus states, a skip link, labeled combobox, keyboard search, pressed-state choices, live status messages, native disclosure widgets, reduced-motion support, and responsive table scrolling are included. Saves persist on this browser only; storage failures are handled.

## SEO

Titles and similar-drama pages are pre-rendered with descriptive metadata, canonical URLs, Open Graph, and valid TVSeries/Movie or ItemList structured data. Editorial ratings are not misrepresented as audience aggregate ratings. Detail pages link to performers, genres, tropes, and similar stories.

Only collection pages with at least three actual titles are included in the sitemap and eligible for indexing; sparse performer/filter pages remain accessible but carry `noindex, follow`. Personalized results, quiz, and local saved pages are also noindex. Search/query combinations are not generated into indexable pages. The robots file permits crawling those pages so crawlers can see their noindex directives, while API routes are disallowed.

## Data and image provenance

DNA, popularity, and rating values are **editorial prototype assessments**, not live or licensed audience statistics. Original synopsis copy was written for this app. Credits/year/episode counts use public series information. Production catalog publication should include editorial review, especially for content sensitivities and ending classifications.

Ten low-resolution promotional posters were sourced from the corresponding English Wikipedia pages and Wikimedia-hosted files. See `public/posters/SOURCES.md` for exact sources. Those posters remain copyrighted by their respective owners; this development project does not grant redistribution rights. Obtain appropriate poster rights or replace them before public commercial deployment. Six additional entries use original SVG illustrated editions, explicitly labeled on the artwork.

The schema is supplied but was not applied to a live database in this workspace. Hosting, custom domain, and production credentials are not configured automatically.

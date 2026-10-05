# Changelog

## 2.0.0 (October 2026)

A full rebuild. Compared with the original drama site:

- One Google-style search box that becomes a short chat: mood, star or title, then rating and era.
- Cinematic dark design: drifting poster wall, Top 10 and mood rows, poster cards, a detail view with trailer, cast and similar titles.
- Typo-tolerant search ("sharukh khan", "intersteller", "horor") with "Did you mean…" and fuzzy autocomplete.
- Live data from TMDB (every movie, series and star, with real posters and trailers) when an API key is set; a 450+ title built-in catalog otherwise, and as an automatic fallback.
- Connect API box to paste and test keys while running locally; `npm run check:tmdb` to verify a key.
- My List (saved on the device), share links, Surprise me, voice search in Chrome.
- SEO basics, social preview image, app manifest, 404 and error pages.
- Tests for the engine, typo correction, key setup and the full live path (against a mock TMDB).

## 1.0.0

The original multi-page K-drama and C-drama discovery site.

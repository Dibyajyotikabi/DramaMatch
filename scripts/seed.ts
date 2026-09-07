import { dramas } from "../lib/data/catalog";
import { validateCatalog } from "../lib/data/validate";
validateCatalog(dramas);
const sql = (value: unknown): string =>
  value === null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : Array.isArray(value)
        ? `ARRAY[${value.map(sql).join(",")}]::text[]`
        : `'${String(value).replaceAll("'", "''")}'`;
const insert = (
  table: string,
  columns: string[],
  values: unknown[],
  conflict: string,
) =>
  `INSERT INTO ${table} (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT (${conflict}) DO NOTHING;`;
const rows = ["BEGIN;"];
for (const d of dramas) {
  rows.push(
    insert(
      "dramas",
      [
        "id",
        "slug",
        "title",
        "original_title",
        "country",
        "type",
        "year",
        "synopsis",
        "poster",
        "color",
        "genres",
        "episode_count",
        "rating",
        "popularity",
        "published",
      ],
      [
        d.id,
        d.slug,
        d.title,
        d.originalTitle,
        d.country,
        d.type,
        d.year,
        d.synopsis,
        d.poster,
        d.color,
        d.genres,
        d.episodeCount,
        d.rating,
        d.popularity,
        "true",
      ],
      "id",
    ),
  );
  for (const a of d.actors) {
    rows.push(
      insert(
        "people",
        ["slug", "name", "kind"],
        [a.slug, a.name, a.kind],
        "slug",
      ),
    );
    rows.push(
      insert(
        "drama_cast",
        ["drama_id", "person_slug"],
        [d.id, a.slug],
        "drama_id,person_slug",
      ),
    );
  }
  const n = d.dna;
  rows.push(
    insert(
      "drama_dna",
      [
        "drama_id",
        "romance",
        "chemistry",
        "comedy",
        "angst",
        "action",
        "mystery",
        "toxicity",
        "pace",
        "ending",
        "love_triangle",
        "lead_type",
        "setting",
        "tropes",
        "moods",
        "themes",
        "spoiler_safe_notes",
      ],
      [
        d.id,
        n.romance,
        n.chemistry,
        n.comedy,
        n.angst,
        n.action,
        n.mystery,
        n.toxicity,
        n.pace,
        n.ending,
        n.loveTriangle,
        n.leadType,
        n.setting,
        n.tropes,
        n.moods,
        n.themes,
        n.spoilerSafeNotes,
      ],
      "drama_id",
    ),
  );
}
rows.push("COMMIT;");
process.stdout.write(rows.join("\n") + "\n");

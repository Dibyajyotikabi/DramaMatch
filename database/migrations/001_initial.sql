BEGIN;
CREATE TABLE IF NOT EXISTS dramas (
 id text PRIMARY KEY,
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text NOT NULL,
 original_title text NOT NULL,
 country text NOT NULL CHECK (country IN ('KR','CN')),
 type text NOT NULL CHECK (type IN ('tv','movie')),
 year integer NOT NULL CHECK (year BETWEEN 1900 AND 2200),
 synopsis text NOT NULL,
 poster text NOT NULL,
 color text NOT NULL DEFAULT '#b8c9b5',
 genres text[] NOT NULL DEFAULT '{}',
 episode_count integer NOT NULL CHECK (episode_count > 0),
 rating numeric(3,1) NOT NULL CHECK (rating BETWEEN 0 AND 10),
 popularity numeric(5,2) NOT NULL CHECK (popularity BETWEEN 0 AND 100),
 published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || original_title || ' ' || synopsis)) STORED
);
CREATE INDEX IF NOT EXISTS dramas_search_idx ON dramas USING gin(search_document);
CREATE INDEX IF NOT EXISTS dramas_genres_idx ON dramas USING gin(genres);
CREATE INDEX IF NOT EXISTS dramas_country_type_idx ON dramas(country,type) WHERE published;
CREATE TABLE IF NOT EXISTS people (
 slug text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK (kind IN ('actor','actress'))
);
CREATE TABLE IF NOT EXISTS drama_cast (
 drama_id text REFERENCES dramas(id) ON DELETE CASCADE,
 person_slug text REFERENCES people(slug) ON DELETE CASCADE,
 PRIMARY KEY (drama_id,person_slug)
);
CREATE INDEX IF NOT EXISTS cast_person_idx ON drama_cast(person_slug);
CREATE TABLE IF NOT EXISTS drama_dna (
 drama_id text PRIMARY KEY REFERENCES dramas(id) ON DELETE CASCADE,
 romance smallint NOT NULL CHECK(romance BETWEEN 0 AND 10),
 chemistry smallint NOT NULL CHECK(chemistry BETWEEN 0 AND 10),
 comedy smallint NOT NULL CHECK(comedy BETWEEN 0 AND 10),
 angst smallint NOT NULL CHECK(angst BETWEEN 0 AND 10),
 action smallint NOT NULL CHECK(action BETWEEN 0 AND 10),
 mystery smallint NOT NULL CHECK(mystery BETWEEN 0 AND 10),
 toxicity smallint NOT NULL CHECK(toxicity BETWEEN 0 AND 10),
 pace text NOT NULL CHECK(pace IN ('slow','medium','fast')),
 ending text NOT NULL CHECK(ending IN ('happy','bittersweet','sad','open','unknown')),
 love_triangle text NOT NULL CHECK(love_triangle IN ('none','mild','heavy')),
 lead_type text[] NOT NULL DEFAULT '{}',
 setting text[] NOT NULL DEFAULT '{}',
 tropes text[] NOT NULL DEFAULT '{}',
 moods text[] NOT NULL DEFAULT '{}',
 themes text[] NOT NULL DEFAULT '{}',
 spoiler_safe_notes text NOT NULL,
 editorial_version integer NOT NULL DEFAULT 1,
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dna_tropes_idx ON drama_dna USING gin(tropes);
CREATE TABLE IF NOT EXISTS external_ids (
 drama_id text REFERENCES dramas(id) ON DELETE CASCADE,
 provider text NOT NULL, external_id text NOT NULL,
 PRIMARY KEY (provider,external_id), UNIQUE(drama_id,provider)
);
-- Supabase/PostgREST: deny by default; public catalog reads are explicitly scoped.
ALTER TABLE dramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_cast ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY published_dramas ON dramas FOR SELECT USING (published);
CREATE POLICY published_cast ON drama_cast FOR SELECT USING (EXISTS(SELECT 1 FROM dramas d WHERE d.id=drama_id AND d.published));
CREATE POLICY published_people ON people FOR SELECT USING (EXISTS(SELECT 1 FROM drama_cast c JOIN dramas d ON d.id=c.drama_id WHERE c.person_slug=people.slug AND d.published));
CREATE POLICY published_dna ON drama_dna FOR SELECT USING (EXISTS(SELECT 1 FROM dramas d WHERE d.id=drama_id AND d.published));
-- No public writes, and no public external_ids access. Import using an authorized server role.
COMMIT;

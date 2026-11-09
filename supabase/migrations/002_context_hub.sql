-- Defrag.WTF  |  Migration 002  |  Context Hub
-- Safe to run multiple times (idempotent).
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Adds: structured extraction (entities, stack tags, CVE ids, event type),
-- event clustering (event_id), Ukrainian summaries, source metadata and
-- full-text search (used by /api/articles?q= and the "Ask Defrag" RAG endpoint).

ALTER TABLE defrag_articles
  ADD COLUMN IF NOT EXISTS title_uk       TEXT,
  ADD COLUMN IF NOT EXISTS summary_uk     TEXT,
  ADD COLUMN IF NOT EXISTS event_type     TEXT,                       -- RELEASE | SECURITY | OUTAGE | ...
  ADD COLUMN IF NOT EXISTS entities       JSONB   NOT NULL DEFAULT '[]'::jsonb,  -- [{name,type}]
  ADD COLUMN IF NOT EXISTS stack_tags     TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cve_ids        TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_kind    TEXT    NOT NULL DEFAULT 'press',   -- press | vendor | community | advisory
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,                     -- explainable impact score
  ADD COLUMN IF NOT EXISTS meta           JSONB   NOT NULL DEFAULT '{}'::jsonb, -- e.g. HN points
  ADD COLUMN IF NOT EXISTS event_id       UUID;                       -- same real-world event => same event_id

-- Full-text search column (title weighted higher than summary).
-- Generated columns require PostgreSQL 12+ (all current Supabase projects).
ALTER TABLE defrag_articles
  ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_defrag_articles_fts        ON defrag_articles USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_event_id   ON defrag_articles (event_id);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_event_type ON defrag_articles (event_type);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_stack_tags ON defrag_articles USING GIN (stack_tags);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_cve_ids    ON defrag_articles USING GIN (cve_ids);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_entities   ON defrag_articles USING GIN (entities jsonb_path_ops);

COMMENT ON COLUMN defrag_articles.event_id        IS 'Cluster id: articles about the same real-world event share it';
COMMENT ON COLUMN defrag_articles.score_breakdown IS 'Per-feature contributions to impact_score (explainable scoring)';
COMMENT ON COLUMN defrag_articles.entities        IS 'Extracted named entities: [{"name":"React","type":"TECH"}]';

-- ---------------------------------------------------------------------------
-- OPTIONAL: Row Level Security.
-- The backend should use the SERVICE ROLE key (env SUPABASE_SERVICE_KEY): it
-- bypasses RLS, so the browser/anon key can then be limited to read-only.
-- Uncomment ONLY after you've set SUPABASE_SERVICE_KEY on the server,
-- otherwise inserts from the backend will start failing.
--
-- ALTER TABLE defrag_articles ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "public read" ON defrag_articles;
-- CREATE POLICY "public read" ON defrag_articles FOR SELECT USING (true);
-- ---------------------------------------------------------------------------

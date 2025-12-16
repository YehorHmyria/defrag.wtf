-- Defrag.WTF Database Schema
-- Table for storing defragmented tech news articles

CREATE TABLE IF NOT EXISTS defrag_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  short_tag TEXT NOT NULL,
  impact_score SMALLINT NOT NULL CHECK (impact_score >= 1 AND impact_score <= 100),
  original_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_defrag_articles_published_at ON defrag_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_impact_score ON defrag_articles(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_short_tag ON defrag_articles(short_tag);
CREATE INDEX IF NOT EXISTS idx_defrag_articles_source_name ON defrag_articles(source_name);

-- Add comment for documentation
COMMENT ON TABLE defrag_articles IS 'Stores AI-processed tech news articles with cynical, defragmented content';
COMMENT ON COLUMN defrag_articles.title IS 'Catchy, cynical headline in English (max 60 chars)';
COMMENT ON COLUMN defrag_articles.summary IS 'Raw, condensed facts as bullet points in English';
COMMENT ON COLUMN defrag_articles.short_tag IS '1-word uppercase tag (e.g., HYPE, CRASH, AI, CRYPTO, FAIL)';
COMMENT ON COLUMN defrag_articles.impact_score IS 'Technical significance rating from 1 to 100';
COMMENT ON COLUMN defrag_articles.original_url IS 'Source article URL (unique constraint prevents duplicates)';

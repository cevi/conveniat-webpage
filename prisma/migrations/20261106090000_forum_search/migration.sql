-- The search for posts that say the same, see `forum-search.ts`: full-text over title and
-- description with German stems and without accents, and trigrams over the title for typos.
-- Both extensions are trusted, so the database owner creates them without a superuser.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- `german`, but "Wäsche" and "Wasche" are one word
CREATE TEXT SEARCH CONFIGURATION forum_german (COPY = german);
ALTER TEXT SEARCH CONFIGURATION forum_german
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, german_stem;

-- the description, copied from the latest content of the post's message
ALTER TABLE "ForumPost" ADD COLUMN "body" TEXT NOT NULL DEFAULT '';
UPDATE "ForumPost" AS post
SET "body" = COALESCE(
  (
    SELECT CASE jsonb_typeof(content."payload"::jsonb)
             WHEN 'string' THEN content."payload"::jsonb #>> '{}'
             ELSE content."payload"::jsonb ->> 'text'
           END
    FROM "MessageContent" AS content
    WHERE content."messageId" = post."messageId"
    ORDER BY content."revision" DESC
    LIMIT 1
  ),
  ''
);

ALTER TABLE "ForumPost" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('forum_german', "title"), 'A') ||
  setweight(to_tsvector('forum_german', "body"), 'B')
) STORED;

CREATE INDEX "ForumPost_search_idx" ON "ForumPost" USING GIN ("search");
CREATE INDEX "ForumPost_title_idx" ON "ForumPost" USING GIN ("title" gin_trgm_ops);

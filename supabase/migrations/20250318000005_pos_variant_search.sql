-- POS variant search with BM25-style ranking (Postgres ts_rank)

CREATE OR REPLACE FUNCTION public.search_pos_variants(
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 300
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  track_stock boolean,
  product_id uuid,
  product_name text,
  product_has_variants boolean,
  product_track_stock boolean,
  product_option_sets jsonb,
  relevance double precision
)
LANGUAGE sql
STABLE
AS $$
SELECT
  v.id,
  v.name,
  v.price,
  v.track_stock,
  p.id AS product_id,
  p.name AS product_name,
  p.has_variants AS product_has_variants,
  p.track_stock AS product_track_stock,
  p.option_sets AS product_option_sets,
  CASE
    WHEN COALESCE(trim(p_query), '') = '' THEN 0::double precision
    ELSE ts_rank_cd(
      to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(v.name, '')),
      websearch_to_tsquery('simple', p_query)
    )::double precision
  END AS relevance
FROM product_variants v
JOIN products p ON p.id = v.product_id
WHERE p.is_active = true
  AND (
    p.has_variants = false
    OR v.price > 0
  )
  AND (
    COALESCE(trim(p_query), '') = ''
    OR to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(v.name, ''))
       @@ websearch_to_tsquery('simple', p_query)
  )
ORDER BY
  CASE WHEN COALESCE(trim(p_query), '') = '' THEN NULL ELSE ts_rank_cd(
    to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(v.name, '')),
    websearch_to_tsquery('simple', p_query)
  ) END DESC NULLS LAST,
  p.name ASC,
  v.name ASC
LIMIT GREATEST(COALESCE(p_limit, 300), 1);
$$;


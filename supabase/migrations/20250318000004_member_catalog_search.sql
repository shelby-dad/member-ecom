-- Member catalog search (BM25-style ranking via Postgres text-search rank)

CREATE OR REPLACE FUNCTION public.search_catalog_products(
  p_query text DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_tag_ids uuid[] DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  brand_id uuid,
  option_sets jsonb,
  min_price numeric,
  relevance double precision
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT
    p.id,
    p.name,
    p.description,
    p.brand_id,
    p.option_sets,
    (
      SELECT MIN(v.price)
      FROM product_variants v
      WHERE v.product_id = p.id
        AND (
          p.has_variants = false
          OR v.price > 0
        )
    ) AS min_price,
    CASE
      WHEN COALESCE(trim(p_query), '') = '' THEN 0::double precision
      ELSE ts_rank_cd(
        to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')),
        websearch_to_tsquery('simple', p_query)
      )::double precision
    END AS relevance
  FROM products p
  WHERE p.is_active = true
    AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
    AND (
      p_category_ids IS NULL
      OR cardinality(p_category_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM product_categories pc
        WHERE pc.product_id = p.id
          AND pc.category_id = ANY(p_category_ids)
      )
    )
    AND (
      p_tag_ids IS NULL
      OR cardinality(p_tag_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM product_tags pt
        WHERE pt.product_id = p.id
          AND pt.tag_id = ANY(p_tag_ids)
      )
    )
    AND (
      COALESCE(trim(p_query), '') = ''
      OR to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(p.description, ''))
         @@ websearch_to_tsquery('simple', p_query)
    )
)
SELECT
  f.id,
  f.name,
  f.description,
  f.brand_id,
  f.option_sets,
  f.min_price,
  f.relevance
FROM filtered f
WHERE f.min_price IS NOT NULL
  AND (p_price_min IS NULL OR f.min_price >= p_price_min)
  AND (p_price_max IS NULL OR f.min_price <= p_price_max)
ORDER BY
  CASE WHEN p_sort = 'price_asc' THEN f.min_price END ASC NULLS LAST,
  CASE WHEN p_sort = 'price_desc' THEN f.min_price END DESC NULLS LAST,
  CASE WHEN p_sort = 'relevance' THEN f.relevance END DESC NULLS LAST,
  f.name ASC
LIMIT GREATEST(COALESCE(p_limit, 12), 1)
OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;


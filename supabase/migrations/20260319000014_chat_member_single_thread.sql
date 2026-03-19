-- Enforce one chat thread per member. Keep latest thread and move messages.

WITH ranked_threads AS (
  SELECT
    id,
    member_id,
    ROW_NUMBER() OVER (
      PARTITION BY member_id
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM chat_threads
),
keepers AS (
  SELECT member_id, id AS keep_id
  FROM ranked_threads
  WHERE rn = 1
),
duplicates AS (
  SELECT rt.id AS duplicate_id, k.keep_id
  FROM ranked_threads rt
  JOIN keepers k ON k.member_id = rt.member_id
  WHERE rt.rn > 1
)
UPDATE chat_messages m
SET thread_id = d.keep_id
FROM duplicates d
WHERE m.thread_id = d.duplicate_id;

DELETE FROM chat_threads t
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY member_id
        ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
      ) AS rn
    FROM chat_threads
  ) s
  WHERE s.rn > 1
) d
WHERE t.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_threads_member_single
  ON chat_threads(member_id);

DROP POLICY IF EXISTS chat_presence_select_self ON chat_presence;

CREATE POLICY chat_presence_select_related
  ON chat_presence FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM chat_threads t
      WHERE (
        (
          t.member_id = chat_presence.user_id
          AND (
            t.member_id = auth.uid()
            OR t.assigned_to = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM profiles p
              WHERE p.id = auth.uid()
                AND p.role IN ('admin', 'superadmin')
            )
          )
        )
        OR (
          t.assigned_to = chat_presence.user_id
          AND t.member_id = auth.uid()
        )
      )
    )
  );

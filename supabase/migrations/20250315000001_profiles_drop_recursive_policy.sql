-- Fix 500 on profiles: drop the recursive RLS policy that reads from profiles
-- (causes infinite recursion when evaluating SELECT). Client only needs to read
-- own profile; admin listing uses server API with service role.

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

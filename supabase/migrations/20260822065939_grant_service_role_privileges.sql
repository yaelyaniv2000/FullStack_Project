-- Fixes a real bug caught during manual testing: with "automatically expose new tables"
-- disabled at the project level (a deliberate choice -- see the earlier RLS migration and
-- CLAUDE.md), *no* role gets base privileges on new tables by default, not even `service_role`.
-- We had assumed service_role always has implicit full access since it bypasses RLS -- that
-- assumption was wrong for this project's specific settings. service_role still needs an
-- explicit GRANT to even attempt an operation; RLS bypass only matters once a grant exists.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
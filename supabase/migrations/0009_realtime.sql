-- 0009_realtime.sql — opt the score and bonus tables into the Supabase
-- Realtime publication so the ranking page can subscribe to live updates.
--
-- Supabase Realtime is a Postgres logical-replication consumer. Tables only
-- emit events to the WebSocket fan-out if they belong to the publication
-- named `supabase_realtime`. By default Supabase enables a few tables; ours
-- need to be added explicitly.
--
-- Idempotent: each ALTER PUBLICATION is wrapped in a DO block that checks
-- pg_publication_tables first, since ALTER PUBLICATION … ADD TABLE errors
-- on a table that's already in the publication.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'score'
  ) then
    alter publication supabase_realtime add table public.score;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bonus'
  ) then
    alter publication supabase_realtime add table public.bonus;
  end if;
end $$;

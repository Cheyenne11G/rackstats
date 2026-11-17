-- =============================================================================
-- RackStats — staging_seed_reset.sql   (STAGING ONLY: bspxmdkjqfkilhpjbaem)
-- =============================================================================
-- Deletes ONLY the seed leagues created by staging_seed.sql, and (through the
-- existing ON DELETE CASCADE foreign keys) their members, teams, venues,
-- players, fixtures and any result submissions created during testing.
--
-- Run ONLY when you deliberately want to re-seed. It is never run automatically.
--
-- PRIVILEGED: leagues have no DELETE policy, so this runs as the SQL editor
-- role rather than as a test user. It is cleanup only; seeding never does this.
--
-- DOES NOT TOUCH: auth users, non-seed leagues, subscriptions, the schema.
--
-- SAFETY:
--   * Single transaction.
--   * Deletes only leagues tagged legacy_id LIKE 'seed:%' AND owned by an
--     @rackstats.test user (live has neither).
--   * Refuses if a seed-tagged league is owned by anyone else.
-- =============================================================================

begin;

do $reset$
declare
  v_deleted integer;
begin
  if exists (
    select 1
      from public.leagues l
      left join auth.users u on u.id = l.user_id
     where l.legacy_id like 'seed:%'
       and (u.email is null or u.email not like '%@rackstats.test')
  ) then
    raise exception 'ABORTED: a seed-tagged league is not owned by a @rackstats.test user. Nothing was changed.';
  end if;

  delete from public.leagues l
   using auth.users u
   where u.id = l.user_id
     and l.legacy_id like 'seed:%'
     and u.email like '%@rackstats.test';
  get diagnostics v_deleted = row_count;

  raise notice 'Deleted % seed league(s) and their dependent rows.', v_deleted;
end
$reset$;

commit;

select count(*) as remaining_seed_leagues from public.leagues where legacy_id like 'seed:%';

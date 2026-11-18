-- =============================================================================
-- RackStats — 0001_organisers_can_view_league_members.sql
-- =============================================================================
-- WHAT: adds one read-only (SELECT) RLS policy so league ORGANISERS can view
--       their own league's member list. Owners already can.
-- WHY:  organisers have Admin access but saw "0 members" (frontend gate) and
--       could only ever read their own membership row (RLS). See baseline note
--       "INCONSISTENCY: organisers cannot see the member list (owners only)."
-- SCOPE: role changes and removals remain OWNER-ONLY — enforced inside
--       update_league_member_role / remove_league_member (unchanged).
--       Existing policies, grants, functions and data are untouched.
-- ROLLBACK:
--   drop policy "Organisers can view league members" on public.league_members;
-- APPLY: staging first; live only after separate approval.
-- =============================================================================

begin;

do $guard$
begin
  if to_regprocedure('public.has_league_role(uuid, text[])') is null then
    raise exception 'ABORTED: public.has_league_role(uuid, text[]) not found. Nothing was changed.';
  end if;
  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'league_members'
                and policyname = 'Organisers can view league members') then
    raise exception 'ABORTED: policy already exists. Nothing was changed.';
  end if;
end
$guard$;

-- Organisers may READ their league's member list. Role changes and removals
-- remain owner-only (enforced inside update_league_member_role / remove_league_member).
create policy "Organisers can view league members" on public.league_members
  as permissive for select to authenticated
  using (public.has_league_role(league_id, array['organiser'::text]));

commit;

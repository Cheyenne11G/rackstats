-- =============================================================================
-- RackStats — staging_seed.sql   (STAGING ONLY: bspxmdkjqfkilhpjbaem)
-- =============================================================================
-- Creates fictional test data for two leagues, acting AS the five fictional
-- test users so that the REAL RPC functions and RLS policies are exercised.
-- No privileged inserts: every application row is written while the session
-- runs as role `authenticated` with that user's JWT claims.
--
-- PREREQUISITES (created by hand in the staging dashboard, auto-confirmed):
--   owner@rackstats.test, organiser@rackstats.test, player.a@rackstats.test,
--   player.b@rackstats.test, outsider@rackstats.test
--
-- CREATES:
--   League A "Staging Test League A" (owner: Test Owner)
--     members: Test Organiser (organiser), Test Player A, Test Player B (players)
--     teams:   Test Team Red / Blue / Green
--     players: 3 linked (organiser, Player A, Player B) + 5 unlinked
--     venue:   Test Venue One
--     1v1:     A vs B (race 5), A vs B (race 7), Test Player 01 vs 02 (race 5)
--     team:    Red vs Blue, Blue vs Green
--   League B "Staging Test League B" (owner: Test Outsider) — isolation tests
--     team: Test Team Outsiders; players: Test Outsider Player 01, 02;
--     venue: Test Venue B; 1v1: Outsider Player 01 vs 02 (race 5)
--
-- DOES NOT CREATE: match results, result submissions, subscriptions, payments.
--
-- SAFETY:
--   * Single transaction; any error rolls everything back.
--   * Refuses to run unless all 5 @rackstats.test users exist and are confirmed
--     (none exist on live).
--   * Refuses if any league is owned by a non-@rackstats.test user (live has
--     real owners).
--   * Refuses if seed data already exists (re-run). To re-seed, run
--     staging_seed_reset.sql first — deliberately, never automatically.
--   * Every seed row is tagged legacy_id = 'seed:...'.
--   * Role and JWT claims are set with SET LOCAL / set_config(..., true), so
--     they end with the transaction.
--
-- RUN WHOLE: in the staging SQL editor, with NO text highlighted.
-- =============================================================================

begin;

do $seed$
declare
  -- test users
  u_owner     uuid;
  u_organiser uuid;
  u_player_a  uuid;
  u_player_b  uuid;
  u_outsider  uuid;
  v_n         integer;

  -- league A
  la          uuid;
  la_code     text;
  t_red       uuid;
  t_blue      uuid;
  t_green     uuid;
  v_venue_a   uuid;
  p_organiser uuid;
  p_a         uuid;
  p_b         uuid;
  p_01        uuid;
  p_02        uuid;

  -- league B
  lb          uuid;
  t_out       uuid;
  v_venue_b   uuid;
  p_out_01    uuid;
  p_out_02    uuid;
begin
  -- ---------------------------------------------------------------------------
  -- 0. GUARDS (run as the SQL editor role, before any change)
  -- ---------------------------------------------------------------------------
  if current_user in ('anon', 'authenticated') then
    raise exception 'ABORTED: run this from the SQL editor as the default role, not as %.', current_user;
  end if;

  select count(*) into v_n
    from auth.users
   where email in ('owner@rackstats.test', 'organiser@rackstats.test',
                   'player.a@rackstats.test', 'player.b@rackstats.test',
                   'outsider@rackstats.test')
     and email_confirmed_at is not null;
  if v_n <> 5 then
    raise exception 'ABORTED: expected 5 confirmed @rackstats.test users, found %. This script is for the STAGING project only. Nothing was changed.', v_n;
  end if;

  select id into strict u_owner     from auth.users where email = 'owner@rackstats.test';
  select id into strict u_organiser from auth.users where email = 'organiser@rackstats.test';
  select id into strict u_player_a  from auth.users where email = 'player.a@rackstats.test';
  select id into strict u_player_b  from auth.users where email = 'player.b@rackstats.test';
  select id into strict u_outsider  from auth.users where email = 'outsider@rackstats.test';

  if exists (select 1 from public.leagues where legacy_id like 'seed:%') then
    raise exception 'ABORTED: seed data already exists. Run staging_seed_reset.sql first if you intend to re-seed. Nothing was changed.';
  end if;

  if exists (
    select 1
      from public.leagues l
      left join auth.users u on u.id = l.user_id
     where u.email is null or u.email not like '%@rackstats.test'
  ) then
    raise exception 'ABORTED: a league owned by a non-test user exists. This script is for the STAGING project only. Nothing was changed.';
  end if;

  -- ---------------------------------------------------------------------------
  -- 1. AS TEST OWNER: create League A (real create_league RPC)
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select c.id, c.invite_code into strict la, la_code
    from public.create_league('Staging Test League A', '2026 Season') c;

  update public.leagues set legacy_id = 'seed:A:league' where id = la;  -- owner UPDATE policy
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Seed failed: could not tag League A (RLS).'; end if;

  reset role;

  -- ---------------------------------------------------------------------------
  -- 2. AS ORGANISER, PLAYER A, PLAYER B: join League A by invite code
  --    (real join_league_by_code RPC; creates linked player profiles)
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', u_organiser, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.join_league_by_code(la_code);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_player_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.join_league_by_code(la_code);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_player_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.join_league_by_code(la_code);
  reset role;

  -- ---------------------------------------------------------------------------
  -- 3. AS TEST OWNER: promote organiser, then build League A
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.update_league_member_role(la, u_organiser, 'organiser');

  insert into public.teams (league_id, name, legacy_id) values (la, 'Test Team Red',   'seed:A:team:red')   returning id into strict t_red;
  insert into public.teams (league_id, name, legacy_id) values (la, 'Test Team Blue',  'seed:A:team:blue')  returning id into strict t_blue;
  insert into public.teams (league_id, name, legacy_id) values (la, 'Test Team Green', 'seed:A:team:green') returning id into strict t_green;

  insert into public.venues (league_id, name, legacy_id) values (la, 'Test Venue One', 'seed:A:venue:one') returning id into strict v_venue_a;

  -- Linked profiles created by join_league_by_code: give them display names,
  -- teams and seed tags (an ordinary owner/organiser edit).
  update public.players set name = 'Test Organiser', team_id = t_red,  legacy_id = 'seed:A:player:organiser'
   where league_id = la and user_id = u_organiser returning id into strict p_organiser;
  update public.players set name = 'Test Player A',  team_id = t_red,  legacy_id = 'seed:A:player:a'
   where league_id = la and user_id = u_player_a  returning id into strict p_a;
  update public.players set name = 'Test Player B',  team_id = t_blue, legacy_id = 'seed:A:player:b'
   where league_id = la and user_id = u_player_b  returning id into strict p_b;

  -- Unlinked fictional profiles (no account): used for account-linking tests.
  insert into public.players (league_id, name, team_id, legacy_id) values (la, 'Test Player 01', t_red,   'seed:A:player:01') returning id into strict p_01;
  insert into public.players (league_id, name, team_id, legacy_id) values (la, 'Test Player 02', t_blue,  'seed:A:player:02') returning id into strict p_02;
  insert into public.players (league_id, name, team_id, legacy_id) values (la, 'Test Player 03', t_blue,  'seed:A:player:03');
  insert into public.players (league_id, name, team_id, legacy_id) values (la, 'Test Player 04', t_green, 'seed:A:player:04');
  insert into public.players (league_id, name, team_id, legacy_id) values (la, 'Test Player 05', t_green, 'seed:A:player:05');

  -- 1v1 challenges (status left at the column default; race_to always > 0).
  insert into public.challenges (league_id, player_a_id, player_b_id, race_to, match_date, venue_id, table_number, queue, legacy_id)
  values (la, p_a,  p_b,  5, date_trunc('hour', now()) + interval '2 days',       v_venue_a, '1', 1, 'seed:A:challenge:a-vs-b-race5');
  insert into public.challenges (league_id, player_a_id, player_b_id, race_to, match_date, venue_id, table_number, queue, legacy_id)
  values (la, p_a,  p_b,  7, date_trunc('hour', now()) + interval '9 days',       v_venue_a, '1', 1, 'seed:A:challenge:a-vs-b-race7');
  insert into public.challenges (league_id, player_a_id, player_b_id, race_to, match_date, venue_id, table_number, queue, legacy_id)
  values (la, p_01, p_02, 5, date_trunc('hour', now()) + interval '3 days',       v_venue_a, '2', 1, 'seed:A:challenge:01-vs-02');

  -- Team fixtures (home_team/away_team text names are required on this schema).
  insert into public.matches (league_id, home_team, away_team, home_team_id, away_team_id, match_date, venue_id, table_number, queue, legacy_id)
  values (la, 'Test Team Red',  'Test Team Blue',  t_red,  t_blue,  date_trunc('hour', now()) + interval '4 days',  v_venue_a, '3', 1, 'seed:A:match:red-vs-blue');
  insert into public.matches (league_id, home_team, away_team, home_team_id, away_team_id, match_date, venue_id, table_number, queue, legacy_id)
  values (la, 'Test Team Blue', 'Test Team Green', t_blue, t_green, date_trunc('hour', now()) + interval '11 days', v_venue_a, '3', 1, 'seed:A:match:blue-vs-green');

  reset role;

  -- ---------------------------------------------------------------------------
  -- 4. AS TEST OUTSIDER: create and build League B (isolation tests)
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', u_outsider, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select c.id into strict lb from public.create_league('Staging Test League B', '2026 Season') c;

  update public.leagues set legacy_id = 'seed:B:league' where id = lb;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Seed failed: could not tag League B (RLS).'; end if;

  insert into public.teams  (league_id, name, legacy_id) values (lb, 'Test Team Outsiders', 'seed:B:team:outsiders') returning id into strict t_out;
  insert into public.venues (league_id, name, legacy_id) values (lb, 'Test Venue B', 'seed:B:venue:b') returning id into strict v_venue_b;
  insert into public.players (league_id, name, team_id, legacy_id) values (lb, 'Test Outsider Player 01', t_out, 'seed:B:player:01') returning id into strict p_out_01;
  insert into public.players (league_id, name, team_id, legacy_id) values (lb, 'Test Outsider Player 02', t_out, 'seed:B:player:02') returning id into strict p_out_02;
  insert into public.challenges (league_id, player_a_id, player_b_id, race_to, match_date, venue_id, table_number, queue, legacy_id)
  values (lb, p_out_01, p_out_02, 5, date_trunc('hour', now()) + interval '5 days', v_venue_b, '1', 1, 'seed:B:challenge:01-vs-02');

  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- ---------------------------------------------------------------------------
  -- 5. SELF-CHECK (as the editor role): abort the whole seed on any mismatch
  -- ---------------------------------------------------------------------------
  if (select count(*) from public.league_members where league_id = la) <> 4
     or (select role from public.league_members where league_id = la and user_id = u_owner)     <> 'owner'
     or (select role from public.league_members where league_id = la and user_id = u_organiser) <> 'organiser'
     or (select role from public.league_members where league_id = la and user_id = u_player_a)  <> 'player'
     or (select role from public.league_members where league_id = la and user_id = u_player_b)  <> 'player'
     or (select count(*) from public.league_members where league_id = lb) <> 1
     or exists (select 1 from public.league_members where league_id = lb and user_id <> u_outsider)
     or (select count(*) from public.players where league_id = la) <> 8
     or (select count(*) from public.players where league_id = la and user_id is not null) <> 3
     or exists (select 1 from public.players where league_id = la and user_id = u_owner)
     or (select count(*) from public.players where league_id = lb) <> 2
     or (select count(*) from public.teams where league_id = la) <> 3
     or (select count(*) from public.challenges where league_id = la) <> 3
     or (select count(*) from public.matches where league_id = la) <> 2
     or (select count(*) from public.challenges where league_id = lb) <> 1
     or exists (select 1 from public.match_result_submissions)
     or exists (select 1 from public.subscriptions)
  then
    raise exception 'Seed self-check failed; everything has been rolled back.';
  end if;
end
$seed$;

commit;

-- Summary (read-only) shown in the SQL editor results panel.
select l.legacy_id                                                        as seed_tag,
       l.name                                                             as league,
       l.invite_code,
       (select count(*) from public.league_members m where m.league_id = l.id) as members,
       (select count(*) from public.teams t           where t.league_id = l.id) as teams,
       (select count(*) from public.players p         where p.league_id = l.id) as players,
       (select count(*) from public.players p         where p.league_id = l.id and p.user_id is not null) as linked_players,
       (select count(*) from public.venues v          where v.league_id = l.id) as venues,
       (select count(*) from public.challenges c      where c.league_id = l.id) as challenges,
       (select count(*) from public.matches x         where x.league_id = l.id) as team_matches
  from public.leagues l
 where l.legacy_id like 'seed:%'
 order by l.legacy_id;

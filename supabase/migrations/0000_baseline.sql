-- =============================================================================
-- RackStats — 0000_baseline.sql
-- =============================================================================
-- PURPOSE
--   Reproduces the structure of the LIVE RackStats database (project ref
--   wfpngxkdqiazodqybzfi, introspected 2026-11-17) so that it can be created in
--   the STAGING project (bspxmdkjqfkilhpjbaem).
--
--   * Structure only. Contains NO data, NO users, NO auth records.
--   * Reproduces live exactly, INCLUDING known problems. Nothing is fixed here.
--     Known problems are marked "KNOWN ISSUE" and must be fixed in later,
--     separately approved migrations (applied to staging first, then live).
--   * Function bodies are copied verbatim from the live pg_get_functiondef()
--     output.
--
-- INTENDED TARGET: an EMPTY, newly created Supabase project (staging) ONLY.
-- NEVER run this against the live project. The guard below aborts, before any
-- change is made, if any RackStats table or any RackStats-named function
-- (any overload) already exists.
--
-- RUN IT WHOLE: in the Supabase SQL editor, make sure NO text is highlighted
-- before clicking Run (a selection runs only the selected text).
--
-- Runs as a single transaction: if anything fails, nothing is applied.
--
-- ROLLBACK (staging only, only if needed): drop the 9 tables listed below
-- (CASCADE) and the 10 functions in public. Do not do this on live.
--
-- NOT COVERED BY SQL (configured by hand in the dashboard):
--   Auth settings (signups, confirm email, password rules, Site URL, redirect
--   URLs), SMTP, rate limits, API settings.
--
-- PRIVILEGES AND OWNERSHIP (verified against live export v2, PostgreSQL 17.11):
--   * All tables and functions on live are owned by postgres (the SQL editor
--     role), so running this in the SQL editor reproduces the ownership.
--   * service_role holds Supabase's default ALL on every table on live; this
--     file leaves service_role at that default.
--   * anon/authenticated table privileges are re-granted exactly from live's
--     raw ACLs, INCLUDING the PostgreSQL 17 MAINTAIN privilege (see section 7).
--
-- NOT VERIFIABLE FROM THE INTROSPECTION EXPORT:
--   * Column-level privileges and object comments (none expected).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. SAFETY GUARD — abort, before any change, if this database already
--    contains ANY RackStats table or ANY function with a RackStats function
--    name in the public schema.
--
--    * Tables: any relation (table, view, sequence, etc.) with one of the 9
--      names, checked with to_regclass().
--    * Functions: matched by NAME ONLY in pg_proc, so EVERY overload/signature
--      counts (not just the signature this file creates). This prevents
--      CREATE OR REPLACE from silently replacing an existing function, and
--      also stops if a different overload exists that would make later
--      GRANT/REVOKE or RPC calls ambiguous.
--    * The error lists every conflicting object found.
-- -----------------------------------------------------------------------------
do $guard$
declare
  v_tables    text[] := array[
    'leagues', 'league_members', 'teams', 'venues', 'players',
    'matches', 'challenges', 'subscriptions', 'match_result_submissions'
  ];
  v_functions text[] := array[
    'generate_league_invite_code', 'has_league_role', 'is_league_member',
    'create_league', 'join_league_by_code', 'update_league_member_role',
    'remove_league_member', 'submit_match_result', 'respond_to_match_result',
    'organiser_review_match_result'
  ];
  v_found     text[];
begin
  select coalesce(array_agg('relation public.' || t order by t), '{}')
    into v_found
    from unnest(v_tables) as t
   where to_regclass('public.' || quote_ident(t)) is not null;

  select v_found || coalesce(array_agg(
           'function public.' || p.proname || '(' ||
           pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
           order by p.proname, p.oid), '{}')
    into v_found
    from pg_catalog.pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname = any (v_functions);

  if cardinality(v_found) > 0 then
    raise exception 'ABORTED: RackStats objects already exist. This baseline must only be run on an EMPTY staging project. Nothing was changed.'
      using detail = 'Existing objects: ' || array_to_string(v_found, ', ');
  end if;
end
$guard$;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS (already present by default on new Supabase projects)
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto"  with schema extensions;

-- -----------------------------------------------------------------------------
-- 2. FUNCTION NEEDED BY A COLUMN DEFAULT (leagues.invite_code)
-- -----------------------------------------------------------------------------
-- KNOWN ISSUE: not SECURITY DEFINER and has no fixed search_path (Supabase
-- linter "function_search_path_mutable"). Executable by PUBLIC and anon.
-- Invite codes are 8 hex characters (~4.3 billion values).
CREATE OR REPLACE FUNCTION public.generate_league_invite_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  new_code text;
begin
  loop
    new_code := upper(substr(
      replace(gen_random_uuid()::text, '-', ''),
      1,
      8
    ));

    exit when not exists (
      select 1
      from public.leagues
      where invite_code = new_code
    );
  end loop;

  return new_code;
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. TABLES
-- -----------------------------------------------------------------------------

-- leagues ---------------------------------------------------------------------
create table public.leagues (
  id          uuid        not null default gen_random_uuid(),
  user_id     uuid        not null,
  name        text        not null,
  season      text                 default '2026 Season'::text,
  created_at  timestamptz not null default now(),
  legacy_id   text,
  invite_code text                 default public.generate_league_invite_code(),
  constraint leagues_pkey            primary key (id),
  constraint leagues_legacy_id_key   unique (legacy_id),
  constraint leagues_invite_code_key unique (invite_code),
  constraint leagues_user_id_fkey    foreign key (user_id) references auth.users(id) on delete cascade
);
-- KNOWN ISSUE (minor): duplicates the index behind leagues_invite_code_key.
create index leagues_invite_code_idx on public.leagues using btree (invite_code);

-- league_members --------------------------------------------------------------
create table public.league_members (
  id        uuid        not null default gen_random_uuid(),
  league_id uuid        not null,
  user_id   uuid        not null,
  role      text        not null default 'player'::text,
  joined_at timestamptz not null default now(),
  constraint league_members_pkey                   primary key (id),
  constraint league_members_league_id_user_id_key  unique (league_id, user_id),
  constraint league_members_role_check             check ((role = any (array['owner'::text, 'organiser'::text, 'player'::text]))),
  constraint league_members_league_id_fkey         foreign key (league_id) references public.leagues(id) on delete cascade,
  constraint league_members_user_id_fkey           foreign key (user_id) references auth.users(id) on delete cascade
);
-- INCONSISTENCY: ownership is recorded twice (leagues.user_id AND a role='owner'
-- membership). Member management RPCs check leagues.user_id; RLS checks roles.

-- teams -----------------------------------------------------------------------
-- INCONSISTENCY: played/wins/losses/points are hand-maintained, not derived
-- from results.
create table public.teams (
  id         uuid        not null default gen_random_uuid(),
  legacy_id  text,
  league_id  uuid        not null,
  name       text        not null,
  played     integer              default 0,
  wins       integer              default 0,
  losses     integer              default 0,
  points     integer              default 0,
  created_at timestamptz          default now(),
  constraint teams_pkey           primary key (id),
  constraint teams_legacy_id_key  unique (legacy_id),
  constraint teams_league_id_fkey foreign key (league_id) references public.leagues(id) on delete cascade
);

-- venues ----------------------------------------------------------------------
-- INCONSISTENCY: the frontend reads venues.location and venues.tables, which do
-- not exist (Match Night therefore always shows 0 tables).
create table public.venues (
  id         uuid        not null default gen_random_uuid(),
  legacy_id  text,
  league_id  uuid        not null,
  name       text        not null,
  created_at timestamptz          default now(),
  constraint venues_pkey           primary key (id),
  constraint venues_legacy_id_key  unique (legacy_id),
  constraint venues_league_id_fkey foreign key (league_id) references public.leagues(id) on delete cascade
);

-- players ---------------------------------------------------------------------
-- INCONSISTENCY: all statistics columns are hand-maintained totals; the review
-- RPC increments them in place (no derivation, no reversal).
-- KNOWN ISSUE (privacy): email is readable by every member of the league via
-- the "Members can view league players" policy.
-- INCONSISTENCY: team_id has no check that the team belongs to the same league.
create table public.players (
  id                uuid        not null default gen_random_uuid(),
  league_id         uuid        not null,
  name              text        not null,
  created_at        timestamptz not null default now(),
  legacy_id         text,
  team_id           uuid,
  rank              integer              default 0,
  played            integer              default 0,
  wins              integer              default 0,
  losses            integer              default 0,
  frames_won        integer              default 0,
  frames_lost       integer              default 0,
  golden_breaks     integer              default 0,
  run_out_bnf       integer              default 0,
  dry_breaks        integer              default 0,
  successful_breaks integer              default 0,
  pots_made         integer              default 0,
  shots_taken       integer              default 0,
  email             text                 default ''::text,
  avatar            text                 default ''::text,
  form              jsonb                default '[]'::jsonb,
  user_id           uuid,
  constraint players_pkey           primary key (id),
  constraint players_legacy_id_key  unique (legacy_id),
  constraint players_league_id_fkey foreign key (league_id) references public.leagues(id) on delete cascade,
  constraint players_team_id_fkey   foreign key (team_id) references public.teams(id) on delete set null,
  constraint players_user_id_fkey   foreign key (user_id) references auth.users(id) on delete set null
);
-- Required by join_league_by_code's ON CONFLICT (league_id, user_id) WHERE user_id IS NOT NULL.
create unique index players_league_user_unique on public.players using btree (league_id, user_id) where (user_id is not null);

-- matches (team fixtures) -----------------------------------------------------
-- INCONSISTENCY: home_team/away_team are required legacy text names alongside
-- home_team_id/away_team_id; table_number is text (frontend treats it as a
-- number); default status 'scheduled' differs from challenges ('Upcoming');
-- status has no check constraint; no check that home and away teams differ or
-- belong to the same league.
create table public.matches (
  id           uuid        not null default gen_random_uuid(),
  league_id    uuid        not null,
  home_team    text        not null,
  away_team    text        not null,
  match_date   timestamptz,
  home_score   integer,
  away_score   integer,
  status       text        not null default 'scheduled'::text,
  created_at   timestamptz not null default now(),
  legacy_id    text,
  venue_id     uuid,
  table_number text,
  queue        integer,
  home_team_id uuid,
  away_team_id uuid,
  constraint matches_pkey              primary key (id),
  constraint matches_legacy_id_key     unique (legacy_id),
  constraint matches_league_id_fkey    foreign key (league_id) references public.leagues(id) on delete cascade,
  constraint matches_venue_id_fkey     foreign key (venue_id) references public.venues(id) on delete set null,
  constraint matches_home_team_id_fkey foreign key (home_team_id) references public.teams(id) on delete set null,
  constraint matches_away_team_id_fkey foreign key (away_team_id) references public.teams(id) on delete set null
);

-- challenges (1v1 fixtures) ---------------------------------------------------
-- KNOWN ISSUE: race_to defaults to 0, and organiser_review_match_result rejects
-- any score above race_to, so approving a challenge with race_to = 0 always fails.
-- INCONSISTENCY: unused legacy home_team/away_team columns; table_number is
-- text; status is free text with no check constraint; no check that
-- player_a_id <> player_b_id or that scores are non-negative.
create table public.challenges (
  id           uuid        not null default gen_random_uuid(),
  legacy_id    text,
  league_id    uuid        not null,
  venue_id     uuid,
  home_team    text,
  away_team    text,
  match_date   timestamptz,
  status       text                 default 'Upcoming'::text,
  created_at   timestamptz          default now(),
  player_a_id  uuid,
  player_b_id  uuid,
  score_a      integer              default 0,
  score_b      integer              default 0,
  race_to      integer              default 0,
  table_number text,
  queue        integer,
  constraint challenges_pkey              primary key (id),
  constraint challenges_legacy_id_key     unique (legacy_id),
  constraint challenges_league_id_fkey    foreign key (league_id) references public.leagues(id) on delete cascade,
  constraint challenges_venue_id_fkey     foreign key (venue_id) references public.venues(id) on delete set null,
  constraint challenges_player_a_id_fkey  foreign key (player_a_id) references public.players(id) on delete set null,
  constraint challenges_player_b_id_fkey  foreign key (player_b_id) references public.players(id) on delete set null
);

-- subscriptions ---------------------------------------------------------------
create table public.subscriptions (
  id                       uuid        not null default gen_random_uuid(),
  user_id                  uuid        not null,
  subscription_type        text        not null,
  plan                     text        not null,
  billing_interval         text        not null default 'monthly'::text,
  status                   text        not null default 'pending'::text,
  additional_leagues       integer     not null default 0,
  amount_cents             integer     not null default 0,
  currency                 text        not null default 'ZAR'::text,
  payment_provider         text,
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint subscriptions_pkey                         primary key (id),
  constraint subscriptions_user_id_subscription_type_key unique (user_id, subscription_type),
  constraint subscriptions_subscription_type_check      check ((subscription_type = any (array['player'::text, 'organiser'::text]))),
  constraint subscriptions_plan_check                   check ((plan = any (array['player_pro'::text, 'organiser_pro'::text, 'club'::text]))),
  constraint subscriptions_check                        check ((((subscription_type = 'player'::text) and (plan = 'player_pro'::text)) or ((subscription_type = 'organiser'::text) and (plan = any (array['organiser_pro'::text, 'club'::text]))))),
  constraint subscriptions_billing_interval_check       check ((billing_interval = any (array['monthly'::text, 'annual'::text]))),
  constraint subscriptions_status_check                 check ((status = any (array['pending'::text, 'active'::text, 'past_due'::text, 'cancelled'::text, 'expired'::text]))),
  constraint subscriptions_additional_leagues_check     check ((additional_leagues >= 0)),
  constraint subscriptions_amount_cents_check           check ((amount_cents >= 0)),
  constraint subscriptions_user_id_fkey                 foreign key (user_id) references auth.users(id) on delete cascade
);
-- KNOWN ISSUE (minor): duplicates the leading column of the unique constraint index.
create index subscriptions_user_id_idx on public.subscriptions using btree (user_id);

-- match_result_submissions ----------------------------------------------------
-- KNOWN ISSUE: the partial unique indexes allow only ONE submission row per
-- match/challenge, ever. After a rejection, the result can never be resubmitted.
create table public.match_result_submissions (
  id                     uuid        not null default gen_random_uuid(),
  league_id              uuid        not null,
  match_id               uuid,
  submitted_by_user_id   uuid        not null,
  submitted_by_player_id uuid        not null,
  home_score             integer     not null,
  away_score             integer     not null,
  player_statistics      jsonb       not null default '{}'::jsonb,
  status                 text        not null default 'pending_confirmation'::text,
  opponent_response      text,
  opponent_responded_by  uuid,
  opponent_responded_at  timestamptz,
  organiser_reviewed_by  uuid,
  organiser_reviewed_at  timestamptz,
  organiser_notes        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  challenge_id           uuid,
  constraint match_result_submissions_pkey                      primary key (id),
  constraint match_result_submissions_home_score_check          check ((home_score >= 0)),
  constraint match_result_submissions_away_score_check          check ((away_score >= 0)),
  constraint match_result_submissions_status_check              check ((status = any (array['pending_confirmation'::text, 'confirmed'::text, 'disputed'::text, 'approved'::text, 'rejected'::text]))),
  constraint match_result_submissions_exactly_one_match_check   check ((((match_id is not null) and (challenge_id is null)) or ((match_id is null) and (challenge_id is not null)))),
  constraint match_result_submissions_league_id_fkey            foreign key (league_id) references public.leagues(id) on delete cascade,
  constraint match_result_submissions_match_id_fkey             foreign key (match_id) references public.matches(id) on delete cascade,
  constraint match_result_submissions_challenge_id_fkey         foreign key (challenge_id) references public.challenges(id) on delete cascade,
  constraint match_result_submissions_submitted_by_user_id_fkey foreign key (submitted_by_user_id) references auth.users(id),
  constraint match_result_submissions_submitted_by_player_id_fkey foreign key (submitted_by_player_id) references public.players(id),
  constraint match_result_submissions_opponent_responded_by_fkey foreign key (opponent_responded_by) references auth.users(id),
  constraint match_result_submissions_organiser_reviewed_by_fkey foreign key (organiser_reviewed_by) references auth.users(id)
);
create index        match_result_submissions_challenge_idx     on public.match_result_submissions using btree (challenge_id);
create unique index match_result_submissions_challenge_unique  on public.match_result_submissions using btree (challenge_id) where (challenge_id is not null);
create index        match_result_submissions_league_status_idx on public.match_result_submissions using btree (league_id, status);
create index        match_result_submissions_match_idx         on public.match_result_submissions using btree (match_id);
create unique index match_result_submissions_match_unique      on public.match_result_submissions using btree (match_id) where (match_id is not null);
create index        match_result_submissions_submitter_idx     on public.match_result_submissions using btree (submitted_by_user_id);

-- -----------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS USED BY RLS POLICIES (SQL functions need tables to exist)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_league_role(check_league_id uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members AS lm
    WHERE lm.league_id = check_league_id
      AND lm.user_id = (SELECT auth.uid())
      AND lm.role = ANY(allowed_roles)
  );
$function$;

-- KNOWN ISSUE (minor): executable by anon (always returns false for anon).
CREATE OR REPLACE FUNCTION public.is_league_member(check_league_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.league_members
    where league_id = check_league_id
      and user_id = (select auth.uid())
  );
$function$;

-- -----------------------------------------------------------------------------
-- 5. RPC FUNCTIONS (copied verbatim from live)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_league(p_name text, p_season text DEFAULT '2026 Season'::text)
 RETURNS TABLE(id uuid, name text, season text, invite_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid;
  new_league_id uuid;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'You must be logged in to create a league.';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'League name must be at least 2 characters.';
  end if;

  insert into public.leagues (user_id, name, season)
  values (
    current_user_id,
    trim(p_name),
    coalesce(nullif(trim(p_season), ''), '2026 Season')
  )
  returning leagues.id into new_league_id;

  insert into public.league_members (league_id, user_id, role)
  values (new_league_id, current_user_id, 'owner');

  return query
  select l.id, l.name, l.season, l.invite_code
  from public.leagues l
  where l.id = new_league_id;
end;
$function$;

-- KNOWN ISSUE: automatically creates a NEW linked player profile on join. If an
-- organiser already created a profile for this person, a duplicate results.
CREATE OR REPLACE FUNCTION public.join_league_by_code(code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    target_league_id uuid;
    current_user_id uuid;
    current_user_name text;
    current_user_email text;
BEGIN
    current_user_id := (SELECT auth.uid());

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to join a league.';
    END IF;

    SELECT l.id
    INTO target_league_id
    FROM public.leagues l
    WHERE upper(l.invite_code) = upper(trim(code));

    IF target_league_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation code.';
    END IF;

    SELECT
        COALESCE(
            NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
            NULLIF(trim(u.email), '')
        ),
        u.email
    INTO current_user_name, current_user_email
    FROM auth.users u
    WHERE u.id = current_user_id;

    INSERT INTO public.league_members (league_id, user_id, role)
    VALUES (target_league_id, current_user_id, 'player')
    ON CONFLICT (league_id, user_id) DO NOTHING;

    IF EXISTS (
        SELECT 1
        FROM public.league_members lm
        WHERE lm.league_id = target_league_id
          AND lm.user_id = current_user_id
          AND lm.role = 'player'
    ) THEN
        INSERT INTO public.players (
            league_id,
            user_id,
            name,
            email
        )
        VALUES (
            target_league_id,
            current_user_id,
            current_user_name,
            current_user_email
        )
        ON CONFLICT (league_id, user_id)
        WHERE user_id IS NOT NULL
        DO NOTHING;
    END IF;

    RETURN target_league_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_league_member_role(p_league_id uuid, p_user_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := (SELECT auth.uid());

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF p_new_role NOT IN ('organiser', 'player') THEN
    RAISE EXCEPTION 'Invalid role.';
  END IF;

  IF p_user_id = current_user_id THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = p_league_id
      AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only the league owner can manage member roles.';
  END IF;

  UPDATE public.league_members
  SET role = p_new_role
  WHERE league_id = p_league_id
    AND user_id = p_user_id
    AND role <> 'owner';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or cannot be modified.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_league_member(p_league_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := (SELECT auth.uid());

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF p_user_id = current_user_id THEN
    RAISE EXCEPTION 'You cannot remove yourself as the league owner.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = p_league_id
      AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only the league owner can remove members.';
  END IF;

  DELETE FROM public.league_members
  WHERE league_id = p_league_id
    AND user_id = p_user_id
    AND role <> 'owner';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or cannot be removed.';
  END IF;
END;
$function$;

-- KNOWN ISSUE: does not validate scores against race_to or a winner reaching
-- race_to, and does not check fixture status (e.g. cancelled or finished).
CREATE OR REPLACE FUNCTION public.submit_match_result(p_league_id uuid, p_match_id uuid DEFAULT NULL::uuid, p_challenge_id uuid DEFAULT NULL::uuid, p_home_score integer DEFAULT NULL::integer, p_away_score integer DEFAULT NULL::integer, p_player_statistics jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    current_user_id uuid;
    current_player_id uuid;
    new_submission_id uuid;
BEGIN
    current_user_id := (SELECT auth.uid());

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF (p_match_id IS NULL) = (p_challenge_id IS NULL) THEN
        RAISE EXCEPTION 'Specify exactly one match or challenge.';
    END IF;

    IF p_home_score IS NULL OR p_away_score IS NULL
       OR p_home_score < 0 OR p_away_score < 0 THEN
        RAISE EXCEPTION 'Enter valid match scores.';
    END IF;

    IF NOT public.is_league_member(p_league_id) THEN
        RAISE EXCEPTION 'You are not a member of this league.';
    END IF;

    SELECT id
    INTO current_player_id
    FROM public.players
    WHERE league_id = p_league_id
      AND user_id = current_user_id;

    IF current_player_id IS NULL THEN
        RAISE EXCEPTION 'Your player profile is not linked to this league.';
    END IF;

    IF p_match_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.matches m
            WHERE m.id = p_match_id
              AND m.league_id = p_league_id
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.players p
                      WHERE p.user_id = current_user_id
                        AND p.team_id = m.home_team_id
                        AND p.league_id = p_league_id
                  )
                  OR
                  EXISTS (
                      SELECT 1
                      FROM public.players p
                      WHERE p.user_id = current_user_id
                        AND p.team_id = m.away_team_id
                        AND p.league_id = p_league_id
                  )
              )
        ) THEN
            RAISE EXCEPTION 'You are not a participant in this team match.';
        END IF;
    ELSE
        IF NOT EXISTS (
            SELECT 1
            FROM public.challenges c
            WHERE c.id = p_challenge_id
              AND c.league_id = p_league_id
              AND current_player_id IN (c.player_a_id, c.player_b_id)
        ) THEN
            RAISE EXCEPTION 'You are not a participant in this 1v1 match.';
        END IF;
    END IF;

    INSERT INTO public.match_result_submissions (
        league_id,
        match_id,
        challenge_id,
        submitted_by_user_id,
        submitted_by_player_id,
        home_score,
        away_score,
        player_statistics
    )
    VALUES (
        p_league_id,
        p_match_id,
        p_challenge_id,
        current_user_id,
        current_player_id,
        p_home_score,
        p_away_score,
        COALESCE(p_player_statistics, '{}'::jsonb)
    )
    RETURNING id INTO new_submission_id;

    RETURN new_submission_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_match_result(p_submission_id uuid, p_response text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    current_user_id uuid;
    submission_record record;
    opponent_player_id uuid;
    submitter_team_id uuid;
BEGIN
    current_user_id := (SELECT auth.uid());

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF p_response NOT IN ('confirmed', 'disputed') THEN
        RAISE EXCEPTION 'Response must be confirmed or disputed.';
    END IF;

    SELECT *
    INTO submission_record
    FROM public.match_result_submissions
    WHERE id = p_submission_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result submission not found.';
    END IF;

    IF submission_record.status <> 'pending_confirmation' THEN
        RAISE EXCEPTION 'This result is no longer awaiting confirmation.';
    END IF;

    IF submission_record.submitted_by_user_id = current_user_id THEN
        RAISE EXCEPTION 'You cannot respond to your own submission.';
    END IF;

    IF submission_record.challenge_id IS NOT NULL THEN

        SELECT p.id
        INTO opponent_player_id
        FROM public.players p
        JOIN public.challenges c
          ON c.league_id = p.league_id
        WHERE c.id = submission_record.challenge_id
          AND p.id IN (c.player_a_id, c.player_b_id)
          AND p.user_id = current_user_id
          AND p.id <> submission_record.submitted_by_player_id;

    ELSE

        SELECT p.team_id
        INTO submitter_team_id
        FROM public.players p
        WHERE p.id = submission_record.submitted_by_player_id
          AND p.league_id = submission_record.league_id;

        SELECT p.id
        INTO opponent_player_id
        FROM public.players p
        JOIN public.matches m
          ON m.id = submission_record.match_id
        WHERE p.user_id = current_user_id
          AND p.league_id = submission_record.league_id
          AND p.team_id IN (m.home_team_id, m.away_team_id)
          AND p.team_id <> submitter_team_id
          AND p.id <> submission_record.submitted_by_player_id
        LIMIT 1;

    END IF;

    IF opponent_player_id IS NULL THEN
        RAISE EXCEPTION 'You are not an eligible opponent for this result.';
    END IF;

    UPDATE public.match_result_submissions
    SET
        status = p_response,
        opponent_response = p_response,
        opponent_responded_by = current_user_id,
        opponent_responded_at = now(),
        updated_at = now()
    WHERE id = p_submission_id;

    RETURN p_submission_id;
END;
$function$;

-- KNOWN ISSUES:
--   * 1v1 challenges only (team matches raise an exception).
--   * Fails every approval when challenges.race_to = 0 (the column default).
--   * Validates TOP-LEVEL stat keys, but applies the NESTED player_a/player_b
--     values, which are not validated (negative values would be accepted).
--   * Can approve a submission the opponent never confirmed (pending_confirmation).
--   * Increments players totals in place; there is no reversal or correction path.
CREATE OR REPLACE FUNCTION public.organiser_review_match_result(p_submission_id uuid, p_decision text, p_corrected_score_a integer DEFAULT NULL::integer, p_corrected_score_b integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_submission public.match_result_submissions%ROWTYPE;
    v_challenge public.challenges%ROWTYPE;
    v_score_a integer;
    v_score_b integer;
    v_stats jsonb;
    v_winner_id uuid;
    v_loser_id uuid;
    v_player_a_stats jsonb;
    v_player_b_stats jsonb;
    v_stat_key text;
    v_stat_value integer;
BEGIN
    v_user_id := (SELECT auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Decision must be approved or rejected.';
    END IF;

    SELECT *
    INTO v_submission
    FROM public.match_result_submissions
    WHERE id = p_submission_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result submission not found.';
    END IF;

    IF NOT public.has_league_role(
        v_submission.league_id,
        ARRAY['owner', 'organiser']::text[]
    ) THEN
        RAISE EXCEPTION 'Only league owners and organisers can review results.';
    END IF;

    IF v_submission.challenge_id IS NULL THEN
        RAISE EXCEPTION 'This function currently supports 1v1 challenges only.';
    END IF;

    IF v_submission.status IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'This submission has already been reviewed.';
    END IF;

    SELECT *
    INTO v_challenge
    FROM public.challenges
    WHERE id = v_submission.challenge_id
      AND league_id = v_submission.league_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found.';
    END IF;

    IF v_challenge.player_a_id IS NULL
       OR v_challenge.player_b_id IS NULL
       OR v_challenge.player_a_id = v_challenge.player_b_id THEN
        RAISE EXCEPTION 'Challenge must have two different registered players.';
    END IF;

    v_score_a := COALESCE(p_corrected_score_a, v_submission.home_score);
    v_score_b := COALESCE(p_corrected_score_b, v_submission.away_score);

    IF v_score_a < 0 OR v_score_b < 0 THEN
        RAISE EXCEPTION 'Scores cannot be negative.';
    END IF;

    IF p_decision = 'rejected' THEN
        UPDATE public.match_result_submissions
        SET status = 'rejected',
            organiser_reviewed_by = v_user_id,
            organiser_reviewed_at = now(),
            organiser_notes = p_notes,
            updated_at = now()
        WHERE id = p_submission_id;

        RETURN p_submission_id;
    END IF;

    IF v_score_a = v_score_b THEN
        RAISE EXCEPTION 'A 1v1 result cannot be a draw.';
    END IF;

    IF v_challenge.race_to IS NOT NULL
       AND (v_score_a > v_challenge.race_to
            OR v_score_b > v_challenge.race_to) THEN
        RAISE EXCEPTION 'A score cannot exceed the race-to value.';
    END IF;

    v_stats := COALESCE(v_submission.player_statistics, '{}'::jsonb);

    IF jsonb_typeof(v_stats) <> 'object' THEN
        RAISE EXCEPTION 'Player statistics must be a JSON object.';
    END IF;

    FOREACH v_stat_key IN ARRAY ARRAY[
        'golden_breaks',
        'run_out_bnf',
        'dry_breaks',
        'successful_breaks',
        'pots_made',
        'shots_taken'
    ]
    LOOP
        IF v_stats ? v_stat_key THEN
            IF jsonb_typeof(v_stats -> v_stat_key) <> 'number' THEN
                RAISE EXCEPTION 'Statistic % must be a number.', v_stat_key;
            END IF;

            v_stat_value := (v_stats ->> v_stat_key)::integer;

            IF v_stat_value < 0
               OR (v_stats ->> v_stat_key)::numeric <> v_stat_value THEN
                RAISE EXCEPTION 'Statistic % must be a non-negative whole number.', v_stat_key;
            END IF;
        END IF;
    END LOOP;

    v_player_a_stats := COALESCE(v_stats -> 'player_a', '{}'::jsonb);
    v_player_b_stats := COALESCE(v_stats -> 'player_b', '{}'::jsonb);

    IF jsonb_typeof(v_player_a_stats) <> 'object'
       OR jsonb_typeof(v_player_b_stats) <> 'object' THEN
        RAISE EXCEPTION 'Player-specific statistics must be JSON objects.';
    END IF;

    v_winner_id := CASE
        WHEN v_score_a > v_score_b THEN v_challenge.player_a_id
        ELSE v_challenge.player_b_id
    END;

    v_loser_id := CASE
        WHEN v_score_a > v_score_b THEN v_challenge.player_b_id
        ELSE v_challenge.player_a_id
    END;

    UPDATE public.players
    SET played = COALESCE(played, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN id = v_winner_id THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN id = v_loser_id THEN 1 ELSE 0 END,
        frames_won = COALESCE(frames_won, 0) +
            CASE WHEN id = v_challenge.player_a_id THEN v_score_a ELSE v_score_b END,
        frames_lost = COALESCE(frames_lost, 0) +
            CASE WHEN id = v_challenge.player_a_id THEN v_score_b ELSE v_score_a END,
        golden_breaks = COALESCE(golden_breaks, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'golden_breaks')::integer, 0),
        run_out_bnf = COALESCE(run_out_bnf, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'run_out_bnf')::integer, 0),
        dry_breaks = COALESCE(dry_breaks, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'dry_breaks')::integer, 0),
        successful_breaks = COALESCE(successful_breaks, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'successful_breaks')::integer, 0),
        pots_made = COALESCE(pots_made, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'pots_made')::integer, 0),
        shots_taken = COALESCE(shots_taken, 0) +
            COALESCE((CASE WHEN id = v_challenge.player_a_id
                THEN v_player_a_stats ELSE v_player_b_stats END ->> 'shots_taken')::integer, 0),
        form = COALESCE(form, '[]'::jsonb) ||
            jsonb_build_array(CASE WHEN id = v_winner_id THEN 'W' ELSE 'L' END)
    WHERE id IN (v_challenge.player_a_id, v_challenge.player_b_id)
      AND league_id = v_submission.league_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player profiles could not be updated.';
    END IF;

    UPDATE public.challenges
    SET score_a = v_score_a,
        score_b = v_score_b,
        status = 'Finished'
    WHERE id = v_challenge.id;

    UPDATE public.match_result_submissions
    SET status = 'approved',
        organiser_reviewed_by = v_user_id,
        organiser_reviewed_at = now(),
        organiser_notes = p_notes,
        updated_at = now()
    WHERE id = p_submission_id;

    RETURN p_submission_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. FUNCTION EXECUTE PRIVILEGES (exactly as observed on live)
-- -----------------------------------------------------------------------------
revoke all on function public.generate_league_invite_code() from public, anon, authenticated;
revoke all on function public.has_league_role(uuid, text[]) from public, anon, authenticated;
revoke all on function public.is_league_member(uuid) from public, anon, authenticated;
revoke all on function public.create_league(text, text) from public, anon, authenticated;
revoke all on function public.join_league_by_code(text) from public, anon, authenticated;
revoke all on function public.update_league_member_role(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.remove_league_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.submit_match_result(uuid, uuid, uuid, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.respond_to_match_result(uuid, text) from public, anon, authenticated;
revoke all on function public.organiser_review_match_result(uuid, text, integer, integer, text) from public, anon, authenticated;

grant execute on function public.generate_league_invite_code() to public, anon, authenticated, service_role;
grant execute on function public.has_league_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.is_league_member(uuid) to anon, authenticated, service_role;
grant execute on function public.create_league(text, text) to authenticated, service_role;
grant execute on function public.join_league_by_code(text) to authenticated, service_role;
grant execute on function public.update_league_member_role(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.submit_match_result(uuid, uuid, uuid, integer, integer, jsonb) to authenticated, service_role;
grant execute on function public.respond_to_match_result(uuid, text) to authenticated, service_role;
grant execute on function public.organiser_review_match_result(uuid, text, integer, integer, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. TABLE PRIVILEGES (exactly as observed on live for anon / authenticated)
-- -----------------------------------------------------------------------------
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, so everything is revoked first and the observed privileges re-granted.
revoke all on table
  public.leagues, public.league_members, public.teams, public.venues,
  public.players, public.matches, public.challenges, public.subscriptions,
  public.match_result_submissions
from anon, authenticated;

-- KNOWN SECURITY ISSUE — MAINTAIN replicated deliberately from live, requires a
-- later security review: live's raw table ACLs (pg_class.relacl, export v2)
-- show the PostgreSQL 17 MAINTAIN privilege ("m") for authenticated on all 9
-- tables, and for anon on subscriptions. information_schema does not report
-- MAINTAIN, which is why it was missing from the first export. MAINTAIN allows
-- VACUUM, ANALYZE, CLUSTER, REINDEX, REFRESH MATERIALIZED VIEW and LOCK TABLE.
-- The Data API cannot issue these commands, so it is not reachable through the
-- app today, but it is broader than needed. It is granted here ONLY so staging
-- matches live exactly; removing it must be a separate, approved migration.
grant select, update, delete, maintain         on table public.leagues                  to authenticated;
grant select, maintain                         on table public.league_members           to authenticated;
grant select, insert, update, delete, maintain on table public.teams                    to authenticated;
grant select, insert, update, delete, maintain on table public.venues                   to authenticated;
grant select, insert, update, delete, maintain on table public.players                  to authenticated;
grant select, insert, update, delete, maintain on table public.matches                  to authenticated;
grant select, insert, update, delete, maintain on table public.challenges               to authenticated;
grant select, references, trigger, maintain    on table public.match_result_submissions to authenticated;

-- KNOWN SECURITY ISSUE — reproduced deliberately, to be fixed by a later
-- approved migration: anon and authenticated hold every table privilege on
-- subscriptions, including TRUNCATE (which bypasses RLS). Today RLS (SELECT-own
-- policy only) and the Data API (which cannot issue TRUNCATE) prevent misuse,
-- but the grant should be reduced to SELECT for authenticated only.
-- Also includes MAINTAIN (see the MAINTAIN note above), as on live.
grant select, insert, update, delete, truncate, references, trigger, maintain
  on table public.subscriptions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (enabled, not forced, on all 9 tables)
-- -----------------------------------------------------------------------------
alter table public.leagues                  enable row level security;
alter table public.league_members           enable row level security;
alter table public.teams                    enable row level security;
alter table public.venues                   enable row level security;
alter table public.players                  enable row level security;
alter table public.matches                  enable row level security;
alter table public.challenges               enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.match_result_submissions enable row level security;

-- -----------------------------------------------------------------------------
-- 9. POLICIES (17, all PERMISSIVE, all for role authenticated)
-- -----------------------------------------------------------------------------

-- leagues
-- (No DELETE policy, so the DELETE grant has no effect. No INSERT grant, so the
-- INSERT policy is only reachable through create_league.)
create policy "Users can view leagues they belong to" on public.leagues
  as permissive for select to authenticated
  using (((user_id = ( select auth.uid() as uid)) or public.is_league_member(id)));

create policy "Users can create their own leagues" on public.leagues
  as permissive for insert to authenticated
  with check ((user_id = ( select auth.uid() as uid)));

create policy "Owners can update their leagues" on public.leagues
  as permissive for update to authenticated
  using ((user_id = ( select auth.uid() as uid)))
  with check ((user_id = ( select auth.uid() as uid)));

-- league_members
-- INCONSISTENCY: organisers cannot see the member list (owners only).
create policy "Users can view their own memberships" on public.league_members
  as permissive for select to authenticated
  using ((user_id = ( select auth.uid() as uid)));

create policy "Owners can view league members" on public.league_members
  as permissive for select to authenticated
  using (public.has_league_role(league_id, array['owner'::text]));

-- teams
create policy "Members can view league teams" on public.teams
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

create policy "Owners and organisers manage league teams" on public.teams
  as permissive for all to authenticated
  using (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]))
  with check (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]));

-- venues
create policy "Members can view league venues" on public.venues
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

create policy "Owners and organisers manage league venues" on public.venues
  as permissive for all to authenticated
  using (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]))
  with check (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]));

-- players
create policy "Members can view league players" on public.players
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

create policy "Owners and organisers manage league players" on public.players
  as permissive for all to authenticated
  using (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]))
  with check (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]));

-- matches
create policy "Members can view league matches" on public.matches
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

create policy "Owners and organisers manage league matches" on public.matches
  as permissive for all to authenticated
  using (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]))
  with check (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]));

-- challenges
create policy "Members can view league challenges" on public.challenges
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

create policy "Owners and organisers manage league challenges" on public.challenges
  as permissive for all to authenticated
  using (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]))
  with check (public.has_league_role(league_id, array['owner'::text, 'organiser'::text]));

-- subscriptions
-- (Uses auth.uid() directly rather than (select auth.uid()), unlike the other
-- policies — a minor performance inconsistency, reproduced as-is.)
create policy "Users can view their own subscriptions" on public.subscriptions
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- match_result_submissions (writes only via SECURITY DEFINER RPCs)
create policy "Members can view league result submissions" on public.match_result_submissions
  as permissive for select to authenticated
  using (public.is_league_member(league_id));

commit;

-- =============================================================================
-- END OF BASELINE. After running on staging, re-run the read-only
-- introspection query on staging and compare its output with the live export.
-- =============================================================================

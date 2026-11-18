// Database permission tests for league member visibility and management.
// Runs the real baseline, staging seed and migration 0001 in an in-memory
// PostgreSQL (PGlite). No network; never touches staging or live.
import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildDb, asUser, leagueId, userId, MIGRATION_0001 } from '../helpers/db.js';

const countMembers = (db, league) =>
  db.query('select count(*)::int as n from public.league_members where league_id = $1', [league]).then(r => r.rows[0].n);

describe('before migration 0001 (current live/staging behaviour)', () => {
  let db, la;
  before(async () => { db = await buildDb(); la = await leagueId(db, 'seed:A:league'); });

  test('organiser can read only their own membership row (the reported bug)', async () => {
    assert.equal(await asUser(db, 'organiser', tx => countMembers(tx, la)), 1);
  });
  test('owner can read all 4 League A members', async () => {
    assert.equal(await asUser(db, 'owner', tx => countMembers(tx, la)), 4);
  });
});

describe('after migration 0001', () => {
  let db, la, lb;
  before(async () => {
    db = await buildDb({ migrations: [MIGRATION_0001] });
    la = await leagueId(db, 'seed:A:league');
    lb = await leagueId(db, 'seed:B:league');
  });

  test('the new policy exists once: SELECT-only, permissive, for authenticated', async () => {
    const { rows } = await db.query(`select cmd, permissive, roles::text as roles, qual from pg_policies
      where schemaname = 'public' and tablename = 'league_members' and policyname = 'Organisers can view league members'`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cmd, 'SELECT');
    assert.equal(rows[0].permissive, 'PERMISSIVE');
    assert.equal(rows[0].roles, '{authenticated}');
    assert.match(rows[0].qual, /has_league_role\(league_id, ARRAY\['organiser'::text\]\)/);
  });

  test('existing league_members policies are unchanged (3 policies total)', async () => {
    const { rows } = await db.query(`select policyname from pg_policies
      where schemaname = 'public' and tablename = 'league_members' order by policyname`);
    assert.deepEqual(rows.map(r => r.policyname), [
      'Organisers can view league members', 'Owners can view league members', 'Users can view their own memberships'
    ]);
  });

  // Visibility matrix: [user, League A rows visible, League B rows visible]
  for (const [user, a, b] of [
    ['owner', 4, 0],
    ['organiser', 4, 0],
    ['player.a', 1, 0],
    ['player.b', 1, 0],
    ['outsider', 0, 1]
  ]) {
    test(`${user} sees ${a} League A member row(s) and ${b} League B row(s)`, async () => {
      assert.deepEqual(await asUser(db, user, async tx => [await countMembers(tx, la), await countMembers(tx, lb)]), [a, b]);
    });
  }

  test('organiser sees the correct roles for all 4 League A members', async () => {
    const roles = await asUser(db, 'organiser', async tx =>
      (await tx.query('select role from public.league_members where league_id = $1 order by role', [la])).rows.map(r => r.role));
    assert.deepEqual(roles, ['organiser', 'owner', 'player', 'player']);
  });

  test('organiser still cannot change member roles (owner-only RPC)', async () => {
    const pa = await userId(db, 'player.a');
    await assert.rejects(
      asUser(db, 'organiser', tx => tx.query("select public.update_league_member_role($1, $2, 'organiser')", [la, pa])),
      /Only the league owner can manage member roles/);
  });

  test('organiser still cannot remove members (owner-only RPC)', async () => {
    const pa = await userId(db, 'player.a');
    await assert.rejects(
      asUser(db, 'organiser', tx => tx.query('select public.remove_league_member($1, $2)', [la, pa])),
      /Only the league owner can remove members/);
  });

  test('organiser cannot write league_members directly (no INSERT/UPDATE/DELETE privilege)', async () => {
    const pa = await userId(db, 'player.a');
    await assert.rejects(asUser(db, 'organiser', tx =>
      tx.query("update public.league_members set role = 'organiser' where league_id = $1 and user_id = $2", [la, pa])), /permission denied/);
    await assert.rejects(asUser(db, 'organiser', tx =>
      tx.query('delete from public.league_members where league_id = $1 and user_id = $2', [la, pa])), /permission denied/);
    await assert.rejects(asUser(db, 'organiser', tx =>
      tx.query("insert into public.league_members (league_id, user_id, role) values ($1, $2, 'player')", [lb, pa])), /permission denied/);
  });

  test('player cannot change roles or remove members', async () => {
    const pb = await userId(db, 'player.b');
    await assert.rejects(asUser(db, 'player.a', tx =>
      tx.query("select public.update_league_member_role($1, $2, 'organiser')", [la, pb])), /Only the league owner/);
    await assert.rejects(asUser(db, 'player.a', tx =>
      tx.query('select public.remove_league_member($1, $2)', [la, pb])), /Only the league owner/);
  });

  test('owner can still change a member role (rolled back afterwards)', async () => {
    const pa = await userId(db, 'player.a');
    const role = await asUser(db, 'owner', async tx => {
      await tx.query("select public.update_league_member_role($1, $2, 'organiser')", [la, pa]);
      return (await tx.query('select role from public.league_members where league_id = $1 and user_id = $2', [la, pa])).rows[0].role;
    });
    assert.equal(role, 'organiser');
  });

  test('owner can still remove a member (rolled back afterwards)', async () => {
    const pb = await userId(db, 'player.b');
    const remaining = await asUser(db, 'owner', async tx => {
      await tx.query('select public.remove_league_member($1, $2)', [la, pb]);
      return countMembers(tx, la);
    });
    assert.equal(remaining, 3);
  });

  test('rolled-back test actions left the data unchanged', async () => {
    assert.equal(await countMembers(db, la), 4);
  });

  test('running the migration again is refused and changes nothing', async () => {
    await assert.rejects(db.exec(MIGRATION_0001), /policy already exists/);
    await db.exec('rollback').catch(() => {});
    const { rows } = await db.query(`select count(*)::int as n from pg_policies
      where schemaname = 'public' and tablename = 'league_members'`);
    assert.equal(rows[0].n, 3);
  });
});

describe('migration 0001 rollback', () => {
  test('dropping the policy restores the previous behaviour (organiser sees 1)', async () => {
    const db = await buildDb({ migrations: [MIGRATION_0001] });
    const la = await leagueId(db, 'seed:A:league');
    assert.equal(await asUser(db, 'organiser', tx => countMembers(tx, la)), 4);
    await db.exec('drop policy "Organisers can view league members" on public.league_members;');
    assert.equal(await asUser(db, 'organiser', tx => countMembers(tx, la)), 1);
    assert.equal(await asUser(db, 'owner', tx => countMembers(tx, la)), 4);
  });
});

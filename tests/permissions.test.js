// Unit tests for the UI permission rules in src/permissions.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewLeagueMembers, canManageLeagueMembers } from '../src/permissions.js';

test('owners and organisers can view the member list', () => {
  assert.equal(canViewLeagueMembers('owner'), true);
  assert.equal(canViewLeagueMembers('organiser'), true);
});

test('players, unknown roles and missing roles cannot view the member list', () => {
  for (const role of ['player', 'Owner', 'admin', '', null, undefined]) {
    assert.equal(canViewLeagueMembers(role), false, `role ${JSON.stringify(role)}`);
  }
});

test('only owners can manage members (change roles / remove)', () => {
  assert.equal(canManageLeagueMembers('owner'), true);
  for (const role of ['organiser', 'player', 'Owner', '', null, undefined]) {
    assert.equal(canManageLeagueMembers(role), false, `role ${JSON.stringify(role)}`);
  }
});

test('anyone who can manage members can also view them', () => {
  for (const role of ['owner', 'organiser', 'player', null]) {
    if (canManageLeagueMembers(role)) assert.equal(canViewLeagueMembers(role), true);
  }
});

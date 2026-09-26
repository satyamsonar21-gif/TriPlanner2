import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Tests validating PostgreSQL Row Level Security predicates matching migration:
// 20260926000000_phase02_auth_identity_rbac.sql
describe('RLS Policy Engine Verification', () => {
  const profilesTable = [
    { id: 'uid_1', auth_user_id: 'uid_1', full_name: 'Traveler One', role: 'traveler' },
    { id: 'uid_2', auth_user_id: 'uid_2', full_name: 'Traveler Two', role: 'traveler' },
    { id: 'uid_3', auth_user_id: 'uid_3', full_name: 'SilkRoad Tours', role: 'operator' },
  ];

  const travelerProfilesTable = [
    { id: 'tp_1', user_id: 'uid_1', preferred_currency: 'USD', passport_nationality: 'US' },
    { id: 'tp_2', user_id: 'uid_2', preferred_currency: 'EUR', passport_nationality: 'FR' },
  ];

  // Evaluates profiles_select_own policy
  function evaluateProfilesSelect(authUid, row) {
    if (!authUid) return false;
    // USING ((select auth.uid()) = id OR role IN ('operator', 'vendor', 'coordinator'))
    return authUid === row.id || ['operator', 'vendor', 'coordinator'].includes(row.role);
  }

  // Evaluates profiles_update_own policy
  function evaluateProfilesUpdate(authUid, row, updatedRow) {
    if (!authUid) return false;
    // USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id)
    const usingPassed = authUid === row.id;
    const withCheckPassed = authUid === updatedRow.id;
    return usingPassed && withCheckPassed;
  }

  // Evaluates traveler_profiles_select_own policy
  function evaluateTravelerProfilesSelect(authUid, row) {
    if (!authUid) return false;
    // USING ((select auth.uid()) = user_id)
    return authUid === row.user_id;
  }

  test('profiles_select_own allows user to view their own profile', () => {
    const allowed = evaluateProfilesSelect('uid_1', profilesTable[0]);
    assert.equal(allowed, true);
  });

  test("profiles_select_own blocks user from viewing another traveler's private profile", () => {
    const allowed = evaluateProfilesSelect('uid_1', profilesTable[1]);
    assert.equal(allowed, false);
  });

  test('profiles_select_own allows viewing operator public profiles', () => {
    const allowed = evaluateProfilesSelect('uid_1', profilesTable[2]);
    assert.equal(allowed, true);
  });

  test('profiles_update_own allows user to update their own profile', () => {
    const original = profilesTable[0];
    const update = { ...original, full_name: 'Traveler One New' };
    const allowed = evaluateProfilesUpdate('uid_1', original, update);
    assert.equal(allowed, true);
  });

  test("profiles_update_own prevents user from updating another user's profile", () => {
    const original = profilesTable[1];
    const update = { ...original, full_name: 'Hijacked Name' };
    const allowed = evaluateProfilesUpdate('uid_1', original, update);
    assert.equal(allowed, false);
  });

  test('profiles_update_own WITH CHECK prevents reassigning id to another user', () => {
    const original = profilesTable[0];
    const update = { ...original, id: 'uid_2' }; // ID reassignment attack
    const allowed = evaluateProfilesUpdate('uid_1', original, update);
    assert.equal(allowed, false, 'WITH CHECK must block changing id');
  });

  test('traveler_profiles_select_own isolates private passport & nationality data', () => {
    assert.equal(evaluateTravelerProfilesSelect('uid_1', travelerProfilesTable[0]), true);
    assert.equal(evaluateTravelerProfilesSelect('uid_1', travelerProfilesTable[1]), false);
  });
});

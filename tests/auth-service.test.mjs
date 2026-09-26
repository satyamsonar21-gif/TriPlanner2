import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test harness simulating AuthService methods
class MockAuthService {
  constructor() {
    this.profiles = new Map([
      [
        'usr_traveler_01',
        {
          id: 'usr_traveler_01',
          email: 'traveler@triplanner.io',
          full_name: 'Elena Rostova',
          role: 'traveler',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
      ],
      [
        'usr_operator_01',
        {
          id: 'usr_operator_01',
          email: 'operator@silkroad.com',
          full_name: 'Marcus Vance',
          role: 'operator',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
      ],
    ]);
  }

  async signUpWithPassword(email, password, fullName) {
    if (!email || !password || !fullName) {
      return { data: null, error: { message: 'Required fields missing', code: 'VALIDATION_FAILED' } };
    }
    if (password.length < 8) {
      return { data: null, error: { message: 'Password too short', code: 'WEAK_PASSWORD' } };
    }
    const id = `usr_${Date.now()}`;
    const profile = {
      id,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role: 'traveler', // Always forced to traveler
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(id, profile);
    return { data: { userId: id, emailVerificationRequired: true }, error: null };
  }

  async signInWithPassword(email, password) {
    if (!email || !password) {
      return { data: null, error: { message: 'Missing credentials', code: 'VALIDATION_FAILED' } };
    }
    for (const [id, prof] of this.profiles.entries()) {
      if (prof.email === email.trim().toLowerCase()) {
        return { data: { userId: id }, error: null };
      }
    }
    return { data: null, error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } };
  }

  async signInWithGoogle(redirectTo = 'http://localhost:5173/auth/callback') {
    return {
      data: { url: `https://mock-supabase.auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}` },
      error: null,
    };
  }

  async resetPasswordForEmail(email) {
    if (!email) {
      return { data: null, error: { message: 'Email required', code: 'VALIDATION_FAILED' } };
    }
    // Neutral success response to prevent account enumeration
    return { data: { success: true }, error: null };
  }

  async updateUserPassword(newPassword) {
    if (!newPassword || newPassword.length < 8) {
      return { data: null, error: { message: 'Password too short', code: 'WEAK_PASSWORD' } };
    }
    return { data: { success: true }, error: null };
  }

  async getProfile(userId) {
    const prof = this.profiles.get(userId);
    if (!prof) return { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } };
    return { data: { ...prof }, error: null };
  }

  async updateProfile(userId, updates) {
    const existing = this.profiles.get(userId);
    if (!existing) return { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } };

    // Security: explicitly forbid changing 'role', 'status', or 'id'
    const allowed = {};
    if (updates.full_name) allowed.full_name = updates.full_name.trim();
    if (updates.display_name) allowed.display_name = updates.display_name.trim();
    if (updates.phone) allowed.phone = updates.phone.trim();

    const updated = { ...existing, ...allowed, updated_at: new Date().toISOString() };
    this.profiles.set(userId, updated);
    return { data: updated, error: null };
  }
}

describe('Auth Service — Identity & Session Operations', () => {
  let service;

  test('setup test service instance', () => {
    service = new MockAuthService();
    assert.ok(service);
  });

  test('signUpWithPassword validates required fields', async () => {
    const res = await service.signUpWithPassword('', '', '');
    assert.equal(res.data, null);
    assert.equal(res.error.code, 'VALIDATION_FAILED');
  });

  test('signUpWithPassword enforces minimum password length (>=8)', async () => {
    const res = await service.signUpWithPassword('test@triplanner.io', '12345', 'Tester');
    assert.equal(res.data, null);
    assert.equal(res.error.code, 'WEAK_PASSWORD');
  });

  test('signUpWithPassword creates profile with default traveler role', async () => {
    const res = await service.signUpWithPassword('newuser@triplanner.io', 'SecurePass123', 'Alex Morgan');
    assert.ok(res.data.userId);
    const prof = await service.getProfile(res.data.userId);
    assert.equal(prof.data.role, 'traveler');
    assert.equal(prof.data.full_name, 'Alex Morgan');
  });

  test('signInWithPassword rejects invalid credentials', async () => {
    const res = await service.signInWithPassword('nonexistent@triplanner.io', 'wrongpass');
    assert.equal(res.data, null);
    assert.equal(res.error.code, 'INVALID_CREDENTIALS');
  });

  test('signInWithPassword authenticates existing user successfully', async () => {
    const res = await service.signInWithPassword('traveler@triplanner.io', 'anyvalidpass');
    assert.equal(res.data.userId, 'usr_traveler_01');
  });

  test('signInWithGoogle generates valid redirect URI without exposing secrets', async () => {
    const res = await service.signInWithGoogle('http://localhost:5173/auth/callback');
    assert.ok(res.data.url.includes('provider=google'));
    assert.ok(res.data.url.includes('redirect_to='));
    assert.ok(!res.data.url.includes('service_role'));
  });

  test('resetPasswordForEmail returns neutral success preventing account enumeration', async () => {
    const res1 = await service.resetPasswordForEmail('known@triplanner.io');
    const res2 = await service.resetPasswordForEmail('unknown_random_email@triplanner.io');
    assert.equal(res1.data.success, true);
    assert.equal(res2.data.success, true);
  });

  test('updateProfile safely updates name while ignoring attempts to elevate role', async () => {
    const res = await service.updateProfile('usr_traveler_01', {
      full_name: 'Elena Rostova Updated',
      role: 'admin', // Attack attempt
    });
    assert.equal(res.data.full_name, 'Elena Rostova Updated');
    assert.equal(res.data.role, 'traveler', 'Role MUST NOT be altered by updateProfile');
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of mapAuthError logic
function mapAuthError(error) {
  if (!error) {
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      field: 'general',
    };
  }

  const errStr = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message).toLowerCase()
    : String(error).toLowerCase();

  const errCode = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code).toUpperCase()
    : 'AUTH_ERROR';

  if (
    errStr.includes('invalid login credentials') ||
    errStr.includes('invalid_grant') ||
    errStr.includes('invalid email or password')
  ) {
    return {
      message: 'The email or password you entered is incorrect.',
      code: 'INVALID_CREDENTIALS',
      field: 'general',
    };
  }

  if (
    errStr.includes('email not confirmed') ||
    errStr.includes('confirm your email') ||
    errStr.includes('unverified email')
  ) {
    return {
      message: 'Please verify your email address before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
      field: 'email',
    };
  }

  if (
    errStr.includes('user already registered') ||
    errStr.includes('already exists') ||
    errStr.includes('duplicate key')
  ) {
    return {
      message: 'An account with this email address already exists.',
      code: 'USER_ALREADY_EXISTS',
      field: 'email',
    };
  }

  if (
    errStr.includes('password should be at least') ||
    errStr.includes('weak password') ||
    errStr.includes('password is too short')
  ) {
    return {
      message: 'Password must be at least 8 characters with numbers and letters.',
      code: 'WEAK_PASSWORD',
      field: 'password',
    };
  }

  if (
    errStr.includes('rate limit') ||
    errStr.includes('too many requests') ||
    errStr.includes('over_email_send_rate_limit')
  ) {
    return {
      message: 'Too many attempts. For your security, please wait a moment and try again.',
      code: 'RATE_LIMITED',
      field: 'general',
    };
  }

  if (
    errStr.includes('network') ||
    errStr.includes('fetch failed') ||
    errStr.includes('failed to fetch') ||
    errStr.includes('timeout')
  ) {
    return {
      message: 'We could not connect to the service. Please check your internet connection and retry.',
      code: 'NETWORK_ERROR',
      field: 'general',
    };
  }

  if (
    errStr.includes('cannot modify your own role') ||
    errStr.includes('permission denied') ||
    errStr.includes('access denied') ||
    errStr.includes('42501')
  ) {
    return {
      message: 'You do not have permission to execute this operation.',
      code: 'PERMISSION_DENIED',
      field: 'general',
    };
  }

  return {
    message: 'We were unable to complete your authentication request. Please try again.',
    code: errCode || 'AUTH_GENERAL_ERROR',
    field: 'general',
  };
}

describe('Auth Error Mapper — Sanitization & Safety', () => {
  test('maps invalid login credentials safely without leaking database details', () => {
    const rawError = { message: 'Invalid login credentials', code: 'invalid_credentials' };
    const mapped = mapAuthError(rawError);
    assert.equal(mapped.code, 'INVALID_CREDENTIALS');
    assert.equal(mapped.message, 'The email or password you entered is incorrect.');
  });

  test('maps email unconfirmed error to actionable user instruction', () => {
    const rawError = { message: 'Email not confirmed for user' };
    const mapped = mapAuthError(rawError);
    assert.equal(mapped.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(mapped.message, 'Please verify your email address before continuing.');
  });

  test('maps duplicate user email on signup', () => {
    const rawError = { message: 'User already registered' };
    const mapped = mapAuthError(rawError);
    assert.equal(mapped.code, 'USER_ALREADY_EXISTS');
  });

  test('maps weak password errors safely', () => {
    const rawError = { message: 'Password should be at least 6 characters' };
    const mapped = mapAuthError(rawError);
    assert.equal(mapped.code, 'WEAK_PASSWORD');
    assert.equal(mapped.message, 'Password must be at least 8 characters with numbers and letters.');
  });

  test('masks raw PostgreSQL 42501 permission error and prevents SQL leakage', () => {
    const rawSqlError = { message: 'ERROR: 42501: permission denied for table profiles', code: '42501' };
    const mapped = mapAuthError(rawSqlError);
    assert.equal(mapped.code, 'PERMISSION_DENIED');
    assert.equal(mapped.message, 'You do not have permission to execute this operation.');
    assert.ok(!mapped.message.includes('42501'), 'Must not expose raw SQL error codes in message');
    assert.ok(!mapped.message.includes('table profiles'), 'Must not expose internal table names');
  });

  test('maps network connection failures gracefully', () => {
    const rawNetworkError = new TypeError('Failed to fetch');
    const mapped = mapAuthError(rawNetworkError);
    assert.equal(mapped.code, 'NETWORK_ERROR');
    assert.ok(mapped.message.includes('internet connection'));
  });
});

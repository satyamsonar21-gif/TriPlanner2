/**
 * Centralized Authentication & Authorization Error Mapper
 * Converts raw Supabase / PostgreSQL / Network errors into user-friendly, security-safe messages.
 * Never leaks database identifiers, stack traces, or internal error payloads to clients.
 */

export interface FormattedAuthError {
  message: string;
  code: string;
  field?: 'email' | 'password' | 'confirmPassword' | 'fullName' | 'general';
}

export function mapAuthError(error: unknown): FormattedAuthError {
  if (!error) {
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      field: 'general',
    };
  }

  const errStr = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message).toLowerCase()
    : String(error).toLowerCase();

  const errCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code).toUpperCase()
    : 'AUTH_ERROR';

  // 1. Invalid credentials
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

  // 2. Email verification required
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

  // 3. User already exists / duplicate email
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

  // 4. Weak password / password requirements
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

  // 5. Rate limit exceeded / too many requests
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

  // 6. Network failure / connection issues
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

  // 7. Expired or invalid token / session
  if (
    errStr.includes('token has expired') ||
    errStr.includes('token is invalid') ||
    errStr.includes('session expired') ||
    errStr.includes('jwt expired')
  ) {
    return {
      message: 'Your verification or reset link has expired. Please request a new one.',
      code: 'TOKEN_EXPIRED',
      field: 'general',
    };
  }

  // 8. Permission / Role elevation attempt
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

  // 9. Account suspended or deactivated
  if (
    errStr.includes('account suspended') ||
    errStr.includes('account deactivated')
  ) {
    return {
      message: 'This account has been suspended or deactivated. Please contact support.',
      code: 'ACCOUNT_SUSPENDED',
      field: 'general',
    };
  }

  // Fallback sanitized message
  return {
    message: 'We were unable to complete your authentication request. Please try again.',
    code: errCode || 'AUTH_GENERAL_ERROR',
    field: 'general',
  };
}

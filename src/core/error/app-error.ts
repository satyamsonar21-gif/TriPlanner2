/**
 * Standardized Application Error Domain
 * Maps technical exceptions to user-friendly, security-safe UI errors.
 */

export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly originalError?: unknown;

  constructor(
    userMessage: string,
    category: ErrorCategory = 'UNKNOWN',
    statusCode: number = 500,
    originalError?: unknown
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.category = category;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintain prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public static validation(message: string): AppError {
    return new AppError(message, 'VALIDATION', 400);
  }

  public static authentication(
    message: string = 'Please sign in to continue.'
  ): AppError {
    return new AppError(message, 'AUTHENTICATION', 401);
  }

  public static authorization(
    message: string = 'You do not have permission to access this operational area.'
  ): AppError {
    return new AppError(message, 'AUTHORIZATION', 403);
  }

  public static notFound(
    resourceName: string = 'The requested journey or resource'
  ): AppError {
    return new AppError(`${resourceName} could not be found.`, 'NOT_FOUND', 404);
  }

  public static conflict(message: string): AppError {
    return new AppError(message, 'CONFLICT', 409);
  }

  public static network(
    message: string = 'Network connection issue. Please check your internet connection and retry.'
  ): AppError {
    return new AppError(message, 'NETWORK', 503);
  }

  public static fromUnknown(
    err: unknown,
    fallbackMessage: string = "We couldn't process your request. Your itinerary remains safe and unchanged."
  ): AppError {
    if (err instanceof AppError) return err;

    // Log internally for debugging, never expose raw tech stacks to users
    if (import.meta.env.DEV) {
      console.error('[Internal Execution Exception]:', err);
    }

    return new AppError(fallbackMessage, 'UNKNOWN', 500, err);
  }
}

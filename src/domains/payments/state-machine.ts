import type { PaymentState } from './types';

/**
 * PHASE 07 — DETERMINISTIC PAYMENT STATE MACHINE
 */

export const VALID_PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ['PENDING', 'CANCELLED', 'EXPIRED'],
  PENDING: ['PROCESSING', 'FAILED', 'CANCELLED', 'EXPIRED'],
  PROCESSING: ['SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export class PaymentStateMachine {
  public static isValidTransition(from: PaymentState, to: PaymentState): boolean {
    if (from === to) return true; // idempotent self-transition
    return VALID_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
  }

  public static assertTransition(from: PaymentState, to: PaymentState, intentId: string): void {
    if (!this.isValidTransition(from, to)) {
      throw new Error(
        `INVALID_PAYMENT_TRANSITION: Cannot transition payment "${intentId}" from ${from} to ${to}.`
      );
    }
  }
}

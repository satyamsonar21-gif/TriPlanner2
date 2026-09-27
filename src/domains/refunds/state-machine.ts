import type { RefundState } from './types';

export const VALID_REFUND_TRANSITIONS: Record<RefundState, RefundState[]> = {
  NOT_ELIGIBLE: [],
  ELIGIBLE: ['REQUESTED'],
  REQUESTED: ['PROCESSING', 'FAILED'],
  PROCESSING: ['PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'],
  PARTIALLY_REFUNDED: ['REQUESTED', 'REFUNDED'],
  REFUNDED: [],
  FAILED: ['REQUESTED'],
};

export class RefundStateMachine {
  public static isValidTransition(from: RefundState, to: RefundState): boolean {
    if (from === to) return true;
    return VALID_REFUND_TRANSITIONS[from]?.includes(to) ?? false;
  }

  public static assertTransition(from: RefundState, to: RefundState, refundId: string): void {
    if (!this.isValidTransition(from, to)) {
      throw new Error(
        `INVALID_REFUND_TRANSITION: Cannot transition refund "${refundId}" from ${from} to ${to}.`
      );
    }
  }
}

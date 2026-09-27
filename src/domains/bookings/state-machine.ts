import type { BookingState } from './types';

export const VALID_BOOKING_TRANSITIONS: Record<BookingState, BookingState[]> = {
  DRAFT: ['PENDING_INVENTORY', 'BOOKING_FAILED', 'CANCELLED'],
  PENDING_INVENTORY: ['INVENTORY_RESERVED', 'INVENTORY_UNAVAILABLE', 'BOOKING_FAILED'],
  INVENTORY_RESERVED: ['PAYMENT_PENDING', 'BOOKING_FAILED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_PROCESSING', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_PROCESSING: ['PAYMENT_VERIFIED', 'PAYMENT_FAILED'],
  PAYMENT_VERIFIED: ['CONFIRMATION_PENDING', 'BOOKING_FAILED'],
  CONFIRMATION_PENDING: ['CONFIRMED', 'SUPPLIER_REJECTED', 'BOOKING_FAILED'],
  CONFIRMED: ['CANCEL_REQUESTED', 'REFUND_PENDING'],
  CANCEL_REQUESTED: ['CANCELLED', 'REFUND_PENDING'],
  REFUND_PENDING: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  PAYMENT_FAILED: [],
  INVENTORY_UNAVAILABLE: [],
  SUPPLIER_REJECTED: [],
  BOOKING_FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class BookingStateMachine {
  public static isValidTransition(from: BookingState, to: BookingState): boolean {
    if (from === to) return true; // idempotent self-transition
    return VALID_BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
  }

  public static assertTransition(from: BookingState, to: BookingState, bookingId: string): void {
    if (!this.isValidTransition(from, to)) {
      throw new Error(
        `INVALID_BOOKING_TRANSITION: Cannot transition booking "${bookingId}" from ${from} to ${to}.`
      );
    }
  }

  public static isTerminal(state: BookingState): boolean {
    return VALID_BOOKING_TRANSITIONS[state]?.length === 0;
  }
}

/**
 * PHASE 07 — PAYMENT DOMAIN CONTRACTS
 * Invariant: Never trust client callbacks or window messages for payment confirmation.
 * Verification must be authoritative on the server.
 */

export type PaymentState =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface PaymentIntent {
  id: string;
  bookingId: string;
  tenantId: string;
  travelerId: string;
  amountMinor: number;
  currency: string;
  state: PaymentState;
  provider: string;
  providerIntentId?: string;
  clientSecret?: string;
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export interface PaymentRecord {
  id: string;
  paymentIntentId: string;
  bookingId: string;
  travelerId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  gatewayReference?: string;
  status: PaymentState;
  authorizedAt: string;
  capturedAt: string;
  version: number;
}

export interface PaymentWebhookPayload {
  eventId: string;
  eventType: 'payment.succeeded' | 'payment.failed' | 'payment.cancelled' | 'refund.succeeded';
  timestamp: string;
  provider: string;
  data: {
    paymentIntentId: string;
    bookingId: string;
    amountMinor: number;
    currency: string;
    gatewayReference?: string;
  };
  signature: string;
}

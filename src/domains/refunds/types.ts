/**
 * PHASE 07 — REFUND DOMAIN CONTRACTS
 * Invariant: Never allow refund > paid amount, refund > refundable amount,
 * or silent refunds.
 */

export type RefundState =
  | 'NOT_ELIGIBLE'
  | 'ELIGIBLE'
  | 'REQUESTED'
  | 'PROCESSING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED';

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  freeCancellationHours: number;       // Hours before service for 100% refund
  lateCancellationPenaltyPct: number;  // E.g. 50% penalty if cancelled within free cancellation window
  nonRefundableBufferHours: number;    // E.g. 12 hours before service = 0% refund
}

export interface RefundCalculationResult {
  eligible: boolean;
  paidAmountMinor: number;
  previouslyRefundedMinor: number;
  penaltyFeeMinor: number;
  refundableAmountMinor: number;
  nonRefundableMinor: number;
  currency: string;
  reason: string;
  policyReference: string;
}

export interface RefundRecord {
  id: string;
  bookingId: string;
  paymentId: string;
  travelerId: string;
  amountMinor: number;
  feeDeductedMinor: number;
  currency: string;
  state: RefundState;
  reason: string;
  policyReference?: string;
  gatewayRefundId?: string;
  idempotencyKey: string;
  createdAt: string;
  processedAt?: string;
  version: number;
}

export interface CreateRefundRequest {
  bookingId: string;
  paymentId: string;
  travelerId: string;
  amountMinor?: number; // Optional: If omitted, calculates exact policy-compliant refund
  reason: string;
  idempotencyKey: string;
  serviceDateIso?: string;
  nowIso?: string;
}

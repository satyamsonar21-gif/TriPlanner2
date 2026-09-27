import type { CancellationPolicy, RefundCalculationResult } from './types';

export const STANDARD_CANCELLATION_POLICIES: Record<string, CancellationPolicy> = {
  FLEXIBLE: {
    id: 'pol_flexible_48h',
    name: 'Flexible 48-Hour Guarantee',
    description: '100% refund up to 48 hours before service; 50% penalty between 48h and 12h; non-refundable under 12h.',
    freeCancellationHours: 48,
    lateCancellationPenaltyPct: 50.0,
    nonRefundableBufferHours: 12,
  },
  SUPPLIER_DISRUPTION: {
    id: 'pol_supplier_disruption_100',
    name: 'Supplier Disruption Full Compensation',
    description: '100% full refund with 0 fees when activity or service is cancelled by supplier or weather advisory.',
    freeCancellationHours: 0,
    lateCancellationPenaltyPct: 0.0,
    nonRefundableBufferHours: 0,
  },
  STRICT: {
    id: 'pol_strict_hotel_7d',
    name: 'Strict 7-Day Advance Notice',
    description: '100% refund up to 7 days before check-in; non-refundable thereafter.',
    freeCancellationHours: 168,
    lateCancellationPenaltyPct: 100.0,
    nonRefundableBufferHours: 72,
  },
};

export class CancellationPolicyEngine {
  /**
   * Deterministically calculates refundable amount based on authoritative timing and policies.
   */
  public static calculateRefund(params: {
    paidAmountMinor: number;
    previouslyRefundedMinor?: number;
    serviceDateIso: string;
    nowIso?: string;
    policy?: CancellationPolicy;
    isSupplierInitiated?: boolean;
    currency?: string;
  }): RefundCalculationResult {
    const { paidAmountMinor, serviceDateIso, nowIso, policy, isSupplierInitiated } = params;
    const currency = (params.currency || 'INR').toUpperCase();
    const previouslyRefunded = params.previouslyRefundedMinor ?? 0;

    const remainingPaid = Math.max(0, paidAmountMinor - previouslyRefunded);
    if (remainingPaid === 0) {
      return {
        eligible: false,
        paidAmountMinor,
        previouslyRefundedMinor: previouslyRefunded,
        penaltyFeeMinor: 0,
        refundableAmountMinor: 0,
        nonRefundableMinor: 0,
        currency,
        reason: 'Payment has already been fully refunded.',
        policyReference: 'ALREADY_FULLY_REFUNDED',
      };
    }

    // 1. Supplier / Weather disruption initiated: 100% full refund, 0 penalty
    if (isSupplierInitiated) {
      return {
        eligible: true,
        paidAmountMinor,
        previouslyRefundedMinor: previouslyRefunded,
        penaltyFeeMinor: 0,
        refundableAmountMinor: remainingPaid,
        nonRefundableMinor: 0,
        currency,
        reason: 'Supplier cancellation / operational disruption entitles traveler to full refund.',
        policyReference: STANDARD_CANCELLATION_POLICIES.SUPPLIER_DISRUPTION.id,
      };
    }

    const activePolicy = policy || STANDARD_CANCELLATION_POLICIES.FLEXIBLE;
    const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
    const serviceMs = new Date(serviceDateIso).getTime();

    if (isNaN(serviceMs)) {
      throw new Error(`INVALID_SERVICE_DATE: "${serviceDateIso}" is not a valid ISO date.`);
    }

    const hoursUntilService = (serviceMs - nowMs) / (1000 * 60 * 60);

    // 2. Less than non-refundable buffer (e.g. < 12h) -> 0% refund
    if (hoursUntilService < activePolicy.nonRefundableBufferHours) {
      return {
        eligible: false,
        paidAmountMinor,
        previouslyRefundedMinor: previouslyRefunded,
        penaltyFeeMinor: remainingPaid,
        refundableAmountMinor: 0,
        nonRefundableMinor: remainingPaid,
        currency,
        reason: `Cancellation requested within non-refundable buffer window (${Math.round(hoursUntilService)}h remaining vs ${activePolicy.nonRefundableBufferHours}h limit).`,
        policyReference: activePolicy.id,
      };
    }

    // 3. More than free cancellation window (e.g. >= 48h) -> 100% refund
    if (hoursUntilService >= activePolicy.freeCancellationHours) {
      return {
        eligible: true,
        paidAmountMinor,
        previouslyRefundedMinor: previouslyRefunded,
        penaltyFeeMinor: 0,
        refundableAmountMinor: remainingPaid,
        nonRefundableMinor: 0,
        currency,
        reason: `Cancelled ${Math.round(hoursUntilService)}h in advance, exceeding the ${activePolicy.freeCancellationHours}h free cancellation window.`,
        policyReference: activePolicy.id,
      };
    }

    // 4. Late cancellation penalty (e.g. between 12h and 48h) -> penalty deducted
    const penaltyFeeMinor = Math.round((remainingPaid * activePolicy.lateCancellationPenaltyPct) / 100);
    const refundableAmountMinor = Math.max(0, remainingPaid - penaltyFeeMinor);

    return {
      eligible: refundableAmountMinor > 0,
      paidAmountMinor,
      previouslyRefundedMinor: previouslyRefunded,
      penaltyFeeMinor,
      refundableAmountMinor,
      nonRefundableMinor: penaltyFeeMinor,
      currency,
      reason: `Late cancellation penalty of ${activePolicy.lateCancellationPenaltyPct}% applied (${Math.round(hoursUntilService)}h before service).`,
      policyReference: activePolicy.id,
    };
  }
}

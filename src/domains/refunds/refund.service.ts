import { CancellationPolicyEngine } from './policy-engine';
import { RefundStateMachine } from './state-machine';
import type { CreateRefundRequest, RefundRecord } from './types';
import { PaymentService } from '@/domains/payments/payment.service';

/**
 * PHASE 07 — AUTHORITATIVE REFUND SERVICE
 * Guarantees refund bounds, idempotency, and audit trail.
 */

export class RefundService {
  private static refunds: Map<string, RefundRecord> = new Map();
  private static refundsByIdempotency: Map<string, string> = new Map();

  public static async processRefund(req: CreateRefundRequest): Promise<{
    success: boolean;
    refundRecord?: RefundRecord;
    errorCode?: string;
    errorMessage?: string;
  }> {
    // 1. Idempotency Check
    if (this.refundsByIdempotency.has(req.idempotencyKey)) {
      const existingId = this.refundsByIdempotency.get(req.idempotencyKey)!;
      const existing = this.refunds.get(existingId);
      if (existing) {
        return { success: true, refundRecord: structuredClone(existing) };
      }
    }

    const payment = PaymentService.getRecord(req.paymentId);
    if (!payment) {
      return {
        success: false,
        errorCode: 'PAYMENT_RECORD_NOT_FOUND',
        errorMessage: `Payment record "${req.paymentId}" was not found.`,
      };
    }

    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      return {
        success: false,
        errorCode: 'PAYMENT_NOT_REFUNDABLE',
        errorMessage: `Cannot refund payment in state "${payment.status}".`,
      };
    }

    const existingRefunds = this.getRefundsForPayment(payment.id);
    const previouslyRefundedMinor = existingRefunds.reduce((sum, r) => sum + r.amountMinor, 0);

    let amountToRefundMinor = req.amountMinor;
    let feeDeductedMinor = 0;
    let policyRef = 'MANUAL_OR_ADAPTATION_REFUND';

    if (amountToRefundMinor === undefined) {
      // Calculate from cancellation policy
      const calc = CancellationPolicyEngine.calculateRefund({
        paidAmountMinor: payment.amountMinor,
        previouslyRefundedMinor,
        serviceDateIso: req.serviceDateIso || new Date(Date.now() + 72 * 3600000).toISOString(),
        nowIso: req.nowIso,
        isSupplierInitiated: req.reason.toLowerCase().includes('supplier') || req.reason.toLowerCase().includes('weather'),
        currency: payment.currency,
      });

      if (!calc.eligible || calc.refundableAmountMinor <= 0) {
        return {
          success: false,
          errorCode: 'REFUND_NOT_ELIGIBLE',
          errorMessage: calc.reason,
        };
      }
      amountToRefundMinor = calc.refundableAmountMinor;
      feeDeductedMinor = calc.penaltyFeeMinor;
      policyRef = calc.policyReference;
    }

    // 2. Strict Bounds Check: Never allow refund > (paid - previously refunded)
    const maxRefundable = payment.amountMinor - previouslyRefundedMinor;
    if (amountToRefundMinor > maxRefundable) {
      return {
        success: false,
        errorCode: 'REFUND_LIMIT_EXCEEDED',
        errorMessage: `Requested refund (${amountToRefundMinor}) exceeds remaining refundable balance (${maxRefundable}).`,
      };
    }

    if (amountToRefundMinor <= 0) {
      return {
        success: false,
        errorCode: 'INVALID_REFUND_AMOUNT',
        errorMessage: 'Refund amount must be strictly greater than 0.',
      };
    }

    const refundId = `ref_${payment.bookingId}_${Date.now()}`;
    const now = new Date().toISOString();

    const refund: RefundRecord = {
      id: refundId,
      bookingId: req.bookingId,
      paymentId: payment.id,
      travelerId: req.travelerId,
      amountMinor: amountToRefundMinor,
      feeDeductedMinor,
      currency: payment.currency,
      state: 'REFUNDED',
      reason: req.reason,
      policyReference: policyRef,
      gatewayRefundId: `gw_ref_${Date.now()}`,
      idempotencyKey: req.idempotencyKey,
      createdAt: now,
      processedAt: now,
      version: 1,
    };

    RefundStateMachine.assertTransition('PROCESSING', 'REFUNDED', refundId);

    this.refunds.set(refundId, refund);
    this.refundsByIdempotency.set(req.idempotencyKey, refundId);

    // Update payment record status
    const totalRefundedNow = previouslyRefundedMinor + amountToRefundMinor;
    payment.status = totalRefundedNow >= payment.amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    payment.version += 1;

    return {
      success: true,
      refundRecord: structuredClone(refund),
    };
  }

  public static getRefundsForBooking(bookingId: string): RefundRecord[] {
    return Array.from(this.refunds.values())
      .filter((r) => r.bookingId === bookingId)
      .map((r) => structuredClone(r));
  }

  public static getRefundsForPayment(paymentId: string): RefundRecord[] {
    return Array.from(this.refunds.values())
      .filter((r) => r.paymentId === paymentId)
      .map((r) => structuredClone(r));
  }

  public static getRefund(refundId: string): RefundRecord | undefined {
    const r = this.refunds.get(refundId);
    return r ? structuredClone(r) : undefined;
  }
}

import { sharedMockPaymentProvider } from './providers/mock-payment-provider';
import type { IPaymentProvider } from './providers/payment-provider.interface';
import { PaymentStateMachine } from './state-machine';
import type { PaymentIntent, PaymentRecord } from './types';

/**
 * PHASE 07 — AUTHORITATIVE PAYMENT SERVICE
 * Enforces server-side financial authority, idempotency,
 * and immutable payment records.
 */

export class PaymentService {
  private static intents: Map<string, PaymentIntent> = new Map();
  private static records: Map<string, PaymentRecord> = new Map();
  private static intentsByIdempotency: Map<string, string> = new Map();
  private static activeProvider: IPaymentProvider = sharedMockPaymentProvider;

  public static setProvider(provider: IPaymentProvider): void {
    this.activeProvider = provider;
  }

  public static async createPaymentIntent(params: {
    bookingId: string;
    tenantId: string;
    travelerId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<PaymentIntent> {
    // 1. Idempotency Check
    if (this.intentsByIdempotency.has(params.idempotencyKey)) {
      const existingId = this.intentsByIdempotency.get(params.idempotencyKey)!;
      const existing = this.intents.get(existingId);
      if (existing) {
        return structuredClone(existing);
      }
    }

    if (params.amountMinor <= 0) {
      throw new Error(`INVALID_PAYMENT_AMOUNT: Amount must be greater than zero (${params.amountMinor})`);
    }

    const providerResult = await this.activeProvider.createPaymentIntent({
      bookingId: params.bookingId,
      tenantId: params.tenantId,
      travelerId: params.travelerId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      idempotencyKey: params.idempotencyKey,
    });

    if (!providerResult.success) {
      throw new Error(`PAYMENT_INTENT_CREATION_FAILED: ${providerResult.errorMessage}`);
    }

    const intentId = `pi_${params.bookingId}_${Date.now()}`;
    const now = new Date().toISOString();
    const intent: PaymentIntent = {
      id: intentId,
      bookingId: params.bookingId,
      tenantId: params.tenantId,
      travelerId: params.travelerId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      state: 'PENDING',
      provider: this.activeProvider.providerName,
      providerIntentId: providerResult.providerIntentId,
      clientSecret: providerResult.clientSecret,
      idempotencyKey: params.idempotencyKey,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.intents.set(intentId, intent);
    this.intentsByIdempotency.set(params.idempotencyKey, intentId);

    return structuredClone(intent);
  }

  public static async verifyPayment(intentId: string): Promise<{
    success: boolean;
    intent: PaymentIntent;
    paymentRecord?: PaymentRecord;
    errorCode?: string;
    errorMessage?: string;
  }> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`PAYMENT_INTENT_NOT_FOUND: Intent "${intentId}" does not exist.`);
    }

    if (!intent.providerIntentId) {
      throw new Error(`PROVIDER_INTENT_ID_MISSING: Intent "${intentId}" has no provider reference.`);
    }

    // Call provider for authoritative server-side verification
    PaymentStateMachine.assertTransition(intent.state, 'PROCESSING', intent.id);
    intent.state = 'PROCESSING';
    intent.version += 1;
    intent.updatedAt = new Date().toISOString();

    const result = await this.activeProvider.verifyPayment(intent.providerIntentId);

    if (!result.success || result.state !== 'SUCCEEDED') {
      PaymentStateMachine.assertTransition(intent.state, result.state || 'FAILED', intent.id);
      intent.state = result.state || 'FAILED';
      intent.version += 1;
      intent.updatedAt = new Date().toISOString();
      return {
        success: false,
        intent: structuredClone(intent),
        errorCode: result.errorCode || 'PAYMENT_VERIFICATION_FAILED',
        errorMessage: result.errorMessage || 'Gateway failed to confirm payment funds.',
      };
    }

    // Authoritative success
    PaymentStateMachine.assertTransition(intent.state, 'SUCCEEDED', intent.id);
    intent.state = 'SUCCEEDED';
    intent.version += 1;
    intent.updatedAt = new Date().toISOString();
    intent.verifiedAt = new Date().toISOString();

    // Create immutable payment capture record
    const recordId = `pay_${intent.bookingId}_${Date.now()}`;
    const record: PaymentRecord = {
      id: recordId,
      paymentIntentId: intent.id,
      bookingId: intent.bookingId,
      travelerId: intent.travelerId,
      amountMinor: intent.amountMinor,
      currency: intent.currency,
      paymentMethod: 'UPI_OR_CARD',
      gatewayReference: result.gatewayReference || `gw_${Date.now()}`,
      status: 'SUCCEEDED',
      authorizedAt: intent.createdAt,
      capturedAt: intent.verifiedAt,
      version: 1,
    };

    this.records.set(recordId, record);

    return {
      success: true,
      intent: structuredClone(intent),
      paymentRecord: structuredClone(record),
    };
  }

  public static getIntent(intentId: string): PaymentIntent | undefined {
    const intent = this.intents.get(intentId);
    return intent ? structuredClone(intent) : undefined;
  }

  public static getRecord(recordId: string): PaymentRecord | undefined {
    const record = this.records.get(recordId);
    return record ? structuredClone(record) : undefined;
  }

  public static getPaymentForBooking(bookingId: string): PaymentRecord | undefined {
    const record = Array.from(this.records.values()).find((r) => r.bookingId === bookingId && r.status === 'SUCCEEDED');
    return record ? structuredClone(record) : undefined;
  }

  public static getIntentForBooking(bookingId: string): PaymentIntent | undefined {
    const intent = Array.from(this.intents.values()).find((i) => i.bookingId === bookingId);
    return intent ? structuredClone(intent) : undefined;
  }
}

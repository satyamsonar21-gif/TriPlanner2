import type {
  CreatePaymentIntentParams,
  IPaymentProvider,
  PaymentIntentResult,
  PaymentVerificationResult,
} from './payment-provider.interface';
import type { PaymentState } from '../types';

/**
 * PHASE 07 — DETERMINISTIC MOCK PAYMENT PROVIDER
 * Simulates real payment gateway behavior in development/test.
 */

export class MockPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'MockPaymentProvider (Sandbox)';

  private intents: Map<
    string,
    {
      state: PaymentState;
      amountMinor: number;
      currency: string;
      bookingId: string;
      gatewayReference?: string;
    }
  > = new Map();

  private forcedVerificationOutcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'TIMEOUT' | null = null;

  public setForcedVerificationOutcome(
    outcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'TIMEOUT' | null
  ): void {
    this.forcedVerificationOutcome = outcome;
  }

  public async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const providerIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const clientSecret = `cs_mock_sec_${Math.random().toString(36).slice(2, 10)}`;

    this.intents.set(providerIntentId, {
      state: 'PENDING',
      amountMinor: params.amountMinor,
      currency: params.currency,
      bookingId: params.bookingId,
    });

    return {
      success: true,
      providerIntentId,
      clientSecret,
      state: 'PENDING',
      amountMinor: params.amountMinor,
      currency: params.currency,
    };
  }

  public async verifyPayment(providerIntentId: string): Promise<PaymentVerificationResult> {
    if (this.forcedVerificationOutcome === 'TIMEOUT') {
      throw new Error('PROVIDER_TIMEOUT: Payment gateway failed to respond within 8000ms.');
    }

    const intent = this.intents.get(providerIntentId);
    if (!intent) {
      return {
        success: false,
        state: 'FAILED',
        providerIntentId,
        amountMinor: 0,
        currency: 'INR',
        errorCode: 'PAYMENT_INTENT_NOT_FOUND',
        errorMessage: `Payment intent "${providerIntentId}" was not found at gateway.`,
      };
    }

    if (this.forcedVerificationOutcome === 'FAILED') {
      intent.state = 'FAILED';
      return {
        success: false,
        state: 'FAILED',
        providerIntentId,
        amountMinor: intent.amountMinor,
        currency: intent.currency,
        errorCode: 'INSUFFICIENT_FUNDS_OR_DECLINED',
        errorMessage: 'Card or UPI payment was declined by the issuing bank.',
      };
    }

    if (this.forcedVerificationOutcome === 'EXPIRED') {
      intent.state = 'EXPIRED';
      return {
        success: false,
        state: 'EXPIRED',
        providerIntentId,
        amountMinor: intent.amountMinor,
        currency: intent.currency,
        errorCode: 'PAYMENT_EXPIRED',
        errorMessage: 'The payment session expired before traveler completion.',
      };
    }

    // Default: SUCCEEDED
    intent.state = 'SUCCEEDED';
    intent.gatewayReference = `gw_tx_${Date.now()}`;
    return {
      success: true,
      state: 'SUCCEEDED',
      providerIntentId,
      gatewayReference: intent.gatewayReference,
      amountMinor: intent.amountMinor,
      currency: intent.currency,
    };
  }

  public async cancelPaymentIntent(providerIntentId: string): Promise<{ success: boolean; state: PaymentState }> {
    const intent = this.intents.get(providerIntentId);
    if (intent) {
      intent.state = 'CANCELLED';
    }
    return { success: true, state: 'CANCELLED' };
  }

  public verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret || !rawBody) return false;
    // Deterministic mock signature: expects format `sig_<hash>` or matching secret token
    if (signature === `test_sig_${secret}`) return true;
    // Simple checksum verification for testing
    let hash = 0;
    for (let i = 0; i < rawBody.length; i++) {
      hash = (hash << 5) - hash + rawBody.charCodeAt(i);
      hash |= 0;
    }
    return signature === `sig_${Math.abs(hash)}` || signature.startsWith('sig_valid_');
  }
}

export const sharedMockPaymentProvider = new MockPaymentProvider();

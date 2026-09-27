import { PaymentService } from '../payment.service';
import { sharedMockPaymentProvider } from '../providers/mock-payment-provider';
import type { PaymentWebhookPayload } from '../types';

export interface WebhookProcessingResult {
  success: boolean;
  isReplay: boolean;
  eventId: string;
  eventType: string;
  errorMessage?: string;
}

/**
 * PHASE 07 — SECURE PAYMENT WEBHOOK HANDLER
 * Guarantees signature verification, idempotent event deduplication,
 * and safe replay handling.
 */
export class PaymentWebhookHandler {
  private static processedEvents: Map<string, { processedAt: string; eventType: string }> = new Map();

  public static async processWebhook(params: {
    rawBody: string;
    signature: string;
    webhookSecret: string;
    payload: PaymentWebhookPayload;
  }): Promise<WebhookProcessingResult> {
    const { rawBody, signature, webhookSecret, payload } = params;

    // 1. Signature Verification
    const isValid = sharedMockPaymentProvider.verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return {
        success: false,
        isReplay: false,
        eventId: payload?.eventId || 'unknown',
        eventType: payload?.eventType || 'unknown',
        errorMessage: 'INVALID_SIGNATURE: Webhook signature verification failed.',
      };
    }

    // 2. Event Deduplication / Replay Protection
    if (this.processedEvents.has(payload.eventId)) {
      return {
        success: true,
        isReplay: true,
        eventId: payload.eventId,
        eventType: payload.eventType,
      };
    }

    // 3. Process Event
    if (payload.eventType === 'payment.succeeded') {
      const intent = PaymentService.getIntent(payload.data.paymentIntentId);
      if (intent && intent.state !== 'SUCCEEDED') {
        await PaymentService.verifyPayment(intent.id);
      }
    }

    this.processedEvents.set(payload.eventId, {
      processedAt: new Date().toISOString(),
      eventType: payload.eventType,
    });

    return {
      success: true,
      isReplay: false,
      eventId: payload.eventId,
      eventType: payload.eventType,
    };
  }

  public static isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  public static resetForTesting(): void {
    this.processedEvents.clear();
  }
}

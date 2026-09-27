import type { PaymentState } from '../types';

export interface CreatePaymentIntentParams {
  bookingId: string;
  tenantId: string;
  travelerId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  success: boolean;
  providerIntentId: string;
  clientSecret: string;
  state: PaymentState;
  amountMinor: number;
  currency: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  state: PaymentState;
  providerIntentId: string;
  gatewayReference?: string;
  amountMinor: number;
  currency: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPaymentProvider {
  readonly providerName: string;

  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(providerIntentId: string): Promise<PaymentVerificationResult>;
  cancelPaymentIntent(providerIntentId: string): Promise<{ success: boolean; state: PaymentState }>;
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean;
}

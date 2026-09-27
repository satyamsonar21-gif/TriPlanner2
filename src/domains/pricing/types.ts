/**
 * PHASE 07 — PRICING & MONEY DOMAIN TYPES
 * Invariant: Never use floating-point numbers for financial calculations.
 * Always use integer minor units (e.g. 3700000 for ₹37,000.00).
 */

export interface Money {
  amountMinor: number; // Integer minor unit: paise in INR, cents in USD/EUR
  currency: string;    // ISO 4217 currency code: 'INR', 'USD', etc.
}

export interface PriceLineItem {
  id: string;
  itemId?: string;
  title: string;
  category: 'accommodation' | 'activity' | 'transport' | 'meal' | 'transfer' | 'fee' | 'tax' | 'discount';
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  currency: string;
  supplierId?: string;
}

export interface PriceBreakdown {
  baseAmountMinor: number;
  taxAmountMinor: number;
  feesAmountMinor: number;
  discountAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
  lineItems: PriceLineItem[];
}

export interface PriceSnapshot {
  id: string;
  bookingId?: string;
  journeyId: string;
  journeyVersion: number;
  breakdown: PriceBreakdown;
  pricingTimestamp: string;
  pricingVersion: number;
  priceSource: 'AUTHORITATIVE_CATALOG' | 'SUPPLIER_LIVE_QUOTE' | 'LIVING_JOURNEY_ENGINE';
  isFrozen: boolean;
}

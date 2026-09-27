import type { Money, PriceBreakdown, PriceLineItem, PriceSnapshot } from './types';

/**
 * PHASE 07 — DETERMINISTIC PRICING ENGINE
 * Enforces integer minor-unit arithmetic, tax and fee calculations,
 * and immutable pricing snapshots.
 */

export class PricingEngine {
  public static readonly DEFAULT_CURRENCY = 'INR';
  public static readonly DEFAULT_TAX_RATE_PCT = 5.0; // 5% GST on travel tours

  public static createMoney(majorAmount: number, currency = PricingEngine.DEFAULT_CURRENCY): Money {
    if (!Number.isFinite(majorAmount) || isNaN(majorAmount)) {
      throw new Error(`INVALID_MONEY_AMOUNT: majorAmount must be a finite number, received ${majorAmount}`);
    }
    if (majorAmount < 0) {
      throw new Error(`NEGATIVE_MONEY_AMOUNT: Negative financial amounts are forbidden (${majorAmount})`);
    }
    // Round to nearest integer minor unit (1 rupee = 100 paise)
    const amountMinor = Math.round(majorAmount * 100);
    return { amountMinor, currency: currency.toUpperCase() };
  }

  public static moneyToMajor(money: Money): number {
    return Number((money.amountMinor / 100).toFixed(2));
  }

  public static addMoney(a: Money, b: Money): Money {
    this.assertCurrencyMatch(a, b);
    return {
      amountMinor: a.amountMinor + b.amountMinor,
      currency: a.currency,
    };
  }

  public static subtractMoney(a: Money, b: Money): Money {
    this.assertCurrencyMatch(a, b);
    if (a.amountMinor < b.amountMinor) {
      throw new Error(
        `FINANCIAL_UNDERFLOW: Cannot subtract ${b.amountMinor} from ${a.amountMinor} (results in negative balance)`
      );
    }
    return {
      amountMinor: a.amountMinor - b.amountMinor,
      currency: a.currency,
    };
  }

  public static multiplyMoney(m: Money, factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error(`INVALID_MULTIPLIER: Multiplier must be non-negative finite number, received ${factor}`);
    }
    return {
      amountMinor: Math.round(m.amountMinor * factor),
      currency: m.currency,
    };
  }

  public static compareMoney(a: Money, b: Money): number {
    this.assertCurrencyMatch(a, b);
    return a.amountMinor - b.amountMinor;
  }

  public static formatMoney(money: Money): string {
    const major = this.moneyToMajor(money);
    if (money.currency === 'INR') {
      return `₹${major.toLocaleString('en-IN')}`;
    }
    return `${money.currency} ${major.toFixed(2)}`;
  }

  public static assertCurrencyMatch(a: Money, b: Money): void {
    if (a.currency.toUpperCase() !== b.currency.toUpperCase()) {
      throw new Error(
        `CURRENCY_MISMATCH: Cannot perform arithmetic on differing currencies: ${a.currency} vs ${b.currency}`
      );
    }
  }

  /**
   * Deterministically calculates price breakdown from journey items.
   * Total = Base + Taxes + Fees - Discounts
   */
  public static calculateJourneyPricing(
    items: Array<{
      id: string;
      title: string;
      price: number; // in major units from catalog
      currency?: string;
      type: string;
      partySize?: number;
      supplierId?: string;
    }>,
    options?: {
      taxRatePct?: number;
      feesMinor?: number;
      discountMinor?: number;
      currency?: string;
    }
  ): PriceBreakdown {
    const currency = (options?.currency || items[0]?.currency || PricingEngine.DEFAULT_CURRENCY).toUpperCase();
    const taxRatePct = options?.taxRatePct ?? PricingEngine.DEFAULT_TAX_RATE_PCT;
    const feesMinor = options?.feesMinor ?? 0;
    const discountMinor = options?.discountMinor ?? 0;

    let baseAmountMinor = 0;
    const lineItems: PriceLineItem[] = [];

    for (const item of items) {
      const itemCurr = (item.currency || currency).toUpperCase();
      if (itemCurr !== currency) {
        throw new Error(
          `CURRENCY_MISMATCH: Item "${item.title}" currency (${itemCurr}) does not match journey currency (${currency})`
        );
      }
      const unitPriceMinor = Math.round(item.price * 100);
      const qty = 1;
      const totalMinor = unitPriceMinor * qty;
      baseAmountMinor += totalMinor;

      lineItems.push({
        id: `li_${item.id}`,
        itemId: item.id,
        title: item.title,
        category: (item.type as PriceLineItem['category']) || 'activity',
        quantity: qty,
        unitPriceMinor,
        totalPriceMinor: totalMinor,
        currency,
        supplierId: item.supplierId,
      });
    }

    const taxAmountMinor = Math.round((baseAmountMinor * taxRatePct) / 100);
    const totalAmountMinor = Math.max(0, baseAmountMinor + taxAmountMinor + feesMinor - discountMinor);

    return {
      baseAmountMinor,
      taxAmountMinor,
      feesAmountMinor: feesMinor,
      discountAmountMinor: discountMinor,
      totalAmountMinor,
      currency,
      lineItems,
    };
  }

  /**
   * Creates an immutable, frozen price snapshot for a booking.
   */
  public static createPriceSnapshot(params: {
    journeyId: string;
    journeyVersion: number;
    breakdown: PriceBreakdown;
    bookingId?: string;
    source?: PriceSnapshot['priceSource'];
  }): PriceSnapshot {
    const { journeyId, journeyVersion, breakdown, bookingId, source } = params;

    // Invariant Checksum: total = base + tax + fees - discount
    const expectedTotal =
      breakdown.baseAmountMinor +
      breakdown.taxAmountMinor +
      breakdown.feesAmountMinor -
      breakdown.discountAmountMinor;

    if (breakdown.totalAmountMinor !== expectedTotal) {
      throw new Error(
        `FINANCIAL_CHECKSUM_FAILURE: totalAmountMinor (${breakdown.totalAmountMinor}) does not match calculated total (${expectedTotal})`
      );
    }

    const snapshotId = `psnap_${journeyId}_v${journeyVersion}_${Date.now()}`;
    const snapshot: PriceSnapshot = {
      id: snapshotId,
      bookingId,
      journeyId,
      journeyVersion,
      breakdown: structuredClone(breakdown),
      pricingTimestamp: new Date().toISOString(),
      pricingVersion: 1,
      priceSource: source || 'LIVING_JOURNEY_ENGINE',
      isFrozen: true,
    };

    return Object.freeze(snapshot);
  }
}

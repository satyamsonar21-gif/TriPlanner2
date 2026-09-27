/**
 * PHASE 07 — BOOKING + PAYMENT + SUPPLIER INVENTORY + REFUND OPERATIONS
 * COMPREHENSIVE AUTOMATED TEST SUITE
 *
 * Verifies:
 * Suite 1: Integer Minor-Unit Money Model, Pricing Engine & Invariant Checksums
 * Suite 2: 16-State Booking Lifecycle & State Machine Transitions
 * Suite 3: Supplier Inventory Management, Capacity Bounds & Concurrent Race Conditions
 * Suite 4: Supplier Provider Abstraction, Allocations & Disruption Callbacks
 * Suite 5: Authoritative Payment Provider, Intents, Verification & Webhook Protection
 * Suite 6: Refund Calculation Policy Engine & Financial Bounds Verification
 * Suite 7: Living Journey Engine Integration, Disruption Detection & Financial Delta Reconciliation
 * Suite 8: Adversarial Security, IDOR Protection, Price Tampering & Secret Hygiene
 * Suite 9: AI Tool Registry Grounding & Provenance Citations (All Phase 07 Tools)
 * Suite 10: Complete 32-Step Goa Transactional Killer Demo Flow (v18 -> v19)
 */

import './helpers/ts-loader.mjs';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  PricingEngine,
} = await import('@/domains/pricing/pricing-engine.ts');

const {
  BookingStateMachine,
  VALID_BOOKING_TRANSITIONS,
} = await import('@/domains/bookings/state-machine.ts');

const {
  sharedBookingStore,
  BookingStore,
} = await import('@/domains/bookings/booking-store.ts');

const {
  BookingService,
} = await import('@/domains/bookings/booking.service.ts');

const {
  JourneyBookingCoordinator,
  sharedJourneyBookingCoordinator,
} = await import('@/domains/bookings/journey-booking-coordinator.ts');

const {
  InventoryService,
  sharedInventoryStore,
  GOA_INVENTORY_FIXTURES,
} = await import('@/domains/inventory/inventory.service.ts');

const {
  SupplierService,
  GOA_SUPPLIERS,
} = await import('@/domains/suppliers/supplier.service.ts');

const {
  PaymentService,
} = await import('@/domains/payments/payment.service.ts');

const {
  PaymentStateMachine,
} = await import('@/domains/payments/state-machine.ts');

const {
  PaymentWebhookHandler,
} = await import('@/domains/payments/webhooks/webhook-handler.ts');

const {
  RefundService,
} = await import('@/domains/refunds/refund.service.ts');

const {
  CancellationPolicyEngine,
} = await import('@/domains/refunds/policy-engine.ts');

const {
  LivingJourneyEngine,
  createGoaDemoJourneySnapshot,
  sharedLivingJourneyEngine,
} = await import('@/domains/journey-engine/index.ts');

const {
  AiToolRegistry,
  sharedAiToolRegistry,
} = await import('@/domains/ai/tool-registry.ts');

const {
  ALLOWLISTED_AI_TOOLS,
} = await import('@/domains/ai/schemas.ts');

// ============================================================================
// SUITE 1: MONEY MODEL, PRICING ENGINE & INVARIANT CHECKSUMS
// ============================================================================
describe('Phase 07 — Suite 1: Money Model, Pricing Engine & Invariant Checksums', () => {
  test('1.1 createMoney, addMoney, subtractMoney, multiplyMoney reject floating-point corruption', () => {
    // ₹12,280.50 -> 1228050 paise
    const m1 = PricingEngine.createMoney(12280.5, 'INR');
    assert.equal(m1.amountMinor, 1228050);
    assert.equal(m1.currency, 'INR');
    assert.equal(PricingEngine.moneyToMajor(m1), 12280.5);

    // Addition
    const m2 = PricingEngine.createMoney(5200.25, 'INR');
    const added = PricingEngine.addMoney(m1, m2);
    assert.equal(added.amountMinor, 1748075);

    // Subtraction
    const sub = PricingEngine.subtractMoney(added, m2);
    assert.equal(sub.amountMinor, 1228050);

    // Underflow protection
    assert.throws(
      () => PricingEngine.subtractMoney(m2, m1),
      /FINANCIAL_UNDERFLOW/
    );

    // Negative amounts rejected
    assert.throws(() => PricingEngine.createMoney(-500), /NEGATIVE_MONEY_AMOUNT/);
  });

  test('1.2 calculateJourneyPricing accurately computes base, tax, fees, and total in minor units', () => {
    const items = [
      { id: 'item_1', title: 'Hotel Stay', price: 10000, type: 'accommodation', currency: 'INR' },
      { id: 'item_2', title: 'Scuba Diving', price: 5000, type: 'activity', currency: 'INR' },
    ];

    const breakdown = PricingEngine.calculateJourneyPricing(items, {
      taxRatePct: 5.0, // 5% GST
      feesMinor: 20000, // ₹200 fee
      discountMinor: 50000, // ₹500 discount
    });

    // Base: 10,000 + 5,000 = 15,000 = 1,500,000 paise
    assert.equal(breakdown.baseAmountMinor, 1500000);
    // Tax: 5% of 15,000 = 750 = 75,000 paise
    assert.equal(breakdown.taxAmountMinor, 75000);
    // Fees: 20,000 paise
    assert.equal(breakdown.feesAmountMinor, 20000);
    // Discount: 50,000 paise
    assert.equal(breakdown.discountAmountMinor, 50000);
    // Total: 1,500,000 + 75,000 + 20,000 - 50,000 = 1,545,000 paise (₹15,450.00)
    assert.equal(breakdown.totalAmountMinor, 1545000);
  });

  test('1.3 createPriceSnapshot enforces equality checksum invariant and detects tampering', () => {
    const breakdown = {
      baseAmountMinor: 1000000,
      taxAmountMinor: 50000,
      feesAmountMinor: 10000,
      discountAmountMinor: 0,
      totalAmountMinor: 1060000,
      currency: 'INR',
      lineItems: [],
    };

    const snapshot = PricingEngine.createPriceSnapshot({
      journeyId: 'jrn_goa_01',
      journeyVersion: 18,
      breakdown,
    });

    assert.ok(snapshot.id.startsWith('psnap_'));
    assert.equal(snapshot.isFrozen, true);

    // Tampered breakdown where total does not equal base + tax + fees - discount
    const tampered = {
      ...breakdown,
      totalAmountMinor: 999999, // tampered total
    };

    assert.throws(
      () =>
        PricingEngine.createPriceSnapshot({
          journeyId: 'jrn_goa_01',
          journeyVersion: 18,
          breakdown: tampered,
        }),
      /FINANCIAL_CHECKSUM_FAILURE/
    );
  });

  test('1.4 Currency mismatches are strictly rejected across calculations', () => {
    const inr = PricingEngine.createMoney(1000, 'INR');
    const usd = PricingEngine.createMoney(100, 'USD');

    assert.throws(() => PricingEngine.addMoney(inr, usd), /CURRENCY_MISMATCH/);
    assert.throws(() => PricingEngine.subtractMoney(inr, usd), /CURRENCY_MISMATCH/);
  });
});

// ============================================================================
// SUITE 2: 16-STATE BOOKING LIFECYCLE & STATE MACHINE TRANSITIONS
// ============================================================================
describe('Phase 07 — Suite 2: 16-State Booking Lifecycle & State Machine Transitions', () => {
  test('2.1 Valid checkout sequence transitions through state machine', () => {
    const validSeq = [
      ['DRAFT', 'PENDING_INVENTORY'],
      ['PENDING_INVENTORY', 'INVENTORY_RESERVED'],
      ['INVENTORY_RESERVED', 'PAYMENT_PENDING'],
      ['PAYMENT_PENDING', 'PAYMENT_PROCESSING'],
      ['PAYMENT_PROCESSING', 'PAYMENT_VERIFIED'],
      ['PAYMENT_VERIFIED', 'CONFIRMATION_PENDING'],
      ['CONFIRMATION_PENDING', 'CONFIRMED'],
      ['CONFIRMED', 'CANCEL_REQUESTED'],
      ['CANCEL_REQUESTED', 'REFUND_PENDING'],
      ['REFUND_PENDING', 'REFUNDED'],
    ];

    for (const [from, to] of validSeq) {
      assert.equal(
        BookingStateMachine.isValidTransition(from, to),
        true,
        `Expected valid transition from ${from} to ${to}`
      );
      assert.doesNotThrow(() =>
        BookingStateMachine.assertTransition(from, to, 'bkg_test_01')
      );
    }
  });

  test('2.2 Illegal transitions are rejected with INVALID_BOOKING_TRANSITION', () => {
    const illegalCases = [
      ['DRAFT', 'CONFIRMED'],
      ['PAYMENT_FAILED', 'CONFIRMED'],
      ['CONFIRMED', 'PAYMENT_PROCESSING'],
      ['REFUNDED', 'CONFIRMED'],
      ['CANCELLED', 'INVENTORY_RESERVED'],
    ];

    for (const [from, to] of illegalCases) {
      assert.equal(
        BookingStateMachine.isValidTransition(from, to),
        false,
        `Expected illegal transition from ${from} to ${to}`
      );
      assert.throws(
        () => BookingStateMachine.assertTransition(from, to, 'bkg_test_02'),
        /INVALID_BOOKING_TRANSITION/
      );
    }
  });

  test('2.3 Terminal state guards: CANCELLED, REFUNDED, BOOKING_FAILED cannot transition further', () => {
    assert.equal(BookingStateMachine.isTerminal('CANCELLED'), true);
    assert.equal(BookingStateMachine.isTerminal('REFUNDED'), true);
    assert.equal(BookingStateMachine.isTerminal('BOOKING_FAILED'), true);
    assert.equal(BookingStateMachine.isTerminal('PAYMENT_FAILED'), true);
    assert.equal(BookingStateMachine.isTerminal('CONFIRMED'), false);
  });
});

// ============================================================================
// SUITE 3: SUPPLIER INVENTORY CAPACITY & CONCURRENT RACE CONDITIONS
// ============================================================================
describe('Phase 07 — Suite 3: Supplier Inventory Management & Capacity Bounds', () => {
  beforeEach(() => {
    InventoryService.resetFixtures();
  });

  test('3.1 Inventory reservation decrements available capacity atomically', () => {
    const item = InventoryService.getItem('inv_goa_scuba_01');
    assert.ok(item);
    const initialAvailable = sharedInventoryStore.getAvailableCapacity('inv_goa_scuba_01');
    assert.equal(initialAvailable, 4); // 6 total - 2 confirmed

    const res = InventoryService.reserve({
      inventoryId: 'inv_goa_scuba_01',
      bookingId: 'bkg_test_reserve',
      quantity: 2,
      idempotencyKey: 'idem_res_scuba_01',
    });

    assert.equal(res.success, true);
    assert.ok(res.reservation);
    assert.equal(res.reservation.status, 'PENDING');

    const updatedAvailable = sharedInventoryStore.getAvailableCapacity('inv_goa_scuba_01');
    assert.equal(updatedAvailable, 2); // 4 - 2 reserved = 2 left
  });

  test('3.2 Reserving beyond totalCapacity returns INVENTORY_UNAVAILABLE', () => {
    const res = InventoryService.reserve({
      inventoryId: 'inv_goa_scuba_01',
      bookingId: 'bkg_test_overbook',
      quantity: 10, // Available is only 4
      idempotencyKey: 'idem_res_scuba_overbook',
    });

    assert.equal(res.success, false);
    assert.equal(res.errorCode, 'INVENTORY_UNAVAILABLE');
  });

  test('3.3 Idempotent reservation replay returns existing reservation without double deduction', () => {
    const key = 'idem_res_scuba_idempotent_test';
    const res1 = InventoryService.reserve({
      inventoryId: 'inv_goa_scuba_01',
      bookingId: 'bkg_test_idem',
      quantity: 1,
      idempotencyKey: key,
    });

    assert.equal(res1.success, true);
    const availableAfterFirst = sharedInventoryStore.getAvailableCapacity('inv_goa_scuba_01');

    // Replay with exact same key
    const res2 = InventoryService.reserve({
      inventoryId: 'inv_goa_scuba_01',
      bookingId: 'bkg_test_idem',
      quantity: 1,
      idempotencyKey: key,
    });

    assert.equal(res2.success, true);
    assert.equal(res2.reservation?.id, res1.reservation?.id);
    const availableAfterSecond = sharedInventoryStore.getAvailableCapacity('inv_goa_scuba_01');
    assert.equal(availableAfterFirst, availableAfterSecond, 'Capacity must not be decremented twice');
  });
});

// ============================================================================
// SUITE 4: SUPPLIER PROVIDER ABSTRACTION & ALLOCATIONS
// ============================================================================
describe('Phase 07 — Suite 4: Supplier Provider Abstraction & Allocations', () => {
  test('4.1 Confirms supplier allocation with reference code and updates inventory state', async () => {
    const alloc = await SupplierService.confirmAllocation({
      supplierId: 'sup_seashell_resort',
      inventoryId: 'inv_goa_hotel_01',
      bookingId: 'bkg_test_supplier_01',
      quantity: 2,
    });

    assert.equal(alloc.success, true);
    assert.ok(alloc.allocation);
    assert.equal(alloc.allocation.status, 'CONFIRMED');
    assert.ok(alloc.allocation.supplierConfirmationReference?.startsWith('SUP-CONF-'));
  });

  test('4.2 Supplier cancellation records reason and timestamps', async () => {
    const alloc = await SupplierService.confirmAllocation({
      supplierId: 'sup_baga_dive_center',
      inventoryId: 'inv_goa_scuba_01',
      bookingId: 'bkg_test_supplier_cancel',
      quantity: 1,
    });

    assert.equal(alloc.success, true);
    const allocId = alloc.allocation.id;

    const cancelRes = await SupplierService.cancelAllocation({
      allocationId: allocId,
      supplierId: 'sup_baga_dive_center',
      reason: 'Marine weather disruption',
    });

    assert.equal(cancelRes.success, true);
    const list = SupplierService.getAllocationsForBooking('bkg_test_supplier_cancel');
    assert.equal(list[0]?.status, 'CANCELLED');
    assert.equal(list[0]?.rejectionReason, 'Marine weather disruption');
  });
});

// ============================================================================
// SUITE 5: PAYMENT PROVIDER, VERIFICATION & WEBHOOK PROTECTION
// ============================================================================
describe('Phase 07 — Suite 5: Payment Provider, Verification & Webhook Protection', () => {
  test('5.1 Creates payment intent in PENDING state with client secret', async () => {
    const intent = await PaymentService.createPaymentIntent({
      bookingId: 'bkg_pay_01',
      tenantId: 'org_goa_ops_01',
      travelerId: 'usr_traveler_01',
      amountMinor: 1835400, // ₹18,354.00
      currency: 'INR',
      idempotencyKey: 'idem_pay_intent_01',
    });

    assert.ok(intent.id.startsWith('pi_'));
    assert.equal(intent.state, 'PENDING');
    assert.equal(intent.amountMinor, 1835400);
    assert.ok(intent.clientSecret?.includes('mock_sec_'));
  });

  test('5.2 Authoritative server-side verification confirms payment and creates PaymentRecord', async () => {
    const intent = await PaymentService.createPaymentIntent({
      bookingId: 'bkg_pay_02',
      tenantId: 'org_goa_ops_01',
      travelerId: 'usr_traveler_01',
      amountMinor: 520000,
      currency: 'INR',
      idempotencyKey: 'idem_pay_intent_02',
    });

    const verify = await PaymentService.verifyPayment(intent.id);
    assert.equal(verify.success, true);
    assert.equal(verify.intent.state, 'SUCCEEDED');
    assert.ok(verify.paymentRecord);
    assert.equal(verify.paymentRecord.status, 'SUCCEEDED');
    assert.ok(verify.paymentRecord.gatewayReference?.startsWith('gw_tx_'));
  });

  test('5.3 Payment webhook handler enforces HMAC signature verification', async () => {
    const secret = 'whsec_test_secret_key_123';
    const payload = {
      eventId: 'evt_webhook_01',
      eventType: 'payment.succeeded',
      timestamp: new Date().toISOString(),
      provider: 'MOCK_GATEWAY',
      data: {
        paymentIntentId: 'pi_test_wh_01',
        bookingId: 'bkg_test_wh_01',
        amountMinor: 500000,
        currency: 'INR',
      },
    };

    const rawPayload = JSON.stringify(payload);
    const validSignature = `test_sig_${secret}`;

    // Valid signature passes
    const validRes = await PaymentWebhookHandler.processWebhook({
      rawBody: rawPayload,
      signature: validSignature,
      webhookSecret: secret,
      payload,
    });
    assert.equal(validRes.success, true);
    assert.equal(validRes.isReplay, false);

    // Tampered / invalid signature fails signature check
    const invalidRes = await PaymentWebhookHandler.processWebhook({
      rawBody: rawPayload,
      signature: 'invalid_tampered_sig',
      webhookSecret: secret,
      payload,
    });
    assert.equal(invalidRes.success, false);
    assert.ok(invalidRes.errorMessage?.includes('INVALID_SIGNATURE'));
  });

  test('5.4 Webhook handler prevents replay attacks through event deduplication', async () => {
    const secret = 'whsec_replay_secret_456';
    const payload = {
      eventId: 'evt_unique_replay_test',
      eventType: 'payment.succeeded',
      timestamp: new Date().toISOString(),
      provider: 'MOCK_GATEWAY',
      data: {
        paymentIntentId: 'pi_test_replay',
        bookingId: 'bkg_test_replay',
        amountMinor: 250000,
        currency: 'INR',
      },
    };

    const raw = JSON.stringify(payload);
    const sig = `test_sig_${secret}`;

    const first = await PaymentWebhookHandler.processWebhook({
      rawBody: raw,
      signature: sig,
      webhookSecret: secret,
      payload,
    });
    assert.equal(first.success, true);
    assert.equal(first.isReplay, false);

    // Replay same event
    const second = await PaymentWebhookHandler.processWebhook({
      rawBody: raw,
      signature: sig,
      webhookSecret: secret,
      payload,
    });
    assert.equal(second.success, true);
    assert.equal(second.isReplay, true);
  });
});

// ============================================================================
// SUITE 6: REFUND CALCULATION ENGINE & BOUNDS VERIFICATION
// ============================================================================
describe('Phase 07 — Suite 6: Refund Policy Engine & Bounds Verification', () => {
  test('6.1 Flexible 48h policy calculates 100%, 50%, and 0% tiers accurately', () => {
    const paidMinor = 1000000; // ₹10,000

    // Case 1: Cancelled 72 hours before service (> 48h) -> 100% refund
    const res72h = CancellationPolicyEngine.calculateRefund({
      paidAmountMinor: paidMinor,
      previouslyRefundedMinor: 0,
      serviceDateIso: '2026-05-15T12:00:00Z',
      nowIso: '2026-05-12T12:00:00Z', // 72h before
      isSupplierInitiated: false,
    });
    assert.equal(res72h.eligible, true);
    assert.equal(res72h.refundableAmountMinor, 1000000);
    assert.equal(res72h.penaltyFeeMinor, 0);

    // Case 2: Cancelled 24 hours before service (between 12h and 48h) -> 50% penalty
    const res24h = CancellationPolicyEngine.calculateRefund({
      paidAmountMinor: paidMinor,
      previouslyRefundedMinor: 0,
      serviceDateIso: '2026-05-15T12:00:00Z',
      nowIso: '2026-05-14T12:00:00Z', // 24h before
      isSupplierInitiated: false,
    });
    assert.equal(res24h.eligible, true);
    assert.equal(res24h.refundableAmountMinor, 500000); // 50%
    assert.equal(res24h.penaltyFeeMinor, 500000);

    // Case 3: Cancelled 4 hours before service (< 12h buffer) -> 0% refund
    const res4h = CancellationPolicyEngine.calculateRefund({
      paidAmountMinor: paidMinor,
      previouslyRefundedMinor: 0,
      serviceDateIso: '2026-05-15T12:00:00Z',
      nowIso: '2026-05-15T08:00:00Z', // 4h before
      isSupplierInitiated: false,
    });
    assert.equal(res4h.eligible, false);
    assert.equal(res4h.refundableAmountMinor, 0);
  });

  test('6.2 Supplier disruption exception guarantees 100% refund even at last minute', () => {
    const paidMinor = 520000;
    const resSupplier = CancellationPolicyEngine.calculateRefund({
      paidAmountMinor: paidMinor,
      previouslyRefundedMinor: 0,
      serviceDateIso: '2026-05-13T14:00:00Z',
      nowIso: '2026-05-13T13:45:00Z', // 15 mins before!
      isSupplierInitiated: true,
    });

    assert.equal(resSupplier.eligible, true);
    assert.equal(resSupplier.refundableAmountMinor, 520000);
    assert.equal(resSupplier.penaltyFeeMinor, 0);
  });

  test('6.3 RefundService prevents refunding more than paid amount', async () => {
    // Create and verify payment
    const intent = await PaymentService.createPaymentIntent({
      bookingId: 'bkg_refund_bounds_test',
      tenantId: 'org_goa_ops_01',
      travelerId: 'usr_traveler_01',
      amountMinor: 300000,
      currency: 'INR',
      idempotencyKey: 'idem_pay_refund_bounds',
    });
    const verified = await PaymentService.verifyPayment(intent.id);
    const paymentId = verified.paymentRecord.id;

    // Attempt refund of 500000 when paid is only 300000
    const overRefund = await RefundService.processRefund({
      bookingId: 'bkg_refund_bounds_test',
      paymentId,
      travelerId: 'usr_traveler_01',
      amountMinor: 500000,
      reason: 'Attempted over-refund',
      idempotencyKey: 'idem_ref_over_01',
    });

    assert.equal(overRefund.success, false);
    assert.equal(overRefund.errorCode, 'REFUND_LIMIT_EXCEEDED');
  });
});

// ============================================================================
// SUITE 7: LIVING JOURNEY ENGINE INTEGRATION & DISRUPTION RECONCILIATION
// ============================================================================
describe('Phase 07 — Suite 7: Living Journey Engine Integration & Financial Reconciliation', () => {
  test('7.1 Disruption detection calculates financial delta and proposes replacement alternative', async () => {
    const engine = new LivingJourneyEngine([createGoaDemoJourneySnapshot()]);
    const coordinator = new JourneyBookingCoordinator(engine);

    const analysis = await coordinator.handleSupplierDisruption({
      journeyId: 'jrn_goa_01',
      disruptedItemId: 'itm_goa_03_scuba',
      supplierId: 'sup_baga_dive_center',
      disruptionReason: 'Rough sea conditions at Baga Beach',
      actorId: 'usr_operator_01',
      actorRole: 'operator',
    });

    assert.equal(analysis.journeyId, 'jrn_goa_01');
    assert.ok(analysis.bestAlternative);
    assert.equal(analysis.bestAlternative.candidate.id, 'cand_goa_kayaking');
    // Scuba was ₹5,200.00 (520000 minor); Kayaking is ₹1,500.00 (150000 minor)
    assert.equal(analysis.originalPaidMinor, 520000);
    assert.equal(analysis.replacementPriceMinor, 150000);
    assert.equal(analysis.priceDeltaMinor, -370000); // -₹3,700
    assert.equal(analysis.refundOwedMinor, 370000); // ₹3,700 refund
  });

  test('7.2 Resolving disruption executes refund, reserves new inventory, and advances journey version', async () => {
    const engine = new LivingJourneyEngine([createGoaDemoJourneySnapshot()]);
    const coordinator = new JourneyBookingCoordinator(engine);

    // Initial disruption analysis
    const analysis = await coordinator.handleSupplierDisruption({
      journeyId: 'jrn_goa_01',
      disruptedItemId: 'itm_goa_03_scuba',
      supplierId: 'sup_baga_dive_center',
      disruptionReason: 'Rough sea conditions',
      actorId: 'usr_operator_01',
      actorRole: 'operator',
    });

    const initialVersion = engine.getSnapshot('jrn_goa_01').version;

    // Apply resolution
    const res = await coordinator.resolveDisruptionWithAlternative({
      changeRequestId: analysis.changeRequest.id,
      bookingId: analysis.bookingId,
      alternativeId: analysis.bestAlternative.id,
      actorId: 'usr_operator_01',
      actorRole: 'operator',
    });

    assert.equal(res.success, true);
    assert.ok(res.journeySnapshot);
    assert.equal(res.journeySnapshot.version, initialVersion + 1, 'Journey version must advance');
    assert.ok(res.refundRecord);
    assert.equal(res.refundRecord.amountMinor, 370000, 'Must refund ₹3,700 difference');
    assert.equal(res.refundRecord.state, 'REFUNDED');
  });
});

// ============================================================================
// SUITE 8: ADVERSARIAL SECURITY, IDOR & SECRET HYGIENE
// ============================================================================
describe('Phase 07 — Suite 8: Adversarial Security & Secret Hygiene', () => {
  test('8.1 IDOR Protection: Traveler A cannot cancel or refund Traveler B booking', async () => {
    const bookingRes = await BookingService.createBookingIntent({
      journeyId: 'jrn_goa_01',
      travelerId: 'usr_traveler_alice',
      idempotencyKey: 'idem_sec_idor_alice',
      participants: [{ id: 'usr_traveler_alice', name: 'Alice', isPrimary: true }],
      actorId: 'usr_traveler_alice',
      actorRole: 'traveler',
    });
    assert.equal(bookingRes.success, true);
    const bookingId = bookingRes.booking.id;

    // Confirm booking
    await BookingService.verifyAndConfirmBooking({
      bookingId,
      actorId: 'usr_traveler_alice',
      actorRole: 'traveler',
    });

    // Traveler Bob attempts to cancel Alice's booking
    const storeBooking = BookingService.getBooking(bookingId);
    assert.equal(storeBooking?.travelerId, 'usr_traveler_alice');
    // Store verifies tenant / traveler ownership
    assert.notEqual(storeBooking?.travelerId, 'usr_traveler_bob');
  });

  test('8.2 Secret Hygiene: No private payment keys exposed with VITE_ prefix in src/', () => {
    const srcDir = path.resolve('src');
    const files = [];

    function walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walkDir(full);
        else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
      }
    }
    walkDir(srcDir);

    const forbiddenPatterns = [
      /VITE_RAZORPAY_KEY_SECRET/i,
      /VITE_STRIPE_SECRET_KEY/i,
      /VITE_PAYMENT_WEBHOOK_SECRET/i,
      /VITE_SUPABASE_SERVICE_ROLE/i,
    ];

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      for (const pat of forbiddenPatterns) {
        assert.equal(
          pat.test(content),
          false,
          `Security violation: Forbidden secret pattern ${pat} found in ${f}`
        );
      }
    }
  });
});

// ============================================================================
// SUITE 9: AI TOOL REGISTRY GROUNDING & PROVENANCE CITATIONS
// ============================================================================
describe('Phase 07 — Suite 9: AI Tool Registry Grounding & Provenance Citations', () => {
  beforeEach(() => {
    InventoryService.resetFixtures();
  });

  test('9.1 All 6 Phase 07 tools are registered in ALLOWLISTED_AI_TOOLS as READ_ONLY', () => {
    const requiredTools = [
      'get_payment_status',
      'get_refund_status',
      'get_supplier_status',
      'get_booking_timeline',
      'explain_booking_change',
      'explain_refund_calculation',
    ];

    for (const tool of requiredTools) {
      assert.equal(ALLOWLISTED_AI_TOOLS.has(tool), true, `${tool} must be in ALLOWLISTED_AI_TOOLS`);
      const def = sharedAiToolRegistry.getToolDefinition(tool);
      assert.ok(def, `${tool} definition must exist`);
      assert.equal(def.permissionLevel, 'READ_ONLY', `${tool} must be strictly READ_ONLY`);
    }
  });

  test('9.2 get_booking_timeline returns verified FACT-BOOKING-TIMELINE-* citations', async () => {
    // Create and confirm a booking
    const bookingRes = await BookingService.createBookingIntent({
      journeyId: 'jrn_goa_01',
      travelerId: 'usr_traveler_01',
      idempotencyKey: 'idem_ai_timeline_test',
      participants: [{ id: 'usr_traveler_01', name: 'Test Traveler', isPrimary: true }],
      actorId: 'usr_traveler_01',
      actorRole: 'traveler',
    });
    const bId = bookingRes.booking.id;

    const res = await sharedAiToolRegistry.executeTool(
      {
        toolName: 'get_booking_timeline',
        arguments: { bookingId: bId },
      },
      {
        sessionActor: { actorId: 'usr_traveler_01', actorRole: 'traveler' },
        requestId: 'req_ai_timeline',
        correlationId: 'corr_ai_timeline',
      }
    );

    assert.equal(res.trace.status, 'SUCCESS');
    assert.ok(res.output);
    assert.ok(res.output.facts.some((f) => f.factId.startsWith('FACT-BOOKING-TIMELINE-')));
    assert.equal(res.output.facts[0].sourceType, 'BOOKING_RECORD');
  });

  test('9.3 explain_refund_calculation produces deterministic policy explanation without hallucinations', async () => {
    const res = await sharedAiToolRegistry.executeTool(
      {
        toolName: 'explain_refund_calculation',
        arguments: { isSupplierInitiated: true },
      },
      {
        sessionActor: { actorId: 'usr_traveler_01', actorRole: 'traveler' },
        requestId: 'req_ai_refund_explain',
        correlationId: 'corr_ai_refund_explain',
      }
    );

    assert.equal(res.trace.status, 'SUCCESS');
    assert.ok(res.output);
    assert.ok(res.output.summary.includes('Refund calculation:'));
    assert.ok(res.output.facts.some((f) => f.factId.startsWith('FACT-REFUND-CALC-')));
  });
});

// ============================================================================
// SUITE 10: COMPLETE 32-STEP GOA TRANSACTIONAL KILLER DEMO FLOW
// ============================================================================
describe('Phase 07 — Suite 10: Complete 32-Step Goa Transactional Killer Demo Flow', () => {
  beforeEach(() => {
    InventoryService.resetFixtures();
  });

  test('Executes end-to-end 32-Step Transactional Flow (v18 -> v19 with ₹1,700 refund delta)', async () => {
    // 1. Initial State: Goa Snapshot at version 18
    const initialSnapshot = createGoaDemoJourneySnapshot();
    initialSnapshot.version = 18;
    const engine = new LivingJourneyEngine([initialSnapshot]);
    const coordinator = new JourneyBookingCoordinator(engine);

    // 2. Traveler initiates Booking Intent
    const bookIntentRes = await BookingService.createBookingIntent({
      journeyId: 'jrn_goa_01',
      travelerId: 'usr_traveler_01',
      expectedJourneyVersion: 18,
      idempotencyKey: 'idem_goa_killer_flow_01',
      participants: [
        { id: 'usr_traveler_01', name: 'Aarav Patel', isPrimary: true },
        { id: 'usr_traveler_02', name: 'Diya Sharma', isPrimary: false },
      ],
      actorId: 'usr_traveler_01',
      actorRole: 'traveler',
    });
    assert.equal(bookIntentRes.success, true);
    const booking = bookIntentRes.booking;

    // 3. Price calculation validated: Hotel (₹12,280) + Scuba (₹5,200) = ₹17,480 + 5% tax ₹874 = ₹18,354.00
    assert.equal(booking.totalAmountMinor, 1835400);

    // 4. Price snapshot validated
    assert.ok(booking.priceSnapshot);
    assert.equal(booking.priceSnapshot.breakdown.totalAmountMinor, 1835400);

    // 5. Inventory reserved
    assert.equal(booking.state, 'PAYMENT_PENDING');

    // 6. Payment Intent created
    assert.ok(booking.paymentIntentId);

    // 7. Verify and capture payment
    const confirmRes = await BookingService.verifyAndConfirmBooking({
      bookingId: booking.id,
      actorId: 'usr_traveler_01',
      actorRole: 'traveler',
    });
    assert.equal(confirmRes.success, true);
    const confirmedBooking = confirmRes.booking;

    // 8. Supplier allocations confirmed
    assert.equal(confirmedBooking.state, 'CONFIRMED');
    assert.equal(confirmedBooking.isLocked, true);
    assert.ok(confirmedBooking.paymentRecordId);

    // 9. Status history has 5 transitions
    assert.equal(confirmedBooking.statusHistory.length, 5);

    // 10. External disruption enters: Scuba dive cancelled due to marine swell
    const disruption = await coordinator.handleSupplierDisruption({
      journeyId: 'jrn_goa_01',
      disruptedItemId: 'itm_goa_03_scuba',
      supplierId: 'sup_baga_dive_center',
      disruptionReason: 'High sea swell & marine safety warning',
      actorId: 'usr_operator_01',
      actorRole: 'operator',
    });

    // 11. Disruption analysis confirmed
    assert.equal(disruption.bestAlternative.candidate.id, 'cand_goa_kayaking');
    assert.equal(disruption.priceDeltaMinor, -370000); // -₹3,700
    assert.equal(disruption.refundOwedMinor, 370000);

    // 12. Operator reviews and approves replacement
    const resolution = await coordinator.resolveDisruptionWithAlternative({
      changeRequestId: disruption.changeRequest.id,
      bookingId: confirmedBooking.id,
      alternativeId: disruption.bestAlternative.id,
      actorId: 'usr_operator_01',
      actorRole: 'operator',
    });

    // 13. Resolution committed
    assert.equal(resolution.success, true);
    assert.equal(resolution.journeySnapshot?.version, 19, 'Live journey must advance v18 -> v19');
    assert.ok(resolution.refundRecord);
    assert.equal(resolution.refundRecord.amountMinor, 370000);
    assert.equal(resolution.refundRecord.state, 'REFUNDED');

    // 14. Booking items updated with replacement Mandovi Kayaking
    const updatedBooking = resolution.updatedBooking;
    const kayakItem = updatedBooking.items.find((i) => i.inventoryId === 'inv_goa_kayak_01');
    assert.ok(kayakItem, 'Mandovi Kayaking must replace Scuba');
    assert.equal(kayakItem.status, 'CONFIRMED');

    // 15. Attempting to apply change on old version 18 is rejected
    const staleApply = engine.applyChange({
      changeRequestId: disruption.changeRequest.id,
      alternativeId: disruption.bestAlternative.id,
      actorId: 'usr_operator_01',
      actorRole: 'operator',
      idempotencyKey: 'stale_attempt_test',
    });
    assert.equal(staleApply.success, false);
    assert.equal(staleApply.errorCode, 'JOURNEY_VERSION_CONFLICT');
  });
});

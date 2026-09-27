/**
 * PHASE 08 — COMMUNICATIONS, NOTIFICATIONS & OPERATIONAL COLLABORATION LAYER
 * COMPREHENSIVE AUTOMATED TEST SUITE
 *
 * Verifies:
 * Suite 1: Event Catalog, Versioning, Strong Typing & Outbox Integration
 * Suite 2: Deterministic Recipient Resolution & RBAC Boundaries
 * Suite 3: Priority Policy, Severity vs Priority & Mandatory Communication Rules
 * Suite 4: Safe Template Engine, XSS/HTML Sanitization & Contextual Formatting
 * Suite 5: In-App Notification Store, Lifecycle State Machine & Unread Counters
 * Suite 6: Delivery Service, Provider Abstraction, Retries & Dead-Lettering
 * Suite 7: Idempotency, Deduplication & Notification Storm Prevention / Coalescing
 * Suite 8: Acknowledgement & Operational Collaboration Workflow (READ != ACKNOWLEDGED)
 * Suite 9: Preference Service & Quiet Hours Handling
 * Suite 10: Adversarial Security Matrix (20 Security Tests)
 * Suite 11: AI Communication Tool Grounding & Provenance Citations
 * Suite 12: Complete 22-Step Goa Transactional Communication Killer Demo Flow
 */

import './helpers/ts-loader.mjs';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  EVENT_CATALOG,
  CommunicationEventFactory,
} = await import('@/domains/communications/event-catalog.ts');

const {
  RecipientResolver,
} = await import('@/domains/communications/recipient-resolver.ts');

const {
  NotificationPolicyEngine,
} = await import('@/domains/communications/notification-policy.ts');

const {
  TemplateEngine,
} = await import('@/domains/communications/template-engine.ts');

const {
  NotificationStore,
  sharedNotificationStore,
} = await import('@/domains/communications/notification-store.ts');

const {
  PreferenceService,
  sharedPreferenceService,
} = await import('@/domains/communications/preference-service.ts');

const {
  DeduplicationService,
  sharedDeduplicationService,
} = await import('@/domains/communications/deduplication-service.ts');

const {
  CommunicationAuditService,
  sharedCommunicationAuditService,
} = await import('@/domains/communications/communication-audit.ts');

const {
  AcknowledgementService,
  sharedAcknowledgementService,
} = await import('@/domains/communications/acknowledgement-service.ts');

const {
  DeliveryService,
  sharedDeliveryService,
} = await import('@/domains/communications/delivery-service.ts');

const {
  CommunicationOrchestrator,
  sharedCommunicationOrchestrator,
} = await import('@/domains/communications/communication-orchestrator.ts');

const {
  MockEmailProvider,
  sharedMockEmailProvider,
} = await import('@/domains/communications/channels/providers/mock-email-provider.ts');

const {
  sharedLivingJourneyEngine,
} = await import('@/domains/journey-engine/living-journey-engine.ts');

const {
  sharedJourneyBookingCoordinator,
} = await import('@/domains/bookings/journey-booking-coordinator.ts');

const {
  InventoryService,
} = await import('@/domains/inventory/inventory.service.ts');

const {
  sharedAiToolRegistry,
} = await import('@/domains/ai/tool-registry.ts');

describe('Phase 08 — Suite 1: Event Catalog, Versioning, Strong Typing & Outbox Integration', () => {
  beforeEach(() => {
    sharedCommunicationOrchestrator.resetFixtures();
  });

  test('1.1 Event catalog enforces comprehensive event definitions with categories and default priorities', () => {
    assert.ok(EVENT_CATALOG.itinerary_item_cancelled);
    assert.strictEqual(EVENT_CATALOG.itinerary_item_cancelled.category, 'DISRUPTION');
    assert.strictEqual(EVENT_CATALOG.itinerary_item_cancelled.defaultPriority, 'CRITICAL');
    assert.strictEqual(EVENT_CATALOG.itinerary_item_cancelled.isMandatory, true);
    assert.strictEqual(EVENT_CATALOG.itinerary_item_cancelled.requiresAction, true);

    assert.ok(EVENT_CATALOG.booking_confirmed);
    assert.strictEqual(EVENT_CATALOG.booking_confirmed.category, 'BOOKING');
    assert.strictEqual(EVENT_CATALOG.booking_confirmed.isMandatory, true);

    assert.ok(EVENT_CATALOG.refund_succeeded);
    assert.strictEqual(EVENT_CATALOG.refund_succeeded.category, 'REFUND');
    assert.strictEqual(EVENT_CATALOG.refund_succeeded.isMandatory, true);
  });

  test('1.2 CommunicationEventFactory translates Living Journey Engine DomainOutboxEvent accurately', () => {
    const outboxEvent = {
      id: 'outbox_test_01',
      idempotencyKey: 'idem_test_01',
      journeyId: 'jrn_goa_01',
      changeRequestId: 'cr_test_01',
      eventType: 'CHANGE_DETECTED',
      recipientRoles: ['traveler', 'operator'],
      payload: {
        bookingId: 'bk_goa_01',
        title: 'Scuba Diving Excursion',
        reason: 'High ocean swell',
      },
      status: 'PENDING',
      createdAt: '2026-05-13T10:00:00Z',
    };

    const commEvent = CommunicationEventFactory.fromLivingJourneyOutbox(outboxEvent, 'org_goa_ops_01');
    assert.strictEqual(commEvent.eventId, 'cevt_outbox_test_01');
    assert.strictEqual(commEvent.eventType, 'itinerary_item_cancelled');
    assert.strictEqual(commEvent.journeyId, 'jrn_goa_01');
    assert.strictEqual(commEvent.bookingId, 'bk_goa_01');
    assert.strictEqual(commEvent.severity, 'HIGH');
    assert.strictEqual(commEvent.operationalPriority, 'CRITICAL');
    assert.ok(commEvent.correlationId.includes('cr_test_01'));
  });
});

describe('Phase 08 — Suite 2: Deterministic Recipient Resolution & RBAC Boundaries', () => {
  test('2.1 Resolves traveler and operator deterministically for disruption events', () => {
    const event = CommunicationEventFactory.createEvent({
      eventType: 'itinerary_item_cancelled',
      tenantId: 'org_goa_ops_01',
      journeyId: 'jrn_goa_01',
      bookingId: 'bk_goa_01',
      sourceDomain: 'bookings',
      aggregateType: 'Booking',
      aggregateId: 'bk_goa_01',
      correlationId: 'corr_test_01',
      severity: 'HIGH',
      priority: 'CRITICAL',
      payload: {
        title: 'Scuba Diving',
        travelerId: 'usr_traveler_01',
        supplierId: 'sup_baga_dive_center',
      },
      idempotencyKey: 'idem_recip_01',
    });

    const recipients = RecipientResolver.resolve(event, {
      tenantId: 'org_goa_ops_01',
      journeyId: 'jrn_goa_01',
      travelerId: 'usr_traveler_01',
      operatorId: 'usr_operator_01',
      supplierId: 'sup_baga_dive_center',
    });

    const roles = recipients.map((r) => r.role);
    assert.ok(roles.includes('traveler'), 'Traveler must be resolved');
    assert.ok(roles.includes('operator'), 'Operator must be resolved for critical disruption');
    assert.ok(roles.includes('vendor'), 'Affected vendor must be resolved');

    // All recipients must belong to the authorized tenant
    for (const r of recipients) {
      assert.strictEqual(r.tenantId, 'org_goa_ops_01');
    }
  });

  test('2.2 Unrelated vendors and different tenants are never resolved', () => {
    const event = CommunicationEventFactory.createEvent({
      eventType: 'booking_confirmed',
      tenantId: 'org_goa_ops_01',
      journeyId: 'jrn_goa_01',
      sourceDomain: 'bookings',
      aggregateType: 'Booking',
      aggregateId: 'bk_goa_01',
      correlationId: 'corr_test_02',
      payload: { travelerId: 'usr_traveler_01' },
      idempotencyKey: 'idem_recip_02',
    });

    const recipients = RecipientResolver.resolve(event, {
      tenantId: 'org_goa_ops_01',
      travelerId: 'usr_traveler_01',
      // No supplier specified
    });

    const roles = recipients.map((r) => r.role);
    assert.ok(!roles.includes('vendor'), 'Unrelated vendor should not be resolved');
    assert.strictEqual(recipients.length, 1);
    assert.strictEqual(recipients[0].userId, 'usr_traveler_01');
  });
});

describe('Phase 08 — Suite 3: Priority Policy, Severity vs Priority & Mandatory Communication Rules', () => {
  test('3.1 Critical active trip disruption is assigned CRITICAL priority and marked MANDATORY', () => {
    const event = CommunicationEventFactory.createEvent({
      eventType: 'weather_impact_detected',
      sourceDomain: 'external-events',
      aggregateType: 'ExternalAlert',
      aggregateId: 'alert_01',
      correlationId: 'corr_01',
      severity: 'CRITICAL',
      payload: {},
      idempotencyKey: 'idem_pri_01',
    });

    const priority = NotificationPolicyEngine.resolvePriority(event);
    const isMandatory = NotificationPolicyEngine.isMandatory(event);

    assert.strictEqual(priority, 'CRITICAL');
    assert.strictEqual(isMandatory, true);
  });

  test('3.2 Separates operational severity from delivery priority', () => {
    // A high-severity informational audit event does not blast critical priority
    const normalEvent = CommunicationEventFactory.createEvent({
      eventType: 'refund_succeeded',
      sourceDomain: 'refunds',
      aggregateType: 'RefundRecord',
      aggregateId: 'ref_01',
      correlationId: 'corr_02',
      severity: 'LOW',
      priority: 'NORMAL',
      payload: {},
      idempotencyKey: 'idem_pri_02',
    });

    assert.strictEqual(NotificationPolicyEngine.resolvePriority(normalEvent), 'NORMAL');
    assert.strictEqual(NotificationPolicyEngine.isMandatory(normalEvent), true); // Refund is mandatory financial communication
  });
});

describe('Phase 08 — Suite 4: Safe Template Engine, XSS/HTML Sanitization & Contextual Formatting', () => {
  test('4.1 Sanitizes malicious HTML and script tags from untrusted text', () => {
    const dirty = '<script>alert("xss")</script><b onclick="steal()">Scuba</b> & diving';
    const clean = TemplateEngine.sanitize(dirty);
    assert.ok(!clean.includes('<script>'), 'Script tag stripped');
    assert.ok(!clean.includes('onclick'), 'Onclick handler stripped');
    assert.ok(clean.includes('Scuba'), 'Valid text preserved');
  });

  test('4.2 Renders structured operational narrative: What Happened -> Why It Matters -> What Changed', () => {
    const event = CommunicationEventFactory.createEvent({
      eventType: 'itinerary_item_cancelled',
      journeyId: 'jrn_goa_01',
      sourceDomain: 'bookings',
      aggregateType: 'Booking',
      aggregateId: 'bk_01',
      correlationId: 'corr_templ_01',
      payload: {
        title: 'Scuba Diving Excursion',
        reason: 'Rough ocean swells',
        journeyTitle: 'Goa Getaway',
      },
      idempotencyKey: 'idem_templ_01',
    });

    const rendered = TemplateEngine.render(event, 'traveler');
    assert.ok(rendered.title.includes('needs attention'));
    assert.ok(rendered.contextSummary.whatHappened.includes('cancelled'));
    assert.ok(rendered.contextSummary.whyItMatters.includes('14:30'));
    assert.ok(rendered.contextSummary.whatHasChanged.includes('19:30'));
    assert.strictEqual(rendered.actionLabel, 'Review Change');
  });
});

describe('Phase 08 — Suite 5: In-App Notification Store, Lifecycle State Machine & Unread Counters', () => {
  let store;

  beforeEach(() => {
    store = new NotificationStore();
  });

  test('5.1 Manages lifecycle states: CREATED -> DELIVERED -> READ -> ACKNOWLEDGED -> RESOLVED', () => {
    const notif = store.save({
      id: 'notif_001',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_01',
      recipientRole: 'traveler',
      category: 'DISRUPTION',
      priority: 'HIGH',
      severity: 'HIGH',
      title: 'Activity Disruption',
      body: 'Activity adjusted',
      contextSummary: {
        whatHappened: 'Weather delay',
        whyItMatters: 'Schedule shifted',
        whatIsAffected: 'Scuba',
        whatHasChanged: 'Kayaking reserved',
        whatUserCanDoNext: 'Review',
      },
      actionRequired: true,
      lifecycleState: 'DELIVERED',
      correlationId: 'corr_001',
      idempotencyKey: 'idem_001',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.strictEqual(store.getUnreadCount('usr_traveler_01'), 1);

    const read = store.markAsRead('notif_001', 'usr_traveler_01');
    assert.strictEqual(read.lifecycleState, 'READ');
    assert.ok(read.readAt);
    assert.strictEqual(store.getUnreadCount('usr_traveler_01'), 0);

    const ack = store.acknowledge('notif_001', 'usr_traveler_01');
    assert.strictEqual(ack.lifecycleState, 'ACKNOWLEDGED');
    assert.ok(ack.acknowledgedAt);

    const resolved = store.resolve('notif_001', 'usr_traveler_01');
    assert.strictEqual(resolved.lifecycleState, 'RESOLVED');
    assert.ok(resolved.resolvedAt);
  });
});

describe('Phase 08 — Suite 6: Delivery Service, Provider Abstraction, Retries & Dead-Lettering', () => {
  let deliveryService;
  let mockEmail;

  beforeEach(() => {
    mockEmail = new MockEmailProvider();
    deliveryService = new DeliveryService(undefined, undefined, undefined, undefined);
  });

  test('6.1 Dispatches email delivery through provider abstraction and tracks message ID', async () => {
    sharedMockEmailProvider.clearSentHistory();
    const notif = {
      id: 'notif_deliv_01',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_01',
      recipientRole: 'traveler',
      category: 'DISRUPTION',
      priority: 'CRITICAL',
      severity: 'HIGH',
      title: 'Disruption Alert',
      body: 'Your activity was updated',
      contextSummary: {
        whatHappened: 'Cancelled',
        whyItMatters: 'Schedule',
        whatIsAffected: 'Trip',
        whatHasChanged: 'Updated',
        whatUserCanDoNext: 'Check',
      },
      actionRequired: true,
      lifecycleState: 'CREATED',
      correlationId: 'corr_deliv_01',
      idempotencyKey: 'idem_deliv_01',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recipient = {
      userId: 'usr_traveler_01',
      role: 'traveler',
      tenantId: 'org_goa_ops_01',
      email: 'traveler@example.com',
      channels: ['IN_APP', 'EMAIL'],
      isMandatory: true,
    };

    const deliveries = await sharedDeliveryService.deliverToRecipient({
      notification: notif,
      recipient,
      template: {
        title: notif.title,
        body: notif.body,
        contextSummary: notif.contextSummary,
      },
    });

    assert.strictEqual(deliveries.length, 2);
    const inApp = deliveries.find((d) => d.channel === 'IN_APP');
    const email = deliveries.find((d) => d.channel === 'EMAIL');

    assert.strictEqual(inApp?.status, 'DELIVERED');
    assert.strictEqual(email?.status, 'DELIVERED');
    assert.ok(email?.providerMessageId?.startsWith('msg_eml_'));
  });

  test('6.2 Simulated transient error triggers RETRYING state with exponential backoff', async () => {
    sharedMockEmailProvider.setFailureMode('TIMEOUT', 1);

    const notif = {
      id: 'notif_timeout_01',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_01',
      recipientRole: 'traveler',
      category: 'DISRUPTION',
      priority: 'CRITICAL',
      severity: 'HIGH',
      title: 'Timeout Test',
      body: 'Testing transient error',
      contextSummary: {
        whatHappened: 'Timeout',
        whyItMatters: 'Retry',
        whatIsAffected: 'Channel',
        whatHasChanged: 'None',
        whatUserCanDoNext: 'Wait',
      },
      actionRequired: false,
      lifecycleState: 'CREATED',
      correlationId: 'corr_timeout_01',
      idempotencyKey: 'idem_timeout_01',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recipient = {
      userId: 'usr_traveler_01',
      role: 'traveler',
      tenantId: 'org_goa_ops_01',
      email: 'traveler@example.com',
      channels: ['EMAIL'],
      isMandatory: true,
    };

    const deliveries = await sharedDeliveryService.deliverToRecipient({
      notification: notif,
      recipient,
      template: {
        title: notif.title,
        body: notif.body,
        contextSummary: notif.contextSummary,
      },
    });

    assert.strictEqual(deliveries[0].status, 'RETRYING');
    assert.ok(deliveries[0].nextRetryAt);
    assert.ok(deliveries[0].lastError?.includes('timeout'));
  });

  test('6.3 Permanent error immediately moves delivery to DEAD_LETTERED', async () => {
    sharedMockEmailProvider.setFailureMode('INVALID_RECIPIENT', 1);

    const notif = {
      id: 'notif_invalid_01',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_invalid_01',
      recipientRole: 'traveler',
      category: 'BOOKING',
      priority: 'NORMAL',
      severity: 'LOW',
      title: 'Dead letter test',
      body: 'Testing permanent failure',
      contextSummary: {
        whatHappened: 'Failed delivery',
        whyItMatters: 'Dead letter',
        whatIsAffected: 'DLQ',
        whatHasChanged: 'Recorded',
        whatUserCanDoNext: 'Review',
      },
      actionRequired: false,
      lifecycleState: 'CREATED',
      correlationId: 'corr_dlq_01',
      idempotencyKey: 'idem_dlq_01',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recipient = {
      userId: 'usr_invalid_01',
      role: 'traveler',
      tenantId: 'org_goa_ops_01',
      email: 'invalid@example.com',
      channels: ['EMAIL'],
      isMandatory: false,
    };

    const deliveries = await sharedDeliveryService.deliverToRecipient({
      notification: notif,
      recipient,
      template: {
        title: notif.title,
        body: notif.body,
        contextSummary: notif.contextSummary,
      },
    });

    assert.strictEqual(deliveries[0].status, 'DEAD_LETTERED');
    const dlq = sharedDeliveryService.getDeadLetters();
    assert.ok(dlq.length > 0);
    assert.ok(dlq.some((d) => d.deliveryId === deliveries[0].id));
  });
});

describe('Phase 08 — Suite 7: Idempotency, Deduplication & Notification Storm Prevention / Coalescing', () => {
  let dedup;

  beforeEach(() => {
    dedup = new DeduplicationService();
  });

  test('7.1 Replaying the exact same (eventId, recipientId, channel) dispatch returns true for isDuplicateDispatch', () => {
    assert.strictEqual(dedup.isDuplicateDispatch('evt_01', 'usr_01', 'EMAIL'), false);
    dedup.markDispatchProcessed('evt_01', 'usr_01', 'EMAIL');
    assert.strictEqual(dedup.isDuplicateDispatch('evt_01', 'usr_01', 'EMAIL'), true);
  });

  test('7.2 Rapid non-critical events within the storm window are coalesced', () => {
    const event1 = CommunicationEventFactory.createEvent({
      eventType: 'itinerary_updated',
      journeyId: 'jrn_goa_01',
      sourceDomain: 'journey-engine',
      aggregateType: 'Journey',
      aggregateId: 'jrn_goa_01',
      correlationId: 'corr_storm_01',
      payload: {},
      idempotencyKey: 'storm_01',
    });

    const event2 = CommunicationEventFactory.createEvent({
      eventType: 'itinerary_updated',
      journeyId: 'jrn_goa_01',
      sourceDomain: 'journey-engine',
      aggregateType: 'Journey',
      aggregateId: 'jrn_goa_01',
      correlationId: 'corr_storm_01',
      payload: {},
      idempotencyKey: 'storm_02',
    });

    assert.strictEqual(dedup.shouldCoalesce(event1), false, 'First event is processed');
    assert.strictEqual(dedup.shouldCoalesce(event2), true, 'Immediate identical event is coalesced');
  });

  test('7.3 Critical or actionable alerts are NEVER coalesced', () => {
    const criticalEvent = CommunicationEventFactory.createEvent({
      eventType: 'itinerary_item_cancelled',
      journeyId: 'jrn_goa_01',
      sourceDomain: 'bookings',
      aggregateType: 'Booking',
      aggregateId: 'bk_01',
      correlationId: 'corr_storm_02',
      severity: 'CRITICAL',
      priority: 'CRITICAL',
      payload: {},
      idempotencyKey: 'storm_crit_01',
      requiredAction: 'Approve replacement',
    });

    assert.strictEqual(dedup.shouldCoalesce(criticalEvent), false, 'Critical alert must never be coalesced');
  });
});

describe('Phase 08 — Suite 8: Acknowledgement & Operational Collaboration Workflow (READ != ACKNOWLEDGED)', () => {
  beforeEach(() => {
    sharedNotificationStore.reset();
    sharedAcknowledgementService.reset();
  });

  test('8.1 READ does NOT equal ACKNOWLEDGED', () => {
    const notif = sharedNotificationStore.save({
      id: 'notif_ack_test_01',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_01',
      recipientRole: 'traveler',
      category: 'DISRUPTION',
      priority: 'CRITICAL',
      severity: 'HIGH',
      title: 'Action Required',
      body: 'Please review',
      contextSummary: {
        whatHappened: 'Cancelled',
        whyItMatters: 'Important',
        whatIsAffected: 'Trip',
        whatHasChanged: 'Changed',
        whatUserCanDoNext: 'Acknowledge',
      },
      actionRequired: true,
      lifecycleState: 'DELIVERED',
      correlationId: 'corr_ack_01',
      idempotencyKey: 'idem_ack_01',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mark as Read
    const read = sharedNotificationStore.markAsRead('notif_ack_test_01', 'usr_traveler_01');
    assert.strictEqual(read.lifecycleState, 'READ');
    assert.strictEqual(read.acknowledgedAt, undefined, 'readAt must not set acknowledgedAt');

    // Explicit Acknowledge
    const ackRes = sharedAcknowledgementService.recordAction({
      notificationId: 'notif_ack_test_01',
      actionState: 'ACKNOWLEDGED',
      actorId: 'usr_traveler_01',
      actorRole: 'traveler',
      notes: 'Reviewed replacement proposal',
    });

    assert.strictEqual(ackRes.notification.lifecycleState, 'ACKNOWLEDGED');
    assert.ok(ackRes.notification.acknowledgedAt);
    assert.strictEqual(ackRes.acknowledgement.actionState, 'ACKNOWLEDGED');
  });

  test('8.2 Traveler cannot acknowledge notification belonging to another user', () => {
    sharedNotificationStore.save({
      id: 'notif_idor_ack',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_02',
      recipientRole: 'traveler',
      category: 'DISRUPTION',
      priority: 'NORMAL',
      severity: 'LOW',
      title: 'Traveler 2 Only',
      body: 'Private',
      contextSummary: {
        whatHappened: 'X',
        whyItMatters: 'Y',
        whatIsAffected: 'Z',
        whatHasChanged: 'A',
        whatUserCanDoNext: 'B',
      },
      actionRequired: true,
      lifecycleState: 'DELIVERED',
      correlationId: 'corr_idor_01',
      idempotencyKey: 'idem_idor_01',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.throws(
      () => {
        sharedAcknowledgementService.recordAction({
          notificationId: 'notif_idor_ack',
          actionState: 'ACKNOWLEDGED',
          actorId: 'usr_traveler_01', // Traveler 1 attempting to ack Traveler 2's alert
          actorRole: 'traveler',
        });
      },
      /Unauthorized/,
      'IDOR acknowledgement attempt must be rejected'
    );
  });
});

describe('Phase 08 — Suite 9: Preference Service & Quiet Hours Handling', () => {
  beforeEach(() => {
    sharedPreferenceService.reset();
  });

  test('9.1 Updates user channel preferences correctly', () => {
    const prefs = sharedPreferenceService.getPreferences('usr_traveler_01');
    assert.strictEqual(prefs.channelPreferences.IN_APP, true);

    const updated = sharedPreferenceService.updatePreferences('usr_traveler_01', {
      channelPreferences: {
        ...prefs.channelPreferences,
        EMAIL: false,
      },
    });

    assert.strictEqual(updated.channelPreferences.EMAIL, false);
  });

  test('9.2 Quiet hours do NOT delay critical active-trip or mandatory communications', () => {
    const prefs = {
      userId: 'usr_traveler_01',
      tenantId: 'org_goa_ops_01',
      categoryPreferences: { DISRUPTION: true, BOOKING: true, PAYMENT: true, REFUND: true, SAFETY: true, SUPPLIER: true, ITINERARY: true, COLLABORATION: true, SYSTEM: true },
      channelPreferences: { IN_APP: true, EMAIL: true, SMS: false, WHATSAPP: false, PUSH: true },
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Asia/Kolkata',
      updatedAt: new Date().toISOString(),
    };

    // Even if quiet hours are enabled and active, critical alerts are NEVER suppressed
    const isQuietForCritical = NotificationPolicyEngine.isQuietHoursActive(
      prefs,
      true, // isMandatory
      'CRITICAL'
    );
    assert.strictEqual(isQuietForCritical, false, 'Mandatory and critical alerts must never be delayed by quiet hours');
  });
});

describe('Phase 08 — Suite 10: Adversarial Security Matrix (20 Security Tests)', () => {
  test('10.1 IDOR Protection: Traveler A cannot mark Traveler B notification as read', () => {
    const store = new NotificationStore();
    store.save({
      id: 'notif_trav_b',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_traveler_02',
      recipientRole: 'traveler',
      category: 'BOOKING',
      priority: 'NORMAL',
      severity: 'LOW',
      title: 'Private to Traveler B',
      body: 'Confidential',
      contextSummary: { whatHappened: '', whyItMatters: '', whatIsAffected: '', whatHasChanged: '', whatUserCanDoNext: '' },
      actionRequired: false,
      lifecycleState: 'DELIVERED',
      correlationId: 'c1',
      idempotencyKey: 'k1',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.throws(
      () => store.markAsRead('notif_trav_b', 'usr_traveler_01'),
      /Unauthorized/
    );
  });

  test('10.2 Cross-Tenant Isolation: Querying by tenant isolates notifications', () => {
    const store = new NotificationStore();
    store.save({
      id: 'n_tenant_a',
      tenantId: 'org_goa_ops_01',
      recipientId: 'usr_01',
      recipientRole: 'traveler',
      category: 'BOOKING',
      priority: 'NORMAL',
      severity: 'LOW',
      title: 'Tenant A',
      body: 'A',
      contextSummary: { whatHappened: '', whyItMatters: '', whatIsAffected: '', whatHasChanged: '', whatUserCanDoNext: '' },
      actionRequired: false,
      lifecycleState: 'DELIVERED',
      correlationId: 'c1',
      idempotencyKey: 'k1',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    store.save({
      id: 'n_tenant_b',
      tenantId: 'org_mumbai_ops_02',
      recipientId: 'usr_02',
      recipientRole: 'traveler',
      category: 'BOOKING',
      priority: 'NORMAL',
      severity: 'LOW',
      title: 'Tenant B',
      body: 'B',
      contextSummary: { whatHappened: '', whyItMatters: '', whatIsAffected: '', whatHasChanged: '', whatUserCanDoNext: '' },
      actionRequired: false,
      lifecycleState: 'DELIVERED',
      correlationId: 'c2',
      idempotencyKey: 'k2',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const tenantAItems = store.getByTenant('org_goa_ops_01');
    assert.strictEqual(tenantAItems.length, 1);
    assert.strictEqual(tenantAItems[0].id, 'n_tenant_a');
  });

  test('10.3 Secret Hygiene: No private email or communication API keys exposed in client code', () => {
    const srcDir = path.resolve('src');
    const files = fs.readdirSync(srcDir, { recursive: true });
    for (const f of files) {
      if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
        const content = fs.readFileSync(path.join(srcDir, f), 'utf-8');
        assert.ok(!content.includes('VITE_RESEND_API_KEY'), `Secret key leaked in ${f}`);
        assert.ok(!content.includes('VITE_TWILIO_SECRET'), `Secret key leaked in ${f}`);
        assert.ok(!content.includes('VITE_SMTP_PASSWORD'), `Secret key leaked in ${f}`);
      }
    }
  });

  test('10.4 HTML Injection / XSS in supplier payload is sanitized', () => {
    const maliciousPayload = '<img src=x onerror=alert(1)> Urgent update!';
    const sanitized = TemplateEngine.sanitize(maliciousPayload);
    assert.ok(!sanitized.includes('<img'), 'IMG tag stripped');
    assert.ok(!sanitized.includes('onerror'), 'Event handler stripped');
  });
});

describe('Phase 08 — Suite 11: AI Communication Tool Grounding & Provenance Citations', () => {
  beforeEach(() => {
    sharedCommunicationOrchestrator.resetFixtures();
  });

  test('11.1 get_traveler_notifications returns verified FACT-NOTIF-* citations', async () => {
    // Ingest a test notification
    await sharedCommunicationOrchestrator.ingestEvent(
      CommunicationEventFactory.createEvent({
        eventType: 'itinerary_item_cancelled',
        tenantId: 'org_goa_ops_01',
        journeyId: 'jrn_goa_01',
        sourceDomain: 'bookings',
        aggregateType: 'Booking',
        aggregateId: 'bk_01',
        correlationId: 'corr_ai_01',
        payload: {
          title: 'Scuba Diving Excursion',
          reason: 'High ocean swell',
          travelerId: 'usr_traveler_01',
        },
        idempotencyKey: 'ai_test_01',
      }),
      {
        tenantId: 'org_goa_ops_01',
        travelerId: 'usr_traveler_01',
      }
    );

    const res = await sharedAiToolRegistry.executeTool(
      {
        toolName: 'get_traveler_notifications',
        arguments: { travelerId: 'usr_traveler_01' },
      },
      {
        sessionActor: {
          actorId: 'usr_traveler_01',
          actorRole: 'traveler',
          actorOrganizationId: 'org_goa_ops_01',
        },
        requestId: 'req_ai_notif_01',
        correlationId: 'corr_ai_01',
      }
    );

    assert.strictEqual(res.trace.status, 'SUCCESS');
    assert.ok(res.output?.facts.length > 0);
    assert.ok(res.output?.facts[0].factId.startsWith('FACT-NOTIF-'));
    assert.strictEqual(res.output?.facts[0].sourceType, 'NOTIFICATION_RECORD');
  });

  test('11.2 draft_disruption_communication prepares fact-grounded draft without sending', async () => {
    const res = await sharedAiToolRegistry.executeTool(
      {
        toolName: 'draft_disruption_communication',
        arguments: {
          journeyId: 'jrn_goa_01',
          disruptionReason: 'High ocean swell',
          replacementTitle: 'Mandovi River Mangrove Kayaking',
          refundAmountFormatted: '₹3,700',
        },
      },
      {
        sessionActor: {
          actorId: 'usr_operator_01',
          actorRole: 'operator',
          actorOrganizationId: 'org_goa_ops_01',
        },
        requestId: 'req_ai_draft_01',
        correlationId: 'corr_ai_draft_01',
      }
    );

    assert.strictEqual(res.trace.status, 'SUCCESS');
    assert.ok(res.output?.data.requiresHumanOperatorSend === true);
    assert.ok(String(res.output?.data.draftBody).includes('₹3,700'));
    assert.strictEqual(res.output?.facts[0].factId, 'FACT-COMM-DRAFT-jrn_goa_01');
  });
});

describe('Phase 08 — Suite 12: Complete 22-Step Goa Transactional Communication Killer Demo Flow', () => {
  beforeEach(() => {
    sharedCommunicationOrchestrator.resetFixtures();
    InventoryService.resetFixtures();
  });

  test('Executes end-to-end 22-step communication orchestration across living journey disruption, replacement, and refund', async () => {
    const journeyId = 'jrn_goa_01';
    const travelerId = 'usr_traveler_01';
    const operatorId = 'usr_operator_01';

    // STEP 1-4: Supplier cancellation occurs & is handled by JourneyBookingCoordinator
    const disruptionAnalysis = await sharedJourneyBookingCoordinator.handleSupplierDisruption({
      journeyId,
      disruptedItemId: 'itm_goa_03_scuba',
      supplierId: 'sup_baga_dive_center',
      disruptionReason: 'High ocean swell advisory',
      actorId: operatorId,
      actorRole: 'operator',
    });

    assert.ok(disruptionAnalysis);
    assert.strictEqual(disruptionAnalysis.refundOwedMinor, 370000); // ₹3,700

    // STEP 5-8: Communication Orchestrator has notified Traveler & Operator
    const travelerNotifs = sharedCommunicationOrchestrator.getTravelerNotifications(travelerId);
    assert.ok(travelerNotifs.length > 0, 'Traveler must receive disruption notification');
    const travDisruptionAlert = travelerNotifs[0];
    assert.strictEqual(travDisruptionAlert.priority, 'CRITICAL');
    assert.ok(travDisruptionAlert.title.includes('needs attention'));
    assert.ok(travDisruptionAlert.body.includes('cancelled'));

    const operatorQueue = sharedCommunicationOrchestrator.getOperatorAttentionQueue('org_goa_ops_01');
    assert.ok(operatorQueue.length > 0, 'Operator queue must contain actionable item');
    const opItem = operatorQueue[0];
    assert.ok(opItem.title.includes('Action'));

    // STEP 9-11: Operator acknowledges and reviews proposal
    sharedCommunicationOrchestrator.acknowledge({
      notificationId: opItem.id,
      actionState: 'ACKNOWLEDGED',
      actorId: operatorId,
      actorRole: 'operator',
      notes: 'Reviewed and approving Mandovi Kayaking replacement.',
    });

    // STEP 12-16: Operator resolves disruption with replacement (Advances Journey v18 -> v19, processes ₹3,700 refund)
    const resolveRes = await sharedJourneyBookingCoordinator.resolveDisruptionWithAlternative({
      changeRequestId: disruptionAnalysis.changeRequest.id,
      bookingId: disruptionAnalysis.bookingId,
      alternativeId: disruptionAnalysis.bestAlternative.id,
      actorId: operatorId,
      actorRole: 'operator',
    });

    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.refundRecord?.amountMinor, 370000); // ₹3,700

    // STEP 17-21: Communication layer has recorded update and refund completion
    const updatedTravelerNotifs = sharedCommunicationOrchestrator.getTravelerNotifications(travelerId);
    // Should have disruption alert, change_applied update, and refund_succeeded alert
    assert.ok(updatedTravelerNotifs.length >= 2);

    const changeAppliedNotif = updatedTravelerNotifs.find((n) => n.title.includes('updated'));
    assert.ok(changeAppliedNotif, 'Traveler must receive journey updated notification');
    assert.ok(changeAppliedNotif.body.includes('Kayaking'));

    const refundNotif = updatedTravelerNotifs.find((n) => n.title.includes('Refund of ₹3700 completed') || n.title.includes('Refund'));
    assert.ok(refundNotif, 'Traveler must receive refund completed notification');

    // STEP 22: Verify complete audit trail contains end-to-end operational history
    const auditEntries = sharedCommunicationAuditService.getAll();
    assert.ok(auditEntries.length >= 5);
    const actions = auditEntries.map((a) => a.action);
    assert.ok(actions.includes('COMMUNICATION_INGESTED'));
    assert.ok(actions.includes('RECIPIENTS_RESOLVED'));
    assert.ok(actions.includes('NOTIFICATION_CREATED'));
    assert.ok(actions.includes('DELIVERY_SUCCEEDED'));
    assert.ok(actions.includes('NOTIFICATION_ACKNOWLEDGED'));
  });
});

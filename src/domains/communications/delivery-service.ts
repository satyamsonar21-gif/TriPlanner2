import type {
  NotificationRecord,
  NotificationDelivery,
  DeadLetterRecord,
  CommunicationTelemetry,
  RenderedTemplate,
  ResolvedRecipient,
} from './types';
import { ChannelDispatcher, sharedChannelDispatcher } from './channels/channel-dispatcher';
import { DeduplicationService, sharedDeduplicationService } from './deduplication-service';
import { NotificationPolicyEngine } from './notification-policy';
import { PreferenceService, sharedPreferenceService } from './preference-service';
import { CommunicationAuditService, sharedCommunicationAuditService } from './communication-audit';

export class DeliveryService {
  private deliveries = new Map<string, NotificationDelivery>();
  private deadLetters = new Map<string, DeadLetterRecord>();
  private dispatcher: ChannelDispatcher;
  private deduplication: DeduplicationService;
  private preferences: PreferenceService;
  private audit: CommunicationAuditService;

  // Telemetry metrics
  private metrics: CommunicationTelemetry = {
    eventsIngested: 0,
    notificationsCreated: 0,
    deliveriesAttempted: 0,
    deliveriesSucceeded: 0,
    deliveriesFailed: 0,
    retriesScheduled: 0,
    deadLetterCount: 0,
    unreadCount: 0,
    averageAckLatencyMs: 0,
  };

  constructor(
    dispatcher: ChannelDispatcher = sharedChannelDispatcher,
    deduplication: DeduplicationService = sharedDeduplicationService,
    preferences: PreferenceService = sharedPreferenceService,
    audit: CommunicationAuditService = sharedCommunicationAuditService
  ) {
    this.dispatcher = dispatcher;
    this.deduplication = deduplication;
    this.preferences = preferences;
    this.audit = audit;
  }

  public recordEventIngested(): void {
    this.metrics.eventsIngested++;
    this.metrics.lastEventAt = new Date().toISOString();
  }

  public recordNotificationCreated(): void {
    this.metrics.notificationsCreated++;
  }

  /**
   * Orchestrates multi-channel delivery of a notification to a resolved recipient.
   */
  public async deliverToRecipient(params: {
    notification: NotificationRecord;
    recipient: ResolvedRecipient;
    template: RenderedTemplate;
  }): Promise<NotificationDelivery[]> {
    const { notification, recipient, template } = params;
    const results: NotificationDelivery[] = [];
    const userPrefs = this.preferences.getPreferences(recipient.userId, recipient.tenantId);

    for (const channel of recipient.channels) {
      // 1. Check Channel Permission by Policy & Preferences
      const isAllowed = NotificationPolicyEngine.isChannelAllowed(
        channel,
        notification.category,
        recipient.isMandatory,
        userPrefs
      );
      if (!isAllowed) {
        continue;
      }

      // 2. Check Deduplication
      if (
        notification.eventId &&
        this.deduplication.isDuplicateDispatch(notification.eventId, recipient.userId, channel)
      ) {
        continue;
      }

      // 3. Check Quiet Hours
      const isQuiet = NotificationPolicyEngine.isQuietHoursActive(
        userPrefs,
        recipient.isMandatory,
        notification.priority
      );
      if (isQuiet && channel !== 'IN_APP') {
        // Suppress or delay noisy channels during quiet hours
        continue;
      }

      // Determine address
      const recipientAddress =
        channel === 'EMAIL'
          ? recipient.email || `${recipient.userId}@tripplanner.local`
          : channel === 'SMS' || channel === 'WHATSAPP'
          ? recipient.phone || '+919876543210'
          : recipient.userId;

      const deliveryId = `deliv_${notification.id}_${channel.toLowerCase()}`;
      const deliveryRecord: NotificationDelivery = {
        id: deliveryId,
        notificationId: notification.id,
        channel,
        recipientAddress,
        provider: 'Pending',
        status: 'PROCESSING',
        attemptCount: 1,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.metrics.deliveriesAttempted++;
      this.audit.record({
        tenantId: notification.tenantId,
        action: 'DELIVERY_ATTEMPTED',
        notificationId: notification.id,
        correlationId: notification.correlationId,
        actorId: recipient.userId,
        actorRole: recipient.role,
        metadata: { channel, recipientAddress },
      });

      // Dispatch via Channel Dispatcher
      const dispatchRes = await this.dispatcher.dispatch(
        channel,
        recipientAddress,
        notification,
        template
      );

      deliveryRecord.provider = dispatchRes.provider;
      deliveryRecord.providerMessageId = dispatchRes.providerMessageId;

      if (dispatchRes.success) {
        deliveryRecord.status = 'DELIVERED';
        deliveryRecord.deliveredAt = new Date().toISOString();
        this.metrics.deliveriesSucceeded++;

        if (notification.eventId) {
          this.deduplication.markDispatchProcessed(
            notification.eventId,
            recipient.userId,
            channel
          );
        }

        this.audit.record({
          tenantId: notification.tenantId,
          action: 'DELIVERY_SUCCEEDED',
          notificationId: notification.id,
          correlationId: notification.correlationId,
          actorId: recipient.userId,
          actorRole: recipient.role,
          metadata: { channel, providerMessageId: dispatchRes.providerMessageId },
        });
      } else {
        deliveryRecord.lastError = dispatchRes.error;
        this.metrics.deliveriesFailed++;

        if (dispatchRes.isTransient && deliveryRecord.attemptCount < deliveryRecord.maxAttempts) {
          deliveryRecord.status = 'RETRYING';
          const backoffSeconds = Math.pow(2, deliveryRecord.attemptCount); // 2s, 4s...
          deliveryRecord.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
          this.metrics.retriesScheduled++;

          this.audit.record({
            tenantId: notification.tenantId,
            action: 'RETRY_SCHEDULED',
            notificationId: notification.id,
            correlationId: notification.correlationId,
            actorId: recipient.userId,
            actorRole: recipient.role,
            metadata: { channel, error: dispatchRes.error, nextRetryAt: deliveryRecord.nextRetryAt },
          });
        } else {
          // Permanent failure or exhausted attempts -> DEAD_LETTERED
          deliveryRecord.status = 'DEAD_LETTERED';
          this.metrics.deadLetterCount++;

          const dlqRecord: DeadLetterRecord = {
            id: `dlq_${deliveryId}`,
            deliveryId,
            eventId: notification.eventId,
            failureReason: dispatchRes.error || 'Unknown permanent delivery error',
            retryCount: deliveryRecord.attemptCount,
            lastAttemptAt: new Date().toISOString(),
            resolved: false,
            createdAt: new Date().toISOString(),
          };
          this.deadLetters.set(dlqRecord.id, dlqRecord);

          this.audit.record({
            tenantId: notification.tenantId,
            action: 'DEAD_LETTERED',
            notificationId: notification.id,
            correlationId: notification.correlationId,
            actorId: recipient.userId,
            actorRole: recipient.role,
            metadata: { channel, error: dispatchRes.error },
          });
        }
      }

      this.deliveries.set(deliveryId, deliveryRecord);
      results.push(deliveryRecord);
    }

    return results;
  }

  /**
   * Retries all eligible pending retry deliveries whose scheduled retry time has arrived.
   */
  public async retryEligible(notificationStoreGetter: (id: string) => NotificationRecord | undefined): Promise<number> {
    const now = Date.now();
    let retried = 0;

    for (const delivery of this.deliveries.values()) {
      if (delivery.status === 'RETRYING' && delivery.nextRetryAt) {
        if (new Date(delivery.nextRetryAt).getTime() <= now) {
          delivery.attemptCount++;
          const notif = notificationStoreGetter(delivery.notificationId);
          if (!notif) continue;

          // Re-attempt dispatch
          const dispatchRes = await this.dispatcher.dispatch(
            delivery.channel,
            delivery.recipientAddress,
            notif,
            {
              title: notif.title,
              body: notif.body,
              contextSummary: notif.contextSummary,
            }
          );

          if (dispatchRes.success) {
            delivery.status = 'DELIVERED';
            delivery.deliveredAt = new Date().toISOString();
            delivery.providerMessageId = dispatchRes.providerMessageId;
            this.metrics.deliveriesSucceeded++;
            retried++;
          } else if (delivery.attemptCount >= delivery.maxAttempts || !dispatchRes.isTransient) {
            delivery.status = 'DEAD_LETTERED';
            this.metrics.deadLetterCount++;
            const dlqRecord: DeadLetterRecord = {
              id: `dlq_${delivery.id}`,
              deliveryId: delivery.id,
              eventId: notif.eventId,
              failureReason: dispatchRes.error || 'Exhausted retry attempts',
              retryCount: delivery.attemptCount,
              lastAttemptAt: new Date().toISOString(),
              resolved: false,
              createdAt: new Date().toISOString(),
            };
            this.deadLetters.set(dlqRecord.id, dlqRecord);
          } else {
            const backoffSeconds = Math.pow(2, delivery.attemptCount);
            delivery.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
            this.metrics.retriesScheduled++;
          }
          delivery.updatedAt = new Date().toISOString();
        }
      }
    }

    return retried;
  }

  public getDeliveriesForNotification(notificationId: string): NotificationDelivery[] {
    return Array.from(this.deliveries.values()).filter((d) => d.notificationId === notificationId);
  }

  public getDeadLetters(): DeadLetterRecord[] {
    return Array.from(this.deadLetters.values());
  }

  public getTelemetry(): CommunicationTelemetry {
    return { ...this.metrics };
  }

  public reset(): void {
    this.deliveries.clear();
    this.deadLetters.clear();
    this.metrics = {
      eventsIngested: 0,
      notificationsCreated: 0,
      deliveriesAttempted: 0,
      deliveriesSucceeded: 0,
      deliveriesFailed: 0,
      retriesScheduled: 0,
      deadLetterCount: 0,
      unreadCount: 0,
      averageAckLatencyMs: 0,
    };
  }
}

export const sharedDeliveryService = new DeliveryService();

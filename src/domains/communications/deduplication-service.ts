import type {
  CommunicationEvent,
  CommunicationChannel,
} from './types';

export class DeduplicationService {
  private processedDispatches = new Set<string>();
  private recentEventsByCorrelation = new Map<
    string,
    { event: CommunicationEvent; timestamp: number }[]
  >();
  private readonly stormWindowMs = 3000; // 3-second coalescing window

  /**
   * Generates a deterministic deduplication key for a notification dispatch.
   */
  public getDispatchKey(
    eventId: string,
    recipientId: string,
    channel: CommunicationChannel
  ): string {
    return `${eventId}:${recipientId}:${channel}`;
  }

  /**
   * Checks whether this exact dispatch has already occurred.
   */
  public isDuplicateDispatch(
    eventId: string,
    recipientId: string,
    channel: CommunicationChannel
  ): boolean {
    const key = this.getDispatchKey(eventId, recipientId, channel);
    return this.processedDispatches.has(key);
  }

  /**
   * Marks a dispatch as processed.
   */
  public markDispatchProcessed(
    eventId: string,
    recipientId: string,
    channel: CommunicationChannel
  ): void {
    const key = this.getDispatchKey(eventId, recipientId, channel);
    this.processedDispatches.add(key);
  }

  /**
   * Evaluates Notification Storm / Event Coalescing.
   * If related cascading events arrive in rapid succession under the same correlation chain,
   * detects whether this event should be coalesced into the active story.
   * INVARIANT: Events with requiredAction = true or priority = CRITICAL are NEVER suppressed.
   */
  public shouldCoalesce(event: CommunicationEvent): boolean {
    if (event.requiredAction || event.operationalPriority === 'CRITICAL') {
      return false; // Never coalesce actionable or critical notifications
    }

    const now = Date.now();
    const correlationKey = event.correlationId || event.journeyId || 'global';
    const recent = this.recentEventsByCorrelation.get(correlationKey) || [];

    // Filter to events within the storm window
    const validRecent = recent.filter((r) => now - r.timestamp < this.stormWindowMs);
    this.recentEventsByCorrelation.set(correlationKey, validRecent);

    // If an event of the same type or category was dispatched in the last 3s, coalesce
    const hasSimilarRecent = validRecent.some(
      (r) =>
        r.event.eventType === event.eventType ||
        (r.event.sourceDomain === event.sourceDomain && r.event.journeyId === event.journeyId)
    );

    // Record this event
    validRecent.push({ event, timestamp: now });
    this.recentEventsByCorrelation.set(correlationKey, validRecent);

    return hasSimilarRecent;
  }

  public reset(): void {
    this.processedDispatches.clear();
    this.recentEventsByCorrelation.clear();
  }
}

export const sharedDeduplicationService = new DeduplicationService();

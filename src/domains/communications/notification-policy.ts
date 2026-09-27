import type {
  CommunicationEvent,
  NotificationCategory,
  NotificationPriority,
  NotificationSeverity,
  NotificationPreferences,
  CommunicationChannel,
} from './types';
import { EVENT_CATALOG } from './event-catalog';

export class NotificationPolicyEngine {
  /**
   * Evaluates whether an event communication is strictly MANDATORY.
   * Invariant: Mandatory communications bypass user preference suppression and quiet hours.
   */
  public static isMandatory(event: CommunicationEvent): boolean {
    const catalogEntry = EVENT_CATALOG[event.eventType];
    if (catalogEntry?.isMandatory) {
      return true;
    }

    // Safety and critical disruptions are ALWAYS mandatory
    if (event.severity === 'CRITICAL' || event.operationalPriority === 'CRITICAL') {
      return true;
    }

    if (
      event.eventType.includes('cancelled') ||
      event.eventType.includes('payment_required') ||
      event.eventType.includes('refund_succeeded') ||
      event.eventType.includes('requires_approval')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Deterministically calculates notification priority, enforcing that operational
   * urgency is not confused with raw severity.
   */
  public static resolvePriority(event: CommunicationEvent): NotificationPriority {
    // 1. Explicit override if present in event
    if (event.operationalPriority === 'CRITICAL') {
      return 'CRITICAL';
    }

    // 2. Active trip safety or critical cancellations are always CRITICAL
    if (
      event.severity === 'CRITICAL' ||
      event.eventType === 'weather_impact_detected' ||
      event.eventType === 'supplier_cancelled' ||
      event.eventType === 'change_requires_approval'
    ) {
      return 'CRITICAL';
    }

    // 3. Payment failures or action required are HIGH
    if (
      event.eventType === 'payment_failed' ||
      event.eventType === 'payment_action_required' ||
      event.eventType === 'booking_failed' ||
      event.eventType === 'change_rejected'
    ) {
      return 'HIGH';
    }

    // 4. Default from catalog
    const entry = EVENT_CATALOG[event.eventType];
    return entry?.defaultPriority || 'NORMAL';
  }

  /**
   * Checks whether a communication is permitted on a given channel based on
   * user preferences and mandatory policy rules.
   */
  public static isChannelAllowed(
    channel: CommunicationChannel,
    category: NotificationCategory,
    isMandatory: boolean,
    preferences?: NotificationPreferences
  ): boolean {
    // In-app notifications are ALWAYS allowed for operational consistency
    if (channel === 'IN_APP') {
      return true;
    }

    // Mandatory alerts override user suppression on primary email/push channels
    if (isMandatory) {
      return true;
    }

    if (!preferences) {
      // Safe defaults: email and push enabled, SMS/whatsapp disabled
      return channel === 'EMAIL' || channel === 'PUSH';
    }

    // Check category preferences
    if (preferences.categoryPreferences && preferences.categoryPreferences[category] === false) {
      return false;
    }

    // Check channel preferences
    return !!preferences.channelPreferences[channel];
  }

  /**
   * Evaluates Quiet Hours.
   * Returns true if quiet hours are currently active.
   * INVARIANT: Returns false if communication is mandatory or CRITICAL.
   */
  public static isQuietHoursActive(
    preferences?: NotificationPreferences,
    isMandatory: boolean = false,
    priority: NotificationPriority = 'NORMAL',
    currentDate: Date = new Date()
  ): boolean {
    // Invariant: Mandatory or Critical communications NEVER get delayed by quiet hours
    if (isMandatory || priority === 'CRITICAL') {
      return false;
    }

    if (!preferences || !preferences.quietHoursEnabled) {
      return false;
    }

    const { quietHoursStart, quietHoursEnd, timezone } = preferences;
    if (!quietHoursStart || !quietHoursEnd) {
      return false;
    }

    try {
      // Calculate current user hour and minute in their configured timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(currentDate);
      const hourPart = parts.find((p) => p.type === 'hour')?.value || '0';
      const minPart = parts.find((p) => p.type === 'minute')?.value || '0';
      const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minPart, 10);

      const [startH, startM] = quietHoursStart.split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = quietHoursEnd.split(':').map((v) => parseInt(v, 10));
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (startMinutes > endMinutes) {
        // Overnight quiet hours (e.g. 22:00 to 07:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        // Same-day quiet hours (e.g. 13:00 to 15:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    } catch {
      // Fallback: If timezone parsing fails, do not block delivery
      return false;
    }
  }
}

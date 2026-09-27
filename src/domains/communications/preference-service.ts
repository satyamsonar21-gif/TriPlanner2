import type {
  NotificationPreferences,
} from './types';

export class PreferenceService {
  private preferences = new Map<string, NotificationPreferences>();

  public getPreferences(userId: string, tenantId: string = 'org_goa_ops_01'): NotificationPreferences {
    const existing = this.preferences.get(userId);
    if (existing) {
      return existing;
    }

    // Default Preferences: Operational and Safety channels enabled
    const defaultPrefs: NotificationPreferences = {
      userId,
      tenantId,
      categoryPreferences: {
        DISRUPTION: true,
        BOOKING: true,
        PAYMENT: true,
        REFUND: true,
        SAFETY: true,
        SUPPLIER: true,
        ITINERARY: true,
        COLLABORATION: true,
        SYSTEM: true,
      },
      channelPreferences: {
        IN_APP: true,
        EMAIL: true,
        SMS: false,
        WHATSAPP: false,
        PUSH: true,
      },
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Asia/Kolkata',
      updatedAt: new Date().toISOString(),
    };

    this.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  public updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const current = this.getPreferences(userId, updates.tenantId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      categoryPreferences: {
        ...current.categoryPreferences,
        ...(updates.categoryPreferences || {}),
      },
      channelPreferences: {
        ...current.channelPreferences,
        ...(updates.channelPreferences || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    this.preferences.set(userId, updated);
    return updated;
  }

  public reset(): void {
    this.preferences.clear();
  }
}

export const sharedPreferenceService = new PreferenceService();

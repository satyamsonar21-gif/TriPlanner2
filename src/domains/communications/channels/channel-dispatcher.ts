import type {
  CommunicationChannel,
  NotificationRecord,
  RenderedTemplate,
} from '../types';
import type { IEmailProvider } from './providers/email-provider.interface';
import { sharedMockEmailProvider } from './providers/mock-email-provider';

export interface DispatchResult {
  channel: CommunicationChannel;
  success: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
  isTransient?: boolean;
}

export class ChannelDispatcher {
  private emailProvider: IEmailProvider;

  constructor(emailProvider: IEmailProvider = sharedMockEmailProvider) {
    this.emailProvider = emailProvider;
  }

  public async dispatch(
    channel: CommunicationChannel,
    recipientAddress: string,
    notification: NotificationRecord,
    template: RenderedTemplate
  ): Promise<DispatchResult> {
    switch (channel) {
      case 'IN_APP':
        // In-app notifications are stored directly in the durable notification store
        return {
          channel: 'IN_APP',
          success: true,
          provider: 'InternalInAppStore',
          providerMessageId: `inapp_${notification.id}`,
        };

      case 'EMAIL': {
        const emailRes = await this.emailProvider.sendEmail({
          to: recipientAddress,
          subject: template.subject || template.title,
          body: `${template.body}\n\n${template.contextSummary.whatHappened}\nWhy it matters: ${template.contextSummary.whyItMatters}\nWhat changed: ${template.contextSummary.whatHasChanged}\nAction: ${template.actionLabel || 'View Details'} (${template.actionUrl || '/notifications'})`,
          metadata: {
            notificationId: notification.id,
            journeyId: notification.journeyId,
            correlationId: notification.correlationId,
          },
        });

        return {
          channel: 'EMAIL',
          success: emailRes.success,
          provider: this.emailProvider.getProviderName(),
          providerMessageId: emailRes.providerMessageId,
          error: emailRes.error,
          isTransient: emailRes.isTransient,
        };
      }

      case 'SMS':
      case 'WHATSAPP':
      case 'PUSH':
        // Structured sandbox stubs ready for future production gateway keys
        return {
          channel,
          success: true,
          provider: `Mock${channel}Provider (Sandbox)`,
          providerMessageId: `msg_${channel.toLowerCase()}_${Date.now()}`,
        };

      default:
        return {
          channel,
          success: false,
          provider: 'Unknown',
          error: `Unsupported communication channel "${channel}".`,
          isTransient: false,
        };
    }
  }
}

export const sharedChannelDispatcher = new ChannelDispatcher();

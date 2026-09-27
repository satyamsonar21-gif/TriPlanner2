import type {
  IEmailProvider,
  SendEmailParams,
  EmailSendResult,
} from './email-provider.interface';

export type SimulatedEmailErrorMode = 'NONE' | 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_RECIPIENT';

export class MockEmailProvider implements IEmailProvider {
  private sentEmails: Array<SendEmailParams & { providerMessageId: string; sentAt: string }> = [];
  private failureMode: SimulatedEmailErrorMode = 'NONE';
  private failureCountRemaining = 0;

  public getProviderName(): string {
    return 'MockEmailProvider (Development / Sandbox)';
  }

  public setFailureMode(mode: SimulatedEmailErrorMode, count: number = 1): void {
    this.failureMode = mode;
    this.failureCountRemaining = count;
  }

  public clearSentHistory(): void {
    this.sentEmails = [];
    this.failureMode = 'NONE';
    this.failureCountRemaining = 0;
  }

  public getSentEmails(): Array<SendEmailParams & { providerMessageId: string; sentAt: string }> {
    return [...this.sentEmails];
  }

  public async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    // Check simulated failure mode
    if (this.failureMode !== 'NONE' && this.failureCountRemaining > 0) {
      this.failureCountRemaining--;
      const mode = this.failureMode;
      if (this.failureCountRemaining === 0) {
        this.failureMode = 'NONE';
      }

      if (mode === 'TIMEOUT') {
        return {
          success: false,
          error: 'Connection timeout to SMTP gateway (408)',
          isTransient: true,
        };
      }

      if (mode === 'RATE_LIMIT') {
        return {
          success: false,
          error: 'Provider API rate limit exceeded (429)',
          isTransient: true,
        };
      }

      if (mode === 'INVALID_RECIPIENT') {
        return {
          success: false,
          error: 'Permanent delivery failure: recipient mailbox does not exist (550)',
          isTransient: false,
        };
      }
    }

    // Input validation
    if (!params.to || !params.to.includes('@')) {
      return {
        success: false,
        error: 'Invalid recipient email address format',
        isTransient: false,
      };
    }

    const providerMessageId = `msg_eml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.sentEmails.push({
      ...params,
      providerMessageId,
      sentAt: new Date().toISOString(),
    });

    return {
      success: true,
      providerMessageId,
    };
  }
}

export const sharedMockEmailProvider = new MockEmailProvider();

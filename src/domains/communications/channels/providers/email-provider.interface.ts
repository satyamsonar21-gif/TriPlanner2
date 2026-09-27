export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  isTransient?: boolean;
}

export interface IEmailProvider {
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
  getProviderName(): string;
}

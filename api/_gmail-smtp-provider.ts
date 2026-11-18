import nodemailer from 'nodemailer';
import { EmailProviderError, type EmailProvider } from './_outbox-worker.js';
import type { EmailProviderConfig } from './_email-provider-config.js';

type GmailConfig = Extract<EmailProviderConfig, { kind: 'gmail_smtp' }>;
type MailOptions = { from: string; to: string; subject: string; text?: string; html?: string };
type SmtpTransport = { sendMail(options: MailOptions): Promise<{ messageId?: string; accepted?: string[]; rejected?: unknown[] }> };
const ADDRESS = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function createGmailSmtpProvider(config: GmailConfig, transport?: SmtpTransport): EmailProvider {
  const allowed = new Set(config.allowedRecipients);
  return {
    async send(email) {
      const recipient = (email.recipient || email.to || '').trim().toLowerCase();
      if (!ADDRESS.test(recipient) || !allowed.has(recipient)) {
        throw new EmailProviderError('EMAIL_PROVIDER_REJECTED', false);
      }

      const mailer = transport || nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: config.user, pass: config.appPassword },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      });
      try {
        const result = await mailer.sendMail({
          from: config.from,
          to: recipient,
          subject: email.subject,
          ...(email.body_html ? { html: email.body_html } : { text: email.body || '' }),
        });
        if (result.rejected?.length) throw new EmailProviderError('EMAIL_PROVIDER_REJECTED', false);
        if (!result.messageId || !result.accepted?.some(value => value.toLowerCase() === recipient)) {
          throw new EmailProviderError('EMAIL_PROVIDER_UNCONFIRMED', false);
        }
        return { id: result.messageId };
      } catch (error) {
        if (error instanceof EmailProviderError) throw error;
        const definite = error && typeof error === 'object' && 'code' in error
          && ['EENVELOPE', 'EAUTH', 'EINVALIDLOGIN'].includes(String(error.code));
        throw new EmailProviderError(definite ? 'EMAIL_PROVIDER_REJECTED' : 'EMAIL_PROVIDER_UNCONFIRMED', false);
      }
    },
  };
}

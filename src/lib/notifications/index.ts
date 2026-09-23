import 'server-only';

import { env } from '@/lib/env';

/**
 * Notification transport abstraction (PRD §20, §28).
 *
 * Channels are pluggable for the same reason the payment gateway is: the
 * client has not picked providers yet. The default `console` transport logs
 * the rendered message so the whole flow is testable without credentials.
 */

export interface SendResult {
  delivered: boolean;
  providerMessageId?: string | null;
  error?: string | null;
  raw?: Record<string, unknown>;
}

export interface NotificationTransport {
  readonly name: string;
  send(input: {
    to: string;
    subject?: string | null;
    body: string;
  }): Promise<SendResult>;
}

class ConsoleTransport implements NotificationTransport {
  constructor(readonly name: string) {}

  async send(input: { to: string; subject?: string | null; body: string }): Promise<SendResult> {
    console.info(
      `\n── ${this.name.toUpperCase()} ─────────────────────────────\n` +
        `To: ${input.to}\n` +
        (input.subject ? `Subject: ${input.subject}\n` : '') +
        `\n${input.body}\n` +
        '────────────────────────────────────────\n',
    );
    return { delivered: true, providerMessageId: `console_${Date.now()}` };
  }
}

class ResendTransport implements NotificationTransport {
  readonly name = 'resend';

  async send(input: { to: string; subject?: string | null; body: string }): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { delivered: false, error: 'RESEND_API_KEY is not set' };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'AQOSS Hotels <bookings@example.com>',
        to: [input.to],
        subject: input.subject ?? 'Notification',
        text: input.body,
      }),
    });

    if (!response.ok) {
      return { delivered: false, error: `Resend ${response.status}: ${await response.text()}` };
    }

    const data = (await response.json()) as { id: string };
    return { delivered: true, providerMessageId: data.id, raw: data as unknown as Record<string, unknown> };
  }
}

export function getTransport(channel: 'EMAIL' | 'SMS' | 'OTP' | 'WHATSAPP' | 'PUSH'): NotificationTransport {
  if (channel === 'EMAIL') {
    return env.emailProvider === 'resend' ? new ResendTransport() : new ConsoleTransport('email');
  }
  if (channel === 'SMS' || channel === 'OTP') {
    return new ConsoleTransport('sms');
  }
  if (channel === 'WHATSAPP') {
    return new ConsoleTransport('whatsapp');
  }
  return new ConsoleTransport('push');
}

/** Replace `{{placeholders}}` in a template body (PRD §29). */
export function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template
    .replace(/\\n/g, '\n')
    .replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
      const value = values[key];
      return value === undefined || value === null ? '' : String(value);
    });
}

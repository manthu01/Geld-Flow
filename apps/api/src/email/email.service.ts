import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Sends transactional email, preferring whichever provider is actually
 * configured:
 *
 *  1. SMTP (e.g. Gmail with an App Password) when SMTP_HOST/USER/PASS are
 *     set — genuinely free, and (unlike Resend's sandbox sender) can
 *     deliver to any recipient, not just the account owner.
 *  2. Resend's REST API when RESEND_API_KEY is set instead — nicer once a
 *     verified sending domain exists, but its free sandbox sender
 *     (onboarding@resend.dev) can only reach the Resend account's own
 *     inbox until then.
 *  3. Otherwise, just log the link to the server console, so local dev
 *     and any environment without email configured keeps working exactly
 *     as before.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) return null;

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendMagicLink(email: string, url: string): Promise<void> {
    const subject = 'Sign in to Geld Flow';
    const html = `<p>Click below to sign in. This link expires in 15 minutes.</p><p><a href="${url}">Sign in to Geld Flow</a></p><p>If you didn't request this, you can ignore this email.</p>`;

    const transporter = this.getTransporter();
    if (transporter) {
      const from =
        this.config.get<string>('SMTP_FROM') ??
        this.config.get<string>('SMTP_USER')!;
      try {
        await transporter.sendMail({ from, to: email, subject, html });
        return;
      } catch (error) {
        this.logger.error(
          `SMTP failed to send magic link to ${email}: ${String(error)}`,
        );
        this.logger.log(`Magic link for ${email}: ${url}`);
        return;
      }
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.log(`Magic link for ${email}: ${url}`);
      return;
    }

    const from =
      this.config.get<string>('RESEND_FROM_EMAIL') ??
      'Geld Flow <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: email, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Resend failed to send magic link to ${email}: ${response.status} ${body}`,
      );
      // Don't throw — the token is already created, and the request-magic
      // -link endpoint deliberately never reveals whether an email exists.
      // Log it too so the link isn't lost if delivery genuinely failed.
      this.logger.log(`Magic link for ${email}: ${url}`);
    }
  }
}

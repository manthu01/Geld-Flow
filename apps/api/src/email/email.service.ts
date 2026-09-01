import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends transactional email via the Resend REST API (plain fetch — Node
 * 22's built-in fetch is enough, no need for the `resend` SDK dependency).
 * Falls back to logging the link to the server console when RESEND_API_KEY
 * isn't set, so local dev and any environment without email configured
 * keeps working exactly as before.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMagicLink(email: string, url: string): Promise<void> {
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
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Sign in to Geld Flow',
        html: `<p>Click below to sign in. This link expires in 15 minutes.</p><p><a href="${url}">Sign in to Geld Flow</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      }),
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

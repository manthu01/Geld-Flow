import { Injectable, Logger } from '@nestjs/common';

/**
 * No transactional email provider is wired up yet, so magic links are
 * printed to the server console instead of actually emailed. Swapping in
 * Resend/SES/SMTP later only means changing sendMagicLink's body — every
 * caller already goes through this one method.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  sendMagicLink(email: string, url: string): void {
    this.logger.log(`Magic link for ${email}: ${url}`);
  }
}

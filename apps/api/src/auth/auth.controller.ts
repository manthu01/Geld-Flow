import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  requestMagicLinkSchema,
  type RequestMagicLinkInput,
} from '@geld-flow/shared';
import type { User } from '@geld-flow/db';
import type { CookieOptions, Request, Response } from 'express';
import {
  AuthService,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './auth.service';
import { EmailService } from '../email/email.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleConfiguredGuard } from './guards/google-configured.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get webAppUrl(): string {
    return this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
  }

  private refreshCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge,
    };
  }

  private setRefreshCookie(
    res: Response,
    refreshToken: string,
    expiresAt: Date,
  ) {
    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      this.refreshCookieOptions(expiresAt.getTime() - Date.now()),
    );
  }

  // ---------------------------------------------------------- Magic link

  @Post('magic-link')
  async requestMagicLink(
    @Body(new ZodValidationPipe(requestMagicLinkSchema))
    body: RequestMagicLinkInput,
  ) {
    const url = await this.authService.createMagicLink(body.email);
    this.emailService.sendMagicLink(body.email, url);

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return {
      message: 'Check your email for a sign-in link.',
      // Only in dev: lets you test the flow without a real inbox.
      ...(isProduction ? {} : { devLink: url }),
    };
  }

  @Get('magic-link/verify')
  async verifyMagicLink(
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ) {
    const user = token ? await this.authService.redeemMagicLink(token) : null;
    if (!user) {
      return res.redirect(`${this.webAppUrl}/login?error=invalid_link`);
    }

    const tokens = await this.authService.issueTokens(user.id, user.email);
    this.setRefreshCookie(
      res,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    return res.redirect(`${this.webAppUrl}/auth/callback`);
  }

  // -------------------------------------------------------------- Google

  @Get('google')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  googleLogin() {
    // Guard performs the redirect to Google's consent screen.
  }

  @Get('google/callback')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  async googleCallback(@CurrentUser() user: User, @Res() res: Response) {
    const tokens = await this.authService.issueTokens(user.id, user.email);
    this.setRefreshCookie(
      res,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    return res.redirect(`${this.webAppUrl}/auth/callback`);
  }

  // --------------------------------------------------------- Session mgmt

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No session to refresh.');
    }

    const { user, tokens } = await this.authService.rotateRefreshToken(
      rawRefreshToken,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(
      res,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      string | undefined;
    if (rawRefreshToken) {
      await this.authService.revokeRefreshToken(rawRefreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return { message: 'Signed out.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}

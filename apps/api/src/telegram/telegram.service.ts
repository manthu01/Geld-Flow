import { randomBytes } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@geld-flow/db';
import { ExpensesService } from '../expenses/expenses.service';
import { matchMember, type MatchableMember } from './match-member.util';
import { parseExpenseMessage } from './parse-expense-message.util';

const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const POLL_TIMEOUT_SECONDS = 25;

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}
interface TelegramChat {
  id: number;
}
interface TelegramMessage {
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}
interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private token: string | undefined;
  private botUsername: string | null = null;
  private updateOffset = 0;
  private polling = false;

  constructor(
    private readonly config: ConfigService,
    private readonly expenses: ExpensesService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.token);
  }

  get username(): string | null {
    return this.botUsername;
  }

  /** Gracefully disabled without a token — same pattern as Google OAuth in AuthModule. */
  async onModuleInit(): Promise<void> {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN') || undefined;
    if (!this.token) return;

    try {
      const me = await this.callApi<{ username?: string }>('getMe', {});
      this.botUsername = me.result?.username ?? null;
    } catch (err) {
      this.logger.warn(
        `Telegram bot token set but getMe failed — staying disabled: ${err}`,
      );
      this.token = undefined;
      return;
    }

    this.polling = true;
    void this.pollLoop();
    this.logger.log(
      `Telegram bot @${this.botUsername} is polling for updates.`,
    );
  }

  onModuleDestroy(): void {
    this.polling = false;
  }

  async generateLinkCode(ledgerId: string, userId: string) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    await prisma.telegramLinkCode.create({
      data: {
        code,
        ledgerId,
        createdById: userId,
        expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
      },
    });
    return {
      code,
      botUsername: this.botUsername,
      expiresInMinutes: LINK_CODE_TTL_MS / 60000,
    };
  }

  private async callApi<T>(
    method: string,
    body: Record<string, unknown>,
  ): Promise<TelegramApiResponse<T>> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return (await res.json()) as TelegramApiResponse<T>;
  }

  private async reply(chatId: string, text: string): Promise<void> {
    await this.callApi('sendMessage', { chat_id: chatId, text });
  }

  private async pollLoop(): Promise<void> {
    while (this.polling) {
      try {
        const result = await this.callApi<TelegramUpdate[]>('getUpdates', {
          offset: this.updateOffset,
          timeout: POLL_TIMEOUT_SECONDS,
        });
        for (const update of result.result ?? []) {
          this.updateOffset = update.update_id + 1;
          if (update.message) {
            await this.handleMessage(update.message).catch((err: unknown) =>
              this.logger.error(`handleMessage failed: ${String(err)}`),
            );
          }
        }
      } catch (err) {
        this.logger.error(`poll failed: ${String(err)}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = String(message.chat.id);
    const text = message.text;
    if (!text) return;

    if (text.startsWith('/start')) {
      await this.reply(
        chatId,
        'Hi! I log expenses into Geld Flow. Generate a link code from a group ledger\'s page in the app, then send "/link CODE" here to connect this chat to it.',
      );
      return;
    }

    const linkMatch = /^\/link\s+(\S+)/i.exec(text);
    if (linkMatch) {
      await this.handleLink(chatId, linkMatch[1]);
      return;
    }

    const parsed = parseExpenseMessage(text);
    if (parsed) {
      await this.handleExpenseMessage(chatId, message, parsed);
      return;
    }

    if (/^paid\b/i.test(text)) {
      await this.reply(
        chatId,
        'I couldn\'t parse that. Try: "Paid $40 for pizza @Alex"',
      );
    }
  }

  private async handleLink(chatId: string, code: string): Promise<void> {
    const record = await prisma.telegramLinkCode.findUnique({
      where: { code },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      await this.reply(
        chatId,
        "That code is invalid or has expired. Generate a new one from the ledger's page.",
      );
      return;
    }

    await prisma.$transaction([
      prisma.telegramLinkCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.chatLink.upsert({
        where: {
          platform_externalChatId: {
            platform: 'telegram',
            externalChatId: chatId,
          },
        },
        create: {
          platform: 'telegram',
          externalChatId: chatId,
          ledgerId: record.ledgerId,
          userId: record.createdById,
        },
        update: { ledgerId: record.ledgerId, userId: record.createdById },
      }),
    ]);

    const ledger = await prisma.ledger.findUnique({
      where: { id: record.ledgerId },
    });
    await this.reply(
      chatId,
      `Linked! Expenses logged here will go into "${ledger?.name ?? 'this ledger'}". Try: "Paid $40 for pizza @Alex".`,
    );
  }

  private async handleExpenseMessage(
    chatId: string,
    message: TelegramMessage,
    parsed: ReturnType<typeof parseExpenseMessage>,
  ): Promise<void> {
    if (!parsed) return;

    const chatLink = await prisma.chatLink.findUnique({
      where: {
        platform_externalChatId: {
          platform: 'telegram',
          externalChatId: chatId,
        },
      },
    });
    if (!chatLink) {
      await this.reply(
        chatId,
        'This chat isn\'t linked to a ledger yet. Generate a code from a group ledger\'s page and send "/link CODE".',
      );
      return;
    }

    const ledger = await prisma.ledger.findUnique({
      where: { id: chatLink.ledgerId },
      include: { members: { include: { user: true } } },
    });
    if (!ledger) return;

    const matchable: MatchableMember[] = ledger.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
    }));

    const senderName = message.from?.username ?? message.from?.first_name ?? '';
    const senderMatch = matchMember(senderName, matchable);
    const payer =
      senderMatch ?? matchable.find((m) => m.userId === chatLink.userId);
    if (!payer) {
      await this.reply(
        chatId,
        "I couldn't figure out who's paying — make sure whoever linked this chat is still a member.",
      );
      return;
    }

    const resolvedMentions: string[] = [];
    const unresolvedMentions: string[] = [];
    for (const mention of parsed.mentions) {
      const m = matchMember(mention, matchable);
      if (m) resolvedMentions.push(m.userId);
      else unresolvedMentions.push(mention);
    }

    // No mentions resolved (or none given) -> default to splitting with the whole group.
    const participantIds =
      resolvedMentions.length > 0
        ? [...new Set([payer.userId, ...resolvedMentions])]
        : matchable.map((m) => m.userId);

    try {
      await this.expenses.create(payer.userId, {
        ledgerId: ledger.id,
        description: parsed.description,
        amount: parsed.amount,
        currency: ledger.baseCurrency,
        paidByUserId: payer.userId,
        splitType: 'equal',
        shares: participantIds.map((userId) => ({ userId })),
      });
    } catch (err) {
      await this.reply(
        chatId,
        `Couldn't log that: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      return;
    }

    const assumedNote = senderMatch
      ? ''
      : ` (assumed ${payer.name} paid — I couldn't match your Telegram name to a member)`;
    const unresolvedNote =
      unresolvedMentions.length > 0
        ? ` Couldn't match: ${unresolvedMentions.map((m) => `@${m}`).join(', ')}.`
        : '';
    await this.reply(
      chatId,
      `Logged: ${payer.name} paid ${parsed.amount} for "${parsed.description}", split ${participantIds.length} ways.${assumedNote}${unresolvedNote}`,
    );
  }
}

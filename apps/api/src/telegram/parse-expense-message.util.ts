export interface ParsedExpenseMessage {
  amount: number;
  description: string;
  mentions: string[];
}

const PAID_PATTERN = /^paid\s+\$?(\d+(?:\.\d{1,2})?)\s+for\s+(.+)$/i;

/**
 * Parses "Paid $40 for pizza @Alex @Bob" style messages. Deliberately
 * narrow — a message that doesn't match is left alone (returns null)
 * rather than guessed at, since a wrong guess here means a wrong
 * expense silently lands in someone's balance.
 */
export function parseExpenseMessage(text: string): ParsedExpenseMessage | null {
  const match = text.trim().match(PAID_PATTERN);
  if (!match) return null;

  const amount = Number(match[1]);
  const tail = match[2].trim();
  const mentions = [...tail.matchAll(/@(\w+)/g)].map((m) => m[1]);
  const description = tail.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();

  if (!(amount > 0) || !description) return null;

  return { amount, description, mentions };
}

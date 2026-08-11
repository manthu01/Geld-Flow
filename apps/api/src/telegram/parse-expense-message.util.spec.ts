import { parseExpenseMessage } from './parse-expense-message.util';

describe('parseExpenseMessage', () => {
  it('parses a basic single-mention message', () => {
    expect(parseExpenseMessage('Paid $40 for pizza @Alex')).toEqual({
      amount: 40,
      description: 'pizza',
      mentions: ['Alex'],
    });
  });

  it('parses multiple mentions, no $ sign, and lowercase "paid"', () => {
    const result = parseExpenseMessage('paid 12.50 for taxi @bob @carol');
    expect(result).toEqual({
      amount: 12.5,
      description: 'taxi',
      mentions: ['bob', 'carol'],
    });
  });

  it('parses a message with no mentions', () => {
    expect(parseExpenseMessage('Paid $30 for groceries')).toEqual({
      amount: 30,
      description: 'groceries',
      mentions: [],
    });
  });

  it('returns null for unrelated chat messages rather than guessing', () => {
    expect(parseExpenseMessage("hey what's up")).toBeNull();
  });

  it('returns null when the amount is missing', () => {
    expect(parseExpenseMessage('Paid for nothing')).toBeNull();
  });

  it('returns null when there is no description', () => {
    expect(parseExpenseMessage('Paid $40 for')).toBeNull();
  });

  it('returns null for a zero or negative amount', () => {
    expect(parseExpenseMessage('Paid $0 for nothing')).toBeNull();
  });
});

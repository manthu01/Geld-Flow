import { matchMember, type MatchableMember } from './match-member.util';

const members: MatchableMember[] = [
  { userId: '1', name: 'Alex Smith', email: 'alex@example.com' },
  { userId: '2', name: 'Bob Jones', email: 'bob@example.com' },
  { userId: '3', name: 'Alex Turner', email: 'alexturner@example.com' },
];

describe('matchMember', () => {
  it('matches an exact full name with a leading @', () => {
    expect(matchMember('@Alex Smith', members)?.userId).toBe('1');
  });

  it('matches case-insensitively on a single name word', () => {
    expect(matchMember('bob', members)?.userId).toBe('2');
  });

  it('matches on the email local part', () => {
    expect(matchMember('alexturner', members)?.userId).toBe('3');
  });

  it('returns null for an ambiguous match rather than guessing', () => {
    // Two members share the first name "Alex" — must not pick one silently.
    expect(matchMember('Alex', members)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(matchMember('nobody', members)).toBeNull();
  });

  it('returns null for an empty or whitespace-only query', () => {
    expect(matchMember('   ', members)).toBeNull();
    expect(matchMember('', members)).toBeNull();
  });
});

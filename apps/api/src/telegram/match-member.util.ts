export interface MatchableMember {
  userId: string;
  name: string;
  email: string;
}

/**
 * Resolves a free-text name — a Telegram "@mention", a username, or a
 * sender's first_name — to a single ledger member. Matches
 * case-insensitively against the full name, any individual word within
 * it, or the email's local part. Returns null on no match or an
 * ambiguous one; callers must never guess who was meant.
 */
export function matchMember(
  query: string,
  members: MatchableMember[],
): MatchableMember | null {
  const q = query.replace(/^@/, '').trim().toLowerCase();
  if (!q) return null;

  const matches = members.filter((m) => {
    const name = m.name.toLowerCase();
    const emailLocal = m.email.split('@')[0].toLowerCase();
    return name === q || name.split(/\s+/).includes(q) || emailLocal === q;
  });

  return matches.length === 1 ? matches[0] : null;
}

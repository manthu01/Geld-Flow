const BALANCE_EPSILON = 0.005;

type Size = "sm" | "lg";

/**
 * The one number everyone actually opens this app to read: what they owe
 * or are owed. Given its own component so it reads the same confident way
 * everywhere it appears (ledger cards, friend rows) instead of being a
 * small muted caption competing with everything else on the card.
 */
export function BalanceAmount({
  balance,
  currency,
  size = "sm",
  settledLabel = "Settled up",
}: {
  balance: number;
  currency: string;
  size?: Size;
  settledLabel?: string;
}) {
  const settled = Math.abs(balance) < BALANCE_EPSILON;
  const owed = balance > 0;

  if (settled) {
    return <p className="text-sm text-ink-soft">{settledLabel}</p>;
  }

  return (
    <p
      className={
        size === "lg"
          ? "font-display text-2xl font-semibold tracking-tight tabular-nums " +
            (owed ? "text-owed" : "text-owes")
          : "font-display text-lg font-semibold tabular-nums " + (owed ? "text-owed" : "text-owes")
      }
    >
      <span className="mr-1.5 text-[0.6em] font-medium uppercase tracking-wide text-ink-soft">
        {owed ? "Owed" : "You owe"}
      </span>
      {currency} {Math.abs(balance).toFixed(2)}
    </p>
  );
}

export function balanceAccentClass(balance: number): string {
  if (Math.abs(balance) < BALANCE_EPSILON) return "bg-surface-border";
  return balance > 0 ? "bg-owed" : "bg-owes";
}

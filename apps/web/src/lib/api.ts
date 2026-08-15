export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface RefreshResponse {
  accessToken: string;
  user: CurrentUser;
}

function readErrorMessage(data: unknown): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

export async function requestMagicLink(
  email: string,
): Promise<{ message: string; devLink?: string }> {
  const res = await fetch(`${API_URL}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    throw new Error(readErrorMessage(data));
  }
  return data as { message: string; devLink?: string };
}

/** Exchanges the httpOnly refresh cookie for a fresh access token. Returns null if there's no valid session. */
export async function refreshSession(): Promise<RefreshResponse | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  return (await res.json()) as RefreshResponse;
}

export async function logoutSession(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

/**
 * Everything below talks to the ledger-scoped API and needs an
 * authenticated request. `authFetch` (from useAuth()) attaches the
 * bearer token and retries once after a session restore on a 401.
 */
export type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json();
  if (!res.ok) {
    throw new Error(readErrorMessage(data));
  }
  return data as T;
}

function postJson(authFetch: AuthFetch, path: string, body?: unknown) {
  return authFetch(path, {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ----------------------------------------------------------------- Profile

export async function updateProfile(
  authFetch: AuthFetch,
  input: { name?: string; username?: string; avatarUrl?: string | null },
): Promise<CurrentUser> {
  const res = await authFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

// ---------------------------------------------------------------- Ledgers

export interface LedgerMemberView {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isShadow: boolean;
  };
}

export interface LedgerSummary {
  id: string;
  type: "group_general" | "group_travel" | "group_event" | "personal";
  name: string | null;
  baseCurrency: string;
  createdById: string;
  createdAt: string;
  archivedAt: string | null;
  myRole: "owner" | "admin" | "member";
  _count?: { members: number };
  members: LedgerMemberView[];
}

export type LedgerDetail = LedgerSummary;

export async function listMyLedgers(
  authFetch: AuthFetch,
): Promise<{ groups: LedgerSummary[]; personal: LedgerSummary[] }> {
  return parseJson(await authFetch("/ledgers"));
}

export async function createGroupLedger(
  authFetch: AuthFetch,
  input: { type: "group_general" | "group_travel" | "group_event"; name?: string; baseCurrency: string },
): Promise<LedgerSummary> {
  return parseJson(await postJson(authFetch, "/ledgers", input));
}

export async function getOrCreatePersonalLedger(
  authFetch: AuthFetch,
  input: { peerEmail?: string; peerName?: string; baseCurrency: string },
): Promise<{ ledger: LedgerSummary; claimUrl?: string }> {
  return parseJson(await postJson(authFetch, "/ledgers/personal", input));
}

export async function getLedgerDetail(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<LedgerDetail> {
  return parseJson(await authFetch(`/ledgers/${ledgerId}`));
}

export async function deleteLedger(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<void> {
  const res = await authFetch(`/ledgers/${ledgerId}`, { method: "DELETE" });
  if (!res.ok) {
    const data: unknown = await res.json();
    throw new Error(readErrorMessage(data));
  }
}

// ------------------------------------------------------------------ Claims

export interface ClaimInfo {
  shadowName: string;
  addedByName: string | null;
  ledgerName: string | null;
}

export async function getClaimInfo(token: string): Promise<ClaimInfo> {
  const res = await fetch(`${API_URL}/claims/${token}`);
  return parseJson(res);
}

export async function redeemClaim(
  authFetch: AuthFetch,
  token: string,
): Promise<{ ledgerId: string }> {
  return parseJson(await postJson(authFetch, `/claims/${token}/redeem`));
}

export async function createInvite(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<{ inviteUrl: string }> {
  return parseJson(await postJson(authFetch, `/ledgers/${ledgerId}/invites`, {}));
}

export async function redeemInvite(
  authFetch: AuthFetch,
  token: string,
): Promise<{ ledgerId: string; alreadyMember: boolean }> {
  return parseJson(await postJson(authFetch, `/invites/${token}/redeem`));
}

// --------------------------------------------------------------- Expenses

export interface ExpenseShareView {
  userId: string;
  shareAmount: string;
  sharePercentage: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface ExpenseView {
  id: string;
  ledgerId: string;
  description: string;
  amount: string;
  currency: string;
  paidByUserId: string;
  splitType: "equal" | "percentage" | "exact";
  category: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  paidBy: { id: string; name: string; avatarUrl: string | null };
  createdBy: { id: string; name: string; avatarUrl: string | null };
  shares: ExpenseShareView[];
}

export interface ExpenseShareInput {
  userId: string;
  amount?: number;
  percentage?: number;
}

export interface ExpenseInput {
  ledgerId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitType: "equal" | "percentage" | "exact";
  category?: string;
  shares: ExpenseShareInput[];
}

export async function listExpenses(
  authFetch: AuthFetch,
  ledgerId: string,
  page = 1,
  pageSize = 30,
): Promise<{ items: ExpenseView[]; total: number; page: number; pageSize: number }> {
  return parseJson(
    await authFetch(`/ledgers/${ledgerId}/expenses?page=${page}&pageSize=${pageSize}`),
  );
}

export async function createExpense(
  authFetch: AuthFetch,
  input: ExpenseInput,
): Promise<ExpenseView> {
  return parseJson(
    await postJson(authFetch, `/ledgers/${input.ledgerId}/expenses`, input),
  );
}

export async function editExpense(
  authFetch: AuthFetch,
  expenseId: string,
  input: Omit<ExpenseInput, "ledgerId">,
): Promise<ExpenseView> {
  const res = await authFetch(`/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function deleteExpense(
  authFetch: AuthFetch,
  expenseId: string,
): Promise<{ id: string }> {
  const res = await authFetch(`/expenses/${expenseId}`, { method: "DELETE" });
  return parseJson(res);
}

// --------------------------------------------------------------- Balances

export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  netBalance: number;
}

export async function getBalances(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<MemberBalance[]> {
  return parseJson(await authFetch(`/ledgers/${ledgerId}/balances`));
}

// ------------------------------------------------------------ Settlements

export interface SettlementView {
  id: string;
  ledgerId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  status: "pending" | "confirmed" | "declined";
  createdAt: string;
  confirmedAt: string | null;
}

export async function listSettlements(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<SettlementView[]> {
  return parseJson(await authFetch(`/ledgers/${ledgerId}/settlements`));
}

export async function requestSettlement(
  authFetch: AuthFetch,
  ledgerId: string,
  input: { toUserId: string; amount: number; currency: string },
): Promise<SettlementView> {
  return parseJson(
    await postJson(authFetch, `/ledgers/${ledgerId}/settlements`, input),
  );
}

export async function confirmSettlement(
  authFetch: AuthFetch,
  settlementId: string,
): Promise<SettlementView> {
  return parseJson(await postJson(authFetch, `/settlements/${settlementId}/confirm`));
}

export async function declineSettlement(
  authFetch: AuthFetch,
  settlementId: string,
): Promise<SettlementView> {
  return parseJson(await postJson(authFetch, `/settlements/${settlementId}/decline`));
}

// --------------------------------------------------------------- Activity

export interface ActivityEventView {
  id: string;
  ledgerId: string;
  actorId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; avatarUrl: string | null };
}

export async function listActivity(
  authFetch: AuthFetch,
  ledgerId: string,
  page = 1,
  pageSize = 30,
): Promise<{ items: ActivityEventView[]; total: number; page: number; pageSize: number }> {
  return parseJson(
    await authFetch(`/ledgers/${ledgerId}/activity?page=${page}&pageSize=${pageSize}`),
  );
}

// -------------------------------------------------------------- Reputation

export type Rank = "I" | "II" | "III" | "IV" | "V";

export interface ScoreView {
  userId: string;
  currentRank: Rank;
  rollingAvgSettleHours: number | null;
  confirmedSettlements: number;
  updatedAt: string | null;
}

export async function getMyScore(authFetch: AuthFetch): Promise<ScoreView> {
  return parseJson(await authFetch("/reputation/me"));
}

export async function getUserScore(
  authFetch: AuthFetch,
  userId: string,
): Promise<ScoreView> {
  return parseJson(await authFetch(`/reputation/${userId}`));
}

// ------------------------------------------------------ Debt simplification

export interface SimplifiedTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export async function getDebtSimplification(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<SimplifiedTransfer[]> {
  return parseJson(await authFetch(`/ledgers/${ledgerId}/debt-simplification`));
}

// ----------------------------------------------------------------- Checklist

export interface ChecklistItemView {
  id: string;
  ledgerId: string;
  title: string;
  isDone: boolean;
  assignedToId: string | null;
  dueDate: string | null;
  createdById: string;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
}

export async function listChecklist(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<ChecklistItemView[]> {
  return parseJson(await authFetch(`/ledgers/${ledgerId}/checklist`));
}

export async function createChecklistItem(
  authFetch: AuthFetch,
  ledgerId: string,
  input: { title: string; assignedToId?: string; dueDate?: string },
): Promise<ChecklistItemView> {
  return parseJson(await postJson(authFetch, `/ledgers/${ledgerId}/checklist`, input));
}

export async function editChecklistItem(
  authFetch: AuthFetch,
  itemId: string,
  input: { title?: string; isDone?: boolean; assignedToId?: string | null; dueDate?: string | null },
): Promise<ChecklistItemView> {
  const res = await authFetch(`/checklist/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function deleteChecklistItem(
  authFetch: AuthFetch,
  itemId: string,
): Promise<{ id: string }> {
  const res = await authFetch(`/checklist/${itemId}`, { method: "DELETE" });
  return parseJson(res);
}

// ------------------------------------------------------------------ Telegram

export async function getTelegramStatus(
  authFetch: AuthFetch,
): Promise<{ configured: boolean; botUsername: string | null }> {
  return parseJson(await authFetch("/telegram/status"));
}

export async function createTelegramLinkCode(
  authFetch: AuthFetch,
  ledgerId: string,
): Promise<{ code: string; botUsername: string | null; expiresInMinutes: number }> {
  return parseJson(await postJson(authFetch, `/ledgers/${ledgerId}/telegram-link`));
}

// -------------------------------------------------------------------- Badges

export interface BadgeView {
  id: string;
  key: string;
  name: string;
  description: string;
  iconRef: string;
  earned: boolean;
  earnedAt: string | null;
}

export async function getMyBadges(authFetch: AuthFetch): Promise<BadgeView[]> {
  return parseJson(await authFetch("/badges/me"));
}

export async function getUserBadges(
  authFetch: AuthFetch,
  userId: string,
): Promise<BadgeView[]> {
  return parseJson(await authFetch(`/badges/${userId}`));
}

// ------------------------------------------------------------------ Feedback

export async function submitFeedback(
  authFetch: AuthFetch,
  message: string,
): Promise<{ id: string }> {
  return parseJson(await postJson(authFetch, "/feedback", { message }));
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CurrentUser {
  id: string;
  email: string;
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

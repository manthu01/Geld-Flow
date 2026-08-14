import type { ActivityEventView } from "@/lib/api";

export const LEDGER_TYPE_LABELS: Record<string, string> = {
  group_general: "General group",
  group_travel: "Travel group",
  group_event: "Event group",
  personal: "Personal ledger",
};

export function describeActivity(event: ActivityEventView): string {
  const actor = event.actor.name;
  switch (event.type) {
    case "expense_added":
      return `${actor} added "${event.payload.description ?? "an expense"}"`;
    case "expense_edited":
      return `${actor} edited "${event.payload.description ?? "an expense"}"`;
    case "expense_deleted":
      return `${actor} deleted "${event.payload.description ?? "an expense"}"`;
    case "settlement_requested":
      return `${actor} recorded a payment of ${event.payload.amount ?? ""}`;
    case "settlement_confirmed":
      return `${actor} confirmed a payment of ${event.payload.amount ?? ""}`;
    case "settlement_declined":
      return `${actor} declined a settlement`;
    case "member_joined":
      return `${actor} joined the ledger`;
    default:
      return `${actor} — ${event.type}`;
  }
}

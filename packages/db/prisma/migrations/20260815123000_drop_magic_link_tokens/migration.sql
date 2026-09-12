-- Magic-link sign-in was replaced with plain email-based login (no
-- password, no verification link) — this table is no longer written to
-- or read from anywhere in the codebase.
DROP TABLE "magic_link_tokens";

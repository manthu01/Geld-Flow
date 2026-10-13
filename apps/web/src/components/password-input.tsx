"use client";

import { useState } from "react";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M2.5 2.5l15 15M8.03 8.1a2.25 2.25 0 0 0 3.17 3.18M5.3 5.46C3.3 6.72 1.5 10 1.5 10s3 6 8.5 6c1.6 0 2.98-.52 4.13-1.25M14.9 14.95C16.9 13.68 18.5 10 18.5 10S16.52 5.6 12.5 4.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  autoFocus = false,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required
        autoFocus={autoFocus}
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-surface-border bg-bg-elevated px-3 py-2 pr-10 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-soft hover:text-ink"
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

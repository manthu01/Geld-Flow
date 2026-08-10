"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { PixelBadge } from "@/components/pixel-badge";
import { useAuth } from "@/lib/auth-context";
import { getMyBadges, type BadgeView } from "@/lib/api";

export function BadgeCase() {
  const { authFetch } = useAuth();
  const [badges, setBadges] = useState<BadgeView[]>([]);

  const load = useCallback(async () => {
    try {
      setBadges(await getMyBadges(authFetch));
    } catch {
      // Badges are a bonus flourish, not core functionality — fail quiet.
    }
  }, [authFetch]);

  useEffect(() => {
    // Data fetch on mount, not a render-loop synchronization — the rule's
    // false-positive case for this pattern (see auth-context.tsx history).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (badges.length === 0) return null;

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <GlassCard className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-medium text-ink">Badges</h2>
        <span className="font-mono text-xs text-ink-soft">
          {earnedCount} / {badges.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {badges.map((badge) => (
          <div key={badge.id} className="flex w-16 flex-col items-center gap-1 text-center">
            <PixelBadge iconRef={badge.iconRef} earned={badge.earned} title={badge.name} />
            <span
              className={`text-[10px] leading-tight ${badge.earned ? "text-ink-soft" : "text-ink-soft/50"}`}
            >
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

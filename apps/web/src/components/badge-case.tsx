"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { PixelBadge } from "@/components/pixel-badge";
import { useAuth } from "@/lib/auth-context";
import { getMyBadges, type BadgeView } from "@/lib/api";

export function BadgeCase() {
  const { authFetch } = useAuth();
  const [badges, setBadges] = useState<BadgeView[]>([]);
  const [justEarnedIds, setJustEarnedIds] = useState<Set<string>>(new Set());
  const previousEarnedIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyBadges(authFetch);
      // Skip the pop animation on first load — only react to badges that
      // newly flip to earned between one load and the next.
      if (previousEarnedIds.current) {
        const newlyEarned = data
          .filter((b) => b.earned && !previousEarnedIds.current!.has(b.id))
          .map((b) => b.id);
        if (newlyEarned.length > 0) {
          setJustEarnedIds(new Set(newlyEarned));
          setTimeout(() => setJustEarnedIds(new Set()), 600);
        }
      }
      previousEarnedIds.current = new Set(data.filter((b) => b.earned).map((b) => b.id));
      setBadges(data);
    } catch {
      // Badges are a bonus flourish, not core functionality — fail quiet.
    }
  }, [authFetch]);

  useEffect(() => {
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
            <PixelBadge
              iconRef={badge.iconRef}
              earned={badge.earned}
              title={badge.name}
              className={justEarnedIds.has(badge.id) ? "animate-badge-pop" : ""}
            />
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

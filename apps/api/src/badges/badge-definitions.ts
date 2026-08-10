/**
 * Source of truth for every badge. Synced into the `badges` table on
 * every API boot (see BadgesService.onModuleInit) via an idempotent
 * upsert-by-key, so changing a name/description here just takes effect
 * on the next deploy — no separate seed script to remember to run.
 */
export const BADGE_DEFINITIONS = [
  {
    key: 'first-steps',
    name: 'First Steps',
    description: 'Logged your first expense.',
    iconRef: 'first-steps',
    criteriaType: 'expense_count',
    criteriaValue: '1',
  },
  {
    key: 'group-founder',
    name: 'Group Founder',
    description: 'Started your first group ledger.',
    iconRef: 'group-founder',
    criteriaType: 'group_ledger_count',
    criteriaValue: '1',
  },
  {
    key: 'peacemaker',
    name: 'Peacemaker',
    description: 'Opened your first personal ledger.',
    iconRef: 'peacemaker',
    criteriaType: 'personal_ledger_count',
    criteriaValue: '1',
  },
  {
    key: 'first-settlement',
    name: 'Squared Up',
    description: 'Had your first payment confirmed.',
    iconRef: 'first-settlement',
    criteriaType: 'confirmed_settlements',
    criteriaValue: '1',
  },
  {
    key: 'speedy-settler',
    name: 'Speedy Settler',
    description: 'Got a payment confirmed within an hour.',
    iconRef: 'speedy-settler',
    criteriaType: 'settle_hours_under',
    criteriaValue: '1',
  },
  {
    key: 'reliable-payer',
    name: 'Reliable Payer',
    description: 'Reached 10 confirmed settlements.',
    iconRef: 'reliable-payer',
    criteriaType: 'confirmed_settlements',
    criteriaValue: '10',
  },
  {
    key: 'legendary',
    name: 'Legendary',
    description: 'Reached Rank V.',
    iconRef: 'legendary',
    criteriaType: 'rank',
    criteriaValue: 'V',
  },
  {
    key: 'checklist-champion',
    name: 'Checklist Champion',
    description: 'Completed 5 checklist tasks.',
    iconRef: 'checklist-champion',
    criteriaType: 'checklist_completed',
    criteriaValue: '5',
  },
] as const;

export type BadgeKey = (typeof BADGE_DEFINITIONS)[number]['key'];

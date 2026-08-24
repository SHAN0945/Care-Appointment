// Length of the slot hold: a patient who starts booking gets this long to
// finish the symptom form and confirm before the hold auto-expires and the
// slot becomes bookable by someone else again (swept by the Phase 8 cron).
export const HOLD_DURATION_MINUTES = 5;

// Capped retry attempts for a queued notification before it's marked
// permanently ABANDONED (see src/lib/notifications.ts / the cron routes).
export const MAX_NOTIFICATION_ATTEMPTS = 3;

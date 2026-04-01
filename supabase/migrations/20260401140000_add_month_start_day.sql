-- Add configurable month start day to groups table.
-- Replaces the manual open/close period system with automatic period computation.
-- Default 1 = standard calendar months. Set to e.g. 6 for periods running 6th–5th.

ALTER TABLE groups ADD COLUMN month_start_day INTEGER NOT NULL DEFAULT 1;

ALTER TABLE groups ADD CONSTRAINT groups_month_start_day_range
  CHECK (month_start_day >= 1 AND month_start_day <= 28);

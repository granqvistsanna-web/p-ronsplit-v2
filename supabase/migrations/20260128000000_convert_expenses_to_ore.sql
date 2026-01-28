-- Convert expenses.amount from decimal to integer (ore) storage
--
-- Requirement: TECH-02 - Store currency as integers to prevent floating-point rounding errors
--
-- This migration brings the expenses table into consistency with the incomes table,
-- which already uses integer storage for amounts.
--
-- Background:
-- - JavaScript floating-point arithmetic has precision issues (0.1 + 0.2 = 0.30000000000000004)
-- - Storing monetary values as integers (ore/cents) eliminates these errors
-- - 1 krona (SEK) = 100 ore
--
-- IMPORTANT: This migration is irreversible in terms of decimal precision.
-- However, monetary amounts should only have 2 decimal places anyway, so
-- ROUND(amount * 100) preserves all meaningful financial data.

-- Step 1: Convert existing amounts from kronor to ore
-- Multiply by 100 and round to handle any floating-point imprecision in existing data
UPDATE public.expenses
SET amount = ROUND(amount * 100)
WHERE amount IS NOT NULL;

-- Step 2: Alter column type from NUMERIC/DECIMAL to BIGINT
-- BIGINT provides sufficient range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
-- This is ~92 quadrillion ore, or ~920 trillion kronor - well above any realistic amount
ALTER TABLE public.expenses
ALTER COLUMN amount TYPE BIGINT USING ROUND(amount);

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN public.expenses.amount IS 'Amount in ore (1 krona = 100 ore). Stored as integer to prevent floating-point errors.';

-- Note for developers:
-- After this migration:
-- - Frontend code MUST use toOre() when inserting expenses
-- - Frontend code MUST use toKronor() when reading expenses for display
-- - This matches the existing pattern used for the incomes table

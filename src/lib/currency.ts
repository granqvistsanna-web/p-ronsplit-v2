/**
 * Currency conversion utilities for Päronsplit.
 *
 * All monetary values are stored as integers (ore) in the database to prevent
 * floating-point rounding errors. This is critical for financial applications
 * where precision matters.
 *
 * Background:
 * - JavaScript's Number type uses IEEE 754 double-precision floating-point
 * - This causes precision issues: 0.1 + 0.2 = 0.30000000000000004
 * - Storing as integers eliminates these errors
 * - Number.MAX_SAFE_INTEGER is ~9 quadrillion ore (~90 trillion kr) - well above realistic amounts
 *
 * Currency conversion: 1 krona (SEK) = 100 ore
 *
 * @example
 * // Converting for database storage
 * const amountInOre = toOre(123.45); // 12345
 *
 * @example
 * // Converting from database for calculations
 * const amountInKr = toKronor(12345); // 123.45
 *
 * @example
 * // Formatting for display
 * formatCurrency(12345); // "123 kr"
 * formatCurrency(12345, { showDecimals: true }); // "123,45 kr"
 */

/**
 * Converts kronor to ore (multiply by 100, round to integer).
 *
 * Uses Math.round() to handle floating-point imprecision gracefully.
 *
 * @param kr - Amount in kronor (can have decimals)
 * @returns Amount in ore (integer)
 *
 * @example
 * toOre(123.45) // => 12345
 * toOre(123.456) // => 12346 (rounds to nearest)
 * toOre(0.1 + 0.2) // => 30 (handles floating-point correctly)
 */
export function toOre(kr: number): number {
  return Math.round(kr * 100);
}

/**
 * Converts ore to kronor (divide by 100).
 *
 * @param ore - Amount in ore (integer)
 * @returns Amount in kronor (decimal)
 *
 * @example
 * toKronor(12345) // => 123.45
 * toKronor(100) // => 1.00
 * toKronor(1) // => 0.01
 */
export function toKronor(ore: number): number {
  return ore / 100;
}

/**
 * Formats ore amount for display in Swedish locale.
 *
 * Default behavior: no decimals (e.g., "12 345 kr")
 * With showDecimals: shows two decimal places (e.g., "12 345,00 kr")
 *
 * Uses Swedish locale formatting:
 * - Thousand separator: space
 * - Decimal separator: comma
 * - Currency symbol: "kr" suffix
 *
 * @param ore - Amount in ore (integer)
 * @param options - Formatting options
 * @param options.showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(12345) // => "123 kr"
 * formatCurrency(12345, { showDecimals: true }) // => "123,45 kr"
 * formatCurrency(1234500) // => "12 345 kr"
 * formatCurrency(1234500, { showDecimals: true }) // => "12 345,00 kr"
 */
export function formatCurrency(ore: number, options?: { showDecimals?: boolean }): string {
  const kr = toKronor(ore);
  const decimals = options?.showDecimals ? 2 : 0;

  return `${kr.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kr`;
}

/**
 * Parses user input string to ore.
 *
 * Handles both Swedish (comma) and international (period) decimal separators.
 * Removes whitespace and thousand separators for flexibility.
 *
 * Returns null for invalid input (non-numeric, empty, etc.).
 *
 * @param input - User input string (e.g., "123,45" or "123.45")
 * @returns Amount in ore (integer), or null if invalid
 *
 * @example
 * parseInputToOre("123,45") // => 12345
 * parseInputToOre("123.45") // => 12345
 * parseInputToOre("123") // => 12300
 * parseInputToOre("1 234,56") // => 123456 (handles thousand separator)
 * parseInputToOre("abc") // => null
 * parseInputToOre("") // => null
 * parseInputToOre("1e10") // => null (rejects scientific notation)
 * parseInputToOre("999999999999") // => null (rejects amounts over 1 billion kr)
 */

// Maximum allowed amount: 1 billion kronor (prevents overflow and unrealistic amounts)
const MAX_AMOUNT_KR = 1_000_000_000;
// Minimum allowed amount: -1 billion kronor (for refunds/corrections)
const MIN_AMOUNT_KR = -1_000_000_000;

export function parseInputToOre(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace and thousand separators
  let cleaned = input.trim().replace(/\s/g, '');

  // Replace comma with period for parsing
  cleaned = cleaned.replace(',', '.');

  // Security: Reject scientific notation (e.g., 1e308, 1E10)
  // This prevents potential overflow attacks
  if (/[eE]/.test(cleaned)) {
    return null;
  }

  // Try to parse as number
  const parsed = parseFloat(cleaned);

  // Validate: must be a valid number and not NaN
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  // Security: Reject unreasonably large or small amounts
  // This prevents integer overflow and ensures realistic financial values
  if (parsed > MAX_AMOUNT_KR || parsed < MIN_AMOUNT_KR) {
    return null;
  }

  // Convert to ore
  return toOre(parsed);
}

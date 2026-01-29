import { describe, it, expect } from 'vitest';
import {
  oreFromDb,
  kronorFromNumber,
  toOre,
  toKronor,
  formatCurrency,
  parseInputToOre,
  type Ore,
  type Kronor,
} from './currency';

// ============================================================================
// Type Helper Tests
// ============================================================================

describe('oreFromDb', () => {
  it('creates Ore from raw database number', () => {
    const ore = oreFromDb(12345);
    expect(ore).toBe(12345);
  });

  it('handles zero', () => {
    const ore = oreFromDb(0);
    expect(ore).toBe(0);
  });

  it('handles negative values', () => {
    const ore = oreFromDb(-500);
    expect(ore).toBe(-500);
  });
});

describe('kronorFromNumber', () => {
  it('creates Kronor from raw number', () => {
    const kr = kronorFromNumber(123.45);
    expect(kr).toBe(123.45);
  });

  it('handles zero', () => {
    const kr = kronorFromNumber(0);
    expect(kr).toBe(0);
  });

  it('handles negative values', () => {
    const kr = kronorFromNumber(-50.25);
    expect(kr).toBe(-50.25);
  });
});

// ============================================================================
// Basic Conversion Tests
// ============================================================================

describe('toOre', () => {
  it('converts kronor to ore by multiplying by 100', () => {
    expect(toOre(123.45)).toBe(12345);
  });

  it('converts whole kronor', () => {
    expect(toOre(100)).toBe(10000);
  });

  it('converts single ore', () => {
    expect(toOre(0.01)).toBe(1);
  });

  it('handles zero', () => {
    expect(toOre(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(toOre(-50.25)).toBe(-5025);
  });

  it('handles very small amounts', () => {
    expect(toOre(0.001)).toBe(0); // Rounds to 0
    expect(toOre(0.005)).toBe(1); // Rounds up to 1
    expect(toOre(0.004)).toBe(0); // Rounds down to 0
  });

  // Rounding behavior tests
  describe('rounding', () => {
    it('rounds 0.5 ore up (standard rounding)', () => {
      expect(toOre(123.455)).toBe(12346); // 12345.5 rounds to 12346
    });

    it('rounds down when below 0.5', () => {
      expect(toOre(123.454)).toBe(12345); // 12345.4 rounds to 12345
    });

    it('rounds up when at or above 0.5', () => {
      expect(toOre(123.456)).toBe(12346); // 12345.6 rounds to 12346
    });

    it('handles many decimal places', () => {
      expect(toOre(123.999999)).toBe(12400);
      expect(toOre(123.000001)).toBe(12300);
    });
  });
});

describe('toKronor', () => {
  it('converts ore to kronor by dividing by 100', () => {
    expect(toKronor(12345 as Ore)).toBe(123.45);
  });

  it('converts whole ore amounts', () => {
    expect(toKronor(10000 as Ore)).toBe(100);
  });

  it('converts single ore', () => {
    expect(toKronor(1 as Ore)).toBe(0.01);
  });

  it('handles zero', () => {
    expect(toKronor(0 as Ore)).toBe(0);
  });

  it('handles negative values', () => {
    expect(toKronor(-5025 as Ore)).toBe(-50.25);
  });

  it('handles large values', () => {
    expect(toKronor(100000000000 as Ore)).toBe(1000000000); // 1 billion kr
  });
});

// ============================================================================
// Floating-Point Edge Cases
// ============================================================================

describe('floating-point edge cases', () => {
  it('handles classic 0.1 + 0.2 correctly', () => {
    // In JavaScript: 0.1 + 0.2 = 0.30000000000000004
    // toOre should round this to 30 (correct result)
    expect(toOre(0.1 + 0.2)).toBe(30);
  });

  it('handles 0.1 + 0.1 + 0.1 correctly', () => {
    // 0.1 + 0.1 + 0.1 = 0.30000000000000004 in JS
    expect(toOre(0.1 + 0.1 + 0.1)).toBe(30);
  });

  it('handles 0.7 + 0.1 correctly', () => {
    // 0.7 + 0.1 = 0.7999999999999999 in JS
    expect(toOre(0.7 + 0.1)).toBe(80);
  });

  it('handles 1.005 correctly', () => {
    // 1.005 * 100 = 100.49999999999999 in JS (due to binary representation)
    // This rounds to 100, not 101 - documenting actual behavior
    expect(toOre(1.005)).toBe(100); // Note: known floating-point quirk
  });

  it('handles 1.015 correctly', () => {
    // 1.015 * 100 = 101.49999999999999 in JS
    expect(toOre(1.015)).toBe(101);
  });

  it('round trip conversion preserves integer ore values', () => {
    const original = 12345 as Ore;
    const kr = toKronor(original);
    const backToOre = toOre(kr);
    expect(backToOre).toBe(original);
  });

  it('round trip works for various amounts', () => {
    const testValues = [1, 10, 100, 1000, 12345, 99999, 100000];
    for (const ore of testValues) {
      const kr = toKronor(ore as Ore);
      const backToOre = toOre(kr);
      expect(backToOre).toBe(ore);
    }
  });
});

// ============================================================================
// formatCurrency Tests
// ============================================================================

describe('formatCurrency', () => {
  describe('without decimals (default)', () => {
    it('formats basic amount', () => {
      expect(formatCurrency(12345 as Ore)).toBe('123 kr');
    });

    it('formats zero', () => {
      expect(formatCurrency(0 as Ore)).toBe('0 kr');
    });

    it('formats single ore (rounds down)', () => {
      expect(formatCurrency(1 as Ore)).toBe('0 kr');
    });

    it('formats 50 ore (rounds up)', () => {
      expect(formatCurrency(50 as Ore)).toBe('1 kr');
    });

    it('formats 49 ore (rounds down)', () => {
      expect(formatCurrency(49 as Ore)).toBe('0 kr');
    });

    it('formats negative amount', () => {
      // Swedish locale uses Unicode minus sign (U+2212) not ASCII hyphen-minus
      expect(formatCurrency(-5025 as Ore)).toBe('\u221250 kr');
    });
  });

  describe('with decimals', () => {
    it('formats basic amount with decimals', () => {
      expect(formatCurrency(12345 as Ore, { showDecimals: true })).toBe('123,45 kr');
    });

    it('formats zero with decimals', () => {
      expect(formatCurrency(0 as Ore, { showDecimals: true })).toBe('0,00 kr');
    });

    it('formats single ore with decimals', () => {
      expect(formatCurrency(1 as Ore, { showDecimals: true })).toBe('0,01 kr');
    });

    it('formats whole kronor with decimals', () => {
      expect(formatCurrency(10000 as Ore, { showDecimals: true })).toBe('100,00 kr');
    });

    it('formats negative amount with decimals', () => {
      // Swedish locale uses Unicode minus sign (U+2212) not ASCII hyphen-minus
      expect(formatCurrency(-5025 as Ore, { showDecimals: true })).toBe('\u221250,25 kr');
    });
  });

  describe('thousand separators (Swedish locale)', () => {
    it('formats thousands with space separator', () => {
      expect(formatCurrency(1234500 as Ore)).toBe('12\u00a0345 kr');
    });

    it('formats millions with space separators', () => {
      expect(formatCurrency(123456700 as Ore)).toBe('1\u00a0234\u00a0567 kr');
    });

    it('formats thousands with decimals', () => {
      expect(formatCurrency(1234567 as Ore, { showDecimals: true })).toBe('12\u00a0345,67 kr');
    });

    it('formats large negative numbers', () => {
      // Swedish locale uses Unicode minus sign (U+2212) not ASCII hyphen-minus
      expect(formatCurrency(-123456700 as Ore)).toBe('\u22121\u00a0234\u00a0567 kr');
    });
  });

  describe('edge cases', () => {
    it('formats maximum safe amount (near 1 billion kr)', () => {
      // 999,999,999 kr = 99,999,999,900 ore
      const largeAmount = formatCurrency(99999999900 as Ore);
      expect(largeAmount).toContain('999');
      expect(largeAmount).toContain('kr');
    });

    it('formats very small decimal amounts', () => {
      expect(formatCurrency(5 as Ore, { showDecimals: true })).toBe('0,05 kr');
    });
  });
});

// ============================================================================
// parseInputToOre Tests
// ============================================================================

describe('parseInputToOre', () => {
  describe('Swedish comma decimals', () => {
    it('parses "123,45" to 12345 ore', () => {
      expect(parseInputToOre('123,45')).toBe(12345);
    });

    it('parses "0,01" to 1 ore', () => {
      expect(parseInputToOre('0,01')).toBe(1);
    });

    it('parses "0,50" to 50 ore', () => {
      expect(parseInputToOre('0,50')).toBe(50);
    });

    it('parses negative Swedish format', () => {
      expect(parseInputToOre('-50,25')).toBe(-5025);
    });
  });

  describe('international period decimals', () => {
    it('parses "123.45" to 12345 ore', () => {
      expect(parseInputToOre('123.45')).toBe(12345);
    });

    it('parses "0.01" to 1 ore', () => {
      expect(parseInputToOre('0.01')).toBe(1);
    });

    it('parses negative international format', () => {
      expect(parseInputToOre('-50.25')).toBe(-5025);
    });
  });

  describe('whole numbers (no decimals)', () => {
    it('parses "123" to 12300 ore', () => {
      expect(parseInputToOre('123')).toBe(12300);
    });

    it('parses "0" to 0 ore', () => {
      expect(parseInputToOre('0')).toBe(0);
    });

    it('parses negative whole number', () => {
      expect(parseInputToOre('-100')).toBe(-10000);
    });
  });

  describe('thousand separators', () => {
    it('parses "1 234,56" with space separator', () => {
      expect(parseInputToOre('1 234,56')).toBe(123456);
    });

    it('parses "1 234.56" with space and period', () => {
      expect(parseInputToOre('1 234.56')).toBe(123456);
    });

    it('parses "12 345" whole number with space', () => {
      expect(parseInputToOre('12 345')).toBe(1234500);
    });

    it('parses multiple thousand separators "1 234 567,89"', () => {
      expect(parseInputToOre('1 234 567,89')).toBe(123456789);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      expect(parseInputToOre('  123')).toBe(12300);
    });

    it('trims trailing whitespace', () => {
      expect(parseInputToOre('123  ')).toBe(12300);
    });

    it('trims both leading and trailing whitespace', () => {
      expect(parseInputToOre('  123,45  ')).toBe(12345);
    });

    it('handles tabs and other whitespace', () => {
      expect(parseInputToOre('\t123\t')).toBe(12300);
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseInputToOre('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseInputToOre('   ')).toBeNull();
    });

    it('returns null for "abc"', () => {
      expect(parseInputToOre('abc')).toBeNull();
    });

    it('parses numbers with trailing text (parseFloat behavior)', () => {
      // Note: parseFloat stops at first non-numeric character
      // "123abc" parses as 123, which is valid behavior for this function
      expect(parseInputToOre('123abc')).toBe(12300);
    });

    it('handles inputs with leading special characters', () => {
      // Leading non-numeric characters result in NaN
      expect(parseInputToOre('$123')).toBeNull();
      // Trailing non-numeric characters are ignored by parseFloat
      expect(parseInputToOre('123kr')).toBe(12300);
    });
  });

  describe('scientific notation rejection (security)', () => {
    it('returns null for "1e10"', () => {
      expect(parseInputToOre('1e10')).toBeNull();
    });

    it('returns null for "1E10"', () => {
      expect(parseInputToOre('1E10')).toBeNull();
    });

    it('returns null for "1e308" (near Number.MAX_VALUE)', () => {
      expect(parseInputToOre('1e308')).toBeNull();
    });

    it('returns null for negative scientific notation', () => {
      expect(parseInputToOre('-1e5')).toBeNull();
    });

    it('returns null for small scientific notation', () => {
      expect(parseInputToOre('1e-10')).toBeNull();
    });
  });

  describe('boundary values (MAX_AMOUNT_KR = 1 billion)', () => {
    it('accepts exactly 1 billion kr', () => {
      expect(parseInputToOre('1000000000')).toBe(100000000000);
    });

    it('rejects amount just over 1 billion kr', () => {
      expect(parseInputToOre('1000000001')).toBeNull();
    });

    it('accepts exactly -1 billion kr', () => {
      expect(parseInputToOre('-1000000000')).toBe(-100000000000);
    });

    it('rejects amount just under -1 billion kr', () => {
      expect(parseInputToOre('-1000000001')).toBeNull();
    });

    it('accepts 999,999,999.99 kr', () => {
      expect(parseInputToOre('999999999,99')).toBe(99999999999);
    });

    it('accepts negative 999,999,999.99 kr', () => {
      expect(parseInputToOre('-999999999,99')).toBe(-99999999999);
    });
  });

  describe('edge cases', () => {
    it('handles zero correctly', () => {
      expect(parseInputToOre('0')).toBe(0);
      expect(parseInputToOre('0,00')).toBe(0);
      expect(parseInputToOre('0.00')).toBe(0);
    });

    it('handles negative zero', () => {
      // JavaScript preserves -0, but it equals 0 mathematically
      const result = parseInputToOre('-0');
      expect(result).toBe(-0);
      expect(Object.is(result, -0)).toBe(true);
    });

    it('handles very small amounts', () => {
      expect(parseInputToOre('0,001')).toBe(0); // Rounds to 0
      expect(parseInputToOre('0,005')).toBe(1); // Rounds to 1
    });

    it('handles decimal without leading zero', () => {
      // Note: parseFloat handles this
      expect(parseInputToOre(',50')).toBe(50);
      expect(parseInputToOre('.50')).toBe(50);
    });

    it('handles trailing decimal point', () => {
      expect(parseInputToOre('123.')).toBe(12300);
      expect(parseInputToOre('123,')).toBe(12300);
    });

    it('handles multiple decimal points (invalid)', () => {
      // parseFloat stops at second decimal, so "1.2.3" parses as 1.2
      // This is acceptable behavior - the result is still a valid number
      expect(parseInputToOre('1.2.3')).toBe(120);
    });

    it('handles Infinity', () => {
      expect(parseInputToOre('Infinity')).toBeNull();
      expect(parseInputToOre('-Infinity')).toBeNull();
    });

    it('handles NaN string', () => {
      expect(parseInputToOre('NaN')).toBeNull();
    });
  });

  describe('rounding in parseInputToOre', () => {
    it('rounds 0.5 ore up', () => {
      expect(parseInputToOre('0,005')).toBe(1);
    });

    it('rounds down below 0.5 ore', () => {
      expect(parseInputToOre('0,004')).toBe(0);
    });

    it('rounds correctly for amounts with many decimals', () => {
      expect(parseInputToOre('123,456')).toBe(12346);
      expect(parseInputToOre('123,454')).toBe(12345);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('currency integration', () => {
  it('parse -> format round trip', () => {
    const input = '1234,56';
    const ore = parseInputToOre(input);
    expect(ore).not.toBeNull();
    const formatted = formatCurrency(ore!, { showDecimals: true });
    expect(formatted).toBe('1\u00a0234,56 kr');
  });

  it('db read -> display -> parse round trip', () => {
    // Simulate reading from database
    const dbValue = 12345;
    const ore = oreFromDb(dbValue);

    // Convert to kronor for display
    const kr = toKronor(ore);
    expect(kr).toBe(123.45);

    // Format for UI
    const display = formatCurrency(ore, { showDecimals: true });
    expect(display).toBe('123,45 kr');

    // Parse user input (same value, different format)
    const parsed = parseInputToOre('123,45');
    expect(parsed).toBe(ore);
  });

  it('sum of small amounts maintains precision', () => {
    // Simulate adding many small amounts
    const amounts = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10];
    const oreAmounts = amounts.map(toOre);

    // Sum in ore (integers)
    const totalOre = oreAmounts.reduce((sum, ore) => sum + ore, 0) as Ore;

    // Expected: 0.55 kr = 55 ore
    expect(totalOre).toBe(55);
    expect(toKronor(totalOre)).toBe(0.55);
  });

  it('handles real-world Swedish expense example', () => {
    // User enters "1 234,50 kr" for grocery expense
    const userInput = '1 234,50';
    const oreValue = parseInputToOre(userInput);

    expect(oreValue).toBe(123450);

    // Store in DB, retrieve, and display
    const stored = oreFromDb(123450);
    const display = formatCurrency(stored, { showDecimals: true });

    expect(display).toBe('1\u00a0234,50 kr');
  });
});

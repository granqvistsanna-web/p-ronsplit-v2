import { describe, it, expect } from 'vitest';
import { calculateBalance, getBalanceBreakdown } from './balanceUtils';
import type { Expense } from '@/lib/types';
import type { Income } from '@/hooks/useIncomes';
import type { GroupMember } from '@/hooks/useGroups';
import type { Settlement } from '@/hooks/useSettlements';

const createMember = (id: string, name: string): GroupMember => ({
  id,
  user_id: id,
  name,
});

const createExpense = (paidBy: string, amount: number): Expense => ({
  id: crypto.randomUUID(),
  group_id: 'group-1',
  amount,
  paid_by: paidBy,
  category: 'mat',
  description: 'Test expense',
  date: '2024-01-15',
  created_at: '2024-01-15T10:00:00Z',
  splits: null,
  repeat: 'none',
});

const createIncome = (recipient: string, amountOre: number, includedInSplit = true): Income => ({
  id: crypto.randomUUID(),
  group_id: 'group-1',
  amount: amountOre, // in öre
  recipient,
  type: 'salary',
  note: 'Test income',
  date: '2024-01-15',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  repeat: 'none',
  included_in_split: includedInSplit,
});

const createSettlement = (fromUser: string, toUser: string, amount: number): Settlement => ({
  id: crypto.randomUUID(),
  group_id: 'group-1',
  from_user: fromUser,
  to_user: toUser,
  amount,
  date: '2024-01-15',
  month: 'januari 2024',
  created_at: '2024-01-15T10:00:00Z',
});

describe('calculateBalance', () => {
  it('returns empty array for no members', () => {
    const result = calculateBalance([], [], [], []);
    expect(result).toEqual([]);
  });

  it('returns zero balances when no expenses or incomes', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const result = calculateBalance([], members, [], []);

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(0);
    expect(result[1].balance).toBe(0);
  });

  it('calculates balance when one person pays all expenses', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const expenses = [
      createExpense('user-1', 1000), // Alice pays 1000
    ];

    const result = calculateBalance(expenses, members, [], []);

    // Total expenses: 1000, per person share: 500
    // Alice: actual net = -1000, target = -500, balance = -500 - (-1000) = +500 (should receive)
    // Bob: actual net = 0, target = -500, balance = -500 - 0 = -500 (should pay)
    expect(result.find(b => b.userId === 'user-1')?.balance).toBe(500);
    expect(result.find(b => b.userId === 'user-2')?.balance).toBe(-500);
  });

  it('calculates balance with both expenses and incomes', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const expenses = [
      createExpense('user-1', 1000), // Alice pays 1000
    ];
    const incomes = [
      createIncome('user-2', 200000), // Bob receives 2000 kr (in öre)
    ];

    const result = calculateBalance(expenses, members, [], incomes);

    // Alice: income 0, expenses 1000, net = -1000
    // Bob: income 2000, expenses 0, net = +2000
    // Total household net = 1000
    // Target per person = 500
    // Alice balance = 500 - (-1000) = +1500 (should receive)
    // Bob balance = 500 - 2000 = -1500 (should pay)
    expect(result.find(b => b.userId === 'user-1')?.balance).toBe(1500);
    expect(result.find(b => b.userId === 'user-2')?.balance).toBe(-1500);
  });

  it('ignores incomes not included in split', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const incomes = [
      createIncome('user-1', 100000, false), // Not included in split
    ];

    const result = calculateBalance([], members, [], incomes);

    expect(result[0].balance).toBe(0);
    expect(result[1].balance).toBe(0);
  });

  it('applies settlements correctly', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const expenses = [
      createExpense('user-1', 1000),
    ];
    const settlements = [
      createSettlement('user-2', 'user-1', 500), // Bob pays Alice 500
    ];

    const result = calculateBalance(expenses, members, settlements, []);

    // Before settlements: Alice +500, Bob -500
    // After settlement: Alice +500-500=0, Bob -500+500=0
    expect(result.find(b => b.userId === 'user-1')?.balance).toBe(0);
    expect(result.find(b => b.userId === 'user-2')?.balance).toBe(0);
  });

  it('ignores invalid expense amounts', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const expenses = [
      createExpense('user-1', 1000),
      { ...createExpense('user-1', -100) }, // Invalid negative
      { ...createExpense('user-1', 0) }, // Invalid zero
      { ...createExpense('user-1', NaN) }, // Invalid NaN
    ];

    const result = calculateBalance(expenses, members, [], []);

    // Only the valid 1000 expense should be counted
    expect(result.find(b => b.userId === 'user-1')?.balance).toBe(500);
    expect(result.find(b => b.userId === 'user-2')?.balance).toBe(-500);
  });

  it('handles three or more members correctly', () => {
    const members = [
      createMember('user-1', 'Alice'),
      createMember('user-2', 'Bob'),
      createMember('user-3', 'Charlie'),
    ];
    const expenses = [
      createExpense('user-1', 3000), // Alice pays 3000
    ];

    const result = calculateBalance(expenses, members, [], []);

    // Total: 3000, per person: 1000
    // Alice: actual net -3000, target -1000, balance = +2000
    // Bob: actual net 0, target -1000, balance = -1000
    // Charlie: actual net 0, target -1000, balance = -1000
    expect(result.find(b => b.userId === 'user-1')?.balance).toBe(2000);
    expect(result.find(b => b.userId === 'user-2')?.balance).toBe(-1000);
    expect(result.find(b => b.userId === 'user-3')?.balance).toBe(-1000);

    // Sum should be zero
    const sum = result.reduce((acc, b) => acc + b.balance, 0);
    expect(sum).toBeCloseTo(0, 10);
  });
});

describe('getBalanceBreakdown', () => {
  it('returns empty array for no members', () => {
    const result = getBalanceBreakdown([], [], [], []);
    expect(result).toEqual([]);
  });

  it('provides detailed breakdown of balance calculation', () => {
    const members = [createMember('user-1', 'Alice'), createMember('user-2', 'Bob')];
    const expenses = [createExpense('user-1', 1000)];
    const incomes = [createIncome('user-2', 200000)]; // 2000 kr
    const settlements = [createSettlement('user-2', 'user-1', 300)];

    const result = getBalanceBreakdown(expenses, members, settlements, incomes);

    const alice = result.find(b => b.userId === 'user-1');
    const bob = result.find(b => b.userId === 'user-2');

    // Alice breakdown
    expect(alice?.incomeReceived).toBe(0);
    expect(alice?.expensesPaid).toBe(1000);
    expect(alice?.netResult).toBe(-1000);
    expect(alice?.settlementsReceived).toBe(300);
    expect(alice?.settlementsPaid).toBe(0);

    // Bob breakdown
    expect(bob?.incomeReceived).toBe(2000);
    expect(bob?.expensesPaid).toBe(0);
    expect(bob?.netResult).toBe(2000);
    expect(bob?.settlementsPaid).toBe(300);
    expect(bob?.settlementsReceived).toBe(0);
  });

  it('includes member names in breakdown', () => {
    const members = [createMember('user-1', 'Alice')];
    const result = getBalanceBreakdown([], members, [], []);

    expect(result[0].name).toBe('Alice');
  });
});

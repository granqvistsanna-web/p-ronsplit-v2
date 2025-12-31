import { GroupMember } from "@/hooks/useGroups";
import { Expense } from "@/hooks/useExpenses";
import { Settlement } from "@/hooks/useSettlements";
import { Income } from "@/hooks/useIncomes";

export interface Balance {
  userId: string;
  balance: number;
}

export interface BalanceBreakdown {
  userId: string;
  name: string;
  incomeReceived: number;
  expensesPaid: number;
  netResult: number;
  targetNet: number;
  balanceBeforeSettlements: number;
  settlementsPaid: number;
  settlementsReceived: number;
  finalBalance: number;
}

/**
 * Calculate the total balance to equalize NET RESULT between members.
 * 
 * Net result = Income received - Expenses paid
 * 
 * Example:
 * - Sanna: income 11,608 kr, expenses paid 14,500 kr → net = -2,892 kr
 * - Isak: income 32,000 kr, expenses paid 6,500 kr → net = +25,500 kr
 * - Total household net = 22,608 kr
 * - Target per person = 11,304 kr
 * - Sanna needs +14,196 kr to reach target
 * - Isak needs to pay 14,196 kr to reach target
 * 
 * Balance logic:
 * - Positive balance = this person should RECEIVE money
 * - Negative balance = this person should PAY money
 */
export function calculateBalance(
  expenses: Expense[],
  members: GroupMember[],
  settlements: Settlement[] = [],
  incomes: Income[] = []
): Balance[] {
  if (members.length === 0) return [];

  // Calculate income and expenses for each member
  const memberData: Record<string, { income: number; expenses: number }> = {};
  
  members.forEach((member) => {
    memberData[member.user_id] = { income: 0, expenses: 0 };
  });

  // Sum expenses paid by each member
  expenses.forEach((expense) => {
    if (!expense.amount || expense.amount <= 0 || !Number.isFinite(expense.amount)) {
      return;
    }
    if (memberData[expense.paid_by] !== undefined) {
      memberData[expense.paid_by].expenses += expense.amount;
    }
  });

  // Sum incomes received by each member (only included_in_split)
  const includedIncomes = incomes.filter((i) => i.included_in_split);
  includedIncomes.forEach((income) => {
    const amountKr = income.amount / 100; // Convert from öre to kr
    if (!amountKr || amountKr <= 0 || !Number.isFinite(amountKr)) {
      return;
    }
    if (memberData[income.recipient] !== undefined) {
      memberData[income.recipient].income += amountKr;
    }
  });

  // Calculate total household net result
  let totalIncome = 0;
  let totalExpenses = 0;
  
  members.forEach((member) => {
    totalIncome += memberData[member.user_id].income;
    totalExpenses += memberData[member.user_id].expenses;
  });

  const totalHouseholdNet = totalIncome - totalExpenses;
  const targetNetPerPerson = totalHouseholdNet / members.length;

  // Calculate balance for each member
  // Balance = Target net - Actual net
  // Positive = should receive money, Negative = should pay money
  const balances: Record<string, number> = {};
  
  members.forEach((member) => {
    const data = memberData[member.user_id];
    const actualNet = data.income - data.expenses;
    // If actual net is HIGHER than target, they owe the difference (negative balance)
    // If actual net is LOWER than target, they are owed the difference (positive balance)
    balances[member.user_id] = targetNetPerPerson - actualNet;
  });

  // Apply settlements
  settlements.forEach((settlement) => {
    if (!settlement.amount || settlement.amount <= 0 || !Number.isFinite(settlement.amount)) {
      return;
    }
    // The person who sent money reduces what they owe (or increases what they're owed)
    if (balances[settlement.from_user] !== undefined) {
      balances[settlement.from_user] += settlement.amount;
    }
    // The person who received money increases what they owe (or reduces what they're owed)
    if (balances[settlement.to_user] !== undefined) {
      balances[settlement.to_user] -= settlement.amount;
    }
  });

  return members.map((member) => ({
    userId: member.user_id,
    balance: balances[member.user_id],
  }));
}

/**
 * Get detailed breakdown of balance calculation for display
 */
export function getBalanceBreakdown(
  expenses: Expense[],
  members: GroupMember[],
  settlements: Settlement[] = [],
  incomes: Income[] = []
): BalanceBreakdown[] {
  if (members.length === 0) return [];

  const memberData: Record<string, BalanceBreakdown> = {};
  
  members.forEach((member) => {
    memberData[member.user_id] = {
      userId: member.user_id,
      name: member.name,
      incomeReceived: 0,
      expensesPaid: 0,
      netResult: 0,
      targetNet: 0,
      balanceBeforeSettlements: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      finalBalance: 0,
    };
  });

  // Sum expenses
  expenses.forEach((expense) => {
    if (!expense.amount || expense.amount <= 0) return;
    if (memberData[expense.paid_by]) {
      memberData[expense.paid_by].expensesPaid += expense.amount;
    }
  });

  // Sum incomes
  const includedIncomes = incomes.filter((i) => i.included_in_split);
  includedIncomes.forEach((income) => {
    const amountKr = income.amount / 100;
    if (!amountKr || amountKr <= 0) return;
    if (memberData[income.recipient]) {
      memberData[income.recipient].incomeReceived += amountKr;
    }
  });

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  members.forEach((m) => {
    totalIncome += memberData[m.user_id].incomeReceived;
    totalExpenses += memberData[m.user_id].expensesPaid;
  });

  const totalHouseholdNet = totalIncome - totalExpenses;
  const targetNet = totalHouseholdNet / members.length;

  // Calculate net and balance
  members.forEach((m) => {
    const data = memberData[m.user_id];
    data.netResult = data.incomeReceived - data.expensesPaid;
    data.targetNet = targetNet;
    data.balanceBeforeSettlements = targetNet - data.netResult;
  });

  // Apply settlements
  settlements.forEach((s) => {
    if (!s.amount || s.amount <= 0) return;
    if (memberData[s.from_user]) {
      memberData[s.from_user].settlementsPaid += s.amount;
    }
    if (memberData[s.to_user]) {
      memberData[s.to_user].settlementsReceived += s.amount;
    }
  });

  // Calculate final balance
  members.forEach((m) => {
    const data = memberData[m.user_id];
    data.finalBalance = data.balanceBeforeSettlements + data.settlementsPaid - data.settlementsReceived;
  });

  return members.map((m) => memberData[m.user_id]);
}

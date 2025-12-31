import { Income } from "@/hooks/useIncomes";

export interface IncomeSettlement {
  totalIncome: number; // Total income in cents
  personAIncome: number; // Person A's total income
  personBIncome: number; // Person B's total income
  shareA: number; // Person A's share of total (50%)
  shareB: number; // Person B's share of total (50%)
  balanceA: number; // Person A's balance (positive = pays, negative = receives)
  balanceB: number; // Person B's balance (positive = pays, negative = receives)
  transferAmount: number; // Amount to transfer
  transferFrom: string | null; // User ID who pays
  transferTo: string | null; // User ID who receives
  excludedTotal: number; // Total of incomes not included in split
}

/**
 * Calculate the monthly income settlement with 50/50 sharing
 *
 * Settlement logic:
 * 1. Sum all included incomes for each person
 * 2. Calculate total income
 * 3. Split total income 50/50 with deterministic rounding:
 *    - If total is odd: floor(total/2) for A, remainder for B
 *    - Extra cent goes to higher earner; tie → person A
 * 4. Calculate balances: personIncome - share
 * 5. Determine transfer direction and amount
 */
export function calculateIncomeSettlement(
  incomes: Income[],
  personAId: string,
  personBId: string,
  year: number,
  month: number // 1-12
): IncomeSettlement {
  // Filter incomes for the specified month
  const monthIncomes = incomes.filter((income) => {
    const incomeDate = new Date(income.date);
    return (
      incomeDate.getFullYear() === year &&
      incomeDate.getMonth() === month - 1 // JavaScript months are 0-indexed
    );
  });

  // Calculate per-person incomes (only included ones)
  const includedIncomes = monthIncomes.filter((i) => i.included_in_split);
  const personAIncome = includedIncomes
    .filter((i) => i.recipient === personAId)
    .reduce((sum, i) => sum + i.amount, 0);

  const personBIncome = includedIncomes
    .filter((i) => i.recipient === personBId)
    .reduce((sum, i) => sum + i.amount, 0);

  const totalIncome = personAIncome + personBIncome;

  // Calculate excluded income
  const excludedTotal = monthIncomes
    .filter((i) => !i.included_in_split)
    .reduce((sum, i) => sum + i.amount, 0);

  // Calculate 50/50 split with deterministic rounding
  let shareA: number;
  let shareB: number;

  if (totalIncome % 2 === 1) {
    // Odd total - one person gets floor, the other gets ceiling
    const floorShare = Math.floor(totalIncome / 2);
    const ceilingShare = floorShare + 1;

    // Assign extra cent to higher earner (tie → person A)
    if (personBIncome > personAIncome) {
      // Person B earned more, so B gets the extra cent
      shareA = floorShare;
      shareB = ceilingShare;
    } else {
      // Person A earned more or equal, so A gets the extra cent
      shareA = ceilingShare;
      shareB = floorShare;
    }
  } else {
    // Even total - split exactly in half
    shareA = totalIncome / 2;
    shareB = totalIncome / 2;
  }

  // Calculate balances
  const balanceA = personAIncome - shareA;
  const balanceB = personBIncome - shareB;

  // Determine transfer
  let transferAmount = 0;
  let transferFrom: string | null = null;
  let transferTo: string | null = null;

  if (balanceA > 0) {
    // Person A has excess, pays to person B
    transferAmount = balanceA;
    transferFrom = personAId;
    transferTo = personBId;
  } else if (balanceA < 0) {
    // Person A has deficit, receives from person B
    transferAmount = Math.abs(balanceA);
    transferFrom = personBId;
    transferTo = personAId;
  }
  // If balanceA === 0, no transfer needed

  return {
    totalIncome,
    personAIncome,
    personBIncome,
    shareA,
    shareB,
    balanceA,
    balanceB,
    transferAmount,
    transferFrom,
    transferTo,
    excludedTotal,
  };
}

/**
 * Get incomes for a specific month
 */
export function getIncomesForMonth(
  incomes: Income[],
  year: number,
  month: number
): Income[] {
  return incomes.filter((income) => {
    const incomeDate = new Date(income.date);
    return (
      incomeDate.getFullYear() === year &&
      incomeDate.getMonth() === month - 1
    );
  });
}

/**
 * Format amount in cents to Swedish kronor string
 */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Get income type label in Swedish
 */
export function getIncomeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    salary: "Lön",
    bonus: "Bonus",
    benefit: "Förmån",
    fkassa: "F-kassa",
    bidrag: "Bidrag",
    other: "Övrigt",
  };
  return labels[type] || type;
}

/**
 * Get income type icon
 */
export function getIncomeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    salary: "💰",
    bonus: "🎁",
    benefit: "🏥",
    fkassa: "💼",
    bidrag: "📋",
    other: "💵",
  };
  return icons[type] || "💵";
}

import type { Expense } from "@/hooks/useExpenses";
import type { Income } from "@/hooks/useIncomes";
import { toKronor } from "@/lib/currency";

export type DuplicateGroup =
  | { type: "expense"; key: string; items: Expense[] }
  | { type: "income"; key: string; items: Income[] };

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round((da - db) / 86400000));
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

function bigramSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const set = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) set.add(a.slice(i, i + 2));
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (set.has(b.slice(i, i + 2))) matches++;
  }
  return (2 * matches) / (a.length - 1 + b.length - 1);
}

/**
 * Cluster items that look like duplicates of each other.
 * Rules: same group, amount within 1% (or equal), dates within 3 days,
 * and description/note bigram similarity > 0.6 (or both empty).
 */
function clusterExpenses(expenses: Expense[]): Expense[][] {
  const sorted = [...expenses].sort((a, b) => a.amount - b.amount);
  const visited = new Set<string>();
  const clusters: Expense[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (visited.has(a.id)) continue;
    const group: Expense[] = [a];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (visited.has(b.id)) continue;
      const diff = Math.abs(a.amount - b.amount);
      const pct = a.amount > 0 ? diff / a.amount : diff;
      if (diff > 0 && pct > 0.01) break; // sorted by amount, can stop
      if (daysBetween(a.date, b.date) > 3) continue;
      const sim = bigramSimilarity(
        normalizeText(a.description),
        normalizeText(b.description)
      );
      const bothEmpty = !a.description && !b.description;
      if (sim >= 0.6 || bothEmpty || a.category === b.category) {
        group.push(b);
      }
    }
    if (group.length > 1) {
      group.forEach((g) => visited.add(g.id));
      clusters.push(group);
    }
  }
  return clusters;
}

function clusterIncomes(incomes: Income[]): Income[][] {
  const sorted = [...incomes].sort((a, b) => a.amount - b.amount);
  const visited = new Set<string>();
  const clusters: Income[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (visited.has(a.id)) continue;
    const group: Income[] = [a];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (visited.has(b.id)) continue;
      const diff = Math.abs(a.amount - b.amount);
      const pct = a.amount > 0 ? diff / a.amount : diff;
      if (diff > 0 && pct > 0.01) break;
      if (daysBetween(a.date, b.date) > 3) continue;
      const sim = bigramSimilarity(normalizeText(a.note), normalizeText(b.note));
      const bothEmpty = !a.note && !b.note;
      if (sim >= 0.6 || bothEmpty || a.type === b.type) {
        group.push(b);
      }
    }
    if (group.length > 1) {
      group.forEach((g) => visited.add(g.id));
      clusters.push(group);
    }
  }
  return clusters;
}

export function findDuplicateGroups(
  expenses: Expense[],
  incomes: Income[]
): DuplicateGroup[] {
  const expenseClusters = clusterExpenses(expenses).map<DuplicateGroup>((items) => ({
    type: "expense",
    key: `e-${items[0].id}`,
    items,
  }));
  const incomeClusters = clusterIncomes(incomes).map<DuplicateGroup>((items) => ({
    type: "income",
    key: `i-${items[0].id}`,
    items,
  }));
  return [...expenseClusters, ...incomeClusters];
}

export function formatAmount(value: number, isIncomeOre: boolean): string {
  const kr = isIncomeOre ? toKronor(value) : value;
  return `${kr.toLocaleString("sv-SE")} kr`;
}
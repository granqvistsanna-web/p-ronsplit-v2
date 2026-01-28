import { useMemo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import type { Expense } from "@/lib/types";
import { aggregateByCategory } from "@/lib/categoryUtils";

export interface CategoryBarChartProps {
  expenses: Expense[];
  showAll?: boolean;
}

// Chart configuration for theming
const chartConfig = {
  amount: {
    label: "Belopp",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// Custom tooltip with refined styling matching TrendChart
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{data.icon}</span>
        <p className="text-label-mono font-medium">{data.categoryName}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-caption">Totalt</span>
        <span className="text-number font-semibold">
          {data.amount.toLocaleString('sv-SE')} kr
        </span>
      </div>
    </div>
  );
};

export function CategoryBarChart({ expenses, showAll = false }: CategoryBarChartProps) {
  // Aggregate expenses by category with useMemo for performance
  const categoryData = useMemo(() => {
    return aggregateByCategory(expenses);
  }, [expenses]);

  // Apply top 8 slice unless showAll is true
  const displayData = showAll ? categoryData : categoryData.slice(0, 8);

  // Empty state
  if (displayData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Ingen data att visa
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={displayData}
          margin={{ top: 20, right: 8, left: 0, bottom: 60 }}
        >
          <defs>
            {/* Bar gradient for visual depth */}
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />

          <XAxis
            dataKey="categoryName"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              fontFamily: "Geist Mono",
            }}
            angle={-45}
            textAnchor="end"
            height={60}
            dy={8}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
              fontFamily: "Geist Mono",
            }}
            tickFormatter={(value) =>
              value >= 1000
                ? `${(value / 1000).toFixed(0)}k`
                : value.toString()
            }
            width={45}
            dx={-4}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              fill: "hsl(var(--muted))",
              opacity: 0.1,
            }}
          />

          <Bar
            dataKey="amount"
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"
];

interface TrendData {
  month: string;
  expenses: number;
  incomes: number;
}

interface ComparisonBarProps {
  data: TrendData[];
  selectedMonth: string;
}

const chartConfig = {
  netto: {
    label: "Netto",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig;

// Extended chart data with computed fields
interface ChartDataItem extends TrendData {
  netto: number;
  monthLabel: string;
  isPositive: boolean;
  isSelected: boolean;
}

// Recharts tooltip payload entry
interface TooltipPayloadEntry {
  payload: ChartDataItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const monthParts = label?.split("-");
  const monthName = monthParts?.length === 2
    ? `${MONTHS_SHORT[parseInt(monthParts[1]) - 1]} ${monthParts[0]}`
    : label;

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg">
      <p className="text-label-mono mb-2">{monthName}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-caption">Inkomster</span>
          <span className="text-number text-income">
            +{data.incomes.toLocaleString("sv-SE")} kr
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-caption">Utgifter</span>
          <span className="text-number text-icon-pink">
            -{data.expenses.toLocaleString("sv-SE")} kr
          </span>
        </div>
        <div className="pt-1.5 mt-1.5 border-t border-border/40">
          <div className="flex justify-between gap-4">
            <span className="text-caption font-medium">Netto</span>
            <span className={`text-number font-semibold ${
              data.netto >= 0 ? "text-income" : "text-icon-pink"
            }`}>
              {data.netto >= 0 ? "+" : ""}{data.netto.toLocaleString("sv-SE")} kr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ComparisonBar({ data, selectedMonth }: ComparisonBarProps) {
  // Calculate netto for each month
  const chartData = useMemo(() => {
    return data.map(item => {
      const netto = item.incomes - item.expenses;
      const parts = item.month.split("-");
      const monthLabel = parts.length === 2
        ? MONTHS_SHORT[parseInt(parts[1]) - 1]
        : item.month;

      return {
        ...item,
        netto,
        monthLabel,
        isPositive: netto >= 0,
        isSelected: item.month === selectedMonth,
      };
    });
  }, [data, selectedMonth]);

  const hasData = data.some(m => m.expenses > 0 || m.incomes > 0);

  if (!hasData) {
    return null;
  }

  // Calculate domain to center the chart around zero
  const maxAbs = Math.max(
    ...chartData.map(d => Math.abs(d.netto)),
    1000
  );
  const domain = [-maxAbs * 1.1, maxAbs * 1.1];

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />

          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              fontFamily: "Geist Mono",
            }}
            dy={8}
          />

          <YAxis
            domain={domain}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
              fontFamily: "Geist Mono",
            }}
            tickFormatter={(value) => {
              if (value === 0) return "0";
              const absVal = Math.abs(value);
              if (absVal >= 1000) {
                return `${value >= 0 ? "+" : "-"}${(absVal / 1000).toFixed(0)}k`;
              }
              return value >= 0 ? `+${value}` : value.toString();
            }}
            width={50}
            dx={-4}
          />

          <ReferenceLine
            y={0}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }} />

          <Bar
            dataKey="netto"
            radius={[4, 4, 4, 4]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPositive ? "hsl(142 71% 38%)" : "hsl(0 72% 51%)"}
                fillOpacity={entry.isSelected ? 1 : 0.7}
                stroke={entry.isSelected ? (entry.isPositive ? "hsl(142 71% 30%)" : "hsl(0 72% 40%)") : "transparent"}
                strokeWidth={entry.isSelected ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

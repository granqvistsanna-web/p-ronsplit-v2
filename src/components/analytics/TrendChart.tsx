import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

interface TrendChartProps {
  data: TrendData[];
  selectedMonth: string;
}

const chartConfig = {
  incomes: {
    label: "Inkomster",
    color: "hsl(142 71% 38%)",
  },
  expenses: {
    label: "Utgifter",
    color: "hsl(0 72% 51%)",
  },
} satisfies ChartConfig;

// Recharts tooltip payload entry
interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
  payload: TrendData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom tooltip with refined styling
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const monthParts = label?.split("-");
  const monthName = monthParts?.length === 2
    ? `${MONTHS_SHORT[parseInt(monthParts[1]) - 1]} ${monthParts[0]}`
    : label;

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg">
      <p className="text-label-mono mb-2">{monthName}</p>
      <div className="space-y-1.5">
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-caption">
                {entry.dataKey === "incomes" ? "Inkomster" : "Utgifter"}
              </span>
            </div>
            <span className="text-number font-semibold">
              {entry.value.toLocaleString("sv-SE")} kr
            </span>
          </div>
        ))}
      </div>
      {payload.length === 2 && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between gap-4">
            <span className="text-caption">Netto</span>
            <span className={`text-number font-semibold ${
              payload[0].value - payload[1].value >= 0
                ? "text-income"
                : "text-icon-pink"
            }`}>
              {(payload[0].value - payload[1].value) >= 0 ? "+" : ""}
              {(payload[0].value - payload[1].value).toLocaleString("sv-SE")} kr
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Recharts legend payload entry
interface LegendPayloadEntry {
  dataKey: string;
  color: string;
  value: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadEntry[];
}

// Custom legend with refined styling
const CustomLegend = ({ payload }: CustomLegendProps) => {
  if (!payload?.length) return null;

  return (
    <div className="flex items-center justify-center gap-6 pt-4">
      {payload.map((entry: LegendPayloadEntry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-caption font-medium">
            {entry.dataKey === "incomes" ? "Inkomster" : "Utgifter"}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ data, selectedMonth }: TrendChartProps) {
  // Format data with readable month names for display
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      monthLabel: (() => {
        const parts = item.month.split("-");
        if (parts.length === 2) {
          const monthIndex = parseInt(parts[1]) - 1;
          return MONTHS_SHORT[monthIndex];
        }
        return item.month;
      })(),
      isSelected: item.month === selectedMonth,
    }));
  }, [data, selectedMonth]);

  const hasData = data.some(m => m.expenses > 0 || m.incomes > 0);

  if (!hasData) {
    return null;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Income gradient - rich green with depth */}
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142 71% 38%)" stopOpacity={0.35} />
              <stop offset="50%" stopColor="hsl(142 71% 45%)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(142 71% 50%)" stopOpacity={0.02} />
            </linearGradient>
            {/* Expense gradient - warm coral with depth */}
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
              <stop offset="50%" stopColor="hsl(0 72% 58%)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="hsl(0 72% 65%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

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
              stroke: "hsl(var(--foreground))",
              strokeOpacity: 0.1,
              strokeWidth: 1,
            }}
          />

          <Legend content={<CustomLegend />} />

          {/* Income area - rendered first (back) */}
          <Area
            type="monotone"
            dataKey="incomes"
            stroke="hsl(142 71% 38%)"
            strokeWidth={2.5}
            fill="url(#incomeGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "hsl(142 71% 38%)",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
            animationDuration={300}
            animationEasing="ease-out"
          />

          {/* Expense area - rendered second (front) */}
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="hsl(0 72% 51%)"
            strokeWidth={2.5}
            fill="url(#expenseGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "hsl(0 72% 51%)",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
            animationDuration={300}
            animationEasing="ease-out"
            animationBegin={100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

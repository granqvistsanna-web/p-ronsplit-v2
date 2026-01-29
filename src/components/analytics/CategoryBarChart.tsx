import { useMemo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import type { Expense, GroupMember } from "@/lib/types";
import { aggregateByCategory, aggregateByCategoryAndMember } from "@/lib/categoryUtils";
import type { SelectedCategory } from "./CategoryDrillDown";

export interface CategoryBarChartProps {
  expenses: Expense[];
  members?: GroupMember[];
  showAll?: boolean;
  stacked?: boolean;
  onCategoryClick?: (category: SelectedCategory) => void;
}

// Category data shape from aggregation
interface CategoryAggregation {
  categoryId: string;
  categoryName: string;
  icon: string;
  amount: number;
  [key: string]: string | number; // For dynamic member user_id keys in stacked mode
}

// Recharts tooltip payload entry
interface TooltipPayloadEntry {
  payload: CategoryAggregation;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  stacked?: boolean;
  members?: GroupMember[];
}

// Custom tooltip with refined styling matching TrendChart
const CustomTooltip = ({ active, payload, stacked, members }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  // For stacked mode, show breakdown per member
  if (stacked && members) {
    const total = members.reduce((sum: number, member: GroupMember) => sum + (data[member.user_id] || 0), 0);

    return (
      <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-label-mono font-medium">{data.categoryName}</p>
        </div>
        <div className="space-y-1">
          {members.map((member: GroupMember) => {
            const amount = data[member.user_id] || 0;
            if (amount === 0) return null;
            return (
              <div key={member.user_id} className="flex items-center justify-between gap-4">
                <span className="text-caption">{member.name}</span>
                <span className="text-number-sm font-medium">
                  {amount.toLocaleString('sv-SE')} kr
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-border/40">
          <span className="text-caption font-medium">Totalt</span>
          <span className="text-number font-semibold">
            {total.toLocaleString('sv-SE')} kr
          </span>
        </div>
      </div>
    );
  }

  // For simple mode, show single amount
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

// Custom legend for stacked mode
const CustomLegend = ({ members }: { members: GroupMember[] }) => {
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap mt-3">
      {members.map((member, idx) => (
        <div key={member.user_id} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `hsl(var(--chart-${idx + 1}))` }}
          />
          <span className="text-caption">{member.name}</span>
        </div>
      ))}
    </div>
  );
};

export function CategoryBarChart({ expenses, members, showAll = false, stacked = false, onCategoryClick }: CategoryBarChartProps) {
  // Aggregate expenses by category with useMemo for performance
  const categoryData = useMemo(() => {
    return aggregateByCategory(expenses);
  }, [expenses]);

  // Bar click event data from Recharts
  interface BarClickData {
    categoryId?: string;
    categoryName?: string;
    icon?: string;
    payload?: {
      categoryId?: string;
      categoryName?: string;
      icon?: string;
    };
  }

  // Handle bar click to trigger drill-down
  const handleBarClick = (data: BarClickData) => {
    if (!onCategoryClick) return;

    // Extract from payload (Recharts wraps data in payload for click events)
    const categoryId = data.categoryId || data.payload?.categoryId;
    const categoryName = data.categoryName || data.payload?.categoryName;
    const icon = data.icon || data.payload?.icon;

    if (categoryId) {
      onCategoryClick({
        id: categoryId,
        name: categoryName,
        icon: icon || '',
      });
    }
  };

  // Stacked data for member breakdown
  const stackedData = useMemo(
    () => stacked && members ? aggregateByCategoryAndMember(expenses, members) : [],
    [expenses, members, stacked]
  );

  // Create chart config based on mode
  const chartConfig = useMemo(() => {
    if (stacked && members) {
      return members.reduce((config, member, idx) => ({
        ...config,
        [member.user_id]: {
          label: member.name,
          color: `hsl(var(--chart-${idx + 1}))`,
        },
      }), {} as ChartConfig);
    }
    return {
      amount: {
        label: "Belopp",
        color: "hsl(var(--chart-1))",
      },
    } satisfies ChartConfig;
  }, [stacked, members]);

  // Apply top 8 slice unless showAll is true
  const displayData = showAll
    ? (stacked ? stackedData : categoryData)
    : (stacked ? stackedData.slice(0, 8) : categoryData.slice(0, 8));

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
            content={<CustomTooltip stacked={stacked} members={members} />}
            cursor={{
              fill: "hsl(var(--muted))",
              opacity: 0.1,
            }}
          />

          {stacked && members ? (
            <>
              {members.map((member, idx) => (
                <Bar
                  key={member.user_id}
                  dataKey={member.user_id}
                  stackId="members"
                  fill={`hsl(var(--chart-${idx + 1}))`}
                  name={member.name}
                  radius={idx === members.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                  onClick={handleBarClick}
                  cursor="pointer"
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </>
          ) : (
            <Bar
              dataKey="amount"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              onClick={handleBarClick}
              cursor="pointer"
              style={{ cursor: 'pointer' }}
            />
          )}

          {stacked && members && <Legend content={<CustomLegend members={members} />} />}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

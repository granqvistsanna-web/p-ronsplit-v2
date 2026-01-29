import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import type { Expense } from "@/lib/types";

interface CategoryData {
  category: string;
  amount: number;
  expenses: Expense[];
}

interface CategoryDonutProps {
  data: CategoryData[];
  totalExpenses: number;
}

// Sophisticated color palette - warm neutrals with accent pops
const CATEGORY_COLORS = [
  "hsl(0 0% 20%)",      // Charcoal - primary
  "hsl(0 0% 35%)",      // Dark gray
  "hsl(0 0% 50%)",      // Medium gray
  "hsl(0 0% 65%)",      // Light gray
  "hsl(0 0% 78%)",      // Lighter gray
  "hsl(40 6% 70%)",     // Warm gray
  "hsl(0 72% 51%)",     // Accent red (expense color)
  "hsl(330 68% 50%)",   // Pink accent
];

const chartConfig = {
  amount: {
    label: "Belopp",
  },
} satisfies ChartConfig;

// Chart data with computed fields
interface ChartDataItem extends CategoryData {
  percentage: number;
  fill: string;
}

// Recharts tooltip payload entry
interface TooltipPayloadEntry {
  payload: ChartDataItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg min-w-[140px]">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: data.fill }}
        />
        <span className="text-sm font-medium text-foreground">
          {data.category}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-caption">Belopp</span>
          <span className="text-number font-semibold">
            {data.amount.toLocaleString("sv-SE")} kr
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-caption">Andel</span>
          <span className="text-number font-medium text-muted-foreground">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Props for active shape rendering (from Recharts Sector)
interface ActiveShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: ChartDataItem;
  percent: number;
}

// Active shape for hover effect
const renderActiveShape = (props: ActiveShapeProps) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))",
          transition: "all 0.2s ease-out",
        }}
      />
      {/* Inner ring highlight */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.3}
      />
    </g>
  );
};

export function CategoryDonut({ data, totalExpenses }: CategoryDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Add percentage and color to data
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [data, totalExpenses]);

  // Get the largest category for center display
  const largestCategory = chartData[0];

  if (!data.length || totalExpenses === 0) {
    return null;
  }

  return (
    <div className="relative">
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  style={{
                    transition: "all 0.2s ease-out",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Center content - shows total or hovered category */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {activeIndex !== undefined ? (
            <>
              <p className="text-number-lg font-semibold text-foreground">
                {chartData[activeIndex].percentage.toFixed(0)}%
              </p>
              <p className="text-caption mt-0.5 max-w-[100px] truncate">
                {chartData[activeIndex].category}
              </p>
            </>
          ) : (
            <>
              <p className="text-number-lg font-semibold text-foreground">
                {totalExpenses.toLocaleString("sv-SE")}
              </p>
              <p className="text-caption mt-0.5">kr totalt</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Legend component to show category breakdown
export function CategoryLegend({ data, totalExpenses }: CategoryDonutProps) {
  const chartData = useMemo(() => {
    return data.slice(0, 6).map((item, index) => ({
      ...item,
      percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [data, totalExpenses]);

  const othersCount = data.length - 6;
  const othersAmount = data.slice(6).reduce((sum, item) => sum + item.amount, 0);
  const othersPercentage = totalExpenses > 0 ? (othersAmount / totalExpenses) * 100 : 0;

  return (
    <div className="space-y-2">
      {chartData.map((item, index) => (
        <div
          key={item.category}
          className="flex items-center justify-between group hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-sm text-foreground truncate">
              {item.category}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-number-sm text-muted-foreground">
              {item.percentage.toFixed(0)}%
            </span>
            <span className="text-number-sm font-medium text-foreground min-w-[70px] text-right">
              {item.amount.toLocaleString("sv-SE")} kr
            </span>
          </div>
        </div>
      ))}

      {othersCount > 0 && (
        <div className="flex items-center justify-between px-2 py-1.5 -mx-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-muted flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              +{othersCount} andra
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-number-sm text-muted-foreground">
              {othersPercentage.toFixed(0)}%
            </span>
            <span className="text-number-sm text-muted-foreground min-w-[70px] text-right">
              {othersAmount.toLocaleString("sv-SE")} kr
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

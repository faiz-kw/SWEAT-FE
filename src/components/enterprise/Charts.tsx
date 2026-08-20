import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = {
  stroke: "var(--color-border-strong)",
  tick: { fill: "var(--color-muted-foreground)", fontSize: 11 },
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    fontSize: 12,
    padding: "6px 8px",
  },
  labelStyle: { fontSize: 11, color: "var(--color-muted-foreground)" },
};

export function TrendChart({
  data,
  xKey,
  series,
  height = 200,
  type = "area",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  type?: "area" | "line";
}) {
  const Chart = type === "area" ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} tickLine={false} />
        <YAxis {...AXIS} tickLine={false} width={52} />
        <Tooltip {...TOOLTIP_STYLE} />
        {series.map((s) =>
          type === "area" ? (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.12}
              strokeWidth={1.8}
              type="monotone"
            />
          ) : (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.8}
              dot={false}
              type="monotone"
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({
  data,
  xKey,
  series,
  height = 200,
  layout = "vertical",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  const horizontal = layout === "horizontal";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 12, bottom: 0, left: horizontal ? 24 : -12 }}
        barSize={horizontal ? 12 : 18}
      >
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS} tickLine={false} />
            <YAxis type="category" dataKey={xKey} {...AXIS} tickLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...AXIS} tickLine={false} />
            <YAxis {...AXIS} tickLine={false} width={44} />
          </>
        )}
        <Tooltip {...TOOLTIP_STYLE} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={2} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 200,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const colors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
    "var(--color-border-strong)",
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" strokeWidth={1}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} stroke="var(--color-surface)" />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.stage} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{d.stage}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
            <div
              className="flex h-full items-center justify-end rounded-sm bg-primary/85 px-1"
              style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }}
            >
              <span className="num text-[10px] font-semibold text-primary-foreground">{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

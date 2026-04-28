import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { Deck } from "@/types";
import { getActivityLog, type ActivityLog } from "@/lib/storage";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityEntry {
  date: Date;
  count: number; // minutes active
}

interface DashboardProps {
  decks: Deck[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_CLASSES = [
  "bg-muted/40 hover:bg-muted/70",          // 0 – none
  "bg-primary/25 hover:bg-primary/40",      // 1 – low
  "bg-primary/50 hover:bg-primary/65",      // 2 – medium
  "bg-primary/75 hover:bg-primary/85",      // 3 – high
  "bg-primary text-primary-foreground shadow-sm", // 4 – max
];

function toLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes <= 15) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 60) return 3;
  return 4;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Weekly bar chart data ───────────────────────────────────────────────────

function buildWeeklyData(activity: ActivityEntry[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const minutes = Array(7).fill(0);
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setHours(0, 0, 0, 0);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  activity.forEach(({ date, count }) => {
    if (date >= fourWeeksAgo) minutes[date.getDay()] += count;
  });
  return days.map((name, i) => ({ name, minutes: minutes[i] }));
}

// ─── CalendarGrid ────────────────────────────────────────────────────────────

function CalendarGrid({
  monthDate,
  activity,
}: {
  monthDate: Date;
  activity: ActivityEntry[];
}) {
  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const firstDow = new Date(year, month, 1).getDay();

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - firstDow + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-1 md:gap-1.5">
      {DAY_LABELS.map((l) => (
        <div
          key={l}
          className="text-[9px] text-muted-foreground/50 font-semibold uppercase text-center pb-0.5"
        >
          {l}
        </div>
      ))}
      {cells.map((date, i) => {
        const inMonth = date.getMonth() === month;
        const entry = activity.find((a) => sameDay(a.date, date));
        const level = inMonth ? toLevel(entry?.count ?? 0) : -1;
        return (
          <div
            key={i}
            title={
              inMonth && entry
                ? `${date.toLocaleDateString()}: ${entry.count}m active`
                : undefined
            }
            className={cn(
              "aspect-square rounded-md transition-colors",
              level === -1 && "invisible",
              level >= 0 && LEVEL_CLASSES[level]
            )}
          />
        );
      })}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <Card className="rounded-2xl border-border shadow-none hover:bg-accent/40 transition-colors">
      <CardContent className="p-4 md:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          {trend && (
            <Badge variant="secondary" className="text-[10px] font-semibold">
              {trend}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl md:text-3xl font-bold tracking-tight leading-none">
            {value}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

const chartConfig = {
  minutes: {
    label: "Minutes active",
    color: "hsl(var(--primary))",
  },
};

export function Dashboard({ decks }: DashboardProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [numMonths, setNumMonths] = useState(1);
  const [activityMap, setActivityMap] = useState<ActivityLog>({});

  useEffect(() => {
    getActivityLog().then(setActivityMap).catch(console.error);
  }, []);

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      if (w < 768) setNumMonths(1);
      else if (w < 1280) setNumMonths(2);
      else setNumMonths(3);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // ─── Derived stats ─────────────────────────────────────────────────────────
  const activeDecks = decks.filter((d) => !d.isFolder && !d.isTrashed);
  const totalCards = activeDecks.reduce((s, d) => s + d.cards.length, 0);
  const totalFolders = decks.filter((d) => d.isFolder && !d.isTrashed).length;

  const activity = useMemo(() => {
    return Object.entries(activityMap).map(([k, count]) => ({
      date: new Date(k),
      count,
    }));
  }, [activityMap]);
  const weeklyData = useMemo(() => buildWeeklyData(activity), [activity]);

  // Streak: consecutive days from today going back
  const streak = useMemo(() => {
    let s = 0;
    const cursor = new Date(today);
    while (true) {
      const found = activity.some((a) => sameDay(a.date, cursor));
      if (!found) break;
      s++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return s;
  }, [activity]);

  const monthsToShow = useMemo(
    () =>
      Array.from({ length: numMonths }, (_, i) => {
        const d = new Date(viewDate);
        d.setMonth(viewDate.getMonth() - (numMonths - 1) + i);
        return d;
      }),
    [viewDate, numMonths]
  );

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };
  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto overflow-x-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-20">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4 mx-1" />
        <span className="text-sm font-semibold tracking-tight">Dashboard</span>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-6 md:gap-8">

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Total Cards"
            value={String(totalCards)}
            icon={<FileText className="size-4" />}
            trend={totalCards > 0 ? `+${totalCards}` : undefined}
          />
          <StatCard
            label="Active Decks"
            value={String(activeDecks.length)}
            icon={<BookOpen className="size-4" />}
          />
          <StatCard
            label="Folders"
            value={String(totalFolders)}
            icon={<Layers className="size-4" />}
          />
          <StatCard
            label="Day Streak"
            value={streak > 0 ? `${streak}d` : "—"}
            icon={<Flame className="size-4" />}
            trend={streak >= 3 ? "🔥" : undefined}
          />
        </section>

        {/* ── Weekly Activity Chart ── */}
        <section>
          <Card className="rounded-2xl border-border shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Active minutes per weekday over the last 4 weeks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    barSize={22}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="minutes"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* ── Heatmap ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Learning Consistency</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-24 text-center tabular-nums">
                {monthsToShow[0].toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                {numMonths > 1 &&
                  ` – ${monthsToShow[numMonths - 1].toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
              </span>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border-border shadow-none">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-center gap-8 lg:gap-14">
                {monthsToShow.map((md, idx) => (
                  <div key={idx} className="flex flex-col gap-3 w-full md:w-auto">
                    <p className="text-xs text-center text-muted-foreground font-medium capitalize">
                      {md.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                    <CalendarGrid monthDate={md} activity={activity} />
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                <span>Less</span>
                <div className="flex gap-1">
                  {LEVEL_CLASSES.slice(0, 4).map((cls, i) => (
                    <div key={i} className={cn("size-3 rounded-sm", cls.split(" ")[0])} />
                  ))}
                  <div className="size-3 rounded-sm bg-primary" />
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}

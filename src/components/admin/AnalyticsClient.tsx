"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import {
  Users, Activity, ClipboardList, Award, TrendingUp, Sparkles,
  ArrowDownRight, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  range: { days: number; since: string };
  summary: {
    totalUsers: number; newUsers: number; totalEvents: number; eventsInRange: number;
    activeUsers: number; enrollments: number; completions: number; certificates: number;
  };
  funnel: { registered: number; visited_courses: number; viewed_a_course: number; enrolled: number; completed: number };
  eventNames: Array<{ name: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  roles: Array<{ role: string; count: number }>;
  themes: Array<{ theme: string; count: number }>;
  topPaths: Array<{ path: string; views: number; users: number }>;
  topCourses: Array<{ courseId: string; title: string; views: number; enrolls: number }>;
  userGrowth: Array<{ day: string; n: number }>;
  activity: Array<{ day: string; views: number; users: number }>;
}

const PIE_COLORS = ["#2a4fdb", "#10b981", "#f97316", "#8b5cf6", "#06b6d4", "#d35a78", "#fbbf24", "#475569"];

function fmt(n: number): string {
  return n.toLocaleString();
}
function shortDate(s: unknown) {
  if (s == null) return "";
  const d = new Date(s as string | number);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AnalyticsClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(d = days) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      if (!res.ok) throw new Error("Request failed");
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  if (!data && !error) {
    return <div className="text-center py-16 text-muted text-sm">Loading analytics…</div>;
  }
  if (error) return <div className="text-rose-600 text-sm">{error}</div>;
  if (!data) return null;

  // Funnel rendering
  const funnelSteps: Array<{ key: keyof AnalyticsData["funnel"]; label: string }> = [
    { key: "registered",      label: "Registered" },
    { key: "visited_courses", label: "Visited catalog" },
    { key: "viewed_a_course", label: "Viewed a course" },
    { key: "enrolled",        label: "Enrolled" },
    { key: "completed",       label: "Completed" },
  ];
  const funnelMax = Math.max(...funnelSteps.map((s) => data.funnel[s.key]), 1);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-subtle uppercase tracking-wider">
            Window: last {data.range.days} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </Select>
          <button
            onClick={() => load()}
            disabled={loading}
            className="p-2 rounded-lg text-muted hover:bg-elevated hover:text-fg transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total users",     value: data.summary.totalUsers,    sub: `+${data.summary.newUsers} new`,             icon: Users,         tone: "brand" },
          { label: "Active users",    value: data.summary.activeUsers,   sub: "in window",                                  icon: Activity,      tone: "emerald" },
          { label: "Enrollments",     value: data.summary.enrollments,   sub: `${data.summary.completions} completed`,      icon: ClipboardList, tone: "violet" },
          { label: "Certificates",    value: data.summary.certificates,  sub: "issued",                                     icon: Award,         tone: "amber" },
        ].map((k) => {
          const Icon = k.icon;
          const tones: Record<string, string> = {
            brand:   "bg-brand-50 text-brand-600",
            emerald: "bg-emerald-50 text-emerald-600",
            violet:  "bg-violet-50 text-violet-600",
            amber:   "bg-amber-50 text-amber-600",
          };
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("inline-flex p-2 rounded-lg", tones[k.tone])}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-fg">{fmt(k.value)}</p>
              <p className="text-xs text-muted mt-0.5">{k.label}</p>
              <p className="text-[11px] text-subtle mt-1">{k.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* User growth + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-fg flex items-center gap-2"><TrendingUp size={16} className="text-brand-600" /> User growth</h3>
              <p className="text-xs text-subtle mt-0.5">Daily new sign-ups</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
              +{data.summary.newUsers}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.userGrowth}>
              <defs>
                <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#2a4fdb" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2a4fdb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} fontSize={11} stroke="var(--fg-subtle)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--fg-subtle)" />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={shortDate}
              />
              <Area type="monotone" dataKey="n" name="New users" stroke="#2a4fdb" strokeWidth={2} fill="url(#grad-users)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-fg flex items-center gap-2"><Activity size={16} className="text-emerald-600" /> Daily activity</h3>
              <p className="text-xs text-subtle mt-0.5">Page views and unique users per day</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} fontSize={11} stroke="var(--fg-subtle)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--fg-subtle)" />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={shortDate}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="views" name="Page views" stroke="#2a4fdb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="users" name="Unique users" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Funnel + Top paths */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-semibold text-fg flex items-center gap-2 mb-4">
            <ArrowDownRight size={16} className="text-violet-600" /> Conversion funnel
          </h3>
          <div className="space-y-2.5">
            {funnelSteps.map((step, i) => {
              const v = data.funnel[step.key];
              const w = (v / funnelMax) * 100;
              const prev = i > 0 ? data.funnel[funnelSteps[i - 1].key] : null;
              const dropOff = prev != null && prev > 0 ? Math.round(((prev - v) / prev) * 100) : null;
              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">{step.label}</span>
                    <span className="text-fg font-semibold">
                      {fmt(v)}{" "}
                      {dropOff !== null && (
                        <span className="text-subtle font-normal ml-1">({dropOff > 0 ? "−" : "+"}{Math.abs(dropOff)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-700 rounded-full transition-all"
                      style={{ width: `${Math.max(w, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-fg mb-3">Top pages</h3>
          {data.topPaths.length === 0 ? (
            <p className="text-sm text-subtle py-8 text-center">No page views yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-subtle uppercase tracking-wide border-b border-line">
                  <th className="text-left py-2">Path</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.topPaths.map((p) => (
                  <tr key={p.path} className="hover:bg-elevated/50">
                    <td className="py-2 font-mono text-xs text-fg truncate max-w-[300px]">{p.path}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{fmt(p.views)}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{fmt(p.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Top courses + Event names */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-fg mb-3">Top courses</h3>
          {data.topCourses.length === 0 ? (
            <p className="text-sm text-subtle py-8 text-center">No course traffic yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-subtle uppercase tracking-wide border-b border-line">
                  <th className="text-left py-2">Course</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Enrolls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.topCourses.map((c) => (
                  <tr key={c.courseId} className="hover:bg-elevated/50">
                    <td className="py-2 text-fg truncate max-w-[280px]">{c.title}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{fmt(c.views)}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{fmt(c.enrolls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-fg mb-3">Top events</h3>
          {data.eventNames.length === 0 ? (
            <p className="text-sm text-subtle py-8 text-center">No events yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, data.eventNames.length * 26)}>
              <BarChart data={data.eventNames} layout="vertical" margin={{ left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="var(--fg-subtle)" />
                <YAxis type="category" dataKey="name" fontSize={11} stroke="var(--fg-subtle)" width={110} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#2a4fdb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Distribution donuts */}
      <div className="grid md:grid-cols-3 gap-4">
        <Donut title="Roles" data={data.roles.map((r) => ({ label: r.role, value: r.count }))} icon={Users} />
        <Donut title="Devices" data={data.devices.map((d) => ({ label: d.device, value: d.count }))} icon={Activity} />
        <Donut title="Themes selected" data={data.themes.map((t) => ({ label: t.theme, value: t.count }))} icon={Sparkles} empty="No theme changes recorded yet." />
      </div>

      {/* Footer note */}
      <p className="text-xs text-subtle text-center">
        Data refreshes on demand · {fmt(data.summary.eventsInRange)} events in this window ·
        {" "}{fmt(data.summary.totalEvents)} total tracked
      </p>
    </div>
  );
}

function Donut({
  title, data, icon: Icon, empty,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  icon: React.ElementType;
  empty?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-fg flex items-center gap-2 mb-3">
        <Icon size={16} className="text-brand-600" /> {title}
      </h3>
      {total === 0 ? (
        <p className="text-sm text-subtle py-8 text-center">{empty ?? "No data yet."}</p>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {data.slice(0, 6).map((d, i) => {
              const pct = Math.round((d.value / total) * 100);
              return (
                <div key={d.label} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-muted truncate">{d.label}</span>
                  <span className="tabular-nums text-fg font-medium">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

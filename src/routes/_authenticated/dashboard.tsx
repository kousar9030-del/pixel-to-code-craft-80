import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DEMO, hasRecords, successScore, toRiskInput, useStudentData } from "@/hooks/useStudentData";
import { predictRisk, recommendationsFor } from "@/lib/risk-model";
import { Card, DemoBanner, riskColor } from "@/components/DemoBanner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduSuccess AI" },
      { name: "description", content: "Your success score, SGPA trend, subject performance and early warnings." },
      { property: "og:title", content: "Dashboard — EduSuccess AI" },
      { property: "og:description", content: "Your academic overview at a glance." },
    ],
  }),
  component: Dashboard,
});

const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 } };

function Dashboard() {
  const { user } = useAuth();
  const q = useStudentData(user?.id);
  if (q.isLoading) return <p className="text-muted-foreground">Loading your data…</p>;
  if (q.error) return <p className="text-destructive">Couldn't load your data: {(q.error as Error).message}</p>;
  const d = q.data && hasRecords(q.data) ? q.data : { ...DEMO, activities: q.data?.activities ?? [] };
  const input = toRiskInput(d);
  const risk = predictRisk(input);
  const score = successScore(risk.probability, input);
  let cum = 0;
  const sgpaData = d.semesters.map((s, i) => ({ name: `Sem ${s.semester}`, SGPA: s.sgpa, CGPA: +((cum += s.sgpa) / (i + 1)).toFixed(2) }));
  const latestSem = Math.max(0, ...d.subjects.map((s) => s.semester));
  const subj = d.subjects.filter((s) => s.semester === latestSem).map((s) => ({ name: s.name, Marks: s.marks, Attendance: s.attendance }));
  const warnings = d.subjects.filter((s) => s.attendance < 75 || s.marks < 40 || s.is_backlog);

  return (
    <div className="mx-auto max-w-6xl">
      {d.isDemo && <DemoBanner />}
      <h1 className="text-3xl font-semibold">Hi {d.profile?.full_name || "there"} 👋</h1>
      <p className="mb-8 text-muted-foreground">Here's where you stand right now.</p>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <p className="text-sm text-muted-foreground">Success score</p>
          <p className="mt-2 font-display text-5xl font-semibold text-brand">{score}</p>
          <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Academic risk</p>
          <p className={`mt-2 font-display text-3xl font-semibold ${riskColor(risk.level)}`}>{risk.level}</p>
          <p className="mt-1 text-xs text-muted-foreground">{(risk.probability * 100).toFixed(0)}% model probability</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">CGPA</p>
          <p className="mt-2 font-display text-3xl font-semibold">{input.cgpa ? input.cgpa.toFixed(2) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">avg of {d.semesters.length} semesters</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Backlogs · Attendance</p>
          <p className="mt-2 font-display text-3xl font-semibold">{input.backlogs} · {input.attendance.toFixed(0)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">latest semester</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="SGPA & CGPA by semester">
          {sgpaData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sgpaData}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip {...tip} /><Legend />
                <Area dataKey="SGPA" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area dataKey="CGPA" stroke="var(--chart-2)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty text="Add semester SGPAs in your profile to see this chart." />}
        </Card>
        <Card title={`Subject marks & attendance (Sem ${latestSem || "—"})`}>
          {subj.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subj}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip {...tip} /><Legend />
                <Bar dataKey="Marks" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Attendance" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Add subjects in your profile to see this chart." />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card title="Early warnings">
          {warnings.length ? (
            <ul className="space-y-2 text-sm">
              {warnings.map((w) => (
                <li key={w.name + w.semester} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span><b>{w.name}</b>: {w.is_backlog ? "backlog" : w.marks < 40 ? `marks ${w.marks}` : `attendance ${w.attendance}%`}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-success">No warnings. Keep it up!</p>}
        </Card>
        <Card title="Suggestions for you">
          <ul className="space-y-2 text-sm">
            {recommendationsFor(input).slice(0, 3).map((r) => <li key={r} className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />{r}</li>)}
          </ul>
          <Link to="/risk" className="mt-3 inline-block text-sm text-accent hover:underline">See full risk analysis →</Link>
        </Card>
        <Card title="Recent activity">
          {d.activities.length ? (
            <ul className="space-y-2 text-sm">
              {d.activities.map((a) => <li key={a.id ?? a.created_at} className="flex justify-between gap-2"><span>{a.title}</span><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span></li>)}
            </ul>
          ) : <Empty text="Use an AI agent or update your records — activity shows up here." />}
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

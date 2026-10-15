import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DEMO, hasRecords, toRiskInput, useStudentData } from "@/hooks/useStudentData";
import { getModel, predictRisk, recommendationsFor, RISK_EXPLANATIONS, type RiskInput } from "@/lib/risk-model";
import { Card, DemoBanner, riskColor } from "@/components/DemoBanner";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({
    meta: [
      { title: "Risk Prediction — EduSuccess AI" },
      { name: "description", content: "Machine-learning academic risk prediction with factors, recommendations and a what-if simulator." },
      { property: "og:title", content: "Risk Prediction — EduSuccess AI" },
      { property: "og:description", content: "See your academic risk and what would change it." },
    ],
  }),
  component: RiskPage,
});

function RiskPage() {
  const { user } = useAuth();
  const q = useStudentData(user?.id);
  const d = q.data && hasRecords(q.data) ? q.data : DEMO;
  const base = useMemo(() => toRiskInput(d), [d]);
  const [sim, setSim] = useState<RiskInput>(base);
  useEffect(() => setSim(base), [base]);
  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const risk = predictRisk(base);
  const simRisk = predictRisk(sim);
  const m = getModel().metrics;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <div className="mx-auto max-w-6xl">
      {d.isDemo && <DemoBanner />}
      <h1 className="text-3xl font-semibold">Academic risk prediction</h1>
      <p className="mb-8 text-muted-foreground">A logistic-regression model estimates your chance of falling behind next semester.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <p className="text-sm text-muted-foreground">Predicted risk</p>
          <p className={`mt-2 font-display text-5xl font-semibold ${riskColor(risk.level)}`}>{risk.level}</p>
          <p className="mt-1 text-sm text-muted-foreground">{pct(risk.probability)} probability</p>
          <p className="mt-4 text-sm">{RISK_EXPLANATIONS[risk.level]}</p>
        </Card>
        <Card title="What's driving this" className="md:col-span-2">
          <div className="space-y-3">
            {risk.factors.map((f) => {
              const w = Math.min(100, Math.abs(f.contribution) * 35);
              const bad = f.contribution > 0;
              return (
                <div key={f.key} className="text-sm">
                  <div className="mb-1 flex justify-between"><span>{f.label} <span className="text-muted-foreground">({f.value.toFixed(f.key === "backlogs" ? 0 : 1)})</span></span>
                    <span className={bad ? "text-destructive" : "text-success"}>{bad ? "raises risk" : "lowers risk"}</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${bad ? "bg-destructive" : "bg-success"}`} style={{ width: `${w}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="What-if simulator">
          <div className="space-y-5">
            <SimRow label="Average marks" v={sim.avgMarks} min={0} max={100} on={(v) => setSim({ ...sim, avgMarks: v })} />
            <SimRow label="Attendance %" v={sim.attendance} min={0} max={100} on={(v) => setSim({ ...sim, attendance: v })} />
            <SimRow label="Backlogs" v={sim.backlogs} min={0} max={8} on={(v) => setSim({ ...sim, backlogs: v })} />
            <SimRow label="CGPA" v={sim.cgpa} min={0} max={10} step={0.1} on={(v) => setSim({ ...sim, cgpa: v })} />
          </div>
          <div className="mt-6 rounded-xl bg-secondary p-4 text-sm">
            New prediction: <b className={riskColor(simRisk.level)}>{simRisk.level}</b> ({pct(simRisk.probability)})
            {" · "}change: <b>{((simRisk.probability - risk.probability) * 100).toFixed(1)} pts</b>
          </div>
        </Card>
        <Card title="Your action plan">
          <ol className="list-decimal space-y-2 pl-5 text-sm">{recommendationsFor(base).map((r) => <li key={r}>{r}</li>)}</ol>
        </Card>
      </div>

      <Card title="Model evaluation (honest disclosure)" className="mt-4">
        <p className="mb-4 text-sm text-muted-foreground">
          No real student outcome dataset is available, so the model is trained on <b>{m.trainSize + m.testSize} synthetic student records</b> generated
          from plausible academic patterns. The scores below are measured on a held-out test set of {m.testSize} synthetic records — they show the model
          learned those patterns, <b>not</b> its accuracy on real students. Retrain on real institutional data before relying on it.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[["Accuracy", m.accuracy], ["Precision", m.precision], ["Recall", m.recall], ["F1 score", m.f1], ["ROC-AUC", m.rocAuc]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-xl font-semibold">{pct(v as number)}</p></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SimRow({ label, v, min, max, step = 1, on }: { label: string; v: number; min: number; max: number; step?: number; on: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="text-accent">{v.toFixed(step < 1 ? 1 : 0)}</span></div>
      <Slider value={[v]} min={min} max={max} step={step} onValueChange={([x]) => on(x)} />
    </div>
  );
}

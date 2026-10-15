import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ShieldAlert, Route as RouteIcon, Sparkles as _s, BarChart3, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENTS } from "@/lib/agents";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduSuccess AI — Predict Early. Support Smart. Succeed Together." },
      { name: "description", content: "AI-powered student success platform: early academic risk prediction, six AI study agents, and placement coaching." },
      { property: "og:title", content: "EduSuccess AI" },
      { property: "og:description", content: "Predict Early. Support Smart. Succeed Together." },
    ],
  }),
  component: Landing,
});
void _s;

const FEATURES = [
  { icon: ShieldAlert, title: "Early risk warning", text: "A machine-learning model flags academic risk from marks, attendance and backlogs — before results day." },
  { icon: Brain, title: "Six AI agents", text: "Tutor, question generator, evaluator, backlog coach, progress analyst and placement coach." },
  { icon: BarChart3, title: "Clear analytics", text: "SGPA trends, subject marks and attendance in one dashboard built from your own records." },
  { icon: Briefcase, title: "Placement ready", text: "Aptitude, coding, resume and interview prep tailored to your goals." },
];

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <div className="grid size-8 place-items-center rounded-lg bg-brand"><RouteIcon className="size-4" /></div>
          EduSuccess <span className="text-brand">AI</span>
        </div>
        <Button asChild variant="glass" size="sm">
          <Link to={user ? "/dashboard" : "/auth"}>{user ? "Open dashboard" : "Sign in"}</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center animate-rise">
        <p className="mb-5 inline-block rounded-full border border-border px-4 py-1 text-xs uppercase tracking-widest text-accent">Student success platform</p>
        <h1 className="text-5xl font-semibold leading-tight md:text-7xl">
          Predict Early.<br /><span className="text-brand">Support Smart.</span><br />Succeed Together.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Spot academic problems before they become backlogs, get a personal AI study team, and walk into placements prepared.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild variant="hero" size="lg"><Link to={user ? "/dashboard" : "/auth"}>Get started free</Link></Button>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6">
            <f.icon className="mb-4 size-6 text-accent" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-2xl font-semibold">Meet your AI study team</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {AGENTS.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><a.icon className="size-5 text-accent" /></div>
              <div><p className="font-medium">{a.name}</p><p className="text-sm text-muted-foreground">{a.tagline}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

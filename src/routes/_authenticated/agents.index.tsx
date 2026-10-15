import { createFileRoute, Link } from "@tanstack/react-router";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/agents/")({
  head: () => ({
    meta: [
      { title: "AI Agents — EduSuccess AI" },
      { name: "description", content: "Six AI agents for backlogs, tutoring, practice questions, evaluation, progress and placements." },
      { property: "og:title", content: "AI Agents — EduSuccess AI" },
      { property: "og:description", content: "Your personal AI study team." },
    ],
  }),
  component: Agents,
});

function Agents() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-semibold">Your AI study team</h1>
      <p className="mb-8 text-muted-foreground">Pick an agent. Each one is focused on a single job.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((a) => (
          <Link key={a.id} to="/agents/$agentId" params={{ agentId: a.id }} className="glass group rounded-2xl p-6 transition-transform hover:-translate-y-1 animate-rise">
            <div className="mb-4 grid size-12 place-items-center rounded-xl bg-brand shadow-glow"><a.icon className="size-6" /></div>
            <h3 className="font-semibold">{a.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.tagline}</p>
            {a.usesStudentData && <p className="mt-3 text-xs text-accent">Uses your saved records</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

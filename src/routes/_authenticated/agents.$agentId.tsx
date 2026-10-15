import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAgent } from "@/lib/agents";
import { runAgent } from "@/lib/agents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/agents/$agentId")({
  loader: ({ params }) => {
    const a = getAgent(params.agentId);
    if (!a) throw notFound();
    return { name: a.name, tagline: a.tagline };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Agent"} — EduSuccess AI` },
      { name: "description", content: loaderData?.tagline ?? "AI study agent" },
      { property: "og:title", content: `${loaderData?.name ?? "Agent"} — EduSuccess AI` },
      { property: "og:description", content: loaderData?.tagline ?? "AI study agent" },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const { agentId } = Route.useParams();
  const agent = getAgent(agentId)!;
  const run = useServerFn(runAgent);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = agent.fields.find((f) => f.required && !inputs[f.name]?.trim());
    if (missing) return setErr(`Please fill in "${missing.label}".`);
    setErr("");
    setOut("");
    setBusy(true);
    try {
      const r = await run({ data: { agentId: agent.id, inputs } });
      if (r.ok) setOut(r.text);
      else setErr(r.error);
    } catch {
      setErr("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div key={agentId} className="mx-auto max-w-5xl">
      <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All agents</Link>
      <div className="mb-8 flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand shadow-glow"><agent.icon className="size-7" /></div>
        <div><h1 className="text-3xl font-semibold">{agent.name}</h1><p className="text-muted-foreground">{agent.tagline}</p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6 lg:col-span-2">
          {agent.fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea rows={5} placeholder={f.placeholder} value={inputs[f.name] ?? ""} onChange={(e) => setInputs({ ...inputs, [f.name]: e.target.value })} />
              ) : f.type === "select" ? (
                <Select value={inputs[f.name] ?? ""} onValueChange={(v) => setInputs({ ...inputs, [f.name]: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input placeholder={f.placeholder} value={inputs[f.name] ?? ""} onChange={(e) => setInputs({ ...inputs, [f.name]: e.target.value })} />
              )}
            </div>
          ))}
          {agent.usesStudentData && <p className="text-xs text-muted-foreground">This agent also reads your saved profile and records.</p>}
          {err && <p className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">{err}</p>}
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? <><Loader2 className="animate-spin" /> Thinking…</> : "Ask agent"}
          </Button>
        </form>
        <div className="glass min-h-[300px] rounded-2xl p-6 lg:col-span-3">
          {busy ? (
            <div className="space-y-3">{[80, 95, 70, 88, 60].map((w, i) => <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}</div>
          ) : out ? (
            <>
              <div className="mb-2 flex justify-end"><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(out); toast.success("Copied"); }}><Copy /> Copy</Button></div>
              <div className="prose-agent text-sm leading-relaxed"><ReactMarkdown>{out}</ReactMarkdown></div>
            </>
          ) : (
            <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">Fill in the form and the response will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

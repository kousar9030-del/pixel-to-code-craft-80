import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { Card } from "@/components/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Records — EduSuccess AI" },
      { name: "description", content: "Manage your academic profile, semester SGPAs, subjects, marks and attendance." },
      { property: "og:title", content: "Profile & Records — EduSuccess AI" },
      { property: "og:description", content: "Your private academic records." },
    ],
  }),
  component: Profile,
});

const num = (v: string, min: number, max: number) => {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useStudentData(user?.id);
  const refresh = () => qc.invalidateQueries({ queryKey: ["student", user?.id] });
  const log = (title: string) => supabase.from("activities").insert({ user_id: user!.id, kind: "record", title });

  const [p, setP] = useState({ full_name: "", college: "", branch: "", current_semester: "1", active_backlogs: "0", overall_attendance: "0", skills: "", placement_goal: "" });
  useEffect(() => {
    const x = q.data?.profile;
    if (x) setP({ full_name: x.full_name ?? "", college: x.college ?? "", branch: x.branch ?? "", current_semester: String(x.current_semester ?? 1), active_backlogs: String(x.active_backlogs ?? 0), overall_attendance: String(x.overall_attendance ?? 0), skills: (x.skills ?? []).join(", "), placement_goal: x.placement_goal ?? "" });
  }, [q.data?.profile]);

  async function saveProfile() {
    const sem = num(p.current_semester, 1, 12), bl = num(p.active_backlogs, 0, 50), att = num(p.overall_attendance, 0, 100);
    if (!p.full_name.trim()) return toast.error("Name is required");
    if (sem === null || bl === null || att === null) return toast.error("Semester 1–12, backlogs 0–50, attendance 0–100");
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, full_name: p.full_name.trim(), college: p.college.trim(), branch: p.branch.trim(), current_semester: sem, active_backlogs: bl, overall_attendance: att, skills: p.skills.split(",").map((s) => s.trim()).filter(Boolean), placement_goal: p.placement_goal.trim(), updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    await log("Updated profile");
    toast.success("Profile saved");
    refresh();
  }

  const [sem, setSem] = useState({ semester: "", sgpa: "" });
  async function addSem() {
    const s = num(sem.semester, 1, 12), g = num(sem.sgpa, 0, 10);
    if (s === null || g === null) return toast.error("Semester 1–12 and SGPA 0–10");
    const { error } = await supabase.from("semesters").upsert({ user_id: user!.id, semester: s, sgpa: g }, { onConflict: "user_id,semester" });
    if (error) return toast.error(error.message);
    await log(`Saved SGPA for semester ${s}`);
    setSem({ semester: "", sgpa: "" });
    refresh();
  }

  const [sub, setSub] = useState({ semester: "", name: "", marks: "", attendance: "", is_backlog: false });
  async function addSub() {
    const s = num(sub.semester, 1, 12), m = num(sub.marks, 0, 100), a = num(sub.attendance, 0, 100);
    if (!sub.name.trim()) return toast.error("Subject name is required");
    if (s === null || m === null || a === null) return toast.error("Semester 1–12, marks and attendance 0–100");
    const { error } = await supabase.from("subjects").insert({ user_id: user!.id, semester: s, name: sub.name.trim(), marks: m, attendance: a, is_backlog: sub.is_backlog });
    if (error) return toast.error(error.message);
    await log(`Added subject ${sub.name.trim()}`);
    setSub({ semester: sub.semester, name: "", marks: "", attendance: "", is_backlog: false });
    refresh();
  }

  async function del(id: string) {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const field = (k: keyof typeof p, label: string, type = "text") => (
    <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} /></div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-3xl font-semibold">Profile & records</h1>
      <p className="text-muted-foreground">Only you can see these records. Everything on your dashboard comes from here.</p>

      <Card title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          {field("full_name", "Full name")}{field("college", "College")}{field("branch", "Branch")}{field("current_semester", "Current semester", "number")}
          {field("overall_attendance", "Overall attendance %", "number")}{field("active_backlogs", "Active backlogs", "number")}
          {field("skills", "Skills (comma separated)")}{field("placement_goal", "Placement goal")}
        </div>
        <Button variant="hero" className="mt-5" onClick={saveProfile}>Save profile</Button>
      </Card>

      <Card title="Semester SGPA">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5"><Label>Semester</Label><Input className="w-28" type="number" value={sem.semester} onChange={(e) => setSem({ ...sem, semester: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>SGPA</Label><Input className="w-28" type="number" step="0.01" value={sem.sgpa} onChange={(e) => setSem({ ...sem, sgpa: e.target.value })} /></div>
          <Button onClick={addSem}><Plus /> Save</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {q.data?.semesters.length ? q.data.semesters.map((s) => (
            <span key={s.semester} className="rounded-lg bg-secondary px-3 py-1.5 text-sm">Sem {s.semester}: <b>{s.sgpa}</b></span>
          )) : <p className="text-sm text-muted-foreground">No semesters yet.</p>}
        </div>
      </Card>

      <Card title="Subjects">
        <div className="grid items-end gap-3 md:grid-cols-6">
          <div className="space-y-1.5"><Label>Sem</Label><Input type="number" value={sub.semester} onChange={(e) => setSub({ ...sub, semester: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Subject</Label><Input value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Marks</Label><Input type="number" value={sub.marks} onChange={(e) => setSub({ ...sub, marks: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Attendance %</Label><Input type="number" value={sub.attendance} onChange={(e) => setSub({ ...sub, attendance: e.target.value })} /></div>
          <Button onClick={addSub}><Plus /> Add</Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={sub.is_backlog} onCheckedChange={(v) => setSub({ ...sub, is_backlog: !!v })} /> This subject is a backlog</label>
        <div className="mt-4 divide-y divide-border">
          {q.data?.subjects.length ? q.data.subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>Sem {s.semester} · <b>{s.name}</b> · {s.marks} marks · {s.attendance}% {s.is_backlog && <span className="ml-1 rounded bg-destructive/20 px-1.5 text-xs text-destructive">backlog</span>}</span>
              <Button size="icon" variant="ghost" aria-label="Delete subject" onClick={() => del(s.id!)}><Trash2 /></Button>
            </div>
          )) : <p className="text-sm text-muted-foreground">No subjects yet.</p>}
        </div>
      </Card>
    </div>
  );
}

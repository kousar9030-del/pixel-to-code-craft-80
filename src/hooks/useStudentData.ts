import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { RiskInput } from "@/lib/risk-model";

export type StudentData = {
  isDemo: boolean;
  profile: Partial<Tables<"profiles">> | null;
  semesters: { semester: number; sgpa: number }[];
  subjects: { id?: string; semester: number; name: string; marks: number; attendance: number; is_backlog: boolean }[];
  activities: { id?: string; title: string; created_at: string }[];
};

/** Clearly-labelled DEMO data shown only until the student saves their own records. */
export const DEMO: StudentData = {
  isDemo: true,
  profile: { full_name: "Demo Student", branch: "Computer Science", current_semester: 5, active_backlogs: 1, overall_attendance: 72 },
  semesters: [
    { semester: 1, sgpa: 7.8 },
    { semester: 2, sgpa: 7.4 },
    { semester: 3, sgpa: 7.1 },
    { semester: 4, sgpa: 6.6 },
  ],
  subjects: [
    { semester: 4, name: "Data Structures", marks: 71, attendance: 82, is_backlog: false },
    { semester: 4, name: "Discrete Maths", marks: 38, attendance: 61, is_backlog: true },
    { semester: 4, name: "DBMS", marks: 64, attendance: 75, is_backlog: false },
    { semester: 4, name: "Computer Networks", marks: 55, attendance: 68, is_backlog: false },
    { semester: 4, name: "OOP with Java", marks: 78, attendance: 80, is_backlog: false },
  ],
  activities: [],
};

export function useStudentData(userId: string | undefined) {
  return useQuery({
    queryKey: ["student", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StudentData> => {
      const [p, s, sub, a] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("semesters").select("semester,sgpa").order("semester"),
        supabase.from("subjects").select("*").order("semester"),
        supabase.from("activities").select("id,title,created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      const err = p.error || s.error || sub.error || a.error;
      if (err) throw err;
      return {
        isDemo: false,
        profile: p.data,
        semesters: (s.data ?? []).map((x) => ({ semester: x.semester, sgpa: Number(x.sgpa) })),
        subjects: (sub.data ?? []).map((x) => ({ ...x, marks: Number(x.marks), attendance: Number(x.attendance) })),
        activities: a.data ?? [],
      };
    },
  });
}

export function hasRecords(d: StudentData) {
  return d.semesters.length > 0 || d.subjects.length > 0;
}

export function toRiskInput(d: StudentData): RiskInput {
  const latestSem = Math.max(0, ...d.subjects.map((s) => s.semester));
  const latest = d.subjects.filter((s) => s.semester === latestSem);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : 0);
  const avgMarks = avg(latest.map((s) => s.marks));
  const attendance = latest.length ? avg(latest.map((s) => s.attendance)) : Number(d.profile?.overall_attendance ?? 0);
  const backlogs = Math.max(Number(d.profile?.active_backlogs ?? 0), d.subjects.filter((s) => s.is_backlog).length);
  const sg = d.semesters.map((s) => s.sgpa);
  const cgpa = avg(sg);
  const sgpaTrend = sg.length >= 2 ? sg[sg.length - 1] - sg[sg.length - 2] : 0;
  return { avgMarks, attendance, backlogs, cgpa, sgpaTrend };
}

/** Composite 0-100 success score from the risk probability and core indicators. */
export function successScore(riskProb: number, input: RiskInput) {
  return Math.round(0.5 * (1 - riskProb) * 100 + 0.2 * input.attendance + 0.2 * input.avgMarks + 0.1 * input.cgpa * 10);
}

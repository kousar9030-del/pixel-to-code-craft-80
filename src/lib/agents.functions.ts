import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM: Record<string, string> = {
  backlog:
    "You are the Backlog Recovery Coach for engineering/university students. Build a realistic, week-by-week recovery plan for the given backlog subject(s) that respects the hours available. Include: priority topics, a weekly schedule table, revision and past-paper strategy, and how to keep current-semester work on track. Be encouraging and concrete.",
  tutor:
    "You are a patient Learning Tutor. Explain the concept in simple language matched to the student's level. Use an intuitive analogy, a worked example, common mistakes, and a 3-question self-check at the end (answers hidden under a 'Answers' heading).",
  questions:
    "You are a Question Generator for exam and placement practice. Generate the requested number and type of questions on the topic at the given difficulty. For MCQs: 4 options, the correct answer and a 1-2 line explanation. For coding questions: problem statement, constraints, example I/O, hints, and a reference solution in Python. Use clear markdown numbering.",
  evaluator:
    "You are a fair, strict Evaluator. Score the student's answer against the question. Start with a line 'Score: X / MAX'. Then give: what's correct, what's missing or wrong, a model answer, and 2-3 specific tips to score higher. For code, check correctness, edge cases, complexity and style.",
  progress:
    "You are a Progress Analyst. Analyse ONLY the student data provided — never invent numbers. Identify trends in SGPA, weak subjects (low marks/attendance), backlog risk, and give a prioritised improvement list with measurable targets. If data is missing, say what to add to the profile.",
  placement:
    "You are a Placement Coach for campus recruitment. Help with the requested area using the student's profile (skills, goal, CGPA) when relevant. Be practical: frameworks, sample answers, practice sets, resume bullet rewrites with impact metrics, and a short action plan.",
};

export const runAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ agentId: z.enum(["backlog", "tutor", "questions", "evaluator", "progress", "placement"]), inputs: z.record(z.string().max(8000)) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generate, AiError } = await import("./ai.server");
    let studentContext = "";
    if (["backlog", "progress", "placement"].includes(data.agentId)) {
      const [p, s, sub] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("semesters").select("semester,sgpa").order("semester"),
        supabase.from("subjects").select("semester,name,marks,attendance,is_backlog").order("semester"),
      ]);
      studentContext = `\n\nSTUDENT DATA (from their saved profile; empty means not provided):\n${JSON.stringify(
        { profile: p.data, semesters: s.data ?? [], subjects: sub.data ?? [] },
      )}`;
    }
    const prompt =
      Object.entries(data.inputs)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n") + studentContext;
    try {
      const text = await generate(SYSTEM[data.agentId]!, prompt || "Please help me.");
      await supabase.from("activities").insert({ user_id: userId, kind: "agent", title: `Used ${data.agentId} agent` });
      return { ok: true as const, text };
    } catch (e) {
      return { ok: false as const, error: e instanceof AiError ? e.message : "Something went wrong. Please try again." };
    }
  });

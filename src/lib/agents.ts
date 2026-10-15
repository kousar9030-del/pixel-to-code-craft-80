import { LifeBuoy, GraduationCap, ListChecks, ClipboardCheck, LineChart, Briefcase, type LucideIcon } from "lucide-react";

export type AgentId = "backlog" | "tutor" | "questions" | "evaluator" | "progress" | "placement";

export type AgentField = { name: string; label: string; type: "text" | "textarea" | "select"; placeholder?: string; options?: string[]; required?: boolean };

export type AgentDef = {
  id: AgentId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  fields: AgentField[];
  usesStudentData: boolean;
};

export const AGENTS: AgentDef[] = [
  {
    id: "backlog",
    name: "Backlog Recovery Coach",
    tagline: "Realistic study plans to clear pending subjects.",
    icon: LifeBuoy,
    usesStudentData: true,
    fields: [
      { name: "subject", label: "Backlog subject(s)", type: "text", placeholder: "e.g. Engineering Mathematics II", required: true },
      { name: "weeks", label: "Weeks until exam", type: "select", options: ["2", "4", "6", "8", "12"], required: true },
      { name: "hours", label: "Hours available per day", type: "select", options: ["1", "2", "3", "4", "5+"], required: true },
      { name: "notes", label: "What makes it hard?", type: "textarea", placeholder: "Weak topics, past attempts, other commitments..." },
    ],
  },
  {
    id: "tutor",
    name: "Learning Tutor",
    tagline: "Difficult concepts, explained simply with examples.",
    icon: GraduationCap,
    usesStudentData: false,
    fields: [
      { name: "topic", label: "Concept or question", type: "textarea", placeholder: "e.g. How does a binary search tree work?", required: true },
      { name: "level", label: "Explain like I'm", type: "select", options: ["New to this", "Somewhat familiar", "Preparing for exam"], required: true },
    ],
  },
  {
    id: "questions",
    name: "Question Generator",
    tagline: "Topic-wise MCQs and coding questions with answers.",
    icon: ListChecks,
    usesStudentData: false,
    fields: [
      { name: "topic", label: "Topic", type: "text", placeholder: "e.g. Operating Systems – Deadlocks", required: true },
      { name: "kind", label: "Question type", type: "select", options: ["MCQs", "Coding questions", "Mixed"], required: true },
      { name: "count", label: "How many", type: "select", options: ["5", "10", "15"], required: true },
      { name: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"], required: true },
    ],
  },
  {
    id: "evaluator",
    name: "Evaluator",
    tagline: "Feedback and a score for your answers or code.",
    icon: ClipboardCheck,
    usesStudentData: false,
    fields: [
      { name: "question", label: "Question", type: "textarea", placeholder: "Paste the question", required: true },
      { name: "answer", label: "Your answer or code", type: "textarea", placeholder: "Paste your answer", required: true },
      { name: "maxScore", label: "Out of", type: "select", options: ["5", "10", "20", "100"], required: true },
    ],
  },
  {
    id: "progress",
    name: "Progress Analyst",
    tagline: "Reads your saved records and finds improvement areas.",
    icon: LineChart,
    usesStudentData: true,
    fields: [{ name: "focus", label: "Anything specific to analyse?", type: "textarea", placeholder: "Optional — e.g. why my SGPA dropped" }],
  },
  {
    id: "placement",
    name: "Placement Coach",
    tagline: "Aptitude, coding, resume, interviews and communication.",
    icon: Briefcase,
    usesStudentData: true,
    fields: [
      { name: "area", label: "Help with", type: "select", options: ["Aptitude", "Coding preparation", "Resume review", "Interview questions", "Communication skills"], required: true },
      { name: "details", label: "Details", type: "textarea", placeholder: "Target role/company, paste resume text, or your question", required: true },
    ],
  },
];

export const getAgent = (id: string) => AGENTS.find((a) => a.id === id);

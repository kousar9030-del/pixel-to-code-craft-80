import { Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <FlaskConical className="size-5 text-warning" />
      <span className="flex-1"><b className="text-warning">DEMO DATA</b> — you haven't added any records yet, so this page shows a sample student. Nothing here is about you.</span>
      <Link to="/profile" className="font-medium text-accent hover:underline">Add my records →</Link>
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 animate-rise ${className}`}>
      {title && <h3 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h3>}
      {children}
    </div>
  );
}

export const riskColor = (level: string) =>
  level === "Low" ? "text-success" : level === "Moderate" ? "text-warning" : "text-destructive";

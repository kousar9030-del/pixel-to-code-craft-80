import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, ShieldAlert, Bot, UserRound, LogOut, Route as RouteIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/risk", label: "Risk Prediction", icon: ShieldAlert },
  { to: "/agents", label: "AI Agents", icon: Bot },
  { to: "/profile", label: "Profile & Records", icon: UserRound },
] as const;

function Layout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);
  if (loading || !user) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-row items-center gap-1 overflow-x-auto border-b border-sidebar-border bg-sidebar p-3 md:w-64 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-5">
        <Link to="/" className="mb-0 mr-4 flex items-center gap-2 font-display font-semibold md:mb-8">
          <div className="grid size-8 place-items-center rounded-lg bg-brand"><RouteIcon className="size-4" /></div>
          <span className="hidden md:inline">EduSuccess <span className="text-brand">AI</span></span>
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
          >
            <n.icon className="size-4" /> <span>{n.label}</span>
          </Link>
        ))}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent md:mt-auto"
        >
          <LogOut className="size-4" /> <span className="hidden md:inline">Sign out</span>
        </button>
      </aside>
      <main className="flex-1 bg-glow p-5 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

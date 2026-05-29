import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  LayoutDashboard,
  MessageSquare,
  ListChecks,
  Bot,
  Settings,
  Moon,
  Sun,
  ChevronRight,
  Zap,
} from "lucide-react";

interface Stats {
  total: number;
  pending: number;
  building: number;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inbox", label: "Inbox", icon: MessageSquare, countKey: "pending" as const },
  { path: "/requests", label: "Requests", icon: ListChecks },
  { path: "/agent", label: "Agent Log", icon: Bot, countKey: "building" as const },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 10000,
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground tracking-tight">FeatureFlow</span>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">PM Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon, countKey }) => {
            const isActive = location === path || (path !== "/" && location.startsWith(path));
            const count = countKey && stats ? stats[countKey] : 0;
            return (
              <Link key={path} href={path}>
                <button
                  data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {count > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "default"}
                      className="h-5 min-w-5 px-1.5 text-xs"
                    >
                      {count}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
            className="w-full justify-start gap-3 px-3 font-normal text-sm text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}

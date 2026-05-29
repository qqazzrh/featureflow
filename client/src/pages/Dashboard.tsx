import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  MessageSquare, ListChecks, Bot, CheckCircle2, Clock,
  TrendingUp, AlertCircle, Sparkles, ChevronRight
} from "lucide-react";
import type { FeatureRequest } from "@shared/schema";

interface Stats {
  total: number; pending: number; approved: number;
  building: number; done: number; rejected: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 8000,
  });

  const { data: requests } = useQuery<FeatureRequest[]>({
    queryKey: ["/api/feature-requests"],
    queryFn: () => apiRequest("GET", "/api/feature-requests").then(r => r.json()),
    refetchInterval: 8000,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seed").then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: `Loaded ${data.seeded} demo requests`, description: "AI has parsed and structured them from raw WhatsApp messages." });
    },
  });

  const recent = requests?.slice(0, 5) || [];
  const highPriority = requests?.filter(r => r.priority === "high" && r.status === "pending") || [];

  const statCards = [
    { label: "Total Requests", value: stats?.total ?? 0, icon: ListChecks, color: "text-primary" },
    { label: "Pending Review", value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Agent Building", value: stats?.building ?? 0, icon: Bot, color: "text-purple-600 dark:text-purple-400" },
    { label: "Completed", value: stats?.done ?? 0, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            WhatsApp customer messages → structured feature requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          data-testid="button-load-demo"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {seedMutation.isPending ? "Loading…" : "Load demo data"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Recent Requests</CardTitle>
              <Link href="/requests">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  View all <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No requests yet. Load demo data or send a WhatsApp message.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map(req => (
                    <Link key={req.id} href={`/requests/${req.id}`}>
                      <div
                        data-testid={`row-request-${req.id}`}
                        className="px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer flex items-start gap-3"
                      >
                        <SentimentBadge sentiment={req.sentiment || "neutral"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.customerName} · {new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <PriorityBadge priority={req.priority} />
                          <StatusBadge status={req.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* High priority */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {highPriority.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No high priority items pending.</p>
              ) : (
                highPriority.slice(0, 4).map(req => (
                  <Link key={req.id} href={`/requests/${req.id}`}>
                    <div className="text-xs p-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 hover:border-red-300 transition-colors cursor-pointer">
                      <p className="font-medium text-foreground line-clamp-2">{req.title}</p>
                      <p className="text-muted-foreground mt-0.5">{req.customerName}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!stats || Object.keys(stats.byCategory).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No data yet.</p>
              ) : (
                Object.entries(stats.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between gap-2">
                      <CategoryBadge category={cat} />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(count / (stats.total || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

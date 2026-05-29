import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Bot, Clock, ChevronRight, CheckCircle2, AlertCircle, Loader2, ListOrdered } from "lucide-react";
import type { AgentTask, FeatureRequest } from "@shared/schema";

export default function AgentLogs() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<AgentTask[]>({
    queryKey: ["/api/agent-tasks"],
    queryFn: () => apiRequest("GET", "/api/agent-tasks").then(r => r.json()),
    refetchInterval: 3000,
  });

  const { data: requests } = useQuery<FeatureRequest[]>({
    queryKey: ["/api/feature-requests"],
    queryFn: () => apiRequest("GET", "/api/feature-requests").then(r => r.json()),
  });

  const requestMap = new Map(requests?.map(r => [r.id, r]) || []);

  const statusConfig = {
    queued:    { label: "Queued",    icon: Clock,         className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    running:   { label: "Running",   icon: Loader2,       className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
    completed: { label: "Completed", icon: CheckCircle2,  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    failed:    { label: "Failed",    icon: AlertCircle,   className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  };

  return (
    <div className="p-6 space-y-5 max-w-[900px]">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Agent Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI agent execution history for approved feature requests
        </p>
      </div>

      {tasksLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !tasks?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No agent tasks yet. Approve a feature request to kick off the AI agent.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const fr = requestMap.get(task.featureRequestId);
            const cfg = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.queued;
            const Icon = cfg.icon;
            const agentPlan: { step: number; action: string; detail: string }[] = (() => {
              try { return JSON.parse(task.plan || "[]"); } catch { return []; }
            })();

            return (
              <Card key={task.id} data-testid={`agent-task-${task.id}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {fr?.title || `Feature Request #${task.featureRequestId}`}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Started {task.startedAt ? new Date(task.startedAt).toLocaleString() : "—"}
                        {task.completedAt && ` · Completed ${new Date(task.completedAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      <Icon className={`w-3 h-3 mr-1 ${task.status === "running" ? "animate-spin" : ""}`} />
                      {cfg.label}
                    </Badge>
                    {fr && (
                      <Link href={`/requests/${fr.id}`}>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.result && (
                    <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">Result</p>
                      <p className="text-sm text-foreground">{task.result}</p>
                    </div>
                  )}

                  {agentPlan.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <ListOrdered className="w-3 h-3" /> Implementation Plan ({agentPlan.length} steps)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {agentPlan.map(step => (
                          <div key={step.step} className="flex gap-2 items-start p-2 rounded-md bg-muted/50">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">{step.step}</span>
                            <div>
                              <p className="text-xs font-medium text-foreground">{step.action}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.log && (
                    <details className="group">
                      <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        View raw log ▸
                      </summary>
                      <pre className="mt-2 text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
                        {task.log}
                      </pre>
                    </details>
                  )}

                  {task.status === "running" && !task.log && (
                    <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Agent is processing…
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

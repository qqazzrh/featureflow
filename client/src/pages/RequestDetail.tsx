import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, XCircle, Bot, Save,
  User, Calendar, Tag, BarChart2, MessageSquare
} from "lucide-react";
import type { FeatureRequest, AgentTask } from "@shared/schema";

export default function RequestDetail() {
  const [, params] = useRoute("/requests/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const id = Number(params?.id);

  const { data: req, isLoading } = useQuery<FeatureRequest>({
    queryKey: ["/api/feature-requests", id],
    queryFn: () => apiRequest("GET", `/api/feature-requests/${id}`).then(r => r.json()),
    refetchInterval: 5000,
  });

  const { data: agentTask } = useQuery<AgentTask>({
    queryKey: ["/api/agent-tasks/by-request", id],
    queryFn: () => apiRequest("GET", `/api/agent-tasks/by-request/${id}`).then(r => r.json()),
    refetchInterval: 3000,
    enabled: req?.status === "building" || req?.status === "done",
    retry: false,
  });

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [pmNotes, setPmNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => {
    if (!req) return;
    setEditTitle(req.title);
    setEditDescription(req.description);
    setEditPriority(req.priority);
    setEditCategory(req.category);
    setPmNotes(req.pmNotes || "");
    setIsEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: (updates: Partial<FeatureRequest>) =>
      apiRequest("PATCH", `/api/feature-requests/${id}`, updates).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      toast({ title: "Request updated" });
      setIsEditing(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/feature-requests/${id}/approve`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Approved — AI agent is now building", description: "Check the Agent Log for live progress." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/feature-requests/${id}/reject`, { pmNotes }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Request rejected" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[800px]">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Request not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/requests")} className="mt-2">
          ← Back to requests
        </Button>
      </div>
    );
  }

  const agentPlan: { step: number; action: string; detail: string }[] = (() => {
    try { return JSON.parse(agentTask?.plan || "[]"); } catch { return []; }
  })();

  return (
    <div className="p-6 space-y-5 max-w-[800px]">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/requests")} className="gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to requests
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <SentimentBadge sentiment={req.sentiment || "neutral"} />
          <div className="min-w-0">
            {isEditing ? (
              <Input
                data-testid="input-edit-title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-base font-semibold h-9"
              />
            ) : (
              <h1 className="text-lg font-semibold text-foreground">{req.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={req.status} />
              <PriorityBadge priority={req.priority} />
              <CategoryBadge category={req.category} />
            </div>
          </div>
        </div>
        {!isEditing && req.status === "pending" && (
          <Button variant="outline" size="sm" onClick={startEdit} data-testid="button-edit-request">
            Edit
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: User, label: "Customer", value: req.customerName || "Unknown" },
          { icon: Calendar, label: "Received", value: new Date(req.createdAt).toLocaleDateString() },
          { icon: Tag, label: "Category", value: req.category },
          { icon: BarChart2, label: "Priority", value: req.priority },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium capitalize">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Feature Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["billing","ux","api","notifications","performance","general"].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                data-testid="textarea-description"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="space-y-1">
                <Label className="text-xs">PM Notes</Label>
                <Textarea
                  data-testid="textarea-pm-notes"
                  value={pmNotes}
                  onChange={e => setPmNotes(e.target.value)}
                  placeholder="Internal notes for the team…"
                  className="min-h-[60px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate({ title: editTitle, description: editDescription, priority: editPriority, category: editCategory, pmNotes })}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-request"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save changes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground leading-relaxed">{req.description}</p>
              {req.pmNotes && (
                <div className="mt-3 p-3 rounded-md bg-muted border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">PM Notes</p>
                  <p className="text-sm text-foreground">{req.pmNotes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {req.status === "pending" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Review Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">PM Notes (optional)</Label>
              <Textarea
                data-testid="textarea-review-notes"
                placeholder="Add context or rejection reason…"
                className="min-h-[60px]"
                value={pmNotes}
                onChange={e => setPmNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                data-testid="button-approve"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Build
              </Button>
              <Button
                data-testid="button-reject"
                variant="outline"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent output */}
      {(req.status === "building" || req.status === "done") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" />
              AI Agent Output
              {req.status === "building" && (
                <span className="text-xs text-purple-500 animate-pulse font-normal ml-1">● Running…</span>
              )}
              {req.status === "done" && (
                <span className="text-xs text-green-600 dark:text-green-400 font-normal ml-1">● Complete</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentTask?.result && (
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Summary</p>
                <p className="text-sm text-foreground">{agentTask.result}</p>
              </div>
            )}

            {agentPlan.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Implementation Plan</p>
                <div className="space-y-2">
                  {agentPlan.map((step) => (
                    <div key={step.step} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{step.action}</p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentTask?.log && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Agent Log</p>
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
                  {agentTask.log}
                </pre>
              </div>
            )}

            {!agentTask && (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

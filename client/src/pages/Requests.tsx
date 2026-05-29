import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from "@/components/StatusBadge";
import { Link } from "wouter";
import { Search, Filter, ChevronRight } from "lucide-react";
import type { FeatureRequest } from "@shared/schema";

const STATUS_FILTERS = ["all", "pending", "approved", "building", "done", "rejected"] as const;
const PRIORITY_FILTERS = ["all", "high", "medium", "low"] as const;

export default function Requests() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: requests, isLoading } = useQuery<FeatureRequest[]>({
    queryKey: ["/api/feature-requests"],
    queryFn: () => apiRequest("GET", "/api/feature-requests").then(r => r.json()),
    refetchInterval: 8000,
  });

  const filtered = (requests || []).filter(r => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchPriority = priorityFilter === "all" || r.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="p-6 space-y-4 max-w-[1000px]">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Feature Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review, edit, and action AI-parsed requests
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search requests…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {STATUS_FILTERS.map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className="h-7 text-xs capitalize"
              onClick={() => setStatusFilter(s)}
              data-testid={`filter-status-${s}`}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {PRIORITY_FILTERS.map(p => (
            <Button
              key={p}
              size="sm"
              variant={priorityFilter === p ? "default" : "outline"}
              className="h-7 text-xs capitalize"
              onClick={() => setPriorityFilter(p)}
              data-testid={`filter-priority-${p}`}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {isLoading ? "Loading…" : `${filtered.length} request${filtered.length !== 1 ? "s" : ""}`}
      </p>

      {/* List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No requests match your filters.
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {/* Header row */}
            <div className="px-4 py-2 grid grid-cols-[1fr_80px_70px_70px_80px_24px] gap-3 items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Request</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
              <span />
            </div>
            {filtered.map(req => (
              <Link key={req.id} href={`/requests/${req.id}`}>
                <div
                  data-testid={`row-request-${req.id}`}
                  className="px-4 py-3 grid grid-cols-[1fr_80px_70px_70px_80px_24px] gap-3 items-center hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <SentimentBadge sentiment={req.sentiment || "neutral"} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{req.customerName}</p>
                  <CategoryBadge category={req.category} />
                  <PriorityBadge priority={req.priority} />
                  <StatusBadge status={req.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

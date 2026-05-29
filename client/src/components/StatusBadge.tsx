import { Badge } from "@/components/ui/badge";

export type Status = "pending" | "approved" | "rejected" | "building" | "done";
export type Priority = "high" | "medium" | "low";
export type Sentiment = "positive" | "neutral" | "frustrated";
export type Category = "billing" | "ux" | "api" | "notifications" | "performance" | "general";

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending:  { label: "Pending",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
  approved: { label: "Approved",  className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  rejected: { label: "Rejected",  className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
  building: { label: "Building",  className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  done:     { label: "Done",      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high:   { label: "High",   className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
  medium: { label: "Med",    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  low:    { label: "Low",    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

const sentimentConfig: Record<Sentiment, { label: string; emoji: string }> = {
  positive:  { label: "Positive",  emoji: "😊" },
  neutral:   { label: "Neutral",   emoji: "😐" },
  frustrated:{ label: "Frustrated",emoji: "😤" },
};

const categoryConfig: Record<Category, { label: string; color: string }> = {
  billing:      { label: "Billing",      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  ux:           { label: "UX",           color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  api:          { label: "API",          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  notifications:{ label: "Notifs",       color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
  performance:  { label: "Performance",  color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  general:      { label: "General",      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] || statusConfig.pending;
  return <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>{config.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as Priority] || priorityConfig.medium;
  return <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>{config.label}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config = sentimentConfig[sentiment as Sentiment] || sentimentConfig.neutral;
  return <span className="text-base" title={config.label}>{config.emoji}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category as Category] || categoryConfig.general;
  return <Badge variant="outline" className={`text-xs font-medium ${config.color}`}>{config.label}</Badge>;
}

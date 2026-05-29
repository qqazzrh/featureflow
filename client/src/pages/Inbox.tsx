import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Clock, User, RefreshCw } from "lucide-react";
import type { WhatsappMessage } from "@shared/schema";

export default function Inbox() {
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");

  const { data: messages, isLoading, refetch } = useQuery<WhatsappMessage[]>({
    queryKey: ["/api/messages"],
    queryFn: () => apiRequest("GET", "/api/messages").then(r => r.json()),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { from: string; body: string }) =>
      apiRequest("POST", "/api/messages/manual", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Message received", description: "AI has parsed and created a feature request." });
      setFrom("");
      setBody("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process message.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Message Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inbound WhatsApp messages — each is parsed by AI into a feature request
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-inbox">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Manual inject */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Simulate WhatsApp Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="input-from" className="text-xs">Customer Name / Phone</Label>
              <Input
                id="input-from"
                data-testid="input-from"
                placeholder="e.g. Sarah Chen"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="input-body" className="text-xs">Message</Label>
              <div className="flex gap-2">
                <Textarea
                  id="input-body"
                  data-testid="input-body"
                  placeholder="I'd love a dark mode option…"
                  className="resize-none min-h-[36px] max-h-24"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && e.metaKey && from && body) {
                      sendMutation.mutate({ from, body });
                    }
                  }}
                />
                <Button
                  data-testid="button-send-message"
                  disabled={!from || !body || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ from, body })}
                  className="self-end"
                >
                  {sendMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Or connect your WhatsApp Business webhook to <code className="bg-muted px-1 rounded text-xs font-mono">POST /api/webhook/whatsapp</code>
          </p>
        </CardContent>
      </Card>

      {/* Messages list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            All Messages
            {messages && <span className="text-muted-foreground font-normal">({messages.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : messages?.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No messages yet. Simulate one above or set up your webhook.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages?.map(msg => (
                <div key={msg.id} data-testid={`msg-item-${msg.id}`} className="px-4 py-3 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground">{msg.from}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {msg.processed ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Parsed</span>
                        ) : (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">Pending</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

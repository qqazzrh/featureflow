import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Webhook, Bot, Key, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl = `${window.location.origin.replace(/\/#.*/, "")}/api/webhook/whatsapp`;

  return (
    <div className="p-6 space-y-6 max-w-[700px]">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your WhatsApp webhook and AI integrations</p>
      </div>

      {/* Webhook */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            WhatsApp Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" data-testid="input-webhook-url" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl, "webhook")}
                data-testid="button-copy-webhook"
              >
                {copied === "webhook" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Verify Token</Label>
            <div className="flex gap-2">
              <Input value="featureflow_verify_2024" readOnly className="font-mono text-xs" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard("featureflow_verify_2024", "token")}
              >
                {copied === "token" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use this as the verify token when registering your Meta or Twilio webhook.</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supported Formats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Meta WhatsApp Business API", status: "supported" },
                { name: "Twilio WhatsApp", status: "supported" },
                { name: "Manual injection", status: "supported" },
                { name: "WhatsApp Web (unofficial)", status: "unsupported" },
              ].map(({ name, status }) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={status === "supported"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 text-xs"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 text-xs"
                  }>
                    {status === "supported" ? "✓" : "✗"}
                  </Badge>
                  <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI / OpenAI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-… (set via OPENAI_API_KEY env var)"
                readOnly
                className="font-mono text-xs"
                data-testid="input-openai-key"
              />
              <Button size="icon" variant="outline" disabled>
                <Key className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set the <code className="bg-muted px-1 rounded font-mono">OPENAI_API_KEY</code> environment variable before starting the server.
              Without it, the app runs in demo mode with simulated AI output.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Models Used</p>
            <div className="space-y-2">
              {[
                { role: "Message parsing", model: "gpt-4o-mini", desc: "Extracts title, description, priority, category, sentiment" },
                { role: "Feature agent", model: "gpt-4o", desc: "Generates step-by-step implementation plans for approved requests" },
              ].map(({ role, model, desc }) => (
                <div key={role} className="flex items-start justify-between gap-3 p-2 rounded-md bg-muted/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">{role}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono flex-shrink-0">{model}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { step: "1", title: "Set OpenAI key", desc: "Export OPENAI_API_KEY=sk-... before starting the server" },
              { step: "2", title: "Register webhook", desc: "Go to Meta Developer Console → WhatsApp → Webhooks. Paste the URL and verify token above." },
              { step: "3", title: "Subscribe to messages", desc: "Under webhook fields, subscribe to messages to receive inbound WhatsApp messages." },
              { step: "4", title: "Send a test message", desc: "Send a WhatsApp message to your business number. It will appear in the Inbox within seconds." },
              { step: "5", title: "Review & approve", desc: "Go to Requests, open the parsed request, edit if needed, then click Approve & Build." },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{step}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Inbox from "@/pages/Inbox";
import Requests from "@/pages/Requests";
import RequestDetail from "@/pages/RequestDetail";
import AgentLogs from "@/pages/AgentLogs";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/inbox" component={Inbox} />
              <Route path="/requests" component={Requests} />
              <Route path="/requests/:id" component={RequestDetail} />
              <Route path="/agent" component={AgentLogs} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

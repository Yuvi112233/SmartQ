import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Customer from "@/pages/customer";
import Barber from "@/pages/barber";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import CustomerQueue from "@/pages/customer-queue";
import CustomerNow from "@/pages/customer-now";

function Router() {
  return (
    <Switch>
      <Route path="/customer" component={Customer} />
      <Route path="/customer/queue" component={CustomerQueue} />
      <Route path="/customer/now" component={CustomerNow} />
      <Route path="/barber" component={Barber} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/" component={Customer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, useLocation } from "wouter";
import { queryClient, getQueryFn, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Login from "@/pages/login";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Estimates from "@/pages/estimates";
import EstimateDetail from "@/pages/estimate-detail";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import SettingsPage from "@/pages/settings-page";
import Invoices from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoice-detail";
import Employees from "@/pages/employees";
import Photos from "@/pages/photos";
import EmployeePortal from "@/pages/employee-portal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimates/:id" component={EstimateDetail} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/:id" component={InvoiceDetail} />
      <Route path="/customers" component={Customers} />
      <Route path="/customers/:id" component={CustomerDetail} />
      <Route path="/employees" component={Employees} />
      <Route path="/photos" component={Photos} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

// Gates the main app behind authentication. Shows the login page until the
// session is valid; /api/auth/me returns null (not an error) when logged out.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!user) return <Login />;
  return <>{children}</>;
}

function LogoutButton() {
  async function handleLogout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    // Hard reset to the root: wipes all in-memory state and re-runs the auth
    // gate, which sees the now-destroyed session and shows the login screen.
    // More reliable than clear()+invalidate, which could race and leave the
    // app still showing after the session is already gone.
    queryClient.clear();
    window.location.href = "/";
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
      <LogOut className="h-4 w-4 mr-1" />
      Sign out
    </Button>
  );
}

function App() {
  const [location] = useLocation();

  // Employee portal runs outside the main layout (no sidebar)
  if (location === "/employee") {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <EmployeePortal />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthGate>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="flex items-center gap-1">
                      <ThemeToggle />
                      <LogoutButton />
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </AuthGate>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

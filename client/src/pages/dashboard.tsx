import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, Calculator, Clock, DollarSign,
  Plus, ArrowRight, Zap, CheckCircle2, Send, ScanLine, FileText
} from "lucide-react";
import type { Project, Estimate, Invoice } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function StatCard({ title, value, icon: Icon, description, color }: {
  title: string; value: string | number; icon: any; description: string; color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex items-center justify-center w-9 h-9 rounded-md ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    bid_sent: { label: "Bid Sent", variant: "outline" },
    won: { label: "Won", variant: "default" },
    lost: { label: "Lost", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant} data-testid={`badge-status-${status}`}>{c.label}</Badge>;
}

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: estimates, isLoading: loadingEstimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
  const bidsSent = projects?.filter(p => p.status === "bid_sent").length || 0;
  const wonProjects = projects?.filter(p => p.status === "won").length || 0;

  const recentProjects = projects?.slice(0, 5) || [];

  const allInvoices = invoices || [];
  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = allInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = allInvoices.filter(inv => inv.status !== "paid").reduce((sum, inv) => sum + inv.total, 0);

  if (loadingProjects || loadingEstimates || loadingInvoices) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your electrical estimating projects
          </p>
        </div>
        <Link href="/projects?new=1">
          <Button data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={totalProjects}
          icon={FolderOpen}
          description="All time projects"
          color="bg-primary/10 text-primary dark:bg-primary/20"
        />
        <StatCard
          title="Active"
          value={activeProjects}
          icon={Clock}
          description="Currently in progress"
          color="bg-chart-2/10 text-chart-2 dark:bg-chart-2/20"
        />
        <StatCard
          title="Bids Sent"
          value={bidsSent}
          icon={Send}
          description="Awaiting response"
          color="bg-chart-4/10 text-chart-4 dark:bg-chart-4/20"
        />
        <StatCard
          title="Won"
          value={wonProjects}
          icon={CheckCircle2}
          description="Successfully won"
          color="bg-chart-3/10 text-chart-3 dark:bg-chart-3/20"
        />
      </div>

      {allInvoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="stat-total-invoiced">
                {formatCurrency(totalInvoiced)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-chart-3" data-testid="stat-total-paid">
                {formatCurrency(totalPaid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allInvoices.filter(i => i.status === "paid").length} paid
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-chart-5" : ""}`} data-testid="stat-total-outstanding">
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allInvoices.filter(i => i.status !== "paid").length} unpaid
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="button-view-all-projects">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                  <FolderOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first project to get started
                </p>
                <Link href="/projects?new=1">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="button-create-first-project">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div
                      className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`project-row-${project.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={project.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/projects?new=1">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-new-project">
                <FolderOpen className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
            <Link href="/ai-analysis">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-ai-analysis">
                <ScanLine className="w-4 h-4 mr-2" />
                AI Drawing Analysis
              </Button>
            </Link>
            <Link href="/estimates">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-estimates">
                <Calculator className="w-4 h-4 mr-2" />
                View Estimates
              </Button>
            </Link>
            <Link href="/invoices">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-invoices">
                <FileText className="w-4 h-4 mr-2" />
                View Invoices
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

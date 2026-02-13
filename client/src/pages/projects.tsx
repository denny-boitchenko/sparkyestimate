import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Plus, Search, FolderOpen, Zap, MapPin, Phone, Mail,
  Building2, MoreHorizontal, Calendar, LayoutGrid, List
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Project } from "@shared/schema";
import { PROJECT_STATUSES, DWELLING_TYPES } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    bid_sent: { label: "Bid Sent", variant: "outline" },
    won: { label: "Won", variant: "default" },
    lost: { label: "Lost", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function DwellingBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    single: "Single Family",
    duplex: "Duplex",
    triplex: "Triplex",
    fourplex: "Fourplex",
  };
  return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
}

function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    address: "",
    dwellingType: "single",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      onOpenChange(false);
      setForm({ name: "", clientName: "", clientEmail: "", clientPhone: "", address: "", dwellingType: "single", notes: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., Smith Residence Rewire"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
              data-testid="input-project-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="John Smith"
                value={form.clientName}
                onChange={(e) => setForm(p => ({ ...p, clientName: e.target.value }))}
                required
                data-testid="input-client-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dwellingType">Dwelling Type</Label>
              <Select value={form.dwellingType} onValueChange={(v) => setForm(p => ({ ...p, dwellingType: v }))}>
                <SelectTrigger data-testid="select-dwelling-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Family</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="triplex">Triplex</SelectItem>
                  <SelectItem value="fourplex">Fourplex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="john@example.com"
                value={form.clientEmail}
                onChange={(e) => setForm(p => ({ ...p, clientEmail: e.target.value }))}
                data-testid="input-client-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                placeholder="(555) 123-4567"
                value={form.clientPhone}
                onChange={(e) => setForm(p => ({ ...p, clientPhone: e.target.value }))}
                data-testid="input-client-phone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, Toronto, ON"
              value={form.address}
              onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
              data-testid="input-address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              data-testid="input-notes"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-project">
              {mutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/projects/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const filtered = (projects || []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-projects-title">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your electrical estimating projects
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-project">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="bid_sent">Bid Sent</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={viewMode === "grid" ? "default" : "ghost"}
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first project to start estimating"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => setDialogOpen(true)} className="mt-4" data-testid="button-empty-create">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="hover-elevate active-elevate-2 cursor-pointer group"
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-3 min-w-0" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid={`button-menu-${project.id}`}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "in_progress" })}>
                      Mark In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "bid_sent" })}>
                      Mark Bid Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "won" })}>
                      Mark Won
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(project.id)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent onClick={() => navigate(`/projects/${project.id}`)}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={project.status} />
                    <DwellingBadge type={project.dwellingType} />
                  </div>
                  {project.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}
                  {project.clientPhone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{project.clientPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{new Date(project.createdAt).toLocaleDateString("en-CA")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      data-testid={`row-project-${project.id}`}
                    >
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-sm">{project.clientName}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        <DwellingBadge type={project.dwellingType} />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {project.address || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString("en-CA")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-list-menu-${project.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "in_progress" })}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "bid_sent" })}>
                              Mark Bid Sent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "won" })}>
                              Mark Won
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(project.id)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

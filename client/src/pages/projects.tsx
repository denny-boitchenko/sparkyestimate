import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
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
  Building2, MoreHorizontal, Calendar, Users, List, ChevronDown, ChevronRight
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Project, Customer } from "@shared/schema";
import { PROJECT_STATUSES, DWELLING_TYPES } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  bid_sent: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  bid_sent: "Bid Sent",
  won: "Won",
  lost: "Lost",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </span>
  );
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
    customerId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    address: "",
    dwellingType: "single",
    notes: "",
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const handleCustomerSelect = (value: string) => {
    if (value === "none") {
      setForm(p => ({ ...p, customerId: "" }));
      return;
    }
    const customer = customers?.find(c => c.id === parseInt(value));
    if (customer) {
      setForm(p => ({
        ...p,
        customerId: value,
        clientName: customer.name,
        clientEmail: customer.email || "",
        clientPhone: customer.phone || "",
        address: [customer.address, customer.city, customer.province, customer.postalCode].filter(Boolean).join(", "),
      }));
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: any = { ...data };
      if (data.customerId) {
        payload.customerId = parseInt(data.customerId);
      } else {
        delete payload.customerId;
      }
      const res = await apiRequest("POST", "/api/projects", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      onOpenChange(false);
      setForm({ name: "", customerId: "", clientName: "", clientEmail: "", clientPhone: "", address: "", dwellingType: "single", notes: "" });
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
          <div className="space-y-2">
            <Label>Link to Customer</Label>
            <Select value={form.customerId || "none"} onValueChange={handleCustomerSelect}>
              <SelectTrigger data-testid="select-customer">
                <SelectValue placeholder="Select a customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked customer</SelectItem>
                {(customers || []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Selecting a customer will auto-fill client info below</p>
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
  const [viewMode, setViewMode] = useState<"client" | "project">("client");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const customerMap = (customers || []).reduce<Record<number, Customer>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

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

  const clientGroups = filtered.reduce<Record<string, Project[]>>((acc, p) => {
    const client = p.clientName || "Unknown Client";
    if (!acc[client]) acc[client] = [];
    acc[client].push(p);
    return acc;
  }, {});

  const toggleClient = (client: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(client)) next.delete(client);
      else next.add(client);
      return next;
    });
  };

  const toggleAllClients = () => {
    const allKeys = Object.keys(clientGroups);
    if (expandedClients.size === allKeys.length) {
      setExpandedClients(new Set());
    } else {
      setExpandedClients(new Set(allKeys));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const ProjectActions = ({ project }: { project: Project }) => (
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
        {PROJECT_STATUSES.filter(s => s !== project.status).map(s => (
          <DropdownMenuItem key={s} onClick={() => updateStatusMutation.mutate({ id: project.id, status: s })}>
            Mark {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => deleteMutation.mutate(project.id)}
          className="text-destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
            variant={viewMode === "client" ? "default" : "ghost"}
            onClick={() => setViewMode("client")}
            className={viewMode === "client" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-view-client"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "project" ? "default" : "ghost"}
            onClick={() => setViewMode("project")}
            className={viewMode === "project" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-view-project"
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
      ) : viewMode === "client" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {Object.keys(clientGroups).length} client{Object.keys(clientGroups).length !== 1 ? "s" : ""}, {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAllClients} data-testid="button-toggle-all-clients">
              {expandedClients.size === Object.keys(clientGroups).length ? "Collapse All" : "Expand All"}
            </Button>
          </div>
          {Object.entries(clientGroups).sort(([a], [b]) => a.localeCompare(b)).map(([client, clientProjects]) => {
            const isExpanded = expandedClients.has(client);
            const statusCounts = clientProjects.reduce<Record<string, number>>((acc, p) => {
              acc[p.status] = (acc[p.status] || 0) + 1;
              return acc;
            }, {});

            return (
              <Card key={client} data-testid={`card-client-${client}`}>
                <div
                  className="flex items-center justify-between gap-3 p-4 cursor-pointer hover-elevate"
                  onClick={() => toggleClient(client)}
                  data-testid={`button-toggle-client-${client}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" data-testid={`text-client-name-${client}`}>{client}</p>
                      <p className="text-xs text-muted-foreground">
                        {clientProjects.length} project{clientProjects.length !== 1 ? "s" : ""}
                        {clientProjects[0]?.clientEmail ? ` · ${clientProjects[0].clientEmail}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <StatusBadge key={status} status={status} />
                    ))}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientProjects.map(project => (
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
                              <ProjectActions project={project} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
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
                        <ProjectActions project={project} />
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

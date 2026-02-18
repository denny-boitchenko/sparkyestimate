import { useState, useEffect } from "react";
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
  Building2, MoreHorizontal, Calendar, Users, List, ChevronDown, ChevronRight,
  X, ArrowUpDown
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

function StatusBadge({ status, count }: { status: string; count?: number }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}
      data-testid={`badge-status-${status}`}
    >
      {count && count > 1 ? `${label} (${count})` : label}
    </span>
  );
}

const DWELLING_LABELS: Record<string, string> = {
  single: "Single Family",
  duplex: "Duplex",
  triplex: "Triplex",
  fourplex: "Fourplex",
  townhouse: "Townhouse",
  condo: "Condo",
  apartment: "Apartment",
  commercial: "Commercial",
  industrial: "Industrial",
};

function DwellingBadge({ type }: { type: string }) {
  return <Badge variant="outline" className="text-xs">{DWELLING_LABELS[type] || type}</Badge>;
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
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setForm(p => ({
        ...p,
        customerId: customer.id.toString(),
        clientName: customer.name,
        clientEmail: customer.email || "",
        clientPhone: customer.phone || "",
      }));
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
      toast({ title: "Customer created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create customer", description: err.message, variant: "destructive" });
    },
  });

  const handleCustomerSelect = (value: string) => {
    if (value === "none") {
      setForm(p => ({ ...p, customerId: "" }));
      return;
    }
    if (value === "__new__") {
      setShowNewCustomerForm(true);
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
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast({ title: "Project name is required", variant: "destructive" });
              return;
            }
            if (!form.customerId && !form.clientName.trim()) {
              toast({ title: "Client name is required", variant: "destructive" });
              return;
            }
            mutation.mutate({ ...form, name: form.name.trim(), clientName: form.clientName.trim() });
          }}
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
            {!showNewCustomerForm ? (
              <>
                <Select value={form.customerId || "none"} onValueChange={handleCustomerSelect}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Select a customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked customer</SelectItem>
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-2 text-primary">
                        <Plus className="w-3 h-3" />
                        Create New Customer
                      </span>
                    </SelectItem>
                    {(customers || []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.customerId && (() => {
                  const c = customers?.find(c => c.id === parseInt(form.customerId));
                  return c ? (
                    <div className="text-xs text-muted-foreground p-2 rounded bg-muted/50 flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{c.name}</span>
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.address && <span>{[c.address, c.city, c.province].filter(Boolean).join(", ")}</span>}
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">New Customer</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCustomerForm(false)}>
                    Cancel
                  </Button>
                </div>
                <Input
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                  onClick={() => createCustomerMutation.mutate({
                    name: newCustomerName.trim(),
                    email: newCustomerEmail.trim() || undefined,
                    phone: newCustomerPhone.trim() || undefined,
                  })}
                >
                  {createCustomerMutation.isPending ? "Creating..." : "Save Customer"}
                </Button>
              </div>
            )}
          </div>
          {/* Only show manual client fields when NO customer is linked */}
          {!form.customerId && (
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
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dwellingType">Project Type</Label>
              <Select value={form.dwellingType} onValueChange={(v) => setForm(p => ({ ...p, dwellingType: v }))}>
                <SelectTrigger data-testid="select-dwelling-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DWELLING_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!form.customerId && (
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
            )}
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
  const [dialogOpen, setDialogOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("new") === "1";
  });
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("customer");
  });
  const [sortBy, setSortBy] = useState<"date_newest" | "date_oldest" | "name" | "status">("date_newest");
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 20;

  // Clean URL params after reading them so refresh doesn't re-apply
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      changed = true;
    }
    if (changed) {
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
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

  // Status counts for filter dropdown (computed before filtering)
  const allStatusCounts = (projects || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = (projects || []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [p.name, p.clientName, p.clientEmail, p.address]
      .some(field => field?.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchCustomer = !customerFilter || p.customerId === Number(customerFilter);
    return matchSearch && matchStatus && matchCustomer;
  });

  // Sort
  const STATUS_ORDER: Record<string, number> = { in_progress: 0, bid_sent: 1, draft: 2, won: 3, lost: 4 };
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date_newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date_oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name": return a.name.localeCompare(b.name);
      case "status": return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      default: return 0;
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PROJECTS_PER_PAGE));
  const paginatedProjects = sorted.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, customerFilter, sortBy]);

  // Customer filter display name
  const filterCustomerName = customerFilter ? customerMap[Number(customerFilter)]?.name : null;

  const clientGroups = paginatedProjects.reduce<Record<string, Project[]>>((acc, p) => {
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
          onClick={() => setDeleteTarget(project)}
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
            <SelectItem value="all">All Statuses ({(projects || []).length})</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}{allStatusCounts[value] ? ` (${allStatusCounts[value]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-40" data-testid="select-sort">
            <ArrowUpDown className="w-3 h-3 mr-1.5" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_newest">Date (Newest)</SelectItem>
            <SelectItem value="date_oldest">Date (Oldest)</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
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

      {filterCustomerName && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
            <Users className="w-3.5 h-3.5" />
            Filtered: {filterCustomerName}
            <button
              onClick={() => {
                setCustomerFilter(null);
                const url = new URL(window.location.href);
                url.searchParams.delete("customer");
                window.history.replaceState({}, "", url.pathname + url.search);
              }}
              className="ml-1 hover:bg-primary/20 rounded p-0.5"
              data-testid="button-clear-customer-filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search || statusFilter !== "all" || customerFilter
                ? "Try adjusting your search or filters"
                : "Create your first project to start estimating"}
            </p>
            {!search && statusFilter === "all" && !customerFilter && (
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
              {Object.keys(clientGroups).length} client{Object.keys(clientGroups).length !== 1 ? "s" : ""}, {sorted.length} project{sorted.length !== 1 ? "s" : ""}
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
                      <StatusBadge key={status} status={status} count={count} />
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
                              {project.address ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                      {project.address}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{project.address}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
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
                  {paginatedProjects.map((project) => (
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
                        {project.address ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                {project.address}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{project.address}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PROJECTS_PER_PAGE + 1}-{Math.min(currentPage * PROJECTS_PER_PAGE, sorted.length)} of {sorted.length} project{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

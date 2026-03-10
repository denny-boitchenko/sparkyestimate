import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Users, Mail, Phone, MapPin, Plus, FileText,
  DollarSign, Calendar
} from "lucide-react";
import type { Customer, Project, Invoice } from "@shared/schema";

const PROVINCES = [
  { value: "BC", label: "BC" },
  { value: "AB", label: "AB" },
  { value: "SK", label: "SK" },
  { value: "MB", label: "MB" },
  { value: "ON", label: "ON" },
  { value: "QC", label: "QC" },
  { value: "NB", label: "NB" },
  { value: "NS", label: "NS" },
  { value: "PE", label: "PE" },
  { value: "NL", label: "NL" },
  { value: "YT", label: "YT" },
  { value: "NT", label: "NT" },
  { value: "NU", label: "NU" },
];

function ProjectStatusBadge({ status }: { status: string }) {
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

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "outline" },
    paid: { label: "Paid", variant: "default" },
    overdue: { label: "Overdue", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const customerId = params?.id ? parseInt(params.id) : 0;

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    enabled: customerId > 0,
  });

  const { data: allProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const customerProjects = (allProjects || []).filter(p => p.customerId === customerId);
  const customerInvoices = (allInvoices || []).filter(i => i.customerId === customerId);

  const totalInvoiced = customerInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPaid = customerInvoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const outstanding = totalInvoiced - totalPaid;

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const res = await apiRequest("PATCH", `/api/customers/${customerId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", {
        name: `${customer?.name || "New"} Project`,
        customerId,
        clientName: customer?.name || "",
        clientEmail: customer?.email || "",
        clientPhone: customer?.phone || "",
        address: [customer?.address, customer?.city, customer?.province, customer?.postalCode].filter(Boolean).join(", "),
        dwellingType: "single",
        status: "draft",
      });
      return res.json();
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      navigate(`/projects/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFieldSave = (field: string, value: string) => {
    if (customer && value !== ((customer as any)[field] || "")) {
      updateMutation.mutate({ [field]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/customers">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/customers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-customer-name">
            {customer.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[customer.city, customer.province].filter(Boolean).join(", ") || "Customer"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" data-testid="tab-info">Info</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">
            Projects ({customerProjects.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            Invoices ({customerInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detail-name">Name</Label>
                  <Input
                    id="detail-name"
                    defaultValue={customer.name}
                    key={`name-${customer.name}`}
                    onBlur={(e) => handleFieldSave("name", e.target.value)}
                    data-testid="input-detail-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-email">Email</Label>
                  <Input
                    id="detail-email"
                    type="email"
                    defaultValue={customer.email || ""}
                    key={`email-${customer.email}`}
                    onBlur={(e) => handleFieldSave("email", e.target.value)}
                    data-testid="input-detail-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-phone">Phone</Label>
                  <Input
                    id="detail-phone"
                    defaultValue={customer.phone || ""}
                    key={`phone-${customer.phone}`}
                    onBlur={(e) => handleFieldSave("phone", e.target.value)}
                    data-testid="input-detail-phone"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detail-address">Street Address</Label>
                  <Input
                    id="detail-address"
                    defaultValue={customer.address || ""}
                    key={`address-${customer.address}`}
                    onBlur={(e) => handleFieldSave("address", e.target.value)}
                    data-testid="input-detail-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-city">City</Label>
                  <Input
                    id="detail-city"
                    defaultValue={customer.city || ""}
                    key={`city-${customer.city}`}
                    onBlur={(e) => handleFieldSave("city", e.target.value)}
                    data-testid="input-detail-city"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="detail-province">Province</Label>
                    <Select
                      defaultValue={customer.province || ""}
                      key={`province-${customer.province}`}
                      onValueChange={(v) => handleFieldSave("province", v)}
                    >
                      <SelectTrigger id="detail-province" data-testid="input-detail-province">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((prov) => (
                          <SelectItem key={prov.value} value={prov.value}>{prov.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-postal">Postal Code</Label>
                    <Input
                      id="detail-postal"
                      defaultValue={customer.postalCode || ""}
                      key={`postalCode-${customer.postalCode}`}
                      onBlur={(e) => handleFieldSave("postalCode", e.target.value)}
                      data-testid="input-detail-postal"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                defaultValue={customer.notes || ""}
                key={`notes-${customer.notes}`}
                onBlur={(e) => handleFieldSave("notes", e.target.value)}
                placeholder="Any additional notes about this customer..."
                rows={4}
                data-testid="input-detail-notes"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Projects linked to this customer
            </p>
            <Button
              onClick={() => createProjectMutation.mutate()}
              disabled={createProjectMutation.isPending}
              data-testid="button-new-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createProjectMutation.isPending ? "Creating..." : "New Project"}
            </Button>
          </div>

          {customerProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a project to start estimating for this customer
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {customerProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`card-project-${project.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {project.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{project.address}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(project.createdAt).toLocaleDateString("en-CA")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ProjectStatusBadge status={project.status} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Invoiced</p>
                    <p className="text-lg font-semibold" data-testid="text-total-invoiced">
                      ${totalInvoiced.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-semibold" data-testid="text-total-paid">
                      ${totalPaid.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/10 dark:bg-amber-500/20 flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-lg font-semibold" data-testid="text-outstanding">
                      ${outstanding.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {customerInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                  <DollarSign className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invoices linked to this customer will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {customerInvoices.map((invoice) => {
                const linkedProject = (allProjects || []).find(p => p.id === invoice.projectId);
                return (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <Card
                      className="hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`card-invoice-${invoice.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-chart-2/10 dark:bg-chart-2/20 flex-shrink-0">
                              <FileText className="w-4 h-4 text-chart-2" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {invoice.invoiceNumber}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {linkedProject && (
                                  <span className="truncate">{linkedProject.name}</span>
                                )}
                                <span>
                                  {new Date(invoice.invoiceDate).toLocaleDateString("en-CA")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-semibold">
                              ${(invoice.total || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <InvoiceStatusBadge status={invoice.status} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

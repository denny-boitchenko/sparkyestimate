import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FileText, DollarSign, Clock, CheckCircle, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, Project, Customer } from "@shared/schema";

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

function InvoiceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Draft</Badge>;
    case "sent":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" data-testid={`badge-status-${status}`}>Sent</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" data-testid={`badge-status-${status}`}>Paid</Badge>;
    case "overdue":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Overdue</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentDate }: { id: number; status: string; paymentDate?: string | null }) => {
      await apiRequest("PATCH", `/api/invoices/${id}`, { status, paymentDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getProjectName = (projectId: number) => {
    return projects?.find(p => p.id === projectId)?.name || "Unknown Project";
  };

  const getCustomerName = (customerId: number | null, projectId: number) => {
    if (customerId) {
      const customer = customers?.find(c => c.id === customerId);
      if (customer) return customer.name;
    }
    const project = projects?.find(p => p.id === projectId);
    return project?.clientName || "Unknown";
  };

  const filtered = (invoices || []).filter(inv => {
    if (statusFilter === "all") return true;
    return inv.status === statusFilter;
  });

  const allInvoices = invoices || [];
  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = allInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = allInvoices.filter(inv => inv.status !== "paid").reduce((sum, inv) => sum + inv.total, 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-invoices-title">Invoices</h1>
        <Badge variant="secondary" data-testid="badge-invoice-count">{allInvoices.length}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-invoiced">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-invoiced">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-paid">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-paid">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-outstanding">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className={statusFilter === f.value ? "toggle-elevate toggle-elevated" : ""}
            data-testid={`button-filter-${f.value}`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {allInvoices.filter(inv => inv.status === f.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No invoices found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {statusFilter !== "all"
                ? "Try changing the status filter"
                : "Create an invoice from a project estimate to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(invoice => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      data-testid={`row-invoice-${invoice.id}`}
                    >
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`} data-testid={`link-invoice-${invoice.id}`}>
                          <span className="text-sm font-medium hover:underline">{invoice.invoiceNumber}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`}>
                          <span className="text-sm">{getProjectName(invoice.projectId)}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{getCustomerName(invoice.customerId, invoice.projectId)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(invoice.invoiceDate).toLocaleDateString("en-CA")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-CA") : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{formatCurrency(invoice.total)}</span>
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-menu-${invoice.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status !== "sent" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: "sent" })}
                                data-testid={`button-mark-sent-${invoice.id}`}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== "paid" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({
                                  id: invoice.id,
                                  status: "paid",
                                  paymentDate: new Date().toISOString(),
                                })}
                                data-testid={`button-mark-paid-${invoice.id}`}
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(invoice.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${invoice.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
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
    </div>
  );
}

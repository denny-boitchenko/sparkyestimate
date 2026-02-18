import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { FileText, DollarSign, Clock, CheckCircle, MoreHorizontal, Send, Trash2, Users, Search, ArrowUpDown } from "lucide-react";
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
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date_newest");
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

  // Unique customers that have invoices
  const invoiceCustomerIds = Array.from(new Set((invoices || []).map(inv => inv.customerId).filter((v): v is number => !!v)));
  const invoiceCustomers = (customers || []).filter(c => invoiceCustomerIds.includes(c.id));

  const getEffectiveStatus = (inv: Invoice) => {
    if (inv.status === "paid") return "paid";
    if (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "paid") return "overdue";
    return inv.status;
  };

  const filtered = (invoices || []).filter(inv => {
    const effectiveStatus = getEffectiveStatus(inv);
    if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
    if (customerFilter !== "all" && String(inv.customerId) !== customerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const projectName = getProjectName(inv.projectId);
      const custName = getCustomerName(inv.customerId, inv.projectId);
      if (![inv.invoiceNumber, projectName, custName].some(f => f?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date_newest": return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
      case "date_oldest": return new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      case "amount_high": return b.total - a.total;
      case "amount_low": return a.total - b.total;
      case "invoice_number": return a.invoiceNumber.localeCompare(b.invoiceNumber);
      default: return 0;
    }
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

      <div className="flex items-center gap-4 flex-wrap">
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
                  {allInvoices.filter(inv => getEffectiveStatus(inv) === f.value).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-search"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9" data-testid="select-sort">
            <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_newest">Newest First</SelectItem>
            <SelectItem value="date_oldest">Oldest First</SelectItem>
            <SelectItem value="amount_high">Amount (High)</SelectItem>
            <SelectItem value="amount_low">Amount (Low)</SelectItem>
            <SelectItem value="invoice_number">Invoice #</SelectItem>
          </SelectContent>
        </Select>

        {invoiceCustomers.length > 0 && (
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[200px] h-9" data-testid="select-customer-filter">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {invoiceCustomers.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No invoices found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search || statusFilter !== "all" || customerFilter !== "all"
                ? "Try changing the filters or search term"
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
                  {sorted.map(invoice => (
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
                        <InvoiceStatusBadge status={getEffectiveStatus(invoice)} />
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
                              onClick={() => setDeleteTarget(invoice)}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {deleteTarget?.invoiceNumber} and all its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

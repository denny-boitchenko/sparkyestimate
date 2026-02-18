import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Search, ArrowUpDown } from "lucide-react";
import type { Customer, Project } from "@shared/schema";
import { Link } from "wouter";

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
}

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

const emptyForm: CustomerFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
};

function CustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer | null;
}) {
  const { toast } = useToast();
  const isEditing = !!customer;

  const [form, setForm] = useState<CustomerFormData>(
    customer
      ? {
          name: customer.name,
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          province: customer.province || "",
          postalCode: customer.postalCode || "",
          notes: customer.notes || "",
        }
      : { ...emptyForm }
  );

  const resetAndClose = () => {
    setForm({ ...emptyForm });
    onOpenChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer created successfully" });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await apiRequest("PATCH", `/api/customers/${customer!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated successfully" });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input
              id="customer-name"
              placeholder="Customer name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              data-testid="input-customer-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                data-testid="input-customer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                data-testid="input-customer-phone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Address</Label>
            <Input
              id="customer-address"
              placeholder="123 Main St"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              data-testid="input-customer-address"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer-city">City</Label>
              <Input
                id="customer-city"
                placeholder="Toronto"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                data-testid="input-customer-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-province">Province</Label>
              <Select
                value={form.province || ""}
                onValueChange={(v) => setForm((p) => ({ ...p, province: v }))}
              >
                <SelectTrigger id="customer-province" data-testid="input-customer-province">
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
              <Label htmlFor="customer-postal-code">Postal Code</Label>
              <Input
                id="customer-postal-code"
                placeholder="M5V 1A1"
                value={form.postalCode}
                onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                data-testid="input-customer-postal-code"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea
              id="customer-notes"
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              data-testid="input-customer-notes"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-customer">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-customer">
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Add Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState("name_asc");
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectCountByCustomer = (projects || []).reduce<Record<number, number>>((acc, p) => {
    if (p.customerId) {
      acc[p.customerId] = (acc[p.customerId] || 0) + 1;
    }
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const formatLocation = (c: Customer) => {
    const parts = [c.city, c.province, c.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  const filtered = (customers || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.name, c.email, c.phone, c.city, c.province].some(
      f => f?.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "projects_most": return (projectCountByCustomer[b.id] || 0) - (projectCountByCustomer[a.id] || 0);
      case "location": return formatLocation(a).localeCompare(formatLocation(b));
      default: return 0;
    }
  });

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCustomer(null);
    }
    setDialogOpen(open);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-customers-title">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer database
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-customer">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[170px] h-9" data-testid="select-sort">
            <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            <SelectItem value="projects_most">Most Projects</SelectItem>
            <SelectItem value="location">Location</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" data-testid="text-customer-count">
          {sorted.length} customer{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No customers found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search
                ? "Try adjusting your search"
                : "Add your first customer to get started"}
            </p>
            {!search && (
              <Button onClick={openCreateDialog} className="mt-4" data-testid="button-empty-add-customer">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      data-testid={`row-customer-${customer.id}`}
                      onClick={() => openEditDialog(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium" data-testid={`text-customer-name-${customer.id}`}>
                            {customer.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-customer-email-${customer.id}`}>
                          {customer.email || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-customer-phone-${customer.id}`}>
                          {customer.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-customer-location-${customer.id}`}>
                          {formatLocation(customer)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {projectCountByCustomer[customer.id] ? (
                          <Link href={`/projects?customer=${customer.id}`}>
                            <Badge variant="secondary" data-testid={`text-customer-projects-${customer.id}`}>
                              {projectCountByCustomer[customer.id]} project{projectCountByCustomer[customer.id] !== 1 ? "s" : ""}
                            </Badge>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground" data-testid={`text-customer-projects-${customer.id}`}>
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(customer)}
                            data-testid={`button-edit-customer-${customer.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(customer)}
                            data-testid={`button-delete-customer-${customer.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <CustomerDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          customer={editingCustomer}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
              {deleteTarget && projectCountByCustomer[deleteTarget.id] > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  This customer has {projectCountByCustomer[deleteTarget.id]} linked project{projectCountByCustomer[deleteTarget.id] !== 1 ? "s" : ""} that will be unlinked.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

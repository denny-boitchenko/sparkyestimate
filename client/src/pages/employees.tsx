import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, HardHat, DollarSign, Search, ArrowUpDown } from "lucide-react";

const ROLES = [
  { value: "electrician", label: "Electrician" },
  { value: "journeyman", label: "Journeyman" },
  { value: "foreman", label: "Foreman" },
  { value: "apprentice_1", label: "Apprentice (1st Year)" },
  { value: "apprentice_2", label: "Apprentice (2nd Year)" },
  { value: "apprentice_3", label: "Apprentice (3rd Year)" },
  { value: "apprentice_4", label: "Apprentice (4th Year)" },
  { value: "helper", label: "Helper/Labourer" },
];

export default function Employees() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "rate_high" | "rate_low">("name_asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "electrician",
    hourlyRate: "85",
    isActive: true,
  });

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee added" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee updated" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({ name: "", role: "electrician", hourlyRate: "85", isActive: true });
    setEditingEmployee(null);
    setDialogOpen(false);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      hourlyRate: String(emp.hourlyRate),
      isActive: emp.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      role: formData.role,
      hourlyRate: parseFloat(formData.hourlyRate) || 85,
      isActive: formData.isActive,
    };
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const activeEmployees = employees?.filter((e) => e.isActive) || [];
  const avgRate = activeEmployees.length
    ? activeEmployees.reduce((sum, e) => sum + e.hourlyRate, 0) / activeEmployees.length
    : 0;

  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;

  const filtered = (employees || []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.name, getRoleLabel(e.role)].some(f => f?.toLowerCase().includes(q));
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "rate_high": return b.hourlyRate - a.hourlyRate;
      case "rate_low": return a.hourlyRate - b.hourlyRate;
      default: return 0;
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-employees-title">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team and labor rates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Name *</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-employee-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger data-testid="select-employee-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-rate">Hourly Rate ($)</Label>
                <Input
                  id="emp-rate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  data-testid="input-employee-rate"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  data-testid="switch-employee-active"
                />
                <Label>Active</Label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-employee"
              >
                {editingEmployee ? "Update Employee" : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {employees && employees.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-employees"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44" data-testid="select-sort-employees">
              <ArrowUpDown className="w-3 h-3 mr-1.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="rate_high">Rate (High-Low)</SelectItem>
              <SelectItem value="rate_low">Rate (Low-High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-employees">
              {employees?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeEmployees.length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-rate">
              ${avgRate.toFixed(2)}/hr
            </div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost Range</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rate-range">
              {activeEmployees.length
                ? `$${Math.min(...activeEmployees.map((e) => e.hourlyRate)).toFixed(0)} - $${Math.max(...activeEmployees.map((e) => e.hourlyRate)).toFixed(0)}`
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground">Hourly rate range</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !employees?.length ? (
            /* empty state — no employees at all */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HardHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No employees yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first employee to start tracking labor rates
              </p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium">No matching employees</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Hourly Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((emp) => (
                  <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                    <TableCell className="font-medium" data-testid={`text-employee-name-${emp.id}`}>
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ROLES.find(r => r.value === emp.role)?.label || emp.role}
                    </TableCell>
                    <TableCell className="text-right font-mono" data-testid={`text-employee-rate-${emp.id}`}>
                      ${emp.hourlyRate.toFixed(2)}/hr
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.isActive ? "default" : "secondary"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(emp)}
                          data-testid={`button-edit-employee-${emp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-employee-${emp.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {emp.name}? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(emp.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-delete-employee-${emp.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

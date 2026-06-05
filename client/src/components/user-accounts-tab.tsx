import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, KeyRound, UserPlus, ShieldCheck } from "lucide-react";
import { parseApiError } from "@/lib/utils";

type AppUser = { id: number; username: string; role: string; isActive: boolean; createdAt: string };
type Employee = { id: number; name: string; role: string; pin: string | null; isActive: boolean };

function err(toast: any, e: any, fallback: string) {
  toast({ title: "Action failed", description: parseApiError(e, fallback), variant: "destructive" });
}

// ───────────────────────── Users ─────────────────────────
function UsersSection() {
  const { toast } = useToast();
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/users"] });

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("estimator");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

  const createUser = useMutation({
    mutationFn: () => apiRequest("POST", "/api/users", { username: newUsername, password: newPassword, role: newRole }),
    onSuccess: () => { setNewUsername(""); setNewPassword(""); setNewRole("estimator"); invalidate(); toast({ title: "User created" }); },
    onError: (e) => err(toast, e, "Could not create user"),
  });

  const patchUser = useMutation({
    mutationFn: (vars: { id: number; data: any }) => apiRequest("PATCH", `/api/users/${vars.id}`, vars.data),
    onSuccess: () => { setEditingId(null); setEditPassword(""); invalidate(); toast({ title: "User updated" }); },
    onError: (e) => err(toast, e, "Could not update user"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "User removed" }); },
    onError: (e) => err(toast, e, "Could not remove user"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Users</CardTitle>
        <p className="text-sm text-muted-foreground">App logins. Admins can manage everything; estimators can use the app but not these settings.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add user */}
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-44" placeholder="min 8 characters" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estimator">Estimator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => createUser.mutate()} disabled={!newUsername || newPassword.length < 8 || createUser.isPending}>
            <UserPlus className="h-4 w-4 mr-1" /> Add user
          </Button>
        </div>

        {/* User list */}
        <div className="divide-y rounded-md border">
          {users.map((u) => (
            <div key={u.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{u.username}</span>
                  <span className="text-xs rounded px-2 py-0.5 bg-muted">{u.role}</span>
                  {!u.isActive && <span className="text-xs text-destructive">inactive</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditUsername(u.username); setEditPassword(""); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => patchUser.mutate({ id: u.id, data: { isActive: !u.isActive } })}>
                    {u.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete user "${u.username}"?`)) deleteUser.mutate(u.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {editingId === u.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-3">
                  <div className="space-y-1">
                    <Label>Username</Label>
                    <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-40" />
                  </div>
                  <div className="space-y-1">
                    <Label>New password</Label>
                    <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-44" placeholder="leave blank to keep" />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={u.role} onValueChange={(v) => patchUser.mutate({ id: u.id, data: { role: v } })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimator">Estimator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      const data: any = {};
                      if (editUsername && editUsername !== u.username) data.username = editUsername;
                      if (editPassword) data.password = editPassword;
                      if (Object.keys(data).length === 0) { setEditingId(null); return; }
                      patchUser.mutate({ id: u.id, data });
                    }}
                    disabled={patchUser.isPending || (!!editPassword && editPassword.length < 8)}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────── Employee PINs ────────────────────
function EmployeePinSection() {
  const { toast } = useToast();
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinEdits, setPinEdits] = useState<Record<number, string>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

  const addEmployee = useMutation({
    mutationFn: () => apiRequest("POST", "/api/employees", { name: newName, pin: newPin || null }),
    onSuccess: () => { setNewName(""); setNewPin(""); invalidate(); toast({ title: "Employee added" }); },
    onError: (e) => err(toast, e, "Could not add employee"),
  });
  const setPin = useMutation({
    mutationFn: (vars: { id: number; pin: string | null }) => apiRequest("PATCH", `/api/employees/${vars.id}`, { pin: vars.pin }),
    onSuccess: () => { invalidate(); toast({ title: "PIN updated" }); },
    onError: (e) => err(toast, e, "Could not update PIN"),
  });
  const removeEmployee = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Employee removed" }); },
    onError: (e) => err(toast, e, "Could not remove employee"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Employee PINs</CardTitle>
        <p className="text-sm text-muted-foreground">PINs let field employees sign in to the mobile portal at <span className="font-mono">/employee</span>. Clear a PIN to revoke portal access.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="space-y-1">
            <Label>Employee name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-1">
            <Label>PIN (optional)</Label>
            <Input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-32" placeholder="e.g. 4821" inputMode="numeric" />
          </div>
          <Button onClick={() => addEmployee.mutate()} disabled={!newName || addEmployee.isPending}>
            <UserPlus className="h-4 w-4 mr-1" /> Add employee
          </Button>
        </div>

        <div className="divide-y rounded-md border">
          {employees.map((emp) => {
            const draft = pinEdits[emp.id] ?? (emp.pin || "");
            return (
              <div key={emp.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{emp.name}</span>
                  <span className="text-xs rounded px-2 py-0.5 bg-muted">{emp.role}</span>
                  {emp.pin ? <span className="text-xs text-green-600">portal enabled</span> : <span className="text-xs text-muted-foreground">no PIN</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    value={draft}
                    onChange={(e) => setPinEdits((p) => ({ ...p, [emp.id]: e.target.value.replace(/\D/g, "") }))}
                    className="w-24"
                    placeholder="PIN"
                    inputMode="numeric"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setPin.mutate({ id: emp.id, pin: draft || null })} disabled={setPin.isPending}>
                    Save PIN
                  </Button>
                  {emp.pin && (
                    <Button variant="ghost" size="sm" onClick={() => { setPinEdits((p) => ({ ...p, [emp.id]: "" })); setPin.mutate({ id: emp.id, pin: null }); }}>
                      Clear
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove employee "${emp.name}"?`)) removeEmployee.mutate(emp.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserAccountsTab() {
  return (
    <div className="space-y-6">
      <UsersSection />
      <EmployeePinSection />
    </div>
  );
}

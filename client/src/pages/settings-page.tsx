import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DollarSign, Percent, Wrench, Save, CheckCircle2, Shield,
  Plus, Pencil, Trash2, Cable, Package, Settings, Upload
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Setting, DeviceAssembly, WireType, ServiceBundle, ComplianceDocument, SupplierImport } from "@shared/schema";
import { DEVICE_CATEGORIES } from "@shared/schema";

interface SettingsData {
  laborRate: string;
  overheadPct: string;
  profitPct: string;
  materialMarkup: string;
  laborMarkup: string;
  wasteFactor: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
}

const defaultSettings: SettingsData = {
  laborRate: "85",
  overheadPct: "15",
  profitPct: "10",
  materialMarkup: "0",
  laborMarkup: "0",
  wasteFactor: "15",
  companyName: "",
  companyPhone: "",
  companyEmail: "",
};

interface DeviceFormData {
  name: string;
  category: string;
  device: string;
  boxType: string;
  coverPlate: string;
  miscParts: string;
  wireType: string;
  wireFootage: string;
  laborHours: string;
  materialCost: string;
}

const defaultDeviceForm: DeviceFormData = {
  name: "",
  category: "receptacles",
  device: "",
  boxType: "",
  coverPlate: "",
  miscParts: "",
  wireType: "",
  wireFootage: "15",
  laborHours: "0.18",
  materialCost: "0",
};

interface WireTypeFormData {
  name: string;
  costPerFoot: string;
}

interface ServiceFormData {
  name: string;
  items: string;
  materialCost: string;
  laborHours: string;
}

const defaultServiceForm: ServiceFormData = {
  name: "",
  items: "",
  materialCost: "0",
  laborHours: "0",
};

function GeneralTab({ form, setForm, onSave, isSaving }: {
  form: SettingsData;
  setForm: (fn: (prev: SettingsData) => SettingsData) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={isSaving}
          data-testid="button-save-settings"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-chart-3" />
              Default Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="laborRate">Labor Rate ($ per hour)</Label>
              <Input
                id="laborRate"
                type="number"
                step="0.01"
                value={form.laborRate}
                onChange={(e) => setForm(p => ({ ...p, laborRate: e.target.value }))}
                data-testid="input-setting-labor-rate"
              />
              <p className="text-xs text-muted-foreground">Base hourly rate for labor calculations</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="overheadPct">Overhead %</Label>
                <Input
                  id="overheadPct"
                  type="number"
                  step="0.1"
                  value={form.overheadPct}
                  onChange={(e) => setForm(p => ({ ...p, overheadPct: e.target.value }))}
                  data-testid="input-setting-overhead"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitPct">Profit %</Label>
                <Input
                  id="profitPct"
                  type="number"
                  step="0.1"
                  value={form.profitPct}
                  onChange={(e) => setForm(p => ({ ...p, profitPct: e.target.value }))}
                  data-testid="input-setting-profit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="materialMarkup">Material Markup %</Label>
                <Input
                  id="materialMarkup"
                  type="number"
                  step="0.1"
                  value={form.materialMarkup}
                  onChange={(e) => setForm(p => ({ ...p, materialMarkup: e.target.value }))}
                  data-testid="input-setting-material-markup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laborMarkup">Labor Markup %</Label>
                <Input
                  id="laborMarkup"
                  type="number"
                  step="0.1"
                  value={form.laborMarkup}
                  onChange={(e) => setForm(p => ({ ...p, laborMarkup: e.target.value }))}
                  data-testid="input-setting-labor-markup"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wasteFactor">Wire Waste Factor %</Label>
              <Input
                id="wasteFactor"
                type="number"
                step="0.1"
                value={form.wasteFactor}
                onChange={(e) => setForm(p => ({ ...p, wasteFactor: e.target.value }))}
                data-testid="input-setting-waste"
              />
              <p className="text-xs text-muted-foreground">Added to wire footage calculations (default 15%)</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your Electrical Company"
                  value={form.companyName}
                  onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))}
                  data-testid="input-company-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    placeholder="(555) 123-4567"
                    value={form.companyPhone}
                    onChange={(e) => setForm(p => ({ ...p, companyPhone: e.target.value }))}
                    data-testid="input-company-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="info@company.com"
                    value={form.companyEmail}
                    onChange={(e) => setForm(p => ({ ...p, companyEmail: e.target.value }))}
                    data-testid="input-company-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-chart-3" />
                CEC 2021 Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Code Standard</span>
                <Badge variant="outline">CEC 2021 (C22.1:21)</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">GFCI Requirements</span>
                <Badge variant="default">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">AFCI Requirements</span>
                <Badge variant="default">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Smoke Detector Rules</span>
                <Badge variant="default">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                All estimates are automatically checked against CEC 2021 requirements
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MaterialsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>(defaultDeviceForm);

  const { data: assemblies, isLoading } = useQuery<DeviceAssembly[]>({
    queryKey: ["/api/device-assemblies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeviceFormData) => {
      await apiRequest("POST", "/api/device-assemblies", {
        name: data.name,
        category: "receptacles",
        device: data.name,
        boxType: null,
        coverPlate: null,
        miscParts: null,
        wireType: null,
        wireFootage: 15,
        laborHours: 0.18,
        materialCost: parseFloat(data.materialCost) || 0,
        supplier: data.miscParts || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
      toast({ title: "Device assembly created" });
      setDialogOpen(false);
      setDeviceForm(defaultDeviceForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/device-assemblies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/device-assemblies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
      toast({ title: "Device assembly deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setDeviceForm(defaultDeviceForm);
    setDialogOpen(true);
  };

  const handleInlineBlur = (id: number, field: string, newValue: string, originalValue: string | number | null | undefined) => {
    const orig = originalValue == null ? "" : String(originalValue);
    if (newValue === orig) return;
    const numericFields = ["materialCost", "laborHours", "wireFootage"];
    const payload: Record<string, unknown> = {};
    if (numericFields.includes(field)) {
      payload[field] = parseFloat(newValue) || 0;
    } else {
      payload[field] = newValue || null;
    }
    updateMutation.mutate({ id, data: payload });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-add-device">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assemblies && assemblies.length > 0 ? assemblies.map((a) => (
                <TableRow key={a.id} data-testid={`row-device-${a.id}`}>
                  <TableCell>
                    <Input
                      key={`name-${a.id}-${a.name}`}
                      defaultValue={a.name}
                      onBlur={(e) => handleInlineBlur(a.id, "name", e.target.value, a.name)}
                      className="min-w-[120px]"
                      data-testid={`input-device-name-${a.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`materialCost-${a.id}-${a.materialCost}`}
                      type="number"
                      step="0.01"
                      defaultValue={a.materialCost}
                      onBlur={(e) => handleInlineBlur(a.id, "materialCost", e.target.value, a.materialCost)}
                      className="w-24"
                      data-testid={`input-device-material-${a.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`supplier-${a.id}-${a.supplier}`}
                      defaultValue={a.supplier || ""}
                      onBlur={(e) => handleInlineBlur(a.id, "supplier", e.target.value, a.supplier)}
                      className="min-w-[100px]"
                      data-testid={`input-device-supplier-${a.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(a.id)}
                      data-testid={`button-delete-device-${a.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No device assemblies found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Device Assembly</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) => setDeviceForm(p => ({ ...p, name: e.target.value }))}
                data-testid="input-device-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={deviceForm.materialCost}
                onChange={(e) => setDeviceForm(p => ({ ...p, materialCost: e.target.value }))}
                data-testid="input-device-material-cost"
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                value={deviceForm.miscParts}
                onChange={(e) => setDeviceForm(p => ({ ...p, miscParts: e.target.value }))}
                placeholder="Supplier name"
                data-testid="input-device-supplier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-device"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(deviceForm)}
              disabled={createMutation.isPending}
              data-testid="button-submit-device"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WireTypesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wireForm, setWireForm] = useState<WireTypeFormData>({ name: "", costPerFoot: "0" });

  const { data: wireTypesData, isLoading } = useQuery<WireType[]>({
    queryKey: ["/api/wire-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: WireTypeFormData) => {
      await apiRequest("POST", "/api/wire-types", {
        name: data.name,
        costPerFoot: parseFloat(data.costPerFoot) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wire-types"] });
      toast({ title: "Wire type created" });
      setDialogOpen(false);
      setWireForm({ name: "", costPerFoot: "0" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/wire-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wire-types"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/wire-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wire-types"] });
      toast({ title: "Wire type deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleInlineBlur = (id: number, field: string, newValue: string, originalValue: string | number | null | undefined) => {
    const orig = originalValue == null ? "" : String(originalValue);
    if (newValue === orig) return;
    const payload: Record<string, unknown> = {};
    if (field === "costPerFoot") {
      payload[field] = parseFloat(newValue) || 0;
    } else {
      payload[field] = newValue || null;
    }
    updateMutation.mutate({ id, data: payload });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-wire-type">
          <Plus className="w-4 h-4 mr-2" />
          Add Wire Type
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cost per Foot</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wireTypesData && wireTypesData.length > 0 ? wireTypesData.map((wt) => (
                <TableRow key={wt.id} data-testid={`row-wire-type-${wt.id}`}>
                  <TableCell>
                    <Input
                      key={`name-${wt.id}-${wt.name}`}
                      defaultValue={wt.name}
                      onBlur={(e) => handleInlineBlur(wt.id, "name", e.target.value, wt.name)}
                      className="min-w-[140px]"
                      data-testid={`input-wire-name-${wt.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`cost-${wt.id}-${wt.costPerFoot}`}
                      type="number"
                      step="0.01"
                      defaultValue={wt.costPerFoot}
                      onBlur={(e) => handleInlineBlur(wt.id, "costPerFoot", e.target.value, wt.costPerFoot)}
                      className="w-24"
                      data-testid={`input-wire-cost-${wt.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`supplier-${wt.id}-${wt.supplier}`}
                      defaultValue={wt.supplier || ""}
                      onBlur={(e) => handleInlineBlur(wt.id, "supplier", e.target.value, wt.supplier)}
                      className="min-w-[100px]"
                      data-testid={`input-wire-supplier-${wt.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(wt.id)}
                      data-testid={`button-delete-wire-type-${wt.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No wire types found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Wire Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={wireForm.name}
                onChange={(e) => setWireForm(p => ({ ...p, name: e.target.value }))}
                data-testid="input-wire-type-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost per Foot ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={wireForm.costPerFoot}
                onChange={(e) => setWireForm(p => ({ ...p, costPerFoot: e.target.value }))}
                data-testid="input-wire-type-cost"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-wire-type"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(wireForm)}
              disabled={createMutation.isPending}
              data-testid="button-submit-wire-type"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServicesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>(defaultServiceForm);

  const { data: bundles, isLoading } = useQuery<ServiceBundle[]>({
    queryKey: ["/api/service-bundles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      await apiRequest("POST", "/api/service-bundles", {
        name: data.name,
        items: data.items.split("\n").map(s => s.trim()).filter(Boolean),
        materialCost: parseFloat(data.materialCost) || 0,
        laborHours: parseFloat(data.laborHours) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-bundles"] });
      toast({ title: "Service bundle created" });
      setDialogOpen(false);
      setServiceForm(defaultServiceForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ServiceFormData }) => {
      await apiRequest("PATCH", `/api/service-bundles/${id}`, {
        name: data.name,
        items: data.items.split("\n").map(s => s.trim()).filter(Boolean),
        materialCost: parseFloat(data.materialCost) || 0,
        laborHours: parseFloat(data.laborHours) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-bundles"] });
      toast({ title: "Service bundle updated" });
      setDialogOpen(false);
      setEditingId(null);
      setServiceForm(defaultServiceForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/service-bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-bundles"] });
      toast({ title: "Service bundle deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (bundle: ServiceBundle) => {
    setEditingId(bundle.id);
    const items = Array.isArray(bundle.items) ? (bundle.items as string[]).join("\n") : "";
    setServiceForm({
      name: bundle.name,
      items,
      materialCost: String(bundle.materialCost),
      laborHours: String(bundle.laborHours),
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setServiceForm(defaultServiceForm);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: serviceForm });
    } else {
      createMutation.mutate(serviceForm);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-add-service-bundle">
          <Plus className="w-4 h-4 mr-2" />
          Add Service Bundle
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Material $</TableHead>
                <TableHead>Labor Hrs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles && bundles.length > 0 ? bundles.map((b) => (
                <TableRow key={b.id} data-testid={`row-service-${b.id}`}>
                  <TableCell className="font-medium" data-testid={`text-service-name-${b.id}`}>{b.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(b.items) && (b.items as string[]).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-service-item-${b.id}-${i}`}>
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-service-material-${b.id}`}>${b.materialCost.toFixed(2)}</TableCell>
                  <TableCell data-testid={`text-service-labor-${b.id}`}>{b.laborHours}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(b)}
                        data-testid={`button-edit-service-${b.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(b.id)}
                        data-testid={`button-delete-service-${b.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No service bundles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service Bundle" : "Add Service Bundle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm(p => ({ ...p, name: e.target.value }))}
                data-testid="input-service-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Items (one per line)</Label>
              <Textarea
                value={serviceForm.items}
                onChange={(e) => setServiceForm(p => ({ ...p, items: e.target.value }))}
                rows={4}
                data-testid="input-service-items"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Material Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceForm.materialCost}
                  onChange={(e) => setServiceForm(p => ({ ...p, materialCost: e.target.value }))}
                  data-testid="input-service-material-cost"
                />
              </div>
              <div className="space-y-2">
                <Label>Labor Hours</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceForm.laborHours}
                  onChange={(e) => setServiceForm(p => ({ ...p, laborHours: e.target.value }))}
                  data-testid="input-service-labor-hours"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-service"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-service"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (editingId ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CecDocumentsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docVersion, setDocVersion] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useQuery<ComplianceDocument[]>({
    queryKey: ["/api/compliance-documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!docFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("name", docName || "CEC Document");
      formData.append("version", docVersion);
      formData.append("file", docFile);
      const res = await fetch("/api/compliance-documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      toast({ title: "CEC document uploaded" });
      setDialogOpen(false);
      setDocName("");
      setDocVersion("");
      setDocFile(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/compliance-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      toast({ title: "Document deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-upload-cec-document">
          <Upload className="w-4 h-4 mr-2" />
          Upload CEC Document
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents && documents.length > 0 ? documents.map((doc) => (
                <TableRow key={doc.id} data-testid={`row-cec-doc-${doc.id}`}>
                  <TableCell className="font-medium" data-testid={`text-cec-name-${doc.id}`}>{doc.name}</TableCell>
                  <TableCell data-testid={`text-cec-version-${doc.id}`}>{doc.version || "-"}</TableCell>
                  <TableCell data-testid={`text-cec-size-${doc.id}`}>{formatFileSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={doc.isActive ? "default" : "secondary"}
                      data-testid={`badge-cec-status-${doc.id}`}
                    >
                      {doc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-cec-uploaded-${doc.id}`}>
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      data-testid={`button-delete-cec-doc-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No CEC documents uploaded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload CEC Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="CEC 2021"
                data-testid="input-cec-doc-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                placeholder="C22.1:21"
                data-testid="input-cec-doc-version"
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                data-testid="input-cec-doc-file"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-cec-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !docFile}
              data-testid="button-submit-cec-upload"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierImportTab() {
  const { toast } = useToast();
  const [supplierName, setSupplierName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewImportId, setPreviewImportId] = useState<number | null>(null);
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: importHistory, isLoading } = useQuery<SupplierImport[]>({
    queryKey: ["/api/supplier-imports"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("supplierName", supplierName || "Unknown Supplier");
      formData.append("file", importFile);
      const res = await fetch("/api/supplier-imports/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setPreviewData(data.previewData);
      setPreviewImportId(data.id);
      setSkippedIndices(new Set());
      toast({ title: "File processed", description: "Review items below before committing" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!previewImportId || !previewData) throw new Error("No preview data");
      const items = (previewData.items || []).map((item: any, idx: number) => ({
        ...item,
        skip: skippedIndices.has(idx),
      }));
      const res = await apiRequest("POST", `/api/supplier-imports/${previewImportId}/commit`, { items });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wire-types"] });
      toast({ title: "Import complete", description: data.message || "Items imported successfully" });
      setPreviewData(null);
      setPreviewImportId(null);
      setSkippedIndices(new Set());
      setImportFile(null);
      setSupplierName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleSkip = (index: number) => {
    setSkippedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Supplier Price List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Nedco, Sonepar"
                data-testid="input-supplier-name"
              />
            </div>
            <div className="space-y-2">
              <Label>File (CSV or PDF)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                data-testid="input-supplier-file"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !importFile}
              data-testid="button-upload-supplier"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? "Processing..." : "Upload & Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewData && previewData.items && previewData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between gap-2 flex-wrap">
              <span>Preview ({previewData.items.length} items found)</span>
              <Button
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending}
                data-testid="button-commit-import"
              >
                {commitMutation.isPending ? "Importing..." : "Commit Import"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Skip</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.items.map((item: any, idx: number) => (
                  <TableRow key={idx} data-testid={`row-preview-item-${idx}`} className={skippedIndices.has(idx) ? "opacity-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={skippedIndices.has(idx)}
                        onCheckedChange={() => toggleSkip(idx)}
                        data-testid={`checkbox-skip-item-${idx}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-preview-name-${idx}`}>{item.name}</TableCell>
                    <TableCell data-testid={`text-preview-category-${idx}`}>
                      <Badge variant="outline" className="text-xs">{item.category || "materials"}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-preview-cost-${idx}`}>
                      ${(item.materialCost || item.costPerFoot || 0).toFixed(2)}
                    </TableCell>
                    <TableCell data-testid={`text-preview-supplier-${idx}`}>{item.supplier || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {importHistory && importHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Import History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((imp) => (
                  <TableRow key={imp.id} data-testid={`row-import-history-${imp.id}`}>
                    <TableCell className="font-medium" data-testid={`text-import-supplier-${imp.id}`}>{imp.supplierName}</TableCell>
                    <TableCell data-testid={`text-import-file-${imp.id}`}>{imp.fileName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={imp.status === "completed" ? "default" : "secondary"}
                        data-testid={`badge-import-status-${imp.id}`}
                      >
                        {imp.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-import-count-${imp.id}`}>{imp.importedCount}</TableCell>
                    <TableCell data-testid={`text-import-date-${imp.id}`}>
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EstimateTemplateTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<Setting[]>({ queryKey: ["/api/settings"] });

  const sm = new Map((settings || []).map(s => [s.key, s.value]));

  const [templateForm, setTemplateForm] = useState({
    companyName: "",
    companyPhone: "",
    companyEmail: "",
    companyAddress: "",
    gstRate: "5",
    gstLabel: "GST 5%",
    estimateNotes: "",
    estimateTerms: "",
  });

  useEffect(() => {
    if (settings) {
      setTemplateForm({
        companyName: sm.get("companyName") || "",
        companyPhone: sm.get("companyPhone") || "",
        companyEmail: sm.get("companyEmail") || "",
        companyAddress: sm.get("companyAddress") || "",
        gstRate: sm.get("gstRate") || "5",
        gstLabel: sm.get("gstLabel") || "GST 5%",
        estimateNotes: sm.get("estimateNotes") || "",
        estimateTerms: sm.get("estimateTerms") || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof templateForm) => {
      await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Template settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Client Estimate Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={templateForm.companyName}
              onChange={(e) => setTemplateForm(p => ({ ...p, companyName: e.target.value }))}
              placeholder="Your Company Name"
              data-testid="input-company-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Company Address</Label>
            <Input
              value={templateForm.companyAddress}
              onChange={(e) => setTemplateForm(p => ({ ...p, companyAddress: e.target.value }))}
              placeholder="123 Main St, City, Province"
              data-testid="input-company-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Phone</Label>
              <Input
                value={templateForm.companyPhone}
                onChange={(e) => setTemplateForm(p => ({ ...p, companyPhone: e.target.value }))}
                placeholder="(555) 123-4567"
                data-testid="input-company-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Email</Label>
              <Input
                value={templateForm.companyEmail}
                onChange={(e) => setTemplateForm(p => ({ ...p, companyEmail: e.target.value }))}
                placeholder="info@company.com"
                data-testid="input-company-email"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={templateForm.gstRate}
                onChange={(e) => setTemplateForm(p => ({ ...p, gstRate: e.target.value }))}
                data-testid="input-gst-rate"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Label</Label>
              <Input
                value={templateForm.gstLabel}
                onChange={(e) => setTemplateForm(p => ({ ...p, gstLabel: e.target.value }))}
                placeholder="GST 5%"
                data-testid="input-gst-label"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimate Notes</Label>
            <Textarea
              value={templateForm.estimateNotes}
              onChange={(e) => setTemplateForm(p => ({ ...p, estimateNotes: e.target.value }))}
              placeholder="Notes to include on estimates (e.g., warranty info, payment terms)"
              rows={3}
              data-testid="input-estimate-notes"
            />
          </div>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea
              value={templateForm.estimateTerms}
              onChange={(e) => setTemplateForm(p => ({ ...p, estimateTerms: e.target.value }))}
              placeholder="Terms and conditions for estimates"
              rows={3}
              data-testid="input-estimate-terms"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate(templateForm)}
              disabled={saveMutation.isPending}
              data-testid="button-save-template"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Template Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<SettingsData>(defaultSettings);

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      const map = new Map(settings.map(s => [s.key, s.value]));
      setForm({
        laborRate: map.get("laborRate") || defaultSettings.laborRate,
        overheadPct: map.get("overheadPct") || defaultSettings.overheadPct,
        profitPct: map.get("profitPct") || defaultSettings.profitPct,
        materialMarkup: map.get("materialMarkup") || defaultSettings.materialMarkup,
        laborMarkup: map.get("laborMarkup") || defaultSettings.laborMarkup,
        wasteFactor: map.get("wasteFactor") || defaultSettings.wasteFactor,
        companyName: map.get("companyName") || defaultSettings.companyName,
        companyPhone: map.get("companyPhone") || defaultSettings.companyPhone,
        companyEmail: map.get("companyEmail") || defaultSettings.companyEmail,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsData) => {
      await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure default rates, materials, wire types, and services
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <Package className="w-4 h-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="wire-types" data-testid="tab-wire-types">
            <Cable className="w-4 h-4 mr-2" />
            Wire Types
          </TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">
            <Wrench className="w-4 h-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="cec" data-testid="tab-cec">
            <Shield className="w-4 h-4 mr-2" />
            CEC
          </TabsTrigger>
          <TabsTrigger value="supplier-import" data-testid="tab-supplier-import">
            <Upload className="w-4 h-4 mr-2" />
            Supplier Import
          </TabsTrigger>
          <TabsTrigger value="estimate-template" data-testid="tab-estimate-template">
            <DollarSign className="w-4 h-4 mr-2" />
            Estimate Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab
            form={form}
            setForm={setForm}
            onSave={() => saveMutation.mutate(form)}
            isSaving={saveMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab />
        </TabsContent>

        <TabsContent value="wire-types">
          <WireTypesTab />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="cec">
          <CecDocumentsTab />
        </TabsContent>

        <TabsContent value="supplier-import">
          <SupplierImportTab />
        </TabsContent>

        <TabsContent value="estimate-template">
          <EstimateTemplateTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

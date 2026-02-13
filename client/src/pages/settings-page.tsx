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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DollarSign, Percent, Wrench, Save, CheckCircle2, Shield,
  Plus, Pencil, Trash2, Cable, Package, Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Setting, DeviceAssembly, WireType, ServiceBundle } from "@shared/schema";
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>(defaultDeviceForm);

  const { data: assemblies, isLoading } = useQuery<DeviceAssembly[]>({
    queryKey: ["/api/device-assemblies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeviceFormData) => {
      await apiRequest("POST", "/api/device-assemblies", {
        name: data.name,
        category: data.category,
        device: data.device,
        boxType: data.boxType || null,
        coverPlate: data.coverPlate || null,
        miscParts: data.miscParts || null,
        wireType: data.wireType || null,
        wireFootage: parseFloat(data.wireFootage) || 0,
        laborHours: parseFloat(data.laborHours) || 0,
        materialCost: parseFloat(data.materialCost) || 0,
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
    mutationFn: async ({ id, data }: { id: number; data: DeviceFormData }) => {
      await apiRequest("PATCH", `/api/device-assemblies/${id}`, {
        name: data.name,
        category: data.category,
        device: data.device,
        boxType: data.boxType || null,
        coverPlate: data.coverPlate || null,
        miscParts: data.miscParts || null,
        wireType: data.wireType || null,
        wireFootage: parseFloat(data.wireFootage) || 0,
        laborHours: parseFloat(data.laborHours) || 0,
        materialCost: parseFloat(data.materialCost) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
      toast({ title: "Device assembly updated" });
      setDialogOpen(false);
      setEditingId(null);
      setDeviceForm(defaultDeviceForm);
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

  const openEdit = (assembly: DeviceAssembly) => {
    setEditingId(assembly.id);
    setDeviceForm({
      name: assembly.name,
      category: assembly.category,
      device: assembly.device,
      boxType: assembly.boxType || "",
      coverPlate: assembly.coverPlate || "",
      miscParts: assembly.miscParts || "",
      wireType: assembly.wireType || "",
      wireFootage: String(assembly.wireFootage),
      laborHours: String(assembly.laborHours),
      materialCost: String(assembly.materialCost),
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setDeviceForm(defaultDeviceForm);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: deviceForm });
    } else {
      createMutation.mutate(deviceForm);
    }
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
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Material $</TableHead>
                <TableHead>Labor Hrs</TableHead>
                <TableHead>Wire Type</TableHead>
                <TableHead>Wire Ft</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assemblies && assemblies.length > 0 ? assemblies.map((a) => (
                <TableRow key={a.id} data-testid={`row-device-${a.id}`}>
                  <TableCell className="font-medium" data-testid={`text-device-name-${a.id}`}>{a.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.category}</Badge></TableCell>
                  <TableCell data-testid={`text-device-device-${a.id}`}>{a.device}</TableCell>
                  <TableCell data-testid={`text-device-material-${a.id}`}>${a.materialCost.toFixed(2)}</TableCell>
                  <TableCell data-testid={`text-device-labor-${a.id}`}>{a.laborHours}</TableCell>
                  <TableCell data-testid={`text-device-wire-${a.id}`}>{a.wireType || "-"}</TableCell>
                  <TableCell data-testid={`text-device-footage-${a.id}`}>{a.wireFootage}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        data-testid={`button-edit-device-${a.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(a.id)}
                        data-testid={`button-delete-device-${a.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
            <DialogTitle>{editingId ? "Edit Device Assembly" : "Add Device Assembly"}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={deviceForm.category}
                  onValueChange={(v) => setDeviceForm(p => ({ ...p, category: v }))}
                >
                  <SelectTrigger data-testid="select-device-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Device</Label>
                <Input
                  value={deviceForm.device}
                  onChange={(e) => setDeviceForm(p => ({ ...p, device: e.target.value }))}
                  data-testid="input-device-device"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Box Type</Label>
                <Input
                  value={deviceForm.boxType}
                  onChange={(e) => setDeviceForm(p => ({ ...p, boxType: e.target.value }))}
                  data-testid="input-device-box-type"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Plate</Label>
                <Input
                  value={deviceForm.coverPlate}
                  onChange={(e) => setDeviceForm(p => ({ ...p, coverPlate: e.target.value }))}
                  data-testid="input-device-cover-plate"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Misc Parts</Label>
              <Input
                value={deviceForm.miscParts}
                onChange={(e) => setDeviceForm(p => ({ ...p, miscParts: e.target.value }))}
                data-testid="input-device-misc-parts"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Wire Type</Label>
                <Input
                  value={deviceForm.wireType}
                  onChange={(e) => setDeviceForm(p => ({ ...p, wireType: e.target.value }))}
                  data-testid="input-device-wire-type"
                />
              </div>
              <div className="space-y-2">
                <Label>Wire Footage</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={deviceForm.wireFootage}
                  onChange={(e) => setDeviceForm(p => ({ ...p, wireFootage: e.target.value }))}
                  data-testid="input-device-wire-footage"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Labor Hours</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deviceForm.laborHours}
                  onChange={(e) => setDeviceForm(p => ({ ...p, laborHours: e.target.value }))}
                  data-testid="input-device-labor-hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Material Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deviceForm.materialCost}
                  onChange={(e) => setDeviceForm(p => ({ ...p, materialCost: e.target.value }))}
                  data-testid="input-device-material-cost"
                />
              </div>
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
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-device"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (editingId ? "Update" : "Create")}
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
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [editingCostValue, setEditingCostValue] = useState("");

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
    mutationFn: async ({ id, costPerFoot }: { id: number; costPerFoot: number }) => {
      await apiRequest("PATCH", `/api/wire-types/${id}`, { costPerFoot });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wire-types"] });
      toast({ title: "Wire type updated" });
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

  const handleCostBlur = (id: number) => {
    const val = parseFloat(editingCostValue);
    if (!isNaN(val)) {
      updateMutation.mutate({ id, costPerFoot: val });
    }
    setEditingCostId(null);
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wireTypesData && wireTypesData.length > 0 ? wireTypesData.map((wt) => (
                <TableRow key={wt.id} data-testid={`row-wire-type-${wt.id}`}>
                  <TableCell className="font-medium" data-testid={`text-wire-name-${wt.id}`}>{wt.name}</TableCell>
                  <TableCell>
                    {editingCostId === wt.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingCostValue}
                        onChange={(e) => setEditingCostValue(e.target.value)}
                        onBlur={() => handleCostBlur(wt.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCostBlur(wt.id); }}
                        autoFocus
                        className="w-24"
                        data-testid={`input-wire-cost-${wt.id}`}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover-elevate px-2 py-1 rounded-md"
                        onClick={() => {
                          setEditingCostId(wt.id);
                          setEditingCostValue(String(wt.costPerFoot));
                        }}
                        data-testid={`text-wire-cost-${wt.id}`}
                      >
                        ${wt.costPerFoot.toFixed(2)}
                      </span>
                    )}
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
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
      </Tabs>
    </div>
  );
}
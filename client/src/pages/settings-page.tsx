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
  Plus, Pencil, Trash2, Cable, Package, Settings, Upload, Briefcase,
  ChevronDown, ChevronRight, Search, ListTree
} from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Setting, DeviceAssembly, WireType, ServiceBundle, ComplianceDocument, SupplierImport, JobType, PartsCatalogEntry, AssemblyPart, PermitFeeSchedule } from "@shared/schema";
import { DEVICE_CATEGORIES, PART_CATEGORIES } from "@shared/schema";

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

function CompanyLogoSection() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      const logoSetting = settings.find((s: Setting) => s.key === "companyLogoData");
      if (logoSetting?.value) {
        setLogoPreview(logoSetting.value);
      }
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await fetch("/api/settings/logo", { method: "DELETE" });
      setLogoPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo removed" });
    } catch {
      toast({ title: "Remove failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          Company Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload your company logo to appear on all PDF exports (estimates, invoices, material lists)
        </p>
        {logoPreview ? (
          <div className="space-y-3">
            <div className="border rounded-md p-4 flex items-center justify-center bg-muted/30">
              <img
                src={logoPreview}
                alt="Company logo"
                className="max-h-24 max-w-full object-contain"
                data-testid="img-company-logo"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-change-logo"
              >
                Change Logo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                data-testid="button-remove-logo"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center cursor-pointer hover-elevate"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-logo"
          >
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload logo</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleLogoUpload}
          data-testid="input-logo-file"
        />
        {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      </CardContent>
    </Card>
  );
}

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

          <CompanyLogoSection />

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

interface AssemblyPartWithCatalog extends AssemblyPart {
  part?: PartsCatalogEntry;
}

function AssemblyExpandedRow({ assembly }: { assembly: DeviceAssembly }) {
  const { toast } = useToast();
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [selectedPartQty, setSelectedPartQty] = useState("1");

  const { data: assemblyParts, isLoading: partsLoading } = useQuery<AssemblyPartWithCatalog[]>({
    queryKey: [`/api/device-assemblies/${assembly.id}/parts`],
  });

  const { data: catalogParts } = useQuery<PartsCatalogEntry[]>({
    queryKey: ["/api/parts-catalog"],
  });

  const saveMutation = useMutation({
    mutationFn: async (parts: { partId: number; quantity: number }[]) => {
      await apiRequest("PUT", `/api/device-assemblies/${assembly.id}/parts`, { parts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/device-assemblies/${assembly.id}/parts`] });
      toast({ title: "Assembly parts updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAddPart = () => {
    if (!selectedPartId || !assemblyParts) return;
    const existing = assemblyParts.map(ap => ({ partId: ap.partId, quantity: ap.quantity }));
    const alreadyIdx = existing.findIndex(e => e.partId === selectedPartId);
    let updated;
    if (alreadyIdx >= 0) {
      updated = [...existing];
      updated[alreadyIdx] = { ...updated[alreadyIdx], quantity: updated[alreadyIdx].quantity + (parseFloat(selectedPartQty) || 1) };
    } else {
      updated = [...existing, { partId: selectedPartId, quantity: parseFloat(selectedPartQty) || 1 }];
    }
    saveMutation.mutate(updated);
    setAddPartOpen(false);
    setSelectedPartId(null);
    setSelectedPartQty("1");
    setPartSearch("");
  };

  const handleRemovePart = (partId: number) => {
    if (!assemblyParts) return;
    const updated = assemblyParts
      .filter(ap => ap.partId !== partId)
      .map(ap => ({ partId: ap.partId, quantity: ap.quantity }));
    saveMutation.mutate(updated);
  };

  const materialTotal = useMemo(() => {
    if (!assemblyParts) return 0;
    return assemblyParts.reduce((sum, ap) => {
      const cost = ap.part?.unitCost ?? 0;
      return sum + cost * ap.quantity;
    }, 0);
  }, [assemblyParts]);

  const filteredCatalog = useMemo(() => {
    if (!catalogParts) return [];
    if (!partSearch.trim()) return catalogParts;
    const q = partSearch.toLowerCase();
    return catalogParts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.partNumber && p.partNumber.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }, [catalogParts, partSearch]);

  return (
    <div className="px-6 py-3 bg-muted/30 border-t">
      {partsLoading ? (
        <Skeleton className="h-16" />
      ) : (
        <>
          {assemblyParts && assemblyParts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Part Name</TableHead>
                  <TableHead className="text-xs w-16">Qty</TableHead>
                  <TableHead className="text-xs w-24">Unit Cost</TableHead>
                  <TableHead className="text-xs w-24">Line Total</TableHead>
                  <TableHead className="text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assemblyParts.map((ap) => (
                  <TableRow key={ap.id} className="text-sm">
                    <TableCell className="py-1.5">{ap.part?.name ?? `Part #${ap.partId}`}</TableCell>
                    <TableCell className="py-1.5">{ap.quantity}</TableCell>
                    <TableCell className="py-1.5">${(ap.part?.unitCost ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 font-medium">${((ap.part?.unitCost ?? 0) * ap.quantity).toFixed(2)}</TableCell>
                    <TableCell className="py-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRemovePart(ap.partId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No parts added to this assembly yet.</p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-sm font-medium">
              Material Cost: ${materialTotal.toFixed(2)} (from {assemblyParts?.length ?? 0} parts)
            </span>
            <Button size="sm" variant="outline" onClick={() => setAddPartOpen(true)} data-testid={`button-add-assembly-part-${assembly.id}`}>
              <Plus className="w-3 h-3 mr-1" />
              Add Part
            </Button>
          </div>

          <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Part to {assembly.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Parts</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Search by name, part #, or category..."
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                      data-testid="input-search-catalog-part"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {filteredCatalog.length > 0 ? filteredCatalog.map((cp) => (
                    <div
                      key={cp.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent text-sm ${selectedPartId === cp.id ? "bg-accent" : ""}`}
                      onClick={() => setSelectedPartId(cp.id)}
                    >
                      <div>
                        <span className="font-medium">{cp.name}</span>
                        {cp.partNumber && <span className="text-muted-foreground ml-2">#{cp.partNumber}</span>}
                      </div>
                      <span className="text-muted-foreground">${cp.unitCost.toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No parts found</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={selectedPartQty}
                    onChange={(e) => setSelectedPartQty(e.target.value)}
                    data-testid="input-assembly-part-qty"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddPartOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAddPart}
                  disabled={!selectedPartId || saveMutation.isPending}
                  data-testid="button-submit-assembly-part"
                >
                  {saveMutation.isPending ? "Adding..." : "Add Part"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function MaterialsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>(defaultDeviceForm);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
                <TableHead className="w-10"></TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assemblies && assemblies.length > 0 ? assemblies.map((a) => (
                <React.Fragment key={a.id}>
                  <TableRow data-testid={`row-device-${a.id}`}>
                    <TableCell className="w-10 px-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => toggleExpand(a.id)}
                        data-testid={`button-expand-device-${a.id}`}
                      >
                        {expandedIds.has(a.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
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
                  {expandedIds.has(a.id) && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <AssemblyExpandedRow assembly={a} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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

interface JobTypeFormData {
  value: string;
  label: string;
  multiplier: string;
}

function JobTypesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<JobTypeFormData>({ value: "", label: "", multiplier: "1.0" });

  const { data: jobTypesData, isLoading } = useQuery<JobType[]>({
    queryKey: ["/api/job-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: JobTypeFormData) => {
      await apiRequest("POST", "/api/job-types", {
        value: data.value,
        label: data.label,
        multiplier: parseFloat(data.multiplier) || 1.0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-types"] });
      toast({ title: "Job type created" });
      setDialogOpen(false);
      setForm({ value: "", label: "", multiplier: "1.0" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/job-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-types"] });
      toast({ title: "Job type updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/job-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-types"] });
      toast({ title: "Job type deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleInlineBlur = (id: number, field: string, newValue: string, originalValue: string | number | null | undefined) => {
    const orig = originalValue == null ? "" : String(originalValue);
    if (newValue === orig) return;
    const payload: Record<string, unknown> = {};
    if (field === "multiplier") {
      payload[field] = parseFloat(newValue) || 1.0;
    } else {
      payload[field] = newValue || null;
    }
    updateMutation.mutate({ id, data: payload });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Job Types & Labour Multipliers</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                NECA Manual of Labour Units — multipliers adjust labour hours by project complexity
              </p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-add-job-type">
              <Plus className="w-4 h-4 mr-2" />
              Add Job Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Value (ID)</TableHead>
                  <TableHead>Display Label</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>NECA Column</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobTypesData && jobTypesData.length > 0 ? jobTypesData.map((jt) => (
                  <TableRow key={jt.id} data-testid={`row-job-type-${jt.id}`}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{jt.value}</code>
                    </TableCell>
                    <TableCell>
                      <Input
                        key={`label-${jt.id}-${jt.label}`}
                        defaultValue={jt.label}
                        onBlur={(e) => handleInlineBlur(jt.id, "label", e.target.value, jt.label)}
                        className="min-w-[160px]"
                        data-testid={`input-job-type-label-${jt.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        key={`mult-${jt.id}-${jt.multiplier}`}
                        type="number"
                        step="0.05"
                        min="0.5"
                        max="3.0"
                        defaultValue={jt.multiplier}
                        onBlur={(e) => handleInlineBlur(jt.id, "multiplier", e.target.value, jt.multiplier)}
                        className="w-24"
                        data-testid={`input-job-type-multiplier-${jt.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(jt.multiplier ?? 1) <= 1.2 ? "Normal" : (jt.multiplier ?? 1) <= 1.5 ? "Difficult" : "Very Difficult"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(jt.id)}
                        data-testid={`button-delete-job-type-${jt.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No job types found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Job Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value (unique ID)</Label>
              <Input
                placeholder="e.g. fire_alarm"
                value={form.value}
                onChange={(e) => setForm(p => ({ ...p, value: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                data-testid="input-new-job-type-value"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                placeholder="e.g. Fire Alarm System"
                value={form.label}
                onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))}
                data-testid="input-new-job-type-label"
              />
            </div>
            <div className="space-y-2">
              <Label>Labour Multiplier</Label>
              <Input
                type="number"
                step="0.05"
                min="0.5"
                max="3.0"
                value={form.multiplier}
                onChange={(e) => setForm(p => ({ ...p, multiplier: e.target.value }))}
                data-testid="input-new-job-type-multiplier"
              />
              <p className="text-xs text-muted-foreground">
                1.0 = Normal, 1.25 = Difficult (+25%), 1.50 = Very Difficult (+50%)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.value || !form.label}
              data-testid="button-submit-job-type"
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
                  <TableHead>Type</TableHead>
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
                    <TableCell data-testid={`text-preview-type-${idx}`}>
                      {item.itemType === "wire" ? (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Wire</Badge>
                      ) : item.itemType === "part" ? (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Part</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Material</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-preview-name-${idx}`}>{item.name}</TableCell>
                    <TableCell data-testid={`text-preview-category-${idx}`}>
                      <Badge variant="outline" className="text-xs">
                        {item.itemType === "wire" ? "wire" : (item.category || "materials")}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-preview-cost-${idx}`}>
                      {item.itemType === "wire"
                        ? `$${(item.costPerFoot || 0).toFixed(2)}/ft`
                        : `$${(item.materialCost || 0).toFixed(2)}`
                      }
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

const PART_CATEGORY_COLORS: Record<string, string> = {
  box: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cover_plate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  device: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  connector: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  wire_nut: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  mounting: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  misc: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  breaker: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  panel_component: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

function partCategoryLabel(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface PartFormData {
  name: string;
  category: string;
  unitCost: string;
  supplier: string;
  partNumber: string;
}

const defaultPartForm: PartFormData = {
  name: "",
  category: "box",
  unitCost: "0",
  supplier: "",
  partNumber: "",
};

function PartsCatalogTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partForm, setPartForm] = useState<PartFormData>(defaultPartForm);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: parts, isLoading } = useQuery<PartsCatalogEntry[]>({
    queryKey: ["/api/parts-catalog"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PartFormData) => {
      await apiRequest("POST", "/api/parts-catalog", {
        name: data.name,
        category: data.category,
        unitCost: parseFloat(data.unitCost) || 0,
        supplier: data.supplier || null,
        partNumber: data.partNumber || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
      toast({ title: "Part created" });
      setDialogOpen(false);
      setPartForm(defaultPartForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/parts-catalog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/parts-catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
      toast({ title: "Part deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleInlineBlur = (id: number, field: string, newValue: string, originalValue: string | number | null | undefined) => {
    const orig = originalValue == null ? "" : String(originalValue);
    if (newValue === orig) return;
    const numericFields = ["unitCost"];
    const payload: Record<string, unknown> = {};
    if (numericFields.includes(field)) {
      payload[field] = parseFloat(newValue) || 0;
    } else {
      payload[field] = newValue || null;
    }
    updateMutation.mutate({ id, data: payload });
  };

  const filteredParts = useMemo(() => {
    if (!parts) return [];
    if (categoryFilter === "all") return parts;
    return parts.filter(p => p.category === categoryFilter);
  }, [parts, categoryFilter]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Category:</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-part-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PART_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{partCategoryLabel(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setPartForm(defaultPartForm); setDialogOpen(true); }} data-testid="button-add-part">
          <Plus className="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.length > 0 ? filteredParts.map((p) => (
                <TableRow key={p.id} data-testid={`row-part-${p.id}`}>
                  <TableCell>
                    <Input
                      key={`name-${p.id}-${p.name}`}
                      defaultValue={p.name}
                      onBlur={(e) => handleInlineBlur(p.id, "name", e.target.value, p.name)}
                      className="min-w-[140px]"
                      data-testid={`input-part-name-${p.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${PART_CATEGORY_COLORS[p.category] || "bg-gray-100 text-gray-800"}`}>
                      {partCategoryLabel(p.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`unitCost-${p.id}-${p.unitCost}`}
                      type="number"
                      step="0.01"
                      defaultValue={p.unitCost}
                      onBlur={(e) => handleInlineBlur(p.id, "unitCost", e.target.value, p.unitCost)}
                      className="w-24"
                      data-testid={`input-part-cost-${p.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`supplier-${p.id}-${p.supplier}`}
                      defaultValue={p.supplier || ""}
                      onBlur={(e) => handleInlineBlur(p.id, "supplier", e.target.value, p.supplier)}
                      className="min-w-[100px]"
                      data-testid={`input-part-supplier-${p.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`partNumber-${p.id}-${p.partNumber}`}
                      defaultValue={p.partNumber || ""}
                      onBlur={(e) => handleInlineBlur(p.id, "partNumber", e.target.value, p.partNumber)}
                      className="min-w-[80px]"
                      data-testid={`input-part-number-${p.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(p.id)}
                      data-testid={`button-delete-part-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No parts found{categoryFilter !== "all" ? ` in "${partCategoryLabel(categoryFilter)}"` : ""}
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
            <DialogTitle>Add Part</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={partForm.name}
                onChange={(e) => setPartForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 2104-LLE Single Gang Box"
                data-testid="input-new-part-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={partForm.category} onValueChange={(v) => setPartForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-new-part-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PART_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{partCategoryLabel(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={partForm.unitCost}
                onChange={(e) => setPartForm(p => ({ ...p, unitCost: e.target.value }))}
                data-testid="input-new-part-cost"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={partForm.supplier}
                  onChange={(e) => setPartForm(p => ({ ...p, supplier: e.target.value }))}
                  placeholder="e.g. Nedco"
                  data-testid="input-new-part-supplier"
                />
              </div>
              <div className="space-y-2">
                <Label>Part #</Label>
                <Input
                  value={partForm.partNumber}
                  onChange={(e) => setPartForm(p => ({ ...p, partNumber: e.target.value }))}
                  placeholder="e.g. 2104-LLE"
                  data-testid="input-new-part-number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-part"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(partForm)}
              disabled={createMutation.isPending || !partForm.name}
              data-testid="button-submit-part"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotosSettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });
  const { data: storageStatus } = useQuery<{
    configured: boolean; r2: boolean; googleDrive: boolean;
    googleDriveOAuthAvailable: boolean; googleDriveEmail: string | null;
    provider: string | null;
  }>({
    queryKey: ["/api/r2-status"],
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/google-drive/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/r2-status"] });
      toast({ title: "Google Drive disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sm = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [storageProvider, setStorageProvider] = useState(sm.photoStorageProvider || "r2");
  const [r2AccountId, setR2AccountId] = useState(sm.r2AccountId || "");
  const [r2AccessKeyId, setR2AccessKeyId] = useState(sm.r2AccessKeyId || "");
  const [r2SecretKey, setR2SecretKey] = useState(sm.r2SecretKey || "");
  const [r2BucketName, setR2BucketName] = useState(sm.r2BucketName || "sparkyestimate-photos");

  useEffect(() => {
    if (settings) {
      const map = new Map(settings.map(s => [s.key, s.value]));
      setStorageProvider(map.get("photoStorageProvider") || "r2");
      setR2AccountId(map.get("r2AccountId") || "");
      setR2AccessKeyId(map.get("r2AccessKeyId") || "");
      setR2SecretKey(map.get("r2SecretKey") || "");
      setR2BucketName(map.get("r2BucketName") || "sparkyestimate-photos");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/settings", {
        photoStorageProvider: storageProvider,
        r2AccountId,
        r2AccessKeyId,
        r2SecretKey,
        r2BucketName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/r2-status"] });
      toast({ title: "Photo settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Photo Storage Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Storage Provider</Label>
            <Select value={storageProvider} onValueChange={setStorageProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="r2">Cloudflare R2</SelectItem>
                <SelectItem value="google_drive">Google Drive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose where to store inspection photos. Cloudflare R2 recommended (free tier: 10 GB, zero egress fees).
            </p>
          </div>

          {storageProvider === "r2" && (
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={storageStatus?.r2 ? "default" : "secondary"}>
                  {storageStatus?.r2 ? "Connected" : "Not configured"}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2AccountId">Account ID</Label>
                <Input
                  id="r2AccountId"
                  placeholder="Cloudflare R2 Account ID"
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2AccessKeyId">Access Key ID</Label>
                <Input
                  id="r2AccessKeyId"
                  placeholder="R2 Access Key ID"
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2SecretKey">Secret Access Key</Label>
                <Input
                  id="r2SecretKey"
                  type="password"
                  placeholder="R2 Secret Access Key"
                  value={r2SecretKey}
                  onChange={(e) => setR2SecretKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2BucketName">Bucket Name</Label>
                <Input
                  id="r2BucketName"
                  placeholder="sparkyestimate-photos"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                />
              </div>
            </div>
          )}

          {storageProvider === "google_drive" && (
            <div className="space-y-4 pt-2 border-t">
              {storageStatus?.googleDrive ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                    {storageStatus.googleDriveEmail && (
                      <span className="text-sm text-muted-foreground">
                        {storageStatus.googleDriveEmail}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Photos are stored in your Google Drive under &quot;SparkyEstimate Photos&quot; with
                    auto-created subfolders per project (Service / Rough-in / Finish / Misc).
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Google Drive"}
                  </Button>
                </div>
              ) : storageStatus?.googleDriveOAuthAvailable ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Not connected</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connect your Google Drive account to store inspection photos. A &quot;SparkyEstimate Photos&quot;
                    folder will be auto-created with subfolders per project.
                  </p>
                  <Button onClick={() => { window.location.href = "/api/google-drive/auth"; }}>
                    Connect Google Drive
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Not available</Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Google Drive OAuth is not configured. Set <code className="mx-1">GOOGLE_CLIENT_ID</code> and
                      <code className="mx-1">GOOGLE_CLIENT_SECRET</code> in the <code className="ml-1">.env</code> file
                      and restart the server.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Photo Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Employee Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Employees can upload photos via the mobile Employee Portal at <code>/employee</code>.
            Each employee needs a PIN set in the Employees page. Photos are organized by project and inspection phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EditableRateTable({ category, label, rates, onChange }: {
  category: string;
  label: string;
  rates: any[];
  onChange: (updated: any[]) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        {rates.map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{r.label}</span>
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              className="w-20 h-7 text-xs"
              value={r.fee}
              onChange={(e) => {
                const updated = [...rates];
                updated[i] = { ...updated[i], fee: parseFloat(e.target.value) || 0 };
                onChange(updated);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PermitsTab() {
  const { toast } = useToast();
  const { data: schedules, isLoading } = useQuery<PermitFeeSchedule[]>({
    queryKey: ["/api/permit-fee-schedules"],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRates, setEditRates] = useState<any>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/permit-fee-schedules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-fee-schedules"] });
      toast({ title: "Schedule updated" });
    },
  });

  const saveRatesMutation = useMutation({
    mutationFn: async ({ id, rates }: { id: number; rates: any }) => {
      await apiRequest("PATCH", `/api/permit-fee-schedules/${id}`, { rates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-fee-schedules"] });
      setEditingId(null);
      setEditRates(null);
      toast({ title: "Rates saved" });
    },
  });

  const startEditing = (schedule: PermitFeeSchedule) => {
    setEditingId(schedule.id);
    setEditRates(JSON.parse(JSON.stringify(schedule.rates)));
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            TSBC Permit Fee Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Manage Technical Safety BC fee schedules. Click "Edit Rates" to modify fee amounts.
            The active schedule auto-calculates permit fees on estimates when the permit checkbox is enabled.
          </p>
          {(!schedules || schedules.length === 0) ? (
            <p className="text-sm text-muted-foreground">No permit fee schedules found. Run the database seed to load TSBC rates.</p>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => {
                const isEditing = editingId === schedule.id;
                const rates = isEditing ? editRates : (schedule.rates as any);
                return (
                  <Card key={schedule.id} className={schedule.isActive ? "border-primary" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{schedule.name}</CardTitle>
                          <Badge variant={schedule.isActive ? "default" : "secondary"} className="text-xs">
                            {schedule.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Effective: {schedule.effectiveDate}</span>
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditRates(null); }}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => saveRatesMutation.mutate({ id: schedule.id, rates: editRates })}
                                disabled={saveRatesMutation.isPending}>
                                <Save className="w-3 h-3 mr-1" />
                                {saveRatesMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditing(schedule)}>
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit Rates
                              </Button>
                              <Button
                                size="sm"
                                variant={schedule.isActive ? "secondary" : "default"}
                                onClick={() => toggleActiveMutation.mutate({ id: schedule.id, isActive: !schedule.isActive })}
                              >
                                {schedule.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {rates?.residential_service && (
                          <EditableRateTable
                            category="residential_service"
                            label="Single Family (by Amps)"
                            rates={rates.residential_service}
                            onChange={(updated) => isEditing && setEditRates({ ...editRates, residential_service: updated })}
                          />
                        )}
                        {rates?.service_upgrade && (
                          <EditableRateTable
                            category="service_upgrade"
                            label="Service Upgrade (by Amps)"
                            rates={rates.service_upgrade}
                            onChange={(updated) => isEditing && setEditRates({ ...editRates, service_upgrade: updated })}
                          />
                        )}
                        {rates?.other && (
                          <EditableRateTable
                            category="other"
                            label="Other (by Job Value)"
                            rates={rates.other}
                            onChange={(updated) => isEditing && setEditRates({ ...editRates, other: updated })}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
          <TabsTrigger value="job-types" data-testid="tab-job-types">
            <Briefcase className="w-4 h-4 mr-2" />
            Job Types
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
          <TabsTrigger value="parts-catalog" data-testid="tab-parts-catalog">
            <ListTree className="w-4 h-4 mr-2" />
            Parts Catalog
          </TabsTrigger>
          <TabsTrigger value="permits" data-testid="tab-permits">
            <Shield className="w-4 h-4 mr-2" />
            Permits
          </TabsTrigger>
          <TabsTrigger value="photos" data-testid="tab-photos">
            <Upload className="w-4 h-4 mr-2" />
            Photos
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

        <TabsContent value="job-types">
          <JobTypesTab />
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

        <TabsContent value="parts-catalog">
          <PartsCatalogTab />
        </TabsContent>

        <TabsContent value="permits">
          <PermitsTab />
        </TabsContent>

        <TabsContent value="photos">
          <PhotosSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

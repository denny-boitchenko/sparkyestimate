import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Plus, Trash2, DollarSign, Clock, Cable,
  Save, Package
} from "lucide-react";
import type { Estimate, EstimateItem, DeviceAssembly } from "@shared/schema";

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const { toast } = useToast();
  const [addItemOpen, setAddItemOpen] = useState(false);

  const estimateId = params?.id ? parseInt(params.id) : 0;

  const { data: estimate, isLoading } = useQuery<Estimate>({
    queryKey: ["/api/estimates", estimateId],
    enabled: estimateId > 0,
  });

  const { data: items } = useQuery<EstimateItem[]>({
    queryKey: ["/api/estimates", estimateId, "items"],
    enabled: estimateId > 0,
  });

  const { data: assemblies } = useQuery<DeviceAssembly[]>({
    queryKey: ["/api/device-assemblies"],
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async (data: Partial<Estimate>) => {
      await apiRequest("PATCH", `/api/estimates/${estimateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      toast({ title: "Estimate updated" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/estimate-items", { ...data, estimateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "items"] });
      toast({ title: "Item added" });
      setAddItemOpen(false);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<EstimateItem>) => {
      await apiRequest("PATCH", `/api/estimate-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "items"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimate-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "items"] });
      toast({ title: "Item removed" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Estimate not found.</p>
        <Link href="/estimates">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Estimates
          </Button>
        </Link>
      </div>
    );
  }

  const totalMaterialCost = (items || []).reduce((sum, item) => {
    const cost = item.quantity * item.materialCost;
    const markup = cost * (item.markupPct / 100);
    return sum + cost + markup;
  }, 0);

  const totalLaborHours = (items || []).reduce((sum, item) => sum + item.quantity * item.laborHours, 0);
  const totalLaborCost = totalLaborHours * estimate.laborRate;
  const totalWireFootage = (items || []).reduce((sum, item) => sum + item.quantity * item.wireFootage, 0);

  const materialWithMarkup = totalMaterialCost * (1 + estimate.materialMarkupPct / 100);
  const laborWithMarkup = totalLaborCost * (1 + estimate.laborMarkupPct / 100);
  const subtotal = materialWithMarkup + laborWithMarkup;
  const overhead = subtotal * (estimate.overheadPct / 100);
  const subtotalWithOverhead = subtotal + overhead;
  const profit = subtotalWithOverhead * (estimate.profitPct / 100);
  const grandTotal = subtotalWithOverhead + profit;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/projects/${estimate.projectId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-estimate">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-estimate-name">
            {estimate.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Created {new Date(estimate.createdAt).toLocaleDateString("en-CA")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-chart-3" />
              <span className="text-xs text-muted-foreground">Materials</span>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-materials">
              ${materialWithMarkup.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Labor</span>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-labor">
              ${laborWithMarkup.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{totalLaborHours.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Cable className="w-4 h-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Wire</span>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-wire">
              {totalWireFootage.toFixed(0)} ft
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-chart-3" />
              <span className="text-xs text-muted-foreground">Grand Total</span>
            </div>
            <p className="text-xl font-bold text-chart-3" data-testid="text-grand-total">
              ${grandTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base font-semibold">Rates & Markups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Labor Rate ($/hr)</Label>
              <Input
                type="number"
                step="0.01"
                value={estimate.laborRate}
                onChange={(e) => updateEstimateMutation.mutate({ laborRate: parseFloat(e.target.value) || 0 })}
                data-testid="input-labor-rate"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Overhead %</Label>
              <Input
                type="number"
                step="0.1"
                value={estimate.overheadPct}
                onChange={(e) => updateEstimateMutation.mutate({ overheadPct: parseFloat(e.target.value) || 0 })}
                data-testid="input-overhead"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profit %</Label>
              <Input
                type="number"
                step="0.1"
                value={estimate.profitPct}
                onChange={(e) => updateEstimateMutation.mutate({ profitPct: parseFloat(e.target.value) || 0 })}
                data-testid="input-profit"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material Markup %</Label>
              <Input
                type="number"
                step="0.1"
                value={estimate.materialMarkupPct}
                onChange={(e) => updateEstimateMutation.mutate({ materialMarkupPct: parseFloat(e.target.value) || 0 })}
                data-testid="input-material-markup"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Labor Markup %</Label>
              <Input
                type="number"
                step="0.1"
                value={estimate.laborMarkupPct}
                onChange={(e) => updateEstimateMutation.mutate({ laborMarkupPct: parseFloat(e.target.value) || 0 })}
                data-testid="input-labor-markup"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base font-semibold">
            Line Items ({items?.length || 0})
          </CardTitle>
          <Button size="sm" onClick={() => setAddItemOpen(true)} data-testid="button-add-item">
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {!items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No line items</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add items from the device assembly library or create custom items
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Material $</TableHead>
                    <TableHead className="text-right">Labor (hrs)</TableHead>
                    <TableHead>Wire</TableHead>
                    <TableHead className="text-right">Wire (ft)</TableHead>
                    <TableHead className="text-right">Markup %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const itemMaterial = item.quantity * item.materialCost;
                    const itemMarkup = itemMaterial * (item.markupPct / 100);
                    const itemLabor = item.quantity * item.laborHours * estimate.laborRate;
                    const itemTotal = itemMaterial + itemMarkup + itemLabor;
                    return (
                      <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{item.deviceType}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.room || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="w-16 text-right"
                            value={item.quantity}
                            onChange={(e) => updateItemMutation.mutate({ id: item.id, quantity: parseInt(e.target.value) || 1 })}
                            min={1}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">${item.materialCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">{item.laborHours.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{item.wireType || "-"}</TableCell>
                        <TableCell className="text-right text-sm">{item.wireFootage.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-sm">{item.markupPct}%</TableCell>
                        <TableCell className="text-right text-sm font-medium">${itemTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Estimate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Materials</span>
              <span>${totalMaterialCost.toFixed(2)}</span>
            </div>
            {estimate.materialMarkupPct > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Material Markup ({estimate.materialMarkupPct}%)</span>
                <span>${(totalMaterialCost * estimate.materialMarkupPct / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Labor ({totalLaborHours.toFixed(1)} hrs @ ${estimate.laborRate}/hr)</span>
              <span>${totalLaborCost.toFixed(2)}</span>
            </div>
            {estimate.laborMarkupPct > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor Markup ({estimate.laborMarkupPct}%)</span>
                <span>${(totalLaborCost * estimate.laborMarkupPct / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overhead ({estimate.overheadPct}%)</span>
              <span>${overhead.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit ({estimate.profitPct}%)</span>
              <span>${profit.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-chart-3">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        assemblies={assemblies || []}
        onAdd={(data) => addItemMutation.mutate(data)}
        isPending={addItemMutation.isPending}
      />
    </div>
  );
}

function AddItemDialog({ open, onOpenChange, assemblies, onAdd, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assemblies: DeviceAssembly[];
  onAdd: (data: any) => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<"assembly" | "custom">("assembly");
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const [customForm, setCustomForm] = useState({
    deviceType: "",
    description: "",
    room: "",
    quantity: 1,
    materialCost: 0,
    laborHours: 0,
    wireType: "14/2 NM-B",
    wireFootage: 15,
    markupPct: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "assembly" && selectedAssembly) {
      const assembly = assemblies.find(a => a.id.toString() === selectedAssembly);
      if (assembly) {
        onAdd({
          deviceType: assembly.name,
          description: assembly.device,
          room: customForm.room,
          quantity: customForm.quantity,
          materialCost: assembly.materialCost,
          laborHours: assembly.laborHours,
          wireType: assembly.wireType,
          wireFootage: assembly.wireFootage,
          markupPct: 0,
          boxType: assembly.boxType,
          coverPlate: assembly.coverPlate,
        });
      }
    } else {
      onAdd(customForm);
    }
  };

  const groupedAssemblies = assemblies.reduce<Record<string, DeviceAssembly[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "assembly" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("assembly")}
            className={mode === "assembly" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-mode-assembly"
          >
            From Library
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("custom")}
            className={mode === "custom" ? "toggle-elevate toggle-elevated" : ""}
            data-testid="button-mode-custom"
          >
            Custom
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "assembly" ? (
            <>
              <div className="space-y-2">
                <Label>Device Assembly</Label>
                <Select value={selectedAssembly} onValueChange={setSelectedAssembly}>
                  <SelectTrigger data-testid="select-assembly">
                    <SelectValue placeholder="Select a device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedAssemblies).map(([category, items]) => (
                      items.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} - ${item.materialCost.toFixed(2)}
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Input
                    placeholder="e.g., Kitchen"
                    value={customForm.room}
                    onChange={(e) => setCustomForm(p => ({ ...p, room: e.target.value }))}
                    data-testid="input-item-room"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customForm.quantity}
                    onChange={(e) => setCustomForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    data-testid="input-item-quantity"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <Input
                    placeholder="e.g., Duplex Receptacle"
                    value={customForm.deviceType}
                    onChange={(e) => setCustomForm(p => ({ ...p, deviceType: e.target.value }))}
                    required
                    data-testid="input-custom-device"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Input
                    placeholder="e.g., Kitchen"
                    value={customForm.room}
                    onChange={(e) => setCustomForm(p => ({ ...p, room: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="15A duplex receptacle, TR"
                  value={customForm.description}
                  onChange={(e) => setCustomForm(p => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input type="number" min={1} value={customForm.quantity} onChange={(e) => setCustomForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Material $</Label>
                  <Input type="number" step="0.01" value={customForm.materialCost} onChange={(e) => setCustomForm(p => ({ ...p, materialCost: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Labor (hrs)</Label>
                  <Input type="number" step="0.01" value={customForm.laborHours} onChange={(e) => setCustomForm(p => ({ ...p, laborHours: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Wire Type</Label>
                  <Input value={customForm.wireType} onChange={(e) => setCustomForm(p => ({ ...p, wireType: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Wire (ft)</Label>
                  <Input type="number" value={customForm.wireFootage} onChange={(e) => setCustomForm(p => ({ ...p, wireFootage: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Markup %</Label>
                  <Input type="number" step="0.1" value={customForm.markupPct} onChange={(e) => setCustomForm(p => ({ ...p, markupPct: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-item">
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

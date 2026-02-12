import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Settings, DollarSign, Percent, Wrench, Save, CheckCircle2, Zap, Shield
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Setting } from "@shared/schema";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure default rates, markups, and company information
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          data-testid="button-save-settings"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
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

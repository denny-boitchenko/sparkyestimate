import { useState, Fragment, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import {
  ArrowLeft, Plus, Trash2, DollarSign, Clock, Cable,
  Package, Zap, ShieldCheck, Wrench, RefreshCw, Play,
  Download, FileText, FileSpreadsheet, ScanLine, FileOutput,
  ChevronDown, Users, Layers, AlertTriangle
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { useLocation } from "wouter";
import type {
  Estimate, EstimateItem, DeviceAssembly, PanelCircuit,
  EstimateService, ServiceBundle, WireType, AiAnalysis,
  Employee, Setting, EstimateCrew, JobType
} from "@shared/schema";
import { DEVICE_CATEGORIES } from "@shared/schema";

// Smart catalog matching — fuzzy match AI-generated device names to catalog assemblies
function findBestCatalogMatch(deviceName: string, assemblies: DeviceAssembly[]): DeviceAssembly | null {
  if (!deviceName || assemblies.length === 0) return null;
  const lower = deviceName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  // Exact match first
  const exact = assemblies.find(a => a.name.toLowerCase() === lower);
  if (exact) return exact;
  // Keyword-based scoring
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestMatch: DeviceAssembly | null = null;
  for (const a of assemblies) {
    const aLower = a.name.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const aDevice = (a.device || "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
    let score = 0;
    for (const w of words) {
      if (aLower.includes(w)) score += 2;
      else if (aDevice.includes(w)) score += 1;
    }
    // Bonus for matching key terms
    if (lower.includes("gfci") && aLower.includes("gfci")) score += 3;
    if (lower.includes("3-way") && aLower.includes("3-way")) score += 3;
    if (lower.includes("4-way") && aLower.includes("4-way")) score += 3;
    if (lower.includes("dimmer") && aLower.includes("dimmer")) score += 3;
    if (lower.includes("recessed") && aLower.includes("recessed")) score += 3;
    if (lower.includes("smoke") && aLower.includes("smoke")) score += 3;
    if (lower.includes("fan") && aLower.includes("fan")) score += 3;
    if (lower.includes("dryer") && aLower.includes("dryer")) score += 3;
    if (lower.includes("range") && !lower.includes("hood") && aLower.includes("range") && !aLower.includes("hood")) score += 3;
    if (lower.includes("range hood") && aLower.includes("range hood")) score += 3;
    if (lower.includes("cat6") && aLower.includes("cat6")) score += 3;
    if (lower.includes("coax") && aLower.includes("coax")) score += 3;
    if (lower.includes("pendant") && aLower.includes("pendant")) score += 3;
    if (lower.includes("track") && aLower.includes("track")) score += 3;
    if (lower.includes("under cabinet") && aLower.includes("under cabinet")) score += 3;
    if (lower.includes("outdoor") && aLower.includes("outdoor")) score += 2;
    if (lower.includes("exterior") && aLower.includes("exterior")) score += 2;
    if (lower.includes("wp") && aLower.includes("wp")) score += 2;
    if (lower.includes("exhaust") && aLower.includes("exhaust")) score += 3;
    if (lower.includes("doorbell") && aLower.includes("doorbell")) score += 3;
    if (lower.includes("ev") && aLower.includes("ev")) score += 3;
    if (lower.includes("dedicated") && aLower.includes("dedicated")) score += 2;
    if (lower.includes("split") && aLower.includes("split")) score += 3;
    if (lower.includes("single-pole") && aLower.includes("single-pole")) score += 3;
    if (lower.includes("single pole") && aLower.includes("single-pole")) score += 3;
    // Amp matching
    const ampMatch = lower.match(/(\d+)\s*a\b/);
    const aAmpMatch = aLower.match(/(\d+)\s*a\b/);
    if (ampMatch && aAmpMatch && ampMatch[1] === aAmpMatch[1]) score += 2;
    // Size matching (4", 6")
    const sizeMatch = lower.match(/(\d+)[""]/);
    const aSizeMatch = aLower.match(/(\d+)[""]/);
    if (sizeMatch && aSizeMatch && sizeMatch[1] === aSizeMatch[1]) score += 2;

    if (score > bestScore && score >= 3) {
      bestScore = score;
      bestMatch = a;
    }
  }
  return bestMatch;
}

// Rough-in vs finish labour split ratios per device category
// Based on NECA Manual of Labour Units and CEC industry standards
const LABOUR_STAGE_SPLITS: Record<string, { roughIn: number; finish: number }> = {
  receptacles: { roughIn: 0.62, finish: 0.38 },
  switches: { roughIn: 0.65, finish: 0.35 },
  lighting: { roughIn: 0.47, finish: 0.53 },
  safety: { roughIn: 0.60, finish: 0.40 },
  data_comm: { roughIn: 0.55, finish: 0.45 },
  specialty: { roughIn: 0.53, finish: 0.47 },
  service: { roughIn: 0.75, finish: 0.25 },
};

// Fallback job types if API hasn't loaded yet
const FALLBACK_JOB_TYPES = [
  { value: "new_construction", label: "New Construction", multiplier: 1.0 },
  { value: "renovation", label: "Renovation", multiplier: 1.4 },
];

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addCircuitOpen, setAddCircuitOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [createDeviceOpen, setCreateDeviceOpen] = useState(false);
  const [pendingDeviceItemId, setPendingDeviceItemId] = useState<number | null>(null);
  const [addWireRunOpen, setAddWireRunOpen] = useState(false);
  const [localSpoolOverrides, setLocalSpoolOverrides] = useState<Record<string, { s150?: number; s75?: number }>>({});
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "item" | "material" | "circuit" | "service" | "crew";
    ids: number[];
    label: string;
  } | null>(null);

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

  const { data: circuits } = useQuery<PanelCircuit[]>({
    queryKey: ["/api/estimates", estimateId, "panel-circuits"],
    enabled: estimateId > 0,
  });

  const { data: services } = useQuery<EstimateService[]>({
    queryKey: ["/api/estimates", estimateId, "services"],
    enabled: estimateId > 0,
  });

  const { data: serviceBundles } = useQuery<ServiceBundle[]>({
    queryKey: ["/api/service-bundles"],
  });

  const { data: wireTypesData } = useQuery<WireType[]>({
    queryKey: ["/api/wire-types"],
  });

  const { data: aiAnalyses } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/ai-analyses"],
  });

  const { data: employeesData } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: settingsData } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const { data: crewData } = useQuery<EstimateCrew[]>({
    queryKey: ["/api/estimates", estimateId, "crew"],
    enabled: estimateId > 0,
  });

  const { data: jobTypesData } = useQuery<JobType[]>({
    queryKey: ["/api/job-types"],
  });

  const { data: permitFeeData } = useQuery<{ fee: number; category: string; label: string; scheduleName?: string }>({
    queryKey: ["/api/estimates", estimateId, "permit-fee"],
    enabled: estimateId > 0 && !!estimate,
  });

  const { data: permitSchedules } = useQuery<any[]>({
    queryKey: ["/api/permit-fee-schedules"],
    enabled: !!estimate,
  });
  const activeSchedule = (permitSchedules || []).find((s: any) => s.isActive);

  const jobTypeOptions = (jobTypesData && jobTypesData.length > 0)
    ? jobTypesData.map(jt => ({ value: jt.value, label: jt.label, multiplier: jt.multiplier }))
    : FALLBACK_JOB_TYPES;

  type BomPart = {
    partId: number;
    partName: string;
    category: string;
    unitCost: number;
    totalQuantity: number;
    totalCost: number;
    supplier: string | null;
    partNumber: string | null;
    usedInItems: Array<{ room: string; deviceType: string; quantity: number }>;
  };
  type BomData = {
    parts: BomPart[];
    totalPartsCost: number;
    unmatchedItems: Array<{ deviceType: string; room: string; quantity: number; materialCost: number }>;
  };

  const { data: bomData } = useQuery<BomData>({
    queryKey: ["/api/estimates", estimateId, "bom"],
    enabled: estimateId > 0,
  });

  type ComplianceResults = {
    rules: Array<{ rule: string; location: string; status: string; description: string }>;
    summary: { total: number; pass: number; warn: number; fail: number; info: number };
  };

  const { data: complianceResults } = useQuery<ComplianceResults | null>({
    queryKey: ["/api/estimates", estimateId, "compliance"],
    enabled: false,
    initialData: null,
  });
  const setComplianceResults = (data: ComplianceResults | null) => {
    queryClient.setQueryData(["/api/estimates", estimateId, "compliance"], data);
  };

  const updateEstimateMutation = useMutation({
    mutationFn: async (data: Partial<Estimate>) => {
      await apiRequest("PATCH", `/api/estimates/${estimateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "permit-fee"] });
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

  const generatePanelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/estimates/${estimateId}/generate-panel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "panel-circuits"] });
      toast({ title: "Panel schedule generated" });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const addCircuitMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/panel-circuits", { ...data, estimateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "panel-circuits"] });
      toast({ title: "Circuit added" });
      setAddCircuitOpen(false);
    },
  });

  const updateCircuitMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<PanelCircuit>) => {
      await apiRequest("PATCH", `/api/panel-circuits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "panel-circuits"] });
    },
  });

  const deleteCircuitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/panel-circuits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "panel-circuits"] });
      toast({ title: "Circuit removed" });
    },
  });

  const complianceCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/estimates/${estimateId}/compliance-check`);
      return await res.json();
    },
    onSuccess: (data) => {
      setComplianceResults(data);
      toast({ title: "Compliance check complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Compliance check failed", description: err.message, variant: "destructive" });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/estimates/${estimateId}/convert-to-invoice`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created", description: `Invoice ${data.invoiceNumber} generated` });
      navigate(`/invoices/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/estimate-services", { ...data, estimateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "services"] });
      toast({ title: "Service added" });
      setAddServiceOpen(false);
    },
  });

  const addCrewMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      await apiRequest("POST", "/api/estimate-crew", { estimateId, employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "crew"] });
      toast({ title: "Crew member added" });
    },
  });

  const removeCrewMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimate-crew/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "crew"] });
      toast({ title: "Crew member removed" });
    },
  });

  const createAssemblyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/device-assemblies", data);
      return res.json();
    },
    onSuccess: (newAssembly: DeviceAssembly) => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-assemblies"] });
      toast({ title: "Device added to catalog" });
      setCreateDeviceOpen(false);
      if (pendingDeviceItemId) {
        updateItemMutation.mutate({
          id: pendingDeviceItemId,
          deviceType: newAssembly.name,
          materialCost: newAssembly.materialCost,
          laborHours: newAssembly.laborHours,
          wireType: newAssembly.wireType,
          wireFootage: newAssembly.wireFootage,
          boxType: newAssembly.boxType,
          coverPlate: newAssembly.coverPlate,
        });
        setPendingDeviceItemId(null);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create device", description: err.message, variant: "destructive" });
    },
  });

  const handleExportClientEstimate = async () => {
    try {
      const res = await apiRequest("GET", `/api/estimates/${estimateId}/export/client-estimate`);
      const data = await res.json();
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      if (autoTableModule.applyPlugin) autoTableModule.applyPlugin(jsPDF);
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentW = pw - margin * 2;

      const settingsRes = await apiRequest("GET", "/api/settings");
      const settingsArr = await settingsRes.json();
      const sm: Record<string, string> = {};
      (settingsArr || []).forEach((s: any) => { sm[s.key] = s.value; });

      const companyName = sm.companyName || data.company?.name || "";
      const companyPhone = sm.companyPhone || data.company?.phone || "";
      const companyEmail = sm.companyEmail || data.company?.email || "";
      const companyAddress = sm.companyAddress || "";
      const logoData = sm.companyLogoData || null;
      const gstRate = parseFloat(sm.gstRate || "5") / 100;
      const gstLabel = sm.gstLabel || "GST 5%";
      const estimateNotes = sm.estimateNotes || "";
      const estimateTerms = sm.estimateTerms || "";
      const grandTotal = data.summary?.grandTotal || 0;
      const formattedDate = new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

      // Footer helper — draws on every page
      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, ph - 18, pw - margin, ph - 18);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        const footerParts = [companyName];
        if (companyPhone) footerParts.push(companyPhone);
        doc.text(footerParts.join(" | "), margin, ph - 12);
        if (companyEmail) doc.text(companyEmail, pw / 2, ph - 12, { align: "center" });
        doc.text(`Page ${pageNum} of ${totalPages}`, pw - margin, ph - 12, { align: "right" });
      };

      // ─── Page 1: Quote ───
      const infoBoxX = pw - margin - 72;
      const infoBoxW = 72;

      doc.setFillColor(70, 70, 70);
      doc.rect(infoBoxX, 15, infoBoxW, 7, "F");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("ESTIMATE", infoBoxX + 4, 20);
      doc.text(`#${estimateId}`, infoBoxX + infoBoxW - 4, 20, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.rect(infoBoxX, 22, infoBoxW, 7, "F");
      doc.line(infoBoxX, 22, infoBoxX + infoBoxW, 22);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("ESTIMATE DATE", infoBoxX + 4, 27);
      doc.setFont("helvetica", "normal");
      doc.text(formattedDate, infoBoxX + infoBoxW - 4, 27, { align: "right" });

      doc.setFillColor(250, 250, 250);
      doc.rect(infoBoxX, 29, infoBoxW, 7, "F");
      doc.line(infoBoxX, 29, infoBoxX + infoBoxW, 29);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", infoBoxX + 4, 34);
      doc.setFontSize(9);
      doc.text(`$${grandTotal.toFixed(2)}`, infoBoxX + infoBoxW - 4, 34, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.rect(infoBoxX, 15, infoBoxW, 21, "S");

      let cy = 32;
      if (logoData) {
        try {
          doc.addImage(logoData, "PNG", margin, 12, 50, 20);
          cy = 36;
        } catch (_) {}
      } else if (companyName) {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(companyName, margin, 24);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      if (companyAddress) { doc.text(companyAddress, margin, cy); cy += 5; }
      if (companyPhone) { doc.text(companyPhone, margin, cy); cy += 5; }
      if (companyEmail) { doc.text(companyEmail, margin, cy); cy += 5; }

      const sectionY = Math.max(cy + 8, 50);

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, sectionY, pw - margin, sectionY);

      // Client info (left) + Contact box (right)
      const clientColW = contentW / 2;
      let leftY = sectionY + 8;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (data.project?.clientName) { doc.text(data.project.clientName, margin, leftY); leftY += 5; }
      if (data.project?.address) {
        const addrLines = doc.splitTextToSize(data.project.address, clientColW - 10);
        doc.text(addrLines, margin, leftY);
        leftY += addrLines.length * 5;
      }

      const contactBoxX = margin + clientColW + 5;
      const contactBoxW = clientColW - 5;
      let contactY = sectionY + 4;
      doc.setFillColor(248, 248, 248);
      doc.rect(contactBoxX, contactY, contactBoxW, 28, "F");
      contactY += 6;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("CONTACT US", contactBoxX + 5, contactY);
      contactY += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      if (data.project?.clientName) { doc.text(data.project.clientName, contactBoxX + 5, contactY); contactY += 5; }
      if (data.project?.clientPhone) { doc.text(data.project.clientPhone, contactBoxX + 5, contactY); contactY += 5; }
      if (data.project?.clientEmail) { doc.text(data.project.clientEmail, contactBoxX + 5, contactY); contactY += 5; }

      let startY = Math.max(leftY, sectionY + 38) + 6;

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, startY - 4, pw - margin, startY - 4);

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("ESTIMATE", margin, startY + 4);
      startY += 10;

      // ─── Build HIGH-LEVEL line items (like reference quote) ───
      // Group all devices into one "Rough In/Finishing - Material & Labor" line
      // Services (panel, meter base etc.) as separate lines
      // Permit as separate line
      const headerColor = [100, 100, 100]; // Grey instead of amber
      const serviceRows: any[] = [];
      let servicesSubtotal = 0;

      // All device line items → single "Rough In/Finishing" line
      if (data.lineItems && data.lineItems.length > 0) {
        const deviceTotal = data.lineItems.reduce((s: number, i: any) => s + (i.total || 0), 0);
        servicesSubtotal += deviceTotal;
        serviceRows.push([
          { content: "Rough In/Finishing - Material & Labor", styles: { fontStyle: "normal" as const, fontSize: 9 } },
          { content: `$${deviceTotal.toFixed(2)}`, styles: { halign: "right" as const, fontSize: 9 } }
        ]);
      }

      // Each service as its own line (panel, meter base, etc.)
      if (data.services && data.services.length > 0) {
        for (const svc of data.services) {
          const svcTotal = svc.total || 0;
          servicesSubtotal += svcTotal;
          serviceRows.push([
            { content: svc.name, styles: { fontStyle: "normal" as const, fontSize: 9 } },
            { content: `$${svcTotal.toFixed(2)}`, styles: { halign: "right" as const, fontSize: 9 } }
          ]);
        }
      }

      // Permit fee as a line item in the table
      let pdfPermitFee = 0;
      if (estimate?.includePermit && permitFeeData?.fee) {
        pdfPermitFee = permitFeeData.fee;
        serviceRows.push([
          { content: "Electrical Permit", styles: { fontStyle: "normal" as const, fontSize: 9 } },
          { content: `$${pdfPermitFee.toFixed(2)}`, styles: { halign: "right" as const, fontSize: 9 } }
        ]);
      }

      if (serviceRows.length > 0) {
        (doc as any).autoTable({
          startY,
          margin: { left: margin, right: margin, bottom: 25 },
          head: [[
            { content: "Description", styles: { fillColor: headerColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 } },
            { content: "Total Price", styles: { fillColor: headerColor, textColor: [255, 255, 255], fontStyle: "bold", halign: "right", fontSize: 8.5 } }
          ]],
          body: serviceRows,
          theme: "plain",
          styles: { fontSize: 9, cellPadding: { left: 4, top: 4, bottom: 4, right: 4 }, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: contentW - 45 }, 1: { cellWidth: 45, halign: "right" } },
          didDrawCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.row.index > 0) {
              doc.setDrawColor(230, 230, 230);
              doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
            }
          },
        });
      }

      let finalY = (doc as any).lastAutoTable?.finalY || startY + 20;

      if (servicesSubtotal === 0) servicesSubtotal = grandTotal / (1 + gstRate);
      const subtotalWithPermit = servicesSubtotal + pdfPermitFee;

      // Summary box (right-aligned)
      finalY += 10;
      const summaryBoxX = pw / 2 + 10;
      const summaryBoxW = pw - margin - summaryBoxX;
      const valX = pw - margin;
      const labelX = summaryBoxX;

      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(250, 250, 250);
      doc.rect(summaryBoxX, finalY - 4, summaryBoxW, 8, "F");
      doc.line(summaryBoxX, finalY - 4, summaryBoxX + summaryBoxW, finalY - 4);
      doc.line(summaryBoxX, finalY + 4, summaryBoxX + summaryBoxW, finalY + 4);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Subtotal", labelX + 4, finalY + 1);
      doc.text(`$${subtotalWithPermit.toFixed(2)}`, valX - 4, finalY + 1, { align: "right" });

      finalY += 8;
      const taxAmount = subtotalWithPermit * gstRate;
      doc.setFillColor(255, 255, 255);
      doc.rect(summaryBoxX, finalY - 4, summaryBoxW, 8, "F");
      doc.line(summaryBoxX, finalY + 4, summaryBoxX + summaryBoxW, finalY + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Tax (${gstLabel})`, labelX + 4, finalY + 1);
      doc.text(`$${taxAmount.toFixed(2)}`, valX - 4, finalY + 1, { align: "right" });

      finalY += 12;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Total", labelX + 4, finalY);
      doc.text(`$${(subtotalWithPermit + taxAmount).toFixed(2)}`, valX - 4, finalY, { align: "right" });

      // Notes
      if (estimateNotes) {
        finalY += 14;
        if (finalY > ph - 50) { doc.addPage(); finalY = 25; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text("Notes", margin, finalY);
        finalY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const noteLines = doc.splitTextToSize(estimateNotes, contentW);
        doc.text(noteLines, margin, finalY);
        finalY += noteLines.length * 4;
      }

      // Terms
      if (estimateTerms) {
        finalY += 6;
        if (finalY > ph - 50) { doc.addPage(); finalY = 25; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text("Terms & Conditions", margin, finalY);
        finalY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const termLines = doc.splitTextToSize(estimateTerms, contentW);
        doc.text(termLines, margin, finalY);
      }

      // Draw footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }

      doc.save(`Client-Estimate-${estimateId}.pdf`);
      toast({ title: "Client Estimate PDF exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportMaterialList = async () => {
    try {
      const res = await apiRequest("GET", `/api/estimates/${estimateId}/export/material-list`);
      const data = await res.json();
      const { jsPDF } = await import("jspdf");
      const autoTableModule2 = await import("jspdf-autotable");
      if (autoTableModule2.applyPlugin) autoTableModule2.applyPlugin(jsPDF);
      const doc = new jsPDF({ orientation: "landscape" });
      const pw = doc.internal.pageSize.getWidth();

      const projectName = data.project?.name || "Untitled Project";
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(projectName, 14, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Contractor Material List", 14, 21);

      const deviceMap = new Map<string, { description: string; qty: number; boxType: string; coverPlate: string; wireType: string; wireFootage: number; }>();
      const miscPartsMap = new Map<string, number>();
      const wireMap = new Map<string, number>();
      const assemblies = (await (await apiRequest("GET", "/api/device-assemblies")).json()) as any[];
      const assemblyMap = new Map<string, any>();
      for (const a of assemblies) assemblyMap.set(a.name, a);

      for (const item of (data.items || [])) {
        const key = item.deviceType;
        const assembly = assemblyMap.get(key);
        if (deviceMap.has(key)) {
          const e = deviceMap.get(key)!;
          e.qty += item.quantity;
        } else {
          deviceMap.set(key, {
            description: assembly?.device || item.description || key,
            qty: item.quantity,
            boxType: assembly?.boxType || item.boxType || "N/A",
            coverPlate: assembly?.coverPlate || item.coverPlate || "N/A",
            wireType: item.wireType || "14/2 NMD-90",
            wireFootage: item.wireFootage || 15,
          });
        }
        if (assembly?.miscParts) {
          const parts = String(assembly.miscParts).split(",").map((s: string) => s.trim());
          for (const p of parts) {
            if (p) miscPartsMap.set(p, (miscPartsMap.get(p) || 0) + item.quantity);
          }
        }
        const wt = item.wireType || "14/2 NMD-90";
        const totalFeet = item.quantity * (item.wireFootage || 15);
        wireMap.set(wt, (wireMap.get(wt) || 0) + totalFeet);
      }

      const tableRows = Array.from(deviceMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, d]) => [
          name, d.qty, d.description, d.boxType, d.coverPlate, d.wireType,
          d.wireFootage, d.qty * d.wireFootage
        ]);

      (doc as any).autoTable({
        startY: 26,
        head: [[
          { content: "Item", styles: { fillColor: [100, 100, 100] } },
          { content: "Qty", styles: { fillColor: [100, 100, 100] } },
          { content: "Device Description", styles: { fillColor: [100, 100, 100] } },
          { content: "Box Type", styles: { fillColor: [100, 100, 100] } },
          { content: "Cover Plate", styles: { fillColor: [100, 100, 100] } },
          { content: "Wire Type", styles: { fillColor: [100, 100, 100] } },
          { content: "Wire (ft/ea)", styles: { fillColor: [100, 100, 100] } },
          { content: "Wire Total (ft)", styles: { fillColor: [100, 100, 100] } },
        ]],
        body: tableRows,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      let miscY = (doc as any).lastAutoTable?.finalY + 10;

      if (miscPartsMap.size > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("MISC PARTS SUMMARY", 14, miscY);
        miscY += 3;

        const miscRows = Array.from(miscPartsMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([part, qty]) => [part, qty]);

        (doc as any).autoTable({
          startY: miscY,
          head: [[
            { content: "Part", styles: { fillColor: [100, 100, 100] } },
            { content: "Qty Needed", styles: { fillColor: [100, 100, 100] } },
          ]],
          body: miscRows,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 } },
        });
      }

      doc.addPage("landscape");

      doc.setFillColor(100, 100, 100);
      doc.rect(14, 12, 120, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Wire Purchase List", 18, 18);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      const wfPct = estimate?.wasteFactor ?? 15;
      doc.text(`(includes ${wfPct}% waste factor)`, 18, 25);

      const wasteFactor = 1 + (wfPct / 100);
      const wireRows = Array.from(wireMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wt, totalFt]) => {
          const withWaste = Math.ceil(totalFt * wasteFactor);
          const metres = Math.ceil(withWaste * 0.3048);
          const spools150 = Math.ceil(metres / 150);
          const spools75 = Math.ceil(metres / 75);
          return [wt, withWaste, metres, spools150, spools75];
        });

      (doc as any).autoTable({
        startY: 30,
        head: [[
          { content: "Wire Type", styles: { fillColor: [100, 100, 100] } },
          { content: "Total Feet", styles: { fillColor: [100, 100, 100] } },
          { content: "Total Metres", styles: { fillColor: [100, 100, 100] } },
          { content: "Spools (150m)", styles: { fillColor: [100, 100, 100] } },
          { content: "Spools (75m)", styles: { fillColor: [100, 100, 100] } },
        ]],
        body: wireRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      });

      doc.save(`Material-List-${estimateId}.pdf`);
      toast({ title: "Material List PDF exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCecReport = async () => {
    try {
      const res = await apiRequest("GET", `/api/estimates/${estimateId}/export/cec-report`);
      const data = await res.json();
      const { jsPDF } = await import("jspdf");
      const autoTableModule3 = await import("jspdf-autotable");
      if (autoTableModule3.applyPlugin) autoTableModule3.applyPlugin(jsPDF);
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 82, 130);
      doc.text("CEC 2021 COMPLIANCE CHECK", pw / 2, 25, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(data.project?.name || "Untitled Project", 14, 38);
      doc.text(`Date: ${new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}`, 14, 44);

      let y = 55;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 82, 130);
      doc.text("Compliance Summary", 14, y);
      doc.setDrawColor(44, 82, 130);
      doc.line(14, y + 2, 90, y + 2);

      y += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const summary = data.summary || { total: 0, pass: 0, warn: 0, fail: 0, info: 0 };
      const summaryItems = [
        { label: "Total Checks", value: String(summary.total) },
        { label: "Passes", value: String(summary.pass), color: [34, 139, 34] as [number, number, number] },
        { label: "Warnings", value: String(summary.warn), color: [200, 150, 0] as [number, number, number] },
        { label: "Failures", value: String(summary.fail), color: [200, 0, 0] as [number, number, number] },
      ];

      for (const item of summaryItems) {
        doc.text(item.label, 30, y);
        if (item.color) {
          doc.setTextColor(...item.color);
        }
        doc.text(item.value, pw - 30, y, { align: "right" });
        doc.setTextColor(0, 0, 0);
        y += 7;
      }

      const score = summary.total > 0 ? Math.round((summary.pass / summary.total) * 100) : 0;
      doc.setFont("helvetica", "bold");
      doc.text("Compliance Score", 30, y);
      doc.setTextColor(score >= 80 ? 34 : score >= 50 ? 200 : 200, score >= 80 ? 139 : score >= 50 ? 150 : 0, score >= 80 ? 34 : 0);
      doc.setFontSize(12);
      doc.text(`${score}%`, pw - 30, y, { align: "right" });

      y += 15;
      doc.setTextColor(0, 0, 0);

      const allRules = data.rules || [];

      const failRules = allRules.filter((r: any) => r.status === "FAIL");
      const warnRules = allRules.filter((r: any) => r.status === "WARN");
      const infoRules = allRules.filter((r: any) => r.status === "INFO");
      const passRules = allRules.filter((r: any) => r.status === "PASS");

      const renderSection = (title: string, rules: any[], headerColor: [number, number, number], rowAlt: [number, number, number]) => {
        if (rules.length === 0) return;
        if (y > 240) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...headerColor);
        doc.text(title, 14, y);
        doc.setDrawColor(...headerColor);
        doc.line(14, y + 2, 14 + doc.getTextWidth(title), y + 2);
        y += 5;

        const rows = rules.map((r: any) => [
          r.status,
          r.rule || "",
          r.description || "",
          r.location || "",
        ]);

        (doc as any).autoTable({
          startY: y,
          head: [[
            { content: "Status", styles: { fillColor: headerColor } },
            { content: "Rule", styles: { fillColor: headerColor } },
            { content: "Description", styles: { fillColor: headerColor } },
            { content: "Location", styles: { fillColor: headerColor } },
          ]],
          body: rows,
          styles: { fontSize: 7, cellPadding: 3 },
          headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: rowAlt },
          columnStyles: {
            0: { cellWidth: 18, fontStyle: "bold" },
            1: { cellWidth: 45 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 30 },
          },
        });

        y = (doc as any).lastAutoTable?.finalY + 10 || y + 20;
      };

      renderSection("Failures", failRules, [180, 30, 30], [255, 235, 235]);
      renderSection("Warnings", warnRules, [180, 120, 0], [255, 248, 220]);
      renderSection("Information Notes", infoRules, [44, 82, 130], [230, 240, 250]);
      renderSection("Passed Checks", passRules, [34, 120, 34], [230, 245, 230]);

      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(128, 128, 128);
      doc.text("CEC 2021 Compliance Check", pw / 2, ph - 15, { align: "center" });
      doc.text("This report is for reference only. A licensed electrician should verify all code compliance.", pw / 2, ph - 10, { align: "center" });

      doc.save(`CEC-Report-${estimateId}.pdf`);
      toast({ title: "CEC Report PDF exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExcelExport = async () => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/export/excel`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${estimateId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Excel exported successfully" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportBomCsv = () => {
    if (!bomData || bomData.parts.length === 0) return;
    const CATEGORY_LABELS: Record<string, string> = {
      box: "Boxes", cover_plate: "Cover Plates", device: "Devices",
      connector: "Connectors", wire_nut: "Wire Nuts", mounting: "Mounting",
      misc: "Miscellaneous", breaker: "Breakers", panel_component: "Panel Components",
    };
    const rows: string[] = ["Category,Part Name,Part Number,Supplier,Unit Cost,Quantity,Total Cost"];
    const byCategory = new Map<string, BomPart[]>();
    for (const p of bomData.parts) {
      const arr = byCategory.get(p.category) || [];
      arr.push(p);
      byCategory.set(p.category, arr);
    }
    for (const [cat, parts] of Array.from(byCategory)) {
      for (const p of parts.sort((a: BomPart, b: BomPart) => a.partName.localeCompare(b.partName))) {
        rows.push([
          CATEGORY_LABELS[cat] || cat,
          `"${p.partName}"`,
          p.partNumber || "",
          p.supplier || "",
          p.unitCost.toFixed(2),
          p.totalQuantity.toString(),
          p.totalCost.toFixed(2),
        ].join(","));
      }
    }
    if (bomData.unmatchedItems.length > 0) {
      for (const u of bomData.unmatchedItems) {
        rows.push([
          "Unmatched",
          `"${u.deviceType}"`,
          "",
          "",
          u.materialCost.toFixed(2),
          u.quantity.toString(),
          (u.materialCost * u.quantity).toFixed(2),
        ].join(","));
      }
    }
    rows.push(`,,,,Total,,${(bomData.totalPartsCost + bomData.unmatchedItems.reduce((s, u) => s + u.materialCost * u.quantity, 0)).toFixed(2)}`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bom-estimate-${estimateId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "BOM exported as CSV" });
  };

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimate-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "services"] });
      toast({ title: "Service removed" });
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

  // Wire cost from wire_types catalog
  const wireCostLookup = new Map<string, number>();
  for (const wt of (wireTypesData || [])) wireCostLookup.set(wt.name, wt.costPerFoot);
  const totalWireCost = (items || []).reduce((sum, item) => {
    const costPerFt = wireCostLookup.get(item.wireType || "") || 0;
    return sum + item.quantity * item.wireFootage * costPerFt;
  }, 0);

  const serviceMaterialCost = (services || []).reduce((sum, s) => sum + s.materialCost, 0);
  const serviceLaborHours = (services || []).reduce((sum, s) => sum + s.laborHours, 0);
  const serviceLaborCost = serviceLaborHours * estimate.laborRate;

  const combinedMaterialCost = totalMaterialCost + totalWireCost + serviceMaterialCost;
  const combinedLaborCost = totalLaborCost + serviceLaborCost;

  const materialWithMarkup = combinedMaterialCost * (1 + estimate.materialMarkupPct / 100);
  const laborWithMarkup = combinedLaborCost * (1 + estimate.laborMarkupPct / 100);
  const subtotal = materialWithMarkup + laborWithMarkup;
  const overhead = subtotal * (estimate.overheadPct / 100);
  const subtotalWithOverhead = subtotal + overhead;
  const profit = subtotalWithOverhead * (estimate.profitPct / 100);
  const permitFee = estimate.includePermit ? (permitFeeData?.fee || 0) : 0;
  const grandTotal = subtotalWithOverhead + profit + permitFee;

  const totalCircuitAmps = (circuits || []).reduce((sum, c) => sum + c.amps * c.poles, 0);
  const recommendedPanelSize = totalCircuitAmps <= 100 ? 100 : totalCircuitAmps <= 200 ? 200 : 400;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/projects/${estimate.projectId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-estimate">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <Input
            className="text-2xl font-bold tracking-tight border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
            defaultValue={estimate.name}
            key={`name-${estimate.id}-${estimate.name}`}
            onBlur={(e) => { if (e.target.value !== estimate.name) updateEstimateMutation.mutate({ name: e.target.value }); }}
            data-testid="input-estimate-name"
          />
          <p className="text-sm text-muted-foreground">
            Created {new Date(estimate.createdAt).toLocaleDateString("en-CA")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportMaterialList()} data-testid="button-export-material">
                <FileText className="w-4 h-4 mr-2" />
                Material List PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportClientEstimate()} data-testid="button-export-client">
                <FileText className="w-4 h-4 mr-2" />
                Client Estimate PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCecReport()} data-testid="button-export-cec">
                <FileText className="w-4 h-4 mr-2" />
                CEC Report PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExcelExport()} data-testid="button-export-excel">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => convertToInvoiceMutation.mutate()}
            disabled={convertToInvoiceMutation.isPending}
            data-testid="button-convert-to-invoice"
          >
            <FileOutput className="w-4 h-4 mr-2" />
            {convertToInvoiceMutation.isPending ? "Converting..." : "Convert to Invoice"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <p className="text-xs text-muted-foreground">{(totalLaborHours + serviceLaborHours).toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Cable className="w-4 h-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Wire</span>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-wire">
              ${totalWireCost.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{totalWireFootage.toFixed(0)} ft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                id="include-permit"
                checked={estimate.includePermit}
                onCheckedChange={(checked) => updateEstimateMutation.mutate({ includePermit: !!checked } as any)}
                data-testid="checkbox-include-permit"
              />
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <label htmlFor="include-permit" className="text-xs text-muted-foreground cursor-pointer">Permit Fee</label>
            </div>
            <p className="text-lg font-bold" data-testid="text-permit-fee">
              ${estimate.includePermit ? (permitFeeData?.fee || 0).toFixed(2) : "0.00"}
            </p>
            {estimate.includePermit && permitFeeData?.label && (
              <p className="text-xs text-muted-foreground truncate">{permitFeeData.label}</p>
            )}
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

      <Tabs defaultValue="line-items">
        <TabsList data-testid="tabs-estimate" className="flex-wrap">
          <TabsTrigger value="line-items" data-testid="tab-line-items">
            <Package className="w-4 h-4 mr-1" />
            Line Items
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <Layers className="w-4 h-4 mr-1" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="wire" data-testid="tab-wire">
            <Cable className="w-4 h-4 mr-1" />
            Wire
          </TabsTrigger>
          <TabsTrigger value="labour" data-testid="tab-labour">
            <Users className="w-4 h-4 mr-1" />
            Labour
          </TabsTrigger>
          <TabsTrigger value="panel-schedule" data-testid="tab-panel-schedule">
            <Zap className="w-4 h-4 mr-1" />
            Panel Schedule
          </TabsTrigger>
          <TabsTrigger value="cec-compliance" data-testid="tab-cec-compliance">
            <ShieldCheck className="w-4 h-4 mr-1" />
            CEC Compliance
          </TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">
            <Wrench className="w-4 h-4 mr-1" />
            Services
          </TabsTrigger>
          <TabsTrigger value="permits" data-testid="tab-permits">
            <ShieldCheck className="w-4 h-4 mr-1" />
            Permits
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis">
            <ScanLine className="w-4 h-4 mr-1" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="line-items">
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
            <CardContent className="p-0">
              {!items || items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No line items</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add items from the device assembly library or create custom items
                  </p>
                </div>
              ) : (() => {
                const roomGroups: Record<string, EstimateItem[]> = {};
                for (const item of items) {
                  const room = item.room || "Unassigned";
                  if (!roomGroups[room]) roomGroups[room] = [];
                  roomGroups[room].push(item);
                }
                const roomNames = Object.keys(roomGroups).sort();
                const totalDevices = items.reduce((s, i) => s + i.quantity, 0);
                const totalDeviceTypes = new Set(items.map(i => i.deviceType)).size;
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs uppercase text-muted-foreground">Room / Device</TableHead>
                          <TableHead className="text-right w-20 text-xs uppercase text-muted-foreground">Count</TableHead>
                          <TableHead className="w-24 text-xs uppercase text-muted-foreground">Edit</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomNames.map((roomName) => {
                          const roomItems = roomGroups[roomName];
                          const deviceCount = roomItems.reduce((s, i) => s + i.quantity, 0);
                          return (
                            <Fragment key={roomName}>
                              <TableRow className="bg-primary/5 border-b-0" data-testid={`row-room-${roomName}`}>
                                <TableCell className="py-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 rounded-sm bg-primary" />
                                    <span className="text-sm font-bold uppercase tracking-wide">{roomName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-2.5">
                                  <span className="text-sm font-semibold">{deviceCount} devices</span>
                                </TableCell>
                                <TableCell className="py-2.5"></TableCell>
                                <TableCell className="py-2.5"></TableCell>
                              </TableRow>
                              {roomItems.map((item) => (
                                <TableRow key={item.id} className="group hover:bg-muted/30" data-testid={`row-item-${item.id}`}>
                                  <TableCell className="pl-10 py-2">
                                    <span className="text-sm">{item.deviceType}</span>
                                  </TableCell>
                                  <TableCell className="text-right py-2">
                                    <span className="text-sm">{item.quantity}</span>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input
                                      type="number"
                                      className="w-20 h-7 text-center text-sm"
                                      defaultValue={item.quantity}
                                      key={`qty-${item.id}-${item.quantity}`}
                                      onBlur={(e) => { const v = parseInt(e.target.value) || 1; if (v !== item.quantity) updateItemMutation.mutate({ id: item.id, quantity: v }); }}
                                      min={0}
                                      data-testid={`input-qty-${item.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setDeleteTarget({ type: "item", ids: [item.id], label: item.deviceType })}
                                      data-testid={`button-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="px-6 py-3 border-t">
                      <p className="text-xs text-primary font-medium">
                        {totalDeviceTypes} device types | {totalDevices} total devices
                      </p>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Device Materials</span>
                  <span>${totalMaterialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Wire ({totalWireFootage.toFixed(0)} ft)</span>
                  <span>${totalWireCost.toFixed(2)}</span>
                </div>
                {estimate.materialMarkupPct > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Material Markup ({estimate.materialMarkupPct}%)</span>
                    <span>${((totalMaterialCost + totalWireCost) * estimate.materialMarkupPct / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Labor ({totalLaborHours.toFixed(1)} hrs @ ${estimate.laborRate}/hr)</span>
                  <span>${totalLaborCost.toFixed(2)}</span>
                </div>
                {estimate.laborMarkupPct > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Labor Markup ({estimate.laborMarkupPct}%)</span>
                    <span>${(totalLaborCost * estimate.laborMarkupPct / 100).toFixed(2)}</span>
                  </div>
                )}
                {serviceMaterialCost > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Service Materials</span>
                    <span>${serviceMaterialCost.toFixed(2)}</span>
                  </div>
                )}
                {serviceLaborHours > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Service Labor ({serviceLaborHours.toFixed(1)} hrs)</span>
                    <span>${serviceLaborCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between gap-4 text-sm font-medium">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Overhead ({estimate.overheadPct}%)</span>
                  <span>${overhead.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Profit ({estimate.profitPct}%)</span>
                  <span>${profit.toFixed(2)}</span>
                </div>
                {estimate.includePermit && permitFee > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      TSBC Permit Fee{permitFeeData?.label ? ` (${permitFeeData.label})` : ""}
                    </span>
                    <span>${permitFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between gap-4 text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-chart-3">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">Bill of Materials</CardTitle>
              <div className="flex gap-2">
                {bomData && bomData.parts.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleExportBomCsv} data-testid="button-export-bom">
                    <Download className="w-4 h-4 mr-1" />
                    Export BOM
                  </Button>
                )}
                <Button size="sm" onClick={() => setAddItemOpen(true)} data-testid="button-add-material">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Material
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!items || items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <Layers className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No materials</p>
                  <p className="text-xs text-muted-foreground mt-1">Add line items to see materials breakdown</p>
                </div>
              ) : (() => {
                const CATEGORY_LABELS: Record<string, string> = {
                  box: "Boxes", cover_plate: "Cover Plates", device: "Devices",
                  connector: "Connectors", wire_nut: "Wire Nuts", mounting: "Mounting",
                  misc: "Miscellaneous", breaker: "Breakers", panel_component: "Panel Components",
                };
                const CATEGORY_ORDER = ["device", "box", "cover_plate", "connector", "wire_nut", "mounting", "breaker", "panel_component", "misc"];

                // BOM view — group parts by category
                if (bomData && bomData.parts.length > 0) {
                  const byCategory = new Map<string, BomPart[]>();
                  for (const p of bomData.parts) {
                    const arr = byCategory.get(p.category) || [];
                    arr.push(p);
                    byCategory.set(p.category, arr);
                  }
                  const sortedCategories = CATEGORY_ORDER.filter(c => byCategory.has(c));
                  // Include any categories not in the predefined order
                  for (const c of Array.from(byCategory.keys())) {
                    if (!sortedCategories.includes(c)) sortedCategories.push(c);
                  }

                  const unmatchedTotal = bomData.unmatchedItems.reduce((s, u) => s + u.materialCost * u.quantity, 0);

                  return (
                    <>
                      <Accordion type="multiple" defaultValue={sortedCategories} className="w-full">
                        {sortedCategories.map(cat => {
                          const parts = byCategory.get(cat)!.sort((a, b) => a.partName.localeCompare(b.partName));
                          const catTotal = parts.reduce((s, p) => s + p.totalCost, 0);
                          return (
                            <AccordionItem key={cat} value={cat} className="border-b last:border-b-0">
                              <AccordionTrigger className="px-6 py-3 hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[cat] || cat}</Badge>
                                    <span className="text-xs text-muted-foreground">{parts.length} item{parts.length !== 1 ? "s" : ""}</span>
                                  </div>
                                  <span className="text-sm font-semibold">${catTotal.toFixed(2)}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-0 pb-0">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="pl-10">Part Name</TableHead>
                                      <TableHead className="w-32">Part #</TableHead>
                                      <TableHead className="w-32">Supplier</TableHead>
                                      <TableHead className="text-right w-24">Unit Cost</TableHead>
                                      <TableHead className="text-right w-20">Qty</TableHead>
                                      <TableHead className="text-right w-28">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {parts.map(p => (
                                      <TableRow key={p.partId}>
                                        <TableCell className="pl-10">
                                          <span className="text-sm">{p.partName}</span>
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-xs text-muted-foreground">{p.partNumber || "—"}</span>
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-xs text-muted-foreground">{p.supplier || "—"}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-sm">${p.unitCost.toFixed(2)}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-sm">{p.totalQuantity}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-sm font-medium">${p.totalCost.toFixed(2)}</span>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>

                      {bomData.unmatchedItems.length > 0 && (
                        <div className="border-t">
                          <div className="px-6 py-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-700">Unmatched Items (no parts breakdown)</span>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="pl-10">Device</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead className="text-right w-20">Qty</TableHead>
                                <TableHead className="text-right w-28">Cost/ea</TableHead>
                                <TableHead className="text-right w-28">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bomData.unmatchedItems.map((u, i) => (
                                <TableRow key={i}>
                                  <TableCell className="pl-10 text-sm">{u.deviceType}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{u.room}</TableCell>
                                  <TableCell className="text-right text-sm">{u.quantity}</TableCell>
                                  <TableCell className="text-right text-sm">${u.materialCost.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">${(u.materialCost * u.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="px-6 border-t pt-4 pb-4 space-y-1">
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Parts Total:</span>
                          <span>${bomData.totalPartsCost.toFixed(2)}</span>
                        </div>
                        {unmatchedTotal > 0 && (
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-muted-foreground">Unmatched Materials:</span>
                            <span>${unmatchedTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 text-sm font-bold pt-1 border-t">
                          <span>Total Material Cost:</span>
                          <span data-testid="text-materials-grand-total">${(bomData.totalPartsCost + unmatchedTotal).toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                }

                // Fallback: legacy flat material view (no parts breakdown available)
                const assemblyMap = new Map<string, DeviceAssembly>();
                for (const a of (assemblies || [])) assemblyMap.set(a.name, a);

                const materialGroups: Record<string, {
                  itemIds: number[];
                  qty: number;
                  materialCost: number;
                  inCatalog: boolean;
                }> = {};
                for (const item of items) {
                  const key = item.deviceType;
                  const assembly = assemblyMap.get(key) || findBestCatalogMatch(key, assemblies || []);
                  if (materialGroups[key]) {
                    materialGroups[key].qty += item.quantity;
                    materialGroups[key].itemIds.push(item.id);
                  } else {
                    materialGroups[key] = {
                      itemIds: [item.id],
                      qty: item.quantity,
                      materialCost: item.materialCost,
                      inCatalog: !!assembly,
                    };
                  }
                }
                const materialRows = Object.entries(materialGroups).sort(([a], [b]) => a.localeCompare(b));
                const materialGrandTotal = materialRows.reduce((s, [, d]) => s + d.qty * d.materialCost, 0);

                return (
                  <>
                    <div className="px-6 py-3 bg-muted/50 border-b">
                      <p className="text-xs text-muted-foreground">Legacy view — assign parts to assemblies in Settings for full BOM breakdown</p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right w-20">Qty</TableHead>
                            <TableHead className="text-right w-28">Unit Cost</TableHead>
                            <TableHead className="text-right w-28">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialRows.map(([device, d]) => {
                            const total = d.qty * d.materialCost;
                            return (
                              <TableRow key={device} className="group" data-testid={`row-material-${device}`}>
                                <TableCell>
                                  <Combobox
                                    value={device}
                                    options={(assemblies || []).map(a => ({
                                      value: a.name,
                                      label: a.name,
                                      detail: `$${a.materialCost.toFixed(2)}`,
                                      group: a.category,
                                    }))}
                                    onValueChange={(newDevice) => {
                                      if (newDevice === device) return;
                                      const assembly = (assemblies || []).find(a => a.name === newDevice);
                                      for (const id of d.itemIds) {
                                        updateItemMutation.mutate({
                                          id,
                                          deviceType: newDevice,
                                          ...(assembly ? {
                                            materialCost: assembly.materialCost,
                                            boxType: assembly.boxType,
                                            coverPlate: assembly.coverPlate,
                                            wireType: assembly.wireType,
                                            wireFootage: assembly.wireFootage,
                                            laborHours: assembly.laborHours,
                                          } : {}),
                                        });
                                      }
                                    }}
                                    allowCustom
                                    placeholder="Select device..."
                                    searchPlaceholder="Search catalog..."
                                    className="min-w-[180px]"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    className="w-20 h-7 text-right text-sm"
                                    defaultValue={d.qty}
                                    key={`mat-qty-${device}-${d.qty}`}
                                    onBlur={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      if (newQty !== d.qty) {
                                        const ratio = newQty / d.qty;
                                        for (const id of d.itemIds) {
                                          const item = (items || []).find(i => i.id === id);
                                          if (item) {
                                            updateItemMutation.mutate({ id, quantity: Math.max(1, Math.round(item.quantity * ratio)) });
                                          }
                                        }
                                      }
                                    }}
                                    min={1}
                                    data-testid={`input-mat-qty-${device}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="w-28 h-7 text-right text-sm"
                                    defaultValue={d.materialCost}
                                    key={`mat-cost-${device}-${d.materialCost}`}
                                    onBlur={(e) => {
                                      const v = parseFloat(e.target.value) || 0;
                                      if (v !== d.materialCost) {
                                        for (const id of d.itemIds) {
                                          updateItemMutation.mutate({ id, materialCost: v });
                                        }
                                      }
                                    }}
                                    data-testid={`input-mat-cost-${device}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm font-medium">${total.toFixed(2)}</span>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeleteTarget({ type: "material", ids: d.itemIds, label: `all ${d.itemIds.length} item(s) of "${device}"` })}
                                    data-testid={`button-delete-material-${device}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="px-6 border-t mt-0 pt-4 pb-4 flex justify-end gap-4">
                      <span className="text-sm font-medium">Total Material Cost:</span>
                      <span className="text-sm font-bold" data-testid="text-materials-grand-total">${materialGrandTotal.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wire">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-semibold">Wire Schedule — Spool Purchasing</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Waste:</span>
                  <Input
                    type="number"
                    className="w-16 h-7 text-right text-sm"
                    value={estimate?.wasteFactor ?? 15}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 100) {
                        updateEstimateMutation.mutate({ wasteFactor: v } as any);
                      }
                    }}
                    min={0}
                    max={100}
                    data-testid="input-waste-factor"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddWireRunOpen(true)} data-testid="button-add-wire">
                <Plus className="w-4 h-4 mr-1" />
                Add Wire Run
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!items || items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <Cable className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No wire data</p>
                  <p className="text-xs text-muted-foreground mt-1">Add line items to see wire schedule</p>
                </div>
              ) : (() => {
                const wasteFactor = (estimate?.wasteFactor ?? 15) / 100;
                const wireCostMap = new Map<string, number>();
                for (const wt of (wireTypesData || [])) {
                  wireCostMap.set(wt.name, wt.costPerFoot);
                }

                // Aggregate by wire type with room breakdown
                const wireSummary = new Map<string, { footage: number; costPerFt: number; rooms: Map<string, { footage: number; devices: string[] }> }>();
                for (const item of items) {
                  const wt = item.wireType || "Unassigned";
                  const totalFt = item.quantity * item.wireFootage;
                  const costPerFt = wireCostMap.get(wt) || 0;
                  const existing = wireSummary.get(wt) || { footage: 0, costPerFt, rooms: new Map() };
                  existing.footage += totalFt;
                  existing.costPerFt = costPerFt;
                  const room = item.room || "Unassigned";
                  const roomData = existing.rooms.get(room) || { footage: 0, devices: [] };
                  roomData.footage += totalFt;
                  roomData.devices.push(`${item.quantity}x ${item.deviceType}`);
                  existing.rooms.set(room, roomData);
                  wireSummary.set(wt, existing);
                }

                const wireEntries = Array.from(wireSummary.entries()).sort(([a], [b]) => a.localeCompare(b));
                const wireGrandTotal = wireEntries.reduce((s, [, d]) => s + d.footage * (1 + wasteFactor) * d.costPerFt, 0);

                // Spool overrides from estimate or local state
                const spoolOverrides: Record<string, { s150?: number; s75?: number }> =
                  (estimate?.spoolOverrides as any) || {};
                const getSpoolValue = (wt: string, size: "s150" | "s75", calc: number) => {
                  return localSpoolOverrides[wt]?.[size] ?? spoolOverrides[wt]?.[size] ?? calc;
                };

                return (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Wire Type</TableHead>
                            <TableHead className="text-right">Total ft</TableHead>
                            <TableHead className="text-right">Cost/ft</TableHead>
                            <TableHead className="text-right">w/ Waste ({estimate?.wasteFactor ?? 15}%)</TableHead>
                            <TableHead className="text-right">Metres</TableHead>
                            <TableHead className="text-right">150m Spools</TableHead>
                            <TableHead className="text-right">75m Spools</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wireEntries.map(([wt, data]) => {
                            const withWaste = data.footage * (1 + wasteFactor);
                            const metres = withWaste * 0.3048;
                            const calcSpools150 = Math.ceil(metres / 150);
                            const calcSpools75 = Math.ceil(metres / 75);
                            const totalCost = withWaste * data.costPerFt;
                            const roomEntries = Array.from(data.rooms.entries()).sort(([a], [b]) => a.localeCompare(b));
                            const affectedCount = (items || []).filter(i => (i.wireType || "Unassigned") === wt).length;
                            return (
                              <Fragment key={wt}>
                                <TableRow className="group" data-testid={`row-wire-${wt}`}>
                                  <TableCell>
                                    <Accordion type="single" collapsible className="border-none">
                                      <AccordionItem value={wt} className="border-none">
                                        <div className="flex items-center gap-2">
                                          <Select
                                            value={wt}
                                            onValueChange={(newType) => {
                                              if (newType === wt) return;
                                              if (!window.confirm(`Change wire type for ${affectedCount} item${affectedCount !== 1 ? "s" : ""} from "${wt}" to "${newType}"?`)) return;
                                              for (const item of (items || [])) {
                                                if ((item.wireType || "Unassigned") === wt) {
                                                  updateItemMutation.mutate({ id: item.id, wireType: newType });
                                                }
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-sm min-w-[140px]">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {(wireTypesData || []).map(w => (
                                                <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <AccordionTrigger className="py-0 text-xs text-muted-foreground hover:no-underline">
                                            {roomEntries.length} room{roomEntries.length !== 1 ? "s" : ""}
                                          </AccordionTrigger>
                                        </div>
                                        <AccordionContent className="pb-0 pt-2">
                                          <div className="space-y-1 pl-1">
                                            {roomEntries.map(([room, rd]) => (
                                              <div key={room} className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="font-medium">{room}</span>
                                                <span>{rd.footage.toFixed(0)} ft — {rd.devices.join(", ")}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{data.footage.toFixed(0)}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">${data.costPerFt.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-sm">{withWaste.toFixed(0)} ft</TableCell>
                                  <TableCell className="text-right text-sm">{metres.toFixed(0)} m</TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-right text-sm ml-auto"
                                      value={getSpoolValue(wt, "s150", calcSpools150)}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value) || 0;
                                        setLocalSpoolOverrides(prev => ({
                                          ...prev,
                                          [wt]: { ...prev[wt], s150: v },
                                        }));
                                      }}
                                      onBlur={() => {
                                        const merged = { ...spoolOverrides, ...localSpoolOverrides };
                                        updateEstimateMutation.mutate({ spoolOverrides: merged } as any);
                                      }}
                                      min={0}
                                      data-testid={`input-spools-150-${wt}`}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-right text-sm ml-auto"
                                      value={getSpoolValue(wt, "s75", calcSpools75)}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value) || 0;
                                        setLocalSpoolOverrides(prev => ({
                                          ...prev,
                                          [wt]: { ...prev[wt], s75: v },
                                        }));
                                      }}
                                      onBlur={() => {
                                        const merged = { ...spoolOverrides, ...localSpoolOverrides };
                                        updateEstimateMutation.mutate({ spoolOverrides: merged } as any);
                                      }}
                                      min={0}
                                      data-testid={`input-spools-75-${wt}`}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">${totalCost.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const wireItemIds = (items || []).filter(item => (item.wireType || "Unassigned") === wt).map(item => item.id);
                                        setDeleteTarget({ type: "material", ids: wireItemIds, label: `all ${wireItemIds.length} item(s) with wire type "${wt}"` });
                                      }}
                                      data-testid={`button-delete-wire-${wt}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="px-6 border-t mt-0 pt-4 pb-4 flex justify-end gap-4">
                      <span className="text-sm font-medium">Total Wire Cost:</span>
                      <span className="text-sm font-bold" data-testid="text-wire-grand-total">${wireGrandTotal.toFixed(2)}</span>
                    </div>

                    <div className="px-6 pb-4">
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium mb-1">CEC Wire Sizing Reference</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>15A → 14 AWG (14/2 NMD-90)</span>
                          <span>20A → 12 AWG (12/2 NMD-90)</span>
                          <span>30A → 10 AWG (10/3 NMD-90)</span>
                          <span>40-50A → 6 AWG (6/3 NMD-90)</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Add Wire Run Dialog */}
          {addWireRunOpen && (() => {
            const WireRunDialog = () => {
              const [wireType, setWireType] = useState("14/2 NMD-90");
              const [footage, setFootage] = useState(25);
              const [room, setRoom] = useState("");
              const [description, setDescription] = useState("");
              const selectedWire = (wireTypesData || []).find(w => w.name === wireType);
              return (
                <Dialog open={addWireRunOpen} onOpenChange={setAddWireRunOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Wire Run</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Wire Type</Label>
                        <Select value={wireType} onValueChange={setWireType}>
                          <SelectTrigger data-testid="select-wire-run-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(wireTypesData || []).map(w => (
                              <SelectItem key={w.id} value={w.name}>
                                {w.name} — ${w.costPerFoot.toFixed(2)}/ft
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Footage</Label>
                          <Input
                            type="number"
                            value={footage}
                            onChange={(e) => setFootage(parseInt(e.target.value) || 0)}
                            min={1}
                            data-testid="input-wire-run-footage"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Room</Label>
                          <Input
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                            placeholder="e.g. Kitchen"
                            data-testid="input-wire-run-room"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Home run to panel"
                          data-testid="input-wire-run-desc"
                        />
                      </div>
                      {selectedWire && (
                        <p className="text-xs text-muted-foreground">
                          Estimated cost: ${(footage * selectedWire.costPerFoot).toFixed(2)} ({footage} ft × ${selectedWire.costPerFoot.toFixed(2)}/ft)
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddWireRunOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => {
                            addItemMutation.mutate({
                              deviceType: description || "Custom Wire Run",
                              description: description || `${wireType} wire run`,
                              room: room || "",
                              quantity: 1,
                              materialCost: 0,
                              laborHours: 0.25,
                              wireType,
                              wireFootage: footage,
                              markupPct: 0,
                            });
                            setAddWireRunOpen(false);
                          }}
                          disabled={footage <= 0}
                          data-testid="button-submit-wire-run"
                        >
                          Add Wire Run
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            };
            return <WireRunDialog />;
          })()}
        </TabsContent>

        <TabsContent value="labour">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">Labour — Rough-In & Finish</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Job Type:</span>
                <Select
                  value={estimate?.jobType || "new_construction"}
                  onValueChange={(val) => {
                    const option = jobTypeOptions.find(j => j.value === val);
                    updateEstimateMutation.mutate({
                      jobType: val,
                      laborMultiplier: option?.multiplier || 1.0,
                    } as any);
                  }}
                >
                  <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-job-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypeOptions.map(j => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label} ({j.multiplier}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const allEmployees = employeesData || [];
                const crew = crewData || [];
                const crewEmployees = crew.map(c => allEmployees.find(e => e.id === c.employeeId)).filter(Boolean) as Employee[];
                const availableEmployees = allEmployees.filter(e => e.isActive && !crew.find(c => c.employeeId === e.id));

                const settingsMap: Record<string, string> = {};
                for (const s of (settingsData || [])) settingsMap[s.key] = s.value;
                const defaultRate = parseFloat(settingsMap.defaultLaborRate || "") || (estimate?.laborRate || 45);

                const blendedRate = crewEmployees.length > 0
                  ? crewEmployees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / crewEmployees.length
                  : defaultRate;

                // Calculate hours from line items with rough-in/finish split
                const assemblyMap = new Map<string, DeviceAssembly>();
                for (const a of (assemblies || [])) assemblyMap.set(a.name, a);

                let calcRoughInHours = 0;
                let calcFinishHours = 0;

                for (const item of (items || [])) {
                  const assembly = assemblyMap.get(item.deviceType) || findBestCatalogMatch(item.deviceType, assemblies || []);
                  const category = assembly?.category || "specialty";
                  const split = LABOUR_STAGE_SPLITS[category] || { roughIn: 0.60, finish: 0.40 };
                  const itemHours = item.quantity * item.laborHours;
                  calcRoughInHours += itemHours * split.roughIn;
                  calcFinishHours += itemHours * split.finish;
                }

                // Apply job type multiplier (renos, additions, commercial take more time)
                const jobType = estimate?.jobType || "new_construction";
                const jobOption = jobTypeOptions.find(j => j.value === jobType);
                const multiplier = estimate?.laborMultiplier ?? (jobOption?.multiplier || 1.0);
                calcRoughInHours *= multiplier;
                calcFinishHours *= multiplier;

                const calculatedHours = calcRoughInHours + calcFinishHours;
                const totalHours = estimate?.laborHoursOverride ?? calculatedHours;
                const isOverridden = estimate?.laborHoursOverride != null;

                // Scale rough-in/finish proportionally if overridden
                const scale = calculatedHours > 0 ? totalHours / calculatedHours : 1;
                const roughInHours = calcRoughInHours * scale;
                const finishHours = calcFinishHours * scale;

                const crewSize = crewEmployees.length || 1;
                const roughInDays = roughInHours / crewSize / 8;
                const finishDays = finishHours / crewSize / 8;
                const totalCrewDays = roughInDays + finishDays;

                const roughInCost = roughInHours * blendedRate;
                const finishCost = finishHours * blendedRate;
                const totalLabourCost = roughInCost + finishCost;

                return (
                  <div className="space-y-6">
                    {/* Crew Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Crew ({crewEmployees.length} members)
                        </h4>
                        {availableEmployees.length > 0 && (
                          <Select onValueChange={(val) => addCrewMutation.mutate(parseInt(val))}>
                            <SelectTrigger className="w-48 h-8 text-sm">
                              <SelectValue placeholder="Add crew member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEmployees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                  {emp.name} ({emp.role}) — ${emp.hourlyRate}/hr
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {crewEmployees.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {crew.map((c) => {
                            const emp = allEmployees.find(e => e.id === c.employeeId);
                            if (!emp) return null;
                            return (
                              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md text-sm">
                                <div>
                                  <span className="font-medium">{emp.name}</span>
                                  <span className="text-xs text-muted-foreground ml-1 capitalize">({emp.role})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs">${emp.hourlyRate}/hr</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDeleteTarget({ type: "crew", ids: [c.id], label: emp.name })}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          No crew assigned — using default rate of ${defaultRate.toFixed(2)}/hr. Add employees in Settings first.
                        </div>
                      )}
                      {crewEmployees.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Blended crew rate: ${blendedRate.toFixed(2)}/hr
                        </p>
                      )}
                    </div>

                    {/* Stage Summary — Rough-In vs Finish */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <h4 className="text-sm font-semibold">Rough-In Stage</h4>
                            <span className="text-xs text-muted-foreground ml-auto">Boxes, wire runs, rough wiring</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Hours</p>
                              <Input
                                type="number"
                                step="0.5"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(roughInHours.toFixed(1))}
                                key={`ri-hrs-${roughInHours.toFixed(1)}`}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  const newTotal = v + finishHours;
                                  updateEstimateMutation.mutate({ laborHoursOverride: newTotal } as any);
                                }}
                                data-testid="input-roughin-hours"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Crew Days</p>
                              <Input
                                type="number"
                                step="0.5"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(roughInDays.toFixed(1))}
                                key={`ri-days-${roughInDays.toFixed(1)}`}
                                onBlur={(e) => {
                                  const days = parseFloat(e.target.value) || 0;
                                  const newRoughInHrs = days * crewSize * 8;
                                  updateEstimateMutation.mutate({ laborHoursOverride: newRoughInHrs + finishHours } as any);
                                }}
                                data-testid="input-roughin-days"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Cost</p>
                              <Input
                                type="number"
                                step="10"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(roughInCost.toFixed(0))}
                                key={`ri-cost-${roughInCost.toFixed(0)}`}
                                onBlur={(e) => {
                                  const cost = parseFloat(e.target.value) || 0;
                                  const newRoughInHrs = blendedRate > 0 ? cost / blendedRate : 0;
                                  updateEstimateMutation.mutate({ laborHoursOverride: newRoughInHrs + finishHours } as any);
                                }}
                                data-testid="input-roughin-cost"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-green-200 dark:border-green-800">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <h4 className="text-sm font-semibold">Finish Stage</h4>
                            <span className="text-xs text-muted-foreground ml-auto">Devices, fixtures, trim</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Hours</p>
                              <Input
                                type="number"
                                step="0.5"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(finishHours.toFixed(1))}
                                key={`fin-hrs-${finishHours.toFixed(1)}`}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  const newTotal = roughInHours + v;
                                  updateEstimateMutation.mutate({ laborHoursOverride: newTotal } as any);
                                }}
                                data-testid="input-finish-hours"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Crew Days</p>
                              <Input
                                type="number"
                                step="0.5"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(finishDays.toFixed(1))}
                                key={`fin-days-${finishDays.toFixed(1)}`}
                                onBlur={(e) => {
                                  const days = parseFloat(e.target.value) || 0;
                                  const newFinishHrs = days * crewSize * 8;
                                  updateEstimateMutation.mutate({ laborHoursOverride: roughInHours + newFinishHrs } as any);
                                }}
                                data-testid="input-finish-days"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Cost</p>
                              <Input
                                type="number"
                                step="10"
                                className="h-8 text-sm font-bold"
                                defaultValue={parseFloat(finishCost.toFixed(0))}
                                key={`fin-cost-${finishCost.toFixed(0)}`}
                                onBlur={(e) => {
                                  const cost = parseFloat(e.target.value) || 0;
                                  const newFinishHrs = blendedRate > 0 ? cost / blendedRate : 0;
                                  updateEstimateMutation.mutate({ laborHoursOverride: roughInHours + newFinishHrs } as any);
                                }}
                                data-testid="input-finish-cost"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Totals Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.5"
                              className="w-24 text-lg font-bold"
                              value={totalHours.toFixed(1)}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                updateEstimateMutation.mutate({ laborHoursOverride: v } as any);
                              }}
                              data-testid="input-total-labour-hours"
                            />
                            {isOverridden && (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-xs text-amber-600">Adjusted</Badge>
                                <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={() => updateEstimateMutation.mutate({ laborHoursOverride: null } as any)}>
                                  Reset
                                </Button>
                              </div>
                            )}
                          </div>
                          {isOverridden && (
                            <p className="text-xs text-muted-foreground mt-1">Calculated: {calculatedHours.toFixed(1)} hrs</p>
                          )}
                          {multiplier !== 1.0 && (
                            <Badge variant="outline" className="text-xs mt-1">{jobOption?.label} {multiplier}x</Badge>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Crew Days</p>
                          <p className="text-lg font-bold" data-testid="text-crew-days">{totalCrewDays.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">
                            {roughInDays.toFixed(1)} rough-in + {finishDays.toFixed(1)} finish
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground mb-1">Rate</p>
                          <p className="text-lg font-bold">${blendedRate.toFixed(2)}/hr</p>
                          <p className="text-xs text-muted-foreground">{crewEmployees.length > 0 ? "Blended crew" : "Default"}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Labour Cost</p>
                          <p className="text-lg font-bold text-chart-3" data-testid="text-labour-total-cost">${totalLabourCost.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            ${roughInCost.toFixed(0)} rough-in + ${finishCost.toFixed(0)} finish
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panel-schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-semibold">
                  Panel Schedule ({circuits?.length || 0} circuits)
                </CardTitle>
                <Select
                  value={(estimate?.panelSize || 200).toString()}
                  onValueChange={(val) => updateEstimateMutation.mutate({ panelSize: parseInt(val) } as any)}
                >
                  <SelectTrigger className="w-28 h-8 text-sm" data-testid="select-panel-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100A Panel</SelectItem>
                    <SelectItem value="125">125A Panel</SelectItem>
                    <SelectItem value="200">200A Panel</SelectItem>
                    <SelectItem value="400">400A Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (circuits && circuits.length > 0) {
                      if (!window.confirm(`This will replace ${circuits.length} existing circuit(s). Continue?`)) return;
                    }
                    generatePanelMutation.mutate();
                  }}
                  disabled={generatePanelMutation.isPending}
                  data-testid="button-generate-panel"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {generatePanelMutation.isPending ? "Generating..." : "Generate from Line Items"}
                </Button>
                <Button size="sm" onClick={() => setAddCircuitOpen(true)} data-testid="button-add-circuit">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Circuit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!circuits || circuits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No circuits</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate circuits from line items or add them manually
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group circuits by panelName
                    const panelGroups = new Map<string, typeof circuits>();
                    for (const circuit of circuits!) {
                      const panel = (circuit as any).panelName || "Main Panel";
                      if (!panelGroups.has(panel)) panelGroups.set(panel, []);
                      panelGroups.get(panel)!.push(circuit);
                    }
                    return Array.from(panelGroups.entries()).map(([panelName, panelCircuits]) => {
                      const totalAmps = panelCircuits.reduce((s, c) => s + (c.amps * c.poles), 0);
                      return (
                        <div key={panelName} className="border rounded-lg">
                          <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">{panelName}</span>
                            <Badge variant="outline" className="text-xs">{panelCircuits.length} circuits</Badge>
                            <span className="text-xs text-muted-foreground ml-auto">{totalAmps}A total load</span>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-right">Circuit #</TableHead>
                                  <TableHead className="text-right">Amps</TableHead>
                                  <TableHead className="text-right">Poles</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Wire Type</TableHead>
                                  <TableHead className="text-right">Outlets</TableHead>
                                  <TableHead>GFCI</TableHead>
                                  <TableHead>AFCI</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {panelCircuits.map((circuit) => (
                                  <TableRow key={circuit.id} data-testid={`row-circuit-${circuit.id}`}>
                                    <TableCell className="text-right text-sm font-medium">{circuit.circuitNumber}</TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        className="w-16 text-right"
                                        value={circuit.amps}
                                        onChange={(e) => updateCircuitMutation.mutate({ id: circuit.id, amps: parseInt(e.target.value) || 15 })}
                                        data-testid={`input-circuit-amps-${circuit.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        className="w-14 text-right"
                                        value={circuit.poles}
                                        onChange={(e) => updateCircuitMutation.mutate({ id: circuit.id, poles: parseInt(e.target.value) || 1 })}
                                        min={1}
                                        max={3}
                                        data-testid={`input-circuit-poles-${circuit.id}`}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="min-w-[200px]"
                                        value={circuit.description}
                                        onChange={(e) => updateCircuitMutation.mutate({ id: circuit.id, description: e.target.value })}
                                        data-testid={`input-circuit-desc-${circuit.id}`}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={circuit.wireType || ""}
                                        onValueChange={(v) => updateCircuitMutation.mutate({ id: circuit.id, wireType: v || null })}
                                      >
                                        <SelectTrigger className="h-8 text-xs min-w-[120px]">
                                          <SelectValue placeholder="Wire type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(wireTypesData || []).map(wt => (
                                            <SelectItem key={wt.name} value={wt.name}>{wt.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">
                                      {circuit.outletCount > 0 ? circuit.outletCount : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={circuit.isGfci ? "default" : "secondary"}
                                        className="text-xs cursor-pointer select-none"
                                        onClick={() => updateCircuitMutation.mutate({ id: circuit.id, isGfci: !circuit.isGfci })}
                                        data-testid={`badge-gfci-${circuit.id}`}
                                      >
                                        {circuit.isGfci ? "Yes" : "No"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={circuit.isAfci ? "default" : "secondary"}
                                        className="text-xs cursor-pointer select-none"
                                        onClick={() => updateCircuitMutation.mutate({ id: circuit.id, isAfci: !circuit.isAfci })}
                                        data-testid={`badge-afci-${circuit.id}`}
                                      >
                                        {circuit.isAfci ? "Yes" : "No"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDeleteTarget({ type: "circuit", ids: [circuit.id], label: `Circuit #${circuit.circuitNumber} (${circuit.description})` })}
                                        data-testid={`button-delete-circuit-${circuit.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {circuits && circuits.length > 0 && (() => {
            // CEC Rule 8-200 load calculation
            const singlePoleCircuits = circuits.filter(c => c.poles === 1);
            const doublePoleCircuits = circuits.filter(c => c.poles === 2);
            const basicLoad = singlePoleCircuits.reduce((s, c) => s + c.amps * 120, 0);
            const largeLoad = doublePoleCircuits.reduce((s, c) => s + c.amps * c.poles * 120, 0);
            const totalConnectedLoad = basicLoad + largeLoad;
            const demandLoad = Math.min(basicLoad, 5000) + Math.max(0, basicLoad - 5000) * 0.25 + largeLoad;
            const demandAmps = Math.ceil(demandLoad / 240);
            const selectedPanelSize = estimate?.panelSize || 200;
            const panelSpaces = selectedPanelSize <= 100 ? 20 : selectedPanelSize <= 125 ? 30 : selectedPanelSize <= 200 ? 40 : 80;
            const spacesUsed = singlePoleCircuits.length + doublePoleCircuits.length * 2;
            const spareCircuits = circuits.filter(c => c.description.toLowerCase().includes("spare"));
            const gfciCount = circuits.filter(c => c.isGfci).length;
            const afciCount = circuits.filter(c => c.isAfci).length;
            const spacePct = Math.round((spacesUsed / panelSpaces) * 100);
            const spaceColor = spacePct >= 90 ? "bg-red-500" : spacePct >= 75 ? "bg-amber-500" : "bg-emerald-500";
            const recommendedSize = demandAmps <= 80 ? 100 : demandAmps <= 100 ? 125 : demandAmps <= 160 ? 200 : 400;
            const isOverloaded = demandAmps > selectedPanelSize * 0.8;

            return (
              <>
                {isOverloaded && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Panel May Be Overloaded</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Demand load ({demandAmps}A) exceeds 80% of {selectedPanelSize}A panel rating ({Math.round(selectedPanelSize * 0.8)}A).
                        Consider upgrading to a {recommendedSize}A panel.
                      </p>
                    </div>
                  </div>
                )}

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Panel Summary — CEC Rule 8-200</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Spaces progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Panel Spaces</span>
                        <span className="text-xs font-medium">{spacesUsed} / {panelSpaces} ({spacePct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${spaceColor}`} style={{ width: `${Math.min(100, spacePct)}%` }} />
                      </div>
                    </div>

                    {/* Demand calculation breakdown */}
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium mb-2">Demand Calculation (CEC Rule 8-200)</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Basic load (single-pole circuits)</span>
                          <span>{basicLoad.toLocaleString()}W</span>
                        </div>
                        <div className="flex justify-between pl-3">
                          <span>First 5,000W @ 100%</span>
                          <span>{Math.min(basicLoad, 5000).toLocaleString()}W</span>
                        </div>
                        {basicLoad > 5000 && (
                          <div className="flex justify-between pl-3">
                            <span>Remainder @ 25%</span>
                            <span>{Math.round((basicLoad - 5000) * 0.25).toLocaleString()}W</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Large appliances (double-pole)</span>
                          <span>{largeLoad.toLocaleString()}W</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1 font-medium text-foreground">
                          <span>Demand Load</span>
                          <span>{Math.round(demandLoad).toLocaleString()}W ({demandAmps}A @ 240V)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Circuits</p>
                        <p className="text-lg font-bold" data-testid="text-total-circuits">{circuits.length}</p>
                        <p className="text-xs text-muted-foreground">{singlePoleCircuits.length} single + {doublePoleCircuits.length} double pole</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Connected Load</p>
                        <p className="text-lg font-bold">{totalConnectedLoad.toLocaleString()}W</p>
                        <p className="text-xs text-muted-foreground">Demand: {Math.round(demandLoad).toLocaleString()}W</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Panel Size</p>
                        <p className="text-lg font-bold" data-testid="text-panel-size">{selectedPanelSize}A</p>
                        <p className="text-xs text-muted-foreground">
                          {recommendedSize !== selectedPanelSize
                            ? `Recommended: ${recommendedSize}A`
                            : "Size adequate"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Protection</p>
                        <p className="text-sm font-medium">{gfciCount} GFCI / {afciCount} AFCI</p>
                        <p className="text-xs text-muted-foreground">{spareCircuits.length} spare circuit{spareCircuits.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="cec-compliance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">CEC Compliance Check</CardTitle>
              <Button
                size="sm"
                onClick={() => complianceCheckMutation.mutate()}
                disabled={complianceCheckMutation.isPending}
                data-testid="button-run-compliance"
              >
                <Play className="w-4 h-4 mr-1" />
                {complianceCheckMutation.isPending ? "Running..." : "Run Compliance Check"}
              </Button>
            </CardHeader>
            <CardContent>
              {!complianceResults ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No compliance check run</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run a compliance check to verify CEC 2021 requirements
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Total Rules</p>
                      <p className="text-lg font-bold" data-testid="text-compliance-total">{complianceResults.summary.total}</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Passes</p>
                      <p className="text-lg font-bold" data-testid="text-compliance-pass">{complianceResults.summary.pass}</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Warnings</p>
                      <p className="text-lg font-bold" data-testid="text-compliance-warn">{complianceResults.summary.warn}</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Failures</p>
                      <p className="text-lg font-bold" data-testid="text-compliance-fail">{complianceResults.summary.fail}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...complianceResults.rules].sort((a, b) => {
                          const order: Record<string, number> = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
                          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                        }).map((rule, idx) => (
                          <TableRow key={idx} data-testid={`row-compliance-${idx}`}>
                            <TableCell className="text-sm font-medium">{rule.rule}</TableCell>
                            <TableCell className="text-sm">{rule.location}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  rule.status === "PASS" ? "default" :
                                  rule.status === "WARN" ? "secondary" :
                                  rule.status === "FAIL" ? "destructive" :
                                  "outline"
                                }
                                className="text-xs"
                                data-testid={`badge-compliance-status-${idx}`}
                              >
                                {rule.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{rule.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">
                Services ({services?.length || 0})
              </CardTitle>
              <Button size="sm" onClick={() => setAddServiceOpen(true)} data-testid="button-add-service">
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent>
              {!services || services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <Wrench className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No services added</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add service bundles to include additional work in this estimate
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Material $</TableHead>
                        <TableHead className="text-right">Labor Hrs</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                          <TableCell className="text-sm font-medium">{service.name}</TableCell>
                          <TableCell className="text-right text-sm">${service.materialCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{service.laborHours.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget({ type: "service", ids: [service.id], label: service.name })}
                              data-testid={`button-delete-service-${service.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {services && services.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Service Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Total Material Cost</span>
                    <span data-testid="text-service-material-total">${serviceMaterialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Total Labor Hours</span>
                    <span data-testid="text-service-labor-total">{serviceLaborHours.toFixed(2)} hrs</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between gap-4 text-sm font-medium">
                    <span>Total Service Cost</span>
                    <span data-testid="text-service-total">${(serviceMaterialCost + serviceLaborCost).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permits">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Electrical Permit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Include permit toggle */}
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="permit-toggle"
                  checked={estimate.includePermit}
                  onCheckedChange={(checked) => updateEstimateMutation.mutate({ includePermit: !!checked } as any)}
                />
                <div>
                  <label htmlFor="permit-toggle" className="text-sm font-medium cursor-pointer">
                    Include permit fee in this estimate
                  </label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the TSBC permit fee will be added to the grand total and appear on invoices
                  </p>
                </div>
              </div>

              {/* Auto-calculated fee */}
              {activeSchedule && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Auto-Calculated Fee</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Schedule</span>
                          <span>{permitFeeData?.scheduleName || activeSchedule.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Category</span>
                          <span>{permitFeeData?.label || "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-2">
                          <span>Calculated Fee</span>
                          <span className="text-lg">${(permitFeeData?.fee || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on: {estimate.jobType === "service_repair" || estimate.jobType === "renovation"
                            ? "Service Upgrade" : "Single Family"} — {estimate.panelSize}A panel
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Manual override */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Manual Override</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Override the auto-calculated fee with a custom amount. Leave empty to use the auto-calculated fee.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Leave blank for auto"
                            value={estimate.permitFeeOverride ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : parseFloat(e.target.value);
                              updateEstimateMutation.mutate({ permitFeeOverride: val } as any);
                            }}
                            className="w-40"
                          />
                          {estimate.permitFeeOverride !== null && estimate.permitFeeOverride !== undefined && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateEstimateMutation.mutate({ permitFeeOverride: null } as any)}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!activeSchedule && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No active permit fee schedule found.</p>
                    <p className="text-sm">Go to Settings &gt; Permits to activate a TSBC fee schedule.</p>
                  </CardContent>
                </Card>
              )}

              {/* Rate reference table */}
              {activeSchedule && (activeSchedule.rates as any) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">TSBC Rate Reference — {activeSchedule.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(activeSchedule.rates as any).residential_service && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Single Family (by Amps)</p>
                          {(activeSchedule.rates as any).residential_service.map((r: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{r.label}</span>
                              <span>${r.fee}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(activeSchedule.rates as any).service_upgrade && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Service Upgrade (by Amps)</p>
                          {(activeSchedule.rates as any).service_upgrade.map((r: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{r.label}</span>
                              <span>${r.fee}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(activeSchedule.rates as any).other && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Other (by Job Value)</p>
                          {(activeSchedule.rates as any).other.slice(0, 6).map((r: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{r.label}</span>
                              <span>${r.fee}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">AI Drawing Analysis</CardTitle>
              <Link href="/ai-analysis">
                <Button size="sm" data-testid="button-go-ai-analysis">
                  <ScanLine className="w-4 h-4 mr-1" />
                  Open AI Analysis
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(() => {
                const projectAnalyses = (aiAnalyses || []).filter(a => a.projectId === estimate.projectId);
                if (projectAnalyses.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 dark:bg-primary/20 mb-3">
                        <ScanLine className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">No analyses yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload electrical drawings or floor plans to auto-detect devices and generate line items
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {projectAnalyses.map((analysis) => {
                      const results = analysis.results as any;
                      const roomCount = results?.rooms?.length || results?.roomCount || 0;
                      const deviceCount = results?.devices?.length || results?.deviceCount || results?.rooms?.reduce((s: number, r: any) => s + (r.devices?.length || 0), 0) || 0;
                      const isPdf = analysis.fileName?.toLowerCase().endsWith(".pdf");
                      return (
                        <div key={analysis.id} className="border rounded-lg p-4" data-testid={`card-analysis-${analysis.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{analysis.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-xs">{analysis.analysisMode}</Badge>
                                  <Badge
                                    variant={analysis.status === "completed" ? "default" : "secondary"}
                                    className="text-xs"
                                    data-testid={`badge-analysis-status-${analysis.id}`}
                                  >
                                    {analysis.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(analysis.createdAt).toLocaleDateString("en-CA")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {isPdf && (
                                <a
                                  href={`/api/ai-analyses/${analysis.id}/file`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline" data-testid={`button-view-pdf-${analysis.id}`}>
                                    <Download className="w-4 h-4 mr-1" />
                                    View PDF
                                  </Button>
                                </a>
                              )}
                              <Link href="/ai-analysis">
                                <Button size="sm" variant="outline" data-testid={`button-view-analysis-${analysis.id}`}>
                                  View Results
                                </Button>
                              </Link>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Rooms:</span>
                              <span className="font-medium">{roomCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Devices:</span>
                              <span className="font-medium">{deviceCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        assemblies={assemblies || []}
        onAdd={(data) => addItemMutation.mutate(data)}
        isPending={addItemMutation.isPending}
      />

      <AddCircuitDialog
        open={addCircuitOpen}
        onOpenChange={setAddCircuitOpen}
        onAdd={(data) => addCircuitMutation.mutate(data)}
        isPending={addCircuitMutation.isPending}
        existingCount={circuits?.length || 0}
      />

      <AddServiceDialog
        open={addServiceOpen}
        onOpenChange={setAddServiceOpen}
        bundles={serviceBundles || []}
        onAdd={(data) => addServiceMutation.mutate(data)}
        isPending={addServiceMutation.isPending}
      />

      <CreateDeviceDialog
        open={createDeviceOpen}
        onOpenChange={setCreateDeviceOpen}
        onCreate={(data) => createAssemblyMutation.mutate(data)}
        isPending={createAssemblyMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "crew" ? "Remove Crew Member" : deleteTarget?.type === "material" ? "Delete Material Group" : "Delete Item"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "crew"
                ? `Remove ${deleteTarget.label} from the crew?`
                : deleteTarget?.type === "material"
                ? `This will delete ${deleteTarget.label}. This action cannot be undone.`
                : `Delete "${deleteTarget?.label}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                const { type, ids } = deleteTarget;
                if (type === "item" || type === "material") {
                  for (const id of ids) deleteItemMutation.mutate(id);
                } else if (type === "circuit") {
                  for (const id of ids) deleteCircuitMutation.mutate(id);
                } else if (type === "service") {
                  for (const id of ids) deleteServiceMutation.mutate(id);
                } else if (type === "crew") {
                  for (const id of ids) removeCrewMutation.mutate(id);
                }
                setDeleteTarget(null);
              }}
            >
              {deleteTarget?.type === "crew" ? "Remove" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    wireType: "14/2 NMD-90",
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

function AddCircuitDialog({ open, onOpenChange, onAdd, isPending, existingCount }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (data: any) => void;
  isPending: boolean;
  existingCount: number;
}) {
  const [form, setForm] = useState({
    circuitNumber: existingCount + 1,
    amps: 15,
    poles: 1,
    description: "",
    wireType: "14/2 NMD-90",
    isGfci: false,
    isAfci: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Circuit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Circuit #</Label>
              <Input
                type="number"
                min={1}
                value={form.circuitNumber}
                onChange={(e) => setForm(p => ({ ...p, circuitNumber: parseInt(e.target.value) || 1 }))}
                data-testid="input-circuit-number"
              />
            </div>
            <div className="space-y-2">
              <Label>Amps</Label>
              <Input
                type="number"
                value={form.amps}
                onChange={(e) => setForm(p => ({ ...p, amps: parseInt(e.target.value) || 15 }))}
                data-testid="input-new-circuit-amps"
              />
            </div>
            <div className="space-y-2">
              <Label>Poles</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={form.poles}
                onChange={(e) => setForm(p => ({ ...p, poles: parseInt(e.target.value) || 1 }))}
                data-testid="input-new-circuit-poles"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="e.g., Kitchen Receptacles"
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              required
              data-testid="input-new-circuit-desc"
            />
          </div>
          <div className="space-y-2">
            <Label>Wire Type</Label>
            <Input
              value={form.wireType}
              onChange={(e) => setForm(p => ({ ...p, wireType: e.target.value }))}
              data-testid="input-new-circuit-wire"
            />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isGfci"
                checked={form.isGfci}
                onCheckedChange={(checked) => setForm(p => ({ ...p, isGfci: !!checked }))}
                data-testid="checkbox-gfci"
              />
              <Label htmlFor="isGfci">GFCI</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isAfci"
                checked={form.isAfci}
                onCheckedChange={(checked) => setForm(p => ({ ...p, isAfci: !!checked }))}
                data-testid="checkbox-afci"
              />
              <Label htmlFor="isAfci">AFCI</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-circuit">
              {isPending ? "Adding..." : "Add Circuit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddServiceDialog({ open, onOpenChange, bundles, onAdd, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bundles: ServiceBundle[];
  onAdd: (data: any) => void;
  isPending: boolean;
}) {
  const [selectedBundle, setSelectedBundle] = useState("");

  const bundle = bundles.find(b => b.id.toString() === selectedBundle);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bundle) {
      onAdd({
        serviceBundleId: bundle.id,
        name: bundle.name,
        materialCost: bundle.materialCost,
        laborHours: bundle.laborHours,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Service Bundle</Label>
            <Select value={selectedBundle} onValueChange={setSelectedBundle}>
              <SelectTrigger data-testid="select-service-bundle">
                <SelectValue placeholder="Select a service..." />
              </SelectTrigger>
              <SelectContent>
                {bundles.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bundle && (
            <div className="rounded-md bg-muted p-3 space-y-1">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Material Cost</span>
                <span className="font-medium">${bundle.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Labor Hours</span>
                <span className="font-medium">{bundle.laborHours.toFixed(2)} hrs</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !bundle} data-testid="button-submit-service">
              {isPending ? "Adding..." : "Add Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateDeviceDialog({ open, onOpenChange, onCreate, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "receptacles",
    materialCost: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: form.name,
      device: form.name,
      category: form.category,
      materialCost: form.materialCost,
      laborHours: 0.25,
      wireType: "14/2 NMD-90",
      wireFootage: 15,
      boxType: "Single-gang device box, NM",
      coverPlate: "Standard cover plate",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Device to Catalog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Device Name</Label>
            <Input
              placeholder="e.g., Smart Dimmer Switch"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.materialCost}
                onChange={(e) => setForm(p => ({ ...p, materialCost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Wire type, labor hours, and box details can be edited after adding.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending ? "Creating..." : "Add to Catalog"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

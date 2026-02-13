import { useState } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Plus, Trash2, DollarSign, Clock, Cable,
  Package, Zap, ShieldCheck, Wrench, RefreshCw, Play,
  Download, FileText, FileSpreadsheet, ScanLine
} from "lucide-react";
import type {
  Estimate, EstimateItem, DeviceAssembly, PanelCircuit,
  EstimateService, ServiceBundle
} from "@shared/schema";

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const { toast } = useToast();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addCircuitOpen, setAddCircuitOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);

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

  const [complianceResults, setComplianceResults] = useState<{
    rules: Array<{ rule: string; location: string; status: string; description: string }>;
    summary: { total: number; pass: number; warn: number; fail: number; info: number };
  } | null>(null);

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

  const handleExportClientEstimate = async () => {
    try {
      const res = await apiRequest("GET", `/api/estimates/${estimateId}/export/client-estimate`);
      const data = await res.json();
      const { jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      const settingsRes = await apiRequest("GET", "/api/settings");
      const settingsArr = await settingsRes.json();
      const sm: Record<string, string> = {};
      (settingsArr || []).forEach((s: any) => { sm[s.key] = s.value; });

      const companyName = sm.companyName || data.company?.name || "SparkyEstimate";
      const companyPhone = sm.companyPhone || data.company?.phone || "";
      const companyEmail = sm.companyEmail || data.company?.email || "";
      const companyAddress = sm.companyAddress || "";
      const gstRate = parseFloat(sm.gstRate || "5") / 100;
      const gstLabel = sm.gstLabel || "GST 5%";

      doc.setFillColor(80, 80, 80);
      doc.rect(pw - 70, 10, 60, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ESTIMATE", pw - 65, 18);
      doc.text("ESTIMATE DATE", pw - 65, 23);
      doc.text("TOTAL", pw - 65, 28);
      doc.setFont("helvetica", "normal");
      doc.text(`#${estimateId}`, pw - 15, 18, { align: "right" });
      doc.text(new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }), pw - 15, 23, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`$${data.summary?.grandTotal?.toFixed(2) || "0.00"}`, pw - 15, 28, { align: "right" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, 14, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      let cy = 30;
      if (companyAddress) { doc.text(companyAddress, 14, cy); cy += 5; }
      if (companyPhone) { doc.text(companyPhone, 14, cy); cy += 5; }
      if (companyEmail) { doc.text(companyEmail, 14, cy); cy += 5; }

      const clientY = 50;
      if (data.project) {
        doc.setFillColor(240, 240, 240);
        doc.rect(pw / 2, clientY - 5, pw / 2 - 14, 25, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("CONTACT US", pw / 2 + 4, clientY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        if (data.project.clientName) doc.text(data.project.clientName, pw / 2 + 4, clientY + 6);
        if (data.project.clientPhone) doc.text(data.project.clientPhone, pw / 2 + 4, clientY + 12);
        if (data.project.clientEmail) doc.text(data.project.clientEmail, pw / 2 + 4, clientY + 18);

        doc.setFontSize(9);
        doc.text(data.project.clientName || "", 14, clientY + 6);
        if (data.project.address) doc.text(data.project.address, 14, clientY + 12);
      }

      let startY = 85;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ESTIMATE", 14, startY);
      startY += 5;

      const serviceRows: any[] = [];
      if (data.lineItems && data.lineItems.length > 0) {
        const roomGroups: Record<string, typeof data.lineItems> = {};
        for (const item of data.lineItems) {
          const room = item.room || "General";
          if (!roomGroups[room]) roomGroups[room] = [];
          roomGroups[room].push(item);
        }
        for (const [room, roomItems] of Object.entries(roomGroups)) {
          const roomTotal = (roomItems as any[]).reduce((s: number, i: any) => s + (i.total || 0), 0);
          const descs = (roomItems as any[]).map((i: any) => `${i.quantity}x ${i.deviceType}`).join(", ");
          serviceRows.push([
            `Supply and install electrical for ${room}`,
            `$${roomTotal.toFixed(2)}`
          ]);
          serviceRows.push([
            { content: descs, styles: { fontSize: 7, textColor: [100, 100, 100], cellPadding: { left: 4, top: 1, bottom: 3, right: 2 } } },
            ""
          ]);
        }
      }
      if (data.services && data.services.length > 0) {
        for (const svc of data.services) {
          serviceRows.push([svc.name, `$${svc.total?.toFixed(2) || "0.00"}`]);
        }
      }

      if (serviceRows.length > 0) {
        (doc as any).autoTable({
          startY,
          head: [
            [
              { content: "Services", styles: { fillColor: [255, 152, 0], textColor: [255, 255, 255], fontStyle: "bold" } },
              { content: "Amount", styles: { fillColor: [255, 152, 0], textColor: [255, 255, 255], fontStyle: "bold", halign: "right" } }
            ]
          ],
          body: serviceRows,
          theme: "plain",
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: pw - 70 }, 1: { cellWidth: 42, halign: "right" } },
          alternateRowStyles: {},
        });
      }

      let finalY = (doc as any).lastAutoTable?.finalY || startY + 20;
      finalY += 5;

      const servicesSubtotal = data.summary?.grandTotal ? (data.summary.grandTotal / (1 + gstRate)) : 0;
      const taxAmount = data.summary?.grandTotal ? data.summary.grandTotal - servicesSubtotal : 0;

      doc.setDrawColor(200, 200, 200);
      doc.line(pw / 2, finalY, pw - 14, finalY);
      finalY += 5;
      const summaryX = pw / 2 + 5;
      const valX = pw - 15;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      const summaryLines = [
        { label: "Services subtotal:", value: `$${servicesSubtotal.toFixed(2)}` },
      ];

      doc.setFontSize(10);
      finalY += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal", summaryX, finalY);
      doc.text(`$${servicesSubtotal.toFixed(2)}`, valX, finalY, { align: "right" });

      finalY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Tax (${gstLabel})`, summaryX, finalY);
      doc.text(`$${taxAmount.toFixed(2)}`, valX, finalY, { align: "right" });

      finalY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(summaryX, finalY - 3, valX, finalY - 3);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Total", summaryX, finalY + 2);
      doc.text(`$${data.summary?.grandTotal?.toFixed(2) || "0.00"}`, valX, finalY + 2, { align: "right" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text(`${companyName}`, 14, ph - 12);
      doc.text(`${companyEmail || companyPhone}`, pw / 2, ph - 12, { align: "center" });
      doc.text(`1 of 1`, pw - 14, ph - 12, { align: "right" });

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
      await import("jspdf-autotable");
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
            wireType: item.wireType || "14/2 NM-B",
            wireFootage: item.wireFootage || 15,
          });
        }
        if (assembly?.miscParts) {
          const parts = String(assembly.miscParts).split(",").map((s: string) => s.trim());
          for (const p of parts) {
            if (p) miscPartsMap.set(p, (miscPartsMap.get(p) || 0) + item.quantity);
          }
        }
        const wt = item.wireType || "14/2 NM-B";
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
          { content: "Item", styles: { fillColor: [101, 67, 33] } },
          { content: "Qty", styles: { fillColor: [101, 67, 33] } },
          { content: "Device Description", styles: { fillColor: [101, 67, 33] } },
          { content: "Box Type", styles: { fillColor: [101, 67, 33] } },
          { content: "Cover Plate", styles: { fillColor: [101, 67, 33] } },
          { content: "Wire Type", styles: { fillColor: [101, 67, 33] } },
          { content: "Wire (ft/ea)", styles: { fillColor: [101, 67, 33] } },
          { content: "Wire Total (ft)", styles: { fillColor: [101, 67, 33] } },
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
            { content: "Part", styles: { fillColor: [101, 67, 33] } },
            { content: "Qty Needed", styles: { fillColor: [101, 67, 33] } },
          ]],
          body: miscRows,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 } },
        });
      }

      doc.addPage("landscape");

      doc.setFillColor(0, 128, 0);
      doc.rect(14, 12, 120, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Wire Purchase List", 18, 18);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("(includes 15% waste factor)", 18, 25);

      const wasteFactor = 1.15;
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
          { content: "Wire Type", styles: { fillColor: [255, 140, 0] } },
          { content: "Total Feet", styles: { fillColor: [255, 140, 0] } },
          { content: "Total Metres", styles: { fillColor: [255, 140, 0] } },
          { content: "Spools (150m)", styles: { fillColor: [255, 140, 0] } },
          { content: "Spools (75m)", styles: { fillColor: [255, 140, 0] } },
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
      await import("jspdf-autotable");
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

      const infoRules = (data.rules || []).filter((r: any) => r.status === "INFO" || r.status === "WARN");
      if (infoRules.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 82, 130);
        doc.text("Information Notes", 14, y);
        doc.setDrawColor(44, 82, 130);
        doc.line(14, y + 2, 80, y + 2);
        y += 8;

        doc.setTextColor(0, 0, 0);
        for (const rule of infoRules) {
          if (y > 260) { doc.addPage(); y = 20; }

          doc.setFillColor(rule.status === "WARN" ? 255 : 230, rule.status === "WARN" ? 248 : 240, rule.status === "WARN" ? 220 : 250);
          doc.rect(14, y - 4, pw - 28, 14, "F");

          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(rule.status === "WARN" ? 180 : 44, rule.status === "WARN" ? 120 : 82, rule.status === "WARN" ? 0 : 130);
          doc.text(rule.status, 18, y);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.text(rule.rule, 38, y);
          doc.text(rule.location, 100, y);
          doc.setFontSize(7);
          doc.text(rule.description, 38, y + 5);

          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          doc.text("Fix:", 18, y + 8);
          const fix = rule.status === "WARN" ? `Verify ${rule.rule.split(" - ")[1] || "requirements"} during rough-in.`
            : `Confirm ${rule.description.split(".")[0].toLowerCase()}.`;
          doc.text(fix, 30, y + 8);
          doc.setTextColor(0, 0, 0);

          y += 18;
        }
      }

      y += 5;
      const passRules = (data.rules || []).filter((r: any) => r.status === "PASS");
      if (passRules.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 82, 130);
        doc.text("Passed Checks", 14, y);
        doc.setDrawColor(44, 82, 130);
        doc.line(14, y + 2, 70, y + 2);
        y += 5;

        const passRows = passRules.map((r: any) => [r.rule, r.location, r.description]);
        (doc as any).autoTable({
          startY: y,
          head: [[
            { content: "Rule", styles: { fillColor: [44, 82, 130] } },
            { content: "Location", styles: { fillColor: [44, 82, 130] } },
            { content: "Description", styles: { fillColor: [44, 82, 130] } },
          ]],
          body: passRows,
          styles: { fontSize: 7, cellPadding: 3 },
          headStyles: { textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
          alternateRowStyles: { fillColor: [230, 245, 230] },
        });
      }

      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(128, 128, 128);
      doc.text("Generated by SparkyEstimate - CEC 2021 Compliance Check", pw / 2, ph - 15, { align: "center" });
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

  const serviceMaterialCost = (services || []).reduce((sum, s) => sum + s.materialCost, 0);
  const serviceLaborHours = (services || []).reduce((sum, s) => sum + s.laborHours, 0);
  const serviceLaborCost = serviceLaborHours * estimate.laborRate;

  const combinedMaterialCost = totalMaterialCost + serviceMaterialCost;
  const combinedLaborCost = totalLaborCost + serviceLaborCost;

  const materialWithMarkup = combinedMaterialCost * (1 + estimate.materialMarkupPct / 100);
  const laborWithMarkup = combinedLaborCost * (1 + estimate.laborMarkupPct / 100);
  const subtotal = materialWithMarkup + laborWithMarkup;
  const overhead = subtotal * (estimate.overheadPct / 100);
  const subtotalWithOverhead = subtotal + overhead;
  const profit = subtotalWithOverhead * (estimate.profitPct / 100);
  const grandTotal = subtotalWithOverhead + profit;

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

      <Tabs defaultValue="line-items">
        <TabsList data-testid="tabs-estimate">
          <TabsTrigger value="line-items" data-testid="tab-line-items">
            <Package className="w-4 h-4 mr-1" />
            Line Items
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
                        <TableHead>Wire Type</TableHead>
                        <TableHead className="text-right">Wire (ft)</TableHead>
                        <TableHead>Box Type</TableHead>
                        <TableHead>Cover Plate</TableHead>
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
                              <Input
                                className="min-w-[140px] text-sm font-medium"
                                defaultValue={item.deviceType}
                                key={`dt-${item.id}-${item.deviceType}`}
                                onBlur={(e) => { if (e.target.value !== item.deviceType) updateItemMutation.mutate({ id: item.id, deviceType: e.target.value }); }}
                                data-testid={`input-device-type-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="min-w-[90px] text-sm"
                                defaultValue={item.room || ""}
                                key={`rm-${item.id}-${item.room}`}
                                onBlur={(e) => { if (e.target.value !== (item.room || "")) updateItemMutation.mutate({ id: item.id, room: e.target.value || null }); }}
                                data-testid={`input-room-${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-16 text-right"
                                defaultValue={item.quantity}
                                key={`qty-${item.id}-${item.quantity}`}
                                onBlur={(e) => { const v = parseInt(e.target.value) || 1; if (v !== item.quantity) updateItemMutation.mutate({ id: item.id, quantity: v }); }}
                                min={1}
                                data-testid={`input-qty-${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 text-right"
                                defaultValue={item.materialCost}
                                key={`mc-${item.id}-${item.materialCost}`}
                                onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== item.materialCost) updateItemMutation.mutate({ id: item.id, materialCost: v }); }}
                                data-testid={`input-material-${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 text-right"
                                defaultValue={item.laborHours}
                                key={`lh-${item.id}-${item.laborHours}`}
                                onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== item.laborHours) updateItemMutation.mutate({ id: item.id, laborHours: v }); }}
                                data-testid={`input-labor-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="min-w-[90px] text-xs"
                                defaultValue={item.wireType || ""}
                                key={`wt-${item.id}-${item.wireType}`}
                                onBlur={(e) => { if (e.target.value !== (item.wireType || "")) updateItemMutation.mutate({ id: item.id, wireType: e.target.value || null }); }}
                                data-testid={`input-wire-type-${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-16 text-right"
                                defaultValue={item.wireFootage}
                                key={`wf-${item.id}-${item.wireFootage}`}
                                onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== item.wireFootage) updateItemMutation.mutate({ id: item.id, wireFootage: v }); }}
                                data-testid={`input-wire-footage-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="min-w-[80px] text-xs"
                                defaultValue={item.boxType || ""}
                                key={`bt-${item.id}-${item.boxType}`}
                                onBlur={(e) => { if (e.target.value !== (item.boxType || "")) updateItemMutation.mutate({ id: item.id, boxType: e.target.value || null }); }}
                                data-testid={`input-box-type-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="min-w-[80px] text-xs"
                                defaultValue={item.coverPlate || ""}
                                key={`cp-${item.id}-${item.coverPlate}`}
                                onBlur={(e) => { if (e.target.value !== (item.coverPlate || "")) updateItemMutation.mutate({ id: item.id, coverPlate: e.target.value || null }); }}
                                data-testid={`input-cover-plate-${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                className="w-16 text-right"
                                defaultValue={item.markupPct}
                                key={`mp-${item.id}-${item.markupPct}`}
                                onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== item.markupPct) updateItemMutation.mutate({ id: item.id, markupPct: v }); }}
                                data-testid={`input-markup-${item.id}`}
                              />
                            </TableCell>
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Materials</span>
                  <span>${totalMaterialCost.toFixed(2)}</span>
                </div>
                {estimate.materialMarkupPct > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Material Markup ({estimate.materialMarkupPct}%)</span>
                    <span>${(totalMaterialCost * estimate.materialMarkupPct / 100).toFixed(2)}</span>
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
                <div className="border-t pt-2 flex justify-between gap-4 text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-chart-3">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panel-schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">
                Panel Schedule ({circuits?.length || 0} circuits)
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generatePanelMutation.mutate()}
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">Circuit #</TableHead>
                        <TableHead className="text-right">Amps</TableHead>
                        <TableHead className="text-right">Poles</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Wire Type</TableHead>
                        <TableHead>GFCI</TableHead>
                        <TableHead>AFCI</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {circuits.map((circuit) => (
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
                          <TableCell className="text-xs">{circuit.wireType || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={circuit.isGfci ? "default" : "secondary"}
                              className="text-xs"
                              data-testid={`badge-gfci-${circuit.id}`}
                            >
                              {circuit.isGfci ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={circuit.isAfci ? "default" : "secondary"}
                              className="text-xs"
                              data-testid={`badge-afci-${circuit.id}`}
                            >
                              {circuit.isAfci ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteCircuitMutation.mutate(circuit.id)}
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
              )}
            </CardContent>
          </Card>

          {circuits && circuits.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Panel Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Circuits</p>
                    <p className="text-lg font-bold" data-testid="text-total-circuits">{circuits.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amps</p>
                    <p className="text-lg font-bold" data-testid="text-total-amps">{totalCircuitAmps}A</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recommended Panel</p>
                    <p className="text-lg font-bold" data-testid="text-panel-size">{recommendedPanelSize}A</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                        {complianceResults.rules.map((rule, idx) => (
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
                              onClick={() => deleteServiceMutation.mutate(service.id)}
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

        <TabsContent value="ai-analysis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">AI Drawing Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 dark:bg-primary/20 mb-3">
                  <ScanLine className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Analyze drawings with AI</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Upload electrical drawings or floor plans to auto-detect devices and generate line items
                </p>
                <Link href="/ai-analysis">
                  <Button data-testid="button-go-ai-analysis">
                    <ScanLine className="w-4 h-4 mr-2" />
                    Open AI Analysis
                  </Button>
                </Link>
              </div>
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
    wireType: "14/2 NM-B",
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

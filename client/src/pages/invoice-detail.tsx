import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Plus, Trash2, Send, DollarSign, Download,
  FileText, FileSpreadsheet, Calendar, User
} from "lucide-react";
import type { Invoice, InvoiceItem, Project, Customer } from "@shared/schema";

function InvoiceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary" data-testid="badge-invoice-status">Draft</Badge>;
    case "sent":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" data-testid="badge-invoice-status">Sent</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" data-testid="badge-invoice-status">Paid</Badge>;
    case "overdue":
      return <Badge variant="destructive" data-testid="badge-invoice-status">Overdue</Badge>;
    default:
      return <Badge variant="secondary" data-testid="badge-invoice-status">{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

async function exportInvoicePdf(invoiceId: number) {
  const res = await apiRequest("GET", `/api/invoices/${invoiceId}/export`);
  const data = await res.json();

  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  (autoTableModule as any).default.applyPlugin(jsPDF);

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;

  const settingsRes = await apiRequest("GET", "/api/settings");
  const settingsArr = await settingsRes.json();
  const sm: Record<string, string> = {};
  (settingsArr || []).forEach((s: any) => { sm[s.key] = s.value; });

  const companyName = sm.companyName || data.company?.name || "SparkyEstimate";
  const companyPhone = sm.companyPhone || data.company?.phone || "";
  const companyEmail = sm.companyEmail || data.company?.email || "";
  const companyAddress = sm.companyAddress || "";
  const logoData = sm.companyLogoData || data.company?.logoData || null;

  const invoiceDate = data.invoice?.invoiceDate
    ? new Date(data.invoice.invoiceDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  const dueDate = data.invoice?.dueDate
    ? new Date(data.invoice.dueDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const infoBoxX = pw - margin - 72;
  const infoBoxW = 72;

  doc.setFillColor(70, 70, 70);
  doc.rect(infoBoxX, 15, infoBoxW, 7, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", infoBoxX + 4, 20);
  doc.text(`#${data.invoice?.invoiceNumber || invoiceId}`, infoBoxX + infoBoxW - 4, 20, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(infoBoxX, 22, infoBoxW, 7, "F");
  doc.line(infoBoxX, 22, infoBoxX + infoBoxW, 22);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DATE", infoBoxX + 4, 27);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceDate, infoBoxX + infoBoxW - 4, 27, { align: "right" });

  let infoBoxH = 14;
  if (dueDate) {
    doc.setFillColor(250, 250, 250);
    doc.rect(infoBoxX, 29, infoBoxW, 7, "F");
    doc.line(infoBoxX, 29, infoBoxX + infoBoxW, 29);
    doc.setFont("helvetica", "bold");
    doc.text("DUE DATE", infoBoxX + 4, 34);
    doc.setFont("helvetica", "normal");
    doc.text(dueDate, infoBoxX + infoBoxW - 4, 34, { align: "right" });
    infoBoxH = 21;
  }

  doc.setFillColor(250, 250, 250);
  doc.rect(infoBoxX, 15 + infoBoxH, infoBoxW, 7, "F");
  doc.line(infoBoxX, 15 + infoBoxH, infoBoxX + infoBoxW, 15 + infoBoxH);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", infoBoxX + 4, 15 + infoBoxH + 5);
  doc.setFontSize(9);
  doc.text(`$${(data.invoice?.total || 0).toFixed(2)}`, infoBoxX + infoBoxW - 4, 15 + infoBoxH + 5, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.rect(infoBoxX, 15, infoBoxW, infoBoxH + 7, "S");

  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, 15, 30, 15);
    } catch (_) {}
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, 24);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  let cy = 32;
  if (companyAddress) { doc.text(companyAddress, margin, cy); cy += 5; }
  if (companyPhone) { doc.text(companyPhone, margin, cy); cy += 5; }
  if (companyEmail) { doc.text(companyEmail, margin, cy); cy += 5; }

  const sectionY = Math.max(cy + 8, 50);

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, sectionY, pw - margin, sectionY);

  const clientColW = contentW / 2;
  let leftY = sectionY + 8;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.customer?.name) { doc.text(data.customer.name, margin, leftY); leftY += 5; }
  if (data.customer?.address) {
    const addrLines = doc.splitTextToSize(data.customer.address, clientColW - 10);
    doc.text(addrLines, margin, leftY);
    leftY += addrLines.length * 5;
  }
  if (data.customer?.phone) { doc.text(data.customer.phone, margin, leftY); leftY += 5; }
  if (data.customer?.email) { doc.text(data.customer.email, margin, leftY); leftY += 5; }

  let startY = Math.max(leftY, sectionY + 28) + 6;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, startY - 4, pw - margin, startY - 4);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("INVOICE", margin, startY + 4);
  startY += 10;

  const amber = [230, 148, 20];
  const itemRows: any[] = [];

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      itemRows.push([
        { content: item.description, styles: { fontStyle: "normal", fontSize: 9 } },
        { content: item.room || "", styles: { fontSize: 9 } },
        { content: String(item.quantity), styles: { halign: "right" as const, fontSize: 9 } },
        { content: `$${Number(item.unitPrice).toFixed(2)}`, styles: { halign: "right" as const, fontSize: 9 } },
        { content: `$${Number(item.total).toFixed(2)}`, styles: { halign: "right" as const, fontSize: 9 } },
      ]);
    }
  }

  if (itemRows.length > 0) {
    (doc as any).autoTable({
      startY,
      margin: { left: margin, right: margin },
      head: [[
        { content: "Description", styles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 } },
        { content: "Room", styles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 } },
        { content: "Qty", styles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: "bold", halign: "right", fontSize: 8.5 } },
        { content: "Unit Price", styles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: "bold", halign: "right", fontSize: 8.5 } },
        { content: "Amount", styles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: "bold", halign: "right", fontSize: 8.5 } },
      ]],
      body: itemRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { left: 4, top: 3, bottom: 3, right: 4 }, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: contentW - 100 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: "right" },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 25, halign: "right" },
      },
      didDrawCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.row.index > 0) {
          doc.setDrawColor(230, 230, 230);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
        }
      },
    });
  }

  let finalY = (doc as any).lastAutoTable?.finalY || startY + 20;

  const subtotal = data.invoice?.subtotal || 0;
  const taxAmount = data.invoice?.taxAmount || 0;
  const taxLabel = data.invoice?.taxLabel || "GST 5%";
  const total = data.invoice?.total || 0;

  finalY += 8;
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
  doc.text(`$${subtotal.toFixed(2)}`, valX - 4, finalY + 1, { align: "right" });

  finalY += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(summaryBoxX, finalY - 4, summaryBoxW, 8, "F");
  doc.line(summaryBoxX, finalY + 4, summaryBoxX + summaryBoxW, finalY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Tax (${taxLabel})`, labelX + 4, finalY + 1);
  doc.text(`$${taxAmount.toFixed(2)}`, valX - 4, finalY + 1, { align: "right" });

  finalY += 12;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Total", labelX + 4, finalY);
  doc.text(`$${total.toFixed(2)}`, valX - 4, finalY, { align: "right" });

  if (data.invoice?.notes) {
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
    const noteLines = doc.splitTextToSize(data.invoice.notes, contentW);
    doc.text(noteLines, margin, finalY);
    finalY += noteLines.length * 4;
  }

  if (data.invoice?.terms) {
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
    const termLines = doc.splitTextToSize(data.invoice.terms, contentW);
    doc.text(termLines, margin, finalY);
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, ph - 18, pw - margin, ph - 18);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  const footerParts = [companyName];
  if (companyPhone) footerParts.push(companyPhone);
  doc.text(footerParts.join(" | "), margin, ph - 12);
  if (companyEmail) doc.text(companyEmail, pw / 2, ph - 12, { align: "center" });
  doc.text("1 of 1", pw - margin, ph - 12, { align: "right" });

  doc.save(`Invoice-${data.invoice?.invoiceNumber || invoiceId}.pdf`);
}

async function exportMaterialExcel(invoiceId: number) {
  const res = await apiRequest("GET", `/api/invoices/${invoiceId}/export`);
  const data = await res.json();
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const rows = (data.items || []).map((item: any) => ({
    "Description": item.description,
    "Room": item.room || "",
    "Qty": item.quantity,
    "Unit Price": item.unitPrice,
    "Total": item.total,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Materials");
  XLSX.writeFile(wb, `Invoice-${data.invoice?.invoiceNumber || invoiceId}-Materials.xlsx`);
}

async function exportLabourExcel(invoiceId: number) {
  const res = await apiRequest("GET", `/api/invoices/${invoiceId}/export`);
  const data = await res.json();
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const rows = (data.items || []).map((item: any) => ({
    "Description": item.description,
    "Room": item.room || "",
    "Qty": item.quantity,
    "Unit Price": item.unitPrice,
    "Total": item.total,
  }));

  rows.push({
    "Description": "Subtotal",
    "Room": "",
    "Qty": "",
    "Unit Price": "",
    "Total": data.invoice?.subtotal || 0,
  });
  rows.push({
    "Description": `Tax (${data.invoice?.taxLabel || "GST 5%"})`,
    "Room": "",
    "Qty": "",
    "Unit Price": "",
    "Total": data.invoice?.taxAmount || 0,
  });
  rows.push({
    "Description": "Total",
    "Room": "",
    "Qty": "",
    "Unit Price": "",
    "Total": data.invoice?.total || 0,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Labour");
  XLSX.writeFile(wb, `Invoice-${data.invoice?.invoiceNumber || invoiceId}-Labour.xlsx`);
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const { toast } = useToast();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ description: "", room: "", quantity: 1, unitPrice: 0 });

  const invoiceId = params?.id ? parseInt(params.id) : 0;

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: invoiceId > 0,
  });

  const { data: items } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", invoiceId, "items"],
    enabled: invoiceId > 0,
  });

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", invoice?.projectId],
    enabled: !!invoice?.projectId,
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", invoice?.customerId],
    enabled: !!invoice?.customerId,
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: Partial<Invoice>) => {
      await apiRequest("PATCH", `/api/invoices/${invoiceId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; description: string; room: string | null; quantity: number; unitPrice: number; total: number }) => {
      await apiRequest("POST", "/api/invoice-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({ title: "Item added" });
      setAddItemOpen(false);
      setNewItem({ description: "", room: "", quantity: 1, unitPrice: 0 });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InvoiceItem>) => {
      await apiRequest("PATCH", `/api/invoice-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invoice-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({ title: "Item removed" });
    },
  });

  const handleAddItem = () => {
    const total = newItem.quantity * newItem.unitPrice;
    addItemMutation.mutate({
      invoiceId,
      description: newItem.description,
      room: newItem.room || null,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total,
    });
  };

  const handleExportPdf = async () => {
    try {
      await exportInvoicePdf(invoiceId);
      toast({ title: "Invoice PDF exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportMaterialExcel = async () => {
    try {
      await exportMaterialExcel(invoiceId);
      toast({ title: "Material Excel exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportLabourExcel = async () => {
    try {
      await exportLabourExcel(invoiceId);
      toast({ title: "Labour Excel exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">Invoice not found</p>
            <Link href="/invoices">
              <Button variant="outline" className="mt-4" data-testid="link-back-invoices">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Invoices
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName = customer?.name || project?.clientName || "Unknown";
  const customerEmail = customer?.email || project?.clientEmail || "";
  const customerPhone = customer?.phone || project?.clientPhone || "";
  const customerAddress = customer
    ? [customer.address, customer.city, customer.province, customer.postalCode].filter(Boolean).join(", ")
    : project?.address || "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-invoice-number">
              Invoice {invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-project-name">
            {project?.name || "Project"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateInvoiceMutation.mutate({ status: "sent" })}
              disabled={updateInvoiceMutation.isPending}
              data-testid="button-mark-sent"
            >
              <Send className="w-4 h-4 mr-1" />
              Mark as Sent
            </Button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateInvoiceMutation.mutate({ status: "paid", paymentDate: new Date().toISOString() as any })}
              disabled={updateInvoiceMutation.isPending}
              data-testid="button-mark-paid"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Mark as Paid
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMaterialExcel}
            data-testid="button-download-material-excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Material Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLabourExcel}
            data-testid="button-download-labour-excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Labour Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-invoice-info">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Info</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Invoice Date</span>
              <span data-testid="text-invoice-date">{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span data-testid="text-due-date">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.paymentDate && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Payment Date</span>
                <span data-testid="text-payment-date">{formatDate(invoice.paymentDate)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Status</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-customer-info">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer Info</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium" data-testid="text-customer-name">{customerName}</p>
            {customerEmail && (
              <p className="text-sm text-muted-foreground" data-testid="text-customer-email">{customerEmail}</p>
            )}
            {customerPhone && (
              <p className="text-sm text-muted-foreground" data-testid="text-customer-phone">{customerPhone}</p>
            )}
            {customerAddress && (
              <p className="text-sm text-muted-foreground" data-testid="text-customer-address">{customerAddress}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-line-items">
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
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No line items</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add items to this invoice
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>
                        <Input
                          className="min-w-[200px] text-sm"
                          defaultValue={item.description}
                          key={`desc-${item.id}-${item.description}`}
                          onBlur={(e) => {
                            if (e.target.value !== item.description) {
                              updateItemMutation.mutate({ id: item.id, description: e.target.value });
                            }
                          }}
                          data-testid={`input-description-${item.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-[90px] text-sm"
                          defaultValue={item.room || ""}
                          key={`room-${item.id}-${item.room}`}
                          onBlur={(e) => {
                            if (e.target.value !== (item.room || "")) {
                              updateItemMutation.mutate({ id: item.id, room: e.target.value || null });
                            }
                          }}
                          data-testid={`input-room-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-20 text-right"
                          defaultValue={item.quantity}
                          key={`qty-${item.id}-${item.quantity}`}
                          min={1}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value) || 1;
                            if (v !== item.quantity) {
                              const total = v * item.unitPrice;
                              updateItemMutation.mutate({ id: item.id, quantity: v, total });
                            }
                          }}
                          data-testid={`input-quantity-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-right"
                          defaultValue={item.unitPrice}
                          key={`up-${item.id}-${item.unitPrice}`}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            if (v !== item.unitPrice) {
                              const total = item.quantity * v;
                              updateItemMutation.mutate({ id: item.id, unitPrice: v, total });
                            }
                          }}
                          data-testid={`input-unit-price-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium" data-testid={`text-item-total-${item.id}`}>
                        {formatCurrency(item.total)}
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-summary">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span data-testid="text-subtotal">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Tax ({invoice.taxLabel})</span>
              <span data-testid="text-tax-amount">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between gap-4 text-lg font-bold">
              <span>Total</span>
              <span data-testid="text-total">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-notes">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue={invoice.notes || ""}
              key={`notes-${invoice.id}-${invoice.notes}`}
              placeholder="Add invoice notes..."
              className="resize-none text-sm"
              rows={4}
              onBlur={(e) => {
                const val = e.target.value || null;
                if (val !== (invoice.notes || null)) {
                  updateInvoiceMutation.mutate({ notes: val } as any);
                }
              }}
              data-testid="textarea-notes"
            />
          </CardContent>
        </Card>

        <Card data-testid="card-terms">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue={invoice.terms || ""}
              key={`terms-${invoice.id}-${invoice.terms}`}
              placeholder="Add terms and conditions..."
              className="resize-none text-sm"
              rows={4}
              onBlur={(e) => {
                const val = e.target.value || null;
                if (val !== (invoice.terms || null)) {
                  updateInvoiceMutation.mutate({ terms: val } as any);
                }
              }}
              data-testid="textarea-terms"
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Item description"
                data-testid="input-new-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                value={newItem.room}
                onChange={(e) => setNewItem({ ...newItem, room: e.target.value })}
                placeholder="Room (optional)"
                data-testid="input-new-room"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  min={1}
                  data-testid="input-new-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  data-testid="input-new-unit-price"
                />
              </div>
            </div>
            <div className="flex justify-between gap-4 text-sm font-medium">
              <span>Total</span>
              <span data-testid="text-new-item-total">{formatCurrency(newItem.quantity * newItem.unitPrice)}</span>
            </div>
            <Button
              className="w-full"
              onClick={handleAddItem}
              disabled={!newItem.description || addItemMutation.isPending}
              data-testid="button-submit-item"
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

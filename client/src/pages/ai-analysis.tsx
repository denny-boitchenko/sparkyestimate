import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, ScanLine, Zap, FileImage, CheckCircle2,
  Lightbulb, Plug, ToggleLeft, ShieldAlert, Wifi, Clock,
  DoorOpen, ChevronRight, ChevronDown, ArrowLeft, Sparkles, Trash2, FileText,
  Plus, Link, User, Building, Search, RefreshCw, Download, ChevronsUpDown
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import type { Project, AiAnalysis, Customer, DeviceAssembly } from "@shared/schema";
import { DWELLING_TYPES } from "@shared/schema";

type WizardStep = "upload" | "pages" | "review";

interface RoomData {
  name: string;
  type?: string;
  floor: string;
  area_sqft?: number;
  page?: number;
  devices: Array<{
    type: string;
    count: number;
    confidence: number;
    notes?: string;
  }>;
}

interface AnalysisResults {
  rooms: RoomData[];
  allDevices: Array<{
    type: string;
    count: number;
    confidence: number;
    room?: string;
  }>;
  totalDevices: number;
  totalSqFt?: number;
  pageCount?: number;
  pagesAnalyzed?: number[];
  notes?: string;
}

interface PageThumb {
  pageNumber: number;
  dataUrl: string;
  selected: boolean;
}

async function renderPdfThumbnails(file: File): Promise<PageThumb[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const thumbs: PageThumb[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await (page.render({ canvasContext: ctx, viewport } as any).promise);
    thumbs.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL("image/png"),
      selected: true,
    });
  }

  return thumbs;
}

async function renderPdfFullPages(file: File, pageNumbers: number[]): Promise<Array<{ pageNumber: number; dataUrl: string }>> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: Array<{ pageNumber: number; dataUrl: string }> = [];

  for (const num of pageNumbers) {
    if (num < 1 || num > pdf.numPages) continue;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await (page.render({ canvasContext: ctx, viewport } as any).promise);
    pages.push({
      pageNumber: num,
      dataUrl: canvas.toDataURL("image/jpeg", 0.90),
    });
  }

  return pages;
}

export default function AiAnalysisPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState("floor_plan");
  const [dwellingType, setDwellingType] = useState("single");
  const [hasLegalSuite, setHasLegalSuite] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [reviewTab, setReviewTab] = useState<"rooms" | "devices">("rooms");
  const [pageThumbs, setPageThumbs] = useState<PageThumb[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [editedCounts, setEditedCounts] = useState<Record<string, number>>({});
  const [assemblyOverrides, setAssemblyOverrides] = useState<Record<string, number>>({});
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [newProjectDwelling, setNewProjectDwelling] = useState("single");
  const [newProjectCustomerId, setNewProjectCustomerId] = useState<string>("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [linkToExistingProject, setLinkToExistingProject] = useState<string>("");
  const [historySearch, setHistorySearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ page: number; totalPages: number; status?: string } | null>(null);
  const [reAnalyzeMode, setReAnalyzeMode] = useState<string | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [roomSearch, setRoomSearch] = useState("");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customersData } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: analyses, isLoading: loadingAnalyses } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/ai-analyses"],
  });

  const { data: deviceAssemblies } = useQuery<DeviceAssembly[]>({
    queryKey: ["/api/device-assemblies"],
  });

  const { data: panelAssignments } = useQuery<Array<{ id: number; analysisId: number; roomName: string; panelName: string; isManualOverride: boolean }>>({
    queryKey: ["/api/ai-analyses", currentAnalysisId, "panel-assignments"],
    queryFn: async () => {
      if (!currentAnalysisId) return [];
      const res = await fetch(`/api/ai-analyses/${currentAnalysisId}/panel-assignments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentAnalysisId,
  });

  const updatePanelAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, panelName }: { assignmentId: number; panelName: string }) => {
      await apiRequest("PATCH", `/api/room-panel-assignments/${assignmentId}`, {
        panelName,
        isManualOverride: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses", currentAnalysisId, "panel-assignments"] });
    },
  });

  const currentAnalysis = analyses?.find(a => a.id === currentAnalysisId);
  const analysisResults = currentAnalysis?.results as AnalysisResults | null;

  // Build assembly lookup maps (same logic as backend)
  const assemblyBySymbol = useCallback(() => {
    const map = new Map<string, DeviceAssembly>();
    if (!deviceAssemblies) return map;
    for (const a of deviceAssemblies) {
      if (a.symbolType) map.set(a.symbolType, a);
    }
    return map;
  }, [deviceAssemblies]);

  const getMatchedAssembly = useCallback((deviceType: string): { assembly: DeviceAssembly | undefined; matchType: "exact" | "fuzzy" | "none" } => {
    if (!deviceAssemblies) return { assembly: undefined, matchType: "none" };
    const symbolMap = assemblyBySymbol();
    // Direct symbolType match
    const exact = symbolMap.get(deviceType);
    if (exact) return { assembly: exact, matchType: "exact" };
    // Fuzzy name match
    const normalizedType = deviceType.toLowerCase().replace(/_/g, " ");
    const fuzzy = deviceAssemblies.find(a =>
      a.name.toLowerCase().includes(normalizedType) ||
      normalizedType.includes(a.name.toLowerCase().split("(")[0].trim())
    );
    if (fuzzy) return { assembly: fuzzy, matchType: "fuzzy" };
    return { assembly: undefined, matchType: "none" };
  }, [deviceAssemblies, assemblyBySymbol]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Select a file to analyze");

      const sessionId = crypto.randomUUID();
      setAnalysisProgress(null);

      // Open SSE connection for progress
      const eventSource = new EventSource(`/api/ai-analyze/progress/${sessionId}`);
      eventSource.addEventListener("progress", (e) => {
        try {
          const data = JSON.parse(e.data);
          setAnalysisProgress({ page: data.page, totalPages: data.totalPages, status: data.status });
        } catch {}
      });
      eventSource.addEventListener("done", () => {
        eventSource.close();
        setAnalysisProgress(null);
      });
      eventSource.addEventListener("error", () => {
        eventSource.close();
        setAnalysisProgress(null);
      });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", analysisMode);
      formData.append("dwellingType", dwellingType);
      formData.append("hasLegalSuite", hasLegalSuite ? "true" : "false");
      formData.append("sessionId", sessionId);

      if (isPdf && pageThumbs.length > 0) {
        const selectedPages = pageThumbs.filter(p => p.selected).map(p => p.pageNumber);
        if (selectedPages.length === 0) {
          eventSource.close();
          throw new Error("Select at least one page");
        }
        const fullPages = await renderPdfFullPages(selectedFile, selectedPages);
        formData.append("pageImages", JSON.stringify(fullPages));
      }

      try {
        const res = await fetch("/api/ai-analyze", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Analysis failed" }));
          throw new Error(errData.message || "Analysis failed");
        }
        return res.json();
      } finally {
        eventSource.close();
        setAnalysisProgress(null);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      toast({ title: "Analysis complete", description: "Drawing analysis finished successfully" });
      setCurrentAnalysisId(data.id);
      setWizardStep("review");
    },
    onError: (err: Error) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ai-analyses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      if (currentAnalysisId) {
        setCurrentAnalysisId(null);
        setWizardStep("upload");
      }
      toast({ title: "Analysis deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateEstimateMutation = useMutation({
    mutationFn: async () => {
      if (!currentAnalysisId) throw new Error("No analysis selected");
      const res = await apiRequest("POST", `/api/ai-analyses/${currentAnalysisId}/generate-estimate`, {
        editedCounts,
        assemblyOverrides,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Estimate generated", description: `Created ${data.itemsCreated || 0} line items` });
      setWizardStep("upload");
      setCurrentAnalysisId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const reAnalyzeMutation = useMutation({
    mutationFn: async (mode: string) => {
      if (!currentAnalysisId) throw new Error("No analysis selected");

      const sessionId = crypto.randomUUID();
      setAnalysisProgress(null);

      const eventSource = new EventSource(`/api/ai-analyze/progress/${sessionId}`);
      eventSource.addEventListener("progress", (e) => {
        try {
          const data = JSON.parse(e.data);
          setAnalysisProgress({ page: data.page, totalPages: data.totalPages, status: data.status });
        } catch {}
      });
      eventSource.addEventListener("done", () => { eventSource.close(); setAnalysisProgress(null); });
      eventSource.addEventListener("error", () => { eventSource.close(); setAnalysisProgress(null); });

      try {
        const res = await fetch(`/api/ai-analyses/${currentAnalysisId}/re-analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mode, sessionId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Re-analysis failed" }));
          throw new Error(errData.message || "Re-analysis failed");
        }
        return res.json();
      } finally {
        eventSource.close();
        setAnalysisProgress(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      toast({ title: "Re-analysis complete", description: "Drawing has been re-analyzed successfully" });
      setReAnalyzeMode(null);
    },
    onError: (err: Error) => {
      toast({ title: "Re-analysis Failed", description: err.message, variant: "destructive" });
      setReAnalyzeMode(null);
    },
  });

  const createProjectFromAnalysisMutation = useMutation({
    mutationFn: async (data: { name: string; clientName: string; customerId?: number; address?: string; dwellingType: string }) => {
      const res = await apiRequest("POST", "/api/projects", {
        name: data.name,
        clientName: data.clientName,
        customerId: data.customerId || null,
        address: data.address || null,
        dwellingType: data.dwellingType,
      });
      const project = await res.json();
      // Link analysis to project
      if (currentAnalysisId) {
        await apiRequest("PATCH", `/api/ai-analyses/${currentAnalysisId}`, { projectId: project.id });
      }
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      setCreateProjectOpen(false);
      toast({ title: "Project created and linked to analysis" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setNewProjectCustomerId(customer.id.toString());
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
      toast({ title: "Customer created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create customer", description: err.message, variant: "destructive" });
    },
  });

  const linkToProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (!currentAnalysisId) throw new Error("No analysis selected");
      await apiRequest("PATCH", `/api/ai-analyses/${currentAnalysisId}`, { projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      toast({ title: "Analysis linked to project" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to link project", description: err.message, variant: "destructive" });
    },
  });

  const processFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setPageThumbs([]);

    const fileIsPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(fileIsPdf);

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    if (fileIsPdf) {
      setLoadingThumbs(true);
      try {
        const thumbs = await renderPdfThumbnails(file);
        setPageThumbs(thumbs);
        if (thumbs.length > 1) {
          setWizardStep("pages");
        }
      } catch (err) {
        console.error("PDF thumbnail error:", err);
        toast({ title: "PDF Preview Failed", description: "Could not render PDF pages. The file will still be uploaded for analysis.", variant: "destructive" });
      } finally {
        setLoadingThumbs(false);
      }
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const isValid = file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isValid) {
      toast({ title: "Invalid file type", description: "Please upload an image (PNG, JPG) or PDF file.", variant: "destructive" });
      return;
    }
    processFile(file);
  }, [processFile, toast]);

  const togglePage = (pageNumber: number) => {
    setPageThumbs(prev => prev.map(p =>
      p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAllPages = () => {
    setPageThumbs(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAllPages = () => {
    setPageThumbs(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const getDeviceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("receptacle") || t.includes("outlet")) return Plug;
    if (t.includes("switch")) return ToggleLeft;
    if (t.includes("light") || t.includes("lamp") || t.includes("fan")) return Lightbulb;
    if (t.includes("smoke") || t.includes("detector")) return ShieldAlert;
    if (t.includes("data") || t.includes("network") || t.includes("tv")) return Wifi;
    return Zap;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const openAnalysisReview = (analysis: AiAnalysis) => {
    setCurrentAnalysisId(analysis.id);
    setWizardStep("review");
    setEditedCounts({});
    setAssemblyOverrides({});
    // Floors will be initialized via useEffect when analysisResults updates
    setExpandedRooms(new Set());
    setRoomSearch("");
  };

  const resetWizard = () => {
    setWizardStep("upload");
    setCurrentAnalysisId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPageThumbs([]);
    setIsPdf(false);
    setEditedCounts({});
    setAssemblyOverrides({});
    setCreateProjectOpen(false);
    setLinkToExistingProject("");
    setNewProjectName("");
    setNewProjectAddress("");
    setNewProjectDwelling("single");
    setNewProjectCustomerId("");
    setShowNewCustomerForm(false);
    setDwellingType("single");
    setHasLegalSuite(false);
  };

  const getDeviceCount = (roomIdx: number, devIdx: number, originalCount: number): number => {
    const key = `${roomIdx}-${devIdx}`;
    return editedCounts[key] !== undefined ? editedCounts[key] : originalCount;
  };

  const setDeviceCount = (roomIdx: number, devIdx: number, value: number) => {
    const key = `${roomIdx}-${devIdx}`;
    setEditedCounts(prev => ({ ...prev, [key]: Math.max(0, value) }));
  };

  // Floor grouping for By Room view
  type RoomEntry = { roomIdx: number; room: RoomData };
  const groupedByFloor = useCallback((): [string, RoomEntry[]][] => {
    if (!analysisResults?.rooms) return [];
    const rooms = analysisResults.rooms;
    const floorMap = new Map<string, RoomEntry[]>();
    rooms.forEach((room, idx) => {
      const floor = room.floor || "Unknown Floor";
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push({ roomIdx: idx, room });
    });
    // Sort floors: Basement → Main → Upper → Attic → Other
    const floorOrder = ["basement", "main", "ground", "first", "second", "upper", "attic"];
    return Array.from(floorMap.entries()).sort(([a], [b]) => {
      const aLow = a.toLowerCase();
      const bLow = b.toLowerCase();
      const aIdx = floorOrder.findIndex(f => aLow.includes(f));
      const bIdx = floorOrder.findIndex(f => bLow.includes(f));
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [analysisResults]);

  const toggleRoom = (roomIdx: number) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomIdx)) next.delete(roomIdx);
      else next.add(roomIdx);
      return next;
    });
  };

  const toggleFloor = (floor: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });
  };

  const expandAllRooms = () => {
    if (!analysisResults?.rooms) return;
    setExpandedFloors(new Set(groupedByFloor().map(([floor]) => floor)));
    setExpandedRooms(new Set(analysisResults.rooms.map((_, i) => i)));
  };

  const collapseAllRooms = () => {
    setExpandedRooms(new Set());
  };

  // Initialize floors as expanded when opening review
  const initFloorExpansion = useCallback(() => {
    if (analysisResults?.rooms) {
      const floors = new Set(analysisResults.rooms.map(r => r.floor || "Unknown Floor"));
      setExpandedFloors(floors);
      setExpandedRooms(new Set());
      setRoomSearch("");
    }
  }, [analysisResults]);

  const downloadCsv = useCallback(() => {
    if (!analysisResults?.rooms) return;
    const rows: string[][] = [["Device Type", "Room", "Floor", "Count", "CEC Reference"]];
    analysisResults.rooms.forEach((room, roomIdx) => {
      room.devices.forEach((device, devIdx) => {
        const count = getDeviceCount(roomIdx, devIdx, device.count);
        const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        rows.push([
          escape(device.type),
          escape(room.name),
          escape(room.floor || ""),
          String(count),
          escape(device.notes || ""),
        ]);
      });
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentAnalysis?.fileName?.replace(/\.[^.]+$/, "") || "analysis"}-devices.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysisResults, editedCounts, currentAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand floors when review step opens with results
  useEffect(() => {
    if (wizardStep === "review" && analysisResults?.rooms) {
      initFloorExpansion();
    }
  }, [wizardStep, currentAnalysisId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPageCount = pageThumbs.filter(p => p.selected).length;

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "upload" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <Upload className="w-3.5 h-3.5" />
        Upload
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "pages" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <FileText className="w-3.5 h-3.5" />
        Pages
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "review" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <ScanLine className="w-3.5 h-3.5" />
        Review
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {wizardStep !== "upload" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetWizard}
            data-testid="button-back-upload"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-ai-title">
            AI Drawing Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload electrical drawings or floor plans for AI-powered device detection
          </p>
        </div>
      </div>

      {stepIndicator}

      {/* ─── UPLOAD STEP ─── */}
      {wizardStep === "upload" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Upload Drawing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Analysis Mode</Label>
                  <Select value={analysisMode} onValueChange={setAnalysisMode}>
                    <SelectTrigger data-testid="select-analysis-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="floor_plan">Floor Plan Mode (CEC 2021)</SelectItem>
                      <SelectItem value="electrical">Electrical Drawing Mode</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {analysisMode === "electrical"
                      ? "Scans for electrical symbols (outlets, switches, lights, etc.)"
                      : "Detects rooms, applies CEC 2021 minimum device requirements per room type"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Dwelling Type</Label>
                  <Select value={dwellingType} onValueChange={setDwellingType}>
                    <SelectTrigger data-testid="select-dwelling-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DWELLING_TYPES.map(dt => (
                        <SelectItem key={dt} value={dt}>
                          {({
                            single: "Single Family",
                            duplex: "Duplex",
                            triplex: "Triplex",
                            fourplex: "Fourplex",
                            townhouse: "Townhouse",
                            condo: "Condo",
                            apartment: "Apartment",
                            commercial: "Commercial",
                            industrial: "Industrial",
                          } as Record<string, string>)[dt] || dt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dwellingType === "single" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasLegalSuite"
                      checked={hasLegalSuite}
                      onCheckedChange={(checked) => setHasLegalSuite(!!checked)}
                      data-testid="checkbox-legal-suite"
                    />
                    <Label htmlFor="hasLegalSuite" className="text-sm cursor-pointer">
                      Has legal secondary suite (basement suite)
                    </Label>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate active-elevate-2 transition-colors ${isDragging ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="dropzone-upload"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  {loadingThumbs ? (
                    <div className="space-y-3 py-4">
                      <Clock className="w-8 h-8 text-primary mx-auto animate-spin" />
                      <p className="text-sm font-medium">Rendering PDF pages...</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="space-y-3">
                      <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-md" />
                      <p className="text-sm font-medium">{selectedFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="space-y-2">
                      <FileImage className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      {isPdf && pageThumbs.length > 0 && (
                        <p className="text-xs text-primary">{pageThumbs.length} pages detected</p>
                      )}
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Drop a file or click to upload</p>
                      <p className="text-xs text-muted-foreground">
                        Supports images (PNG, JPG) and PDF files up to 100MB
                      </p>
                    </div>
                  )}
                </div>

                {isPdf && pageThumbs.length > 1 ? (
                  <Button
                    className="w-full"
                    onClick={() => setWizardStep("pages")}
                    disabled={!selectedFile}
                    data-testid="button-select-pages"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Select Pages ({pageThumbs.length} pages)
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => analyzeMutation.mutate()}
                    disabled={!selectedFile || analyzeMutation.isPending}
                    data-testid="button-analyze"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4 mr-2" />
                        Analyze Drawing
                      </>
                    )}
                  </Button>
                )}

                {analyzeMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={analysisProgress ? (analysisProgress.page / analysisProgress.totalPages) * 100 : 10} />
                    <p className="text-xs text-muted-foreground text-center">
                      {analysisProgress?.status === "extracting_legend"
                        ? "Extracting drawing legend..."
                        : analysisProgress && analysisProgress.totalPages > 0
                          ? `Analyzing page ${analysisProgress.page} of ${analysisProgress.totalPages}...`
                          : analysisMode === "floor_plan"
                            ? "AI is detecting rooms and generating CEC 2021 device requirements..."
                            : "AI is scanning for electrical symbols and devices..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { step: "1", title: "Upload Drawing", desc: "Upload an electrical drawing or architectural floor plan (image or PDF)" },
                  { step: "2", title: "Select Pages", desc: "For multi-page PDFs, preview and select which pages to analyze" },
                  { step: "3", title: "AI Detects Rooms", desc: analysisMode === "floor_plan" ? "Gemini Vision identifies rooms, calculates areas, and generates CEC 2021 minimum devices" : "Gemini Vision counts electrical symbols per room" },
                  { step: "4", title: "Review & Link Project", desc: "Review results, then create a new project or link to an existing one" },
                  { step: "5", title: "Generate Estimate", desc: "Auto-populate estimate line items from detected devices" },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0 text-sm font-bold text-primary">{step}</div>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Powered by Gemini Vision AI with CEC 2021 compliance. Supports 34+ device types and 22 room types.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Analysis History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalyses ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : !analyses || analyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                    <ScanLine className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No analyses yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload a drawing above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search analyses..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-analyses"
                    />
                  </div>
                  <div className="space-y-2">
                  {[...analyses]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .filter((a) => {
                      if (!historySearch) return true;
                      const q = historySearch.toLowerCase();
                      const modeLabel = a.analysisMode === "electrical" ? "electrical" : "floor plan";
                      return [a.fileName, modeLabel, a.status].some(f => f?.toLowerCase().includes(q));
                    })
                    .map((analysis) => {
                    const results = analysis.results as AnalysisResults | null;
                    const deviceCount = results?.totalDevices || results?.allDevices?.reduce((s, d) => s + d.count, 0) || 0;
                    const roomCount = results?.rooms?.filter(r => r.name !== "WHOLE HOUSE")?.length || 0;
                    const statusLabel = analysis.status === "estimate_generated" ? "Estimate Generated" :
                      analysis.status === "completed" ? "Completed" : analysis.status;
                    return (
                      <div
                        key={analysis.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border cursor-pointer hover-elevate"
                        onClick={() => openAnalysisReview(analysis)}
                        data-testid={`analysis-row-${analysis.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                            <ScanLine className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{analysis.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(analysis.createdAt).toLocaleDateString("en-CA")} ·
                              {analysis.analysisMode === "electrical" ? " Electrical" : " Floor Plan"}
                              {roomCount > 0 && ` · ${roomCount} rooms`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" data-testid={`badge-device-count-${analysis.id}`}>{deviceCount} devices</Badge>
                          <Badge
                            variant={analysis.status === "estimate_generated" ? "default" : "secondary"}
                            data-testid={`badge-status-${analysis.id}`}
                          >
                            {statusLabel}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-delete-analysis-${analysis.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this analysis? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAnalysisMutation.mutate(analysis.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── PAGE SELECTION STEP ─── */}
      {wizardStep === "pages" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">
                Select Pages to Analyze
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile?.name} · {pageThumbs.length} pages · {selectedPageCount} selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllPages} data-testid="button-select-all-pages">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllPages} data-testid="button-deselect-all-pages">
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
              {pageThumbs.map((thumb) => (
                <div
                  key={thumb.pageNumber}
                  className={`relative rounded-md border-2 cursor-pointer overflow-visible transition-colors ${
                    thumb.selected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-muted"
                  }`}
                  onClick={() => togglePage(thumb.pageNumber)}
                  data-testid={`page-thumb-${thumb.pageNumber}`}
                >
                  <img
                    src={thumb.dataUrl}
                    alt={`Page ${thumb.pageNumber}`}
                    className="w-full h-auto rounded-md"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <Checkbox
                      checked={thumb.selected}
                      onCheckedChange={() => togglePage(thumb.pageNumber)}
                      data-testid={`checkbox-page-${thumb.pageNumber}`}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 dark:bg-background/90 py-1 px-2 rounded-b-md">
                    <p className="text-xs font-medium text-center">Page {thumb.pageNumber}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setWizardStep("upload")}
                data-testid="button-back-to-upload"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={selectedPageCount === 0 || analyzeMutation.isPending}
                data-testid="button-analyze-selected"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing {selectedPageCount} page{selectedPageCount !== 1 ? "s" : ""}...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4 mr-2" />
                    Analyze {selectedPageCount} Page{selectedPageCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>

            {analyzeMutation.isPending && (
              <div className="mt-4 space-y-2">
                <Progress value={analysisProgress ? (analysisProgress.page / analysisProgress.totalPages) * 100 : 10} />
                <p className="text-xs text-muted-foreground text-center">
                  {analysisProgress?.status === "extracting_legend"
                    ? "Extracting drawing legend..."
                    : analysisProgress && analysisProgress.totalPages > 0
                      ? `Analyzing page ${analysisProgress.page} of ${analysisProgress.totalPages}...`
                      : `Processing ${selectedPageCount} page${selectedPageCount !== 1 ? "s" : ""} with Gemini Vision AI...`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── REVIEW STEP ─── */}
      {wizardStep === "review" && analysisResults && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <DoorOpen className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Rooms</span>
                </div>
                <p className="text-lg font-bold" data-testid="text-room-count">
                  {analysisResults.rooms?.filter(r => r.name !== "WHOLE HOUSE" && r.name !== "DWELLING EXTRAS")?.length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-chart-3" />
                  <span className="text-xs text-muted-foreground">Total Devices</span>
                </div>
                <p className="text-lg font-bold" data-testid="text-device-count">
                  {analysisResults.totalDevices || analysisResults.allDevices?.reduce((s, d) => s + d.count, 0) || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Plug className="w-4 h-4 text-chart-2" />
                  <span className="text-xs text-muted-foreground">Device Types</span>
                </div>
                <p className="text-lg font-bold" data-testid="text-type-count">
                  {analysisResults.allDevices?.length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-muted-foreground">
                    {analysisResults.totalSqFt ? `${analysisResults.totalSqFt.toLocaleString()} sq ft` : "Status"}
                  </span>
                </div>
                <p className="text-sm font-bold" data-testid="text-analysis-status">
                  {currentAnalysis?.status === "estimate_generated" ? "Estimate Generated" : "Ready"}
                </p>
              </CardContent>
            </Card>
          </div>

          {analysisResults.notes && (
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground whitespace-pre-line">{analysisResults.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">
                  Analysis Results - {currentAnalysis?.fileName}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {currentAnalysis?.analysisMode === "electrical" ? "Electrical Drawing" : "Floor Plan (CEC 2021)"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewTab("rooms")}
                  className={reviewTab === "rooms" ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="button-tab-rooms"
                >
                  <DoorOpen className="w-4 h-4 mr-1" />
                  By Room
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewTab("devices")}
                  className={reviewTab === "devices" ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="button-tab-devices"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  All Devices
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCsv}
                  data-testid="button-download-csv"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reviewTab === "rooms" ? (
                <div className="space-y-3">
                  {analysisResults.rooms && analysisResults.rooms.length > 0 ? (
                    <>
                      {/* Search + Expand/Collapse controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search rooms..."
                            value={roomSearch}
                            onChange={(e) => setRoomSearch(e.target.value)}
                            className="pl-9 h-9"
                            data-testid="input-search-rooms"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={expandAllRooms} data-testid="button-expand-all">
                          <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                          Expand All
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAllRooms} data-testid="button-collapse-all">
                          Collapse All
                        </Button>
                      </div>

                      {/* Floor-grouped rooms */}
                      {(() => {
                        const floors = groupedByFloor();
                        const searchLower = roomSearch.toLowerCase();
                        const filteredFloors: [string, RoomEntry[]][] = floors
                          .map(([floor, rooms]): [string, RoomEntry[]] => {
                            if (!roomSearch) return [floor, rooms];
                            const filtered = rooms.filter(({ room }: RoomEntry) =>
                              room.name.toLowerCase().includes(searchLower) ||
                              (room.type || "").toLowerCase().includes(searchLower) ||
                              floor.toLowerCase().includes(searchLower)
                            );
                            return [floor, filtered];
                          })
                          .filter(([, rooms]) => rooms.length > 0);

                        if (filteredFloors.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No rooms match "{roomSearch}"
                            </div>
                          );
                        }

                        return filteredFloors.map(([floor, rooms]) => {
                          const floorExpanded = expandedFloors.has(floor);
                          const floorDeviceCount = rooms.reduce((sum: number, { room, roomIdx }: RoomEntry) =>
                            sum + room.devices.reduce((s: number, d: RoomData["devices"][0], di: number) => s + getDeviceCount(roomIdx, di, d.count), 0), 0
                          );

                          return (
                            <div key={floor} className="border rounded-lg overflow-hidden" data-testid={`floor-group-${floor}`}>
                              {/* Floor header */}
                              <button
                                type="button"
                                className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
                                onClick={() => toggleFloor(floor)}
                              >
                                {floorExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-sm font-semibold">{floor}</span>
                                <Badge variant="secondary" className="text-xs ml-1">
                                  {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {floorDeviceCount} devices
                                </Badge>
                              </button>

                              {/* Rooms within floor */}
                              {floorExpanded && (
                                <div className="divide-y">
                                  {rooms.map(({ roomIdx, room }: RoomEntry) => {
                                    const roomExpanded = expandedRooms.has(roomIdx) || !!roomSearch;
                                    const roomDeviceCount = room.devices.reduce(
                                      (s: number, d: RoomData["devices"][0], di: number) => s + getDeviceCount(roomIdx, di, d.count), 0
                                    );
                                    return (
                                      <div key={roomIdx} data-testid={`room-card-${roomIdx}`}>
                                        {/* Room header - clickable to expand */}
                                        <button
                                          type="button"
                                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors text-left"
                                          onClick={() => toggleRoom(roomIdx)}
                                        >
                                          {roomExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                          )}
                                          <DoorOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                          <span className="text-sm font-medium">{room.name}</span>
                                          {room.type && room.type !== "whole_house" && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{room.type.replace(/_/g, " ")}</Badge>
                                          )}
                                          {room.type === "whole_house" && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Whole House</Badge>
                                          )}
                                          {room.area_sqft && room.area_sqft > 0 && (
                                            <span className="text-xs text-muted-foreground">{room.area_sqft} sq ft</span>
                                          )}
                                          {/* Panel assignment dropdown */}
                                          {(() => {
                                            const assignment = panelAssignments?.find(pa => pa.roomName === room.name);
                                            if (!assignment) return null;
                                            return (
                                              <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Select
                                                  value={assignment.panelName}
                                                  onValueChange={(val) => updatePanelAssignmentMutation.mutate({ assignmentId: assignment.id, panelName: val })}
                                                >
                                                  <SelectTrigger className={`h-6 text-[10px] w-[140px] ${assignment.panelName === "Main Panel" ? "border-blue-300 text-blue-700" : "border-amber-300 text-amber-700"}`}>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="Main Panel">Main Panel</SelectItem>
                                                    <SelectItem value="Suite Sub-Panel">Suite Sub-Panel</SelectItem>
                                                    <SelectItem value="Unit A Panel">Unit A Panel</SelectItem>
                                                    <SelectItem value="Unit B Panel">Unit B Panel</SelectItem>
                                                    <SelectItem value="Unit C Panel">Unit C Panel</SelectItem>
                                                    <SelectItem value="Unit D Panel">Unit D Panel</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            );
                                          })()}
                                          {!panelAssignments?.find(pa => pa.roomName === room.name) && (
                                            <span className="text-xs text-muted-foreground ml-auto">{roomDeviceCount} devices</span>
                                          )}
                                          {panelAssignments?.find(pa => pa.roomName === room.name) && (
                                            <span className="text-xs text-muted-foreground">{roomDeviceCount} devices</span>
                                          )}
                                        </button>

                                        {/* Room device table - shown when expanded */}
                                        {roomExpanded && (
                                          <div className="px-4 pb-3 pt-1">
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Device</TableHead>
                                                  <TableHead className="w-[100px] text-right">Count</TableHead>
                                                  <TableHead>Assembly</TableHead>
                                                  <TableHead>CEC Reference</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {room.devices.map((device, devIdx) => {
                                                  const Icon = getDeviceIcon(device.type);
                                                  const count = getDeviceCount(roomIdx, devIdx, device.count);
                                                  const isEdited = editedCounts[`${roomIdx}-${devIdx}`] !== undefined;
                                                  const editKey = `${roomIdx}-${devIdx}`;
                                                  const overrideId = assemblyOverrides[editKey];
                                                  const overrideAssembly = overrideId !== undefined
                                                    ? deviceAssemblies?.find(a => a.id === overrideId)
                                                    : undefined;
                                                  const { assembly: autoMatched, matchType } = getMatchedAssembly(device.type);
                                                  const displayAssembly = overrideAssembly || autoMatched;
                                                  const displayMatchType = overrideAssembly ? "exact" : matchType;
                                                  return (
                                                    <TableRow key={devIdx} data-testid={`room-device-${roomIdx}-${devIdx}`}>
                                                      <TableCell>
                                                        <div className="flex items-center gap-2">
                                                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                                          <span className="text-sm">{device.type}</span>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <Input
                                                          type="number"
                                                          min={0}
                                                          value={count}
                                                          onChange={(e) => setDeviceCount(roomIdx, devIdx, parseInt(e.target.value) || 0)}
                                                          className={`w-[70px] text-right text-sm ml-auto ${isEdited ? "border-primary" : ""}`}
                                                          data-testid={`input-count-${roomIdx}-${devIdx}`}
                                                        />
                                                      </TableCell>
                                                      <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                            displayMatchType === "exact" ? "bg-green-500" :
                                                            displayMatchType === "fuzzy" ? "bg-amber-500" : "bg-red-500"
                                                          }`} />
                                                          <Select
                                                            value={displayAssembly ? String(displayAssembly.id) : "none"}
                                                            onValueChange={(val) => {
                                                              if (val === "none") {
                                                                setAssemblyOverrides(prev => {
                                                                  const next = { ...prev };
                                                                  delete next[editKey];
                                                                  return next;
                                                                });
                                                              } else {
                                                                setAssemblyOverrides(prev => ({ ...prev, [editKey]: parseInt(val) }));
                                                              }
                                                            }}
                                                          >
                                                            <SelectTrigger className="h-7 text-xs w-[180px]">
                                                              <SelectValue placeholder="No match" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="none">No assembly</SelectItem>
                                                              {deviceAssemblies?.map(a => (
                                                                <SelectItem key={a.id} value={String(a.id)}>
                                                                  {a.name} (${a.materialCost.toFixed(2)})
                                                                </SelectItem>
                                                              ))}
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{device.notes || "-"}</TableCell>
                                                    </TableRow>
                                                  );
                                                })}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No room data available. Try the All Devices view.
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device Type</TableHead>
                        <TableHead>Rooms</TableHead>
                        <TableHead className="text-right">Total Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResults.allDevices && analysisResults.allDevices.length > 0 ? (
                        [...analysisResults.allDevices]
                          .sort((a, b) => b.count - a.count)
                          .map((device, idx) => {
                            const Icon = getDeviceIcon(device.type);
                            return (
                              <TableRow key={idx} data-testid={`device-row-${idx}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{device.type}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                  {device.room && device.room.length > 30 ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="block truncate cursor-help">{device.room}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                          <p className="text-xs">{device.room}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <span className="block truncate">{device.room || "-"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-sm font-bold">{device.count}</span>
                                    {device.confidence < 0.95 && (
                                      <span className={`inline-block w-2 h-2 rounded-full ${device.confidence >= 0.8 ? "bg-amber-500" : "bg-red-500"}`} title={`${(device.confidence * 100).toFixed(0)}% confidence`} />
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                            No device data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── PROJECT LINKING ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="w-4 h-4" />
                Link to Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentAnalysis?.projectId ? (
                <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      Linked to: {projects?.find(p => p.id === currentAnalysis.projectId)?.name || `Project #${currentAnalysis.projectId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can generate an estimate from this analysis
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Link this analysis to a project before generating an estimate. Create a new project or link to an existing one.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-3 justify-start"
                      onClick={() => {
                        setNewProjectName(
                          currentAnalysis?.fileName
                            ?.replace(/\.(pdf|png|jpg|jpeg)$/i, "")
                            ?.replace(/[-_]/g, " ")
                            ?.replace(/\b\w/g, c => c.toUpperCase()) || ""
                        );
                        setCreateProjectOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Create New Project</p>
                        <p className="text-xs text-muted-foreground">Start a new project from this analysis</p>
                      </div>
                    </Button>
                    <div className="space-y-2">
                      <Select value={linkToExistingProject} onValueChange={(val) => {
                        setLinkToExistingProject(val);
                        linkToProjectMutation.mutate(parseInt(val, 10));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Link to existing project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(projects || []).map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Link className="w-3 h-3" />
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {reAnalyzeMutation.isPending && (
            <div className="space-y-2">
              <Progress value={analysisProgress ? (analysisProgress.page / analysisProgress.totalPages) * 100 : 10} />
              <p className="text-xs text-muted-foreground text-center">
                {analysisProgress && analysisProgress.totalPages > 0
                  ? `Re-analyzing page ${analysisProgress.page} of ${analysisProgress.totalPages}...`
                  : "Re-analyzing drawing..."}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetWizard} data-testid="button-new-analysis">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
            {!reAnalyzeMode ? (
              <Button
                variant="outline"
                onClick={() => setReAnalyzeMode(currentAnalysis?.analysisMode === "floor_plan" ? "electrical" : "floor_plan")}
                disabled={reAnalyzeMutation.isPending}
                data-testid="button-re-analyze-open"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-Analyze
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={reAnalyzeMode} onValueChange={setReAnalyzeMode}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="floor_plan">Floor Plan Mode</SelectItem>
                    <SelectItem value="electrical">Electrical Mode</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => reAnalyzeMutation.mutate(reAnalyzeMode)}
                  disabled={reAnalyzeMutation.isPending}
                  data-testid="button-re-analyze-run"
                >
                  {reAnalyzeMutation.isPending ? (
                    <><Clock className="w-4 h-4 mr-2 animate-spin" />Running...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" />Run</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReAnalyzeMode(null)}>Cancel</Button>
              </div>
            )}
            <Button
              onClick={() => generateEstimateMutation.mutate()}
              disabled={generateEstimateMutation.isPending || currentAnalysis?.status === "estimate_generated" || !currentAnalysis?.projectId}
              data-testid="button-generate-estimate"
            >
              {generateEstimateMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : currentAnalysis?.status === "estimate_generated" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Estimate Generated
                </>
              ) : !currentAnalysis?.projectId ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Link Project First
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Estimate
                </>
              )}
            </Button>
          </div>

          {/* ─── CREATE PROJECT DIALOG ─── */}
          <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Wolf Street Residence"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={newProjectAddress}
                    onChange={(e) => setNewProjectAddress(e.target.value)}
                    placeholder="123 Main St, City, Province"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dwelling Type</Label>
                  <Select value={newProjectDwelling} onValueChange={setNewProjectDwelling}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DWELLING_TYPES.map(dt => {
                        const labels: Record<string, string> = {
                          single: "Single Family", duplex: "Duplex", triplex: "Triplex",
                          fourplex: "Fourplex", townhouse: "Townhouse", condo: "Condo",
                          apartment: "Apartment", commercial: "Commercial", industrial: "Industrial",
                        };
                        return (
                          <SelectItem key={dt} value={dt}>
                            {labels[dt] || dt.charAt(0).toUpperCase() + dt.slice(1)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Customer (optional)</Label>
                  {!showNewCustomerForm ? (
                    <div className="space-y-2">
                      <Select value={newProjectCustomerId} onValueChange={(val) => {
                        if (val === "__new__") {
                          setShowNewCustomerForm(true);
                          setNewProjectCustomerId("");
                        } else {
                          setNewProjectCustomerId(val);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer or skip..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">
                            <div className="flex items-center gap-2 text-primary">
                              <Plus className="w-3 h-3" />
                              Create New Customer
                            </div>
                          </SelectItem>
                          {(customersData || []).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">New Customer</p>
                        <Button variant="ghost" size="sm" onClick={() => setShowNewCustomerForm(false)}>
                          Cancel
                        </Button>
                      </div>
                      <Input
                        placeholder="Customer name"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                      <Input
                        placeholder="Email (optional)"
                        type="email"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                      />
                      <Input
                        placeholder="Phone (optional)"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                        onClick={() => createCustomerMutation.mutate({
                          name: newCustomerName.trim(),
                          email: newCustomerEmail.trim() || undefined,
                          phone: newCustomerPhone.trim() || undefined,
                        })}
                      >
                        {createCustomerMutation.isPending ? "Creating..." : "Save Customer"}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!newProjectName.trim() || createProjectFromAnalysisMutation.isPending}
                    onClick={() => {
                      const customerName = newProjectCustomerId
                        ? customersData?.find(c => c.id === parseInt(newProjectCustomerId))?.name || newProjectName
                        : newProjectName;
                      createProjectFromAnalysisMutation.mutate({
                        name: newProjectName.trim(),
                        clientName: customerName,
                        customerId: newProjectCustomerId ? parseInt(newProjectCustomerId) : undefined,
                        address: newProjectAddress.trim() || undefined,
                        dwellingType: newProjectDwelling,
                      });
                    }}
                  >
                    {createProjectFromAnalysisMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

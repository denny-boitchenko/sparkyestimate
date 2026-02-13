import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, ScanLine, Zap, FileImage, CheckCircle2,
  Lightbulb, Plug, ToggleLeft, ShieldAlert, Wifi, Clock,
  DoorOpen, ChevronRight, ArrowLeft, Sparkles, Trash2, FileText
} from "lucide-react";
import type { Project, AiAnalysis } from "@shared/schema";

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
    await page.render({ canvasContext: ctx, viewport }).promise;
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
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({
      pageNumber: num,
      dataUrl: canvas.toDataURL("image/png"),
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
  const [selectedProject, setSelectedProject] = useState("");
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [reviewTab, setReviewTab] = useState<"rooms" | "devices">("rooms");
  const [pageThumbs, setPageThumbs] = useState<PageThumb[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: analyses, isLoading: loadingAnalyses } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/ai-analyses"],
  });

  const currentAnalysis = analyses?.find(a => a.id === currentAnalysisId);
  const analysisResults = currentAnalysis?.results as AnalysisResults | null;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedProject) throw new Error("Select a file and project");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", analysisMode);
      formData.append("projectId", selectedProject);

      if (isPdf && pageThumbs.length > 0) {
        const selectedPages = pageThumbs.filter(p => p.selected).map(p => p.pageNumber);
        if (selectedPages.length === 0) throw new Error("Select at least one page");
        const fullPages = await renderPdfFullPages(selectedFile, selectedPages);
        formData.append("pageImages", JSON.stringify(fullPages));
      }

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
      const res = await apiRequest("POST", `/api/ai-analyses/${currentAnalysisId}/generate-estimate`);
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
  };

  const resetWizard = () => {
    setWizardStep("upload");
    setCurrentAnalysisId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPageThumbs([]);
    setIsPdf(false);
  };

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
                  <Label>Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger data-testid="select-analysis-project">
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects || []).map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                <div
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate active-elevate-2 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
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
                    disabled={!selectedFile || !selectedProject}
                    data-testid="button-select-pages"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Select Pages ({pageThumbs.length} pages)
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => analyzeMutation.mutate()}
                    disabled={!selectedFile || !selectedProject || analyzeMutation.isPending}
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
                    <Progress value={66} />
                    <p className="text-xs text-muted-foreground text-center">
                      {analysisMode === "floor_plan"
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
                  { step: "4", title: "Review Results", desc: "Review devices by room or summary, check CEC compliance notes" },
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
                <div className="space-y-2">
                  {analyses.map((analysis) => {
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
                                <AlertDialogAction onClick={() => deleteAnalysisMutation.mutate(analysis.id)}>
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
                disabled={selectedPageCount === 0 || !selectedProject || analyzeMutation.isPending}
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
                <Progress value={50} />
                <p className="text-xs text-muted-foreground text-center">
                  Processing {selectedPageCount} page{selectedPageCount !== 1 ? "s" : ""} with Gemini Vision AI...
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
                  {analysisResults.rooms?.filter(r => r.name !== "WHOLE HOUSE")?.length || 0}
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
              <CardTitle className="text-base font-semibold">
                Analysis Results - {currentAnalysis?.fileName}
              </CardTitle>
              <div className="flex gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              {reviewTab === "rooms" ? (
                <div className="space-y-4">
                  {analysisResults.rooms && analysisResults.rooms.length > 0 ? (
                    analysisResults.rooms.map((room, roomIdx) => (
                      <div key={roomIdx} className="border rounded-md p-4" data-testid={`room-card-${roomIdx}`}>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <DoorOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">{room.name}</span>
                          {room.type && room.type !== "whole_house" && (
                            <Badge variant="outline" className="text-xs">{room.type.replace(/_/g, " ")}</Badge>
                          )}
                          {room.floor && (
                            <Badge variant="outline" className="text-xs">{room.floor}</Badge>
                          )}
                          {room.area_sqft && room.area_sqft > 0 && (
                            <Badge variant="secondary" className="text-xs">{room.area_sqft} sq ft</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {room.devices.reduce((s, d) => s + d.count, 0)} devices
                          </Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Device</TableHead>
                              <TableHead className="text-right">Count</TableHead>
                              <TableHead className="text-right">Confidence</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {room.devices.map((device, devIdx) => {
                              const Icon = getDeviceIcon(device.type);
                              return (
                                <TableRow key={devIdx} data-testid={`room-device-${roomIdx}-${devIdx}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span className="text-sm">{device.type}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">{device.count}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`text-sm font-medium ${getConfidenceColor(device.confidence)}`}>
                                      {(device.confidence * 100).toFixed(0)}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{device.notes || "-"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))
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
                        <TableHead className="text-right">Confidence</TableHead>
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
                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {device.room || "-"}
                                </TableCell>
                                <TableCell className="text-right text-sm font-bold">{device.count}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`text-sm font-medium ${getConfidenceColor(device.confidence)}`}>
                                    {(device.confidence * 100).toFixed(0)}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
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

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetWizard} data-testid="button-new-analysis">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
            <Button
              onClick={() => generateEstimateMutation.mutate()}
              disabled={generateEstimateMutation.isPending || currentAnalysis?.status === "estimate_generated"}
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
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Estimate
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

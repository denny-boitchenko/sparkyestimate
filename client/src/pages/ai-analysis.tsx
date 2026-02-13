import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, ScanLine, Zap, FileImage, CheckCircle2,
  Lightbulb, Plug, ToggleLeft, ShieldAlert, Wifi, Clock,
  DoorOpen, ChevronRight, ArrowLeft, Sparkles, Plus, Trash2
} from "lucide-react";
import type { Project, AiAnalysis } from "@shared/schema";

type WizardStep = "upload" | "review" | "generate";

interface RoomData {
  name: string;
  floor: string;
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
  pageCount?: number;
}

export default function AiAnalysisPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState("electrical");
  const [selectedProject, setSelectedProject] = useState("");
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [reviewTab, setReviewTab] = useState<"rooms" | "devices">("rooms");
  const [selectedPages, setSelectedPages] = useState<string>("all");

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
      if (selectedPages !== "all") {
        formData.append("pages", selectedPages);
      }
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analysis failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      toast({ title: "Analysis complete", description: "Drawing analysis finished successfully" });
      setCurrentAnalysisId(data.id);
      setWizardStep("review");
      setSelectedFile(null);
      setPreviewUrl(null);
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
      toast({ title: "Estimate generated", description: `Created ${data.itemsCreated || 0} line items` });
      setWizardStep("upload");
      setCurrentAnalysisId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type.includes("receptacle") || type.includes("outlet")) return Plug;
    if (type.includes("switch")) return ToggleLeft;
    if (type.includes("light") || type.includes("lamp")) return Lightbulb;
    if (type.includes("smoke") || type.includes("detector")) return ShieldAlert;
    if (type.includes("data") || type.includes("network")) return Wifi;
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

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "upload" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <Upload className="w-3.5 h-3.5" />
        Upload
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "review" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <ScanLine className="w-3.5 h-3.5" />
        Review
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${wizardStep === "generate" ? "bg-primary/10 dark:bg-primary/20 text-primary" : "text-muted-foreground"}`}>
        <Sparkles className="w-3.5 h-3.5" />
        Generate
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
            onClick={() => { setWizardStep("upload"); setCurrentAnalysisId(null); }}
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
                      <SelectItem value="electrical">Electrical Drawing Mode</SelectItem>
                      <SelectItem value="floor_plan">Floor Plan Only Mode</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {analysisMode === "electrical"
                      ? "Scans for electrical symbols (outlets, switches, lights, etc.)"
                      : "Detects rooms and applies CEC 2021 minimum device requirements"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pages to Analyze</Label>
                  <Input
                    placeholder="all (or e.g. 1,3,5-7)"
                    value={selectedPages}
                    onChange={(e) => setSelectedPages(e.target.value)}
                    data-testid="input-pages"
                  />
                  <p className="text-xs text-muted-foreground">
                    For multi-page PDFs, specify which pages to analyze
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
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-md" />
                      <p className="text-sm font-medium">{selectedFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="space-y-2">
                      <FileImage className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Drop a file or click to upload</p>
                      <p className="text-xs text-muted-foreground">
                        Supports images (PNG, JPG) and PDF files
                      </p>
                    </div>
                  )}
                </div>

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

                {analyzeMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={66} />
                    <p className="text-xs text-muted-foreground text-center">
                      AI is scanning the drawing for electrical devices...
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
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Upload Drawing", desc: "Upload an electrical drawing or architectural floor plan" },
                    { step: "2", title: "Select Pages", desc: "Choose which pages to analyze (for multi-page PDFs)" },
                    { step: "3", title: "AI Detects Devices", desc: "Gemini AI identifies rooms, devices, and counts by location" },
                    { step: "4", title: "Review Results", desc: "Review by room or all devices, edit quantities as needed" },
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
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Powered by Gemini AI with CEC 2021 compliance checking. Supports 34+ electrical symbol types and 21 room types.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a drawing above to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {analyses.map((analysis) => {
                    const results = analysis.results as AnalysisResults | null;
                    const deviceCount = results?.totalDevices || results?.allDevices?.length || 0;
                    const roomCount = results?.rooms?.length || 0;
                    const statusLabel = analysis.status === "completed" ? "Completed" :
                      analysis.status === "estimate_generated" ? "Estimate Generated" : analysis.status;
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); deleteAnalysisMutation.mutate(analysis.id); }}
                            data-testid={`button-delete-analysis-${analysis.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                  {analysisResults.rooms?.length || 0}
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
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
                <p className="text-sm font-bold" data-testid="text-analysis-status">
                  {currentAnalysis?.status === "estimate_generated" ? "Estimate Generated" : "Ready to Generate"}
                </p>
              </CardContent>
            </Card>
          </div>

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
                  Rooms
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
                        <div className="flex items-center gap-2 mb-3">
                          <DoorOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">{room.name}</span>
                          {room.floor && (
                            <Badge variant="outline" className="text-xs">{room.floor}</Badge>
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
                        <TableHead>Room</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResults.allDevices && analysisResults.allDevices.length > 0 ? (
                        analysisResults.allDevices.map((device, idx) => {
                          const Icon = getDeviceIcon(device.type);
                          return (
                            <TableRow key={idx} data-testid={`device-row-${idx}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{device.type}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{device.room || "General"}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{device.count}</TableCell>
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
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No devices detected
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setWizardStep("upload"); setCurrentAnalysisId(null); }}
              data-testid="button-back-to-upload"
            >
              Back to Upload
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
                  Estimate Already Generated
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

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, ScanLine, Zap, FileImage, AlertCircle, CheckCircle2,
  Lightbulb, Plug, ToggleLeft, ShieldAlert, Wifi, Clock
} from "lucide-react";
import type { Project, AiAnalysis } from "@shared/schema";

export default function AiAnalysisPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState("electrical");
  const [selectedProject, setSelectedProject] = useState("");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: analyses, isLoading: loadingAnalyses } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/ai-analyses"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedProject) throw new Error("Select a file and project");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", analysisMode);
      formData.append("projectId", selectedProject);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analyses"] });
      toast({ title: "Analysis complete", description: "Drawing analysis finished successfully" });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (err: Error) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
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

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-ai-title">
          AI Drawing Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload electrical drawings or floor plans for AI-powered device detection
        </p>
      </div>

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
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0 text-sm font-bold text-primary">1</div>
                <div>
                  <p className="text-sm font-medium">Upload Drawing</p>
                  <p className="text-xs text-muted-foreground">Upload an electrical drawing or architectural floor plan</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0 text-sm font-bold text-primary">2</div>
                <div>
                  <p className="text-sm font-medium">AI Detects Devices</p>
                  <p className="text-xs text-muted-foreground">Gemini AI identifies electrical symbols, rooms, and device counts</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0 text-sm font-bold text-primary">3</div>
                <div>
                  <p className="text-sm font-medium">Review Results</p>
                  <p className="text-xs text-muted-foreground">Review detected devices with confidence scores and edit as needed</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0 text-sm font-bold text-primary">4</div>
                <div>
                  <p className="text-sm font-medium">Generate Estimate</p>
                  <p className="text-xs text-muted-foreground">Use detected devices to auto-populate your estimate line items</p>
                </div>
              </div>
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
                const results = analysis.results as any;
                const deviceCount = results?.devices?.length || results?.rooms?.length || 0;
                return (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border"
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
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">{deviceCount} items detected</Badge>
                      <CheckCircle2 className="w-4 h-4 text-chart-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

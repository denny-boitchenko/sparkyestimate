import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Camera, LogOut, ArrowLeft, Upload, MapPin, Zap, Clock, Plus
} from "lucide-react";
import type { Project, ProjectPhoto, TimeEntry } from "@shared/schema";

type AuthState = {
  employee: { id: number; name: string; role: string };
  assignments: Array<{ id: number; projectId: number; employeeId: number }>;
} | null;

type PhotoWithUrl = ProjectPhoto & { downloadUrl: string | null };

const PHASES = [
  { value: "service", label: "Service" },
  { value: "roughin", label: "Rough-in" },
  { value: "finish", label: "Finish" },
];

export default function EmployeePortal() {
  const [auth, setAuth] = useState<AuthState>(null);
  const [pin, setPin] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loginError, setLoginError] = useState("");
  const [portalTab, setPortalTab] = useState<"photos" | "timesheet">("photos");
  const { toast } = useToast();

  // Time logging state
  const [logPhase, setLogPhase] = useState("roughin");
  const [logHours, setLogHours] = useState("8");
  const [logNotes, setLogNotes] = useState("");

  // Login via PIN only
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee-login", { pin });
      return res.json();
    },
    onSuccess: (data: AuthState) => {
      setAuth(data);
      setLoginError("");
      setPin("");
    },
    onError: (err: Error) => {
      setLoginError(err.message || "Invalid PIN");
    },
  });

  // Fetch projects for this employee
  const projectIds = auth?.assignments.map(a => a.projectId) || [];
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !!auth,
  });
  const myProjects = (projects || []).filter(p => projectIds.includes(p.id));

  // Fetch photos for selected project
  const { data: photos } = useQuery<PhotoWithUrl[]>({
    queryKey: ["/api/projects", selectedProject?.id, "photos"],
    enabled: !!selectedProject,
  });

  // Fetch recent time entries for this employee (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const { data: recentTimeEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", { employeeId: auth?.employee.id, startDate, endDate }],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?employeeId=${auth?.employee.id}&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!auth,
  });

  // Storage status (R2 or Google Drive)
  const { data: storageStatus } = useQuery<{ configured: boolean; provider: string | null }>({
    queryKey: ["/api/r2-status"],
    enabled: !!auth,
  });

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPhase, setUploadPhase] = useState<string>("roughin");
  const [uploading, setUploading] = useState(false);

  // Time entry creation
  const logTimeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/time-entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Hours logged" });
      setLogHours("8");
      setLogNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (file: File) => {
    if (!selectedProject || !auth) return;
    setUploading(true);
    try {
      // Get GPS if available
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
      } catch { /* GPS not available, that's fine */ }

      if (storageStatus?.provider === "google_drive") {
        // Google Drive: upload file directly via multipart form
        const formData = new FormData();
        formData.append("file", file);
        formData.append("phase", uploadPhase);
        formData.append("employeeId", String(auth.employee.id));
        if (gpsLat !== null) formData.append("gpsLat", String(gpsLat));
        if (gpsLng !== null) formData.append("gpsLng", String(gpsLng));
        const res = await fetch(`/api/projects/${selectedProject.id}/photos/upload-gdrive`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      } else {
        // R2: get presigned URL then upload directly
        const res = await apiRequest("POST", `/api/projects/${selectedProject.id}/photos/upload-url`, {
          filename: file.name,
          contentType: file.type,
          phase: uploadPhase,
          employeeId: auth.employee.id,
          gpsLat,
          gpsLng,
        });
        const { uploadUrl } = await res.json();
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }

      toast({ title: "Photo uploaded", description: `${file.name} uploaded to ${uploadPhase}` });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject.id, "photos"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handlePhotoUpload(files[i]);
      }
    }
    e.target.value = "";
  };

  const getProjectName = (id: number) => projects?.find(p => p.id === id)?.name || `Project #${id}`;

  // ─── Login Screen ───
  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
            <CardTitle className="text-xl">Employee Portal</CardTitle>
            <p className="text-sm text-muted-foreground">SparkyEstimate</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN</label>
                <Input
                  type="password"
                  placeholder="Enter your PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-lg h-14 tracking-widest text-center"
                  autoFocus
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button type="submit" className="w-full h-12 text-lg" disabled={loginMutation.isPending || !pin}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Project List ───
  if (!selectedProject) {
    const recentTotal = (recentTimeEntries || []).reduce((sum, te) => sum + te.hours, 0);

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">My Projects</h1>
            <p className="text-sm text-muted-foreground">{auth.employee.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setAuth(null)}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Recent hours summary */}
        <div className="p-4 pb-0">
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{recentTotal.toFixed(1)} hours logged</p>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 space-y-3">
          {myProjects.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No projects assigned to you yet.</p>
                <p className="text-sm mt-1">Ask the owner to assign you to a project.</p>
              </CardContent>
            </Card>
          ) : (
            myProjects.map(project => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.address}</p>
                      <p className="text-sm text-muted-foreground">{project.clientName}</p>
                    </div>
                    <Badge variant={project.status === "in_progress" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Recent time entries */}
        {(recentTimeEntries || []).length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-sm font-medium mb-2">Recent Time Entries</h3>
            <div className="space-y-2">
              {(recentTimeEntries || []).slice(0, 10).map(te => (
                <div key={te.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{getProjectName(te.projectId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {te.date} / {PHASES.find(p => p.value === te.phase)?.label || te.phase || "--"}
                      {te.notes ? ` / ${te.notes}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm">{te.hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Project Detail View (Photos + Timesheet) ───
  const phasePhotos = (phase: string) =>
    (photos || []).filter(p => p.inspectionPhase === phase);

  const projectTimeEntries = (recentTimeEntries || []).filter(te => te.projectId === selectedProject.id);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{selectedProject.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{selectedProject.address}</p>
        </div>
      </header>

      {/* Top-level tabs: Photos vs Timesheet */}
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <Button
            variant={portalTab === "photos" ? "default" : "outline"}
            className="flex-1 h-11"
            onClick={() => setPortalTab("photos")}
          >
            <Camera className="w-4 h-4 mr-2" />
            Photos
          </Button>
          <Button
            variant={portalTab === "timesheet" ? "default" : "outline"}
            className="flex-1 h-11"
            onClick={() => setPortalTab("timesheet")}
          >
            <Clock className="w-4 h-4 mr-2" />
            Log Hours
          </Button>
        </div>

        {portalTab === "timesheet" ? (
          <div className="space-y-4">
            {/* Log hours form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Log Hours for Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phase</label>
                  <Select value={logPhase} onValueChange={setLogPhase}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    className="h-11 text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="What did you work on?"
                    className="h-11"
                  />
                </div>
                <Button
                  className="w-full h-12 text-base"
                  onClick={() => {
                    logTimeMutation.mutate({
                      employeeId: auth.employee.id,
                      projectId: selectedProject.id,
                      date: new Date().toISOString().split("T")[0],
                      hours: parseFloat(logHours) || 8,
                      phase: logPhase,
                      notes: logNotes || null,
                    });
                  }}
                  disabled={logTimeMutation.isPending}
                >
                  {logTimeMutation.isPending ? "Saving..." : "Log Hours"}
                </Button>
              </CardContent>
            </Card>

            {/* Recent entries for this project */}
            {projectTimeEntries.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Entries (This Project)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {projectTimeEntries.map(te => (
                      <div key={te.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                        <div>
                          <span className="font-medium">{te.date}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {PHASES.find(p => p.value === te.phase)?.label || te.phase || "--"}
                          </Badge>
                          {te.notes && <p className="text-xs text-muted-foreground mt-0.5">{te.notes}</p>}
                        </div>
                        <span className="font-mono">{te.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Photos tab -- existing photo functionality */
          <Tabs defaultValue="roughin" onValueChange={(v) => setUploadPhase(v)}>
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="service" className="text-sm">
                Service ({phasePhotos("service").length})
              </TabsTrigger>
              <TabsTrigger value="roughin" className="text-sm">
                Rough-in ({phasePhotos("roughin").length})
              </TabsTrigger>
              <TabsTrigger value="finish" className="text-sm">
                Finish ({phasePhotos("finish").length})
              </TabsTrigger>
              <TabsTrigger value="misc" className="text-sm">
                Misc ({phasePhotos("misc").length})
              </TabsTrigger>
            </TabsList>

            {["service", "roughin", "finish", "misc"].map(phase => (
              <TabsContent key={phase} value={phase} className="space-y-4">
                {/* Upload button */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-14 text-base"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !storageStatus?.configured}
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Take Photo / Upload
                      </>
                    )}
                  </Button>
                </div>
                {!storageStatus?.configured && (
                  <p className="text-sm text-amber-600">
                    Photo storage not configured. Ask the owner to set up Cloudflare R2 credentials.
                  </p>
                )}

                {/* Photo grid */}
                <div className="grid grid-cols-2 gap-3">
                  {phasePhotos(phase).map(photo => (
                    <Card key={photo.id} className="overflow-hidden">
                      {photo.downloadUrl ? (
                        <img
                          src={photo.downloadUrl}
                          alt={photo.originalFilename}
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-2">
                        <p className="text-xs truncate">{photo.originalFilename}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(photo.createdAt).toLocaleDateString()}
                          </span>
                          {photo.gpsLat && (
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {phasePhotos(phase).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No photos yet for {phase === "roughin" ? "Rough-in" : phase.charAt(0).toUpperCase() + phase.slice(1)}</p>
                    <p className="text-sm">Tap the button above to add photos</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Hidden file input for camera/upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

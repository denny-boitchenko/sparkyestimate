import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  Camera, Upload, FolderOpen, ArrowLeft, Trash2, FileImage, ImageIcon,
  Search, LayoutGrid, List
} from "lucide-react";
import type { Project, ProjectPhoto } from "@shared/schema";

type PhotoWithUrl = ProjectPhoto & { downloadUrl: string | null; uploadedBy?: string };

export default function Photos() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activePhase, setActivePhase] = useState<string>("service");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: photos } = useQuery<PhotoWithUrl[]>({
    queryKey: ["/api/projects", selectedProject?.id, "photos"],
    enabled: !!selectedProject,
  });

  const { data: storageStatus } = useQuery<{ configured: boolean; provider: string | null }>({
    queryKey: ["/api/r2-status"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/projects/${selectedProject?.id}/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject?.id, "photos"] });
      toast({ title: "Photo deleted" });
    },
  });

  const handlePhotoUpload = async (file: File) => {
    if (!selectedProject) return;
    setUploading(true);
    try {
      if (storageStatus?.provider === "google_drive") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("phase", activePhase);
        const res = await fetch(`/api/projects/${selectedProject.id}/photos/upload-gdrive`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      } else {
        const res = await apiRequest("POST", `/api/projects/${selectedProject.id}/photos/upload-url`, {
          filename: file.name,
          contentType: file.type,
          phase: activePhase,
          employeeId: null,
          gpsLat: null,
          gpsLng: null,
        });
        const { uploadUrl } = await res.json();
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }
      toast({ title: "Photo uploaded", description: `${file.name} uploaded to ${phaseLabel(activePhase)}` });
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

  const phasePhotos = (phase: string) =>
    (photos || []).filter(p => p.inspectionPhase === phase);

  const totalPhotos = (photos || []).length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const filteredProjects = (projects || []).filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.address?.toLowerCase().includes(q)) ||
      (p.clientName?.toLowerCase().includes(q))
    );
  });

  // ─── Project List ───
  if (!selectedProject) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Photos</h1>
          <p className="text-sm text-muted-foreground">
            Inspection photos organized by project and phase (Service, Rough-in, Finish, Misc)
          </p>
        </div>

        {!storageStatus?.configured && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Photo storage is not configured. Go to Settings &gt; Photos to connect Google Drive or set up Cloudflare R2.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Search + View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-medium truncate">{project.name}</h3>
                      </div>
                      {project.address && (
                        <p className="text-sm text-muted-foreground truncate">{project.address}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{project.clientName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={project.status === "in_progress" ? "default" : "secondary"}>
                        {project.status?.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="w-3 h-3" />
                        <PhotoCount projectId={project.id} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && filteredProjects.length > 0 && (
          <div className="border rounded-lg divide-y">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedProject(project)}
              >
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{project.name}</span>
                  {project.address && (
                    <span className="text-xs text-muted-foreground truncate block">{project.address}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{project.clientName}</span>
                <Badge variant={project.status === "in_progress" ? "default" : "secondary"} className="shrink-0">
                  {project.status?.replace("_", " ")}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <ImageIcon className="w-3 h-3" />
                  <PhotoCount projectId={project.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {filteredProjects.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No projects matching "{searchQuery}"</p>
          </div>
        )}
        {(!projects || projects.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No projects yet. Create a project first to upload photos.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Project Photo Detail (List View) ───
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{selectedProject.name}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {selectedProject.address} &middot; {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href={`/projects/${selectedProject.id}`}>
          <Button variant="outline" size="sm">View Project</Button>
        </Link>
      </div>

      <Tabs value={activePhase} onValueChange={setActivePhase}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="service">
            Service ({phasePhotos("service").length})
          </TabsTrigger>
          <TabsTrigger value="roughin">
            Rough-in ({phasePhotos("roughin").length})
          </TabsTrigger>
          <TabsTrigger value="finish">
            Finish ({phasePhotos("finish").length})
          </TabsTrigger>
          <TabsTrigger value="misc">
            Misc ({phasePhotos("misc").length})
          </TabsTrigger>
        </TabsList>

        {["service", "roughin", "finish", "misc"].map(phase => (
          <TabsContent key={phase} value={phase} className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !storageStatus?.configured}
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Upload to {phaseLabel(phase)}
                  </>
                )}
              </Button>
            </div>

            {!storageStatus?.configured && (
              <p className="text-sm text-amber-600">
                Photo storage not configured. Go to Settings &gt; Photos to connect Google Drive.
              </p>
            )}

            {/* List View */}
            {phasePhotos(phase).length > 0 && (
              <div className="border rounded-lg divide-y">
                {phasePhotos(phase).map(photo => (
                  <div key={photo.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <FileImage className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {photo.originalFilename}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                    {photo.uploadedBy && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                        {photo.uploadedBy}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 shrink-0"
                      onClick={() => deleteMutation.mutate(photo.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {phasePhotos(phase).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No photos yet for {phaseLabel(phase)}</p>
                <p className="text-sm">
                  {phase === "misc"
                    ? "Upload receipts, site photos, or any other documents"
                    : `Click "Upload to ${phaseLabel(phase)}" to add inspection photos`}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    service: "Service",
    roughin: "Rough-in",
    finish: "Finish",
    misc: "Misc / Receipts",
  };
  return labels[phase] || phase;
}

/** Shows photo count for a project (lazy-loaded per card) */
function PhotoCount({ projectId }: { projectId: number }) {
  const { data } = useQuery<PhotoWithUrl[]>({
    queryKey: ["/api/projects", projectId, "photos"],
  });
  const count = data?.length ?? 0;
  return <span>{count} photo{count !== 1 ? "s" : ""}</span>;
}

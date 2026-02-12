import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Edit, Zap, MapPin, Phone, Mail, Building2,
  Calculator, Plus, Trash2, Calendar, FileText
} from "lucide-react";
import type { Project, Estimate } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    bid_sent: { label: "Bid Sent", variant: "outline" },
    won: { label: "Won", variant: "default" },
    lost: { label: "Lost", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [createEstimateOpen, setCreateEstimateOpen] = useState(false);
  const [estimateName, setEstimateName] = useState("");

  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: projectId > 0,
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/projects", projectId, "estimates"],
    enabled: projectId > 0,
  });

  const [editForm, setEditForm] = useState<Partial<Project>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated" });
      setEditing(false);
    },
  });

  const createEstimateMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/estimates", {
        projectId,
        name,
      });
      return res.json();
    },
    onSuccess: (data: Estimate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Estimate created" });
      setCreateEstimateOpen(false);
      setEstimateName("");
      navigate(`/estimates/${data.id}`);
    },
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Estimate deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const startEditing = () => {
    setEditForm({
      name: project.name,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      address: project.address,
      dwellingType: project.dwellingType,
      status: project.status,
      notes: project.notes,
    });
    setEditing(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-project-name">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">{project.clientName}</p>
        </div>
        <Button variant="outline" onClick={startEditing} data-testid="button-edit-project">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="estimates" data-testid="tab-estimates">
            Estimates ({estimates?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{project.clientName}</p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
                {project.clientEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{project.clientEmail}</span>
                  </div>
                )}
                {project.clientPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{project.clientPhone}</span>
                  </div>
                )}
                {project.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{project.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Dwelling Type</span>
                  <Badge variant="outline">
                    {({ single: "Single Family", duplex: "Duplex", triplex: "Triplex", fourplex: "Fourplex" } as Record<string, string>)[project.dwellingType] || project.dwellingType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(project.createdAt).toLocaleDateString("en-CA")}</span>
                </div>
                {project.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Create and manage estimates for this project
            </p>
            <Button onClick={() => setCreateEstimateOpen(true)} data-testid="button-create-estimate">
              <Plus className="w-4 h-4 mr-2" />
              New Estimate
            </Button>
          </div>

          {!estimates || estimates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-3">
                  <Calculator className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No estimates yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create an estimate to start building your quote
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {estimates.map((estimate) => (
                <Card
                  key={estimate.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  data-testid={`card-estimate-${estimate.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0" onClick={() => navigate(`/estimates/${estimate.id}`)}>
                        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-chart-2/10 dark:bg-chart-2/20 flex-shrink-0">
                          <FileText className="w-4 h-4 text-chart-2" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{estimate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(estimate.createdAt).toLocaleDateString("en-CA")} · OH: {estimate.overheadPct}% · Profit: {estimate.profitPct}%
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteEstimateMutation.mutate(estimate.id)}
                        data-testid={`button-delete-estimate-${estimate.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} data-testid="input-edit-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={editForm.clientName || ""} onChange={(e) => setEditForm(p => ({ ...p, clientName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status || "draft"} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="bid_sent">Bid Sent</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.clientEmail || ""} onChange={(e) => setEditForm(p => ({ ...p, clientEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.clientPhone || ""} onChange={(e) => setEditForm(p => ({ ...p, clientPhone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={editForm.address || ""} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-project">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createEstimateOpen} onOpenChange={setCreateEstimateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Estimate</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createEstimateMutation.mutate(estimateName); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Estimate Name</Label>
              <Input
                placeholder="e.g., Main Quote"
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
                required
                data-testid="input-estimate-name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateEstimateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEstimateMutation.isPending} data-testid="button-submit-estimate">
                {createEstimateMutation.isPending ? "Creating..." : "Create Estimate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

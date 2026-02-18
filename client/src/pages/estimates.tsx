import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Calculator, ArrowRight, FileText, Trash2, Search, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Estimate, Project } from "@shared/schema";

export default function Estimates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date_newest" | "date_oldest" | "name" | "project">("date_newest");

  const { data: estimates, isLoading } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Estimate deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getProjectName = (projectId: number) => {
    return projects?.find(p => p.id === projectId)?.name || "Unknown Project";
  };

  const filtered = (estimates || []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const projName = getProjectName(e.projectId);
    return [e.name, projName].some(f => f?.toLowerCase().includes(q));
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date_newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date_oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name": return a.name.localeCompare(b.name);
      case "project": return getProjectName(a.projectId).localeCompare(getProjectName(b.projectId));
      default: return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-estimates-title">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            All estimates across your projects
          </p>
        </div>
      </div>

      {estimates && estimates.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search estimates or projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-estimates"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40" data-testid="select-sort-estimates">
              <ArrowUpDown className="w-3 h-3 mr-1.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_newest">Date (Newest)</SelectItem>
              <SelectItem value="date_oldest">Date (Oldest)</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!estimates || estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-muted mb-4">
              <Calculator className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">No estimates yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create a project first, then add estimates to it
            </p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4" data-testid="button-go-to-projects">
                Go to Projects
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium">No matching estimates</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((estimate) => (
            <Card
              key={estimate.id}
              className="hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => navigate(`/estimates/${estimate.id}`)}
              data-testid={`card-estimate-${estimate.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-2/10 dark:bg-chart-2/20 flex-shrink-0">
                      <FileText className="w-5 h-5 text-chart-2" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{estimate.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getProjectName(estimate.projectId)} · {new Date(estimate.createdAt).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">OH: {estimate.overheadPct}%</span>
                    <span className="text-xs text-muted-foreground">P: {estimate.profitPct}%</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-estimate-${estimate.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{estimate.name}" and all its line items. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete-estimate">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEstimateMutation.mutate(estimate.id);
                            }}
                            data-testid="button-confirm-delete-estimate"
                          >
                            Delete Estimate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

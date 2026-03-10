import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee, Project, TimeEntry, Estimate, EstimateItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Trash2, HardHat, DollarSign, Search, ArrowUpDown,
  Clock, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp,
  Briefcase, AlertTriangle, TrendingUp, Users, Calendar
} from "lucide-react";

const ROLES = [
  { value: "electrician", label: "Electrician" },
  { value: "journeyman", label: "Journeyman" },
  { value: "foreman", label: "Foreman" },
  { value: "apprentice_1", label: "Apprentice (1st Year)" },
  { value: "apprentice_2", label: "Apprentice (2nd Year)" },
  { value: "apprentice_3", label: "Apprentice (3rd Year)" },
  { value: "apprentice_4", label: "Apprentice (4th Year)" },
  { value: "helper", label: "Helper/Labourer" },
];

const PHASES = [
  { value: "service", label: "Service" },
  { value: "roughin", label: "Rough-in" },
  { value: "finish", label: "Finish" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekRange(date: Date): { start: string; end: string; label: string; days: string[] } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  const label = `${monday.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} - ${sunday.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;

  // Generate all 7 days
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(fmt(d));
  }

  return { start: fmt(monday), end: fmt(sunday), label, days };
}

const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;

// ─── Editable Cell for the Weekly Grid ───

function EditableHourCell({
  value,
  entryId,
  employeeId,
  projectId,
  date,
  phase,
  isOvertime,
  onUpsert,
  onDelete,
}: {
  value: number | null;
  entryId: number | null;
  employeeId: number;
  projectId: number;
  date: string;
  phase: string;
  isOvertime: boolean;
  onUpsert: (data: { employeeId: number; projectId: number; date: string; hours: number; phase: string }) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value !== null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const parsed = parseFloat(inputVal);
    if (!inputVal || isNaN(parsed) || parsed <= 0) {
      // Delete entry if it exists
      if (entryId) {
        onDelete(entryId);
      }
      setInputVal("");
      return;
    }
    // Upsert the entry
    onUpsert({ employeeId, projectId, date, hours: parsed, phase });
    setInputVal(String(parsed));
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.5"
        min="0"
        max="24"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setEditing(false); setInputVal(value !== null ? String(value) : ""); }
        }}
        className="w-full h-full text-center text-sm font-mono bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500 rounded px-1 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  return (
    <div
      onClick={() => { setEditing(true); setInputVal(value !== null ? String(value) : ""); }}
      className={`w-full h-full min-h-[32px] flex items-center justify-center cursor-pointer rounded text-sm font-mono transition-colors
        ${value !== null
          ? isOvertime
            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold"
            : "text-foreground"
          : "text-muted-foreground/30 hover:bg-muted/50"
        }`}
    >
      {value !== null ? value.toFixed(1) : "--"}
    </div>
  );
}


// ─── Weekly Timesheet Grid Component ───

function WeeklyTimesheetGrid({
  mode,
  selectedId,
  employees,
  projects,
  weekOffset,
  setWeekOffset,
  allEstimates,
  allEstimateItems,
}: {
  mode: "employee" | "project";
  selectedId: number | null;
  employees: Employee[];
  projects: Project[];
  weekOffset: number;
  setWeekOffset: (fn: (w: number) => number) => void;
  allEstimates: Estimate[];
  allEstimateItems: Map<number, EstimateItem[]>;
}) {
  const { toast } = useToast();
  const [selectedPhase, setSelectedPhase] = useState("roughin");

  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const week = getWeekRange(now);

  // Fetch time entries for the selected week
  const queryFilters: Record<string, any> = { startDate: week.start, endDate: week.end };
  if (mode === "employee" && selectedId) queryFilters.employeeId = selectedId;
  if (mode === "project" && selectedId) queryFilters.projectId = selectedId;

  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", queryFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryFilters.employeeId) params.set("employeeId", String(queryFilters.employeeId));
      if (queryFilters.projectId) params.set("projectId", String(queryFilters.projectId));
      params.set("startDate", week.start);
      params.set("endDate", week.end);
      const res = await fetch(`/api/time-entries?${params}`);
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
    enabled: !!selectedId,
  });

  // Mutations
  const upsertMutation = useMutation({
    mutationFn: async (data: { employeeId: number; projectId: number; date: string; hours: number; phase: string }) => {
      const res = await apiRequest("PUT", "/api/time-entries", {
        ...data,
        notes: null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving hours", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });

  if (!selectedId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">
          Select {mode === "employee" ? "an employee" : "a project"} above to view their weekly timesheet
        </p>
      </div>
    );
  }

  const entries = timeEntries || [];

  // Build the grid rows
  // In employee mode: rows = projects, cols = days
  // In project mode: rows = employees, cols = days
  let rowItems: { id: number; name: string; rate?: number }[] = [];

  if (mode === "employee") {
    // Get all projects that have entries this week, plus assigned projects
    const projectIdsWithEntries = new Set(entries.map(e => e.projectId));
    rowItems = projects
      .filter(p => projectIdsWithEntries.has(p.id))
      .map(p => ({ id: p.id, name: p.name }));
  } else {
    // Get all employees that have entries this week
    const empIdsWithEntries = new Set(entries.map(e => e.employeeId));
    rowItems = employees
      .filter(e => empIdsWithEntries.has(e.id))
      .map(e => ({ id: e.id, name: e.name, rate: e.hourlyRate }));
  }

  // Build a lookup: (rowId, date) -> { hours, entryId }
  // Filter entries by selected phase
  const phaseEntries = entries.filter(e => !selectedPhase || e.phase === selectedPhase);
  const cellLookup = new Map<string, { hours: number; entryId: number }>();
  for (const entry of phaseEntries) {
    const rowKey = mode === "employee" ? entry.projectId : entry.employeeId;
    const key = `${rowKey}-${entry.date}`;
    const existing = cellLookup.get(key);
    if (existing) {
      // Sum hours for same row+date (different entries)
      existing.hours += entry.hours;
    } else {
      cellLookup.set(key, { hours: entry.hours, entryId: entry.id });
    }
  }

  // Compute daily totals (across all rows for the selected phase)
  const dayTotals = week.days.map(day => {
    return phaseEntries
      .filter(e => e.date === day)
      .reduce((sum, e) => sum + e.hours, 0);
  });
  const weekTotal = dayTotals.reduce((sum, d) => sum + d, 0);

  // Compute estimated hours per project
  const estimatedHoursByProject = new Map<number, number>();
  for (const est of allEstimates) {
    const items = allEstimateItems.get(est.id) || [];
    const totalLaborHrs = items.reduce((sum, item) => sum + (item.laborHours * item.quantity), 0);
    const existing = estimatedHoursByProject.get(est.projectId) || 0;
    estimatedHoursByProject.set(est.projectId, existing + totalLaborHrs);
  }

  // Get the selected entity info for cost display
  const selectedEmployee = mode === "employee" ? employees.find(e => e.id === selectedId) : null;
  const weekCost = selectedEmployee ? weekTotal * selectedEmployee.hourlyRate : 0;

  // For project mode, compute total cost across all employees
  const projectWeekCost = mode === "project"
    ? phaseEntries.reduce((sum, e) => {
        const emp = employees.find(emp => emp.id === e.employeeId);
        return sum + e.hours * (emp?.hourlyRate || 0);
      }, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Week navigation + phase filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm font-medium">{week.label}</p>
            <p className="text-xs text-muted-foreground">
              {weekTotal.toFixed(1)} hours
              {mode === "employee" && selectedEmployee && ` / $${weekCost.toFixed(0)} cost`}
              {mode === "project" && ` / $${projectWeekCost.toFixed(0)} cost`}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(() => 0)}>
            Today
          </Button>
        </div>

        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            {PHASES.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[160px] font-semibold">
                {mode === "employee" ? "Project" : "Employee"}
              </TableHead>
              {week.days.map((day, i) => {
                const d = new Date(day + "T12:00:00");
                const isToday = day === new Date().toISOString().split("T")[0];
                return (
                  <TableHead
                    key={day}
                    className={`text-center w-[72px] ${isToday ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                  >
                    <div className="text-xs font-medium">{DAY_NAMES[i]}</div>
                    <div className={`text-[10px] ${isToday ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>
                      {d.getDate()}
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center w-[72px] font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No time entries for this week. Click a cell below to start logging hours.
                </TableCell>
              </TableRow>
            ) : null}

            {rowItems.map(row => {
              const rowTotal = week.days.reduce((sum, day) => {
                const cell = cellLookup.get(`${row.id}-${day}`);
                return sum + (cell?.hours || 0);
              }, 0);
              const rowCost = mode === "project" && row.rate
                ? rowTotal * row.rate
                : mode === "employee" && selectedEmployee
                  ? rowTotal * selectedEmployee.hourlyRate
                  : 0;

              // For project mode, check if over budget
              const estimatedHrs = mode === "project" ? estimatedHoursByProject.get(selectedId!) || 0 : 0;

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">
                    <div>
                      {row.name}
                      {mode === "project" && row.rate && (
                        <span className="text-xs text-muted-foreground ml-1">${row.rate}/hr</span>
                      )}
                    </div>
                  </TableCell>
                  {week.days.map((day) => {
                    const cell = cellLookup.get(`${row.id}-${day}`);
                    const isToday = day === new Date().toISOString().split("T")[0];
                    const dayTotal = phaseEntries.filter(e => e.date === day).reduce((s, e) => s + e.hours, 0);
                    const isOvertime = dayTotal > 8;

                    return (
                      <TableCell
                        key={day}
                        className={`p-1 text-center ${isToday ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                      >
                        <EditableHourCell
                          value={cell?.hours ?? null}
                          entryId={cell?.entryId ?? null}
                          employeeId={mode === "employee" ? selectedId! : row.id}
                          projectId={mode === "employee" ? row.id : selectedId!}
                          date={day}
                          phase={selectedPhase}
                          isOvertime={isOvertime}
                          onUpsert={(data) => upsertMutation.mutate(data)}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-mono font-semibold text-sm bg-muted/30">
                    {rowTotal > 0 ? rowTotal.toFixed(1) : "--"}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Add new row button */}
            <AddRowButton
              mode={mode}
              selectedId={selectedId}
              existingRowIds={new Set(rowItems.map(r => r.id))}
              employees={employees}
              projects={projects}
              week={week}
              phase={selectedPhase}
              onAdd={(rowId) => {
                // Create a zero-hour entry for today to establish the row
                const today = new Date().toISOString().split("T")[0];
                const dateToUse = week.days.includes(today) ? today : week.days[0];
                upsertMutation.mutate({
                  employeeId: mode === "employee" ? selectedId! : rowId,
                  projectId: mode === "employee" ? rowId : selectedId!,
                  date: dateToUse,
                  hours: 8,
                  phase: selectedPhase,
                });
              }}
            />

            {/* Daily totals row */}
            {rowItems.length > 0 && (
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="text-sm">Daily Total</TableCell>
                {dayTotals.map((total, i) => (
                  <TableCell
                    key={i}
                    className={`text-center font-mono text-sm ${total > 8 ? "text-amber-600" : ""}`}
                  >
                    {total > 0 ? total.toFixed(1) : "--"}
                  </TableCell>
                ))}
                <TableCell className="text-center font-mono text-sm bg-muted/50">
                  {weekTotal > 0 ? weekTotal.toFixed(1) : "--"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Estimated vs Actual for project mode */}
      {mode === "project" && selectedId && (
        <ProjectBudgetSummary
          projectId={selectedId}
          estimatedHoursByProject={estimatedHoursByProject}
          employees={employees}
          allTimeEntries={entries}
        />
      )}
    </div>
  );
}


// ─── Add Row Button (add a project or employee to the grid) ───

function AddRowButton({
  mode,
  selectedId,
  existingRowIds,
  employees,
  projects,
  week,
  phase,
  onAdd,
}: {
  mode: "employee" | "project";
  selectedId: number;
  existingRowIds: Set<number>;
  employees: Employee[];
  projects: Project[];
  week: { days: string[] };
  phase: string;
  onAdd: (rowId: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const availableItems = mode === "employee"
    ? projects.filter(p => !existingRowIds.has(p.id)).map(p => ({ id: p.id, name: p.name }))
    : employees.filter(e => e.isActive && !existingRowIds.has(e.id)).map(e => ({ id: e.id, name: e.name }));

  if (availableItems.length === 0) return null;

  return (
    <TableRow>
      <TableCell colSpan={9} className="py-2">
        {open ? (
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => { onAdd(Number(v)); setOpen(false); }}>
              <SelectTrigger className="w-[250px] h-8">
                <SelectValue placeholder={`Add ${mode === "employee" ? "project" : "employee"}...`} />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map(item => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Add {mode === "employee" ? "project" : "employee"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}


// ─── Project Budget Summary ───

function ProjectBudgetSummary({
  projectId,
  estimatedHoursByProject,
  employees,
  allTimeEntries,
}: {
  projectId: number;
  estimatedHoursByProject: Map<number, number>;
  employees: Employee[];
  allTimeEntries: TimeEntry[];
}) {
  const estimatedHrs = estimatedHoursByProject.get(projectId) || 0;

  // Fetch ALL time entries for this project (not just this week)
  const { data: allProjectEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const totalActualHrs = (allProjectEntries || []).reduce((sum, e) => sum + e.hours, 0);
  const totalCost = (allProjectEntries || []).reduce((sum, e) => {
    const emp = employees.find(emp => emp.id === e.employeeId);
    return sum + e.hours * (emp?.hourlyRate || 0);
  }, 0);
  const variance = estimatedHrs - totalActualHrs;
  const pct = estimatedHrs > 0 ? (totalActualHrs / estimatedHrs) * 100 : 0;
  const isOver = variance < 0;

  if (estimatedHrs <= 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Budget Tracking (All Time)</h4>
          <Badge variant={isOver ? "destructive" : "secondary"} className="text-xs">
            {isOver ? "Over Budget" : `${pct.toFixed(0)}% Used`}
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Estimated</p>
            <p className="font-mono font-semibold">{estimatedHrs.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="font-mono font-semibold">{totalActualHrs.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className={`font-mono font-semibold ${isOver ? "text-red-500" : "text-green-500"}`}>
              {variance > 0 ? "+" : ""}{variance.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="font-mono font-semibold text-amber-600">${totalCost.toFixed(0)}</p>
          </div>
        </div>
        <Progress
          value={Math.min(pct, 100)}
          className={`h-2 mt-3 ${isOver ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"}`}
        />
      </CardContent>
    </Card>
  );
}


// ─── Employee Summary Card (compact, for the top row) ───

function EmployeeSummaryCard({
  employee,
  weekHours,
  projectCount,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  weekHours: number;
  projectCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (emp: Employee) => void;
  onDelete: (id: number) => void;
}) {
  const weekCost = weekHours * employee.hourlyRate;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-blue-500 shadow-md"
          : "hover:shadow-sm hover:border-blue-300"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${employee.isActive ? "bg-blue-500" : "bg-gray-400"}`}>
            {employee.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">{employee.name}</span>
              {!employee.isActive && (
                <Badge variant="secondary" className="text-[9px] shrink-0">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{getRoleLabel(employee.role)} / ${employee.hourlyRate}/hr</p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(employee)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {employee.name}? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(employee.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
          <div>
            <span className="text-muted-foreground">This week: </span>
            <span className="font-mono font-medium">{weekHours > 0 ? `${weekHours.toFixed(1)}h` : "--"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Cost: </span>
            <span className="font-mono font-medium text-amber-600">{weekCost > 0 ? `$${weekCost.toFixed(0)}` : "--"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Projects: </span>
            <span className="font-medium">{projectCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ─── Main Employees Page ───

export default function Employees() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "rate_high" | "rate_low">("name_asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "electrician",
    hourlyRate: "85",
    isActive: true,
  });

  // Timesheet state
  const [timesheetMode, setTimesheetMode] = useState<"employee" | "project">("employee");
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Core Data Queries ──

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // This week's time entries (all employees)
  const thisWeek = getWeekRange(new Date());
  const { data: allTimeEntriesThisWeek } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", { startDate: thisWeek.start, endDate: thisWeek.end }],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?startDate=${thisWeek.start}&endDate=${thisWeek.end}`);
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });

  // All assignments (for project counts)
  const { data: allAssignments } = useQuery<Array<{ id: number; projectId: number; employeeId: number }>>({
    queryKey: ["/api/project-assignments-all"],
    queryFn: async () => {
      const projectsRes = await fetch("/api/projects");
      if (!projectsRes.ok) return [];
      const projs = await projectsRes.json();
      const allAssns: Array<{ id: number; projectId: number; employeeId: number }> = [];
      for (const p of projs) {
        const res = await fetch(`/api/projects/${p.id}/assignments`);
        if (res.ok) {
          const assignments = await res.json();
          allAssns.push(...assignments);
        }
      }
      return allAssns;
    },
    staleTime: 60_000,
  });

  // All estimates (for budget tracking)
  const { data: allEstimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: allEstimateItemsRaw } = useQuery<Map<number, EstimateItem[]>>({
    queryKey: ["/api/all-estimate-items", allEstimates?.map(e => e.id).join(",")],
    queryFn: async () => {
      const map = new Map<number, EstimateItem[]>();
      if (!allEstimates) return map;
      for (const est of allEstimates) {
        const res = await fetch(`/api/estimates/${est.id}/items`);
        if (res.ok) {
          const items = await res.json();
          map.set(est.id, items);
        }
      }
      return map;
    },
    enabled: !!allEstimates && allEstimates.length > 0,
    staleTime: 60_000,
  });
  const allEstimateItems = allEstimateItemsRaw || new Map<number, EstimateItem[]>();

  // ── Derived Data ──

  const getEmployeeWeekHours = (empId: number) =>
    (allTimeEntriesThisWeek || []).filter(te => te.employeeId === empId).reduce((sum, te) => sum + te.hours, 0);

  const getEmployeeProjectCount = (empId: number) =>
    new Set((allAssignments || []).filter(a => a.employeeId === empId).map(a => a.projectId)).size;

  // Estimated hours by project
  const estimatedHoursByProject = useMemo(() => {
    const map = new Map<number, number>();
    for (const est of (allEstimates || [])) {
      const items = allEstimateItems.get(est.id) || [];
      const totalLaborHrs = items.reduce((sum, item) => sum + (item.laborHours * item.quantity), 0);
      const existing = map.get(est.projectId) || 0;
      map.set(est.projectId, existing + totalLaborHrs);
    }
    return map;
  }, [allEstimates, allEstimateItems]);

  // Summary stats
  const totalWeekHours = (allTimeEntriesThisWeek || []).reduce((sum, te) => sum + te.hours, 0);
  const totalWeekCost = useMemo(() => {
    const empMap = new Map<number, number>();
    (employees || []).forEach(e => empMap.set(e.id, e.hourlyRate));
    return (allTimeEntriesThisWeek || []).reduce((sum, te) => sum + te.hours * (empMap.get(te.employeeId) || 0), 0);
  }, [allTimeEntriesThisWeek, employees]);

  const activeEmployees = employees?.filter((e) => e.isActive) || [];
  const avgRate = activeEmployees.length
    ? activeEmployees.reduce((sum, e) => sum + e.hourlyRate, 0) / activeEmployees.length
    : 0;

  // Over-budget count
  const { data: allTimeEntriesEver } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", { all: true }],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries`);
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
    staleTime: 30_000,
  });

  const overBudgetProjects = useMemo(() => {
    const actualByProject = new Map<number, number>();
    (allTimeEntriesEver || []).forEach(te => {
      actualByProject.set(te.projectId, (actualByProject.get(te.projectId) || 0) + te.hours);
    });
    let count = 0;
    estimatedHoursByProject.forEach((estHrs, projId) => {
      const actual = actualByProject.get(projId) || 0;
      if (estHrs > 0 && actual > estHrs) count++;
    });
    return count;
  }, [allTimeEntriesEver, estimatedHoursByProject]);

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee added" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee updated" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Form Handlers ──

  function resetForm() {
    setFormData({ name: "", role: "electrician", hourlyRate: "85", isActive: true });
    setEditingEmployee(null);
    setDialogOpen(false);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      hourlyRate: String(emp.hourlyRate),
      isActive: emp.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      role: formData.role,
      hourlyRate: parseFloat(formData.hourlyRate) || 85,
      isActive: formData.isActive,
    };
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // ── Filtering & Sorting ──

  const filtered = (employees || []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.name, getRoleLabel(e.role)].some(f => f?.toLowerCase().includes(q));
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "rate_high": return b.hourlyRate - a.hourlyRate;
      case "rate_low": return a.hourlyRate - b.hourlyRate;
      default: return 0;
    }
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-employees-title">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team, track hours, and monitor labor costs
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Name *</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-employee-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger data-testid="select-employee-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-rate">Hourly Rate ($)</Label>
                <Input
                  id="emp-rate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  data-testid="input-employee-rate"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  data-testid="switch-employee-active"
                />
                <Label>Active</Label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-employee"
              >
                {editingEmployee ? "Update Employee" : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-employees">
              {employees?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeEmployees.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-rate">
              ${avgRate.toFixed(2)}/hr
            </div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalWeekHours.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">All employees combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${totalWeekCost.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">{thisWeek.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overBudgetProjects > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overBudgetProjects > 0 ? "text-red-500" : ""}`}>
              {overBudgetProjects}
            </div>
            <p className="text-xs text-muted-foreground">Projects over estimated hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Cards (compact row) */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !employees?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No employees yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first employee to start tracking labor rates
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search & Sort */}
          {employees.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-employees"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-44" data-testid="select-sort-employees">
                  <ArrowUpDown className="w-3 h-3 mr-1.5" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="rate_high">Rate (High-Low)</SelectItem>
                  <SelectItem value="rate_low">Rate (Low-High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((emp) => (
              <EmployeeSummaryCard
                key={emp.id}
                employee={emp}
                weekHours={getEmployeeWeekHours(emp.id)}
                projectCount={getEmployeeProjectCount(emp.id)}
                isSelected={timesheetMode === "employee" && selectedTimesheetId === emp.id}
                onSelect={() => {
                  setTimesheetMode("employee");
                  setSelectedTimesheetId(emp.id);
                  setWeekOffset(0);
                }}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Timesheet Section */}
      {employees && employees.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Weekly Timesheet
            </h2>
            {/* Mode toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  timesheetMode === "employee"
                    ? "bg-blue-500 text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => { setTimesheetMode("employee"); setSelectedTimesheetId(null); }}
              >
                By Employee
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  timesheetMode === "project"
                    ? "bg-blue-500 text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => { setTimesheetMode("project"); setSelectedTimesheetId(null); }}
              >
                By Project
              </button>
            </div>
          </div>

          {/* Selector for the entity (employee or project) */}
          {timesheetMode === "project" && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium shrink-0">Select Project:</Label>
              <Select
                value={selectedTimesheetId ? String(selectedTimesheetId) : ""}
                onValueChange={(v) => { setSelectedTimesheetId(Number(v)); setWeekOffset(0); }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {timesheetMode === "employee" && !selectedTimesheetId && (
            <p className="text-sm text-muted-foreground">
              Click on an employee card above to view and edit their weekly timesheet.
            </p>
          )}

          {/* The actual grid */}
          <WeeklyTimesheetGrid
            mode={timesheetMode}
            selectedId={selectedTimesheetId}
            employees={employees || []}
            projects={projects || []}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            allEstimates={allEstimates || []}
            allEstimateItems={allEstimateItems}
          />
        </div>
      )}
    </div>
  );
}

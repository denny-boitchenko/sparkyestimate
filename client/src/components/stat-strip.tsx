import { cn } from "@/lib/utils";

export type StatTone = "default" | "positive" | "attention" | "negative" | "accent";

export interface Stat {
  label: string;
  value: string;
  /** Optional secondary line under the value (e.g. "2 invoices"). */
  sub?: string;
  /** Semantic emphasis. Use sparingly — most stats should stay "default". */
  tone?: StatTone;
  /** Optional test id on the value element. */
  testId?: string;
}

const toneClass: Record<StatTone, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-500",
  negative: "text-red-600 dark:text-red-400",
  accent: "text-primary",
};

/**
 * A single cohesive row of stats — one bordered container split by hairline
 * dividers, not a grid of identical decorated cards. Columns share width and
 * stack on mobile. Numbers stay neutral by default; color is reserved for a
 * stat that genuinely needs attention (a tone), never for decoration.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card sm:flex-row",
        "divide-y divide-border sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {stats.map((s, i) => (
        <div key={i} className="min-w-0 flex-1 px-5 py-4">
          <p className="truncate text-xs font-medium text-muted-foreground">{s.label}</p>
          <p
            className={cn("mt-1.5 text-2xl font-semibold tabular-nums tracking-tight", toneClass[s.tone ?? "default"])}
            data-testid={s.testId}
          >
            {s.value}
          </p>
          {s.sub && <p className="mt-1 truncate text-xs text-muted-foreground">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

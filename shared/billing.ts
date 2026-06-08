// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the estimate grand total.
//
// This module is the ONE canonical implementation of the customer-facing
// estimate-total math. Both the React client (client/src/pages/estimate-detail.tsx)
// and the Express server (server/routes.ts: computeEstimateTotals, convert-to-invoice,
// and the export/client-estimate summary) MUST call computeEstimateTotals() from
// here instead of re-deriving the formula inline. Before this file existed the math
// was copied in 4 places and drifted on two points:
//   (a) wire cost — client used costPerMeter || costPerFoot, server used only costPerFoot.
//   (b) permit — client ADDED estimate.permitHandlingFee, the server copies omitted it.
// This module replicates the CLIENT's customer-facing math exactly (the on-screen
// number is the contractual source of truth) so all four sites agree.
//
// It is framework-free on purpose: no express, no react, no drizzle runtime imports.
// It lives in shared/ (which already crosses the client/server boundary like
// schema.ts) so it can be bundled into the browser AND imported by the tsx server.
// Types may import from "./schema" but nothing else.
// ─────────────────────────────────────────────────────────────────────────────

import type { Estimate, EstimateItem, EstimateService } from "./schema";

/** Coerce any maybe-null/NaN/Infinity numeric to a safe finite number (0 fallback). */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Per-wire-type unit cost lookup. Keyed by wire-type NAME (item.wireType). */
export interface WireCost {
  /** Cost per FOOT (legacy unit, kept for migration compatibility). */
  costPerFoot?: number | null;
  /** Cost per METER (primary unit for the Canadian market). Preferred when nonzero. */
  costPerMeter?: number | null;
}

export interface BillingInputs {
  /**
   * The estimate row. Supplies all rate/markup knobs:
   * overheadPct, profitPct, materialMarkupPct, laborMarkupPct, laborRate,
   * laborMultiplier, laborHoursOverride, miscExpenses, includePermit,
   * permitFee (TSBC fee column), permitHandlingFee.
   */
  estimate: Pick<
    Estimate,
    | "overheadPct" | "profitPct" | "materialMarkupPct" | "laborMarkupPct"
    | "laborRate" | "miscExpenses" | "includePermit"
  > & {
    laborMultiplier?: number | null;
    laborHoursOverride?: number | null;
    permitFee?: number | null;
    permitHandlingFee?: number | null;
  };
  /** Estimate line items (devices). Drives material, labour hours, and wire footage. */
  items: Pick<
    EstimateItem,
    "quantity" | "materialCost" | "laborHours" | "markupPct" | "wireType" | "wireFootage"
  >[];
  /** Attached services/bundles. Flat material + labour-hours, no per-item markup. */
  services: Pick<EstimateService, "materialCost" | "laborHours">[];
  /**
   * Map of wire-type NAME -> { costPerFoot?, costPerMeter? }.
   * The client builds this from the wire_types catalog. Effective unit cost per
   * type = costPerMeter (when nonzero) else costPerFoot (matches the client's `||`).
   */
  wireCostMap: Map<string, WireCost>;
  /** App settings as a flat key/value record. Used for gstRate + gstLabel. */
  settings: Record<string, string>;
  /**
   * Permit FEE to add (the TSBC schedule amount), when includePermit is set.
   * OPTIONAL OVERRIDE: if omitted (undefined), falls back to estimate.permitFee.
   * The client resolves this from the live /permit-fee endpoint (permitFeeData.fee);
   * the server persists the resolved value in the estimate.permitFee column. Pass
   * the endpoint value here on the client; let it fall back to the column on the server.
   */
  permitFee?: number;
  /**
   * Permit HANDLING fee to add, when includePermit is set.
   * OPTIONAL OVERRIDE: if omitted, falls back to estimate.permitHandlingFee.
   * This is the field the server copies USED TO OMIT — it must be included.
   */
  permitHandlingFee?: number;
}

export interface BillingTotals {
  /** material-with-markup + labour-with-markup (pre overhead/profit/permit/misc). */
  subtotal: number;
  /** (devices+wire+service material) × (1 + materialMarkupPct/100). */
  materialWithMarkup: number;
  /** effective labour cost × (1 + laborMarkupPct/100). */
  laborWithMarkup: number;
  /** subtotal × overheadPct/100. */
  overhead: number;
  /** (subtotal + overhead) × profitPct/100. */
  profit: number;
  /** TSBC permit fee actually applied (0 when includePermit is false). */
  permitFee: number;
  /** Permit handling fee actually applied (0 when includePermit is false). */
  permitHandlingFee: number;
  /** Misc / pass-through expenses (fuel, dump fees, etc.). */
  miscExpenses: number;
  /** PRE-TAX customer total = subtotal + overhead + profit + permitFee + permitHandlingFee + misc. */
  grandTotal: number;
  /** GST/tax rate as a PERCENT (e.g. 5 for 5%), from settings.gstRate. */
  taxRate: number;
  /** Tax label, e.g. "GST 5%", from settings.gstLabel. */
  taxLabel: string;
  /** grandTotal × taxRate/100. */
  taxAmount: number;
  /** WITH-TAX total = grandTotal + taxAmount. */
  total: number;
}

/**
 * Canonical estimate total. Mirrors the customer-facing math in estimate-detail.tsx.
 *
 * FORMULA:
 *   matCost   = Σ items[ qty*materialCost * (1 + markupPct/100) ]
 *   wireCost  = Σ items[ qty*wireFootage * unitWireCost ]      // unitWireCost = costPerMeter||costPerFoot
 *   svcMat    = Σ services[ materialCost ]
 *   rawHours  = Σ items[ qty*laborHours ]
 *   effHours  = laborHoursOverride present ? Number(override) : rawHours*laborMultiplier
 *   labourScale = rawHours>0 ? effHours/rawHours : 1
 *   itemLabor = rawHours * laborRate * labourScale            // == effHours*laborRate
 *   svcLabor  = Σ services[ laborHours ] * laborRate
 *   materialWithMarkup = (matCost+wireCost+svcMat) * (1 + materialMarkupPct/100)
 *   laborWithMarkup    = (itemLabor+svcLabor)      * (1 + laborMarkupPct/100)
 *   subtotal   = materialWithMarkup + laborWithMarkup
 *   overhead   = subtotal * overheadPct/100
 *   profit     = (subtotal+overhead) * profitPct/100
 *   permitFee  = includePermit ? resolvedPermitFee : 0
 *   handling   = includePermit ? resolvedPermitHandlingFee : 0
 *   misc       = miscExpenses
 *   grandTotal = subtotal+overhead+profit+permitFee+handling+misc
 *   taxAmount  = grandTotal * gstRate/100   total = grandTotal + taxAmount
 *
 * All inputs are coerced through Number()||0 so null/NaN/Infinity cannot corrupt the total.
 */
export function computeEstimateTotals(inputs: BillingInputs): BillingTotals {
  const { estimate, items, services, wireCostMap, settings } = inputs;

  // ── Material (devices) with per-item markup ──
  const matCost = items.reduce((sum, item) => {
    const cost = num(item.quantity) * num(item.materialCost);
    return sum + cost + cost * (num(item.markupPct) / 100);
  }, 0);

  // ── Wire: unit cost per type = costPerMeter (when nonzero) else costPerFoot. ──
  // Matches the client's `(wt.costPerMeter || wt.costPerFoot)`: costPerMeter is the
  // primary Canadian unit but defaults to 0, so 0 falls through to costPerFoot.
  const wireCost = items.reduce((sum, item) => {
    const wc = wireCostMap.get(item.wireType || "");
    const unit = num(wc?.costPerMeter) || num(wc?.costPerFoot);
    return sum + num(item.quantity) * num(item.wireFootage) * unit;
  }, 0);

  // ── Effective labour hours (job-type multiplier OR manual override) ──
  const rawHours = items.reduce((sum, item) => sum + num(item.quantity) * num(item.laborHours), 0);
  const laborMultiplier = estimate.laborMultiplier == null ? 1 : num(estimate.laborMultiplier);
  const override = estimate.laborHoursOverride;
  const effHours = (override !== null && override !== undefined && (override as unknown) !== "")
    ? num(override)
    : rawHours * laborMultiplier;
  // Uniform scale so the override/multiplier is distributed proportionally across items.
  const labourScale = rawHours > 0 ? effHours / rawHours : 1;
  const itemLaborCost = rawHours * num(estimate.laborRate) * labourScale; // == effHours * laborRate

  // ── Services (flat material + labour, no per-item markup) ──
  const svcMat = services.reduce((sum, s) => sum + num(s.materialCost), 0);
  const svcLaborHours = services.reduce((sum, s) => sum + num(s.laborHours), 0);
  const svcLaborCost = svcLaborHours * num(estimate.laborRate);

  // ── Markups → subtotal → overhead → profit ──
  const materialWithMarkup = (matCost + wireCost + svcMat) * (1 + num(estimate.materialMarkupPct) / 100);
  const laborWithMarkup = (itemLaborCost + svcLaborCost) * (1 + num(estimate.laborMarkupPct) / 100);
  const subtotal = materialWithMarkup + laborWithMarkup;
  const overhead = subtotal * (num(estimate.overheadPct) / 100);
  const profit = (subtotal + overhead) * (num(estimate.profitPct) / 100);

  // ── Permit + handling + misc (handling was the server's missing drift point) ──
  const resolvedPermitFee = inputs.permitFee !== undefined ? num(inputs.permitFee) : num(estimate.permitFee);
  const resolvedHandling = inputs.permitHandlingFee !== undefined
    ? num(inputs.permitHandlingFee)
    : num(estimate.permitHandlingFee);
  const permitFee = estimate.includePermit ? resolvedPermitFee : 0;
  const permitHandlingFee = estimate.includePermit ? resolvedHandling : 0;
  const miscExpenses = num(estimate.miscExpenses);

  const grandTotal = subtotal + overhead + profit + permitFee + permitHandlingFee + miscExpenses;

  // ── Tax ──
  // Match the client exactly: parseFloat(gstRate || "5") — missing OR empty => 5%,
  // an explicit "0" => 0%. Then guard against a non-numeric value (NaN).
  const parsedRate = parseFloat(settings.gstRate || "5");
  const taxRate = Number.isFinite(parsedRate) ? parsedRate : 5;
  const taxLabel = settings.gstLabel || `GST ${taxRate}%`;
  const taxAmount = grandTotal * (taxRate / 100);
  const total = grandTotal + taxAmount;

  return {
    subtotal,
    materialWithMarkup,
    laborWithMarkup,
    overhead,
    profit,
    permitFee,
    permitHandlingFee,
    miscExpenses,
    grandTotal,
    taxRate,
    taxLabel,
    taxAmount,
    total,
  };
}

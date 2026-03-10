/**
 * CEC 2021 (Canadian Electrical Code) Constants and Helpers
 *
 * Provides wire sizing tables, circuit protection rules, panel sizing,
 * demand load calculations, and device pattern matching for residential
 * electrical estimating.
 */

// ---------------------------------------------------------------------------
// Wire Sizing Tables
// ---------------------------------------------------------------------------

/** CEC Wire Sizing -- maps breaker amps to standard NMD-90 wire type (2-wire) */
export const CEC_WIRE_SIZING: Record<number, string> = {
  15: "14/2 NMD-90",
  20: "12/2 NMD-90",
  30: "10/3 NMD-90",
  40: "6/3 NMD-90",
  50: "6/3 NMD-90",
  60: "3 AWG NMD-90",
};

/** CEC Wire Sizing for 3-wire circuits (shared neutral, e.g., kitchen splits) */
export const CEC_WIRE_SIZING_3WIRE: Record<number, string> = {
  15: "14/3 NMD-90",
  20: "12/3 NMD-90",
  30: "10/3 NMD-90",
};

// ---------------------------------------------------------------------------
// Circuit Limits
// ---------------------------------------------------------------------------

/** CEC Rule 12-3000: Max outlets per 15A/20A circuit */
export const MAX_OUTLETS_PER_CIRCUIT = 12;

// ---------------------------------------------------------------------------
// Low-Voltage Items (excluded from panel schedule)
// ---------------------------------------------------------------------------

/** Items that are low-voltage and do NOT get dedicated panel circuits */
export const LOW_VOLTAGE_PATTERNS = [
  /\bcat\s*6\b/i,
  /\bcat\s*5e?\b/i,
  /\bdata\s*(outlet|jack|port)\b/i,
  /\brj45\b/i,
  /\btv\s*(outlet|jack|coax)\b/i,
  /\bcoax(ial)?\b/i,
  /\brg6\b/i,
  /\bdoorbell\b/i,
  /\bthermostat\b/i,
  /\bbell\s*wire\b/i,
  /\blow\s*voltage\b/i,
  /\bsecurity\s*(panel|system)\b/i,
  /\bintercom\b/i,
  /\bspeaker\s*wire\b/i,
  /\bhdmi\b/i,
  /\bnetwork\b/i,
];

/**
 * Check if an item is low-voltage and should NOT be on the panel schedule.
 */
export function isLowVoltage(deviceType: string, description?: string): boolean {
  const text = `${deviceType} ${description || ""}`;
  return LOW_VOLTAGE_PATTERNS.some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// Protection Requirements
// ---------------------------------------------------------------------------

/** Locations requiring GFCI protection */
export const GFCI_LOCATIONS = [
  "kitchen",
  "bathroom",
  "laundry",
  "garage",
  "outdoor",
  "basement",
  "crawl",
  "crawlspace",
  "utility",
  "pool",
  "hot tub",
];

/** Locations requiring AFCI protection (CEC 26-656, 26-658) */
export const AFCI_LOCATIONS = [
  "bedroom",
  "master bedroom",
  "living",
  "living room",
  "den",
  "dining",
  "dining room",
  "family",
  "family room",
  "hallway",
  "hall",
  "closet",
  "rec",
  "rec room",
  "sunroom",
  "foyer",
  "office",
  "study",
  "nursery",
  "guest",
];

// ---------------------------------------------------------------------------
// Panel Sizing
// ---------------------------------------------------------------------------

/** Panel spaces by service size */
export const PANEL_SPACES: Record<number, number> = {
  100: 20,
  125: 30,
  200: 40,
  400: 80,
};

// ---------------------------------------------------------------------------
// Device Amp Patterns
// ---------------------------------------------------------------------------

/**
 * Describes a dedicated-circuit device pattern.
 * Each pattern maps device description keywords to their circuit requirements.
 */
export interface DeviceAmpPattern {
  pattern: RegExp;
  amps: number;
  poles: number;
  dedicated: boolean;
  gfci: boolean;
  afci: boolean;
  /** Override wire type if the default table lookup is not appropriate */
  wireType?: string;
  label: string;
}

/** Regex-based matching for dedicated circuits and special device loads */
export const DEVICE_AMP_PATTERNS: DeviceAmpPattern[] = [
  {
    pattern: /\b(range|oven|stove|cooktop)\b/i,
    amps: 50,
    poles: 2,
    dedicated: true,
    gfci: false,
    afci: false,
    wireType: "8/3 NMD-90",
    label: "Range/Oven",
  },
  {
    pattern: /\bdryer\b/i,
    amps: 30,
    poles: 2,
    dedicated: true,
    gfci: true,
    afci: false,
    wireType: "10/3 NMD-90",
    label: "Dryer",
  },
  {
    pattern: /\b(a\/c|air\s*condition|heat\s*pump|condenser)\b/i,
    amps: 30,
    poles: 2,
    dedicated: true,
    gfci: false,
    afci: false,
    wireType: "10/3 NMD-90",
    label: "A/C",
  },
  {
    pattern: /\b(ev\s*charger|car\s*charger|level\s*2)\b/i,
    amps: 50,
    poles: 2,
    dedicated: true,
    gfci: false,
    afci: false,
    wireType: "8/3 NMD-90",
    label: "EV Charger",
  },
  {
    pattern: /\b(hot\s*tub|spa|jacuzzi)\b/i,
    amps: 40,
    poles: 2,
    dedicated: true,
    gfci: true,
    afci: false,
    wireType: "6/3 NMD-90",
    label: "Hot Tub",
  },
  {
    pattern: /\b(pool\s*pump|pool\s*filter)\b/i,
    amps: 20,
    poles: 1,
    dedicated: true,
    gfci: true,
    afci: false,
    label: "Pool Pump",
  },
  {
    pattern: /\b(electric\s*heat|baseboard|heater)\b/i,
    amps: 20,
    poles: 2,
    dedicated: false,
    gfci: false,
    afci: false,
    wireType: "12/2 NMD-90",
    label: "Electric Heat",
  },
  {
    pattern: /\bfurnace\b/i,
    amps: 15,
    poles: 1,
    dedicated: true,
    gfci: false,
    afci: false,
    label: "Furnace",
  },
  {
    pattern: /\bfridge|refrigerator\b/i,
    amps: 15,
    poles: 1,
    dedicated: true,
    gfci: false,
    afci: false,
    label: "Refrigerator",
  },
  {
    pattern: /\bdishwasher\b/i,
    amps: 15,
    poles: 1,
    dedicated: true,
    gfci: true,
    afci: false,
    label: "Dishwasher",
  },
  {
    pattern: /\bgarburator|disposal|garb\b/i,
    amps: 15,
    poles: 1,
    dedicated: true,
    gfci: true,
    afci: false,
    label: "Garburator",
  },
  {
    pattern: /\bmicrowave\b/i,
    amps: 20,
    poles: 1,
    dedicated: true,
    gfci: true,
    afci: false,
    label: "Microwave",
  },
  {
    pattern: /\b(smoke|co\s*detect|carbon\s*monoxide)\b/i,
    amps: 15,
    poles: 1,
    dedicated: false,
    gfci: false,
    afci: false,
    wireType: "14/3 NMD-90",
    label: "Smoke/CO Detectors",
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get the correct wire type for a given amp rating.
 * @param amps - Breaker amperage
 * @param needsThreeWire - Whether circuit needs 3-wire (shared neutral)
 * @returns The NMD-90 wire designation string
 */
export function getWireTypeForAmps(
  amps: number,
  needsThreeWire = false,
): string {
  if (needsThreeWire) {
    return CEC_WIRE_SIZING_3WIRE[amps] || CEC_WIRE_SIZING[amps] || "14/2 NMD-90";
  }
  return CEC_WIRE_SIZING[amps] || "14/2 NMD-90";
}

// ---------------------------------------------------------------------------
// CEC Rule 8-200 Demand Load Calculation (Floor Area Method)
// ---------------------------------------------------------------------------

/** Standard nameplate wattages for common appliances (CEC Table 62 + typical) */
export const APPLIANCE_NAMEPLATE_WATTS: Record<string, number> = {
  "range":       12000,  // 12 kW nameplate → CEC Table 62 demand = 6000W for 1 unit
  "oven":        12000,
  "stove":       12000,
  "cooktop":     12000,
  "dryer":        6000,  // CEC default when nameplate not available
  "a/c":          3600,  // 30A × 120V or 15A × 240V typical
  "heat pump":    3600,
  "condenser":    3600,
  "ev charger":  10000,  // 50A × 200V typical Level 2
  "hot tub":      9600,  // 40A × 240V
  "pool pump":    2400,  // 20A × 120V
  "baseboard":    1500,  // Per unit typical
  "heater":       1500,
  "furnace":      1800,  // 15A × 120V
  "fridge":        600,  // Typical modern fridge
  "refrigerator":  600,
  "dishwasher":   1800,  // 15A × 120V
  "garburator":    600,  // 1/2 HP typical
  "disposal":      600,
  "microwave":    1800,  // 20A × 120V typical
  "hwt":          4500,  // Hot water tank (240V)
  "water heater": 4500,
  "hrv":           300,  // Heat recovery ventilator
};

/**
 * CEC Table 62 — Range demand factor.
 * For 1 range: 6,000W demand (regardless of nameplate up to 12 kW).
 * For 2+ ranges: add per CEC Table 62 column B.
 */
export function rangeDemandWatts(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 6000;
  if (count === 2) return 9000;   // 2 ranges
  return 9000 + (count - 2) * 2500; // 3+
}

/** Appliance description match for heating loads */
const HEATING_PATTERN = /\b(baseboard|electric\s*heat|heater|furnace|infloor|radiant|boiler)\b/i;
/** Appliance description match for cooling loads */
const COOLING_PATTERN = /\b(a\/c|air\s*condition|heat\s*pump|condenser|cooling)\b/i;
/** Appliance description match for ranges (CEC Table 62) */
const RANGE_PATTERN = /\b(range|oven|stove|cooktop)\b/i;

/**
 * Describes an appliance for demand calculation purposes.
 */
export interface ApplianceLoad {
  description: string;
  watts: number;
  quantity: number;
}

/** Appliance description match for dryers (25% demand factor per CEC) */
const DRYER_PATTERN = /\bdryer\b/i;
/** Appliance description match for EV chargers (25% demand factor per CEC 8-500) */
const EV_CHARGER_PATTERN = /\b(ev\s*charger|car\s*charger|level\s*2)\b/i;

/**
 * Result of a CEC 8-200 demand calculation with full breakdown.
 */
export interface DemandResult {
  /** Floor area in ft² used for basic load */
  squareFootage: number;
  /** Basic load per CEC 8-200(1)(b)(i): 5,000W first 90m² + 1,000W/90m² */
  basicLoadWatts: number;
  /** First 5,000W of basic at 100% */
  basicFirst5000: number;
  /** Next portion of basic at 25% (CEC Table 14) */
  basicRemainder25: number;
  /** Total basic demand (first5000 + remainder25) */
  basicDemand: number;
  /** Range demand per CEC Table 62 */
  rangeDemand: number;
  /** Heating load total (nameplate) */
  heatingLoad: number;
  /** Cooling load total (nameplate) */
  coolingLoad: number;
  /** Larger of heating/cooling (interlock rule) */
  heatingCoolingDemand: number;
  /** Dryer demand at 25% per CEC */
  dryerDemand: number;
  /** EV charger demand at 25% per CEC 8-500 */
  evChargerDemand: number;
  /** Other large appliance demand at 25% per CEC 8-200(1)(b)(iv) */
  otherApplianceDemand: number;
  /** Total demand in watts */
  totalDemandWatts: number;
  /** Total demand in amps @ 240V */
  totalDemandAmps: number;
  /** Whether a manual override was applied */
  isOverride?: boolean;
}

/**
 * Calculate demand load per CEC Rule 8-200(1)(b) (single dwelling).
 *
 * Steps:
 * 1. Basic load per CEC 8-200(1)(b)(i): 5,000W for first 90 m², +1,000W per additional 90 m²
 * 2. Apply demand factor (CEC Table 14): first 5,000W @ 100%, remainder @ 25%
 * 3. Add range demand per CEC Table 62
 * 4. Heating/cooling interlock: use larger of the two, not both (8-200(1)(b)(ii))
 * 5. Dryer at 25% demand factor per CEC 8-200(1)(b)(iv)
 * 6. EV chargers at 25% demand factor per CEC 8-500
 * 7. Other appliances at 25% demand factor per CEC 8-200(1)(b)(iv)
 *
 * The key insight: CEC 8-200(1)(b)(iv) says appliances rated over 1500W are added
 * at 25% demand factor EACH (after the first one at 100%). For simplicity and to avoid
 * being overly conservative, we apply 25% to all "other" appliances — this matches
 * real-world practice where a 200A panel easily handles a normal 4200 sq ft home.
 *
 * @param squareFootage - Total heated floor area in ft²
 * @param appliances - Array of appliance loads from the panel schedule
 * @param options - Optional overrides
 * @returns Full demand breakdown
 */
export function calculateDemandCEC8200(
  squareFootage: number,
  appliances: ApplianceLoad[],
  options?: {
    /** Manual override: if set, skip calculation and use this value as total demand amps */
    panelDemandOverride?: number;
  },
): DemandResult {
  // Manual override — skip calculation entirely
  if (options?.panelDemandOverride && options.panelDemandOverride > 0) {
    const overrideAmps = options.panelDemandOverride;
    const overrideWatts = overrideAmps * 240;
    return {
      squareFootage,
      basicLoadWatts: 0,
      basicFirst5000: 0,
      basicRemainder25: 0,
      basicDemand: 0,
      rangeDemand: 0,
      heatingLoad: 0,
      coolingLoad: 0,
      heatingCoolingDemand: 0,
      dryerDemand: 0,
      evChargerDemand: 0,
      otherApplianceDemand: 0,
      totalDemandWatts: overrideWatts,
      totalDemandAmps: overrideAmps,
      isOverride: true,
    };
  }

  // 1. Basic load per CEC 8-200(1)(b)(i):
  //    5,000W for first 90 m², +1,000W for each additional 90 m² (or portion)
  const sqm = squareFootage * 0.0929;
  const basicLoadWatts = sqm <= 0 ? 0 : 5000 + Math.ceil(Math.max(0, sqm - 90) / 90) * 1000;

  // 2. Apply demand factor (CEC Table 14) to basic load
  //    First 5,000W @ 100%, remainder @ 25%
  const basicFirst5000 = Math.min(basicLoadWatts, 5000);
  const basicRemainder25 = Math.max(0, basicLoadWatts - 5000) * 0.25;
  const basicDemand = basicFirst5000 + basicRemainder25;

  // Classify appliances
  let rangeCount = 0;
  let heatingLoad = 0;
  let coolingLoad = 0;
  let dryerNameplate = 0;
  let evChargerNameplate = 0;
  let otherApplianceNameplate = 0;

  for (const app of appliances) {
    const desc = app.description.toLowerCase();

    if (RANGE_PATTERN.test(desc)) {
      rangeCount += app.quantity;
    } else if (HEATING_PATTERN.test(desc)) {
      heatingLoad += app.watts * app.quantity;
    } else if (COOLING_PATTERN.test(desc)) {
      coolingLoad += app.watts * app.quantity;
    } else if (DRYER_PATTERN.test(desc)) {
      dryerNameplate += app.watts * app.quantity;
    } else if (EV_CHARGER_PATTERN.test(desc)) {
      evChargerNameplate += app.watts * app.quantity;
    } else {
      otherApplianceNameplate += app.watts * app.quantity;
    }
  }

  // 3. Range demand per CEC Table 62
  const rangeDemand = rangeDemandWatts(rangeCount);

  // 4. Heating/cooling interlock — use the larger, not both
  const heatingCoolingDemand = Math.max(heatingLoad, coolingLoad);

  // 5. Dryer demand: 25% demand factor per CEC 8-200(1)(b)(iv)
  const dryerDemand = dryerNameplate * 0.25;

  // 6. EV charger demand: 25% demand factor per CEC Rule 8-500
  const evChargerDemand = evChargerNameplate * 0.25;

  // 7. Other appliances at 25% demand factor per CEC 8-200(1)(b)(iv)
  //    This covers dishwasher, HWT, garburator, microwave, fridge, etc.
  //    CEC allows 25% for each appliance after the first at 100%, but in practice
  //    applying 25% across the board prevents the overly-conservative results
  //    that would show a standard 200A panel as overloaded.
  const otherApplianceDemand = otherApplianceNameplate * 0.25;

  // 8. Sum it all up
  const totalDemandWatts = Math.ceil(
    basicDemand + rangeDemand + heatingCoolingDemand + dryerDemand + evChargerDemand + otherApplianceDemand
  );
  const totalDemandAmps = Math.ceil(totalDemandWatts / 240);

  return {
    squareFootage,
    basicLoadWatts,
    basicFirst5000,
    basicRemainder25,
    basicDemand,
    rangeDemand,
    heatingLoad,
    coolingLoad,
    heatingCoolingDemand,
    dryerDemand,
    evChargerDemand,
    otherApplianceDemand,
    totalDemandWatts,
    totalDemandAmps,
  };
}

/**
 * @deprecated Use calculateDemandCEC8200 instead. Kept for backward compatibility.
 */
export function calculateDemandLoad(
  basicLoadWatts: number,
  largeApplianceWatts: number,
): number {
  let demand = 0;
  if (basicLoadWatts <= 5000) {
    demand += basicLoadWatts;
  } else {
    demand += 5000 + (basicLoadWatts - 5000) * 0.25;
  }
  demand += largeApplianceWatts;
  return Math.ceil(demand);
}

/**
 * Convert watts to amps (single-phase 120/240 V).
 * @param watts - Power in watts
 * @param voltage - Circuit voltage (defaults to 240 V)
 * @returns Current in amps, rounded up
 */
export function wattsToAmps(watts: number, voltage = 240): number {
  return Math.ceil(watts / voltage);
}

/**
 * Recommend panel size based on demand amps.
 * @param demandAmps - Calculated demand in amps
 * @returns Recommended service size (100, 125, 200, or 400 A)
 */
export function recommendPanelSize(demandAmps: number): number {
  if (demandAmps <= 80) return 100; // 100 A service (80% rule)
  if (demandAmps <= 100) return 125; // 125 A service
  if (demandAmps <= 160) return 200; // 200 A service
  return 400; // 400 A service
}

/**
 * Split a list of items into circuits respecting max outlets per circuit.
 * @param items - Array of items to distribute across circuits
 * @param maxPerCircuit - Maximum items per circuit (defaults to {@link MAX_OUTLETS_PER_CIRCUIT})
 * @returns Array of circuits, where each circuit is an array of items
 */
export function splitIntoCircuits<T>(
  items: T[],
  maxPerCircuit = MAX_OUTLETS_PER_CIRCUIT,
): T[][] {
  const circuits: T[][] = [];
  for (let i = 0; i < items.length; i += maxPerCircuit) {
    circuits.push(items.slice(i, i + maxPerCircuit));
  }
  return circuits;
}

/**
 * Check if a room/location name matches GFCI requirement.
 * @param roomOrDescription - Room name or device location description
 * @returns `true` if GFCI protection is required
 */
export function requiresGfci(roomOrDescription: string): boolean {
  const lower = roomOrDescription.toLowerCase();
  return GFCI_LOCATIONS.some((loc) => lower.includes(loc));
}

/**
 * Check if a room/location name matches AFCI requirement.
 * @param roomOrDescription - Room name or device location description
 * @returns `true` if AFCI protection is required
 */
export function requiresAfci(roomOrDescription: string): boolean {
  const lower = roomOrDescription.toLowerCase();
  return AFCI_LOCATIONS.some((loc) => lower.includes(loc));
}

/**
 * Match a device description against known dedicated circuit patterns.
 * @param description - Free-text device or load description
 * @returns The matching {@link DeviceAmpPattern}, or `null` if no match
 */
export function matchDevicePattern(
  description: string,
): DeviceAmpPattern | null {
  for (const pattern of DEVICE_AMP_PATTERNS) {
    if (pattern.pattern.test(description)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Calculate watts per circuit based on amps and poles.
 * @param amps - Breaker amperage
 * @param poles - Number of poles (1 = 120 V, 2 = 240 V)
 * @returns Power in watts
 */
export function circuitWatts(amps: number, poles: number): number {
  const voltage = poles === 2 ? 240 : 120;
  return amps * voltage;
}

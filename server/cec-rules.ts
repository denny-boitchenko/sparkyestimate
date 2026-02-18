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
    amps: 40,
    poles: 2,
    dedicated: true,
    gfci: false,
    afci: false,
    wireType: "6/3 NMD-90",
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
    amps: 40,
    poles: 2,
    dedicated: true,
    gfci: false,
    afci: false,
    wireType: "6/3 NMD-90",
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

/**
 * Calculate demand load per CEC Rule 8-200.
 *
 * First 5000 W at 100%, remainder at 25%, plus large appliances at 100%.
 *
 * @param basicLoadWatts - Total basic load (lighting + receptacles) in watts
 * @param largeApplianceWatts - Total large appliance load (range, dryer, A/C, etc.)
 * @returns Demand load in watts, rounded up to the nearest whole number
 */
export function calculateDemandLoad(
  basicLoadWatts: number,
  largeApplianceWatts: number,
): number {
  let demand = 0;

  // Basic load: first 5000 W at 100%, remainder at 25%
  if (basicLoadWatts <= 5000) {
    demand += basicLoadWatts;
  } else {
    demand += 5000 + (basicLoadWatts - 5000) * 0.25;
  }

  // Large appliances at 100%
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

/**
 * CEC 2021 Minimum Device Generation from Detected Rooms
 *
 * Implements Canadian Electrical Code (CEC) 2021 minimum electrical requirements
 * for residential rooms based on room type, size, and features.
 */

export interface DetectedRoom {
  room_type: string;
  room_name: string;
  floor_level: string;
  approx_area_sqft: number;
  has_sink: boolean;
  has_bathtub_shower: boolean;
  wall_count: number;
  confidence: number;
  location: number[];
}

export interface DwellingContext {
  dwellingType: string;
  hasLegalSuite: boolean;
  unitIdentifier?: string;
  tier?: 'standard' | 'premium' | 'luxury';
}

interface CECRoomRequirement {
  room_type: string;
  min_receptacles: number;
  receptacle_type: string;
  uses_wall_spacing_rule: boolean;
  wall_spacing_m: number;
  additional_receptacles?: Array<{
    type: string;
    count: number;
    note: string;
  }>;
  min_lighting_outlets: number;
  min_switches: number;
  needs_gfci: boolean;
  needs_afci: boolean;
  needs_exhaust_fan: boolean;
  needs_smoke_detector: boolean;
  needs_co_detector: boolean;
  dedicated_circuits?: string[];
  cec_rules: string[];
  notes: string;
}

export const CEC_ROOM_REQUIREMENTS: Record<string, CECRoomRequirement> = {
  kitchen: {
    room_type: "kitchen",
    min_receptacles: 2,
    receptacle_type: "split_20a",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 0.9,
    additional_receptacles: [
      { type: "dedicated_receptacle", count: 1, note: "Refrigerator (dedicated circuit)" },
      { type: "duplex_receptacle", count: 2, note: "General wall receptacles (1.8m rule)" },
    ],
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    dedicated_circuits: ["Fridge (26-654 a)", "2x counter circuits (26-656 d)"],
    cec_rules: ["26-722(d)", "26-654(a)", "26-656(d)", "26-704(1)"],
    notes: "Counter receptacles: no point >900mm from receptacle. Min 2 branch circuits for counter.",
  },
  bathroom: {
    room_type: "bathroom",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: true,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(f)", "26-720(g)", "26-704(1)", "30-320"],
    notes: "Receptacle within 1m of basin. Min 500mm from tub/shower. Wall switch for luminaire.",
  },
  powder_room: {
    room_type: "powder_room",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(f)", "26-704(1)", "30-320"],
    notes: "Receptacle within 1m of wash basin.",
  },
  primary_bedroom: {
    room_type: "primary_bedroom",
    min_receptacles: 4,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)", "32-110(1)"],
    notes: "No point along wall >1.8m from receptacle. Smoke alarm required in sleeping rooms. AFCI required.",
  },
  bedroom: {
    room_type: "bedroom",
    min_receptacles: 3,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)", "32-110(1)"],
    notes: "No point along wall >1.8m from receptacle. Smoke alarm required in sleeping rooms. AFCI required.",
  },
  living_room: {
    room_type: "living_room",
    min_receptacles: 4,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)", "32-110(1)"],
    notes: "No point along wall >1.8m from receptacle.",
  },
  family_room: {
    room_type: "family_room",
    min_receptacles: 4,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)"],
    notes: "No point along wall >1.8m from receptacle.",
  },
  dining_room: {
    room_type: "dining_room",
    min_receptacles: 3,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)"],
    notes: "No point along wall >1.8m from receptacle.",
  },
  hallway: {
    room_type: "hallway",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 4.5,
    min_lighting_outlets: 1,
    min_switches: 2,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(b)", "26-722(e)", "26-658(1)"],
    notes: "No point >4.5m from receptacle along shortest cord path. 3-way switches.",
  },
  garage: {
    room_type: "garage",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    additional_receptacles: [
      { type: "duplex_receptacle", count: 1, note: "Garage door opener" },
    ],
    min_lighting_outlets: 1,
    min_switches: 2,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    dedicated_circuits: ["Garage receptacles (26-656(h))"],
    cec_rules: ["26-710(e)", "26-724(b)", "26-724(c)", "26-656(h)"],
    notes: "3-way from house entry. 1 receptacle per car space. Dedicated circuit.",
  },
  laundry_room: {
    room_type: "laundry_room",
    min_receptacles: 2,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    additional_receptacles: [
      { type: "dryer_outlet", count: 1, note: "Dryer (NEMA 14-30, dedicated)" },
    ],
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    dedicated_circuits: ["Washer (26-654(b))", "Dryer (26-744(2))"],
    cec_rules: ["26-720(e)", "26-654(b)", "26-744(2)", "26-704(1)"],
    notes: "1 receptacle for washer (dedicated), 1 additional. Dryer on dedicated circuit.",
  },
  basement_finished: {
    room_type: "basement_finished",
    min_receptacles: 3,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)", "32-110(1)"],
    notes: "Treated as finished room. 1.8m wall spacing rule.",
  },
  basement_unfinished: {
    room_type: "basement_unfinished",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(e)(iv)", "26-658(1)"],
    notes: "At least 1 duplex receptacle. Luminaires <2m must be guarded.",
  },
  closet_walkin: {
    room_type: "closet_walkin",
    min_receptacles: 0,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["30-204(1)", "26-712(a) Exception"],
    notes: "No receptacle required. Luminaire on ceiling or above door. No pendant or bare-lamp types.",
  },
  closet_standard: {
    room_type: "closet_standard",
    min_receptacles: 0,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["30-204(1)", "26-712(a) Exception"],
    notes: "No receptacle required. Luminaire on ceiling or above door. No pendant or bare-lamp types.",
  },
  entry_foyer: {
    room_type: "entry_foyer",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 2,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-722(b)", "26-658(1)"],
    notes: "3-way switches at entry. 1.8m rule if finished room.",
  },
  utility_room: {
    room_type: "utility_room",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(e)(iii)", "26-704(1)"],
    notes: "At least 1 duplex receptacle. GFCI if sink present.",
  },
  mechanical_room: {
    room_type: "mechanical_room",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(e)(iii)", "26-704(1)", "26-400"],
    notes: "Panel board location. 1 receptacle + 1 light minimum. Clear working space per CEC 26-400.",
  },
  office_den: {
    room_type: "office_den",
    min_receptacles: 3,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)"],
    notes: "Standard finished room. 1.8m wall spacing rule applies.",
  },
  mudroom: {
    room_type: "mudroom",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(a)"],
    notes: "Treated as entry/finished room. 1 receptacle minimum.",
  },
  pantry: {
    room_type: "pantry",
    min_receptacles: 1,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["30-204(1)", "26-712(a)"],
    notes: "Walk-in pantry: 1 receptacle, luminaire on ceiling or above door.",
  },
  stairway: {
    room_type: "stairway",
    min_receptacles: 0,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 2,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["30-200", "26-722(e)"],
    notes: "3-way switches at top and bottom of stairs.",
  },
  open_to_below: {
    room_type: "open_to_below",
    min_receptacles: 0,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 0,
    min_switches: 0,
    needs_gfci: false,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: [],
    notes: "Double-height space — no electrical devices required.",
  },
  deck: {
    room_type: "deck",
    min_receptacles: 1,
    receptacle_type: "gfci_weather",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-724(a)", "26-710(f)"],
    notes: "1 weatherproof GFCI receptacle required per CEC 26-724(a). Exterior lighting at exit door.",
  },
  patio: {
    room_type: "patio",
    min_receptacles: 1,
    receptacle_type: "gfci_weather",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-724(a)", "26-710(f)"],
    notes: "1 weatherproof GFCI receptacle required per CEC 26-724(a). Exterior lighting at patio door.",
  },
  sunroom: {
    room_type: "sunroom",
    min_receptacles: 2,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-712(a)", "26-722(a)"],
    notes: "Treated as finished room. 1.8m wall spacing rule.",
  },
  ensuite: {
    room_type: "ensuite",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 3,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: true,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(f)", "26-720(g)", "26-704(1)", "30-320"],
    notes: "Ensuite attached to primary bedroom. 2 vanity sconces + shower potlight. 3 switches (sconce, shower, fan).",
  },
  half_bath: {
    room_type: "half_bath",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: true,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720(f)", "26-704(1)", "30-320"],
    notes: "Small WC/powder room. 1 potlight + 1 sconce. Exhaust fan required.",
  },
  greatroom: {
    room_type: "greatroom",
    min_receptacles: 4,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: true,
    wall_spacing_m: 1.8,
    min_lighting_outlets: 1,
    min_switches: 2,
    needs_gfci: false,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: true,
    needs_co_detector: true,
    cec_rules: ["26-712(a)", "26-722(a)", "26-658(1)", "32-110(1)"],
    notes: "Large open-concept room. Potlights (6-8), LED strip, fireplace area. 3-way switches.",
  },
  sauna: {
    room_type: "sauna",
    min_receptacles: 0,
    receptacle_type: "duplex",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: false,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    dedicated_circuits: ["Sauna heater (240V dedicated)"],
    cec_rules: ["26-400"],
    notes: "Sauna: 240V heater + thermostat + waterproof light. Dedicated circuit required.",
  },
  covered_deck: {
    room_type: "covered_deck",
    min_receptacles: 1,
    receptacle_type: "gfci_weather",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: false,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-724(a)", "26-710(f)"],
    notes: "Covered outdoor deck with ceiling. Gets potlights (tier-dependent), soffit outlet, GFI.",
  },
};

/**
 * Calculate receptacle count using CEC wall spacing rules and room area.
 *
 * CEC 26-712(a): In finished rooms, no point along the floor line of any
 * usable wall space shall be more than 1.8m (horizontally) from a receptacle.
 *
 * CEC 26-712(b): In hallways ≥4.5m, at least one receptacle required.
 */
export function calculateReceptaclesFromArea(
  areaSqFt: number,
  wallSpacingM: number,
  minReceptacles: number
): number {
  if (wallSpacingM <= 0) return minReceptacles;

  const sqft = Math.max(areaSqFt, 50);
  const sideFt = Math.sqrt(sqft);
  const perimeterFt = sideFt * 4;
  const spacingFt = wallSpacingM * 3.28;
  const coverageFt = spacingFt * 2;
  const usablePerimeter = perimeterFt * 0.7;
  let count = Math.max(Math.ceil(usablePerimeter / coverageFt), minReceptacles);

  if (wallSpacingM === 4.5) {
    count = Math.min(count, 3);
  } else {
    count = Math.min(count, 8);
  }

  return count;
}

/**
 * Build a CEC rule reference note string for a device in a room.
 */
function buildNote(roomType: string, req: CECRoomRequirement, deviceType: string): string {
  const rules = req.cec_rules.length > 0 ? req.cec_rules.join(", ") : "";
  const prefix = `CEC ${rules}`;

  if (deviceType === "gfci_receptacle" || deviceType === "gfci_weather_receptacle") {
    return `${prefix} — GFCI required`;
  }
  if (deviceType === "exhaust_fan") {
    return `${prefix} — Exhaust fan required`;
  }
  if (deviceType === "smoke_co_combo") {
    return `CEC 32-110(1) — Smoke/CO alarm in sleeping rooms`;
  }
  if (deviceType.includes("switch")) {
    if (req.min_switches >= 2) return `${prefix} — 3-way switching required`;
    return `${prefix}`;
  }
  if (deviceType.includes("light") || deviceType.includes("fluorescent") || deviceType.includes("recessed")) {
    if (roomType === "closet_walkin" || roomType === "closet_standard" || roomType === "pantry") {
      return `CEC 30-204(1) — Luminaire on ceiling or above door`;
    }
    return `${prefix}`;
  }
  if (deviceType === "duplex_receptacle" && req.uses_wall_spacing_rule && req.wall_spacing_m === 1.8) {
    return `CEC 26-712(a) — No point along wall >1.8m from receptacle`;
  }
  if (deviceType === "duplex_receptacle" && req.uses_wall_spacing_rule && req.wall_spacing_m === 4.5) {
    return `CEC 26-712(b) — No point >4.5m from receptacle`;
  }
  if (rules) return prefix;
  return `CEC 2021 minimum for ${roomType.replace(/_/g, " ")}`;
}

/**
 * Generate CEC-minimum device counts for a single detected room.
 */
export function generateDevicesForRoom(room: DetectedRoom, dwellingContext?: DwellingContext): Array<{ type: string; count: number; note: string }> {
  const req = CEC_ROOM_REQUIREMENTS[room.room_type];
  if (!req) {
    return [
      { type: "duplex_receptacle", count: 1, note: "CEC 26-712(a) — Minimum 1 receptacle" },
      { type: "surface_mount_light", count: 1, note: "CEC 30-200 — Luminaire required" },
      { type: "single_pole_switch", count: 1, note: "CEC 30-200 — Switch for luminaire" },
    ];
  }

  const devices: Array<{ type: string; count: number; note: string }> = [];
  const tier = dwellingContext?.tier || "standard";
  const isLuxury = tier === "luxury";
  const isPremium = tier === "premium";
  const isMultiStory = dwellingContext?.dwellingType === "fourplex" || dwellingContext?.dwellingType === "triplex";

  // ══════════════════════════════════════════════════════════════
  // KITCHEN — verified from Bayliss, 1734, 4-Plex, Horizon
  // ══════════════════════════════════════════════════════════════
  if (room.room_type === "kitchen") {
    // Lighting: 4 potlights standard (confirmed across all 4 projects)
    devices.push({ type: "recessed_light", count: 4, note: "CEC 30-200 — Kitchen potlights" });
    devices.push({ type: "pendant_light", count: 2, note: "Island pendant lights" });
    devices.push({ type: "under_cabinet_light", count: 1, note: "Under-cabinet LED strip lighting" });

    // Island outlets: 1 GFI 20A + 1 regular 20A
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-722(d) — Island GFI 20A receptacle" });
    devices.push({ type: "duplex_receptacle", count: 1, note: "Island 20A receptacle" });
    // Counter outlets: 4 KCP 20A (no counter GFI — only island has GFI)
    devices.push({ type: "duplex_receptacle", count: 4, note: "CEC 26-712(a) — Counter 20A receptacles (KCP)" });
    // Dedicated circuits: range, DW, fridge
    devices.push({ type: "range_outlet", count: 1, note: "CEC 26-744 — 240V range outlet" });
    devices.push({ type: "dedicated_receptacle", count: 2, note: "Dedicated circuits: dishwasher, refrigerator" });
    devices.push({ type: "range_hood_fan", count: 1, note: "CEC 26-656(d) — Range hood exhaust" });
    // Switches: 4 single-pole (dining light, island pendants, kitchen pots, living/other)
    devices.push({ type: "single_pole_switch", count: 4, note: "Switches for dining light, island pendants, kitchen potlights, living/other" });

  // ══════════════════════════════════════════════════════════════
  // LIVING ROOM / FAMILY ROOM — verified from all 4 projects
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "living_room" || room.room_type === "family_room") {
    // Lighting: 4 potlights/gimbals regardless of tier (confirmed Horizon luxury + 4-Plex standard)
    devices.push({ type: "recessed_light", count: 4, note: "CEC 30-200 — Living area potlights/gimbals" });

    // Receptacles
    const wallCount = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 4);
    devices.push({ type: "duplex_receptacle", count: wallCount, note: "CEC 26-712(a) — Wall receptacles, 1.8m spacing" });
    devices.push({ type: "tv_outlet", count: 1, note: "TV outlet" });
    devices.push({ type: "data_outlet", count: 1, note: "Cat6 data outlet" });
    // Switches: 2 three-way + 2 single-pole (soffit, balcony)
    devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for main potlights" });
    devices.push({ type: "single_pole_switch", count: 2, note: "Switches for soffit outlet, secondary lights" });
    devices.push({ type: "switched_soffit_outlet", count: 1, note: "Switched soffit outlet for holiday lights" });
    // Safety
    if (req.needs_smoke_detector) {
      devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm" });
    }

  // ══════════════════════════════════════════════════════════════
  // PRIMARY BEDROOM — verified: 1 flush (standard), 4 pots (luxury)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "primary_bedroom") {
    // Lighting: luxury gets 4 potlights (Horizon 13x15 confirmed), standard gets 1 flush
    if (isLuxury || isPremium) {
      devices.push({ type: "recessed_light", count: 4, note: "CEC 30-200 — Primary bedroom potlights" });
    } else {
      devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Ceiling flush light" });
    }
    // Receptacles: min 4 (U2) to 6 (U1/Bayliss)
    const outletCount = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 4);
    devices.push({ type: "duplex_receptacle", count: outletCount, note: "CEC 26-712(a) — Wall receptacles, 1.8m spacing" });
    devices.push({ type: "tv_outlet", count: 1, note: "TV outlet" });
    // Switch: 1 single-pole (confirmed 4-Plex + Horizon)
    devices.push({ type: "single_pole_switch", count: 1, note: "Single-pole switch for light" });
    // Safety
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm in sleeping rooms" });

  // ══════════════════════════════════════════════════════════════
  // SECONDARY BEDROOM — ALWAYS 1 flush, verified all projects
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "bedroom") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Ceiling flush light" });
    const outletCount = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 3);
    devices.push({ type: "duplex_receptacle", count: outletCount, note: "CEC 26-712(a) — Wall receptacles, 1.8m spacing" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Single-pole switch for light" });
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm in sleeping rooms" });

  // ══════════════════════════════════════════════════════════════
  // DINING ROOM — ALWAYS 1 flush, verified all projects
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "dining_room") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Ceiling flush light" });
    const outletCount = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 1);
    devices.push({ type: "duplex_receptacle", count: outletCount, note: "CEC 26-712(a) — Wall receptacles" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for dining light (often controlled from kitchen switch bank)" });

  // ══════════════════════════════════════════════════════════════
  // ENSUITE — 2 sconces + shower pot + flush, verified all 4 projects
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "ensuite") {
    // Lighting: 1 pot over shower + 1 flush light (all tiers — Horizon luxury confirmed)
    devices.push({ type: "recessed_light", count: 1, note: "CEC 30-200 — Shower potlight" });
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Ensuite ceiling flush light" });
    devices.push({ type: "wall_sconce", count: 2, note: "Vanity sconce lights (always 2)" });
    // Outlets: 1 GFI
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-720(f) — GFCI at vanity" });
    // Floor heat in luxury ensuites
    if (isLuxury || isPremium) {
      devices.push({ type: "floor_heat", count: 1, note: "240V GFI — In-floor radiant heat (luxury ensuite)" });
    }
    // Switches: 3 single-pole (sconces, shower pot, fan)
    devices.push({ type: "single_pole_switch", count: 3, note: "Switches for sconces, shower light, exhaust fan" });
    devices.push({ type: "exhaust_fan", count: 1, note: "CEC 30-320 — Exhaust fan required" });

  // ══════════════════════════════════════════════════════════════
  // FULL BATHROOM — tub potlight + sconce, verified all projects
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "bathroom") {
    devices.push({ type: "recessed_light", count: 1, note: "CEC 30-200 — Tub/shower potlight" });
    devices.push({ type: "wall_sconce", count: 1, note: "Vanity sconce light" });
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-720(f) — GFCI at vanity" });
    devices.push({ type: "single_pole_switch", count: 3, note: "Switches for light, sconce, exhaust fan" });
    devices.push({ type: "exhaust_fan", count: 1, note: "CEC 30-320 — Exhaust fan required" });

  // ══════════════════════════════════════════════════════════════
  // HALF BATH / WC — potlight + sconce, verified 4-Plex
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "half_bath" || room.room_type === "powder_room") {
    devices.push({ type: "recessed_light", count: 1, note: "CEC 30-200 — Potlight" });
    devices.push({ type: "wall_sconce", count: 1, note: "Vanity sconce light" });
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-720(f) — GFCI at vanity" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });
    devices.push({ type: "exhaust_fan", count: 1, note: "CEC 30-320 — Exhaust fan required" });

  // ══════════════════════════════════════════════════════════════
  // HALLWAY — potlights vary (2-7), outlets vary (0-2)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "hallway") {
    // Lighting: varies by project size — max(2, floor(sqft/50))
    const hallPots = Math.max(2, Math.floor(room.approx_area_sqft / 50));
    devices.push({ type: "recessed_light", count: hallPots, note: "CEC 30-200 — Hallway potlights" });
    // Outlets: include if hallway >= 100 SF (CEC 4.5m rule)
    if (room.approx_area_sqft >= 100) {
      devices.push({ type: "duplex_receptacle", count: 2, note: "CEC 26-712(b) — Hallway receptacles" });
    }
    // Switches: always 3-way, 4-way if multi-story with 3+ access
    if (isMultiStory) {
      devices.push({ type: "four_way_switch", count: 1, note: "4-way switch for multi-story hallway" });
      devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for hallway potlights" });
      devices.push({ type: "single_pole_switch", count: 1, note: "Switch for down stair light" });
      devices.push({ type: "recessed_light", count: 1, note: "Down stair light" });
    } else {
      devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for hallway potlights" });
    }
    // Safety
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(3) — Smoke/CO combo in hallway" });

  // ══════════════════════════════════════════════════════════════
  // GARAGE — flush lights (size-based), NO smoke alarm, NO panel (panel in mech)
  // Verified 4-Plex + Horizon
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "garage") {
    // Lighting: size-based — 2 for standard, 3 for large/L-shaped
    const garageLights = Math.max(2, Math.ceil(room.approx_area_sqft / 200));
    devices.push({ type: "surface_mount_light", count: garageLights, note: "CEC 30-200 — Garage ceiling flush lights" });
    // Receptacles: 4 wall + 2 ceiling plugs + 1 outdoor GFI
    devices.push({ type: "duplex_receptacle", count: 4, note: "CEC 26-710(e) — Garage wall receptacles (15A)" });
    devices.push({ type: "duplex_receptacle", count: 2, note: "Garage ceiling plug receptacles" });
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-724(b) — Outdoor GFI receptacle" });
    // EV charger
    devices.push({ type: "ev_charger_outlet", count: 1, note: "240V EV charger outlet (NEMA 14-50)" });
    // Exterior lighting: 2 outdoor sconces
    devices.push({ type: "wall_sconce", count: 2, note: "Exterior garage sconce lights" });
    // Switches: single-pole for lights + 1 for exterior sconces
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for garage lights" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for exterior sconces" });

  // ══════════════════════════════════════════════════════════════
  // ENTRANCE / ENTRY FOYER — 2 flush + outdoor sconce + GFI, 3 switches
  // Verified 4-Plex + Horizon
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "entry_foyer" || room.room_type === "mudroom") {
    devices.push({ type: "surface_mount_light", count: 2, note: "CEC 30-200 — Entrance ceiling flush lights" });
    devices.push({ type: "wall_sconce", count: 1, note: "Outdoor entrance sconce" });
    devices.push({ type: "duplex_receptacle", count: 2, note: "CEC 26-712(a) — Entrance receptacles" });
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-724(a) — Front outdoor GFI" });
    // 3 switches: 2 three-way for entrance lights + 1 for outdoor sconce
    devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for entrance lights" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for outdoor sconce" });
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(3) — Smoke/CO alarm at entry" });

  // ══════════════════════════════════════════════════════════════
  // LAUNDRY — washer + dryer + GFI, verified 4-Plex
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "laundry_room") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Laundry ceiling light" });
    devices.push({ type: "duplex_receptacle", count: 1, note: "CEC 26-654(b) — Washer dedicated receptacle" });
    devices.push({ type: "dryer_outlet", count: 1, note: "CEC 26-744(2) — Dryer NEMA 14-30 dedicated circuit" });
    devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-720(e) — Additional GFI receptacle" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });

  // ══════════════════════════════════════════════════════════════
  // COVERED DECK — 4 pots, 2 switches, 1 15A weather (verified Horizon)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "covered_deck") {
    devices.push({ type: "recessed_light", count: 4, note: "CEC 30-200 — Covered deck potlights" });
    devices.push({ type: "weather_resistant_receptacle", count: 1, note: "CEC 26-724(a) — 15A weatherproof receptacle" });
    devices.push({ type: "switched_soffit_outlet", count: 1, note: "Switched soffit outlet for holiday lights" });
    // 2 switches: 1 for potlights (3-way from living), 1 for soffit
    devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for deck potlights" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for soffit outlet" });

  // ══════════════════════════════════════════════════════════════
  // GREATROOM — large open concept room with fireplace (verified Horizon)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "greatroom") {
    // Lighting: 6-8 potlights for large rooms
    const grPots = Math.max(6, Math.floor(room.approx_area_sqft / 50));
    devices.push({ type: "recessed_light", count: grPots, note: "CEC 30-200 — Greatroom potlights" });
    devices.push({ type: "led_strip_light", count: 1, note: "LED strip light (fireplace/built-in area)" });
    // Receptacles
    const grOutlets = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 4);
    devices.push({ type: "duplex_receptacle", count: grOutlets, note: "CEC 26-712(a) — Wall receptacles" });
    // Switches: 3-way for main lighting
    devices.push({ type: "three_way_switch", count: 2, note: "3-way switches for greatroom potlights" });
    // Safety
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm" });

  // ══════════════════════════════════════════════════════════════
  // SAUNA — 240V heater + thermostat + waterproof light (verified Horizon)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "sauna") {
    devices.push({ type: "sauna_heater", count: 1, note: "240V dedicated sauna heater" });
    devices.push({ type: "thermostat", count: 1, note: "LV sauna thermostat" });
    devices.push({ type: "surface_mount_light", count: 1, note: "Waterproof sauna light fixture" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for sauna light" });

  // ══════════════════════════════════════════════════════════════
  // OPEN DECK / PATIO — minimal outdoor
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "deck" || room.room_type === "patio") {
    devices.push({ type: "exterior_light", count: 1, note: "CEC 30-200 — Exterior light at exit" });
    devices.push({ type: "gfci_weather_receptacle", count: 1, note: "CEC 26-724(a) — Weatherproof GFCI" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for exterior light" });

  // ══════════════════════════════════════════════════════════════
  // MECHANICAL ROOM — panel + 3 outlets (verified Horizon)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "mechanical_room") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Mechanical room light" });
    devices.push({ type: "duplex_receptacle", count: 3, note: "CEC 26-720(e)(iii) — Receptacles for mechanical room" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });
    devices.push({ type: "panel_board", count: 1, note: "CEC 26-400 — 200A main panel, clear working space required" });

  // ══════════════════════════════════════════════════════════════
  // WALK-IN CLOSET — ALWAYS 1 flush, 0 outlets (verified all 4 projects)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "closet_walkin") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-204(1) — Ceiling flush light" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });

  // ══════════════════════════════════════════════════════════════
  // STANDARD CLOSET — no outlets, just light
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "closet_standard") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-204(1) — Ceiling light" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });

  // ══════════════════════════════════════════════════════════════
  // PANTRY — standard: 1 flush, 0 outlets; luxury with cabinets: 2 pots + outlets
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "pantry") {
    if (isLuxury || isPremium) {
      // Luxury pantry with built-in cabinets (Horizon confirmed)
      devices.push({ type: "recessed_light", count: 2, note: "CEC 30-204(1) — Pantry potlights" });
      devices.push({ type: "duplex_receptacle", count: 2, note: "CEC 26-712(a) — Pantry 20A receptacles (built-in cabinets)" });
      devices.push({ type: "gfci_receptacle", count: 1, note: "CEC 26-722(d) — Pantry GFI 20A receptacle" });
    } else {
      devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-204(1) — Pantry ceiling light" });
    }
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });

  // ══════════════════════════════════════════════════════════════
  // OFFICE / DEN — flush light, data, smoke detector (verified Horizon)
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "office_den") {
    devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200 — Office ceiling light" });
    const outletCount = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 4);
    devices.push({ type: "duplex_receptacle", count: outletCount, note: "CEC 26-712(a) — Wall receptacles" });
    devices.push({ type: "data_outlet", count: 1, note: "Cat6 data outlet (LV)" });
    devices.push({ type: "single_pole_switch", count: 1, note: "Switch for light" });
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm" });

  // ══════════════════════════════════════════════════════════════
  // STAIRWAY — down stair light + 3-way
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "stairway") {
    devices.push({ type: "recessed_light", count: 1, note: "CEC 30-200 — Down stair light" });
    devices.push({ type: "three_way_switch", count: 2, note: "CEC 26-722(e) — 3-way switches at top and bottom" });

  // ══════════════════════════════════════════════════════════════
  // OPEN TO BELOW — no devices
  // ══════════════════════════════════════════════════════════════
  } else if (room.room_type === "open_to_below") {
    // No devices

  // ══════════════════════════════════════════════════════════════
  // BASEMENT (finished/unfinished) + UTILITY + SUNROOM — generic
  // ══════════════════════════════════════════════════════════════
  } else {
    // Generic fallback for remaining room types
    if (req.min_lighting_outlets > 0) {
      if (room.room_type === "basement_unfinished") {
        devices.push({ type: "fluorescent_light", count: Math.max(1, Math.floor(room.approx_area_sqft / 200)), note: "CEC 30-200 — Guarded luminaire if <2m" });
      } else {
        devices.push({ type: "surface_mount_light", count: req.min_lighting_outlets, note: buildNote(room.room_type, req, "surface_mount_light") });
      }
    }
    if (req.uses_wall_spacing_rule && req.wall_spacing_m > 0) {
      const count = calculateReceptaclesFromArea(room.approx_area_sqft, req.wall_spacing_m, req.min_receptacles);
      devices.push({ type: "duplex_receptacle", count, note: buildNote(room.room_type, req, "duplex_receptacle") });
    } else if (req.min_receptacles > 0) {
      devices.push({ type: "duplex_receptacle", count: req.min_receptacles, note: buildNote(room.room_type, req, "duplex_receptacle") });
    }
    if (req.min_switches >= 2) {
      devices.push({ type: "three_way_switch", count: 2, note: buildNote(room.room_type, req, "three_way_switch") });
    } else if (req.min_switches > 0) {
      devices.push({ type: "single_pole_switch", count: 1, note: buildNote(room.room_type, req, "single_pole_switch") });
    }
    if (req.needs_exhaust_fan) {
      devices.push({ type: "exhaust_fan", count: 1, note: buildNote(room.room_type, req, "exhaust_fan") });
    }
    if (req.needs_smoke_detector) {
      devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm required" });
    }
  }

  // ── Suite / Multi-Unit Panel ──
  if (dwellingContext) {
    const isSuiteRoom = (
      dwellingContext.dwellingType === "single" &&
      dwellingContext.hasLegalSuite &&
      (room.room_type === "basement_finished" || room.room_name.toUpperCase().includes("SUITE"))
    );

    if (isSuiteRoom) {
      devices.push({
        type: "subpanel",
        count: 1,
        note: "CEC 26-256 — 60A minimum sub-panel for secondary suite. Requires dedicated feeder from main panel.",
      });
    }
  }

  return devices;
}

/**
 * Generate CEC-minimum whole-house devices.
 * These are not tied to a specific room but required for the dwelling overall.
 *
 * Panel Board is NOT included here — it should be placed in the Mechanical Room
 * or Garage by the calling code.
 */
export function generateWholeHouseDevices(rooms: DetectedRoom[], dwellingContext?: DwellingContext): Array<{ type: string; count: number; note: string }> {
  const devices: Array<{ type: string; count: number; note: string }> = [];

  // Outdoor: rear weatherproof GFCI (front GFI handled by entry_foyer block)
  devices.push({ type: "outdoor_receptacle", count: 1, note: "CEC 26-724(a) — Rear outdoor weatherproof GFCI receptacle" });
  devices.push({ type: "exterior_light", count: 2, note: "CEC 30-200 — Front and rear entry lights" });
  devices.push({ type: "doorbell", count: 1, note: "Standard — Low-voltage doorbell" });
  devices.push({ type: "thermostat", count: 1, note: "Standard — HVAC thermostat" });

  const hallwayCount = rooms.filter(r => r.room_type === "hallway").length;
  const hasBasement = rooms.some(r => r.room_type === "basement_finished" || r.room_type === "basement_unfinished");
  const extraSmoke = Math.max(hallwayCount, 1) + (hasBasement ? 1 : 0);
  devices.push({ type: "smoke_co_combo", count: extraSmoke, note: "CEC 32-110(3) — Smoke/CO on each storey + hallways" });

  // ── Suite / Multi-Unit Extras ──
  if (dwellingContext) {
    if (dwellingContext.dwellingType === "single" && dwellingContext.hasLegalSuite) {
      devices.push({ type: "smoke_co_combo", count: 2, note: "CEC 32-110 — Smoke/CO alarms for secondary suite (bedroom + hallway)" });
      devices.push({ type: "doorbell", count: 1, note: "Standard — Suite separate entrance doorbell" });
      devices.push({ type: "thermostat", count: 1, note: "Standard — Suite separate HVAC thermostat" });
      devices.push({ type: "exterior_light", count: 1, note: "CEC 30-200 — Suite entrance exterior light" });
    }

    if (["duplex", "triplex", "fourplex"].includes(dwellingContext.dwellingType)) {
      const unitCount = dwellingContext.dwellingType === "duplex" ? 2
        : dwellingContext.dwellingType === "triplex" ? 3 : 4;
      const extraUnits = unitCount - 1;
      // Each unit gets its own doorbell, thermostat, entry light, and 200A panel
      devices.push({ type: "doorbell", count: extraUnits, note: `Standard — Doorbell per additional unit (${unitCount} units total)` });
      devices.push({ type: "thermostat", count: extraUnits, note: `Standard — Thermostat per additional unit (${unitCount} units total)` });
      devices.push({ type: "exterior_light", count: extraUnits, note: `CEC 30-200 — Entry light per additional unit (${unitCount} units total)` });
      devices.push({ type: "smoke_co_combo", count: extraUnits, note: `CEC 32-110 — Smoke/CO per additional unit hallway (${unitCount} units total)` });
    }
  }

  return devices;
}

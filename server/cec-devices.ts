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
    count = Math.min(count, 6);
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
export function generateDevicesForRoom(room: DetectedRoom): Array<{ type: string; count: number; note: string }> {
  const req = CEC_ROOM_REQUIREMENTS[room.room_type];
  if (!req) {
    return [
      { type: "duplex_receptacle", count: 1, note: "CEC 26-712(a) — Minimum 1 receptacle" },
      { type: "surface_mount_light", count: 1, note: "CEC 30-200 — Luminaire required" },
      { type: "single_pole_switch", count: 1, note: "CEC 30-200 — Switch for luminaire" },
    ];
  }

  const devices: Array<{ type: string; count: number; note: string }> = [];

  // ── Receptacles ──
  if (room.room_type === "kitchen") {
    devices.push({ type: "gfci_receptacle", count: Math.max(req.min_receptacles, 3), note: "CEC 26-722(d), 26-656(d) — Counter GFCI receptacles, min 2 branch circuits" });
    devices.push({ type: "dedicated_receptacle", count: 1, note: "CEC 26-654(a) — Refrigerator dedicated circuit" });
    const wallRecepts = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 2);
    devices.push({ type: "duplex_receptacle", count: wallRecepts, note: "CEC 26-712(a) — General wall receptacles, 1.8m spacing" });
    devices.push({ type: "range_hood_fan", count: 1, note: "CEC 26-656(d) — Range hood exhaust" });
  } else if (room.room_type === "bathroom" || room.room_type === "powder_room") {
    devices.push({ type: "gfci_receptacle", count: req.min_receptacles, note: buildNote(room.room_type, req, "gfci_receptacle") });
  } else if (room.room_type === "garage") {
    const carSpaces = Math.max(1, Math.floor(room.approx_area_sqft / 250));
    devices.push({ type: "duplex_receptacle", count: carSpaces + 1, note: "CEC 26-710(e), 26-724(b) — 1 per car space + 1 door opener" });
  } else if (room.room_type === "laundry_room") {
    devices.push({ type: "duplex_receptacle", count: 2, note: "CEC 26-720(e), 26-654(b) — Washer (dedicated) + 1 additional" });
    devices.push({ type: "dryer_outlet", count: 1, note: "CEC 26-744(2) — Dryer NEMA 14-30 dedicated circuit" });
  } else if (room.room_type === "deck") {
    devices.push({ type: "gfci_weather_receptacle", count: 1, note: "CEC 26-724(a) — 1 weatherproof GFCI receptacle required" });
  } else if (room.room_type === "open_to_below") {
    // No devices
  } else if (room.room_type === "stairway") {
    // No receptacles for stairways
  } else if (room.room_type === "closet_walkin" || room.room_type === "closet_standard") {
    // CEC does not require receptacles in closets
  } else if (room.room_type === "pantry") {
    devices.push({ type: "duplex_receptacle", count: 1, note: "CEC 26-712(a) — 1 receptacle for walk-in pantry" });
  } else if (room.room_type === "mudroom") {
    devices.push({ type: "duplex_receptacle", count: 1, note: "CEC 26-712(a) — 1 receptacle minimum" });
  } else if (room.room_type === "utility_room") {
    devices.push({ type: "duplex_receptacle", count: 1, note: "CEC 26-720(e)(iii) — 1 receptacle minimum" });
  } else if (room.room_type === "basement_unfinished") {
    devices.push({ type: "duplex_receptacle", count: 1, note: "CEC 26-720(e)(iv) — 1 receptacle minimum" });
  } else if (req.uses_wall_spacing_rule && req.wall_spacing_m > 0) {
    const count = calculateReceptaclesFromArea(room.approx_area_sqft, req.wall_spacing_m, req.min_receptacles);
    devices.push({ type: "duplex_receptacle", count, note: buildNote(room.room_type, req, "duplex_receptacle") });
  } else if (req.min_receptacles > 0) {
    devices.push({ type: "duplex_receptacle", count: req.min_receptacles, note: buildNote(room.room_type, req, "duplex_receptacle") });
  }

  // ── Lighting ──
  if (req.min_lighting_outlets > 0) {
    if (room.room_type === "closet_walkin" || room.room_type === "closet_standard" || room.room_type === "pantry") {
      devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-204(1) — Luminaire on ceiling or above door" });
    } else if (room.room_type === "kitchen") {
      const potCount = Math.max(4, Math.floor(room.approx_area_sqft / 30));
      devices.push({ type: "recessed_light", count: potCount, note: "CEC 30-200 — Kitchen lighting" });
    } else if (room.room_type === "bathroom" || room.room_type === "powder_room") {
      devices.push({ type: "surface_mount_light", count: 1, note: "CEC 30-200, 26-704(1) — Wall switch controlled luminaire" });
    } else if (room.room_type === "living_room" || room.room_type === "family_room" || room.room_type === "primary_bedroom") {
      const potCount = Math.max(4, Math.floor(room.approx_area_sqft / 40));
      devices.push({ type: "recessed_light", count: potCount, note: "CEC 30-200 — Lighting for living area" });
    } else if (room.room_type === "garage") {
      devices.push({ type: "fluorescent_light", count: Math.max(1, Math.floor(room.approx_area_sqft / 200)), note: "CEC 30-200 — Garage lighting" });
    } else if (room.room_type === "basement_unfinished") {
      devices.push({ type: "fluorescent_light", count: Math.max(1, Math.floor(room.approx_area_sqft / 200)), note: "CEC 30-200 — Guarded luminaire if <2m" });
    } else if (room.room_type === "deck") {
      devices.push({ type: "exterior_light", count: 1, note: "CEC 30-200 — Exterior light at deck exit" });
    } else {
      devices.push({ type: "surface_mount_light", count: req.min_lighting_outlets, note: buildNote(room.room_type, req, "surface_mount_light") });
    }
  }

  // ── Switches ──
  if (req.min_switches > 0) {
    if (req.min_switches >= 2) {
      devices.push({ type: "three_way_switch", count: 2, note: buildNote(room.room_type, req, "three_way_switch") });
    } else {
      devices.push({ type: "single_pole_switch", count: 1, note: buildNote(room.room_type, req, "single_pole_switch") });
    }
  }

  // ── Exhaust Fan ──
  if (req.needs_exhaust_fan) {
    devices.push({ type: "exhaust_fan", count: 1, note: buildNote(room.room_type, req, "exhaust_fan") });
  }

  // ── Smoke Detector ──
  if (req.needs_smoke_detector) {
    devices.push({ type: "smoke_co_combo", count: 1, note: "CEC 32-110(1) — Smoke/CO alarm required in sleeping rooms" });
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
export function generateWholeHouseDevices(rooms: DetectedRoom[]): Array<{ type: string; count: number; note: string }> {
  const devices: Array<{ type: string; count: number; note: string }> = [];

  devices.push({ type: "outdoor_receptacle", count: 1, note: "CEC 26-724(a) — Outdoor weatherproof GFCI receptacle" });
  devices.push({ type: "exterior_light", count: 2, note: "CEC 30-200 — Front and rear entry lights" });
  devices.push({ type: "doorbell", count: 1, note: "Standard — Low-voltage doorbell" });
  devices.push({ type: "thermostat", count: 1, note: "Standard — HVAC thermostat" });

  const livingAreas = rooms.filter(r =>
    ["living_room", "family_room", "primary_bedroom", "bedroom", "office_den", "basement_finished"].includes(r.room_type)
  ).length;

  const tvAreas = rooms.filter(r =>
    ["living_room", "family_room", "primary_bedroom", "basement_finished"].includes(r.room_type)
  ).length;

  if (livingAreas > 0) {
    devices.push({ type: "data_outlet", count: livingAreas, note: "Standard — Cat6 data outlet per living/bedroom area" });
  }
  if (tvAreas > 0) {
    devices.push({ type: "tv_outlet", count: tvAreas, note: "Standard — Coax TV outlet in main living areas" });
  }

  const hallwayCount = rooms.filter(r => r.room_type === "hallway").length;
  const hasBasement = rooms.some(r => r.room_type === "basement_finished" || r.room_type === "basement_unfinished");
  const extraSmoke = Math.max(hallwayCount, 1) + (hasBasement ? 1 : 0);
  devices.push({ type: "smoke_co_combo", count: extraSmoke, note: "CEC 32-110(3) — Smoke/CO on each storey + hallways" });

  return devices;
}

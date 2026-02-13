/**
 * CEC 2021 Minimum Device Generation from Detected Rooms
 *
 * Implements Canadian Electrical Code (CEC) 2021 minimum electrical requirements
 * for residential rooms based on room type, size, and features.
 */

/**
 * A room identified on an architectural floor plan.
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

/**
 * Minimum electrical devices for a room type per CEC 2021.
 */
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
  cec_rules?: string[];
  notes: string;
}

/**
 * CEC 2021 minimum requirements per room type.
 * Maps room_type -> CECRoomRequirement
 */
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
    cec_rules: ["26-722 d)", "26-654 a)", "26-656 d)", "26-704 1)"],
    notes: "Counter receptacles: no point >900mm from receptacle. Min 2 branch circuits for counter.",
  },
  bathroom: {
    room_type: "bathroom",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 1.0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: true,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720 f)", "26-720 g)", "26-704 1)", "30-320"],
    notes: "Receptacle within 1m of basin. Min 500mm from tub/shower. Wall switch for luminaire.",
  },
  powder_room: {
    room_type: "powder_room",
    min_receptacles: 1,
    receptacle_type: "gfci",
    uses_wall_spacing_rule: false,
    wall_spacing_m: 1.0,
    min_lighting_outlets: 1,
    min_switches: 1,
    needs_gfci: true,
    needs_afci: true,
    needs_exhaust_fan: false,
    needs_smoke_detector: false,
    needs_co_detector: false,
    cec_rules: ["26-720 f)", "26-704 1)", "30-320"],
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
    cec_rules: ["26-722 a)", "26-658 1)", "32-200"],
    notes: "Smoke alarm required in sleeping rooms. AFCI required.",
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
    cec_rules: ["26-722 a)", "26-658 1)", "32-200"],
    notes: "Smoke alarm required in sleeping rooms. AFCI required.",
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
    cec_rules: ["26-722 a)", "26-658 1)", "32-200"],
    notes: "1.8m wall spacing rule applies.",
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
    cec_rules: ["26-722 a)", "26-658 1)"],
    notes: "1.8m wall spacing rule applies.",
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
    cec_rules: ["26-722 a)", "26-658 1)"],
    notes: "1.8m wall spacing rule. No face-up receptacles in surfaces.",
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
    cec_rules: ["26-722 e)", "26-658 1)"],
    notes: "No point >4.5m from receptacle (measured by shortest cord path).",
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
    dedicated_circuits: ["Garage receptacles (26-656 h)"],
    cec_rules: ["26-724 b)", "26-724 c)", "26-656 h)"],
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
    dedicated_circuits: ["Washer (26-654 b)", "Dryer (26-744 2)"],
    cec_rules: ["26-720 e)", "26-654 b)", "26-744 2)", "26-704 1)"],
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
    cec_rules: ["26-722 a)", "26-658 1)", "32-200"],
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
    cec_rules: ["26-720 e)(iv)", "26-658 1)"],
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
    cec_rules: ["30-204"],
    notes: "Luminaire on ceiling or above door. No pendant or bare-lamp types.",
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
    cec_rules: ["30-204"],
    notes: "Luminaire on ceiling or above door. No pendant or bare-lamp types.",
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
    cec_rules: ["26-722 a)", "26-722 b)", "26-658 1)"],
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
    cec_rules: ["26-720 e)(iii)", "26-704 1)"],
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
    cec_rules: ["26-722 a)", "26-658 1)"],
    notes: "Standard room. 1.8m wall spacing rule.",
  },
  mudroom: {
    room_type: "mudroom",
    min_receptacles: 1,
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
    cec_rules: ["26-722 a)"],
    notes: "Treated as entry/finished room.",
  },
  pantry: {
    room_type: "pantry",
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
    cec_rules: ["30-204"],
    notes: "Treated like a closet — luminaire on ceiling or above door.",
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
    cec_rules: ["30-200"],
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
    notes: "Double-height space, not a real room.",
  },
};

/**
 * Calculate receptacle count using CEC wall spacing rules and room area.
 *
 * For rooms using the 1.8m rule: estimate wall perimeter from area,
 * subtract openings, and calculate how many receptacles are needed so
 * no point is further than wall_spacing_m from a receptacle.
 *
 * @param areaSqFt - Approximate area in square feet
 * @param wallSpacingM - Maximum distance from receptacle in meters (e.g., 1.8 or 4.5)
 * @param minReceptacles - Minimum number to return
 * @returns Number of receptacles needed
 */
export function calculateReceptaclesFromArea(
  areaSqFt: number,
  wallSpacingM: number,
  minReceptacles: number
): number {
  // Estimate perimeter from area (assume roughly rectangular)
  const sqft = Math.max(areaSqFt, 50);
  const sideFt = Math.sqrt(sqft);
  const perimeterFt = sideFt * 4;

  // Convert spacing rule to feet (1 m = 3.28 ft)
  const spacingFt = wallSpacingM * 3.28;

  // Each receptacle covers 2x the spacing distance (one on each side)
  const coverageFt = spacingFt * 2;

  // Subtract ~30% for doorways, windows, closets, and corners
  const usablePerimeter = perimeterFt * 0.7;

  let count = Math.max(Math.round(usablePerimeter / coverageFt), minReceptacles);

  // Cap: even a very large room rarely needs more than 8 duplex receptacles
  count = Math.min(count, 8);

  return count;
}

/**
 * Generate CEC-minimum device counts for a single detected room.
 *
 * Returns a dict of symbol_type -> count, compatible with the estimator.
 *
 * @param room - The detected room
 * @returns Record of device_type -> quantity
 */
export function generateDevicesForRoom(room: DetectedRoom): Record<string, number> {
  const req = CEC_ROOM_REQUIREMENTS[room.room_type];
  if (!req) {
    // Unknown room type — apply minimal defaults
    return {
      duplex_receptacle: 1,
      surface_mount_light: 1,
      single_pole_switch: 1,
    };
  }

  const devices: Record<string, number> = {};

  // ── Receptacles ──
  if (room.room_type === "kitchen") {
    // Counter receptacles (split or 20A GFCI)
    devices["gfci_receptacle"] = Math.max(req.min_receptacles, 3);

    // Fridge dedicated
    devices["dedicated_receptacle"] = 1;

    // General wall receptacles (1.8m rule for non-counter walls)
    const wallRecepts = calculateReceptaclesFromArea(room.approx_area_sqft, 1.8, 2);
    devices["duplex_receptacle"] = wallRecepts;

    // Range hood
    devices["range_hood_fan"] = 1;
  } else if (room.room_type === "bathroom" || room.room_type === "powder_room") {
    devices["gfci_receptacle"] = req.min_receptacles;
  } else if (room.room_type === "garage") {
    // 1 per car space — estimate from area
    const carSpaces = Math.max(1, Math.floor(room.approx_area_sqft / 250));
    devices["duplex_receptacle"] = carSpaces + 1; // +1 for door opener
  } else if (room.room_type === "laundry_room") {
    devices["duplex_receptacle"] = 2; // washer + additional
    devices["dryer_outlet"] = 1;
  } else {
    // Standard rooms with wall spacing calculation
    const count = calculateReceptaclesFromArea(
      room.approx_area_sqft,
      req.wall_spacing_m,
      req.min_receptacles
    );
    if (req.receptacle_type === "gfci") {
      devices["gfci_receptacle"] = count;
    } else {
      devices["duplex_receptacle"] = count;
    }
  }

  // Additional receptacles from requirement
  if (req.additional_receptacles) {
    for (const extra of req.additional_receptacles) {
      const sym = extra.type;
      devices[sym] = (devices[sym] || 0) + extra.count;
    }
  }

  // ── Lighting ──
  if (req.min_lighting_outlets > 0) {
    if (
      room.room_type === "closet_walkin" ||
      room.room_type === "closet_standard" ||
      room.room_type === "pantry"
    ) {
      devices["surface_mount_light"] = 1;
    } else if (room.room_type === "kitchen") {
      // Recessed lights proportional to area
      const potCount = Math.max(4, Math.floor(room.approx_area_sqft / 30));
      devices["recessed_light"] = potCount;
    } else if (room.room_type === "bathroom" || room.room_type === "powder_room") {
      devices["surface_mount_light"] = 1;
    } else if (
      room.room_type === "living_room" ||
      room.room_type === "family_room" ||
      room.room_type === "primary_bedroom"
    ) {
      const potCount = Math.max(4, Math.floor(room.approx_area_sqft / 40));
      devices["recessed_light"] = potCount;
    } else if (room.room_type === "garage") {
      devices["fluorescent_light"] = Math.max(1, Math.floor(room.approx_area_sqft / 200));
    } else if (room.room_type === "basement_unfinished") {
      devices["fluorescent_light"] = Math.max(1, Math.floor(room.approx_area_sqft / 200));
    } else {
      devices["surface_mount_light"] = req.min_lighting_outlets;
    }
  }

  // ── Switches ──
  if (req.min_switches > 0) {
    if (req.min_switches >= 2) {
      // 3-way switch pair (hallway, stairway, entry, garage)
      devices["three_way_switch"] = 2;
    } else {
      devices["single_pole_switch"] = 1;
    }

    // Additional switches for rooms with multiple light groups
    const totalLights = Object.entries(devices).reduce((sum, [key, val]) => {
      if (key.includes("light") || key.includes("pot_light") || key.includes("fluorescent") || key.includes("fan")) {
        return sum + val;
      }
      return sum;
    }, 0);

    if (totalLights > 4 && room.room_type !== "hallway" && room.room_type !== "stairway") {
      // Separate switch for each light group beyond the first
      let extraSwitches = Math.max(0, Math.floor((totalLights - 1) / 4));
      if (room.room_type === "kitchen") {
        extraSwitches = Math.max(extraSwitches, 1); // range hood switch
      }
      devices["single_pole_switch"] = (devices["single_pole_switch"] || 0) + extraSwitches;
    }

    // Large rooms (>250 sqft) with single entrance get 3-way for better control
    if (
      room.approx_area_sqft >= 250 &&
      (room.room_type === "primary_bedroom" ||
        room.room_type === "living_room" ||
        room.room_type === "family_room" ||
        room.room_type === "basement_finished")
    ) {
      if (!devices["three_way_switch"]) {
        devices["three_way_switch"] = 2;
        // Convert one single_pole to 3-way
        if ((devices["single_pole_switch"] || 0) > 0) {
          devices["single_pole_switch"] -= 1;
        }
      }
    }
  }

  // ── Exhaust Fan ──
  if (req.needs_exhaust_fan) {
    devices["exhaust_fan"] = 1;
  }

  // ── Smoke Detector ──
  if (req.needs_smoke_detector) {
    devices["smoke_co_combo"] = 1;
  }

  return devices;
}

/**
 * Generate CEC-minimum devices for all rooms, plus whole-house requirements.
 *
 * Returns aggregated symbol_type -> count dict for the estimator.
 *
 * @param rooms - Array of detected rooms
 * @returns Record of device_type -> aggregated quantity
 */
export function generateWholeHouseDevices(rooms: DetectedRoom[]): Record<string, number> {
  const totals: Record<string, number> = {};

  // Generate devices for each room
  for (const room of rooms) {
    const roomDevices = generateDevicesForRoom(room);
    for (const [sym, count] of Object.entries(roomDevices)) {
      totals[sym] = (totals[sym] || 0) + count;
    }
  }

  // ── Whole-house requirements ──

  // Exterior receptacle (Rule 26-724 a) — at least 1 outdoor GFCI
  totals["outdoor_receptacle"] = (totals["outdoor_receptacle"] || 0) + 1;

  // Exterior lighting — front and rear entry lights
  totals["exterior_light"] = (totals["exterior_light"] || 0) + 2;

  // Doorbell
  totals["doorbell"] = (totals["doorbell"] || 0) + 1;

  // Thermostat
  totals["thermostat"] = (totals["thermostat"] || 0) + 1;

  // Panel board (every house needs one)
  if (!totals["panel_board"]) {
    totals["panel_board"] = 1;
  }

  // ── Low-voltage: Data (Cat6) and TV (Coax) outlets ──
  // Standard practice: data + TV in living areas and bedrooms
  const livingAreas = rooms.filter(
    r =>
      r.room_type === "living_room" ||
      r.room_type === "family_room" ||
      r.room_type === "primary_bedroom" ||
      r.room_type === "bedroom"
  ).length;

  if (livingAreas > 0) {
    // 1 data outlet per living area/bedroom
    totals["data_outlet"] = (totals["data_outlet"] || 0) + livingAreas;
    // 1 TV outlet in main living areas
    const mainLivingAreas = rooms.filter(
      r => r.room_type === "living_room" || r.room_type === "family_room"
    ).length;
    if (mainLivingAreas > 0) {
      totals["tv_outlet"] = (totals["tv_outlet"] || 0) + mainLivingAreas;
    }
  }

  // ── Smoke/CO detectors ──
  // Already counted per bedroom, but add hallway/basement detectors
  const hasHallway = rooms.some(r => r.room_type === "hallway");
  const hasBasement = rooms.some(
    r => r.room_type === "basement_finished" || r.room_type === "basement_unfinished"
  );

  if (hasHallway) {
    totals["smoke_co_combo"] = (totals["smoke_co_combo"] || 0) + 1;
  }
  if (hasBasement) {
    totals["smoke_co_combo"] = (totals["smoke_co_combo"] || 0) + 1;
  }

  return totals;
}

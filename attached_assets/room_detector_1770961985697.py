"""Floor Plan Only mode — room detection + CEC minimum device generation.

When a residential PDF has no electrical drawings, this module:
1. Sends architectural floor plan images to Gemini Vision
2. Identifies room types and approximate sizes
3. Applies CEC 2021 minimum device requirements per room type
4. Generates symbol counts compatible with the existing estimator
"""

import json
import io
from dataclasses import dataclass, field
from typing import Optional

from PIL import Image


@dataclass
class DetectedRoom:
    """A room identified on an architectural floor plan."""
    room_type: str          # standardized key (e.g. "kitchen", "bedroom")
    room_name: str          # label from drawing (e.g. "Primary Bedroom", "Powder Room")
    floor_level: str        # "main", "upper", "basement", etc.
    approx_area_sqft: float # estimated area from drawing
    has_sink: bool = False
    has_bathtub_shower: bool = False
    wall_count: int = 4     # usable walls for receptacle spacing
    confidence: float = 0.0
    location: list[float] = field(default_factory=list)  # [x%, y%]


@dataclass
class FloorPlanAnalysis:
    """Analysis results for one floor plan page."""
    page_number: int
    rooms: list[DetectedRoom]
    floor_level: str = ""
    total_sqft: float = 0.0
    raw_response: str = ""


# ─── Gemini Prompt for Room Detection ───

ROOM_DETECTION_PROMPT = """You are an expert residential architect analyzing an architectural floor plan drawing.

TASK: Identify EVERY room on this floor plan. For each room, determine:
1. Room type (use standardized names below)
2. Room name as labelled on the drawing
3. Approximate area in square feet (estimate from the drawing scale or proportions)
4. Whether the room has a sink (kitchen, bathroom, laundry, etc.)
5. Whether the room has a bathtub or shower
6. Number of usable walls (walls with enough space for receptacles — exclude walls with large openings, floor-to-ceiling windows, fireplaces)
7. Floor level (main, upper, lower, basement)
8. Confidence score (0.0 to 1.0)
9. Approximate x,y center location as percentages (0-100)

STANDARDIZED ROOM TYPES (use these exactly):
- kitchen
- bathroom (full bath with tub/shower + sink + toilet)
- powder_room (half bath — sink + toilet, no tub/shower)
- primary_bedroom
- bedroom
- living_room
- family_room
- dining_room
- hallway
- garage (attached)
- laundry_room
- basement_finished
- basement_unfinished
- closet_walkin
- closet_standard
- entry_foyer
- utility_room (mechanical/furnace/water heater)
- office_den
- mudroom
- pantry
- stairway
- open_to_below (double-height space, not a real room)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "floor_level": "main",
  "total_sqft": 1800,
  "rooms": [
    {
      "room_type": "kitchen",
      "room_name": "Kitchen",
      "approx_area_sqft": 180,
      "has_sink": true,
      "has_bathtub_shower": false,
      "wall_count": 3,
      "confidence": 0.90,
      "location": [45.0, 35.0]
    },
    {
      "room_type": "bathroom",
      "room_name": "Main Bathroom",
      "approx_area_sqft": 60,
      "has_sink": true,
      "has_bathtub_shower": true,
      "wall_count": 4,
      "confidence": 0.85,
      "location": [70.0, 20.0]
    }
  ]
}

IMPORTANT:
- Count ALL rooms including hallways, closets, and stairways.
- If a room label is visible on the drawing, use it for room_name.
- Estimate areas proportionally if no dimensions are shown.
- Mark has_sink=true for kitchens, bathrooms, powder rooms, laundry rooms, and any room with visible plumbing symbols.
- Mark has_bathtub_shower=true only for full bathrooms.
- For open-concept spaces (e.g., kitchen + living), list them as separate rooms if the drawing shows distinct areas.
"""


# ─── CEC 2021 Minimum Device Requirements Per Room Type ───

@dataclass
class CECRoomRequirement:
    """Minimum electrical devices for a room type per CEC 2021."""
    room_type: str
    # Receptacles
    min_receptacles: int
    receptacle_type: str  # "duplex", "gfci", "split_20a", etc.
    uses_wall_spacing_rule: bool  # True = 1.8m rule applies
    wall_spacing_m: float  # max distance from receptacle (1.8m or 4.5m for halls)
    additional_receptacles: list[dict] = field(default_factory=list)
    # Lighting
    min_lighting_outlets: int = 1
    # Switches
    min_switches: int = 1
    # Special
    needs_gfci: bool = False
    needs_afci: bool = True
    needs_exhaust_fan: bool = False
    needs_smoke_detector: bool = False
    needs_co_detector: bool = False
    dedicated_circuits: list[str] = field(default_factory=list)
    cec_rules: list[str] = field(default_factory=list)
    notes: str = ""


# CEC 2021 minimum requirements per room type
CEC_ROOM_REQUIREMENTS: dict[str, CECRoomRequirement] = {
    "kitchen": CECRoomRequirement(
        room_type="kitchen",
        min_receptacles=2,  # minimum counter receptacles (split/20A)
        receptacle_type="split_20a",
        uses_wall_spacing_rule=True,
        wall_spacing_m=0.9,  # 900mm for counter surfaces
        additional_receptacles=[
            {"type": "dedicated_receptacle", "count": 1, "note": "Refrigerator (dedicated circuit)"},
            {"type": "duplex_receptacle", "count": 2, "note": "General wall receptacles (1.8m rule)"},
        ],
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=True,
        needs_afci=False,  # kitchen counter receptacles exempt from AFCI
        needs_exhaust_fan=False,  # range hood is separate
        dedicated_circuits=["Fridge (26-654 a)", "2x counter circuits (26-656 d)"],
        cec_rules=["26-722 d)", "26-654 a)", "26-656 d)", "26-704 1)"],
        notes="Counter receptacles: no point >900mm from receptacle. Min 2 branch circuits for counter.",
    ),
    "bathroom": CECRoomRequirement(
        room_type="bathroom",
        min_receptacles=1,
        receptacle_type="gfci",
        uses_wall_spacing_rule=False,  # bathrooms excluded from 1.8m rule
        wall_spacing_m=1.0,  # within 1m of wash basin
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=True,
        needs_afci=True,
        needs_exhaust_fan=True,
        cec_rules=["26-720 f)", "26-720 g)", "26-704 1)", "30-320"],
        notes="Receptacle within 1m of basin. Min 500mm from tub/shower. Wall switch for luminaire.",
    ),
    "powder_room": CECRoomRequirement(
        room_type="powder_room",
        min_receptacles=1,
        receptacle_type="gfci",
        uses_wall_spacing_rule=False,
        wall_spacing_m=1.0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=True,
        needs_afci=True,
        cec_rules=["26-720 f)", "26-704 1)", "30-320"],
        notes="Receptacle within 1m of wash basin.",
    ),
    "primary_bedroom": CECRoomRequirement(
        room_type="primary_bedroom",
        min_receptacles=4,  # typical for a larger room with 1.8m rule
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        needs_smoke_detector=True,
        cec_rules=["26-722 a)", "26-658 1)", "32-200"],
        notes="Smoke alarm required in sleeping rooms. AFCI required.",
    ),
    "bedroom": CECRoomRequirement(
        room_type="bedroom",
        min_receptacles=3,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        needs_smoke_detector=True,
        cec_rules=["26-722 a)", "26-658 1)", "32-200"],
        notes="Smoke alarm required in sleeping rooms. AFCI required.",
    ),
    "living_room": CECRoomRequirement(
        room_type="living_room",
        min_receptacles=4,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        needs_smoke_detector=True,
        cec_rules=["26-722 a)", "26-658 1)", "32-200"],
        notes="1.8m wall spacing rule applies.",
    ),
    "family_room": CECRoomRequirement(
        room_type="family_room",
        min_receptacles=4,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        needs_smoke_detector=True,
        cec_rules=["26-722 a)", "26-658 1)"],
        notes="1.8m wall spacing rule applies.",
    ),
    "dining_room": CECRoomRequirement(
        room_type="dining_room",
        min_receptacles=3,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-722 a)", "26-658 1)"],
        notes="1.8m wall spacing rule. No face-up receptacles in surfaces.",
    ),
    "hallway": CECRoomRequirement(
        room_type="hallway",
        min_receptacles=1,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=4.5,  # hallways use 4.5m rule, not 1.8m
        min_lighting_outlets=1,
        min_switches=2,  # typically 3-way at each end
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-722 e)", "26-658 1)"],
        notes="No point >4.5m from receptacle (measured by shortest cord path).",
    ),
    "garage": CECRoomRequirement(
        room_type="garage",
        min_receptacles=1,  # per car space — calculated dynamically
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        additional_receptacles=[
            {"type": "duplex_receptacle", "count": 1, "note": "Garage door opener"},
        ],
        min_lighting_outlets=1,
        min_switches=2,  # 3-way: house entry and garage door
        needs_gfci=True,
        needs_afci=True,
        dedicated_circuits=["Garage receptacles (26-656 h)"],
        cec_rules=["26-724 b)", "26-724 c)", "26-656 h)"],
        notes="3-way from house entry. 1 receptacle per car space. Dedicated circuit.",
    ),
    "laundry_room": CECRoomRequirement(
        room_type="laundry_room",
        min_receptacles=2,  # 1 washer + 1 additional
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,  # excluded from 1.8m rule
        wall_spacing_m=0,
        additional_receptacles=[
            {"type": "dryer_outlet", "count": 1, "note": "Dryer (NEMA 14-30, dedicated)"},
        ],
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=True,  # if sink present
        needs_afci=True,
        dedicated_circuits=["Washer (26-654 b)", "Dryer (26-744 2)"],
        cec_rules=["26-720 e)", "26-654 b)", "26-744 2)", "26-704 1)"],
        notes="1 receptacle for washer (dedicated), 1 additional. Dryer on dedicated circuit.",
    ),
    "basement_finished": CECRoomRequirement(
        room_type="basement_finished",
        min_receptacles=3,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        needs_smoke_detector=True,
        cec_rules=["26-722 a)", "26-658 1)", "32-200"],
        notes="Treated as finished room. 1.8m wall spacing rule.",
    ),
    "basement_unfinished": CECRoomRequirement(
        room_type="basement_unfinished",
        min_receptacles=1,
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-720 e)(iv)", "26-658 1)"],
        notes="At least 1 duplex receptacle. Luminaires <2m must be guarded.",
    ),
    "closet_walkin": CECRoomRequirement(
        room_type="closet_walkin",
        min_receptacles=0,  # no requirement
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["30-204"],
        notes="Luminaire on ceiling or above door. No pendant or bare-lamp types.",
    ),
    "closet_standard": CECRoomRequirement(
        room_type="closet_standard",
        min_receptacles=0,
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["30-204"],
        notes="Luminaire on ceiling or above door. No pendant or bare-lamp types.",
    ),
    "entry_foyer": CECRoomRequirement(
        room_type="entry_foyer",
        min_receptacles=1,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=2,  # 3-way: inside and outside entry
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-722 a)", "26-722 b)", "26-658 1)"],
        notes="3-way switches at entry. 1.8m rule if finished room.",
    ),
    "utility_room": CECRoomRequirement(
        room_type="utility_room",
        min_receptacles=1,
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=True,  # likely has sink or water heater nearby
        needs_afci=True,
        cec_rules=["26-720 e)(iii)", "26-704 1)"],
        notes="At least 1 duplex receptacle. GFCI if sink present.",
    ),
    "office_den": CECRoomRequirement(
        room_type="office_den",
        min_receptacles=3,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-722 a)", "26-658 1)"],
        notes="Standard room. 1.8m wall spacing rule.",
    ),
    "mudroom": CECRoomRequirement(
        room_type="mudroom",
        min_receptacles=1,
        receptacle_type="duplex",
        uses_wall_spacing_rule=True,
        wall_spacing_m=1.8,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["26-722 a)"],
        notes="Treated as entry/finished room.",
    ),
    "pantry": CECRoomRequirement(
        room_type="pantry",
        min_receptacles=0,
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=1,
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["30-204"],
        notes="Treated like a closet — luminaire on ceiling or above door.",
    ),
    "stairway": CECRoomRequirement(
        room_type="stairway",
        min_receptacles=0,
        receptacle_type="duplex",
        uses_wall_spacing_rule=False,
        wall_spacing_m=0,
        min_lighting_outlets=1,
        min_switches=2,  # 3-way switches top and bottom
        needs_gfci=False,
        needs_afci=True,
        cec_rules=["30-200"],
        notes="3-way switches at top and bottom of stairs.",
    ),
}


def calculate_receptacles_from_area(
    room: DetectedRoom, requirement: CECRoomRequirement
) -> int:
    """Calculate receptacle count using CEC wall spacing rules and room area.

    For rooms using the 1.8m rule: estimate wall perimeter from area,
    subtract openings, and calculate how many receptacles are needed so
    no point is further than wall_spacing_m from a receptacle.
    """
    if not requirement.uses_wall_spacing_rule:
        return requirement.min_receptacles

    # Estimate perimeter from area (assume roughly rectangular)
    sqft = max(room.approx_area_sqft, 50)
    side_ft = sqft ** 0.5
    perimeter_ft = side_ft * 4

    # Convert spacing rule to feet (1 m = 3.28 ft)
    spacing_ft = requirement.wall_spacing_m * 3.28

    # Each receptacle covers 2x the spacing distance (one on each side)
    coverage_ft = spacing_ft * 2

    # Subtract ~30% for doorways, windows, closets, and corners
    usable_perimeter = perimeter_ft * 0.70

    count = max(round(usable_perimeter / coverage_ft), requirement.min_receptacles)
    # Cap: even a very large room rarely needs more than 8 duplex receptacles
    count = min(count, 8)
    return count


def generate_devices_for_room(
    room: DetectedRoom,
) -> dict[str, int]:
    """Generate CEC-minimum device counts for a single detected room.

    Returns a dict of symbol_type -> count, compatible with the estimator.
    """
    req = CEC_ROOM_REQUIREMENTS.get(room.room_type)
    if req is None:
        # Unknown room type — apply minimal defaults
        return {"duplex_receptacle": 1, "surface_mount_light": 1, "single_pole_switch": 1}

    devices: dict[str, int] = {}

    # ── Receptacles ──
    if room.room_type == "kitchen":
        # Counter receptacles (split or 20A GFCI)
        devices["gfci_receptacle"] = max(req.min_receptacles, 3)
        # Fridge dedicated
        devices["dedicated_receptacle"] = 1
        # General wall receptacles
        wall_recepts = calculate_receptacles_from_area(room, CECRoomRequirement(
            room_type="kitchen_walls",
            min_receptacles=2,
            receptacle_type="duplex",
            uses_wall_spacing_rule=True,
            wall_spacing_m=1.8,
        ))
        devices["duplex_receptacle"] = wall_recepts
        # Range hood
        devices["range_hood_fan"] = 1
    elif room.room_type in ("bathroom", "powder_room"):
        devices["gfci_receptacle"] = req.min_receptacles
    elif room.room_type == "garage":
        # 1 per car space — estimate from area
        car_spaces = max(1, int(room.approx_area_sqft / 250))
        devices["duplex_receptacle"] = car_spaces + 1  # +1 for door opener
    elif room.room_type == "laundry_room":
        devices["duplex_receptacle"] = 2  # washer + additional
        devices["dryer_outlet"] = 1
    else:
        # Standard rooms with wall spacing calculation
        count = calculate_receptacles_from_area(room, req)
        if req.receptacle_type == "gfci":
            devices["gfci_receptacle"] = count
        else:
            devices["duplex_receptacle"] = count

    # Additional receptacles from requirement
    for extra in req.additional_receptacles:
        sym = extra["type"]
        devices[sym] = devices.get(sym, 0) + extra["count"]

    # ── Lighting ──
    if req.min_lighting_outlets > 0:
        if room.room_type in ("closet_walkin", "closet_standard", "pantry"):
            devices["surface_mount_light"] = 1
        elif room.room_type == "kitchen":
            # Recessed lights proportional to area
            pot_count = max(4, int(room.approx_area_sqft / 30))
            devices["recessed_light"] = pot_count
        elif room.room_type in ("bathroom", "powder_room"):
            devices["surface_mount_light"] = 1
        elif room.room_type in ("living_room", "family_room", "primary_bedroom"):
            pot_count = max(4, int(room.approx_area_sqft / 40))
            devices["recessed_light"] = pot_count
        elif room.room_type == "garage":
            devices["fluorescent_light"] = max(1, int(room.approx_area_sqft / 200))
        elif room.room_type == "basement_unfinished":
            devices["fluorescent_light"] = max(1, int(room.approx_area_sqft / 200))
        else:
            devices["surface_mount_light"] = req.min_lighting_outlets

    # ── Switches ──
    if req.min_switches > 0:
        if req.min_switches >= 2:
            # 3-way switch pair (hallway, stairway, entry, garage)
            devices["three_way_switch"] = 2
        else:
            devices["single_pole_switch"] = 1

        # Additional switches for rooms with multiple light groups
        total_lights = sum(
            v for k, v in devices.items()
            if any(lw in k for lw in ("light", "pot_light", "fluorescent", "fan"))
        )
        if total_lights > 4 and room.room_type not in ("hallway", "stairway"):
            # Separate switch for each light group beyond the first
            # Kitchen: pot lights + range hood = 2 switches minimum
            # Living room with 6+ pots: consider dimmer
            extra_switches = max(0, (total_lights - 1) // 4)
            if room.room_type == "kitchen":
                extra_switches = max(extra_switches, 1)  # range hood switch
            devices["single_pole_switch"] = devices.get("single_pole_switch", 0) + extra_switches

        # Large rooms (>200 sqft) with single entrance still get single-pole,
        # but primary bedroom and living rooms > 250 sqft should get 3-way
        if room.approx_area_sqft >= 250 and room.room_type in (
            "primary_bedroom", "living_room", "family_room",
            "basement_finished",
        ):
            if "three_way_switch" not in devices:
                devices["three_way_switch"] = 2
                # Convert one single_pole to 3-way
                if devices.get("single_pole_switch", 0) > 0:
                    devices["single_pole_switch"] -= 1

    # ── Exhaust Fan ──
    if req.needs_exhaust_fan:
        devices["exhaust_fan"] = 1

    # ── Smoke Detector ──
    if req.needs_smoke_detector:
        devices["smoke_co_combo"] = 1

    return devices


def generate_whole_house_devices(
    all_rooms: list[DetectedRoom],
) -> dict[str, int]:
    """Generate CEC-minimum devices for all rooms, plus whole-house requirements.

    Returns aggregated symbol_type -> count dict for the estimator.
    """
    totals: dict[str, int] = {}

    for room in all_rooms:
        room_devices = generate_devices_for_room(room)
        for sym, count in room_devices.items():
            totals[sym] = totals.get(sym, 0) + count

    # ── Whole-house requirements ──

    # Exterior receptacle (Rule 26-724 a) — at least 1 outdoor GFCI
    totals["outdoor_receptacle"] = totals.get("outdoor_receptacle", 0) + 1

    # Exterior lighting — front and rear entry lights
    totals["exterior_light"] = totals.get("exterior_light", 0) + 2

    # Doorbell
    totals["doorbell"] = totals.get("doorbell", 0) + 1

    # Thermostat
    totals["thermostat"] = totals.get("thermostat", 0) + 1

    # Panel board (every house needs one)
    if totals.get("panel_board", 0) == 0:
        totals["panel_board"] = 1

    # ── Low-voltage: Data (Cat6) and TV (Coax) outlets ──
    # Standard practice: data + TV in living areas and bedrooms
    data_rooms = sum(
        1 for r in all_rooms
        if r.room_type in (
            "living_room", "family_room", "primary_bedroom", "bedroom",
            "office_den", "basement_finished",
        )
    )
    totals["data_outlet"] = totals.get("data_outlet", 0) + max(data_rooms, 1)

    tv_rooms = sum(
        1 for r in all_rooms
        if r.room_type in (
            "living_room", "family_room", "primary_bedroom",
            "basement_finished",
        )
    )
    totals["tv_outlet"] = totals.get("tv_outlet", 0) + max(tv_rooms, 1)

    # Ensure smoke/CO in hallways near bedrooms if not already covered
    bedroom_count = sum(
        1 for r in all_rooms if r.room_type in ("bedroom", "primary_bedroom")
    )
    hallway_count = sum(1 for r in all_rooms if r.room_type == "hallway")
    smoke_count = totals.get("smoke_co_combo", 0)

    # CEC/NBC requires smoke alarms in each sleeping room + outside sleeping areas
    # Add hallway smoke detectors
    if hallway_count > 0 and smoke_count < bedroom_count + hallway_count:
        totals["smoke_co_combo"] = bedroom_count + max(hallway_count, 1)

    # Basement stair smoke detector
    has_basement = any(
        r.room_type in ("basement_finished", "basement_unfinished") for r in all_rooms
    )
    if has_basement:
        totals["smoke_co_combo"] = totals.get("smoke_co_combo", 0) + 1

    return totals


def rooms_from_table_data(
    table_rows: list[dict],
) -> list[DetectedRoom]:
    """Convert extracted room table data into DetectedRoom objects.

    table_rows: list of {"name": str, "area_sqft": float, "level": str}
    """
    from sparkestimate.core.pdf_processor import _ROOM_TYPE_MAP, _LEVEL_MAP

    rooms = []
    for row in table_rows:
        name = row.get("name", "")
        area = row.get("area_sqft", 0)
        level_raw = row.get("level", "")

        # Classify room type from name
        room_type = _classify_room_type(name)

        # Normalize floor level
        level_lower = level_raw.lower().strip()
        floor_level = _LEVEL_MAP.get(level_lower, level_raw)

        # Infer plumbing
        has_sink = room_type in (
            "kitchen", "bathroom", "powder_room", "laundry_room", "utility_room",
        )
        has_bathtub = room_type == "bathroom"

        rooms.append(DetectedRoom(
            room_type=room_type,
            room_name=name,
            floor_level=floor_level,
            approx_area_sqft=area,
            has_sink=has_sink,
            has_bathtub_shower=has_bathtub,
            wall_count=4,
            confidence=1.0,  # table data is high confidence
            location=[],
        ))

    return rooms


def _classify_room_type(name: str) -> str:
    """Map a room name from a PDF table to a standardized room type."""
    from sparkestimate.core.pdf_processor import _ROOM_TYPE_MAP

    name_lower = name.lower().strip()

    # Try exact match first
    if name_lower in _ROOM_TYPE_MAP:
        return _ROOM_TYPE_MAP[name_lower]

    # Try partial match (longest match first to prefer "primary bedroom" over "bedroom")
    sorted_keys = sorted(_ROOM_TYPE_MAP.keys(), key=len, reverse=True)
    for key in sorted_keys:
        if key in name_lower:
            return _ROOM_TYPE_MAP[key]

    # Default: treat as bedroom if "bedroom" variants, otherwise generic room
    if any(kw in name_lower for kw in ("bed", "bdrm", "br ")):
        return "bedroom"

    return "office_den"  # safe default for unlabelled rooms


class RoomDetector:
    """Detects rooms from architectural floor plans using Gemini Vision."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def detect_rooms(
        self, img: Image.Image, page_number: int = 0
    ) -> FloorPlanAnalysis:
        """Analyze a single floor plan page for rooms."""
        client = self._get_client()

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_bytes = buf.getvalue()

        from google.genai import types

        response = client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=ROOM_DETECTION_PROMPT),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=4096,
            ),
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        return self._parse_response(raw_text, page_number)

    def _parse_response(
        self, raw_text: str, page_number: int
    ) -> FloorPlanAnalysis:
        """Parse the JSON response into structured room data."""
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            return FloorPlanAnalysis(
                page_number=page_number,
                rooms=[],
                raw_response=raw_text,
            )

        rooms = []
        for rm in data.get("rooms", []):
            rooms.append(
                DetectedRoom(
                    room_type=rm.get("room_type", "unknown"),
                    room_name=rm.get("room_name", "Unknown Room"),
                    floor_level=rm.get("floor_level", data.get("floor_level", "")),
                    approx_area_sqft=rm.get("approx_area_sqft", 0),
                    has_sink=rm.get("has_sink", False),
                    has_bathtub_shower=rm.get("has_bathtub_shower", False),
                    wall_count=rm.get("wall_count", 4),
                    confidence=rm.get("confidence", 0.0),
                    location=rm.get("location", []),
                )
            )

        return FloorPlanAnalysis(
            page_number=page_number,
            rooms=rooms,
            floor_level=data.get("floor_level", ""),
            total_sqft=data.get("total_sqft", 0),
            raw_response=raw_text,
        )

    def analyze_floor_plans(
        self, images: dict[int, Image.Image]
    ) -> list[FloorPlanAnalysis]:
        """Analyze multiple floor plan pages."""
        results = []
        for page_num, img in sorted(images.items()):
            analysis = self.detect_rooms(img, page_num)
            results.append(analysis)
        return results

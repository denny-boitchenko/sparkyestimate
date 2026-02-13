"""Wire distance calculation from panel placement.

When the user places the panel and meter on the drawing, we can
calculate estimated wire distances from the panel to each room's
centroid, replacing the flat default wire allowances with
distance-based estimates.

The calculation uses the Manhattan distance (not straight line),
multiplied by a routing factor to account for real-world cable
paths along joists, studs, and through walls.
"""

from __future__ import annotations
from dataclasses import dataclass

# Routing factor: cables don't run straight; they follow studs/joists
# Industry practice: multiply straight-line by 1.4-1.6 for residential
ROUTING_FACTOR = 1.5

# Vertical run addition per floor difference (in feet)
# Accounts for dropping through plates, going up/down stairwells
VERTICAL_PER_FLOOR_FT = 12.0

# Extra slack per device for make-up (connections in box)
DEVICE_MAKEUP_FT = 3.0

# Floor-level ordering for vertical distance calculation
FLOOR_ORDER = {
    "basement": 0,
    "basement_unfinished": 0,
    "basement_finished": 0,
    "main": 1,
    "upper": 2,
    "upper_2": 3,
}


@dataclass
class WireDistanceResult:
    """Wire distance calculation result for one room."""
    room_name: str
    room_type: str
    floor_level: str
    straight_line_ft: float   # Euclidean distance on drawing
    manhattan_ft: float       # Manhattan distance (dx + dy)
    routed_ft: float          # After routing factor
    vertical_ft: float        # Vertical run for floor difference
    total_per_device_ft: float  # Final per-device wire allowance
    devices_in_room: int
    total_room_wire_ft: float


def calculate_wire_distances(
    panel_location: tuple[float, float],
    rooms: list,
    room_device_counts: dict[int, dict[str, int]] | None = None,
    drawing_scale_ft: float = 0.0,
    house_perimeter_ft: float = 80.0,
    panel_floor: str = "",
    meter_floor: str = "",
) -> list[WireDistanceResult]:
    """Calculate wire distances from panel to each room.

    Args:
        panel_location: (x%, y%) of panel placement on drawing
        rooms: list of DetectedRoom objects
        room_device_counts: dict of room_index -> {symbol_type: count}
        drawing_scale_ft: if known, the feet-per-percent scale of the drawing.
            If 0, we estimate from house_perimeter_ft.
        house_perimeter_ft: estimated house perimeter for scale estimation.
            Default 80ft (approx 1200 sqft house).
        panel_floor: user-selected floor for panel (e.g. "basement", "main").
            If empty, auto-detected from rooms.
        meter_floor: user-selected floor for meter. Stored for reference
            but wire runs are calculated from panel, not meter.

    Returns:
        list of WireDistanceResult for each room
    """
    if not panel_location or not rooms:
        return []

    px, py = panel_location

    # Estimate drawing scale if not provided
    if drawing_scale_ft <= 0:
        house_width_ft = house_perimeter_ft / 4
        drawing_span_pct = 60.0
        drawing_scale_ft = house_width_ft / drawing_span_pct

    # Use user-selected panel floor, or auto-detect
    if not panel_floor:
        panel_floor = _guess_panel_floor(rooms)

    results = []
    for i, room in enumerate(rooms):
        # Get room centroid
        if room.location and len(room.location) >= 2:
            rx, ry = room.location[0], room.location[1]
        else:
            # No location — fall back to grid estimate
            rx, ry = 50.0, 50.0  # center of drawing

        # Pixel distance (in percent units)
        dx_pct = abs(px - rx)
        dy_pct = abs(py - ry)

        # Convert to feet
        dx_ft = dx_pct * drawing_scale_ft
        dy_ft = dy_pct * drawing_scale_ft

        straight_ft = (dx_ft**2 + dy_ft**2) ** 0.5
        manhattan_ft = dx_ft + dy_ft

        # Apply routing factor
        routed_ft = manhattan_ft * ROUTING_FACTOR

        # Vertical run for floor differences
        room_floor_num = FLOOR_ORDER.get(room.floor_level, 1)
        panel_floor_num = FLOOR_ORDER.get(panel_floor, 1)
        floor_diff = abs(room_floor_num - panel_floor_num)
        vertical_ft = floor_diff * VERTICAL_PER_FLOOR_FT

        # Per-device wire allowance
        per_device_ft = routed_ft + vertical_ft + DEVICE_MAKEUP_FT

        # Minimum realistic wire run (even adjacent rooms need some wire)
        per_device_ft = max(per_device_ft, 10.0)

        # Count devices in this room
        if room_device_counts and i in room_device_counts:
            device_count = sum(room_device_counts[i].values())
        else:
            device_count = 0

        total_wire = per_device_ft * device_count if device_count > 0 else 0

        results.append(WireDistanceResult(
            room_name=room.room_name,
            room_type=room.room_type,
            floor_level=room.floor_level or "main",
            straight_line_ft=round(straight_ft, 1),
            manhattan_ft=round(manhattan_ft, 1),
            routed_ft=round(routed_ft, 1),
            vertical_ft=round(vertical_ft, 1),
            total_per_device_ft=round(per_device_ft, 1),
            devices_in_room=device_count,
            total_room_wire_ft=round(total_wire, 0),
        ))

    return results


def _guess_panel_floor(rooms: list) -> str:
    """Guess which floor the panel is on based on room data.

    Panels are typically in the basement (if exists) or main floor.
    """
    floor_types = {r.floor_level for r in rooms if r.floor_level}
    if "basement" in floor_types or "basement_unfinished" in floor_types:
        return "basement"
    return "main"


def override_wire_allowances(
    wire_results: list[WireDistanceResult],
    room_device_counts: dict[int, dict[str, int]],
    rooms: list,
    assemblies: dict,
) -> dict[str, float]:
    """Generate updated wire allowance overrides per device type
    based on calculated distances.

    Returns a dict of symbol_type -> average_wire_ft_per_device
    computed from the distance results.
    """
    # Accumulate total wire and count per symbol type across all rooms
    type_totals: dict[str, list[float]] = {}

    for i, result in enumerate(wire_results):
        if i not in room_device_counts:
            continue
        per_device = result.total_per_device_ft
        for sym_type, count in room_device_counts[i].items():
            if sym_type not in type_totals:
                type_totals[sym_type] = []
            for _ in range(count):
                type_totals[sym_type].append(per_device)

    # Calculate weighted average per type
    overrides = {}
    for sym_type, distances in type_totals.items():
        if distances:
            avg = sum(distances) / len(distances)
            overrides[sym_type] = round(avg, 1)

    return overrides

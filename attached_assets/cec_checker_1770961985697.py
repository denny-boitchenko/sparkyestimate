"""CEC 2021 compliance checker for residential electrical estimates.

Checks the user's device counts against CEC minimum requirements
and generates a report of violations, warnings, and passes.
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class CheckResult:
    """A single compliance check result."""
    severity: str          # "FAIL", "WARNING", "PASS", "INFO"
    rule: str              # CEC rule reference
    room: str              # room name or "Whole House"
    description: str       # human-readable description
    recommendation: str    # what to fix


@dataclass
class ComplianceReport:
    """Full CEC compliance report."""
    total_checks: int
    passes: int
    warnings: int
    failures: int
    results: list[CheckResult]
    score_pct: float  # 0-100 compliance score


def check_compliance(
    symbol_counts: dict[str, int],
    detected_rooms: list,
    dwelling_type: str = "single",
) -> ComplianceReport:
    """Run CEC 2021 compliance checks against the estimate.

    Args:
        symbol_counts: device type -> quantity
        detected_rooms: list of DetectedRoom objects
        dwelling_type: "single", "duplex", etc.

    Returns:
        ComplianceReport with all check results
    """
    results: list[CheckResult] = []

    # ── Whole-House Checks ──
    _check_smoke_detectors(results, symbol_counts, detected_rooms)
    _check_panel(results, symbol_counts)
    _check_outdoor_receptacle(results, symbol_counts)
    _check_exterior_lighting(results, symbol_counts)
    _check_doorbell(results, symbol_counts)
    _check_thermostat(results, symbol_counts)
    _check_data_outlets(results, symbol_counts, detected_rooms)

    # ── Room-Specific Checks ──
    from sparkestimate.core.room_detector import CEC_ROOM_REQUIREMENTS

    for room in detected_rooms:
        req = CEC_ROOM_REQUIREMENTS.get(room.room_type)
        if not req:
            continue

        room_label = f"{room.room_name} ({room.room_type.replace('_', ' ').title()})"

        # Check GFCI where required
        if req.needs_gfci:
            _check_room_gfci(results, symbol_counts, room, room_label)

        # Check exhaust fan where required
        if req.needs_exhaust_fan:
            _check_room_exhaust(results, symbol_counts, room, room_label)

        # Check bathroom-specific rules
        if room.room_type in ("bathroom", "ensuite"):
            _check_bathroom_rules(results, symbol_counts, room, room_label)

        # Check kitchen-specific rules
        if room.room_type == "kitchen":
            _check_kitchen_rules(results, symbol_counts, room, room_label)

        # Check garage rules
        if room.room_type == "garage":
            _check_garage_rules(results, symbol_counts, room, room_label)

    # ── Switch/Light Checks ──
    _check_switch_light_ratio(results, symbol_counts)

    # ── AFCI Checks ──
    _check_afci_coverage(results, symbol_counts, detected_rooms)

    # ── Circuit Load Checks ──
    _check_circuit_loading(results, symbol_counts, detected_rooms)

    # Calculate score — INFO items are reminders, not scored checks
    infos = sum(1 for r in results if r.severity == "INFO")
    passes = sum(1 for r in results if r.severity == "PASS")
    warnings = sum(1 for r in results if r.severity == "WARNING")
    failures = sum(1 for r in results if r.severity == "FAIL")
    scored_checks = passes + warnings + failures  # exclude INFO
    score = (passes / scored_checks * 100) if scored_checks > 0 else 100

    return ComplianceReport(
        total_checks=len(results),
        passes=passes,
        warnings=warnings,
        failures=failures,
        results=results,
        score_pct=round(score, 1),
    )


# ─── Whole-House Checks ───

def _check_smoke_detectors(results, counts, rooms):
    """CEC 32-110 / NBC: Smoke alarms in each bedroom + outside sleeping areas."""
    bedroom_count = sum(
        1 for r in rooms if r.room_type in ("bedroom", "primary_bedroom")
    )
    # Need smoke in each bedroom + at least one per floor with bedrooms
    # Plus hallways outside sleeping areas
    min_smoke = max(bedroom_count + 1, 3)  # at minimum 3 for any house

    smoke_count = counts.get("smoke_co_combo", 0) + counts.get("smoke_detector", 0)

    if smoke_count >= min_smoke:
        results.append(CheckResult(
            "PASS", "CEC 32-110 / NBC 9.10.19",
            "Whole House",
            f"Smoke/CO detectors: {smoke_count} (min {min_smoke} required)",
            "",
        ))
    elif smoke_count > 0:
        results.append(CheckResult(
            "WARNING", "CEC 32-110 / NBC 9.10.19",
            "Whole House",
            f"Smoke/CO detectors: {smoke_count}, recommended minimum is {min_smoke}",
            f"Add {min_smoke - smoke_count} more smoke/CO detectors (each bedroom + hallway outside bedrooms + each floor)",
        ))
    else:
        results.append(CheckResult(
            "FAIL", "CEC 32-110 / NBC 9.10.19",
            "Whole House",
            "No smoke/CO detectors found",
            f"Add at least {min_smoke} hardwired smoke/CO detectors",
        ))


def _check_panel(results, counts):
    """Every dwelling needs at least one panel board."""
    if counts.get("panel_board", 0) >= 1:
        results.append(CheckResult(
            "PASS", "CEC 26-400",
            "Whole House",
            "Panel board present",
            "",
        ))
    else:
        results.append(CheckResult(
            "FAIL", "CEC 26-400",
            "Whole House",
            "No panel board in estimate",
            "Add a panel board (load center)",
        ))


def _check_outdoor_receptacle(results, counts):
    """CEC 26-724 f): At least one outdoor weatherproof receptacle."""
    if counts.get("outdoor_receptacle", 0) >= 1:
        results.append(CheckResult(
            "PASS", "CEC 26-724 f)",
            "Whole House",
            f"Outdoor receptacle(s): {counts.get('outdoor_receptacle', 0)}",
            "",
        ))
    else:
        results.append(CheckResult(
            "FAIL", "CEC 26-724 f)",
            "Whole House",
            "No outdoor receptacle found",
            "Add at least 1 weather-resistant outdoor GFCI receptacle",
        ))


def _check_exterior_lighting(results, counts):
    """At least one exterior light at main entrance."""
    if counts.get("exterior_light", 0) >= 1:
        results.append(CheckResult(
            "PASS", "CEC 30-102",
            "Whole House",
            f"Exterior lights: {counts.get('exterior_light', 0)}",
            "",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "CEC 30-102",
            "Whole House",
            "No exterior lighting found",
            "Add at least 1 exterior light at main entrance",
        ))


def _check_doorbell(results, counts):
    if counts.get("doorbell", 0) >= 1:
        results.append(CheckResult(
            "PASS", "General",
            "Whole House",
            "Doorbell present",
            "",
        ))
    else:
        results.append(CheckResult(
            "INFO", "General",
            "Whole House",
            "No doorbell in estimate",
            "Consider adding a doorbell/chime (standard for new construction)",
        ))


def _check_thermostat(results, counts):
    if counts.get("thermostat", 0) >= 1:
        results.append(CheckResult(
            "PASS", "General",
            "Whole House",
            "Thermostat present",
            "",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "General",
            "Whole House",
            "No thermostat in estimate",
            "Add thermostat wiring (low voltage)",
        ))


def _check_data_outlets(results, counts, rooms):
    """Check for data/communication outlets."""
    data_count = counts.get("data_outlet", 0) + counts.get("tv_outlet", 0)
    if data_count >= 2:
        results.append(CheckResult(
            "PASS", "CEC 60-100",
            "Whole House",
            f"Data/communication outlets: {data_count}",
            "",
        ))
    elif data_count > 0:
        results.append(CheckResult(
            "WARNING", "CEC 60-100",
            "Whole House",
            f"Only {data_count} data/communication outlet(s)",
            "Consider adding Cat6/coax outlets in main living areas and bedrooms",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "CEC 60-100",
            "Whole House",
            "No data or TV outlets in estimate",
            "Add Cat6 data outlets and TV (coax) outlets in living areas",
        ))


# ─── Room-Specific Checks ───

def _check_room_gfci(results, counts, room, room_label):
    """Check GFCI protection for rooms that need it."""
    gfci_count = counts.get("gfci_receptacle", 0)
    rooms_needing_gfci = sum(
        1 for r in [room]
        if r.room_type in ("bathroom", "ensuite", "powder_room", "kitchen",
                            "garage", "laundry_room", "mudroom")
    )
    if gfci_count > 0:
        results.append(CheckResult(
            "PASS", "CEC 26-700",
            room_label,
            "GFCI protection available for this wet/damp location",
            "",
        ))
    else:
        results.append(CheckResult(
            "FAIL", "CEC 26-700",
            room_label,
            f"GFCI required in {room.room_type.replace('_', ' ')} but none found in estimate",
            "Add GFCI receptacle for this location",
        ))


def _check_room_exhaust(results, counts, room, room_label):
    """Check exhaust fan for bathrooms."""
    exhaust_count = counts.get("exhaust_fan", 0)
    bathrooms = 1  # the room we're checking
    if exhaust_count >= bathrooms:
        results.append(CheckResult(
            "PASS", "NBC 9.32 / CEC 30-320",
            room_label,
            "Exhaust fan present for this bathroom",
            "",
        ))
    else:
        results.append(CheckResult(
            "FAIL", "NBC 9.32 / CEC 30-320",
            room_label,
            "No exhaust fan — required for bathrooms without operable window",
            "Add exhaust fan (min 50 CFM for standard bath, 100+ CFM for large)",
        ))


def _check_bathroom_rules(results, counts, room, room_label):
    """Bathroom-specific: receptacle within 1m of basin, min 500mm from tub."""
    results.append(CheckResult(
        "INFO", "CEC 26-720 f)",
        room_label,
        "Ensure receptacle is within 1m of wash basin and min 500mm from tub/shower",
        "Verify placement during rough-in. GFCI required.",
    ))


def _check_kitchen_rules(results, counts, room, room_label):
    """Kitchen: min 2 counter circuits, fridge dedicated, range hood."""
    dedicated = counts.get("dedicated_receptacle", 0)
    if dedicated >= 1:
        results.append(CheckResult(
            "PASS", "CEC 26-654 a)",
            room_label,
            f"Dedicated receptacle(s) present ({dedicated})",
            "",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "CEC 26-654 a)",
            room_label,
            "No dedicated receptacle found (fridge needs dedicated circuit)",
            "Add dedicated receptacle for refrigerator",
        ))

    range_hood = counts.get("range_hood_fan", 0)
    if range_hood >= 1:
        results.append(CheckResult(
            "PASS", "NBC 9.32",
            room_label,
            "Range hood/exhaust present",
            "",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "NBC 9.32",
            room_label,
            "No range hood/kitchen exhaust found",
            "Add range hood fan (vented to exterior for new construction)",
        ))


def _check_garage_rules(results, counts, room, room_label):
    """Garage: GFCI required, receptacle per car space."""
    results.append(CheckResult(
        "INFO", "CEC 26-724 b)",
        room_label,
        "Garage requires GFCI-protected receptacles and 3-way switching",
        "Verify GFCI protection and 3-way switch from house entry to garage door",
    ))


# ─── General Checks ───

def _check_switch_light_ratio(results, counts):
    """Sanity check: switches should roughly correlate with lights."""
    total_lights = sum(
        counts.get(t, 0) for t in (
            "recessed_light", "surface_mount_light", "pendant_light",
            "track_lighting", "fluorescent_light", "ceiling_fan_light",
            "under_cabinet_light",
        )
    )
    total_switches = sum(
        counts.get(t, 0) for t in (
            "single_pole_switch", "three_way_switch", "four_way_switch",
            "dimmer_switch",
        )
    )

    if total_lights == 0 and total_switches == 0:
        return

    ratio = total_switches / max(total_lights, 1)
    if 0.2 <= ratio <= 1.5:
        results.append(CheckResult(
            "PASS", "General",
            "Whole House",
            f"Switch-to-light ratio: {total_switches} switches / {total_lights} lights ({ratio:.2f})",
            "",
        ))
    elif ratio < 0.2:
        results.append(CheckResult(
            "WARNING", "General",
            "Whole House",
            f"Very few switches ({total_switches}) for {total_lights} lights",
            "Check that all light locations have proper switch control",
        ))
    else:
        results.append(CheckResult(
            "INFO", "General",
            "Whole House",
            f"High switch count ({total_switches}) for {total_lights} lights — may include multi-location control",
            "",
        ))


def _check_afci_coverage(results, counts, rooms):
    """CEC 26-656: AFCI required for bedroom circuits."""
    bedroom_count = sum(
        1 for r in rooms if r.room_type in ("bedroom", "primary_bedroom")
    )
    if bedroom_count == 0:
        return

    results.append(CheckResult(
        "INFO", "CEC 26-656 1)",
        "Whole House",
        f"{bedroom_count} bedroom(s) detected — AFCI breakers required for bedroom circuits",
        "Ensure all bedroom branch circuits use combination AFCI breakers",
    ))


def _check_circuit_loading(results, counts, rooms):
    """Basic circuit loading sanity check."""
    total_receptacles = sum(
        counts.get(t, 0) for t in (
            "duplex_receptacle", "gfci_receptacle", "dedicated_receptacle",
            "outdoor_receptacle",
        )
    )
    total_lights = sum(
        counts.get(t, 0) for t in (
            "recessed_light", "surface_mount_light", "pendant_light",
            "track_lighting", "fluorescent_light",
        )
    )

    # Rule of thumb: max 12 devices per 15A circuit
    estimated_circuits_needed = (total_receptacles + total_lights) // 12 + 1

    if estimated_circuits_needed <= 20:
        results.append(CheckResult(
            "PASS", "CEC 8-200",
            "Whole House",
            f"Estimated general circuits needed: ~{estimated_circuits_needed} "
            f"({total_receptacles} receptacles + {total_lights} lights)",
            "",
        ))
    else:
        results.append(CheckResult(
            "WARNING", "CEC 8-200",
            "Whole House",
            f"High device count may require larger panel — ~{estimated_circuits_needed} circuits needed",
            "Consider 200A panel with 40+ spaces",
        ))

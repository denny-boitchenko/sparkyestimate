"""Sanity check rules to catch obvious AI hallucination errors.

These rules flag counts that are implausible for residential electrical work.
They don't replace human review but catch the worst AI mistakes.
"""

from dataclasses import dataclass


@dataclass
class SanityWarning:
    rule: str
    message: str
    severity: str  # "error", "warning", "info"
    symbol_type: str = ""


def check_counts(
    symbol_counts: dict[str, int], house_sqft: float = 0
) -> list[SanityWarning]:
    """Run sanity checks on symbol counts. Returns list of warnings."""
    warnings: list[SanityWarning] = []
    total_devices = sum(symbol_counts.values())

    # --- Absolute maximums (per floor, residential) ---
    max_rules = {
        "duplex_receptacle": (80, "More than 80 outlets seems excessive for residential"),
        "gfci_receptacle": (20, "More than 20 GFCI outlets is unusual"),
        "single_pole_switch": (50, "More than 50 switches seems high for residential"),
        "recessed_light": (100, "More than 100 pot lights is very high"),
        "pot_light": (100, "More than 100 pot lights is very high"),
        "smoke_detector": (20, "More than 20 smoke detectors is unusual for residential"),
        "panel_board": (3, "More than 3 panels is unusual for residential"),
        "exhaust_fan": (10, "More than 10 exhaust fans is unusual"),
    }

    for sym, (max_count, msg) in max_rules.items():
        count = symbol_counts.get(sym, 0)
        if count > max_count:
            warnings.append(SanityWarning(
                rule="max_count",
                message=f"{sym}: {count} found. {msg}",
                severity="warning",
                symbol_type=sym,
            ))

    # --- Minimum requirements (CEC residential) ---
    smoke_count = (
        symbol_counts.get("smoke_detector", 0)
        + symbol_counts.get("smoke_co_combo", 0)
    )
    if total_devices > 5 and smoke_count == 0:
        warnings.append(SanityWarning(
            rule="cec_minimum",
            message="No smoke detectors found. CEC requires hardwired smoke detectors in residential.",
            severity="error",
            symbol_type="smoke_detector",
        ))

    # GFCI near wet areas
    gfci_count = (
        symbol_counts.get("gfci_receptacle", 0)
        + symbol_counts.get("outdoor_receptacle", 0)
    )
    if total_devices > 10 and gfci_count == 0:
        warnings.append(SanityWarning(
            rule="cec_minimum",
            message="No GFCI receptacles found. CEC requires GFCI in kitchens, bathrooms, outdoors, garages.",
            severity="error",
            symbol_type="gfci_receptacle",
        ))

    # Panel board
    panel_count = (
        symbol_counts.get("panel_board", 0)
        + symbol_counts.get("subpanel", 0)
    )
    if total_devices > 10 and panel_count == 0:
        warnings.append(SanityWarning(
            rule="missing_panel",
            message="No panel board found. Every residential service needs at least one panel.",
            severity="warning",
            symbol_type="panel_board",
        ))

    # --- Ratio checks ---
    # Switches should roughly correlate with light fixtures
    total_switches = sum(
        symbol_counts.get(s, 0)
        for s in ["single_pole_switch", "three_way_switch", "four_way_switch", "dimmer_switch"]
    )
    total_lights = sum(
        symbol_counts.get(s, 0)
        for s in [
            "recessed_light", "pot_light", "surface_mount_light",
            "pendant_light", "wall_sconce", "exterior_light",
            "track_light", "fluorescent_light", "led_panel_light",
        ]
    )
    if total_lights > 5 and total_switches == 0:
        warnings.append(SanityWarning(
            rule="ratio_check",
            message=f"{total_lights} lights found but 0 switches. Lights need switches.",
            severity="warning",
        ))
    if total_switches > 5 and total_lights == 0:
        warnings.append(SanityWarning(
            rule="ratio_check",
            message=f"{total_switches} switches found but 0 lights. Check if lights were missed.",
            severity="warning",
        ))

    # --- Square footage sanity (if provided) ---
    if house_sqft > 0:
        outlet_count = symbol_counts.get("duplex_receptacle", 0)
        # Rough rule: ~1 outlet per 80-120 sqft
        expected_min = house_sqft / 150
        expected_max = house_sqft / 50
        if outlet_count > 0 and outlet_count < expected_min:
            warnings.append(SanityWarning(
                rule="sqft_ratio",
                message=f"Only {outlet_count} outlets for {house_sqft} sqft. Expected at least {int(expected_min)}.",
                severity="info",
            ))
        if outlet_count > expected_max:
            warnings.append(SanityWarning(
                rule="sqft_ratio",
                message=f"{outlet_count} outlets for {house_sqft} sqft seems high. Expected max ~{int(expected_max)}.",
                severity="info",
            ))

    # --- Zero count check ---
    if total_devices == 0:
        warnings.append(SanityWarning(
            rule="empty_result",
            message="No electrical symbols detected at all. Is this the right page?",
            severity="error",
        ))

    return warnings

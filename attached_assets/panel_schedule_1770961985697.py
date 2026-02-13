"""CEC 2021-compliant residential panel schedule generator.

Generates a complete breaker panel layout from device counts and detected rooms.
Follows CEC rules for dedicated circuits, GFCI/AFCI protection, and load calculation.
"""

from dataclasses import dataclass, field


@dataclass
class CircuitBreaker:
    """A single circuit breaker in the panel."""
    circuit_number: int
    amperage: int           # 15, 20, 30, 40, 50
    poles: int              # 1 or 2
    description: str
    wire_type: str = ""
    is_gfci: bool = False
    is_afci: bool = False
    device_count: int = 0
    load_watts: int = 0
    room: str = ""


@dataclass
class PanelSchedule:
    """Complete panel schedule for a dwelling unit."""
    panel_size_amps: int
    main_breaker_amps: int
    voltage: int = 240
    phases: int = 1
    circuits: list[CircuitBreaker] = field(default_factory=list)
    total_load_watts: int = 0
    total_demand_watts: int = 0  # after CEC demand factors
    total_circuits: int = 0
    spaces_used: int = 0
    spaces_total: int = 40
    service_amps: float = 0.0
    notes: list[str] = field(default_factory=list)


# Standard watt loads per device for demand calculation
DEVICE_WATTS = {
    "duplex_receptacle": 180,
    "gfci_receptacle": 180,
    "weather_resistant_receptacle": 180,
    "outdoor_receptacle": 180,
    "dedicated_receptacle": 1500,
    "dryer_outlet": 5000,
    "ev_charger": 7200,
    "recessed_light": 75,
    "surface_mount_light": 100,
    "pendant_light": 100,
    "fluorescent_light": 120,
    "ceiling_fan": 80,
    "exterior_light": 100,
    "track_light": 200,
    "exhaust_fan": 100,
    "exhaust_fan_bathroom": 100,
    "range_hood_fan": 200,
    "smoke_co_combo": 5,
    "smoke_detector": 5,
    "co_detector": 5,
    "single_pole_switch": 0,
    "three_way_switch": 0,
    "four_way_switch": 0,
    "dimmer_switch": 0,
    "occupancy_sensor": 2,
    "doorbell": 15,
    "thermostat": 5,
    "data_outlet": 0,
    "phone_outlet": 0,
    "cable_tv_outlet": 0,
    "panel_board": 0,
}

# Max outlets per 15A circuit (CEC Rule 12-3000)
MAX_PER_15A = 12
MAX_PER_20A = 12


def generate_panel_schedule(
    symbol_counts: dict[str, int],
    detected_rooms: list = None,
    dwelling_type: str = "single",
    has_electric_range: bool = True,
    has_ac: bool = False,
    has_electric_heat: bool = False,
    total_sqft: float = 0,
) -> PanelSchedule:
    """Generate a CEC-compliant panel schedule from device counts and rooms.

    Args:
        symbol_counts: device type -> count dict
        detected_rooms: list of DetectedRoom objects (optional)
        dwelling_type: single, duplex, triplex, fourplex
        has_electric_range: whether home has electric range (vs gas)
        has_ac: whether home has central A/C
        has_electric_heat: whether home has electric baseboard heat
        total_sqft: total house square footage (for load calc)

    Returns:
        PanelSchedule with all circuits assigned.
    """
    circuits = []
    next_num = [1]  # mutable counter

    def add(amps, poles, desc, wire="", gfci=False, afci=False,
            count=0, watts=0, room=""):
        cb = CircuitBreaker(
            circuit_number=next_num[0],
            amperage=amps,
            poles=poles,
            description=desc,
            wire_type=wire,
            is_gfci=gfci,
            is_afci=afci,
            device_count=count,
            load_watts=watts,
            room=room,
        )
        circuits.append(cb)
        next_num[0] += poles
        return cb

    rooms = detected_rooms or []
    room_types = {getattr(r, 'room_type', '') for r in rooms}

    # Track which devices are assigned to dedicated circuits
    remaining = dict(symbol_counts)

    def consume(sym, count=None):
        """Remove devices from remaining pool."""
        if count is None:
            count = remaining.get(sym, 0)
        actual = min(count, remaining.get(sym, 0))
        remaining[sym] = remaining.get(sym, 0) - actual
        return actual

    # ═══════════════════════════════════════════════
    # 1. KITCHEN DEDICATED CIRCUITS (CEC 26-724)
    # ═══════════════════════════════════════════════

    kitchen_gfci = symbol_counts.get("gfci_receptacle", 0)
    has_kitchen = "kitchen" in room_types or kitchen_gfci > 0

    if has_kitchen:
        # Counter split circuits — min 2, each serves up to 3 GFCI outlets
        counter_gfci = min(kitchen_gfci, 6)  # kitchen counter GFCIs
        split_count = max(2, (counter_gfci + 2) // 3)
        for i in range(split_count):
            devs = min(3, counter_gfci - i * 3)
            if devs <= 0:
                devs = 0
            n = consume("gfci_receptacle", devs)
            add(20, 1, f"Kitchen Counter Split #{i+1} (CEC 26-724)",
                wire="12/2 NM-B", gfci=True, count=n,
                watts=n * 180, room="Kitchen")

        # Refrigerator dedicated
        n = consume("dedicated_receptacle", 1)
        add(15, 1, "Refrigerator Dedicated",
            wire="14/2 NM-B", count=1, watts=1500, room="Kitchen")

        # Dishwasher dedicated
        add(15, 1, "Dishwasher Dedicated",
            wire="14/2 NM-B", gfci=True, count=1, watts=1200, room="Kitchen")

        # Range hood / Microwave
        if symbol_counts.get("range_hood_fan", 0) > 0:
            consume("range_hood_fan", 1)
            add(20, 1, "Range Hood / Microwave",
                wire="12/2 NM-B", count=1, watts=1500, room="Kitchen")

    # ═══════════════════════════════════════════════
    # 2. BATHROOM CIRCUIT (CEC 26-720(f))
    # ═══════════════════════════════════════════════

    bathroom_count = sum(
        1 for r in rooms
        if getattr(r, 'room_type', '') in ("bathroom", "powder_room")
    )
    if bathroom_count > 0 or symbol_counts.get("exhaust_fan", 0) > 0:
        # Shared 20A GFCI for all bathrooms
        bath_gfci = consume("gfci_receptacle")  # remaining bath GFCIs
        bath_exhaust = consume("exhaust_fan", bathroom_count)
        consume("exhaust_fan_bathroom", bathroom_count)
        add(20, 1, f"Bathroom(s) GFCI — {bathroom_count or 1} bathroom(s)",
            wire="12/2 NM-B", gfci=True,
            count=bath_gfci + bath_exhaust,
            watts=(bath_gfci * 180) + (bath_exhaust * 100),
            room="Bathrooms")

    # ═══════════════════════════════════════════════
    # 3. LAUNDRY (CEC 26-724)
    # ═══════════════════════════════════════════════

    has_laundry = "laundry_room" in room_types
    if has_laundry or symbol_counts.get("dryer_outlet", 0) > 0:
        # Laundry receptacle — 20A dedicated
        consume("duplex_receptacle", 2)
        add(20, 1, "Laundry Receptacle (dedicated)",
            wire="12/2 NM-B", count=2, watts=1500, room="Laundry")

        # Dryer — 30A 2-pole (CEC 26-744)
        if consume("dryer_outlet", 1):
            add(30, 2, "Dryer 240V (CEC 26-744)",
                wire="10/3 NM-B", count=1, watts=5000, room="Laundry")

    # ═══════════════════════════════════════════════
    # 4. RANGE / OVEN — 40A 2-pole
    # ═══════════════════════════════════════════════

    if has_electric_range and has_kitchen:
        add(40, 2, "Range/Oven 240V (CEC 26-744)",
            wire="6/3 NM-B", count=1, watts=8000, room="Kitchen")

    # ═══════════════════════════════════════════════
    # 5. A/C — 30A 2-pole (if present)
    # ═══════════════════════════════════════════════

    if has_ac:
        add(30, 2, "Central A/C 240V",
            wire="10/2 NM-B", count=1, watts=3600, room="Exterior")

    # ═══════════════════════════════════════════════
    # 6. ELECTRIC HEAT (if present)
    # ═══════════════════════════════════════════════

    if has_electric_heat:
        # Estimate baseboard heater circuits from square footage
        heat_watts = max(total_sqft * 10, 5000)  # ~10W per sqft
        heat_circuits = max(1, int(heat_watts / 3600 + 0.5))
        for i in range(heat_circuits):
            add(20, 2, f"Baseboard Heat #{i+1}",
                wire="12/2 NM-B", count=1, watts=3600, room="Various")

    # ═══════════════════════════════════════════════
    # 7. EV CHARGER (if present)
    # ═══════════════════════════════════════════════

    if consume("ev_charger"):
        add(40, 2, "EV Charger 240V (dedicated)",
            wire="6/3 NM-B", count=1, watts=7200, room="Garage")

    # ═══════════════════════════════════════════════
    # 8. GARAGE — 20A GFCI dedicated (CEC 26-724)
    # ═══════════════════════════════════════════════

    has_garage = "garage" in room_types
    garage_recepts = 0
    if has_garage:
        garage_recepts = sum(
            1 for r in rooms
            if getattr(r, 'room_type', '') == "garage"
        ) * 3  # ~3 outlets per garage space
        n = consume("duplex_receptacle", garage_recepts)
        add(20, 1, "Garage GFCI (dedicated)",
            wire="12/2 NM-B", gfci=True, count=n,
            watts=n * 180, room="Garage")

    # ═══════════════════════════════════════════════
    # 9. OUTDOOR — 20A GFCI (CEC 26-724)
    # ═══════════════════════════════════════════════

    outdoor = consume("outdoor_receptacle")
    ext_lights = consume("exterior_light")
    if outdoor > 0 or ext_lights > 0:
        add(20, 1, "Outdoor / Exterior GFCI",
            wire="12/2 NM-B", gfci=True,
            count=outdoor + ext_lights,
            watts=outdoor * 180 + ext_lights * 100,
            room="Exterior")

    # ═══════════════════════════════════════════════
    # 10. SMOKE / CO DETECTORS — 15A dedicated
    # ═══════════════════════════════════════════════

    smoke = consume("smoke_co_combo") + consume("smoke_detector") + consume("co_detector")
    if smoke > 0:
        add(15, 1, "Smoke/CO Detectors (interconnected)",
            wire="14/3 NM-B", count=smoke, watts=smoke * 5,
            room="Whole House")

    # ═══════════════════════════════════════════════
    # 11. FURNACE — 15A dedicated
    # ═══════════════════════════════════════════════

    add(15, 1, "Furnace / Air Handler (dedicated)",
        wire="14/2 NM-B", count=1, watts=600, room="Mechanical")

    # ═══════════════════════════════════════════════
    # 12. DOORBELL / LOW VOLTAGE — shared with lighting
    # ═══════════════════════════════════════════════

    consume("doorbell")
    consume("thermostat")
    consume("data_outlet")
    consume("phone_outlet")
    consume("cable_tv_outlet")

    # ═══════════════════════════════════════════════
    # 13. GENERAL LIGHTING — 15A circuits, max 12 per
    # ═══════════════════════════════════════════════

    lighting_types = [
        "recessed_light", "surface_mount_light", "pendant_light",
        "ceiling_fan", "track_light", "fluorescent_light",
    ]
    total_lights = sum(consume(lt) for lt in lighting_types)
    # Consume switches too (they share lighting circuits)
    consume("single_pole_switch")
    consume("three_way_switch")
    consume("four_way_switch")
    consume("dimmer_switch")
    consume("occupancy_sensor")

    if total_lights > 0:
        light_circuits = max(1, (total_lights + MAX_PER_15A - 1) // MAX_PER_15A)
        per_circuit = (total_lights + light_circuits - 1) // light_circuits
        for i in range(light_circuits):
            count = min(per_circuit, total_lights - i * per_circuit)
            if count <= 0:
                break
            add(15, 1, f"General Lighting #{i+1} (AFCI)",
                wire="14/2 NM-B", afci=True, count=count,
                watts=count * 85, room="Various")

    # ═══════════════════════════════════════════════
    # 14. GENERAL RECEPTACLES — 15A AFCI, max 12 per
    # ═══════════════════════════════════════════════

    gen_recepts = consume("duplex_receptacle") + consume("gfci_receptacle")
    # Consume any other remaining receptacle types
    gen_recepts += consume("weather_resistant_receptacle")
    gen_recepts += consume("dedicated_receptacle")

    if gen_recepts > 0:
        recept_circuits = max(1, (gen_recepts + MAX_PER_15A - 1) // MAX_PER_15A)
        per_circuit = (gen_recepts + recept_circuits - 1) // recept_circuits

        # Try to separate bedroom circuits (AFCI required)
        bedroom_rooms = [
            r for r in rooms
            if getattr(r, 'room_type', '') in ("bedroom", "primary_bedroom")
        ]

        # Bedroom circuits first
        if bedroom_rooms and gen_recepts > 6:
            bed_count = min(gen_recepts // 2, len(bedroom_rooms) * 4)
            bed_circuits = max(1, (bed_count + MAX_PER_15A - 1) // MAX_PER_15A)
            for i in range(bed_circuits):
                count = min(per_circuit, bed_count - i * per_circuit)
                if count <= 0:
                    break
                gen_recepts -= count
                add(15, 1, f"Bedroom Receptacles #{i+1} (AFCI)",
                    wire="14/2 NM-B", afci=True, count=count,
                    watts=count * 180, room="Bedrooms")

        # Remaining general receptacles
        if gen_recepts > 0:
            rem_circuits = max(1, (gen_recepts + MAX_PER_15A - 1) // MAX_PER_15A)
            per_c = (gen_recepts + rem_circuits - 1) // rem_circuits
            for i in range(rem_circuits):
                count = min(per_c, gen_recepts - i * per_c)
                if count <= 0:
                    break
                add(15, 1, f"General Receptacles #{i+1} (AFCI)",
                    wire="14/2 NM-B", afci=True, count=count,
                    watts=count * 180, room="Various")

    # ═══════════════════════════════════════════════
    # 15. SPARE CIRCUITS (good practice)
    # ═══════════════════════════════════════════════

    add(15, 1, "Spare #1", wire="—", count=0, watts=0)
    add(15, 1, "Spare #2", wire="—", count=0, watts=0)

    # ═══════════════════════════════════════════════
    # LOAD CALCULATION (CEC Rule 8-200)
    # ═══════════════════════════════════════════════

    total_load = sum(c.load_watts for c in circuits)

    # CEC demand calculation
    # Basic load: first 5000W at 100%, remainder at 25%
    basic_load = sum(
        c.load_watts for c in circuits
        if c.amperage <= 20 and c.poles == 1
    )
    demand_basic = min(basic_load, 5000) + max(0, basic_load - 5000) * 0.25

    # Large appliances at 100%
    large_load = sum(
        c.load_watts for c in circuits
        if c.poles == 2 or c.amperage >= 30
    )

    total_demand = int(demand_basic + large_load)
    service_amps = total_demand / 240.0

    # Determine panel size
    if service_amps <= 60:
        panel_amps = 100
    elif service_amps <= 100:
        panel_amps = 100
    elif service_amps <= 125:
        panel_amps = 125
    else:
        panel_amps = 200

    # Modern homes default to 200A
    if total_sqft > 1500 or has_ac or has_electric_heat:
        panel_amps = max(panel_amps, 200)

    spaces_used = sum(c.poles for c in circuits)
    spaces_total = 40 if panel_amps >= 200 else 30 if panel_amps >= 125 else 20

    # Multi-unit adjustment
    unit_count = {"single": 1, "duplex": 2, "triplex": 3, "fourplex": 4}.get(
        dwelling_type, 1
    )

    notes = []
    notes.append(f"CEC 2021 compliant — {panel_amps}A service")
    notes.append(f"Total connected load: {total_load:,}W")
    notes.append(f"Calculated demand: {total_demand:,}W ({service_amps:.0f}A)")
    if spaces_used > spaces_total - 4:
        notes.append("WARNING: Panel nearly full — consider larger panel")
    if unit_count > 1:
        notes.append(
            f"Multi-unit ({dwelling_type}): {unit_count} panels required, "
            f"each unit gets this panel schedule"
        )

    schedule = PanelSchedule(
        panel_size_amps=panel_amps,
        main_breaker_amps=panel_amps,
        total_load_watts=total_load,
        total_demand_watts=total_demand,
        total_circuits=len(circuits),
        spaces_used=spaces_used,
        spaces_total=spaces_total,
        service_amps=service_amps,
        circuits=circuits,
        notes=notes,
    )

    return schedule

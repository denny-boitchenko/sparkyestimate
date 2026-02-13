"""Assembly-based material and wire estimation engine.

Each electrical device is an 'assembly' containing:
- The device itself
- A device box
- A cover plate
- Connectors/wire nuts
- A default wire allowance (feet of NM-B cable)
- A labour unit (decimal hours)

The user can customize all defaults per their experience.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Assembly:
    """A complete installation assembly for one device type."""
    symbol_type: str
    display_name: str
    # Material components
    device_description: str
    box_type: str
    cover_plate: str
    misc_parts: list[str] = field(default_factory=list)
    # Wire estimation
    wire_type: str = "14/2 NM-B"
    wire_allowance_ft: float = 20.0
    # Labour
    labour_hours: float = 0.18
    # Pricing (user provides these)
    material_cost: float = 0.0
    labour_rate: float = 0.0


# Default assemblies for Canadian residential electrical (CEC)
DEFAULT_ASSEMBLIES: dict[str, Assembly] = {
    "duplex_receptacle": Assembly(
        symbol_type="duplex_receptacle",
        display_name="Duplex Receptacle (15A)",
        device_description="15A duplex receptacle, TR",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang duplex cover plate",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,  # avg daisy-chain between outlets
        labour_hours=0.18,
    ),
    "gfci_receptacle": Assembly(
        symbol_type="gfci_receptacle",
        display_name="GFCI Receptacle (20A)",
        device_description="20A GFCI receptacle, TR, WR",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang GFCI cover plate",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="12/2 NM-B",
        wire_allowance_ft=25.0,
        labour_hours=0.25,
    ),
    "weather_resistant_receptacle": Assembly(
        symbol_type="weather_resistant_receptacle",
        display_name="Weather-Resistant Receptacle",
        device_description="20A WR receptacle, TR",
        box_type="Weatherproof box",
        cover_plate="In-use weatherproof cover",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="12/2 NM-B",
        wire_allowance_ft=30.0,
        labour_hours=0.30,
    ),
    "split_receptacle": Assembly(
        symbol_type="split_receptacle",
        display_name="Split Receptacle",
        device_description="15A duplex receptacle, TR, split-wired",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang duplex cover plate",
        misc_parts=["Wire nuts (3)", "Ground pigtail", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=22.0,
        labour_hours=0.25,
    ),
    "dedicated_receptacle": Assembly(
        symbol_type="dedicated_receptacle",
        display_name="Dedicated Receptacle",
        device_description="20A dedicated receptacle",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang duplex cover plate",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="12/2 NM-B",
        wire_allowance_ft=35.0,
        labour_hours=0.25,
    ),
    "single_pole_switch": Assembly(
        symbol_type="single_pole_switch",
        display_name="Single-Pole Switch",
        device_description="15A single-pole switch",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang toggle cover plate",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.15,
    ),
    "three_way_switch": Assembly(
        symbol_type="three_way_switch",
        display_name="3-Way Switch",
        device_description="15A 3-way switch",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang toggle cover plate",
        misc_parts=["Wire nuts (3)", "Ground pigtail", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=30.0,
        labour_hours=0.20,
    ),
    "four_way_switch": Assembly(
        symbol_type="four_way_switch",
        display_name="4-Way Switch",
        device_description="15A 4-way switch",
        box_type="Single-gang device box, NM",
        cover_plate="Single-gang toggle cover plate",
        misc_parts=["Wire nuts (4)", "Ground pigtail", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=30.0,
        labour_hours=0.25,
    ),
    "dimmer_switch": Assembly(
        symbol_type="dimmer_switch",
        display_name="Dimmer Switch",
        device_description="600W dimmer switch",
        box_type="Single-gang device box, NM",
        cover_plate="Dimmer cover plate",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.20,
    ),
    "recessed_light": Assembly(
        symbol_type="recessed_light",
        display_name="Recessed Light (Pot Light)",
        device_description='4" or 6" IC-rated recessed housing + LED trim',
        box_type="Integral junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=8.0,  # daisy-chained, short runs between lights
        labour_hours=0.30,
    ),
    "pot_light": Assembly(
        symbol_type="pot_light",
        display_name="Pot Light",
        device_description='4" or 6" IC-rated recessed housing + LED trim',
        box_type="Integral junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=8.0,  # daisy-chained, short runs between lights
        labour_hours=0.30,
    ),
    "surface_mount_light": Assembly(
        symbol_type="surface_mount_light",
        display_name="Surface Mount Light",
        device_description="Surface mount fixture",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Fixture strap", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=10.0,  # typically daisy-chained
        labour_hours=0.40,
    ),
    "pendant_light": Assembly(
        symbol_type="pendant_light",
        display_name="Pendant Light",
        device_description="Pendant fixture",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Fixture strap", "Box connector NM", "Pendant kit"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.50,
    ),
    "wall_sconce": Assembly(
        symbol_type="wall_sconce",
        display_name="Wall Sconce",
        device_description="Wall sconce fixture",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Fixture strap", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.40,
    ),
    "exterior_light": Assembly(
        symbol_type="exterior_light",
        display_name="Exterior Light",
        device_description="Exterior wall pack or fixture",
        box_type="Weatherproof box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector", "Weatherproof gasket"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=25.0,
        labour_hours=0.50,
    ),
    "track_light": Assembly(
        symbol_type="track_light",
        display_name="Track Light",
        device_description="Track lighting system",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Track connector", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.60,
    ),
    "fluorescent_light": Assembly(
        symbol_type="fluorescent_light",
        display_name="Fluorescent / LED Batten",
        device_description="4ft LED batten fixture",
        box_type="Integral junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector", "Mounting clips"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=10.0,  # daisy-chained in basements/garages
        labour_hours=0.45,
    ),
    "led_panel_light": Assembly(
        symbol_type="led_panel_light",
        display_name="LED Panel Light",
        device_description="LED flat panel",
        box_type="Integral junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector", "Mounting hardware"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=8.0,  # daisy-chained
        labour_hours=0.40,
    ),
    "ceiling_fan": Assembly(
        symbol_type="ceiling_fan",
        display_name="Ceiling Fan Outlet",
        device_description="Ceiling fan rated box + wiring",
        box_type="Fan-rated octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (3)", "Fan brace bar", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=20.0,
        labour_hours=0.50,
    ),
    "exhaust_fan": Assembly(
        symbol_type="exhaust_fan",
        display_name="Exhaust Fan (Bathroom)",
        device_description="Bathroom exhaust fan",
        box_type="Integral junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector", "Duct connector"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=20.0,
        labour_hours=0.50,
    ),
    "range_hood_fan": Assembly(
        symbol_type="range_hood_fan",
        display_name="Range Hood Fan",
        device_description="Range hood connection",
        box_type="Junction box",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "NM connector"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=20.0,
        labour_hours=0.40,
    ),
    "smoke_detector": Assembly(
        symbol_type="smoke_detector",
        display_name="Smoke Detector (Hardwired)",
        device_description="Hardwired smoke detector with battery backup",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Mounting plate", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=18.0,
        labour_hours=0.25,
    ),
    "co_detector": Assembly(
        symbol_type="co_detector",
        display_name="CO Detector (Hardwired)",
        device_description="Hardwired CO detector with battery backup",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Mounting plate", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=18.0,
        labour_hours=0.25,
    ),
    "smoke_co_combo": Assembly(
        symbol_type="smoke_co_combo",
        display_name="Smoke/CO Combo Detector",
        device_description="Hardwired smoke/CO combo with battery backup",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Mounting plate", "Box connector NM"],
        wire_type="14/3 NM-B",
        wire_allowance_ft=18.0,
        labour_hours=0.25,
    ),
    "data_outlet": Assembly(
        symbol_type="data_outlet",
        display_name="Data Outlet (Cat6)",
        device_description="Cat6 keystone jack + wall plate",
        box_type="Low-voltage bracket",
        cover_plate="Single-gang data plate",
        misc_parts=["Cat6 cable"],
        wire_type="Cat6",
        wire_allowance_ft=50.0,
        labour_hours=0.30,
    ),
    "tv_outlet": Assembly(
        symbol_type="tv_outlet",
        display_name="TV / Coax Outlet",
        device_description="F-connector coax jack + wall plate",
        box_type="Low-voltage bracket",
        cover_plate="Single-gang coax plate",
        misc_parts=["RG6 coax cable"],
        wire_type="RG6 Coax",
        wire_allowance_ft=50.0,
        labour_hours=0.25,
    ),
    "phone_outlet": Assembly(
        symbol_type="phone_outlet",
        display_name="Phone Outlet",
        device_description="RJ11 phone jack + wall plate",
        box_type="Low-voltage bracket",
        cover_plate="Single-gang phone plate",
        misc_parts=["Cat3/Cat6 cable"],
        wire_type="Cat6",
        wire_allowance_ft=50.0,
        labour_hours=0.25,
    ),
    "doorbell": Assembly(
        symbol_type="doorbell",
        display_name="Doorbell",
        device_description="Doorbell chime + button + transformer",
        box_type="Junction box",
        cover_plate="N/A",
        misc_parts=["18/2 thermostat wire", "Doorbell transformer"],
        wire_type="18/2 Bell Wire",
        wire_allowance_ft=40.0,
        labour_hours=0.50,
    ),
    "thermostat": Assembly(
        symbol_type="thermostat",
        display_name="Thermostat",
        device_description="Thermostat wire connection",
        box_type="N/A",
        cover_plate="N/A",
        misc_parts=["18/5 thermostat wire"],
        wire_type="18/5 Thermostat Wire",
        wire_allowance_ft=40.0,
        labour_hours=0.30,
    ),
    "panel_board": Assembly(
        symbol_type="panel_board",
        display_name="Panel Board / Load Center (200A)",
        device_description="200A main breaker load center, 40-circuit",
        box_type="N/A",
        cover_plate="Panel cover",
        misc_parts=["Ground bar", "Neutral bar", "Panel screws", "Grounding electrode conductor"],
        wire_type="3/0 AL SER Cable",
        wire_allowance_ft=25.0,
        labour_hours=6.00,
    ),
    "subpanel": Assembly(
        symbol_type="subpanel",
        display_name="Sub-Panel (100A)",
        device_description="100A sub-panel, 20-circuit",
        box_type="N/A",
        cover_plate="Panel cover",
        misc_parts=["Ground bar", "Neutral bar", "Panel screws"],
        wire_type="3 AWG NM-B",
        wire_allowance_ft=30.0,
        labour_hours=4.00,
    ),
    "junction_box": Assembly(
        symbol_type="junction_box",
        display_name="Junction Box",
        device_description="4x4 junction box with cover",
        box_type="4x4 junction box",
        cover_plate="Blank cover plate",
        misc_parts=["Wire nuts (4)", "Box connectors NM (2)"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=5.0,
        labour_hours=0.20,
    ),
    "ev_charger_outlet": Assembly(
        symbol_type="ev_charger_outlet",
        display_name="EV Charger Outlet (50A)",
        device_description="50A 240V receptacle (NEMA 14-50)",
        box_type="Surface mount box",
        cover_plate="NEMA 14-50 cover",
        misc_parts=["Wire nuts", "Box connector NM"],
        wire_type="6/3 NM-B",
        wire_allowance_ft=50.0,
        labour_hours=1.00,
    ),
    "dryer_outlet": Assembly(
        symbol_type="dryer_outlet",
        display_name="Dryer Outlet (30A)",
        device_description="30A 240V dryer receptacle (NEMA 14-30)",
        box_type="Surface mount box",
        cover_plate="NEMA 14-30 cover",
        misc_parts=["Wire nuts", "Box connector NM"],
        wire_type="10/3 NM-B",
        wire_allowance_ft=40.0,
        labour_hours=0.50,
    ),
    "range_outlet": Assembly(
        symbol_type="range_outlet",
        display_name="Range Outlet (50A)",
        device_description="50A 240V range receptacle (NEMA 14-50)",
        box_type="Surface mount box",
        cover_plate="NEMA 14-50 cover",
        misc_parts=["Wire nuts", "Box connector NM"],
        wire_type="6/3 NM-B",
        wire_allowance_ft=40.0,
        labour_hours=0.50,
    ),
    "ac_disconnect": Assembly(
        symbol_type="ac_disconnect",
        display_name="A/C Disconnect",
        device_description="60A non-fused disconnect",
        box_type="Weatherproof enclosure",
        cover_plate="N/A",
        misc_parts=["NM connectors (2)", "Whip connector"],
        wire_type="10/2 NM-B",
        wire_allowance_ft=50.0,
        labour_hours=1.00,
    ),
    "outdoor_receptacle": Assembly(
        symbol_type="outdoor_receptacle",
        display_name="Outdoor Receptacle (GFCI)",
        device_description="20A GFCI receptacle, WR",
        box_type="Weatherproof box",
        cover_plate="In-use weatherproof cover",
        misc_parts=["Wire nuts (2)", "Ground pigtail", "Box connector NM"],
        wire_type="12/2 NM-B",
        wire_allowance_ft=35.0,
        labour_hours=0.35,
    ),
    "motion_sensor": Assembly(
        symbol_type="motion_sensor",
        display_name="Motion Sensor",
        device_description="Occupancy/motion sensor switch",
        box_type="Single-gang device box, NM",
        cover_plate="Sensor cover plate",
        misc_parts=["Wire nuts (3)", "Ground pigtail", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.25,
    ),
    "occupancy_sensor": Assembly(
        symbol_type="occupancy_sensor",
        display_name="Occupancy Sensor",
        device_description="Ceiling mount occupancy sensor",
        box_type="Octagon box, NM",
        cover_plate="N/A",
        misc_parts=["Wire nuts (2)", "Box connector NM"],
        wire_type="14/2 NM-B",
        wire_allowance_ft=15.0,
        labour_hours=0.25,
    ),
    "temp_power": Assembly(
        symbol_type="temp_power",
        display_name="Temporary Power (Construction)",
        device_description="Temp power pole + panel + GFCI receptacles",
        box_type="Temp panel enclosure",
        cover_plate="N/A",
        misc_parts=["Temp pole", "Ground rod", "GFCI receptacles (2)", "Weatherhead"],
        wire_type="6/3 NM-B",
        wire_allowance_ft=30.0,
        labour_hours=4.00,
    ),
    "underground_service": Assembly(
        symbol_type="underground_service",
        display_name="Underground Service Entry",
        device_description="Underground service conduit + wire + trench",
        box_type="LB fitting",
        cover_plate="N/A",
        misc_parts=["PVC conduit", "PVC elbows", "Bell end", "Pulling compound"],
        wire_type="3/0 AL SER Cable",
        wire_allowance_ft=60.0,
        labour_hours=8.00,
    ),
}

# Home run allowance per circuit
HOME_RUN_ASSEMBLY = Assembly(
    symbol_type="home_run",
    display_name="Home Run (per circuit)",
    device_description="Circuit breaker (15A or 20A)",
    box_type="N/A",
    cover_plate="N/A",
    misc_parts=["Staples", "Labels"],
    wire_type="14/2 NM-B",
    wire_allowance_ft=30.0,
    labour_hours=0.50,
)

WASTE_FACTOR = 0.15  # 15% waste on wire


@dataclass
class EstimateLineItem:
    """A single line in the material estimate."""
    symbol_type: str
    display_name: str
    quantity: int
    # Material
    device_description: str
    box_type: str
    cover_plate: str
    material_cost_each: float
    material_cost_total: float
    material_markup_pct: float = 0.0
    material_marked_up: float = 0.0
    # Wire
    wire_type: str = ""
    wire_ft_each: float = 0.0
    wire_ft_total: float = 0.0
    # Labour
    labour_hours_each: float = 0.0
    labour_hours_total: float = 0.0
    labour_cost_total: float = 0.0


@dataclass
class ProjectEstimate:
    """Complete project estimate."""
    project_name: str
    line_items: list[EstimateLineItem]
    # Wire summary
    wire_summary: dict[str, float]  # wire_type -> total feet (including waste)
    # Totals
    total_material_cost: float
    total_wire_cost: float
    total_labour_hours: float
    total_labour_cost: float
    overhead_amount: float
    profit_amount: float
    grand_total: float
    # Settings used
    labour_rate: float
    overhead_pct: float
    profit_pct: float
    waste_factor: float
    # Markup
    material_markup_pct: float = 0.0
    labour_markup_pct: float = 0.0
    total_material_marked_up: float = 0.0
    total_labour_marked_up: float = 0.0


class Estimator:
    """Generates material lists and pricing from symbol counts."""

    def __init__(
        self,
        assemblies: Optional[dict[str, Assembly]] = None,
        labour_rate: float = 85.0,
        overhead_pct: float = 0.15,
        profit_pct: float = 0.10,
        waste_factor: float = WASTE_FACTOR,
    ):
        self.assemblies = assemblies or dict(DEFAULT_ASSEMBLIES)
        self.labour_rate = labour_rate
        self.overhead_pct = overhead_pct
        self.profit_pct = profit_pct
        self.waste_factor = waste_factor

    def estimate(
        self,
        symbol_counts: dict[str, int],
        project_name: str = "Untitled Project",
        num_circuits: int = 0,
    ) -> ProjectEstimate:
        """Generate a full estimate from symbol counts."""
        line_items: list[EstimateLineItem] = []
        wire_totals: dict[str, float] = {}

        for symbol_type, count in sorted(symbol_counts.items()):
            if count <= 0:
                continue
            assembly = self.assemblies.get(symbol_type)
            if assembly is None:
                # Unknown symbol — create a placeholder
                assembly = Assembly(
                    symbol_type=symbol_type,
                    display_name=symbol_type.replace("_", " ").title(),
                    device_description=f"Unknown: {symbol_type}",
                    box_type="TBD",
                    cover_plate="TBD",
                )

            mat_total = assembly.material_cost * count
            wire_ft = assembly.wire_allowance_ft * count
            labour_hrs = assembly.labour_hours * count
            labour_cost = labour_hrs * self.labour_rate

            # Accumulate wire by type
            wt = assembly.wire_type
            wire_totals[wt] = wire_totals.get(wt, 0.0) + wire_ft

            line_items.append(
                EstimateLineItem(
                    symbol_type=symbol_type,
                    display_name=assembly.display_name,
                    quantity=count,
                    device_description=assembly.device_description,
                    box_type=assembly.box_type,
                    cover_plate=assembly.cover_plate,
                    material_cost_each=assembly.material_cost,
                    material_cost_total=mat_total,
                    wire_type=wt,
                    wire_ft_each=assembly.wire_allowance_ft,
                    wire_ft_total=wire_ft,
                    labour_hours_each=assembly.labour_hours,
                    labour_hours_total=labour_hrs,
                    labour_cost_total=labour_cost,
                )
            )

        # Add home runs
        if num_circuits > 0:
            hr = HOME_RUN_ASSEMBLY
            hr_wire = hr.wire_allowance_ft * num_circuits
            hr_labour = hr.labour_hours * num_circuits
            wire_totals[hr.wire_type] = wire_totals.get(hr.wire_type, 0.0) + hr_wire
            line_items.append(
                EstimateLineItem(
                    symbol_type="home_run",
                    display_name=hr.display_name,
                    quantity=num_circuits,
                    device_description=hr.device_description,
                    box_type=hr.box_type,
                    cover_plate=hr.cover_plate,
                    material_cost_each=hr.material_cost,
                    material_cost_total=hr.material_cost * num_circuits,
                    wire_type=hr.wire_type,
                    wire_ft_each=hr.wire_allowance_ft,
                    wire_ft_total=hr_wire,
                    labour_hours_each=hr.labour_hours,
                    labour_hours_total=hr_labour,
                    labour_cost_total=hr_labour * self.labour_rate,
                )
            )

        # Apply waste factor to wire
        wire_with_waste = {
            wt: ft * (1 + self.waste_factor) for wt, ft in wire_totals.items()
        }

        # Sum totals
        total_material = sum(li.material_cost_total for li in line_items)
        total_labour_hrs = sum(li.labour_hours_total for li in line_items)
        total_labour_cost = sum(li.labour_cost_total for li in line_items)
        total_wire_cost = 0.0  # User fills in wire costs per foot in DB

        subtotal = total_material + total_wire_cost + total_labour_cost
        overhead = subtotal * self.overhead_pct
        profit = (subtotal + overhead) * self.profit_pct
        grand_total = subtotal + overhead + profit

        return ProjectEstimate(
            project_name=project_name,
            line_items=line_items,
            wire_summary=wire_with_waste,
            total_material_cost=total_material,
            total_wire_cost=total_wire_cost,
            total_labour_hours=total_labour_hrs,
            total_labour_cost=total_labour_cost,
            overhead_amount=overhead,
            profit_amount=profit,
            grand_total=grand_total,
            labour_rate=self.labour_rate,
            overhead_pct=self.overhead_pct,
            profit_pct=self.profit_pct,
            waste_factor=self.waste_factor,
        )

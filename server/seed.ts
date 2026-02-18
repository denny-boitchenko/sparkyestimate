import { db } from "./db";
import { deviceAssemblies, projects, estimates, estimateItems, wireTypes, serviceBundles, jobTypes, partsCatalog, assemblyParts, permitFeeSchedules } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ASSEMBLIES = [
  // Receptacles — prices from Material List (2026, 12% tax included)
  // materialCost = device + box + cover plate + misc parts (wire handled separately)
  { name: "Duplex Receptacle (15A)", symbolType: "duplex_receptacle", category: "receptacles", device: "15A duplex receptacle, TR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.18, materialCost: 6.74 },
  { name: "Duplex Receptacle (20A)", symbolType: "duplex_receptacle_20a", category: "receptacles", device: "20A duplex receptacle, TR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "12/2 NMD-90", wireFootage: 15, laborHours: 0.20, materialCost: 11.44 },
  { name: "GFCI Receptacle (15A)", symbolType: "gfci_receptacle_15a", category: "receptacles", device: "15A GFCI receptacle, TR, WR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang GFCI cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.25, materialCost: 34.44 },
  { name: "GFCI Receptacle (20A)", symbolType: "gfci_receptacle", category: "receptacles", device: "20A GFCI receptacle, TR, WR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang GFCI cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "12/2 NMD-90", wireFootage: 25, laborHours: 0.25, materialCost: 37.44 },
  { name: "Weather-Resistant Receptacle", symbolType: "weather_resistant_receptacle", category: "receptacles", device: "20A WR receptacle, TR", boxType: "Weatherproof box", coverPlate: "In-use weatherproof cover", miscParts: "Wire nuts, WP connector, gasket", wireType: "12/2 NMD-90", wireFootage: 30, laborHours: 0.30, materialCost: 38.00 },
  { name: "Split Receptacle (Kitchen)", symbolType: "split_receptacle", category: "receptacles", device: "15A split duplex receptacle", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector, red tape", wireType: "14/3 NMD-90", wireFootage: 20, laborHours: 0.30, materialCost: 7.04 },
  { name: "Dedicated Receptacle (Fridge)", symbolType: "dedicated_receptacle", category: "receptacles", device: "15A single receptacle, dedicated", boxType: "Single-gang device box, NM", coverPlate: "Single-gang single cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 25, laborHours: 0.25, materialCost: 6.74 },
  { name: "Dryer Receptacle (30A)", symbolType: "dryer_outlet", category: "receptacles", device: "30A dryer receptacle, NEMA 14-30", boxType: "Single-gang surface mount box", coverPlate: "Dryer cover plate", miscParts: "Wire nuts, box connector", wireType: "10/3 NMD-90", wireFootage: 30, laborHours: 0.50, materialCost: 17.00 },
  { name: "Range Receptacle (50A)", symbolType: "range_outlet", category: "receptacles", device: "50A range receptacle, NEMA 14-50", boxType: "Single-gang surface mount box", coverPlate: "Range cover plate", miscParts: "Wire nuts, box connector", wireType: "6/3 NMD-90", wireFootage: 25, laborHours: 0.60, materialCost: 17.00 },
  { name: "EV Charger Receptacle (50A)", symbolType: "ev_charger_outlet", category: "receptacles", device: "50A NEMA 14-50 for EV charging", boxType: "Single-gang surface mount box", coverPlate: "NEMA 14-50 cover", miscParts: "Wire nuts, box connector", wireType: "6/3 NMD-90", wireFootage: 40, laborHours: 1.25, materialCost: 26.50 },
  { name: "Outdoor Receptacle (WP)", symbolType: "outdoor_receptacle", category: "receptacles", device: "15A GFCI receptacle, WP box", boxType: "Weatherproof in-use box", coverPlate: "In-use WP cover", miscParts: "Wire nuts, WP connector, gasket", wireType: "14/2 NMD-90", wireFootage: 25, laborHours: 0.35, materialCost: 61.00 },
  // Switches — prices from Material List (2026)
  { name: "Single-Pole Switch", symbolType: "single_pole_switch", category: "switches", device: "15A single-pole switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.15, materialCost: 6.64 },
  { name: "3-Way Switch", symbolType: "three_way_switch", category: "switches", device: "15A 3-way switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/3 NMD-90", wireFootage: 30, laborHours: 0.25, materialCost: 8.44 },
  { name: "4-Way Switch", symbolType: "four_way_switch", category: "switches", device: "15A 4-way switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/3 NMD-90", wireFootage: 30, laborHours: 0.30, materialCost: 26.84 },
  { name: "Dimmer Switch", symbolType: "dimmer_switch", category: "switches", device: "600W dimmer switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang dimmer cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.20, materialCost: 49.44 },
  // Lighting — potlight prices from Material List (4" wafer ~$25, 6" ~$36, vapo boot $9)
  { name: "Recessed Light (4\")", symbolType: "recessed_light", category: "lighting", device: "4\" LED wafer light, IC rated", boxType: "Vapour barrier boot", coverPlate: "Trim ring included", miscParts: "Wire nuts, box connector", wireType: "14/2 NMD-90", wireFootage: 8, laborHours: 0.35, materialCost: 34.65 },
  { name: "Recessed Light (6\")", symbolType: "pot_light", category: "lighting", device: "6\" LED recessed light, IC rated", boxType: "Vapour barrier boot", coverPlate: "Trim ring included", miscParts: "Wire nuts, box connector", wireType: "14/2 NMD-90", wireFootage: 8, laborHours: 0.35, materialCost: 45.65 },
  { name: "Gimbal Light (4\")", symbolType: "gimbal_light", category: "lighting", device: "4\" LED gimbal adjustable, IC rated", boxType: "Vapour barrier boot", coverPlate: "Trim ring included", miscParts: "Wire nuts, box connector", wireType: "14/2 NMD-90", wireFootage: 8, laborHours: 0.35, materialCost: 34.65 },
  { name: "Ceiling Light Fixture", symbolType: "surface_mount_light", category: "lighting", device: "LED ceiling mount fixture (customer supplied)", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.40, materialCost: 11.65 },
  { name: "Pendant Light", symbolType: "pendant_light", category: "lighting", device: "Pendant light fixture (customer supplied)", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware, chain/cord", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.50, materialCost: 11.65 },
  { name: "Wall Sconce", symbolType: "wall_sconce", category: "lighting", device: "Wall sconce fixture (customer supplied)", boxType: "Octagon box, NM", coverPlate: "N/A", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.40, materialCost: 11.65 },
  { name: "Track Light (4-head)", symbolType: "track_light", category: "lighting", device: "4-head LED track light kit", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware, track", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.60, materialCost: 120.00 },
  { name: "Fluorescent / LED Batten", symbolType: "fluorescent_light", category: "lighting", device: "4ft LED batten fixture", boxType: "Integrated junction box", coverPlate: "N/A", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NMD-90", wireFootage: 10, laborHours: 0.45, materialCost: 40.00 },
  { name: "LED Panel Light", symbolType: "led_panel_light", category: "lighting", device: "2x2 LED flat panel", boxType: "Integrated junction box", coverPlate: "N/A", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NMD-90", wireFootage: 8, laborHours: 0.40, materialCost: 55.00 },
  { name: "Under Cabinet Light", symbolType: "under_cabinet_light", category: "lighting", device: "LED under-cabinet light, 24\"", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors", wireType: "14/2 NMD-90", wireFootage: 8, laborHours: 0.25, materialCost: 30.00 },
  { name: "Exterior Light Fixture", symbolType: "exterior_light", category: "lighting", device: "LED wall-mount exterior light", boxType: "Weatherproof octagon box", coverPlate: "Gasket included", miscParts: "Wire nuts, weatherproof connector", wireType: "14/2 NMD-90", wireFootage: 20, laborHours: 0.40, materialCost: 45.00 },
  { name: "Ceiling Fan", symbolType: "ceiling_fan", category: "lighting", device: "52\" ceiling fan with light kit", boxType: "Fan-rated ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, fan brace, mounting hardware", wireType: "14/3 NMD-90", wireFootage: 15, laborHours: 0.75, materialCost: 150.00 },
  { name: "Bathroom Exhaust Fan", symbolType: "exhaust_fan", category: "lighting", device: "150 CFM bathroom exhaust fan, dual speed", boxType: "Integrated housing", coverPlate: "Grille included", miscParts: "Wire nuts, duct connector, clamps", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.75, materialCost: 152.00 },
  { name: "Range Hood", symbolType: "range_hood_fan", category: "lighting", device: "30\" range hood (customer supplied)", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, duct", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.60, materialCost: 8.00 },
  // Safety — prices from Material List (CO Smoke $80.34, Regular Smoke $21)
  { name: "Smoke Detector (Hardwired)", symbolType: "smoke_detector", category: "safety", device: "Hardwired smoke detector with battery backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NMD-90", wireFootage: 20, laborHours: 0.25, materialCost: 28.65 },
  { name: "CO Detector (Hardwired)", symbolType: "co_detector", category: "safety", device: "Hardwired CO detector with battery backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NMD-90", wireFootage: 20, laborHours: 0.25, materialCost: 47.65 },
  { name: "Combination Smoke/CO Detector", symbolType: "smoke_co_combo", category: "safety", device: "Hardwired combo smoke/CO with backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NMD-90", wireFootage: 20, laborHours: 0.25, materialCost: 88.00 },
  // Data/Comm — prices from Material List (Data Insert $7.50)
  { name: "Data Outlet (Cat6)", symbolType: "data_outlet", category: "data_comm", device: "Cat6 RJ45 data outlet", boxType: "Single-gang low-voltage bracket", coverPlate: "Single-gang data cover", miscParts: "Cat6 jack, patch panel connection", wireType: "Cat6", wireFootage: 50, laborHours: 0.30, materialCost: 12.50 },
  { name: "Coax Outlet", symbolType: "tv_outlet", category: "data_comm", device: "F-connector coax outlet", boxType: "Single-gang low-voltage bracket", coverPlate: "Single-gang F-connector cover", miscParts: "F-connector, compression fitting", wireType: "RG6 Coax", wireFootage: 50, laborHours: 0.25, materialCost: 10.00 },
  { name: "Phone Outlet", symbolType: "phone_outlet", category: "data_comm", device: "RJ11 phone jack + wall plate", boxType: "Single-gang low-voltage bracket", coverPlate: "Single-gang phone cover", miscParts: "RJ11 jack, connection block", wireType: "Cat6", wireFootage: 50, laborHours: 0.25, materialCost: 10.00 },
  // Specialty — prices from Material List
  { name: "Doorbell Transformer", symbolType: "doorbell", category: "specialty", device: "16V doorbell transformer + chime + button", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, bell wire, button, chime", wireType: "18/2 Bell Wire", wireFootage: 40, laborHours: 0.50, materialCost: 52.00 },
  { name: "Thermostat", symbolType: "thermostat", category: "specialty", device: "Thermostat wire connection", boxType: "N/A", coverPlate: "N/A", miscParts: "Thermostat wire connectors", wireType: "18/5 Thermostat Wire", wireFootage: 40, laborHours: 0.30, materialCost: 15.00 },
  { name: "Motion Sensor Switch", symbolType: "motion_sensor", category: "switches", device: "Occupancy/motion sensor switch", boxType: "Single-gang device box, NM", coverPlate: "Sensor cover plate", miscParts: "Wire nuts, ground pigtail", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.25, materialCost: 35.80 },
  { name: "Occupancy Sensor (Ceiling)", symbolType: "occupancy_sensor", category: "switches", device: "Ceiling mount occupancy sensor", boxType: "Octagon box, NM", coverPlate: "N/A", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.25, materialCost: 49.65 },
  // Service / Panel — prices from Material List (200A Panel $650, 100A Panel $335)
  { name: "Panel Board (200A)", symbolType: "panel_board", category: "service", device: "200A main breaker load center, 40/80 circuit", boxType: "N/A", coverPlate: "Panel cover", miscParts: "Ground bus, neutral bus, grounding electrode conductor", wireType: "3/0 AL SER Cable", wireFootage: 25, laborHours: 6.00, materialCost: 660.00 },
  { name: "Sub-Panel (100A)", symbolType: "subpanel", category: "service", device: "100A sub-panel, 20-circuit", boxType: "N/A", coverPlate: "Panel cover", miscParts: "Ground bus, neutral bus, feeder breaker", wireType: "3 AWG NMD-90", wireFootage: 30, laborHours: 4.00, materialCost: 360.00 },
  { name: "Junction Box", symbolType: "junction_box", category: "specialty", device: "4x4 junction box with cover", boxType: "4x4 junction box", coverPlate: "Blank cover plate", miscParts: "Wire nuts, cable connectors", wireType: "14/2 NMD-90", wireFootage: 5, laborHours: 0.20, materialCost: 8.00 },
  { name: "Switched Soffit Outlet", symbolType: "switched_soffit_outlet", category: "receptacles", device: "15A weatherproof receptacle in soffit", boxType: "Weatherproof box", coverPlate: "In-use weatherproof cover", miscParts: "Wire nuts, WP connector, switch loop", wireType: "14/2 NMD-90", wireFootage: 20, laborHours: 0.25, materialCost: 34.00 },
  { name: "A/C Disconnect", symbolType: "ac_disconnect", category: "service", device: "60A non-fused disconnect", boxType: "Weatherproof enclosure", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, PVC conduit", wireType: "10/2 NMD-90", wireFootage: 50, laborHours: 1.00, materialCost: 39.00 },
  // Specialty devices — prices from Material List (BB Heat, LED Strip, etc.)
  { name: "In-Floor Radiant Heat", symbolType: "floor_heat", category: "specialty", device: "240V GFI in-floor radiant heat mat + thermostat", boxType: "Single-gang device box, NM", coverPlate: "Thermostat cover", miscParts: "Wire nuts, box connector, floor sensor", wireType: "12/2 NMD-90", wireFootage: 25, laborHours: 2.00, materialCost: 350.00 },
  { name: "Baseboard Heater (240V) - Wall Stat", symbolType: "baseboard_heater", category: "specialty", device: "240V baseboard heater 1500W + wall thermostat", boxType: "Junction box", coverPlate: "Thermostat cover", miscParts: "Wire nuts, cable connectors, mounting hardware", wireType: "12/2 NMD-90", wireFootage: 20, laborHours: 0.75, materialCost: 156.00 },
  { name: "Baseboard Heater (240V) - Built-in Stat", symbolType: "baseboard_heater_builtin", category: "specialty", device: "240V baseboard heater 1500W + built-in thermostat", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, mounting hardware", wireType: "12/2 NMD-90", wireFootage: 20, laborHours: 0.60, materialCost: 178.00 },
  { name: "Sauna Heater (240V)", symbolType: "sauna_heater", category: "specialty", device: "240V sauna heater + LV thermostat", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, sauna thermostat, sensor", wireType: "10/2 NMD-90", wireFootage: 25, laborHours: 2.50, materialCost: 450.00 },
  { name: "LED Strip Light", symbolType: "led_strip_light", category: "lighting", device: "LED strip light with driver + AL channel", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, strip connectors, LED channel", wireType: "14/2 NMD-90", wireFootage: 10, laborHours: 0.50, materialCost: 89.00 },
  // Gas bond, water meter, mini split, hot tub
  { name: "Gas Bond", symbolType: "gas_bond", category: "specialty", device: "Gas bonding connection per CEC", boxType: "N/A", coverPlate: "N/A", miscParts: "Bonding clamp, #6 bare copper", wireType: "14/2 NMD-90", wireFootage: 10, laborHours: 0.25, materialCost: 15.00 },
  { name: "Water Meter Bond", symbolType: "water_meter_bond", category: "specialty", device: "Water meter bonding jumper", boxType: "N/A", coverPlate: "N/A", miscParts: "Bonding clamps, jumper wire", wireType: "18/5 Thermostat Wire", wireFootage: 10, laborHours: 0.25, materialCost: 12.00 },
  { name: "Mini Split Wiring", symbolType: "mini_split", category: "specialty", device: "Mini split A/C wiring + disconnect", boxType: "Weatherproof enclosure", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, line set whip", wireType: "10/2 NMD-90", wireFootage: 40, laborHours: 1.50, materialCost: 72.00 },
  { name: "Hot Tub Circuit (Rough-in)", symbolType: "hot_tub", category: "specialty", device: "50A GFCI breaker + disconnect for hot tub", boxType: "Weatherproof disconnect box", coverPlate: "N/A", miscParts: "50A GFCI breaker, disconnect, PVC conduit", wireType: "8/3 NMD-90", wireFootage: 50, laborHours: 3.00, materialCost: 250.00 },
  { name: "Gas Furnace Disconnect", symbolType: "furnace_disconnect", category: "specialty", device: "Gas furnace wiring with disconnect switch", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, disconnect switch, cable connectors", wireType: "14/2 NMD-90", wireFootage: 20, laborHours: 0.50, materialCost: 25.00 },
  // New assemblies from Material List
  { name: "Bath Timer Switch", symbolType: "bath_timer_switch", category: "switches", device: "Bath timer switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.25, materialCost: 65.04 },
  { name: "24hr Timer Switch", symbolType: "timer_switch_24hr", category: "switches", device: "24hr timer switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 15, laborHours: 0.25, materialCost: 53.44 },
  { name: "Step/Motion Light", symbolType: "step_motion_light", category: "lighting", device: "Step motion light", boxType: "Single-gang device box, NM", coverPlate: "N/A", miscParts: "Wire nuts, box connector", wireType: "14/2 NMD-90", wireFootage: 10, laborHours: 0.30, materialCost: 59.00 },
  { name: "30A RV Outlet", symbolType: "rv_outlet", category: "receptacles", device: "30A RV outlet, NEMA TT-30", boxType: "Weatherproof box", coverPlate: "RV cover", miscParts: "Wire nuts, WP connector", wireType: "10/2 NMD-90", wireFootage: 30, laborHours: 0.40, materialCost: 37.00 },
  { name: "15A 240V Outlet", symbolType: "outlet_240v_15a", category: "receptacles", device: "15A 240V outlet", boxType: "Single-gang device box, NM", coverPlate: "Single-gang cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NMD-90", wireFootage: 20, laborHours: 0.30, materialCost: 16.44 },
  { name: "20A 240V Outlet", symbolType: "outlet_240v_20a", category: "receptacles", device: "20A 240V outlet", boxType: "Single-gang device box, NM", coverPlate: "Single-gang cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "12/2 NMD-90", wireFootage: 20, laborHours: 0.30, materialCost: 20.44 },
];

export async function seedDatabase() {
  const existingAssemblies = await db.select().from(deviceAssemblies);
  if (existingAssemblies.length === 0) {
    console.log("Seeding device assemblies...");
    for (const assembly of DEFAULT_ASSEMBLIES) {
      await db.insert(deviceAssemblies).values({ ...assembly, isDefault: true });
    }
    console.log(`Seeded ${DEFAULT_ASSEMBLIES.length} device assemblies`);
  }

  const existingProjects = await db.select().from(projects);
  if (existingProjects.length === 0) {
    console.log("Seeding sample projects...");

    const [p1] = await db.insert(projects).values({
      name: "Thompson Residence - Full Rewire",
      clientName: "Robert Thompson",
      clientEmail: "rob.thompson@email.ca",
      clientPhone: "(416) 555-0142",
      address: "45 Maple Crescent, Toronto, ON M4N 1T2",
      dwellingType: "single",
      status: "in_progress",
      notes: "3-bedroom bungalow, complete rewire from knob-and-tube. Asbestos abatement completed.",
    }).returning();

    const [p2] = await db.insert(projects).values({
      name: "Chen Duplex - New Construction",
      clientName: "Lisa Chen",
      clientEmail: "lisa.chen@gmail.com",
      clientPhone: "(604) 555-0198",
      address: "182 Oak Street, Vancouver, BC V6H 2K5",
      dwellingType: "duplex",
      status: "bid_sent",
      notes: "New construction duplex. Each unit has 2 bedrooms. Builder wants EV charger prep in both garages.",
    }).returning();

    const [p3] = await db.insert(projects).values({
      name: "Moreau Kitchen Renovation",
      clientName: "Jean-Pierre Moreau",
      clientEmail: "jp.moreau@videotron.ca",
      clientPhone: "(514) 555-0231",
      address: "78 Rue Sainte-Catherine, Montreal, QC H2X 1K4",
      dwellingType: "single",
      status: "won",
      notes: "Kitchen reno only - adding island with outlets, under cabinet lights, upgrading panel to accommodate new circuits.",
    }).returning();

    await db.insert(projects).values({
      name: "Park Condo - Bathroom Upgrade",
      clientName: "Sarah Park",
      clientPhone: "(403) 555-0167",
      address: "Unit 1204, 500 Centre St SE, Calgary, AB T2G 1A4",
      dwellingType: "single",
      status: "draft",
      notes: "Bathroom exhaust fan upgrade and GFCI replacement in both bathrooms.",
    });

    const [est1] = await db.insert(estimates).values({
      projectId: p1.id,
      name: "Main Quote",
      overheadPct: 12,
      profitPct: 5,
      materialMarkupPct: 5,
      laborMarkupPct: 5,
      laborRate: 90,
    }).returning();

    await db.insert(estimateItems).values([
      { estimateId: est1.id, deviceType: "Duplex Receptacle (15A)", description: "15A duplex receptacle, TR", room: "Living Room", quantity: 6, materialCost: 8.50, laborHours: 0.18, wireType: "14/2 NMD-90", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Duplex Receptacle (15A)", description: "15A duplex receptacle, TR", room: "Bedroom 1", quantity: 4, materialCost: 8.50, laborHours: 0.18, wireType: "14/2 NMD-90", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "GFCI Receptacle (15A)", description: "15A GFCI receptacle, TR, WR", room: "Kitchen", quantity: 2, materialCost: 28.50, laborHours: 0.25, wireType: "14/2 NMD-90", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Single-Pole Switch", description: "15A single-pole switch", room: "Living Room", quantity: 3, materialCost: 6.50, laborHours: 0.15, wireType: "14/2 NMD-90", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Recessed Light (4\")", description: "4\" LED recessed light, IC rated", room: "Kitchen", quantity: 6, materialCost: 35.00, laborHours: 0.35, wireType: "14/2 NMD-90", wireFootage: 8, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Smoke Detector (Hardwired)", description: "Hardwired smoke detector with battery backup", room: "Hallway", quantity: 3, materialCost: 35.00, laborHours: 0.25, wireType: "14/3 NMD-90", wireFootage: 20, markupPct: 0 },
    ]);

    const [est2] = await db.insert(estimates).values({
      projectId: p3.id,
      name: "Kitchen Reno Quote",
      overheadPct: 15,
      profitPct: 12,
      laborRate: 90,
    }).returning();

    await db.insert(estimateItems).values([
      { estimateId: est2.id, deviceType: "Split Receptacle (Kitchen)", description: "15A split duplex receptacle", room: "Kitchen", quantity: 4, materialCost: 14.00, laborHours: 0.30, wireType: "14/3 NMD-90", wireFootage: 20, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Under Cabinet Light", description: "LED under-cabinet light, 24\"", room: "Kitchen", quantity: 3, materialCost: 30.00, laborHours: 0.25, wireType: "14/2 NMD-90", wireFootage: 8, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Range Hood", description: "30\" range hood", room: "Kitchen", quantity: 1, materialCost: 85.00, laborHours: 0.60, wireType: "14/2 NMD-90", wireFootage: 15, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Dedicated Receptacle (Fridge)", description: "15A single receptacle, dedicated", room: "Kitchen", quantity: 1, materialCost: 10.00, laborHours: 0.25, wireType: "14/2 NMD-90", wireFootage: 25, markupPct: 0 },
    ]);

    console.log("Seeded 4 sample projects with estimates");
  }

  const defaultWires = [
    { name: "14/2 NMD-90", costPerFoot: 0.61 },
    { name: "14/3 NMD-90", costPerFoot: 0.88 },
    { name: "12/2 NMD-90", costPerFoot: 0.75 },
    { name: "12/3 NMD-90", costPerFoot: 1.66 },
    { name: "10/2 NMD-90", costPerFoot: 1.71 },
    { name: "10/3 NMD-90", costPerFoot: 2.29 },
    { name: "8/3 NMD-90", costPerFoot: 4.10 },
    { name: "6/3 NMD-90", costPerFoot: 6.49 },
    { name: "3 AWG NMD-90", costPerFoot: 3.75 },
    { name: "2/0 AL SER Cable", costPerFoot: 4.25 },
    { name: "3/0 AL SER Cable", costPerFoot: 5.25 },
    { name: "18/2 Bell Wire", costPerFoot: 0.43 },
    { name: "18/4 Thermostat Wire", costPerFoot: 0.61 },
    { name: "18/5 Thermostat Wire", costPerFoot: 0.70 },
    { name: "#6 Bare Copper", costPerFoot: 1.37 },
    { name: "Cat6", costPerFoot: 0.43 },
    { name: "RG6 Coax", costPerFoot: 0.15 },
    { name: "Fiber Optic", costPerFoot: 0.34 },
    { name: "Landscape Wire", costPerFoot: 0.25 },
    // New wire types from Material List
    { name: "18/8 Wire", costPerFoot: 1.07 },
    { name: "18/10 Wire", costPerFoot: 1.58 },
    { name: "14/2 BX", costPerFoot: 1.48 },
    { name: "14/3 BX", costPerFoot: 1.52 },
    { name: "12/2 BX", costPerFoot: 1.71 },
    { name: "12/3 BX", costPerFoot: 1.83 },
    { name: "10/2 BX", costPerFoot: 2.13 },
    { name: "10/3 BX", costPerFoot: 2.44 },
    { name: "#14 RW90 X-Link", costPerFoot: 0.30 },
    { name: "#12 RW90 X-Link", costPerFoot: 0.38 },
    { name: "#10 RW90 X-Link", costPerFoot: 0.46 },
    { name: "Water Meter Wire", costPerFoot: 0.30 },
    { name: "#1 Acwu 3C", costPerFoot: 4.57 },
    { name: "250 Kcmil Acwu", costPerFoot: 10.24 },
    { name: "14/2 Teck", costPerFoot: 1.71 },
    { name: "12/2 Teck", costPerFoot: 2.05 },
    { name: "16/2 Speaker", costPerFoot: 0.37 },
    { name: "16/4 Speaker", costPerFoot: 0.49 },
    { name: "14/2 Speaker", costPerFoot: 0.46 },
    { name: "14/4 Speaker", costPerFoot: 0.61 },
    // Service wire (from Service Material list, +12% tax, $/m → $/ft)
    { name: "250 Kcmil X-Link", costPerFoot: 1.98 },
  ];
  const existingWireTypes = await db.select().from(wireTypes);
  const existingNames = new Set(existingWireTypes.map(w => w.name));
  const newWires = defaultWires.filter(w => !existingNames.has(w.name));
  if (newWires.length > 0) {
    console.log(`Seeding ${newWires.length} new wire types...`);
    for (const wire of newWires) {
      await db.insert(wireTypes).values(wire);
    }
    console.log(`Seeded wire types: ${newWires.map(w => w.name).join(", ")}`);
  }

  // Seed job types (NECA Manual of Labour Units)
  const existingJobTypes = await db.select().from(jobTypes);
  if (existingJobTypes.length === 0) {
    console.log("Seeding job types...");
    const defaultJobTypes = [
      { value: "new_construction", label: "New Construction", multiplier: 1.0, isDefault: true },
      { value: "multi_family", label: "Multi-Family", multiplier: 1.1, isDefault: true },
      { value: "commercial_new", label: "Commercial (New)", multiplier: 1.15, isDefault: true },
      { value: "addition", label: "Addition", multiplier: 1.2, isDefault: true },
      { value: "custom_home", label: "Custom / High-End", multiplier: 1.2, isDefault: true },
      { value: "institutional", label: "Institutional", multiplier: 1.3, isDefault: true },
      { value: "industrial", label: "Industrial", multiplier: 1.35, isDefault: true },
      { value: "renovation", label: "Renovation", multiplier: 1.4, isDefault: true },
      { value: "commercial_reno", label: "Commercial Reno / TI", multiplier: 1.45, isDefault: true },
      { value: "service_repair", label: "Service / Repair", multiplier: 1.75, isDefault: true },
    ];
    for (const jt of defaultJobTypes) {
      await db.insert(jobTypes).values(jt);
    }
    console.log(`Seeded ${defaultJobTypes.length} job types`);
  }

  const existingBundles = await db.select().from(serviceBundles);
  if (existingBundles.length === 0) {
    console.log("Seeding service bundles...");
    // Service bundle prices calibrated from Horizon 4232 (BC 2025)
    const defaultBundles = [
      { name: "Temporary Power", items: ["Temporary panel", "GFI receptacles", "Extension cords", "Ground rod"], materialCost: 450, laborHours: 4 },
      { name: "Underground Service Entrance", items: ["100A panel", "Meter base", "PVC conduit", "Ground rod", "Service entrance cable"], materialCost: 1200, laborHours: 8 },
      { name: "Overhead Service Entrance (200A)", items: ["200A panel 40/80", "Meter base", "Weather head", "Service mast", "SE cable", "Ground plate", "Conduit fittings"], materialCost: 1800, laborHours: 10 },
      { name: "2-Position Meter Base (200A House + 100A Suite)", items: ["400A dual meter base", "200A panel 40/80", "100A panel", "PVC conduit 2\"", "Unistrut", "LBs/adapters", "Ground plate", "#6 copper", "Sealite", "Staples/straps"], materialCost: 3594, laborHours: 15 },
      { name: "Panel Upgrade (100A to 200A)", items: ["200A panel", "200A breaker", "New meter base", "Grounding system"], materialCost: 1500, laborHours: 8 },
      { name: "EV Charger Installation", items: ["50A breaker", "8/3 NMD-90 wire", "NEMA 14-50 receptacle", "Surface mount box"], materialCost: 280, laborHours: 3 },
      { name: "Whole Home Surge Protection", items: ["Panel-mount surge protector", "2-pole breaker"], materialCost: 180, laborHours: 1 },
      { name: "Generator Transfer Switch", items: ["Manual transfer switch", "Inlet box", "10/3 cable"], materialCost: 450, laborHours: 4 },
      { name: "Hot Tub Circuit", items: ["50A GFCI breaker", "8/3 NMD-90 wire", "Disconnect box", "PVC conduit"], materialCost: 350, laborHours: 5 },
      { name: "Mini Split A/C Circuit", items: ["30A breaker", "10/2 NMD-90 wire", "A/C disconnect", "Line set whip"], materialCost: 85, laborHours: 1.5 },
    ];
    for (const bundle of defaultBundles) {
      await db.insert(serviceBundles).values(bundle);
    }
    console.log(`Seeded ${defaultBundles.length} service bundles`);
  }

  // Parts catalog with real prices from Material List (2026, 12% tax included)
  const DEFAULT_PARTS: Array<{ name: string; category: string; unitCost: number }> = [
    // === BOXES ===
    { name: "1 Gang Device Box", category: "box", unitCost: 2.24 },
    { name: "1 Gang Insulated Box", category: "box", unitCost: 3.60 },
    { name: "2 Gang Device Box", category: "box", unitCost: 6.00 },
    { name: "2 Gang Insulated Box", category: "box", unitCost: 10.50 },
    { name: "3 Gang Device Box", category: "box", unitCost: 10.50 },
    { name: "3 Gang Insulated Box", category: "box", unitCost: 14.00 },
    { name: "4 Gang Device Box", category: "box", unitCost: 16.00 },
    { name: "4 Gang Insulated Box", category: "box", unitCost: 22.00 },
    { name: "1 Gang Retro Box", category: "box", unitCost: 16.24 },
    { name: "Tel/Tv Nail-on Box", category: "box", unitCost: 3.00 },
    { name: "Tel/Tv Retro Box", category: "box", unitCost: 8.00 },
    { name: "Pan Box", category: "box", unitCost: 2.00 },
    { name: "Octagon Metal Box", category: "box", unitCost: 7.00 },
    { name: "Octagon Insulated Box", category: "box", unitCost: 6.00 },
    { name: "Octagon Plastic Box (no nail)", category: "box", unitCost: 4.00 },
    { name: "Light Box Retro", category: "box", unitCost: 16.00 },
    { name: "4x4 Metal Box", category: "box", unitCost: 5.00 },
    { name: "4x4 Extension Box", category: "box", unitCost: 4.00 },
    { name: "4-11/16 Metal Box", category: "box", unitCost: 7.00 },
    { name: "4-11/16 Insulated Box", category: "box", unitCost: 14.00 },
    { name: "Shallow Metal Box", category: "box", unitCost: 7.00 },
    { name: "Ceiling Fan Metal Box", category: "box", unitCost: 21.28 },
    { name: "11/10 Metal Box", category: "box", unitCost: 5.00 },
    { name: "Floor Outlet Wood Box", category: "box", unitCost: 12.00 },
    { name: "Floor Outlet Concrete Box", category: "box", unitCost: 18.00 },
    { name: "FD PVC Box", category: "box", unitCost: 5.00 },
    { name: "Tele/Tv 2-Gang Recessed Box", category: "box", unitCost: 35.00 },
    { name: "Mud Ring 4 inch", category: "box", unitCost: 2.00 },
    { name: "Peak Box", category: "box", unitCost: 45.00 },
    { name: "Vapour Barrier Boot (Vapo Boot)", category: "box", unitCost: 9.00 },
    { name: "Rough-in Ring 4\"/6\"", category: "box", unitCost: 9.00 },
    { name: "Fire Rated 4 inch", category: "box", unitCost: 33.60 },
    // === DEVICES — Outlets ===
    { name: "15A Outlet", category: "device", unitCost: 2.30 },
    { name: "15A GFCI Outlet", category: "device", unitCost: 30.00 },
    { name: "20A Outlet", category: "device", unitCost: 7.00 },
    { name: "20A GFCI Outlet", category: "device", unitCost: 33.00 },
    { name: "30A RV Outlet", category: "device", unitCost: 18.00 },
    { name: "15A 240V Outlet", category: "device", unitCost: 12.00 },
    { name: "20A 240V Outlet", category: "device", unitCost: 16.00 },
    { name: "30A 240V Outlet", category: "device", unitCost: 17.00 },
    { name: "50A 240V Welder Outlet", category: "device", unitCost: 17.50 },
    { name: "50A 240V Range Outlet", category: "device", unitCost: 8.00 },
    { name: "30A 240V Dryer Outlet", category: "device", unitCost: 8.00 },
    // === DEVICES — Switches ===
    { name: "Single Pole Switch", category: "device", unitCost: 2.20 },
    { name: "3 Way Switch", category: "device", unitCost: 4.00 },
    { name: "4 Way Switch", category: "device", unitCost: 22.40 },
    { name: "Dimmer Switch", category: "device", unitCost: 45.00 },
    { name: "Motion Switch", category: "device", unitCost: 31.36 },
    { name: "Bath Timer Switch", category: "device", unitCost: 61.60 },
    { name: "Timer Switch 24hr", category: "device", unitCost: 50.00 },
    // === DEVICES — Lighting ===
    { name: "4\" Wafer/Can Light", category: "device", unitCost: 25.00 },
    { name: "6\" Wafer/Can Light", category: "device", unitCost: 36.00 },
    { name: "4\" Gimbal Light", category: "device", unitCost: 25.00 },
    { name: "6\" Gimbal Light", category: "device", unitCost: 36.00 },
    { name: "Step Motion Light", category: "device", unitCost: 56.00 },
    { name: "Keyless Light Fixture", category: "device", unitCost: 4.00 },
    { name: "Motion Light Fixture", category: "device", unitCost: 42.00 },
    { name: "Bright Stick / Light Bulb", category: "device", unitCost: 4.00 },
    // === DEVICES — Safety ===
    { name: "CO Smoke Detector (Combo)", category: "device", unitCost: 80.34 },
    { name: "Regular Smoke Detector", category: "device", unitCost: 21.00 },
    { name: "Doorbell (Transformer + Chime + Button)", category: "device", unitCost: 45.00 },
    // === DEVICES — Fans & Disconnects ===
    { name: "Bath Fan 1-Speed", category: "device", unitCost: 150.00 },
    { name: "Bath Fan Dual Speed", category: "device", unitCost: 150.00 },
    { name: "AC Disconnect (60A)", category: "device", unitCost: 24.00 },
    // === COVER PLATES ===
    { name: "1 Gang Plate", category: "cover_plate", unitCost: 1.00 },
    { name: "2 Gang Plate", category: "cover_plate", unitCost: 1.50 },
    { name: "3 Gang Plate", category: "cover_plate", unitCost: 2.00 },
    { name: "4 Gang Plate", category: "cover_plate", unitCost: 7.00 },
    { name: "Blank Plastic 1G", category: "cover_plate", unitCost: 2.24 },
    { name: "Blank Plastic 2G", category: "cover_plate", unitCost: 7.00 },
    { name: "11/10 Blank Plate", category: "cover_plate", unitCost: 3.00 },
    { name: "4x4 Blank Plate", category: "cover_plate", unitCost: 2.00 },
    { name: "4-11/16 Blank Plate", category: "cover_plate", unitCost: 4.26 },
    { name: "FD PVC Blank Plate", category: "cover_plate", unitCost: 2.00 },
    { name: "Furnace Red Plate", category: "cover_plate", unitCost: 1.00 },
    { name: "Octagon Blank Finish Dome", category: "cover_plate", unitCost: 7.00 },
    { name: "Octagon Blank Finish Flat", category: "cover_plate", unitCost: 5.00 },
    { name: "Octagon Blank Metal", category: "cover_plate", unitCost: 2.00 },
    { name: "Weather Proof In-Use Cover", category: "cover_plate", unitCost: 22.50 },
    { name: "Flip Cover (Wht/Gry/Blk/Brw)", category: "cover_plate", unitCost: 10.00 },
    { name: "RV Cover", category: "cover_plate", unitCost: 12.00 },
    // === BREAKERS ===
    { name: "15A Single Pole Breaker", category: "breaker", unitCost: 15.00 },
    { name: "15A Arc Fault SP Breaker", category: "breaker", unitCost: 100.00 },
    { name: "15A Arc/GFCI SP Breaker", category: "breaker", unitCost: 160.00 },
    { name: "20A Single Pole Breaker", category: "breaker", unitCost: 15.00 },
    { name: "20A Arc Fault SP Breaker", category: "breaker", unitCost: 90.00 },
    { name: "30A 2-Pole Breaker", category: "breaker", unitCost: 42.00 },
    { name: "15A 2-Pole Breaker", category: "breaker", unitCost: 35.00 },
    { name: "20A 2-Pole Breaker", category: "breaker", unitCost: 37.00 },
    { name: "40A 2-Pole Breaker", category: "breaker", unitCost: 42.00 },
    { name: "50A 2-Pole Breaker", category: "breaker", unitCost: 48.00 },
    { name: "60A 2-Pole Breaker", category: "breaker", unitCost: 52.00 },
    { name: "70A 2-Pole Breaker", category: "breaker", unitCost: 58.00 },
    { name: "100A Breaker", category: "breaker", unitCost: 100.00 },
    { name: "Tandem Breaker 15/15", category: "breaker", unitCost: 34.00 },
    { name: "Tandem Breaker 20/20", category: "breaker", unitCost: 34.00 },
    { name: "Tandem Breaker 15/30", category: "breaker", unitCost: 34.00 },
    { name: "Quad Breaker 15/15-15/15", category: "breaker", unitCost: 68.00 },
    { name: "Quad Breaker 15/20-20/15", category: "breaker", unitCost: 68.00 },
    { name: "Quad Breaker 15/30-30/15", category: "breaker", unitCost: 68.00 },
    { name: "Quad Breaker 15/40-40/15", category: "breaker", unitCost: 68.00 },
    // === PANELS ===
    { name: "100A Panel 30/60 (40/80)", category: "panel_component", unitCost: 335.00 },
    { name: "125A Panel 30/60 (40/80)", category: "panel_component", unitCost: 450.00 },
    { name: "200A Panel 40/80 (60/120)", category: "panel_component", unitCost: 650.00 },
    // === CONNECTORS / ADAPTERS ===
    { name: "Straight BX Connector", category: "connector", unitCost: 1.50 },
    { name: "90° BX Connector", category: "connector", unitCost: 1.50 },
    { name: "Double BX Connector", category: "connector", unitCost: 2.00 },
    { name: "Coreline Connector", category: "connector", unitCost: 3.50 },
    { name: "Liquid Tight Connector", category: "connector", unitCost: 2.10 },
    { name: "Rigid PVC Coupling", category: "connector", unitCost: 1.50 },
    { name: "Rigid PVC Adapter", category: "connector", unitCost: 1.50 },
    { name: "1/2\" NM Connector (Pop-in)", category: "connector", unitCost: 0.25 },
    { name: "3/4\" NM Connector (Pop-in)", category: "connector", unitCost: 0.80 },
    // === WIRE NUTS / MISC ===
    { name: "Marrettes (Wire Nuts)", category: "wire_nut", unitCost: 0.15 },
    { name: "1/2\" Staples", category: "mounting", unitCost: 0.12 },
    { name: "Bonding Clamp (Gas/Pipe)", category: "misc", unitCost: 7.00 },
    { name: "Duct Seal", category: "misc", unitCost: 7.00 },
    { name: "CED 130 Data Insert", category: "misc", unitCost: 7.50 },
    { name: "AC Whip", category: "misc", unitCost: 41.00 },
    // === CONDUIT ===
    { name: "EMT 1/2\"", category: "misc", unitCost: 5.00 },
    { name: "EMT 3/4\"", category: "misc", unitCost: 7.00 },
    { name: "EMT 1\"", category: "misc", unitCost: 10.00 },
    { name: "EMT 1-1/4\"", category: "misc", unitCost: 14.00 },
    { name: "CoreLine 1/2\"", category: "misc", unitCost: 15.00 },
    { name: "LiquidTight 1/2\"", category: "misc", unitCost: 3.00 },
    { name: "BX Flex 7/16\"", category: "misc", unitCost: 1.50 },
    { name: "BX Flex 3/4\"", category: "misc", unitCost: 2.50 },
    { name: "BX Flex 1\"", category: "misc", unitCost: 3.50 },
    { name: "DB2", category: "misc", unitCost: 1.00 },
    // === BASEBOARD HEAT ===
    { name: "BB Heat Wall Thermostat", category: "device", unitCost: 23.00 },
    { name: "BB Heat Built-in Thermostat", category: "device", unitCost: 45.00 },
    { name: "BB Heat 500W", category: "device", unitCost: 74.00 },
    { name: "BB Heat 1000W", category: "device", unitCost: 99.00 },
    { name: "BB Heat 1500W", category: "device", unitCost: 126.00 },
    { name: "BB Heat 2000W", category: "device", unitCost: 163.00 },
    // === LED STRIP LIGHTING ===
    { name: "LED Strip 12V (per meter)", category: "device", unitCost: 22.00 },
    { name: "LED Strip 24V (per meter)", category: "device", unitCost: 11.00 },
    { name: "AL Channel (per meter)", category: "device", unitCost: 18.00 },
    { name: "LED Driver 15W", category: "device", unitCost: 30.00 },
    { name: "LED Driver 30W", category: "device", unitCost: 53.00 },
    { name: "LED Driver 60W", category: "device", unitCost: 53.00 },
    { name: "LED Driver 96W", category: "device", unitCost: 80.00 },
    { name: "LED Strip Connectors", category: "connector", unitCost: 7.00 },
    // === POTS (additional) ===
    { name: "4\" Wafer/Can (Juno)", category: "device", unitCost: 25.00 },
    { name: "4\" Wafer/Can (Liteline)", category: "device", unitCost: 30.00 },
    { name: "4\" Wafer/Can (Topaz)", category: "device", unitCost: 20.00 },
    { name: "6\" Wafer/Can (Juno)", category: "device", unitCost: 40.00 },
    { name: "6\" Wafer/Can (Liteline)", category: "device", unitCost: 36.00 },
    { name: "6\" Wafer/Can (Topaz)", category: "device", unitCost: 30.00 },
    // === SERVICE MATERIAL (from Service Material list, prices +12% tax) ===
    // Meter/Panels
    { name: "400A 2 Position Meter", category: "panel_component", unitCost: 929.60 },
    { name: "200A 1 Position Meter", category: "panel_component", unitCost: 212.80 },
    { name: "Data Box", category: "box", unitCost: 72.80 },
    // Pole
    { name: "Service Mounting Kit", category: "misc", unitCost: 57.12 },
    { name: "Meter Hub 2\" PVC", category: "connector", unitCost: 12.32 },
    { name: "Weatherhead 2\" PVC", category: "misc", unitCost: 45.92 },
    // Rigid PVC / Conduit
    { name: "J 2\" Rigid PVC", category: "misc", unitCost: 143.36 },
    { name: "J 3\" Rigid PVC", category: "misc", unitCost: 134.40 },
    { name: "DB2 2\"", category: "misc", unitCost: 22.40 },
    { name: "DB2 3\"", category: "misc", unitCost: 39.20 },
    { name: "Rigid PVC 1/2\"", category: "misc", unitCost: 7.84 },
    { name: "Rigid PVC 2\"", category: "misc", unitCost: 28.00 },
    { name: "DB2T 90° 2\"", category: "misc", unitCost: 39.20 },
    { name: "DB2 3\" 90°", category: "misc", unitCost: 40.32 },
    { name: "3\" PVC Coupling", category: "connector", unitCost: 5.60 },
    { name: "2\" PVC Coupler", category: "connector", unitCost: 5.60 },
    { name: "2\" Coupler to Rigid PVC", category: "connector", unitCost: 13.44 },
    // Straps
    { name: "2\" PVC Strap", category: "mounting", unitCost: 11.20 },
    { name: "3\" Rigid Metal Strap", category: "mounting", unitCost: 1.46 },
    { name: "1-1/2\" EMT 2 Hole Strap", category: "mounting", unitCost: 0.45 },
    { name: "1-1/4\" EMT 2 Hole Strap", category: "mounting", unitCost: 0.34 },
    { name: "1/2\" PVC Strap", category: "mounting", unitCost: 0.56 },
    // Mast Clamp
    { name: "Mast Reducer 2-1/2\"", category: "misc", unitCost: 45.90 },
    { name: "Mast Head Adapter", category: "misc", unitCost: 49.48 },
    { name: "2\" Conduit Entry to Hub", category: "connector", unitCost: 12.03 },
    { name: "2\" Hub", category: "connector", unitCost: 36.32 },
    { name: "Mast Clevis", category: "misc", unitCost: 61.58 },
    { name: "Mast 2.5\"", category: "misc", unitCost: 189.28 },
    { name: "EMT 2\"", category: "misc", unitCost: 22.74 },
    // Connectors / Bushings
    { name: "Single Saddle 1\"", category: "mounting", unitCost: 5.60 },
    { name: "Ground Bushing 1\"", category: "connector", unitCost: 8.96 },
    { name: "2\" 4 Screw MC Connector", category: "connector", unitCost: 33.60 },
    { name: "2\" Bushing", category: "connector", unitCost: 16.80 },
    { name: "Teck Connector 1-1/2\"", category: "connector", unitCost: 87.36 },
    { name: "2\" 2 Screw Conduit Connector", category: "connector", unitCost: 28.00 },
    { name: "1-1/2\" Bushing", category: "connector", unitCost: 12.32 },
    { name: "2\" TA Connector", category: "connector", unitCost: 5.90 },
    { name: "2\" Locknut", category: "connector", unitCost: 0.93 },
    { name: "2\" Plastic Bushing", category: "connector", unitCost: 1.59 },
    // Other Service
    { name: "PVC 2\" LB", category: "misc", unitCost: 70.56 },
    { name: "Protection Plate", category: "misc", unitCost: 0.26 },
  ];

  const existingParts = await db.select().from(partsCatalog);
  if (existingParts.length === 0) {
    console.log("Seeding parts catalog from Material List...");
    const partIdMap = new Map<string, number>();

    // Insert all parts from Material List
    for (const part of DEFAULT_PARTS) {
      const [inserted] = await db.insert(partsCatalog).values({
        name: part.name,
        category: part.category,
        unitCost: part.unitCost,
        isActive: true,
      }).returning();
      partIdMap.set(part.name, inserted.id);
    }
    console.log(`Seeded ${partIdMap.size} parts from Material List`);

    // Create assembly_parts junction rows from assembly text fields
    const assemblies = await db.select().from(deviceAssemblies);
    let linkCount = 0;
    for (const a of assemblies) {
      const partsForAssembly: string[] = [];
      if (a.device) partsForAssembly.push(a.device);
      if (a.boxType) partsForAssembly.push(a.boxType);
      if (a.coverPlate) partsForAssembly.push(a.coverPlate);
      if (a.miscParts) {
        partsForAssembly.push(...a.miscParts.split(",").map(s => s.trim()).filter(Boolean));
      }

      for (const partName of partsForAssembly) {
        // Try exact match first, then fuzzy match
        let partId = partIdMap.get(partName);
        if (!partId) {
          // Try to find a matching part by keyword
          for (const [name, id] of Array.from(partIdMap.entries())) {
            if (name.toLowerCase().includes(partName.toLowerCase().slice(0, 10)) ||
                partName.toLowerCase().includes(name.toLowerCase().slice(0, 10))) {
              partId = id;
              break;
            }
          }
        }
        if (partId) {
          await db.insert(assemblyParts).values({
            assemblyId: a.id,
            partId,
            quantity: 1,
          });
          linkCount++;
        }
      }
    }
    console.log(`Created ${linkCount} assembly-part links`);
  }

  // Seed TSBC Permit Fee Schedules
  const existingPermitSchedules = await db.select().from(permitFeeSchedules);
  if (existingPermitSchedules.length === 0) {
    console.log("Seeding TSBC permit fee schedules...");
    await db.insert(permitFeeSchedules).values({
      name: "TSBC 2026",
      effectiveDate: "2026-01-01",
      isActive: true,
      rates: {
        residential_service: [
          { label: "125A or less", maxAmps: 125, fee: 513 },
          { label: "126-200A", maxAmps: 200, fee: 836 },
          { label: "201-400A", maxAmps: 400, fee: 1223 },
          { label: "Greater than 400A", maxAmps: 9999, fee: 1706 },
        ],
        service_upgrade: [
          { label: "200A or less", maxAmps: 200, fee: 332 },
          { label: "201-400A", maxAmps: 400, fee: 513 },
          { label: "Greater than 400A", maxAmps: 9999, fee: 1223 },
        ],
        other: [
          { label: "$150 or less", maxValue: 150, fee: 15 },
          { label: "$151-$400", maxValue: 400, fee: 36 },
          { label: "$401-$1,000", maxValue: 1000, fee: 115 },
          { label: "$1,001-$2,500", maxValue: 2500, fee: 207 },
          { label: "$2,501-$5,000", maxValue: 5000, fee: 335 },
          { label: "$5,001-$10,000", maxValue: 10000, fee: 515 },
          { label: "$10,001-$20,000", maxValue: 20000, fee: 843 },
          { label: "$20,001-$35,000", maxValue: 35000, fee: 1236 },
          { label: "$35,001-$50,000", maxValue: 50000, fee: 1722 },
          { label: "$50,001-$100,000", maxValue: 100000, fee: 2469 },
          { label: "$100,001-$200,000", maxValue: 200000, fee: 3699 },
        ],
      },
    });
    await db.insert(permitFeeSchedules).values({
      name: "TSBC 2027",
      effectiveDate: "2027-01-01",
      isActive: false,
      rates: {
        residential_service: [
          { label: "125A or less", maxAmps: 125, fee: 539 },
          { label: "126-200A", maxAmps: 200, fee: 878 },
          { label: "201-400A", maxAmps: 400, fee: 1284 },
          { label: "Greater than 400A", maxAmps: 9999, fee: 1791 },
        ],
        service_upgrade: [
          { label: "200A or less", maxAmps: 200, fee: 349 },
          { label: "201-400A", maxAmps: 400, fee: 539 },
          { label: "Greater than 400A", maxAmps: 9999, fee: 1284 },
        ],
        other: [
          { label: "$150 or less", maxValue: 150, fee: 16 },
          { label: "$151-$400", maxValue: 400, fee: 38 },
          { label: "$401-$1,000", maxValue: 1000, fee: 121 },
          { label: "$1,001-$2,500", maxValue: 2500, fee: 217 },
          { label: "$2,501-$5,000", maxValue: 5000, fee: 352 },
          { label: "$5,001-$10,000", maxValue: 10000, fee: 541 },
          { label: "$10,001-$20,000", maxValue: 20000, fee: 885 },
          { label: "$20,001-$35,000", maxValue: 35000, fee: 1298 },
          { label: "$35,001-$50,000", maxValue: 50000, fee: 1808 },
          { label: "$50,001-$100,000", maxValue: 100000, fee: 2592 },
          { label: "$100,001-$200,000", maxValue: 200000, fee: 3884 },
        ],
      },
    });
    console.log("Seeded TSBC 2026 + 2027 permit fee schedules");
  }

  // Always run price migration to update existing data
  await updateMaterialPrices();
}

/**
 * Updates existing wire types, assemblies, and parts catalog with prices
 * from Material List (2026, 12% tax included). Runs on every startup.
 * Only updates default assemblies (isDefault=true) to avoid overwriting
 * user-customized pricing.
 */
async function updateMaterialPrices() {
  let updates = 0;
  let inserts = 0;

  // Wire price map: name → costPerFoot (from Material List, $/m converted to $/ft)
  const WIRE_PRICES: Record<string, number> = {
    "14/2 NMD-90": 0.61, "14/3 NMD-90": 0.88, "12/2 NMD-90": 0.75,
    "12/3 NMD-90": 1.66, "10/2 NMD-90": 1.71, "10/3 NMD-90": 2.29,
    "8/3 NMD-90": 4.10, "6/3 NMD-90": 6.49, "#6 Bare Copper": 1.37,
    "18/2 Bell Wire": 0.43, "18/4 Thermostat Wire": 0.61, "18/5 Thermostat Wire": 0.70,
    "Cat6": 0.43, "RG6 Coax": 0.15, "Fiber Optic": 0.34,
    "250 Kcmil X-Link": 1.98,
  };

  // 1. Update existing wire type prices by name match
  const existingWires = await db.select().from(wireTypes);
  for (const existing of existingWires) {
    const newPrice = WIRE_PRICES[existing.name];
    if (newPrice !== undefined && Math.abs(existing.costPerFoot - newPrice) > 0.001) {
      await db.update(wireTypes)
        .set({ costPerFoot: newPrice })
        .where(eq(wireTypes.id, existing.id));
      updates++;
    }
  }
  if (updates > 0) {
    console.log(`Wire types: ${updates} prices updated from Material List`);
  }

  // 2. Update existing default assembly materialCost by name match
  updates = 0;
  inserts = 0;
  const existingAssemblies = await db.select().from(deviceAssemblies);
  const assemblyMap = new Map(existingAssemblies.map(a => [a.name, a]));
  for (const assembly of DEFAULT_ASSEMBLIES) {
    const existing = assemblyMap.get(assembly.name);
    if (existing && existing.isDefault && Math.abs(existing.materialCost - assembly.materialCost) > 0.001) {
      await db.update(deviceAssemblies)
        .set({ materialCost: assembly.materialCost })
        .where(eq(deviceAssemblies.id, existing.id));
      updates++;
    } else if (!existing) {
      await db.insert(deviceAssemblies).values({ ...assembly, isDefault: true });
      inserts++;
    }
  }
  if (updates > 0 || inserts > 0) {
    console.log(`Assemblies: ${updates} prices updated, ${inserts} new assemblies added`);
  }

  // 3. Insert new parts catalog entries (don't overwrite user-edited prices)
  // Parts data defined inline to avoid scope issues
  const PARTS_DATA: Array<{ name: string; category: string; unitCost: number }> = [
    // Boxes
    { name: "1 Gang Device Box", category: "box", unitCost: 2.24 },
    { name: "1 Gang Insulated Box", category: "box", unitCost: 3.60 },
    { name: "2 Gang Device Box", category: "box", unitCost: 6.00 },
    { name: "2 Gang Insulated Box", category: "box", unitCost: 10.50 },
    { name: "3 Gang Device Box", category: "box", unitCost: 10.50 },
    { name: "3 Gang Insulated Box", category: "box", unitCost: 14.00 },
    { name: "4 Gang Device Box", category: "box", unitCost: 16.00 },
    { name: "4 Gang Insulated Box", category: "box", unitCost: 22.00 },
    { name: "1 Gang Retro Box", category: "box", unitCost: 16.24 },
    { name: "Pan Box", category: "box", unitCost: 2.00 },
    { name: "Octagon Metal Box", category: "box", unitCost: 7.00 },
    { name: "Octagon Insulated Box", category: "box", unitCost: 6.00 },
    { name: "4x4 Metal Box", category: "box", unitCost: 5.00 },
    { name: "4-11/16 Metal Box", category: "box", unitCost: 7.00 },
    { name: "Shallow Metal Box", category: "box", unitCost: 7.00 },
    { name: "Ceiling Fan Metal Box", category: "box", unitCost: 21.28 },
    { name: "Peak Box", category: "box", unitCost: 45.00 },
    { name: "Vapour Barrier Boot (Vapo Boot)", category: "box", unitCost: 9.00 },
    { name: "Rough-in Ring 4\"/6\"", category: "box", unitCost: 9.00 },
    { name: "Fire Rated 4 inch", category: "box", unitCost: 33.60 },
    // Devices
    { name: "15A Outlet", category: "device", unitCost: 2.30 },
    { name: "15A GFCI Outlet", category: "device", unitCost: 30.00 },
    { name: "20A Outlet", category: "device", unitCost: 7.00 },
    { name: "20A GFCI Outlet", category: "device", unitCost: 33.00 },
    { name: "30A RV Outlet", category: "device", unitCost: 18.00 },
    { name: "50A 240V Range Outlet", category: "device", unitCost: 8.00 },
    { name: "30A 240V Dryer Outlet", category: "device", unitCost: 8.00 },
    { name: "Single Pole Switch", category: "device", unitCost: 2.20 },
    { name: "3 Way Switch", category: "device", unitCost: 4.00 },
    { name: "4 Way Switch", category: "device", unitCost: 22.40 },
    { name: "Dimmer Switch", category: "device", unitCost: 45.00 },
    { name: "Motion Switch", category: "device", unitCost: 31.36 },
    { name: "Bath Timer Switch", category: "device", unitCost: 61.60 },
    { name: "CO Smoke Detector (Combo)", category: "device", unitCost: 80.34 },
    { name: "Regular Smoke Detector", category: "device", unitCost: 21.00 },
    { name: "Doorbell (Transformer + Chime + Button)", category: "device", unitCost: 45.00 },
    { name: "Bath Fan 1-Speed", category: "device", unitCost: 150.00 },
    { name: "AC Disconnect (60A)", category: "device", unitCost: 24.00 },
    { name: "BB Heat Wall Thermostat", category: "device", unitCost: 23.00 },
    { name: "BB Heat Built-in Thermostat", category: "device", unitCost: 45.00 },
    { name: "BB Heat 500W", category: "device", unitCost: 74.00 },
    { name: "BB Heat 1000W", category: "device", unitCost: 99.00 },
    { name: "BB Heat 1500W", category: "device", unitCost: 126.00 },
    { name: "BB Heat 2000W", category: "device", unitCost: 163.00 },
    // Cover Plates
    { name: "1 Gang Plate", category: "cover_plate", unitCost: 1.00 },
    { name: "2 Gang Plate", category: "cover_plate", unitCost: 1.50 },
    { name: "3 Gang Plate", category: "cover_plate", unitCost: 2.00 },
    { name: "4 Gang Plate", category: "cover_plate", unitCost: 7.00 },
    { name: "Weather Proof In-Use Cover", category: "cover_plate", unitCost: 22.50 },
    { name: "Furnace Red Plate", category: "cover_plate", unitCost: 1.00 },
    { name: "RV Cover", category: "cover_plate", unitCost: 12.00 },
    // Breakers
    { name: "15A Single Pole Breaker", category: "breaker", unitCost: 15.00 },
    { name: "15A Arc Fault SP Breaker", category: "breaker", unitCost: 100.00 },
    { name: "15A Arc/GFCI SP Breaker", category: "breaker", unitCost: 160.00 },
    { name: "20A Single Pole Breaker", category: "breaker", unitCost: 15.00 },
    { name: "20A Arc Fault SP Breaker", category: "breaker", unitCost: 90.00 },
    { name: "30A 2-Pole Breaker", category: "breaker", unitCost: 42.00 },
    { name: "40A 2-Pole Breaker", category: "breaker", unitCost: 42.00 },
    { name: "50A 2-Pole Breaker", category: "breaker", unitCost: 48.00 },
    { name: "100A Breaker", category: "breaker", unitCost: 100.00 },
    // Panels
    { name: "100A Panel 30/60 (40/80)", category: "panel_component", unitCost: 335.00 },
    { name: "200A Panel 40/80 (60/120)", category: "panel_component", unitCost: 650.00 },
    // Connectors
    { name: "Straight BX Connector", category: "connector", unitCost: 1.50 },
    { name: "90° BX Connector", category: "connector", unitCost: 1.50 },
    { name: "Coreline Connector", category: "connector", unitCost: 3.50 },
    { name: "Liquid Tight Connector", category: "connector", unitCost: 2.10 },
    { name: "1/2\" NM Connector (Pop-in)", category: "connector", unitCost: 0.25 },
    { name: "3/4\" NM Connector (Pop-in)", category: "connector", unitCost: 0.80 },
    // Misc
    { name: "Marrettes (Wire Nuts)", category: "wire_nut", unitCost: 0.15 },
    { name: "1/2\" Staples", category: "mounting", unitCost: 0.12 },
    { name: "Bonding Clamp (Gas/Pipe)", category: "misc", unitCost: 7.00 },
    { name: "AC Whip", category: "misc", unitCost: 41.00 },
    { name: "CED 130 Data Insert", category: "misc", unitCost: 7.50 },
    // === SERVICE MATERIAL (prices +12% tax) ===
    { name: "400A 2 Position Meter", category: "panel_component", unitCost: 929.60 },
    { name: "200A 1 Position Meter", category: "panel_component", unitCost: 212.80 },
    { name: "Data Box", category: "box", unitCost: 72.80 },
    { name: "Service Mounting Kit", category: "misc", unitCost: 57.12 },
    { name: "Meter Hub 2\" PVC", category: "connector", unitCost: 12.32 },
    { name: "Weatherhead 2\" PVC", category: "misc", unitCost: 45.92 },
    { name: "J 2\" Rigid PVC", category: "misc", unitCost: 143.36 },
    { name: "J 3\" Rigid PVC", category: "misc", unitCost: 134.40 },
    { name: "DB2 2\"", category: "misc", unitCost: 22.40 },
    { name: "DB2 3\"", category: "misc", unitCost: 39.20 },
    { name: "Rigid PVC 1/2\"", category: "misc", unitCost: 7.84 },
    { name: "Rigid PVC 2\"", category: "misc", unitCost: 28.00 },
    { name: "DB2T 90° 2\"", category: "misc", unitCost: 39.20 },
    { name: "DB2 3\" 90°", category: "misc", unitCost: 40.32 },
    { name: "3\" PVC Coupling", category: "connector", unitCost: 5.60 },
    { name: "2\" PVC Coupler", category: "connector", unitCost: 5.60 },
    { name: "2\" Coupler to Rigid PVC", category: "connector", unitCost: 13.44 },
    { name: "2\" PVC Strap", category: "mounting", unitCost: 11.20 },
    { name: "3\" Rigid Metal Strap", category: "mounting", unitCost: 1.46 },
    { name: "1-1/2\" EMT 2 Hole Strap", category: "mounting", unitCost: 0.45 },
    { name: "1-1/4\" EMT 2 Hole Strap", category: "mounting", unitCost: 0.34 },
    { name: "1/2\" PVC Strap", category: "mounting", unitCost: 0.56 },
    { name: "Mast Reducer 2-1/2\"", category: "misc", unitCost: 45.90 },
    { name: "Mast Head Adapter", category: "misc", unitCost: 49.48 },
    { name: "2\" Conduit Entry to Hub", category: "connector", unitCost: 12.03 },
    { name: "2\" Hub", category: "connector", unitCost: 36.32 },
    { name: "Mast Clevis", category: "misc", unitCost: 61.58 },
    { name: "Mast 2.5\"", category: "misc", unitCost: 189.28 },
    { name: "EMT 2\"", category: "misc", unitCost: 22.74 },
    { name: "Single Saddle 1\"", category: "mounting", unitCost: 5.60 },
    { name: "Ground Bushing 1\"", category: "connector", unitCost: 8.96 },
    { name: "2\" 4 Screw MC Connector", category: "connector", unitCost: 33.60 },
    { name: "2\" Bushing", category: "connector", unitCost: 16.80 },
    { name: "Teck Connector 1-1/2\"", category: "connector", unitCost: 87.36 },
    { name: "2\" 2 Screw Conduit Connector", category: "connector", unitCost: 28.00 },
    { name: "1-1/2\" Bushing", category: "connector", unitCost: 12.32 },
    { name: "2\" TA Connector", category: "connector", unitCost: 5.90 },
    { name: "2\" Locknut", category: "connector", unitCost: 0.93 },
    { name: "2\" Plastic Bushing", category: "connector", unitCost: 1.59 },
    { name: "PVC 2\" LB", category: "misc", unitCost: 70.56 },
    { name: "Protection Plate", category: "misc", unitCost: 0.26 },
  ];

  inserts = 0;
  const existingParts = await db.select().from(partsCatalog);
  const partNames = new Set(existingParts.map(p => p.name));
  for (const part of PARTS_DATA) {
    if (!partNames.has(part.name)) {
      await db.insert(partsCatalog).values({
        name: part.name,
        category: part.category,
        unitCost: part.unitCost,
        isActive: true,
      });
      inserts++;
    }
  }
  if (inserts > 0) {
    console.log(`Parts catalog: ${inserts} new parts added from Material List`);
  }
}

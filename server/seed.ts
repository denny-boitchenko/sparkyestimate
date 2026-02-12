import { db } from "./db";
import { deviceAssemblies, projects, estimates, estimateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ASSEMBLIES = [
  { name: "Duplex Receptacle (15A)", category: "receptacles", device: "15A duplex receptacle, TR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.18, materialCost: 8.50 },
  { name: "Duplex Receptacle (20A)", category: "receptacles", device: "20A duplex receptacle, TR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "12/2 NM-B", wireFootage: 15, laborHours: 0.20, materialCost: 12.75 },
  { name: "GFCI Receptacle (15A)", category: "receptacles", device: "15A GFCI receptacle, TR, WR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang GFCI cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.25, materialCost: 28.50 },
  { name: "GFCI Receptacle (20A)", category: "receptacles", device: "20A GFCI receptacle, TR, WR", boxType: "Single-gang device box, NM", coverPlate: "Single-gang GFCI cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "12/2 NM-B", wireFootage: 15, laborHours: 0.25, materialCost: 32.00 },
  { name: "Split Receptacle (Kitchen)", category: "receptacles", device: "15A split duplex receptacle", boxType: "Single-gang device box, NM", coverPlate: "Single-gang duplex cover", miscParts: "Wire nuts, ground pigtail, box connector, red tape", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.30, materialCost: 14.00 },
  { name: "Dedicated Receptacle (Fridge)", category: "receptacles", device: "15A single receptacle, dedicated", boxType: "Single-gang device box, NM", coverPlate: "Single-gang single cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NM-B", wireFootage: 25, laborHours: 0.25, materialCost: 10.00 },
  { name: "Dryer Receptacle (30A)", category: "receptacles", device: "30A dryer receptacle, NEMA 14-30", boxType: "Single-gang surface mount box", coverPlate: "Dryer cover plate", miscParts: "Wire nuts, box connector", wireType: "10/3 NM-B", wireFootage: 30, laborHours: 0.50, materialCost: 22.00 },
  { name: "Range Receptacle (50A)", category: "receptacles", device: "50A range receptacle, NEMA 14-50", boxType: "Single-gang surface mount box", coverPlate: "Range cover plate", miscParts: "Wire nuts, box connector", wireType: "6/3 NM-B", wireFootage: 25, laborHours: 0.60, materialCost: 28.00 },
  { name: "EV Charger Receptacle (50A)", category: "receptacles", device: "50A NEMA 14-50 for EV charging", boxType: "Single-gang surface mount box", coverPlate: "NEMA 14-50 cover", miscParts: "Wire nuts, box connector", wireType: "6/3 NM-B", wireFootage: 40, laborHours: 0.75, materialCost: 32.00 },
  { name: "Single-Pole Switch", category: "switches", device: "15A single-pole switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.15, materialCost: 6.50 },
  { name: "3-Way Switch", category: "switches", device: "15A 3-way switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.25, materialCost: 9.00 },
  { name: "4-Way Switch", category: "switches", device: "15A 4-way switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang toggle cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.30, materialCost: 14.00 },
  { name: "Dimmer Switch", category: "switches", device: "600W dimmer switch", boxType: "Single-gang device box, NM", coverPlate: "Single-gang dimmer cover", miscParts: "Wire nuts, ground pigtail, box connector", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.20, materialCost: 22.00 },
  { name: "Recessed Light (4\")", category: "lighting", device: "4\" LED recessed light, IC rated", boxType: "Integrated junction box", coverPlate: "Trim ring included", miscParts: "Wire nuts, box connector", wireType: "14/2 NM-B", wireFootage: 12, laborHours: 0.30, materialCost: 35.00 },
  { name: "Recessed Light (6\")", category: "lighting", device: "6\" LED recessed light, IC rated", boxType: "Integrated junction box", coverPlate: "Trim ring included", miscParts: "Wire nuts, box connector", wireType: "14/2 NM-B", wireFootage: 12, laborHours: 0.30, materialCost: 42.00 },
  { name: "Ceiling Light Fixture", category: "lighting", device: "LED ceiling mount fixture", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.40, materialCost: 55.00 },
  { name: "Pendant Light", category: "lighting", device: "Pendant light fixture", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware, chain/cord", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.50, materialCost: 75.00 },
  { name: "Track Light (4-head)", category: "lighting", device: "4-head LED track light kit", boxType: "Octagon ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, mounting hardware, track", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.60, materialCost: 120.00 },
  { name: "Under Cabinet Light", category: "lighting", device: "LED under-cabinet light, 24\"", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors", wireType: "14/2 NM-B", wireFootage: 8, laborHours: 0.25, materialCost: 30.00 },
  { name: "Exterior Light Fixture", category: "lighting", device: "LED wall-mount exterior light", boxType: "Weatherproof octagon box", coverPlate: "Gasket included", miscParts: "Wire nuts, weatherproof connector", wireType: "14/2 NM-B", wireFootage: 20, laborHours: 0.40, materialCost: 45.00 },
  { name: "Ceiling Fan", category: "lighting", device: "52\" ceiling fan with light kit", boxType: "Fan-rated ceiling box", coverPlate: "Canopy included", miscParts: "Wire nuts, fan brace, mounting hardware", wireType: "14/3 NM-B", wireFootage: 15, laborHours: 0.75, materialCost: 150.00 },
  { name: "Bathroom Exhaust Fan", category: "lighting", device: "80 CFM bathroom exhaust fan", boxType: "Integrated housing", coverPlate: "Grille included", miscParts: "Wire nuts, duct connector, clamps", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.75, materialCost: 65.00 },
  { name: "Range Hood", category: "lighting", device: "30\" range hood", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, cable connectors, duct", wireType: "14/2 NM-B", wireFootage: 15, laborHours: 0.60, materialCost: 85.00 },
  { name: "Smoke Detector (Hardwired)", category: "safety", device: "Hardwired smoke detector with battery backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.25, materialCost: 35.00 },
  { name: "CO Detector (Hardwired)", category: "safety", device: "Hardwired CO detector with battery backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.25, materialCost: 40.00 },
  { name: "Combination Smoke/CO Detector", category: "safety", device: "Hardwired combo smoke/CO with backup", boxType: "Octagon ceiling box", coverPlate: "Mounting plate included", miscParts: "Wire nuts, interconnect wire", wireType: "14/3 NM-B", wireFootage: 20, laborHours: 0.25, materialCost: 50.00 },
  { name: "Data Outlet (Cat6)", category: "data_comm", device: "Cat6 RJ45 data outlet", boxType: "Single-gang low-voltage bracket", coverPlate: "Single-gang data cover", miscParts: "Cat6 jack, patch panel connection", wireType: "Cat6 UTP", wireFootage: 50, laborHours: 0.30, materialCost: 18.00 },
  { name: "Coax Outlet", category: "data_comm", device: "F-connector coax outlet", boxType: "Single-gang low-voltage bracket", coverPlate: "Single-gang F-connector cover", miscParts: "F-connector, compression fitting", wireType: "RG6 Coax", wireFootage: 50, laborHours: 0.25, materialCost: 12.00 },
  { name: "Doorbell Transformer", category: "specialty", device: "16V doorbell transformer", boxType: "Junction box", coverPlate: "N/A", miscParts: "Wire nuts, bell wire", wireType: "14/2 NM-B + bell wire", wireFootage: 30, laborHours: 0.35, materialCost: 20.00 },
  { name: "Outdoor Receptacle (WP)", category: "receptacles", device: "15A GFCI receptacle, WP box", boxType: "Weatherproof in-use box", coverPlate: "In-use WP cover", miscParts: "Wire nuts, WP connector, gasket", wireType: "14/2 NM-B", wireFootage: 25, laborHours: 0.35, materialCost: 38.00 },
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
      overheadPct: 15,
      profitPct: 10,
      laborRate: 85,
    }).returning();

    await db.insert(estimateItems).values([
      { estimateId: est1.id, deviceType: "Duplex Receptacle (15A)", description: "15A duplex receptacle, TR", room: "Living Room", quantity: 6, materialCost: 8.50, laborHours: 0.18, wireType: "14/2 NM-B", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Duplex Receptacle (15A)", description: "15A duplex receptacle, TR", room: "Bedroom 1", quantity: 4, materialCost: 8.50, laborHours: 0.18, wireType: "14/2 NM-B", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "GFCI Receptacle (15A)", description: "15A GFCI receptacle, TR, WR", room: "Kitchen", quantity: 2, materialCost: 28.50, laborHours: 0.25, wireType: "14/2 NM-B", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Single-Pole Switch", description: "15A single-pole switch", room: "Living Room", quantity: 3, materialCost: 6.50, laborHours: 0.15, wireType: "14/2 NM-B", wireFootage: 15, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Recessed Light (4\")", description: "4\" LED recessed light, IC rated", room: "Kitchen", quantity: 6, materialCost: 35.00, laborHours: 0.30, wireType: "14/2 NM-B", wireFootage: 12, markupPct: 0 },
      { estimateId: est1.id, deviceType: "Smoke Detector (Hardwired)", description: "Hardwired smoke detector with battery backup", room: "Hallway", quantity: 3, materialCost: 35.00, laborHours: 0.25, wireType: "14/3 NM-B", wireFootage: 20, markupPct: 0 },
    ]);

    const [est2] = await db.insert(estimates).values({
      projectId: p3.id,
      name: "Kitchen Reno Quote",
      overheadPct: 15,
      profitPct: 12,
      laborRate: 90,
    }).returning();

    await db.insert(estimateItems).values([
      { estimateId: est2.id, deviceType: "Split Receptacle (Kitchen)", description: "15A split duplex receptacle", room: "Kitchen", quantity: 4, materialCost: 14.00, laborHours: 0.30, wireType: "14/3 NM-B", wireFootage: 20, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Under Cabinet Light", description: "LED under-cabinet light, 24\"", room: "Kitchen", quantity: 3, materialCost: 30.00, laborHours: 0.25, wireType: "14/2 NM-B", wireFootage: 8, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Range Hood", description: "30\" range hood", room: "Kitchen", quantity: 1, materialCost: 85.00, laborHours: 0.60, wireType: "14/2 NM-B", wireFootage: 15, markupPct: 0 },
      { estimateId: est2.id, deviceType: "Dedicated Receptacle (Fridge)", description: "15A single receptacle, dedicated", room: "Kitchen", quantity: 1, materialCost: 10.00, laborHours: 0.25, wireType: "14/2 NM-B", wireFootage: 25, markupPct: 0 },
    ]);

    console.log("Seeded 4 sample projects with estimates");
  }
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { seedDatabase } from "./seed";
import {
  insertProjectSchema, insertEstimateSchema, insertEstimateItemSchema,
  insertDeviceAssemblySchema, insertWireTypeSchema, insertServiceBundleSchema,
  insertPanelCircuitSchema, insertEstimateServiceSchema,
  ANALYSIS_MODES
} from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await seedDatabase();

  // Projects
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const project = await storage.getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const project = await storage.updateProject(id, req.body);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    await storage.deleteProject(id);
    res.status(204).send();
  });

  // Estimates
  app.get("/api/estimates", async (_req, res) => {
    const estimates = await storage.getEstimates();
    res.json(estimates);
  });

  app.get("/api/estimates/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    res.json(estimate);
  });

  app.get("/api/projects/:id/estimates", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const estimates = await storage.getEstimatesByProject(id);
    res.json(estimates);
  });

  app.post("/api/estimates", async (req, res) => {
    const parsed = insertEstimateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const estimate = await storage.createEstimate(parsed.data);
      res.status(201).json(estimate);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/estimates/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const estimate = await storage.updateEstimate(id, req.body);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    res.json(estimate);
  });

  app.delete("/api/estimates/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    await storage.deleteEstimate(id);
    res.status(204).send();
  });

  // Estimate Items
  app.get("/api/estimates/:id/items", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const items = await storage.getEstimateItems(id);
    res.json(items);
  });

  app.post("/api/estimate-items", async (req, res) => {
    const parsed = insertEstimateItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const item = await storage.createEstimateItem(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/estimate-items/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid item ID" });
    const item = await storage.updateEstimateItem(id, req.body);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete("/api/estimate-items/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid item ID" });
    await storage.deleteEstimateItem(id);
    res.status(204).send();
  });

  // Device Assemblies
  app.get("/api/device-assemblies", async (_req, res) => {
    const assemblies = await storage.getDeviceAssemblies();
    res.json(assemblies);
  });

  app.post("/api/device-assemblies", async (req, res) => {
    const parsed = insertDeviceAssemblySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const assembly = await storage.createDeviceAssembly(parsed.data);
      res.status(201).json(assembly);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/device-assemblies/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assembly ID" });
    const assembly = await storage.updateDeviceAssembly(id, req.body);
    if (!assembly) return res.status(404).json({ message: "Assembly not found" });
    res.json(assembly);
  });

  app.delete("/api/device-assemblies/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assembly ID" });
    await storage.deleteDeviceAssembly(id);
    res.status(204).send();
  });

  // Wire Types
  app.get("/api/wire-types", async (_req, res) => {
    const wts = await storage.getWireTypes();
    res.json(wts);
  });

  app.post("/api/wire-types", async (req, res) => {
    const parsed = insertWireTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const wt = await storage.createWireType(parsed.data);
      res.status(201).json(wt);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/wire-types/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid wire type ID" });
    const wt = await storage.updateWireType(id, req.body);
    if (!wt) return res.status(404).json({ message: "Wire type not found" });
    res.json(wt);
  });

  app.delete("/api/wire-types/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid wire type ID" });
    await storage.deleteWireType(id);
    res.status(204).send();
  });

  // Service Bundles
  app.get("/api/service-bundles", async (_req, res) => {
    const bundles = await storage.getServiceBundles();
    res.json(bundles);
  });

  app.post("/api/service-bundles", async (req, res) => {
    const parsed = insertServiceBundleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const bundle = await storage.createServiceBundle(parsed.data);
      res.status(201).json(bundle);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/service-bundles/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid service bundle ID" });
    const bundle = await storage.updateServiceBundle(id, req.body);
    if (!bundle) return res.status(404).json({ message: "Service bundle not found" });
    res.json(bundle);
  });

  app.delete("/api/service-bundles/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid service bundle ID" });
    await storage.deleteServiceBundle(id);
    res.status(204).send();
  });

  // Panel Circuits
  app.get("/api/estimates/:id/panel-circuits", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const circuits = await storage.getPanelCircuits(id);
    res.json(circuits);
  });

  app.post("/api/panel-circuits", async (req, res) => {
    const parsed = insertPanelCircuitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const circuit = await storage.createPanelCircuit(parsed.data);
      res.status(201).json(circuit);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/panel-circuits/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid circuit ID" });
    const circuit = await storage.updatePanelCircuit(id, req.body);
    if (!circuit) return res.status(404).json({ message: "Circuit not found" });
    res.json(circuit);
  });

  app.delete("/api/panel-circuits/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid circuit ID" });
    await storage.deletePanelCircuit(id);
    res.status(204).send();
  });

  app.post("/api/estimates/:id/generate-panel", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const items = await storage.getEstimateItems(id);
    if (items.length === 0) return res.status(400).json({ message: "No line items to generate panel from" });

    await storage.deleteAllPanelCircuits(id);

    const circuitMap = new Map<string, { description: string; wireType: string | null; isGfci: boolean; isAfci: boolean; amps: number }>();

    for (const item of items) {
      const room = item.room || "General";
      const key = `${room}-${item.deviceType}`;
      const isGfci = item.deviceType.toLowerCase().includes("gfci") ||
                     (item.room || "").toLowerCase().includes("kitchen") ||
                     (item.room || "").toLowerCase().includes("bathroom") ||
                     (item.room || "").toLowerCase().includes("garage");
      const isAfci = (item.room || "").toLowerCase().includes("bedroom") ||
                     (item.room || "").toLowerCase().includes("living") ||
                     (item.room || "").toLowerCase().includes("den") ||
                     (item.room || "").toLowerCase().includes("dining");

      let amps = 15;
      if (item.wireType?.includes("12/")) amps = 20;
      if (item.wireType?.includes("10/")) amps = 30;
      if (item.wireType?.includes("6/")) amps = 40;

      if (circuitMap.has(key)) {
        const existing = circuitMap.get(key)!;
        existing.description += `, ${item.quantity}x ${item.deviceType}`;
      } else {
        circuitMap.set(key, {
          description: `${room} - ${item.quantity}x ${item.deviceType}`,
          wireType: item.wireType,
          isGfci,
          isAfci,
          amps,
        });
      }
    }

    let circuitNumber = 1;
    const created: any[] = [];
    for (const [, data] of circuitMap) {
      const circuit = await storage.createPanelCircuit({
        estimateId: id,
        circuitNumber,
        amps: data.amps,
        poles: data.amps > 20 ? 2 : 1,
        description: data.description,
        wireType: data.wireType,
        isGfci: data.isGfci,
        isAfci: data.isAfci,
      });
      created.push(circuit);
      circuitNumber++;
    }

    res.json(created);
  });

  // Estimate Services
  app.get("/api/estimates/:id/services", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const services = await storage.getEstimateServices(id);
    res.json(services);
  });

  app.post("/api/estimate-services", async (req, res) => {
    const parsed = insertEstimateServiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const service = await storage.createEstimateService(parsed.data);
      res.status(201).json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/estimate-services/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid service ID" });
    await storage.deleteEstimateService(id);
    res.status(204).send();
  });

  // CEC Compliance Check
  app.post("/api/estimates/:id/compliance-check", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const items = await storage.getEstimateItems(id);
    const circuits = await storage.getPanelCircuits(id);

    const rules: any[] = [];

    const gfciLocations = ["kitchen", "bathroom", "garage", "outdoor", "laundry", "unfinished basement"];
    const afciLocations = ["bedroom", "living", "dining", "den", "family", "hallway", "closet"];

    const roomItems = items.reduce<Record<string, typeof items>>((acc, item) => {
      const room = (item.room || "general").toLowerCase();
      if (!acc[room]) acc[room] = [];
      acc[room].push(item);
      return acc;
    }, {});

    for (const [room, roomItemList] of Object.entries(roomItems)) {
      const needsGfci = gfciLocations.some(loc => room.includes(loc));
      if (needsGfci) {
        const hasGfci = roomItemList.some(i => i.deviceType.toLowerCase().includes("gfci"));
        rules.push({
          rule: "CEC 26-700(11) - GFCI Protection",
          location: room,
          status: hasGfci ? "PASS" : "FAIL",
          description: hasGfci
            ? `GFCI protection present in ${room}`
            : `GFCI receptacle required in ${room} per CEC 26-700(11)`,
        });
      }

      const needsAfci = afciLocations.some(loc => room.includes(loc));
      if (needsAfci) {
        const afciCircuit = circuits.some(c => c.description.toLowerCase().includes(room) && c.isAfci);
        rules.push({
          rule: "CEC 26-656 - AFCI Protection",
          location: room,
          status: afciCircuit ? "PASS" : "WARN",
          description: afciCircuit
            ? `AFCI protection configured for ${room}`
            : `AFCI protection recommended for ${room} per CEC 26-656`,
        });
      }
    }

    const hasSmokeDetectors = items.some(i => i.deviceType.toLowerCase().includes("smoke"));
    rules.push({
      rule: "CEC 32-110 - Smoke Detectors",
      location: "All bedrooms & hallways",
      status: hasSmokeDetectors ? "PASS" : "FAIL",
      description: hasSmokeDetectors
        ? "Smoke detectors included in estimate"
        : "Smoke detectors required in every bedroom and adjacent hallway",
    });

    const hasCoDetector = items.some(i => i.deviceType.toLowerCase().includes("co") || i.deviceType.toLowerCase().includes("carbon"));
    rules.push({
      rule: "CEC 32-110 - CO Detectors",
      location: "Near sleeping areas",
      status: hasCoDetector ? "PASS" : "WARN",
      description: hasCoDetector
        ? "CO detector included"
        : "CO detector recommended near sleeping areas if fuel-burning appliances present",
    });

    const kitchenItems = roomItems["kitchen"] || [];
    if (kitchenItems.length > 0) {
      const hasSplitRecep = kitchenItems.some(i => i.deviceType.toLowerCase().includes("split"));
      rules.push({
        rule: "CEC 26-712(d)(iv) - Kitchen Split Receptacles",
        location: "Kitchen",
        status: hasSplitRecep ? "PASS" : "INFO",
        description: hasSplitRecep
          ? "Kitchen split receptacles present"
          : "Consider adding split receptacles for kitchen counter per CEC 26-712",
      });
    }

    const totalAmps = circuits.reduce((sum, c) => sum + c.amps * c.poles, 0);
    const panelSize = totalAmps <= 100 ? 100 : totalAmps <= 200 ? 200 : 400;
    rules.push({
      rule: "CEC 26-500 - Panel Sizing",
      location: "Main Panel",
      status: "INFO",
      description: `Calculated load: ${totalAmps}A. Recommended panel size: ${panelSize}A`,
    });

    for (const circuit of circuits) {
      let expectedWire = "14/2 NM-B";
      if (circuit.amps >= 20) expectedWire = "12/2 NM-B";
      if (circuit.amps >= 30) expectedWire = "10/2 NM-B";
      if (circuit.amps >= 40) expectedWire = "6/3 NM-B";

      if (circuit.wireType && !circuit.wireType.startsWith(expectedWire.split("/")[0])) {
        rules.push({
          rule: "CEC 14-104 - Wire Sizing",
          location: `Circuit ${circuit.circuitNumber}`,
          status: "WARN",
          description: `${circuit.amps}A circuit using ${circuit.wireType}. Expected minimum: ${expectedWire}`,
        });
      }
    }

    res.json({ rules, summary: { total: rules.length, pass: rules.filter(r => r.status === "PASS").length, warn: rules.filter(r => r.status === "WARN").length, fail: rules.filter(r => r.status === "FAIL").length, info: rules.filter(r => r.status === "INFO").length } });
  });

  // AI Analysis
  app.get("/api/ai-analyses", async (_req, res) => {
    const analyses = await storage.getAiAnalyses();
    res.json(analyses);
  });

  const analyzeBodySchema = z.object({
    mode: z.enum(["electrical", "floor_plan"]),
    projectId: z.string().regex(/^\d+$/, "projectId must be a number"),
  });

  app.post("/api/ai-analyze", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File exceeds the 100MB upload limit. Try compressing the PDF or splitting it into smaller pages." });
        }
        return res.status(400).json({ message: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const bodyParsed = analyzeBodySchema.safeParse(req.body);
      if (!bodyParsed.success) return res.status(400).json({ message: bodyParsed.error.issues.map(i => i.message).join(", ") });

      const mode = bodyParsed.data.mode;
      const projectId = parseInt(bodyParsed.data.projectId, 10);

      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Gemini API key not configured" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const imageData = file.buffer.toString("base64");
      const mimeType = file.mimetype || "image/png";

      let prompt: string;
      if (mode === "electrical") {
        prompt = `Analyze this electrical drawing or floor plan. Identify all electrical symbols and devices present.
For each device found, provide:
- type: the device type (e.g., "duplex_receptacle", "gfci_receptacle", "single_pole_switch", "3_way_switch", "dimmer_switch", "recessed_light", "ceiling_light", "pendant_light", "ceiling_fan", "smoke_detector", "co_detector", "data_outlet", "coax_outlet", "outdoor_receptacle", "exhaust_fan", "range_receptacle", "dryer_receptacle", "ev_charger")
- count: how many of this type you see
- confidence: your confidence level (0.0 to 1.0)
- room: which room it appears to be in (if identifiable)
- description: brief description

Return ONLY valid JSON in this exact format:
{
  "devices": [
    { "type": "duplex_receptacle", "count": 4, "confidence": 0.85, "room": "Kitchen", "description": "Standard 15A duplex receptacles" }
  ],
  "notes": "Any additional observations about the drawing"
}`;
      } else {
        prompt = `Analyze this architectural floor plan. Identify all rooms visible in the plan.
For each room, determine the room type and apply CEC 2021 (Canadian Electrical Code) minimum requirements.

Room types to look for: kitchen, bathroom, bedroom, living_room, dining_room, garage, laundry, hallway, basement, foyer, den, office, closet, pantry, mudroom, utility_room, workshop, rec_room, sunroom, porch, deck

For each room, list the minimum electrical devices required by CEC 2021:
- Kitchens: min 2 split receptacles, 1 GFCI above counter, dedicated fridge circuit, range hood, range receptacle
- Bathrooms: GFCI receptacle, exhaust fan, light fixture
- Bedrooms: min 1 receptacle per wall, smoke detector, AFCI protection
- Living rooms: 1 receptacle per 3.6m of wall
- Garages: GFCI receptacle, light fixture
- All rooms: smoke detectors per code, appropriate lighting

Return ONLY valid JSON in this exact format:
{
  "rooms": [
    { "name": "Kitchen", "type": "kitchen", "devices": [
      { "type": "split_receptacle", "count": 2, "description": "Split receptacles for countertop" },
      { "type": "gfci_receptacle", "count": 1, "description": "GFCI above sink" }
    ]}
  ],
  "notes": "Additional observations"
}`;
      }

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageData } },
            ],
          },
        ],
      });

      const responseText = result.text || "";
      let parsedResults: any;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResults = JSON.parse(jsonMatch[0]);
        } else {
          parsedResults = { devices: [], notes: responseText };
        }
      } catch {
        parsedResults = { devices: [], notes: responseText };
      }

      const analysis = await storage.createAiAnalysis({
        projectId,
        fileName: file.originalname,
        analysisMode: mode,
        results: parsedResults,
      });

      res.json(analysis);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // Settings
  app.get("/api/settings", async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const entries = Object.entries(req.body) as [string, string][];
      for (const [key, value] of entries) {
        await storage.upsertSetting(key, String(value));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  return httpServer;
}

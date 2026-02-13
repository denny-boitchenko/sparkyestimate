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
  insertCustomerSchema, insertEmployeeSchema, insertInvoiceSchema, insertInvoiceItemSchema,
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
    for (const [, data] of Array.from(circuitMap)) {
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

  // CEC Compliance Documents
  app.get("/api/compliance-documents", async (_req, res) => {
    const docs = await storage.getComplianceDocuments();
    res.json(docs);
  });

  app.get("/api/compliance-documents/active", async (_req, res) => {
    const doc = await storage.getActiveComplianceDocument();
    res.json(doc || null);
  });

  app.post("/api/compliance-documents/upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      await storage.deactivateAllComplianceDocuments();

      const doc = await storage.createComplianceDocument({
        name: req.body.name || "CEC Document",
        fileName: file.originalname,
        version: req.body.version || null,
        fileSize: file.size,
        isActive: true,
      });

      res.status(201).json(doc);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/compliance-documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document ID" });
    await storage.deleteComplianceDocument(id);
    res.status(204).send();
  });

  // AI Analysis
  app.get("/api/ai-analyses", async (_req, res) => {
    const analyses = await storage.getAiAnalyses();
    res.json(analyses);
  });

  app.get("/api/ai-analyses/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    const analysis = await storage.getAiAnalysis(id);
    if (!analysis) return res.status(404).json({ message: "Analysis not found" });
    res.json(analysis);
  });

  app.patch("/api/ai-analyses/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    const analysis = await storage.updateAiAnalysis(id, req.body);
    if (!analysis) return res.status(404).json({ message: "Analysis not found" });
    res.json(analysis);
  });

  app.delete("/api/ai-analyses/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    await storage.deleteAiAnalysis(id);
    res.status(204).send();
  });

  const analyzeBodySchema = z.object({
    mode: z.enum(["electrical", "floor_plan"]),
    projectId: z.string().regex(/^\d+$/, "projectId must be a number"),
  });

  app.post("/api/ai-analyze", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File exceeds the 100MB upload limit." });
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
- type: the device type (e.g., "Duplex Receptacle (15A)", "GFCI Receptacle (20A)", "Single-Pole Switch", "3-Way Switch", "Dimmer Switch", "Recessed Light (Pot Light)", "Surface Mount Light", "Ceiling Fan", "Smoke/CO Combo Detector", "Data Outlet", "TV / Coax Outlet", "Outdoor Receptacle (GFCI)", "Exhaust Fan (Bathroom)", "Range Hood Fan", "Range Receptacle (50A)", "Dryer Receptacle (30A)", "EV Charger Receptacle (50A)", "Panel Board / Load Center (200A)", "Fluorescent / LED Batten", "Exterior Light", "Thermostat")
- count: how many of this type you see
- confidence: your confidence level (0.0 to 1.0)
- room: which room it appears to be in (if identifiable)
- floor: which floor (e.g., "Main Floor", "Basement", "Upper Floor")
- wireType: recommended wire type (e.g., "14/2 NM-B", "12/2 NM-B")
- description: brief description

Group results by room when possible.

Return ONLY valid JSON in this exact format:
{
  "rooms": [
    { "name": "KITCHEN", "type": "Kitchen", "floor": "Main Floor", "devices": [
      { "type": "Duplex Receptacle (15A)", "count": 4, "confidence": 0.85, "wireType": "14/2 NM-B", "description": "Standard 15A duplex receptacles" }
    ]}
  ],
  "allDevices": [
    { "type": "Duplex Receptacle (15A)", "totalCount": 77, "wireType": "14/2 NM-B" }
  ],
  "notes": "Any additional observations about the drawing"
}`;
      } else {
        prompt = `Analyze this architectural floor plan. Identify all rooms visible in the plan.
For each room, determine the room type and apply CEC 2021 (Canadian Electrical Code) minimum requirements.

Room types to look for: Kitchen, Bathroom, Bedroom, Living Room, Dining Room, Garage, Laundry, Hallway, Basement, Entry Foyer, Den, Office, Closet, Closet Walkin, Pantry, Mudroom, Utility Room, Workshop, Rec Room, Family Room, Sunroom, Porch, Deck

For each room, list the minimum electrical devices required by CEC 2021.
Group by floor when possible (Main Floor, Basement, Upper Floor).

Return ONLY valid JSON in this exact format:
{
  "rooms": [
    { "name": "KITCHEN", "type": "Kitchen", "floor": "Main Floor", "devices": [
      { "type": "Split Receptacle (Kitchen)", "count": 2, "wireType": "14/3 NM-B", "description": "Split receptacles for countertop" },
      { "type": "GFCI Receptacle (20A)", "count": 1, "wireType": "12/2 NM-B", "description": "GFCI above sink" }
    ]}
  ],
  "allDevices": [
    { "type": "Duplex Receptacle (15A)", "totalCount": 77, "wireType": "14/2 NM-B" }
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
          parsedResults = { rooms: [], allDevices: [], notes: responseText };
        }
      } catch {
        parsedResults = { rooms: [], allDevices: [], notes: responseText };
      }

      const analysis = await storage.createAiAnalysis({
        projectId,
        fileName: file.originalname,
        analysisMode: mode,
        results: parsedResults,
        status: "review",
      });

      res.json(analysis);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // Generate Estimate from AI Analysis
  app.post("/api/ai-analyses/:id/generate-estimate", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid analysis ID" });

      const analysis = await storage.getAiAnalysis(id);
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });

      const results = analysis.results as any;
      if (!results?.rooms) return res.status(400).json({ message: "No rooms data in analysis" });

      const estimate = await storage.createEstimate({
        projectId: analysis.projectId,
        name: `AI Generated - ${analysis.fileName}`,
        overheadPct: 15,
        profitPct: 10,
        materialMarkupPct: 0,
        laborMarkupPct: 0,
        laborRate: 85,
      });

      const assemblies = await storage.getDeviceAssemblies();

      for (const room of results.rooms) {
        for (const device of (room.devices || [])) {
          const matchedAssembly = assemblies.find(a =>
            a.name.toLowerCase().includes(device.type?.toLowerCase().split("(")[0].trim() || "") ||
            device.type?.toLowerCase().includes(a.name.toLowerCase().split("(")[0].trim())
          );

          await storage.createEstimateItem({
            estimateId: estimate.id,
            deviceType: device.type || "Unknown Device",
            description: device.description || device.type || "",
            room: room.name || "General",
            quantity: device.count || 1,
            materialCost: matchedAssembly?.materialCost || 0,
            laborHours: matchedAssembly?.laborHours || 0.25,
            wireType: device.wireType || matchedAssembly?.wireType || "14/2 NM-B",
            wireFootage: matchedAssembly?.wireFootage || 15,
            markupPct: 0,
            boxType: matchedAssembly?.boxType || null,
            coverPlate: matchedAssembly?.coverPlate || null,
          });
        }
      }

      await storage.updateAiAnalysis(id, { status: "estimated" });

      res.json({ estimateId: estimate.id, message: "Estimate generated" });
    } catch (err: any) {
      console.error("Generate estimate error:", err);
      res.status(500).json({ message: err.message || "Failed to generate estimate" });
    }
  });

  // Supplier Import with AI
  app.get("/api/supplier-imports", async (_req, res) => {
    const imports = await storage.getSupplierImports();
    res.json(imports);
  });

  app.post("/api/supplier-imports/preview", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const supplierName = req.body.supplierName || "Unknown Supplier";
      const importType = req.body.importType || "materials";

      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Gemini API key not configured" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let fileContent: string;
      const mimeType = file.mimetype;

      if (mimeType === "text/csv" || file.originalname.endsWith(".csv")) {
        fileContent = file.buffer.toString("utf-8");
      } else {
        fileContent = file.buffer.toString("base64");
      }

      const prompt = importType === "wire" ?
        `Parse this supplier price list/catalog for electrical wire products. For each wire product found, extract:
- name: the wire type name (e.g., "14/2 NM-B", "12/3 NM-B")
- costPerFoot: price per foot (calculate from per-roll or per-meter if needed)
- supplier: "${supplierName}"
- partNumber: supplier part number if available
- description: any additional details

Return ONLY valid JSON:
{
  "items": [
    { "name": "14/2 NM-B", "costPerFoot": 0.45, "supplier": "${supplierName}", "partNumber": "ABC123", "description": "75m roll" }
  ],
  "notes": "any observations"
}` :
        `Parse this supplier price list/catalog for electrical materials/devices. For each product found, extract:
- name: device/product name (e.g., "Duplex Receptacle (15A)")
- materialCost: unit price
- supplier: "${supplierName}"
- partNumber: supplier part number if available
- category: one of: receptacles, switches, lighting, safety, data_comm, specialty, service
- description: brief description

Return ONLY valid JSON:
{
  "items": [
    { "name": "Duplex Receptacle (15A)", "materialCost": 8.50, "supplier": "${supplierName}", "partNumber": "XYZ789", "category": "receptacles", "description": "15A TR duplex receptacle, white" }
  ],
  "notes": "any observations"
}`;

      let parts: any[];
      if (mimeType === "text/csv" || file.originalname.endsWith(".csv")) {
        parts = [{ text: prompt + "\n\nCSV Content:\n" + fileContent }];
      } else {
        parts = [
          { text: prompt },
          { inlineData: { mimeType: mimeType || "application/pdf", data: fileContent } },
        ];
      }

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts }],
      });

      const responseText = result.text || "";
      let parsedItems: any;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedItems = JSON.parse(jsonMatch[0]);
        } else {
          parsedItems = { items: [], notes: responseText };
        }
      } catch {
        parsedItems = { items: [], notes: responseText };
      }

      const importRecord = await storage.createSupplierImport({
        supplierName,
        fileName: file.originalname,
        status: "preview",
        previewData: { ...parsedItems, importType },
        importedCount: 0,
      });

      res.json(importRecord);
    } catch (err: any) {
      console.error("Supplier import preview error:", err);
      res.status(500).json({ message: err.message || "Import preview failed" });
    }
  });

  app.post("/api/supplier-imports/:id/commit", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid import ID" });

      const importRecord = await storage.getSupplierImport(id);
      if (!importRecord) return res.status(404).json({ message: "Import not found" });

      const preview = importRecord.previewData as any;
      const items = req.body.items || preview?.items || [];
      const importType = preview?.importType || "materials";

      let count = 0;
      for (const item of items) {
        if (item.skip) continue;

        if (importType === "wire") {
          try {
            await storage.createWireType({
              name: item.name,
              costPerFoot: parseFloat(item.costPerFoot) || 0,
              supplier: item.supplier || importRecord.supplierName,
            });
            count++;
          } catch {
            const existing = (await storage.getWireTypes()).find(w => w.name === item.name);
            if (existing) {
              await storage.updateWireType(existing.id, {
                costPerFoot: parseFloat(item.costPerFoot) || existing.costPerFoot,
                supplier: item.supplier || importRecord.supplierName,
              });
              count++;
            }
          }
        } else {
          await storage.createDeviceAssembly({
            name: item.name,
            category: item.category || "receptacles",
            device: item.description || item.name,
            materialCost: parseFloat(item.materialCost) || 0,
            laborHours: 0.25,
            wireType: null,
            wireFootage: 15,
            isDefault: false,
            supplier: item.supplier || importRecord.supplierName,
          });
          count++;
        }
      }

      await storage.updateSupplierImport(id, {
        status: "completed",
        importedCount: count,
      });

      res.json({ imported: count, message: `${count} items imported successfully` });
    } catch (err: any) {
      console.error("Supplier import commit error:", err);
      res.status(500).json({ message: err.message || "Import commit failed" });
    }
  });

  // Export endpoints
  app.get("/api/estimates/:id/export/material-list", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const project = await storage.getProject(estimate.projectId);

    res.json({
      project: project ? { name: project.name, clientName: project.clientName, address: project.address } : null,
      estimate: { name: estimate.name, laborRate: estimate.laborRate },
      items: items.map(item => ({
        deviceType: item.deviceType,
        description: item.description,
        room: item.room,
        quantity: item.quantity,
        materialCost: item.materialCost,
        wireType: item.wireType,
        wireFootage: item.wireFootage,
        boxType: item.boxType,
        coverPlate: item.coverPlate,
        totalMaterial: item.quantity * item.materialCost,
      })),
      totalMaterial: items.reduce((sum, i) => sum + i.quantity * i.materialCost, 0),
    });
  });

  app.get("/api/estimates/:id/export/client-estimate", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const services = await storage.getEstimateServices(id);
    const project = await storage.getProject(estimate.projectId);
    const settingsData = await storage.getSettings();
    const settingsMap = Object.fromEntries(settingsData.map(s => [s.key, s.value]));

    const totalMaterialCost = items.reduce((sum, item) => {
      const cost = item.quantity * item.materialCost;
      const markup = cost * (item.markupPct / 100);
      return sum + cost + markup;
    }, 0);
    const totalLaborHours = items.reduce((sum, item) => sum + item.quantity * item.laborHours, 0);
    const totalLaborCost = totalLaborHours * estimate.laborRate;

    const serviceMaterialCost = services.reduce((sum, s) => sum + s.materialCost, 0);
    const serviceLaborHours = services.reduce((sum, s) => sum + s.laborHours, 0);
    const serviceLaborCost = serviceLaborHours * estimate.laborRate;

    const combinedMaterialCost = totalMaterialCost + serviceMaterialCost;
    const combinedLaborCost = totalLaborCost + serviceLaborCost;
    const materialWithMarkup = combinedMaterialCost * (1 + estimate.materialMarkupPct / 100);
    const laborWithMarkup = combinedLaborCost * (1 + estimate.laborMarkupPct / 100);
    const subtotal = materialWithMarkup + laborWithMarkup;
    const overhead = subtotal * (estimate.overheadPct / 100);
    const subtotalWithOverhead = subtotal + overhead;
    const profit = subtotalWithOverhead * (estimate.profitPct / 100);
    const grandTotal = subtotalWithOverhead + profit;

    res.json({
      company: {
        name: settingsMap.companyName || "SparkyEstimate",
        phone: settingsMap.companyPhone || "",
        email: settingsMap.companyEmail || "",
      },
      project: project ? { name: project.name, clientName: project.clientName, clientEmail: project.clientEmail, clientPhone: project.clientPhone, address: project.address } : null,
      estimate: { name: estimate.name, date: estimate.createdAt },
      lineItems: items.map(item => ({
        deviceType: item.deviceType,
        description: item.description,
        room: item.room,
        quantity: item.quantity,
        unitPrice: item.materialCost + item.laborHours * estimate.laborRate,
        total: item.quantity * (item.materialCost + item.laborHours * estimate.laborRate),
      })),
      services: services.map(s => ({
        name: s.name,
        total: s.materialCost + s.laborHours * estimate.laborRate,
      })),
      summary: {
        subtotal,
        overhead,
        profit,
        grandTotal,
      },
    });
  });

  app.get("/api/estimates/:id/export/cec-report", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const circuits = await storage.getPanelCircuits(id);
    const project = await storage.getProject(estimate.projectId);

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
        rules.push({ rule: "CEC 26-700(11) - GFCI Protection", location: room, status: hasGfci ? "PASS" : "FAIL", description: hasGfci ? `GFCI protection present in ${room}` : `GFCI receptacle required in ${room}` });
      }
      const needsAfci = afciLocations.some(loc => room.includes(loc));
      if (needsAfci) {
        const afciCircuit = circuits.some(c => c.description.toLowerCase().includes(room) && c.isAfci);
        rules.push({ rule: "CEC 26-656 - AFCI Protection", location: room, status: afciCircuit ? "PASS" : "WARN", description: afciCircuit ? `AFCI protection configured for ${room}` : `AFCI protection recommended for ${room}` });
      }
    }

    const hasSmokeDetectors = items.some(i => i.deviceType.toLowerCase().includes("smoke"));
    rules.push({ rule: "CEC 32-110 - Smoke Detectors", location: "All bedrooms & hallways", status: hasSmokeDetectors ? "PASS" : "FAIL", description: hasSmokeDetectors ? "Smoke detectors included" : "Smoke detectors required" });

    res.json({
      project: project ? { name: project.name, address: project.address, clientName: project.clientName } : null,
      estimate: { name: estimate.name },
      rules,
      summary: { total: rules.length, pass: rules.filter(r => r.status === "PASS").length, warn: rules.filter(r => r.status === "WARN").length, fail: rules.filter(r => r.status === "FAIL").length, info: rules.filter(r => r.status === "INFO").length },
      panelSchedule: circuits.map(c => ({ circuit: c.circuitNumber, amps: c.amps, poles: c.poles, description: c.description, wireType: c.wireType, gfci: c.isGfci, afci: c.isAfci })),
    });
  });

  app.get("/api/estimates/:id/export/excel", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const circuits = await storage.getPanelCircuits(id);
    const services = await storage.getEstimateServices(id);
    const project = await storage.getProject(estimate.projectId);

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const itemRows = items.map(item => ({
      "Device": item.deviceType,
      "Description": item.description,
      "Room": item.room || "",
      "Qty": item.quantity,
      "Material $": item.materialCost,
      "Labor (hrs)": item.laborHours,
      "Wire Type": item.wireType || "",
      "Wire (ft)": item.wireFootage,
      "Box Type": item.boxType || "",
      "Cover Plate": item.coverPlate || "",
      "Markup %": item.markupPct,
      "Total Material": item.quantity * item.materialCost,
      "Total Labor": item.quantity * item.laborHours * estimate.laborRate,
    }));
    const ws1 = XLSX.utils.json_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Line Items");

    const circuitRows = circuits.map(c => ({
      "Circuit #": c.circuitNumber,
      "Amps": c.amps,
      "Poles": c.poles,
      "Description": c.description,
      "Wire Type": c.wireType || "",
      "GFCI": c.isGfci ? "Yes" : "No",
      "AFCI": c.isAfci ? "Yes" : "No",
    }));
    const ws2 = XLSX.utils.json_to_sheet(circuitRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Panel Schedule");

    if (services.length > 0) {
      const serviceRows = services.map(s => ({
        "Service": s.name,
        "Material $": s.materialCost,
        "Labor (hrs)": s.laborHours,
      }));
      const ws3 = XLSX.utils.json_to_sheet(serviceRows);
      XLSX.utils.book_append_sheet(wb, ws3, "Services");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `${project?.name || "Estimate"}_${estimate.name}.xlsx`.replace(/[^a-zA-Z0-9_\-. ]/g, "");

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buf);
  });

  // Customers
  app.get("/api/customers", async (_req, res) => {
    const custs = await storage.getCustomers();
    res.json(custs);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer ID" });
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer ID" });
    const customer = await storage.updateCustomer(id, req.body);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer ID" });
    await storage.deleteCustomer(id);
    res.status(204).send();
  });

  // Employees
  app.get("/api/employees", async (_req, res) => {
    const emps = await storage.getEmployees();
    res.json(emps);
  });

  app.get("/api/employees/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid employee ID" });
    const employee = await storage.getEmployee(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.post("/api/employees", async (req, res) => {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const employee = await storage.createEmployee(parsed.data);
      res.status(201).json(employee);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid employee ID" });
    const employee = await storage.updateEmployee(id, req.body);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.delete("/api/employees/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid employee ID" });
    await storage.deleteEmployee(id);
    res.status(204).send();
  });

  // Invoices
  app.get("/api/invoices", async (_req, res) => {
    const invs = await storage.getInvoices();
    res.json(invs);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid invoice ID" });
    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.get("/api/projects/:id/invoices", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const invs = await storage.getInvoicesByProject(id);
    res.json(invs);
  });

  app.post("/api/invoices", async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const invoice = await storage.createInvoice(parsed.data);
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid invoice ID" });
    const data = { ...req.body };
    if (data.invoiceDate !== undefined) {
      data.invoiceDate = data.invoiceDate && typeof data.invoiceDate === "string" ? new Date(data.invoiceDate) : data.invoiceDate || null;
    }
    if (data.dueDate !== undefined) {
      data.dueDate = data.dueDate && typeof data.dueDate === "string" ? new Date(data.dueDate) : data.dueDate || null;
    }
    if (data.paymentDate !== undefined) {
      data.paymentDate = data.paymentDate && typeof data.paymentDate === "string" ? new Date(data.paymentDate) : data.paymentDate || null;
    }
    const invoice = await storage.updateInvoice(id, data);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid invoice ID" });
    await storage.deleteInvoice(id);
    res.status(204).send();
  });

  // Invoice Items
  app.get("/api/invoices/:id/items", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid invoice ID" });
    const items = await storage.getInvoiceItems(id);
    res.json(items);
  });

  app.post("/api/invoice-items", async (req, res) => {
    const parsed = insertInvoiceItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const item = await storage.createInvoiceItem(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/invoice-items/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid item ID" });
    const item = await storage.updateInvoiceItem(id, req.body);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid item ID" });
    await storage.deleteInvoiceItem(id);
    res.status(204).send();
  });

  // Convert Estimate to Invoice
  app.post("/api/estimates/:id/convert-to-invoice", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

      const estimate = await storage.getEstimate(id);
      if (!estimate) return res.status(404).json({ message: "Estimate not found" });

      const project = await storage.getProject(estimate.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const items = await storage.getEstimateItems(id);
      const services = await storage.getEstimateServices(id);
      const settingsData = await storage.getSettings();
      const sm = Object.fromEntries(settingsData.map(s => [s.key, s.value]));

      const totalMaterialCost = items.reduce((sum, item) => {
        const cost = item.quantity * item.materialCost;
        const markup = cost * (item.markupPct / 100);
        return sum + cost + markup;
      }, 0);
      const totalLaborHours = items.reduce((sum, item) => sum + item.quantity * item.laborHours, 0);
      const totalLaborCost = totalLaborHours * estimate.laborRate;

      const serviceMaterialCost = services.reduce((sum, s) => sum + s.materialCost, 0);
      const serviceLaborHours = services.reduce((sum, s) => sum + s.laborHours, 0);
      const serviceLaborCost = serviceLaborHours * estimate.laborRate;

      const combinedMaterialCost = totalMaterialCost + serviceMaterialCost;
      const combinedLaborCost = totalLaborCost + serviceLaborCost;
      const materialWithMarkup = combinedMaterialCost * (1 + estimate.materialMarkupPct / 100);
      const laborWithMarkup = combinedLaborCost * (1 + estimate.laborMarkupPct / 100);
      const subtotal = materialWithMarkup + laborWithMarkup;
      const overhead = subtotal * (estimate.overheadPct / 100);
      const subtotalWithOverhead = subtotal + overhead;
      const profit = subtotalWithOverhead * (estimate.profitPct / 100);
      const grandTotal = subtotalWithOverhead + profit;

      const taxRate = parseFloat(sm.gstRate || "5");
      const taxLabel = sm.gstLabel || `GST ${taxRate}%`;
      const taxAmount = grandTotal * (taxRate / 100);
      const invoiceTotal = grandTotal + taxAmount;

      const existingInvoices = await storage.getInvoices();
      const nextNum = existingInvoices.length + 1;
      const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await storage.createInvoice({
        invoiceNumber,
        estimateId: id,
        projectId: estimate.projectId,
        customerId: project.customerId,
        status: "draft",
        invoiceDate: new Date(),
        dueDate,
        subtotal: grandTotal,
        taxRate,
        taxLabel,
        taxAmount,
        total: invoiceTotal,
        notes: sm.estimateNotes || null,
        terms: sm.estimateTerms || null,
      });

      const roomGroups = new Map<string, { items: typeof items; totalPrice: number }>();
      for (const item of items) {
        const room = item.room || "General";
        if (!roomGroups.has(room)) {
          roomGroups.set(room, { items: [], totalPrice: 0 });
        }
        const group = roomGroups.get(room)!;
        group.items.push(item);
        group.totalPrice += item.quantity * (item.materialCost + item.laborHours * estimate.laborRate);
      }

      for (const [room, group] of Array.from(roomGroups)) {
        const desc = group.items.map((i: any) => `${i.quantity}x ${i.deviceType}`).join(", ");
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: `Supply and install electrical for ${room}`,
          room,
          quantity: 1,
          unitPrice: group.totalPrice,
          total: group.totalPrice,
        });
      }

      for (const service of services) {
        const serviceTotal = service.materialCost + service.laborHours * estimate.laborRate;
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: service.name,
          room: null,
          quantity: 1,
          unitPrice: serviceTotal,
          total: serviceTotal,
        });
      }

      res.json({ invoiceId: invoice.id, invoiceNumber, message: "Invoice created from estimate" });
    } catch (err: any) {
      console.error("Convert to invoice error:", err);
      res.status(500).json({ message: err.message || "Failed to create invoice" });
    }
  });

  // Invoice export data
  app.get("/api/invoices/:id/export", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid invoice ID" });

    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const invoiceItemsList = await storage.getInvoiceItems(id);
    const project = await storage.getProject(invoice.projectId);
    const customer = invoice.customerId ? await storage.getCustomer(invoice.customerId) : null;
    const settingsData = await storage.getSettings();
    const sm = Object.fromEntries(settingsData.map(s => [s.key, s.value]));

    res.json({
      company: {
        name: sm.companyName || "SparkyEstimate",
        phone: sm.companyPhone || "",
        email: sm.companyEmail || "",
        address: sm.companyAddress || "",
        logoData: sm.companyLogoData || null,
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxLabel: invoice.taxLabel,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        notes: invoice.notes,
        terms: invoice.terms,
      },
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: [customer.address, customer.city, customer.province, customer.postalCode].filter(Boolean).join(", "),
      } : project ? {
        name: project.clientName,
        email: project.clientEmail,
        phone: project.clientPhone,
        address: project.address,
      } : null,
      project: project ? { name: project.name, address: project.address } : null,
      items: invoiceItemsList,
    });
  });

  // Material Excel export
  app.get("/api/estimates/:id/export/material-excel", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const project = await storage.getProject(estimate.projectId);
    const assemblies = await storage.getDeviceAssemblies();

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const materialRows = items.map(item => {
      const assembly = assemblies.find(a => a.name === item.deviceType);
      return {
        "Room": item.room || "",
        "Device": item.deviceType,
        "Description": item.description,
        "Part #": assembly?.supplier || "",
        "Qty": item.quantity,
        "Unit Cost": item.materialCost,
        "Markup %": item.markupPct,
        "Total Cost": item.quantity * item.materialCost * (1 + item.markupPct / 100),
        "Box Type": item.boxType || assembly?.boxType || "",
        "Cover Plate": item.coverPlate || assembly?.coverPlate || "",
        "Misc Parts": assembly?.miscParts || "",
        "Wire Type": item.wireType || "",
        "Wire (ft)": item.wireFootage,
        "Total Wire (ft)": item.quantity * item.wireFootage,
      };
    });

    const ws1 = XLSX.utils.json_to_sheet(materialRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Material List");

    const totalMaterial = items.reduce((sum, i) => sum + i.quantity * i.materialCost * (1 + i.markupPct / 100), 0);
    const summaryRows = [
      { "Item": "Total Material Cost", "Amount": totalMaterial },
      { "Item": `Material Markup (${estimate.materialMarkupPct}%)`, "Amount": totalMaterial * estimate.materialMarkupPct / 100 },
      { "Item": "Grand Material Total", "Amount": totalMaterial * (1 + estimate.materialMarkupPct / 100) },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `${project?.name || "Estimate"}_Material_List.xlsx`.replace(/[^a-zA-Z0-9_\-. ]/g, "");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buf);
  });

  // Labour Excel export
  app.get("/api/estimates/:id/export/labor-excel", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    const services = await storage.getEstimateServices(id);
    const project = await storage.getProject(estimate.projectId);

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const laborRows = items.map(item => ({
      "Room": item.room || "",
      "Device": item.deviceType,
      "Description": item.description,
      "Qty": item.quantity,
      "Hours/Unit": item.laborHours,
      "Total Hours": item.quantity * item.laborHours,
      "Rate ($/hr)": estimate.laborRate,
      "Total Labour": item.quantity * item.laborHours * estimate.laborRate,
    }));

    const ws1 = XLSX.utils.json_to_sheet(laborRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Labour Breakdown");

    if (services.length > 0) {
      const serviceLabor = services.map(s => ({
        "Service": s.name,
        "Hours": s.laborHours,
        "Rate ($/hr)": estimate.laborRate,
        "Total Labour": s.laborHours * estimate.laborRate,
      }));
      const ws2 = XLSX.utils.json_to_sheet(serviceLabor);
      XLSX.utils.book_append_sheet(wb, ws2, "Service Labour");
    }

    const totalItemHours = items.reduce((sum, i) => sum + i.quantity * i.laborHours, 0);
    const totalServiceHours = services.reduce((sum, s) => sum + s.laborHours, 0);
    const summaryRows = [
      { "Category": "Line Item Labour", "Hours": totalItemHours, "Cost": totalItemHours * estimate.laborRate },
      { "Category": "Service Labour", "Hours": totalServiceHours, "Cost": totalServiceHours * estimate.laborRate },
      { "Category": "Total Labour", "Hours": totalItemHours + totalServiceHours, "Cost": (totalItemHours + totalServiceHours) * estimate.laborRate },
      { "Category": `Labour Markup (${estimate.laborMarkupPct}%)`, "Hours": "", "Cost": (totalItemHours + totalServiceHours) * estimate.laborRate * estimate.laborMarkupPct / 100 },
    ];
    const ws3 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws3, "Summary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `${project?.name || "Estimate"}_Labour_Breakdown.xlsx`.replace(/[^a-zA-Z0-9_\-. ]/g, "");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buf);
  });

  // Company logo upload
  app.post("/api/settings/logo", (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      if (!file.mimetype.startsWith("image/")) return res.status(400).json({ message: "File must be an image" });
      if (file.size > 2 * 1024 * 1024) return res.status(400).json({ message: "Logo must be under 2MB" });

      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      await storage.upsertSetting("companyLogoData", base64Data);
      res.json({ success: true, message: "Logo uploaded" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/settings/logo", async (_req, res) => {
    await storage.upsertSetting("companyLogoData", "");
    res.json({ success: true, message: "Logo removed" });
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

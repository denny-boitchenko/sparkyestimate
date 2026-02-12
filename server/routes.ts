import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { seedDatabase } from "./seed";
import {
  insertProjectSchema, insertEstimateSchema, insertEstimateItemSchema,
  insertDeviceAssemblySchema, ANALYSIS_MODES
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

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType, data: imageData } },
      ]);

      const responseText = result.response.text();
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

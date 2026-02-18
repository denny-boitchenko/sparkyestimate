import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { seedDatabase } from "./seed";
import fs from "fs";
import path from "path";
import {
  insertProjectSchema, insertEstimateSchema, insertEstimateItemSchema,
  insertDeviceAssemblySchema, insertWireTypeSchema, insertServiceBundleSchema,
  insertPanelCircuitSchema, insertEstimateServiceSchema, insertEstimateCrewSchema,
  insertCustomerSchema, insertEmployeeSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertJobTypeSchema, insertProjectPhotoSchema, insertProjectAssignmentSchema,
  ANALYSIS_MODES
} from "@shared/schema";
import { z } from "zod";
import * as cecRules from "./cec-rules";
import { isR2Configured, getUploadUrl, getDownloadUrl, deleteObject, buildStorageKey } from "./r2";
import { isGoogleDriveConfigured, isGoogleDriveOAuthAvailable, getOAuth2Client, invalidateClient, getProjectFolderIds, uploadToGoogleDrive, getGoogleDriveDownloadUrl, deleteFromGoogleDrive, deleteProjectFolder, hasProjectFolder, phaseFolderKey } from "./google-drive";
import { google } from "googleapis";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 } });

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

  // Assembly Parts (get/set parts for an assembly)
  app.get("/api/device-assemblies/:id/parts", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assembly ID" });
    const parts = await storage.getAssemblyParts(id);
    res.json(parts);
  });

  app.put("/api/device-assemblies/:id/parts", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assembly ID" });
    const parts = req.body.parts;
    if (!Array.isArray(parts)) return res.status(400).json({ message: "parts must be an array" });
    try {
      await storage.setAssemblyParts(id, parts);
      const updatedParts = await storage.getAssemblyParts(id);
      res.json(updatedParts);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Parts Catalog
  app.get("/api/parts-catalog", async (req, res) => {
    const q = req.query.q as string | undefined;
    if (q) {
      const parts = await storage.searchParts(q);
      res.json(parts);
    } else {
      const parts = await storage.getPartsCatalog();
      res.json(parts);
    }
  });

  app.post("/api/parts-catalog", async (req, res) => {
    try {
      const part = await storage.createPart(req.body);
      res.status(201).json(part);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/parts-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid part ID" });
    const part = await storage.updatePart(id, req.body);
    if (!part) return res.status(404).json({ message: "Part not found" });
    res.json(part);
  });

  app.delete("/api/parts-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid part ID" });
    await storage.deletePart(id);
    res.status(204).send();
  });

  // Room Panel Assignments
  app.get("/api/ai-analyses/:id/panel-assignments", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    const assignments = await storage.getRoomPanelAssignments(id);
    res.json(assignments);
  });

  app.put("/api/ai-analyses/:id/panel-assignments", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    const assignments = req.body.assignments;
    if (!Array.isArray(assignments)) return res.status(400).json({ message: "assignments must be an array" });
    try {
      await storage.deleteRoomPanelAssignments(id);
      for (const a of assignments) {
        await storage.createRoomPanelAssignment({
          analysisId: id,
          roomName: a.roomName,
          panelName: a.panelName || "Main Panel",
          isManualOverride: a.isManualOverride || false,
        });
      }
      const updated = await storage.getRoomPanelAssignments(id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/room-panel-assignments/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assignment ID" });
    const updated = await storage.updateRoomPanelAssignment(id, req.body);
    if (!updated) return res.status(404).json({ message: "Assignment not found" });
    res.json(updated);
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

  // Job Types
  app.get("/api/job-types", async (_req, res) => {
    const jts = await storage.getJobTypes();
    res.json(jts);
  });

  app.post("/api/job-types", async (req, res) => {
    const parsed = insertJobTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const jt = await storage.createJobType(parsed.data);
      res.status(201).json(jt);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/job-types/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid job type ID" });
    const jt = await storage.updateJobType(id, req.body);
    if (!jt) return res.status(404).json({ message: "Job type not found" });
    res.json(jt);
  });

  app.delete("/api/job-types/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid job type ID" });
    await storage.deleteJobType(id);
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

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    const items = await storage.getEstimateItems(id);
    if (items.length === 0) return res.status(400).json({ message: "No line items to generate panel from" });

    await storage.deleteAllPanelCircuits(id);

    // -----------------------------------------------------------------------
    // CEC 2021 Compliant Panel Schedule Generator
    // -----------------------------------------------------------------------

    type CircuitData = {
      priority: number;
      description: string;
      wireType: string | null;
      isGfci: boolean;
      isAfci: boolean;
      amps: number;
      poles: number;
      roomType: string;
      outletCount: number;
    };
    const circuits: CircuitData[] = [];

    // --- Room classification helpers (case-insensitive) -------------------

    const isKitchenRoom = (room: string) => room.toLowerCase().includes("kitchen");
    const isBathRoom = (room: string) => /bath|ensuite|washroom|powder/i.test(room);
    const isBedroomRoom = (room: string) => /bed|master/i.test(room);
    const isGarageRoom = (room: string) => room.toLowerCase().includes("garage");
    const isOutdoorRoom = (room: string) => /outdoor|exterior|patio|deck|porch|balcony/i.test(room);
    const isLaundryRoom = (room: string) => room.toLowerCase().includes("laundry");

    // --- Item classification helpers --------------------------------------

    const isLightingItem = (item: typeof items[0]) => {
      const d = item.deviceType.toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return d.includes("light") || d.includes("fixture") || d.includes("pot light")
        || d.includes("luminaire") || d.includes("fluorescent") || d.includes("led")
        || desc.includes("light") || desc.includes("fixture") || desc.includes("luminaire");
    };

    const isReceptacleItem = (item: typeof items[0]) => {
      const d = item.deviceType.toLowerCase();
      return d.includes("receptacle") || d.includes("outlet") || d.includes("plug");
    };

    const isSwitchItem = (item: typeof items[0]) => {
      const d = item.deviceType.toLowerCase();
      return d.includes("switch") || d.includes("dimmer");
    };

    const isRangeHood = (item: typeof items[0]) => {
      const d = item.deviceType.toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return d.includes("range hood") || d.includes("hood fan") || desc.includes("range hood");
    };

    const isExhaustFan = (item: typeof items[0]) => {
      const d = item.deviceType.toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return d.includes("exhaust") || d.includes("vent fan") || desc.includes("exhaust");
    };

    // --- Group items by NORMALIZED room (case-insensitive merge) ----------

    const roomItems: Record<string, typeof items> = {};
    for (const item of items) {
      // Normalize: uppercase first letter, rest as-is, default "General"
      const rawRoom = (item.room || "General").trim();
      const normRoom = rawRoom.toUpperCase();
      if (!roomItems[normRoom]) roomItems[normRoom] = [];
      roomItems[normRoom].push(item);
    }

    // --- Buckets for classified items ------------------------------------

    // Kitchen (merged across all kitchen rooms)
    const allKitchenReceps: typeof items = [];
    const allKitchenLighting: typeof items = [];
    const allKitchenSwitches: typeof items = [];
    const kitchenDedicated: Array<{ item: typeof items[0]; label: string }> = [];

    // Bathroom buckets (per bathroom room, for splitting)
    const bathroomReceps: Array<{ room: string; items: typeof items }> = [];
    const bathroomLighting: Array<{ room: string; items: typeof items }> = [];

    // Laundry
    const allLaundryReceps: typeof items = [];
    const allLaundrySwitches: typeof items = [];

    // Dedicated appliances
    const rangeOvens: Array<{ room: string; item: typeof items[0] }> = [];
    const dryers: Array<{ room: string; item: typeof items[0] }> = [];
    const acUnits: Array<{ room: string; item: typeof items[0] }> = [];
    const electricHeaters: Array<{ room: string; item: typeof items[0] }> = [];
    const evChargers: Array<{ room: string; item: typeof items[0] }> = [];
    const furnaces: Array<{ room: string; item: typeof items[0] }> = [];
    const otherDedicated: Array<{ room: string; item: typeof items[0]; pattern: typeof cecRules.DEVICE_AMP_PATTERNS[0] }> = [];
    const smokeItems: Array<{ room: string; item: typeof items[0] }> = [];

    // General room buckets
    const garageReceps: typeof items = [];
    const garageSwitches: typeof items = [];
    const outdoorReceps: typeof items = [];
    const outdoorSwitches: typeof items = [];
    const bedroomRecepsByRoom: Array<{ room: string; items: typeof items }> = [];
    const generalLighting: Array<{ room: string; items: typeof items }> = [];
    const generalReceptacles: Array<{ room: string; items: typeof items }> = [];

    // --- Classify every item into the correct bucket --------------------

    for (const [normRoom, roomItemList] of Object.entries(roomItems)) {
      const lightItems: typeof items = [];
      const recepItems: typeof items = [];
      const switchItems: typeof items = [];
      const exhaustItems: typeof items = [];

      for (const item of roomItemList) {
        // Skip panel board / service entrance / meter items
        if (/panel\s*board|service\s*entrance|meter|load\s*center/i.test(item.deviceType)) continue;

        // Skip low-voltage items (Cat6, TV, doorbell, thermostat, etc.)
        if (cecRules.isLowVoltage(item.deviceType, item.description || undefined)) continue;

        // Skip custom wire runs (they're wire, not devices)
        if (/custom\s*wire\s*run/i.test(item.deviceType)) continue;

        // Check for dedicated circuit device match
        const match = cecRules.matchDevicePattern(item.deviceType)
          || cecRules.matchDevicePattern(item.description || "");

        if (match) {
          if (/range|oven|stove|cooktop/i.test(match.label)) {
            rangeOvens.push({ room: normRoom, item });
          } else if (/dryer/i.test(match.label)) {
            dryers.push({ room: normRoom, item });
          } else if (/a\/c|condenser|heat pump/i.test(match.label)) {
            acUnits.push({ room: normRoom, item });
          } else if (/electric heat|baseboard|heater/i.test(match.label)) {
            electricHeaters.push({ room: normRoom, item });
          } else if (/ev charger/i.test(match.label)) {
            evChargers.push({ room: normRoom, item });
          } else if (/furnace/i.test(match.label)) {
            furnaces.push({ room: normRoom, item });
          } else if (/smoke|co/i.test(match.label)) {
            smokeItems.push({ room: normRoom, item });
          } else if (isKitchenRoom(normRoom) && /fridge|refrigerator|dishwasher|garburator|microwave/i.test(match.label)) {
            kitchenDedicated.push({ item, label: match.label });
          } else {
            otherDedicated.push({ room: normRoom, item, pattern: match });
          }
          continue;
        }

        // Classify by type
        if (isRangeHood(item)) {
          lightItems.push(item); // range hood counts as kitchen lighting
        } else if (isExhaustFan(item)) {
          exhaustItems.push(item); // exhaust fans go with lighting
        } else if (isSwitchItem(item)) {
          switchItems.push(item); // switches go on lighting circuits
        } else if (isLightingItem(item)) {
          lightItems.push(item);
        } else if (isReceptacleItem(item)) {
          recepItems.push(item);
        } else {
          // Unclassified non-dedicated items: treat as receptacles
          recepItems.push(item);
        }
      }

      // Route to room-type buckets
      if (isKitchenRoom(normRoom)) {
        allKitchenReceps.push(...recepItems);
        allKitchenLighting.push(...lightItems, ...exhaustItems);
        allKitchenSwitches.push(...switchItems);
      } else if (isBathRoom(normRoom)) {
        // Bathroom: receps are GFCI, lighting/switches/exhaust go on bath lighting
        if (recepItems.length > 0) bathroomReceps.push({ room: normRoom, items: recepItems });
        const bathLights = [...lightItems, ...switchItems, ...exhaustItems];
        if (bathLights.length > 0) bathroomLighting.push({ room: normRoom, items: bathLights });
      } else if (isLaundryRoom(normRoom)) {
        allLaundryReceps.push(...recepItems);
        allLaundrySwitches.push(...switchItems);
        const laundLights = [...lightItems, ...exhaustItems];
        if (laundLights.length > 0) generalLighting.push({ room: normRoom, items: laundLights });
      } else if (isGarageRoom(normRoom)) {
        garageReceps.push(...recepItems);
        garageSwitches.push(...switchItems);
        const garageLights = [...lightItems, ...exhaustItems];
        if (garageLights.length > 0) generalLighting.push({ room: normRoom, items: garageLights });
      } else if (isOutdoorRoom(normRoom)) {
        outdoorReceps.push(...recepItems);
        outdoorSwitches.push(...switchItems);
        const outdoorLights = [...lightItems, ...exhaustItems];
        if (outdoorLights.length > 0) generalLighting.push({ room: normRoom, items: outdoorLights });
      } else if (isBedroomRoom(normRoom)) {
        const bedReceps = [...recepItems];
        if (bedReceps.length > 0) bedroomRecepsByRoom.push({ room: normRoom, items: bedReceps });
        // Bedroom switches go on lighting circuits
        const bedLights = [...lightItems, ...switchItems, ...exhaustItems];
        if (bedLights.length > 0) generalLighting.push({ room: normRoom, items: bedLights });
      } else {
        // All other rooms (living, dining, hallway, entry, WIC, etc.)
        if (recepItems.length > 0) generalReceptacles.push({ room: normRoom, items: recepItems });
        const otherLights = [...lightItems, ...switchItems, ...exhaustItems];
        if (otherLights.length > 0) generalLighting.push({ room: normRoom, items: otherLights });
      }
    }

    // --- Helpers ----------------------------------------------------------
    const totalOutlets = (itemList: typeof items) =>
      itemList.reduce((sum, i) => sum + i.quantity, 0);

    const itemDesc = (itemList: typeof items) =>
      itemList.map(i => `${i.quantity}x ${i.deviceType}`).join(", ");

    // =====================================================================
    // PRIORITY 1: Kitchen split receptacles (CEC 26-724d, min 2 circuits)
    // All kitchen receptacles merged into ONE pair of split circuits
    // =====================================================================
    if (allKitchenReceps.length > 0) {
      const count = totalOutlets(allKitchenReceps);
      const desc = itemDesc(allKitchenReceps);
      // CEC requires minimum 2 split circuits; if >12 outlets per circuit, add more pairs
      const outletsPerSplit = Math.ceil(count / 2);
      const pairsNeeded = Math.max(1, Math.ceil(outletsPerSplit / cecRules.MAX_OUTLETS_PER_CIRCUIT));
      for (let p = 0; p < pairsNeeded; p++) {
        const pairOutlets = Math.min(count - p * 24, 24); // 24 = 12 per split x 2
        circuits.push({
          priority: 1,
          description: `Kitchen - Split Receptacles Ckt ${p * 2 + 1} (${desc})`,
          wireType: cecRules.getWireTypeForAmps(20, true), // 12/3 NMD-90
          isGfci: true, isAfci: false, amps: 20, poles: 1,
          roomType: "kitchen", outletCount: Math.ceil(pairOutlets / 2),
        });
        circuits.push({
          priority: 1,
          description: `Kitchen - Split Receptacles Ckt ${p * 2 + 2}`,
          wireType: cecRules.getWireTypeForAmps(20, true), // 12/3 NMD-90
          isGfci: true, isAfci: false, amps: 20, poles: 1,
          roomType: "kitchen", outletCount: Math.floor(pairOutlets / 2),
        });
      }
    }

    // =====================================================================
    // PRIORITY 2: Kitchen dedicated appliances
    // =====================================================================
    for (const { item, label } of kitchenDedicated.filter(d => /fridge|refrigerator/i.test(d.label))) {
      circuits.push({
        priority: 2,
        description: `Kitchen - Refrigerator`,
        wireType: cecRules.getWireTypeForAmps(15),
        isGfci: false, isAfci: false, amps: 15, poles: 1,
        roomType: "kitchen", outletCount: 1,
      });
    }
    for (const { item, label } of kitchenDedicated.filter(d => /dishwasher/i.test(d.label))) {
      circuits.push({
        priority: 2,
        description: `Kitchen - Dishwasher`,
        wireType: cecRules.getWireTypeForAmps(15),
        isGfci: true, isAfci: false, amps: 15, poles: 1,
        roomType: "kitchen", outletCount: 1,
      });
    }
    for (const { item, label } of kitchenDedicated.filter(d => /garburator/i.test(d.label))) {
      circuits.push({
        priority: 2,
        description: `Kitchen - Garburator`,
        wireType: cecRules.getWireTypeForAmps(15),
        isGfci: true, isAfci: false, amps: 15, poles: 1,
        roomType: "kitchen", outletCount: 1,
      });
    }
    for (const { item, label } of kitchenDedicated.filter(d => /microwave/i.test(d.label))) {
      circuits.push({
        priority: 2,
        description: `Kitchen - Microwave`,
        wireType: cecRules.getWireTypeForAmps(20),
        isGfci: true, isAfci: false, amps: 20, poles: 1,
        roomType: "kitchen", outletCount: 1,
      });
    }
    // Kitchen lighting + range hood + switches (no GFCI on lighting per CEC)
    if (allKitchenLighting.length > 0 || allKitchenSwitches.length > 0) {
      const kitLightAll = [...allKitchenLighting, ...allKitchenSwitches];
      const count = totalOutlets(kitLightAll);
      const desc = itemDesc(allKitchenLighting);
      circuits.push({
        priority: 2,
        description: `Kitchen - Lighting & Range Hood (${desc})`,
        wireType: cecRules.getWireTypeForAmps(15),
        isGfci: false, isAfci: false, amps: 15, poles: 1,
        roomType: "kitchen", outletCount: count,
      });
    }

    // =====================================================================
    // PRIORITY 3: Bathroom GFCI receptacles + bathroom lighting
    // CEC 26-720(f): bathroom receptacles require GFCI, 20A
    // Separate lighting from receptacles; split if >12 outlets
    // =====================================================================
    {
      // Merge all bathroom receptacles, then split per CEC 12-3000
      const allBathReceps: Array<{ room: string; item: typeof items[0] }> = [];
      for (const { room, items: rItems } of bathroomReceps) {
        for (const item of rItems) {
          for (let q = 0; q < item.quantity; q++) {
            allBathReceps.push({ room, item });
          }
        }
      }
      const bathRecepGroups = cecRules.splitIntoCircuits(allBathReceps);
      for (const group of bathRecepGroups) {
        const roomDevices: Record<string, Record<string, number>> = {};
        for (const { room, item } of group) {
          if (!roomDevices[room]) roomDevices[room] = {};
          roomDevices[room][item.deviceType] = (roomDevices[room][item.deviceType] || 0) + 1;
        }
        const desc = Object.entries(roomDevices)
          .map(([r, devs]) => `${r}: ${Object.entries(devs).map(([d, c]) => `${c}x ${d}`).join(", ")}`)
          .join("; ");
        circuits.push({
          priority: 3,
          description: `Bathroom GFCI Receptacles (${desc})`,
          wireType: cecRules.getWireTypeForAmps(20),
          isGfci: true, isAfci: false, amps: 20, poles: 1,
          roomType: "bathroom", outletCount: group.length,
        });
      }
      // Bathroom lighting (lights + switches + exhaust fans) — separate circuit
      const allBathLights: Array<{ room: string; item: typeof items[0] }> = [];
      for (const { room, items: lItems } of bathroomLighting) {
        for (const item of lItems) {
          for (let q = 0; q < item.quantity; q++) {
            allBathLights.push({ room, item });
          }
        }
      }
      if (allBathLights.length > 0) {
        const bathLightGroups = cecRules.splitIntoCircuits(allBathLights);
        for (const group of bathLightGroups) {
          const roomDevices: Record<string, Record<string, number>> = {};
          for (const { room, item } of group) {
            if (!roomDevices[room]) roomDevices[room] = {};
            roomDevices[room][item.deviceType] = (roomDevices[room][item.deviceType] || 0) + 1;
          }
          const desc = Object.entries(roomDevices)
            .map(([r, devs]) => `${r}: ${Object.entries(devs).map(([d, c]) => `${c}x ${d}`).join(", ")}`)
            .join("; ");
          circuits.push({
            priority: 3,
            description: `Bathroom Lighting (${desc})`,
            wireType: cecRules.getWireTypeForAmps(15),
            isGfci: false, isAfci: false, amps: 15, poles: 1,
            roomType: "bathroom", outletCount: group.length,
          });
        }
      }
    }

    // =====================================================================
    // PRIORITY 4: Laundry receptacle + Dryer
    // =====================================================================
    if (allLaundryReceps.length > 0) {
      const count = totalOutlets(allLaundryReceps);
      const desc = itemDesc(allLaundryReceps);
      circuits.push({
        priority: 4,
        description: `Laundry - Receptacle (${desc})`,
        wireType: cecRules.getWireTypeForAmps(20),
        isGfci: true, isAfci: false, amps: 20, poles: 1,
        roomType: "laundry", outletCount: count,
      });
    }
    for (const { room, item } of dryers) {
      circuits.push({
        priority: 4,
        description: `Laundry - Dryer`,
        wireType: "10/3 NMD-90",
        isGfci: true, isAfci: false, amps: 30, poles: 2,
        roomType: "laundry", outletCount: 1,
      });
    }

    // =====================================================================
    // PRIORITY 5: Range / Oven
    // =====================================================================
    for (const { room, item } of rangeOvens) {
      circuits.push({
        priority: 5,
        description: `Kitchen - Range/Oven`,
        wireType: "6/3 NMD-90",
        isGfci: false, isAfci: false, amps: 40, poles: 2,
        roomType: "kitchen", outletCount: 1,
      });
    }

    // =====================================================================
    // PRIORITY 6: A/C
    // =====================================================================
    for (const { room, item } of acUnits) {
      circuits.push({
        priority: 6,
        description: `${room} - A/C`,
        wireType: "10/3 NMD-90",
        isGfci: false, isAfci: false, amps: 30, poles: 2,
        roomType: "mechanical", outletCount: 1,
      });
    }

    // =====================================================================
    // PRIORITY 7: Electric heat
    // =====================================================================
    for (const { room, item } of electricHeaters) {
      const qty = item.quantity;
      circuits.push({
        priority: 7,
        description: `${room} - Electric Heater (${qty}x ${item.deviceType})`,
        wireType: "12/2 NMD-90",
        isGfci: false, isAfci: false, amps: 20, poles: 2,
        roomType: "heating", outletCount: qty,
      });
    }

    // =====================================================================
    // PRIORITY 8: EV charger
    // =====================================================================
    for (const { room, item } of evChargers) {
      circuits.push({
        priority: 8,
        description: `${room} - EV Charger`,
        wireType: "6/3 NMD-90",
        isGfci: false, isAfci: false, amps: 40, poles: 2,
        roomType: "garage", outletCount: 1,
      });
    }

    // =====================================================================
    // PRIORITY 9: Garage GFCI receptacles (CEC 26-724b)
    // =====================================================================
    if (garageReceps.length > 0) {
      const count = totalOutlets(garageReceps);
      const desc = itemDesc(garageReceps);
      const groups = cecRules.splitIntoCircuits(
        Array.from({ length: count }, (_, i) => i),
      );
      groups.forEach((group, idx) => {
        circuits.push({
          priority: 9,
          description: `Garage - GFCI Receptacles${groups.length > 1 ? ` Ckt ${idx + 1}` : ""} (${desc})`,
          wireType: cecRules.getWireTypeForAmps(20),
          isGfci: true, isAfci: true, amps: 20, poles: 1,
          roomType: "garage", outletCount: group.length,
        });
      });
    }

    // =====================================================================
    // PRIORITY 10: Outdoor GFCI receptacles (CEC 26-724f)
    // =====================================================================
    if (outdoorReceps.length > 0) {
      const count = totalOutlets(outdoorReceps);
      const desc = itemDesc(outdoorReceps);
      const groups = cecRules.splitIntoCircuits(
        Array.from({ length: count }, (_, i) => i),
      );
      groups.forEach((group, idx) => {
        circuits.push({
          priority: 10,
          description: `Outdoor - GFCI Receptacles${groups.length > 1 ? ` Ckt ${idx + 1}` : ""} (${desc})`,
          wireType: cecRules.getWireTypeForAmps(20),
          isGfci: true, isAfci: false, amps: 20, poles: 1,
          roomType: "outdoor", outletCount: group.length,
        });
      });
    }

    // =====================================================================
    // PRIORITY 11: Smoke / CO detectors (whole house, one circuit)
    // CEC 32-110: interconnected, 14/3 NMD-90
    // =====================================================================
    if (smokeItems.length > 0) {
      const totalQty = smokeItems.reduce((s, d) => s + d.item.quantity, 0);
      circuits.push({
        priority: 11,
        description: `Smoke/CO Detectors (${totalQty} units)`,
        wireType: "14/3 NMD-90",
        isGfci: false, isAfci: false, amps: 15, poles: 1,
        roomType: "safety", outletCount: totalQty,
      });
    }

    // =====================================================================
    // PRIORITY 12: Furnace
    // =====================================================================
    for (const { room, item } of furnaces) {
      circuits.push({
        priority: 12,
        description: `${room} - Furnace`,
        wireType: cecRules.getWireTypeForAmps(15),
        isGfci: false, isAfci: false, amps: 15, poles: 1,
        roomType: "mechanical", outletCount: 1,
      });
    }

    // =====================================================================
    // PRIORITY 13: General lighting (max 12 per circuit, AFCI required)
    // CEC 30-203 + 26-656: lighting in dwelling units requires AFCI
    // Includes switches (switches control lights, go on same circuit)
    // =====================================================================
    {
      const allLightItems: Array<{ room: string; item: typeof items[0] }> = [];
      for (const { room, items: lItems } of generalLighting) {
        for (const item of lItems) {
          for (let q = 0; q < item.quantity; q++) {
            allLightItems.push({ room, item });
          }
        }
      }
      const lightGroups = cecRules.splitIntoCircuits(allLightItems);
      for (const group of lightGroups) {
        const roomDevices: Record<string, Record<string, number>> = {};
        for (const { room, item } of group) {
          if (!roomDevices[room]) roomDevices[room] = {};
          roomDevices[room][item.deviceType] = (roomDevices[room][item.deviceType] || 0) + 1;
        }
        const desc = Object.entries(roomDevices)
          .map(([r, devs]) => `${r}: ${Object.entries(devs).map(([d, c]) => `${c}x ${d}`).join(", ")}`)
          .join("; ");
        circuits.push({
          priority: 13,
          description: `General Lighting (${desc})`,
          wireType: cecRules.getWireTypeForAmps(15),
          isGfci: false, isAfci: true, amps: 15, poles: 1,
          roomType: "lighting", outletCount: group.length,
        });
      }
    }

    // =====================================================================
    // PRIORITY 14: Bedroom receptacles (max 12 per circuit, AFCI)
    // CEC 26-656: AFCI required in bedrooms
    // =====================================================================
    {
      const allBedReceps: Array<{ room: string; item: typeof items[0] }> = [];
      for (const { room, items: bItems } of bedroomRecepsByRoom) {
        for (const item of bItems) {
          for (let q = 0; q < item.quantity; q++) {
            allBedReceps.push({ room, item });
          }
        }
      }
      const bedGroups = cecRules.splitIntoCircuits(allBedReceps);
      for (const group of bedGroups) {
        const roomDevices: Record<string, Record<string, number>> = {};
        for (const { room, item } of group) {
          if (!roomDevices[room]) roomDevices[room] = {};
          roomDevices[room][item.deviceType] = (roomDevices[room][item.deviceType] || 0) + 1;
        }
        const desc = Object.entries(roomDevices)
          .map(([r, devs]) => `${r}: ${Object.entries(devs).map(([d, c]) => `${c}x ${d}`).join(", ")}`)
          .join("; ");
        circuits.push({
          priority: 14,
          description: `Bedroom Receptacles (${desc})`,
          wireType: cecRules.getWireTypeForAmps(15),
          isGfci: false, isAfci: true, amps: 15, poles: 1,
          roomType: "bedroom", outletCount: group.length,
        });
      }
    }

    // =====================================================================
    // PRIORITY 15: General receptacles (max 12 per circuit, AFCI)
    // CEC 26-658: AFCI in living areas
    // =====================================================================
    {
      const allGenReceps: Array<{ room: string; item: typeof items[0] }> = [];
      for (const { room, items: gItems } of generalReceptacles) {
        for (const item of gItems) {
          for (let q = 0; q < item.quantity; q++) {
            allGenReceps.push({ room, item });
          }
        }
      }
      const genGroups = cecRules.splitIntoCircuits(allGenReceps);
      for (const group of genGroups) {
        const roomDevices: Record<string, Record<string, number>> = {};
        for (const { room, item } of group) {
          if (!roomDevices[room]) roomDevices[room] = {};
          roomDevices[room][item.deviceType] = (roomDevices[room][item.deviceType] || 0) + 1;
        }
        const desc = Object.entries(roomDevices)
          .map(([r, devs]) => `${r}: ${Object.entries(devs).map(([d, c]) => `${c}x ${d}`).join(", ")}`)
          .join("; ");
        circuits.push({
          priority: 15,
          description: `General Receptacles (${desc})`,
          wireType: cecRules.getWireTypeForAmps(15),
          isGfci: false, isAfci: true, amps: 15, poles: 1,
          roomType: "general", outletCount: group.length,
        });
      }
    }

    // =====================================================================
    // Other dedicated circuits (hot tub, pool pump, etc.)
    // =====================================================================
    for (const { room, item, pattern } of otherDedicated) {
      circuits.push({
        priority: 5,
        description: `${room} - ${pattern.label}`,
        wireType: pattern.wireType || cecRules.getWireTypeForAmps(pattern.amps),
        isGfci: pattern.gfci, isAfci: pattern.afci,
        amps: pattern.amps, poles: pattern.poles,
        roomType: room.toLowerCase(), outletCount: 1,
      });
    }

    // --- Sort by priority then description --------------------------------
    circuits.sort((a, b) => a.priority - b.priority || a.description.localeCompare(b.description));

    // =====================================================================
    // PRIORITY 16: Spare circuits
    // Fill remaining panel spaces (minimum 2, maximum 4)
    // =====================================================================
    const currentPanelSize = estimate.panelSize || 200;
    const panelSpaces = cecRules.PANEL_SPACES[currentPanelSize] || 40;
    const spacesUsedBefore = circuits.reduce((s, c) => s + c.poles, 0);
    const availableSpares = Math.max(0, panelSpaces - spacesUsedBefore);
    const spareCount = Math.min(4, Math.max(2, availableSpares));
    for (let i = 0; i < spareCount; i++) {
      circuits.push({
        priority: 16,
        description: `Spare ${i + 1}`,
        wireType: null,
        isGfci: false, isAfci: false, amps: 15, poles: 1,
        roomType: "spare", outletCount: 0,
      });
    }

    // --- Persist to DB ---------------------------------------------------
    let circuitNumber = 1;
    const created: any[] = [];
    for (const data of circuits) {
      const circuit = await storage.createPanelCircuit({
        estimateId: id,
        circuitNumber,
        amps: data.amps,
        poles: data.poles,
        description: data.description,
        wireType: data.wireType,
        isGfci: data.isGfci,
        isAfci: data.isAfci,
        roomType: data.roomType,
        outletCount: data.outletCount,
      });
      created.push(circuit);
      circuitNumber++;
    }

    // --- Summary ---------------------------------------------------------
    const totalCircuits = created.length;
    const spacesUsed = circuits.reduce((s, c) => s + c.poles, 0);
    const gfciCount = circuits.filter(c => c.isGfci).length;
    const afciCount = circuits.filter(c => c.isAfci).length;
    const sparesInSchedule = circuits.filter(c => c.roomType === "spare").length;

    // Connected load per CEC Rule 8-200:
    // Basic = lighting (1500W per circuit) + receptacles (1500W per circuit)
    // Large appliances = actual nameplate (amps × voltage)
    const basicCircuits = circuits.filter(c =>
      c.roomType !== "spare" && c.poles === 1
    );
    const largeCircuits = circuits.filter(c => c.poles === 2);

    // CEC 8-200(1)(a)(i): basic load = 3000W per kitchen split pair +
    //   1500W per other 15A circuit + 2400W per 20A circuit
    const basicLoadWatts = basicCircuits.reduce((s, c) => {
      if (c.roomType === "kitchen" && c.description.includes("Split")) {
        return s + 1500; // Each split circuit = 1500W (pair = 3000W)
      }
      return s + cecRules.circuitWatts(c.amps, c.poles);
    }, 0);

    const largeApplianceWatts = largeCircuits.reduce(
      (s, c) => s + cecRules.circuitWatts(c.amps, c.poles), 0
    );

    const connectedLoad = basicLoadWatts + largeApplianceWatts;
    const demandLoad = cecRules.calculateDemandLoad(basicLoadWatts, largeApplianceWatts);
    const demandAmps = cecRules.wattsToAmps(demandLoad);
    const recommendedPanelSize = cecRules.recommendPanelSize(demandAmps);

    res.json({
      circuits: created,
      summary: {
        totalCircuits,
        spacesUsed,
        panelSpaces,
        connectedLoad,
        demandLoad,
        demandAmps,
        recommendedPanelSize,
        currentPanelSize,
        gfciCount,
        afciCount,
        spareCount: sparesInSchedule,
      },
    });
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

  // Estimate Crew
  app.get("/api/estimates/:id/crew", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    const crew = await storage.getEstimateCrew(id);
    res.json(crew);
  });

  app.post("/api/estimate-crew", async (req, res) => {
    const parsed = insertEstimateCrewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const member = await storage.createEstimateCrew(parsed.data);
      res.status(201).json(member);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/estimate-crew/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid crew member ID" });
    await storage.deleteEstimateCrew(id);
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
      let expectedWire = "14/2 NMD-90";
      if (circuit.amps >= 20) expectedWire = "12/2 NMD-90";
      if (circuit.amps >= 30) expectedWire = "10/2 NMD-90";
      if (circuit.amps >= 40) expectedWire = "6/3 NMD-90";

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

  // Bill of Materials (BOM) for estimate
  app.get("/api/estimates/:id/bom", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });
    try {
      const items = await storage.getEstimateItems(id);
      const partsMap = new Map<number, { part: any; totalQuantity: number; usedInItems: any[] }>();
      const unmatchedItems: any[] = [];

      for (const item of items) {
        if (!item.assemblyId) {
          unmatchedItems.push({ deviceType: item.deviceType, room: item.room, quantity: item.quantity, materialCost: item.materialCost });
          continue;
        }
        const assemblyParts = await storage.getAssemblyParts(item.assemblyId);
        if (assemblyParts.length === 0) {
          unmatchedItems.push({ deviceType: item.deviceType, room: item.room, quantity: item.quantity, materialCost: item.materialCost });
          continue;
        }
        for (const ap of assemblyParts) {
          const existing = partsMap.get(ap.partId);
          const partQty = ap.quantity * item.quantity;
          if (existing) {
            existing.totalQuantity += partQty;
            existing.usedInItems.push({ room: item.room, deviceType: item.deviceType, quantity: item.quantity });
          } else {
            partsMap.set(ap.partId, {
              part: ap.part,
              totalQuantity: partQty,
              usedInItems: [{ room: item.room, deviceType: item.deviceType, quantity: item.quantity }],
            });
          }
        }
      }

      const parts = Array.from(partsMap.values()).map(p => ({
        partId: p.part.id,
        partName: p.part.name,
        category: p.part.category,
        unitCost: p.part.unitCost,
        totalQuantity: p.totalQuantity,
        totalCost: Math.round(p.part.unitCost * p.totalQuantity * 100) / 100,
        supplier: p.part.supplier,
        partNumber: p.part.partNumber,
        usedInItems: p.usedInItems,
      }));

      const totalPartsCost = parts.reduce((sum, p) => sum + p.totalCost, 0);
      res.json({ parts, totalPartsCost, unmatchedItems });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

  // Serve uploaded AI analysis file (PDF, image, etc.)
  app.get("/api/ai-analyses/:id/file", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid analysis ID" });
    const analysis = await storage.getAiAnalysis(id);
    if (!analysis) return res.status(404).json({ message: "Analysis not found" });

    const uploadsDir = path.join(process.cwd(), "uploads", "ai-analyses");
    const ext = path.extname(analysis.fileName) || ".bin";
    const filePath = path.join(uploadsDir, `${id}${ext}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    const contentType = mimeTypes[ext.toLowerCase()] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${analysis.fileName}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
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
    projectId: z.string().regex(/^\d+$/, "projectId must be a number").optional(),
    pages: z.string().optional(),
    pageImages: z.string().optional(),
    sessionId: z.string().optional(),
    dwellingType: z.enum(["single", "duplex", "triplex", "fourplex", "townhouse", "condo", "apartment", "commercial", "industrial"]).optional().default("single"),
    hasLegalSuite: z.enum(["true", "false"]).optional().default("false"),
  });

  // In-memory SSE progress tracking
  const analysisProgress = new Map<string, { page: number; total: number; status: string; clients: Set<import("express").Response> }>();

  app.get("/api/ai-analyze/progress/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let entry = analysisProgress.get(sessionId);
    if (!entry) {
      entry = { page: 0, total: 0, status: "waiting", clients: new Set() };
      analysisProgress.set(sessionId, entry);
    }
    entry.clients.add(res);

    req.on("close", () => {
      entry!.clients.delete(res);
      if (entry!.clients.size === 0) {
        analysisProgress.delete(sessionId);
      }
    });
  });

  function emitProgress(sessionId: string, page: number, total: number, status: string) {
    const entry = analysisProgress.get(sessionId);
    if (!entry) return;
    entry.page = page;
    entry.total = total;
    entry.status = status;
    const data = JSON.stringify({ page, totalPages: total, status });
    Array.from(entry.clients).forEach(client => {
      client.write(`event: progress\ndata: ${data}\n\n`);
    });
  }

  function emitDone(sessionId: string, result: any) {
    const entry = analysisProgress.get(sessionId);
    if (!entry) return;
    Array.from(entry.clients).forEach(client => {
      client.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      client.end();
    });
    analysisProgress.delete(sessionId);
  }

  function emitError(sessionId: string, message: string) {
    const entry = analysisProgress.get(sessionId);
    if (!entry) return;
    Array.from(entry.clients).forEach(client => {
      client.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      client.end();
    });
    analysisProgress.delete(sessionId);
  }

  // ── Dwelling Context Builder ──
  function buildDwellingContext(dwellingType: string, hasLegalSuite: boolean): string {
    const labels: Record<string, string> = {
      single: "single-family dwelling",
      duplex: "duplex (2-unit dwelling)",
      triplex: "triplex (3-unit dwelling)",
      fourplex: "fourplex (4-unit dwelling)",
      townhouse: "townhouse unit",
      condo: "condominium unit",
      apartment: "apartment unit",
      commercial: "commercial building",
      industrial: "industrial building",
    };
    const label = labels[dwellingType] || "residential dwelling";
    let context = `DWELLING CONTEXT: This is a ${label}.`;

    if (dwellingType === "single" && hasLegalSuite) {
      context += ` This dwelling has a LEGAL SECONDARY SUITE (typically in the basement). Look for a separate suite entrance, suite kitchen, and suite bedrooms. The suite requires its own sub-panel per CEC 26-256 (60A minimum feeder). Identify suite rooms separately. For each room, include a "panelAssignment" field: suite rooms (suite kitchen, suite bedrooms, suite bathroom, suite living) should be "Suite Sub-Panel", all other rooms should be "Main Panel".`;
    }
    if (["duplex", "triplex", "fourplex"].includes(dwellingType)) {
      const unitCount = dwellingType === "duplex" ? 2 : dwellingType === "triplex" ? 3 : 4;
      context += ` Look for ${unitCount} separate dwelling units. Each unit should have its own rooms (kitchen, bathroom, bedrooms). Prefix room names with the unit identifier (e.g., "Unit A - Kitchen", "Unit B - Kitchen"). Each unit requires its own panel or sub-panel. For each room, include a "panelAssignment" field with the unit's panel name (e.g., "Unit A Panel", "Unit B Panel").`;
    }
    return context;
  }

  // ── Legend Extraction Prompts ──
  const ELECTRICAL_LEGEND_EXTRACTION_PROMPT = `You are an expert at reading electrical drawing symbol legends.

TASK: Extract the SYMBOL LEGEND from this drawing page. The legend is typically a table or list showing what each electrical symbol represents.

For each symbol in the legend, provide:
1. The symbol description or label as shown on the drawing
2. The closest matching standardized electrical symbol name from this list:
   duplex_receptacle, gfci_receptacle, weather_resistant_receptacle, split_receptacle,
   dedicated_receptacle, single_pole_switch, three_way_switch, four_way_switch, dimmer_switch,
   recessed_light, surface_mount_light, pendant_light, track_light, wall_sconce, exterior_light,
   ceiling_fan, exhaust_fan, range_hood_fan, smoke_detector, co_detector, smoke_co_combo,
   data_outlet, tv_outlet, phone_outlet, doorbell, thermostat, panel_board, subpanel,
   junction_box, ev_charger_outlet, dryer_outlet, range_outlet, ac_disconnect,
   outdoor_receptacle, motion_sensor, occupancy_sensor, fluorescent_light, led_panel_light,
   under_cabinet_light, switched_soffit_outlet, led_strip_light,
   floor_heat, baseboard_heater, sauna_heater

IMPORTANT: Look for CLUSTER NOTATION common in hand-drawn plans:
- "5D", "10D", "14D" etc. = CIRCUIT/ZONE LABELS, not device counts
- Count the actual individual light symbols, not the number in the cluster label
- Distinguish: Ceiling Flush Light (circle with X or lines) vs Potlight (small filled circle) vs Gimbal (adjustable potlight)
- Also look for: LED strip markings, "I F G" (island fixture/GFI), pendant symbols
- Floor Heat symbol = 240V GFI for in-floor radiant heating (luxury ensuites)
- Baseboard Heat = 240V baseboard heater (each with own thermostat)
- Sauna Heater = 240V dedicated (with LV thermostat)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "has_legend": true,
  "legend_entries": [
    { "drawing_label": "DUPLEX OUTLET", "standard_type": "duplex_receptacle", "notes": "" },
    { "drawing_label": "GFI OUTLET", "standard_type": "gfci_receptacle", "notes": "Near sinks" }
  ]
}

If NO symbol legend is found on this page, return:
{"has_legend": false, "legend_entries": []}`;

  const ROOM_LEGEND_EXTRACTION_PROMPT = `You are an expert at reading architectural drawing legends and room schedules.

TASK: Extract the ROOM SCHEDULE, ROOM LEGEND, or AREA TABLE from this drawing page.

Look for:
- A room schedule table listing room names, areas, and floor levels
- A legend showing room type abbreviations and their meanings
- An area calculation table

For each entry found, provide:
1. Room name/label
2. Area in square feet (if listed)
3. Floor level (if listed)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "has_legend": true,
  "room_entries": [
    { "room_name": "KITCHEN", "area_sqft": 180, "floor_level": "main" },
    { "room_name": "PRIMARY BEDROOM", "area_sqft": 220, "floor_level": "upper" }
  ],
  "abbreviations": [
    { "abbrev": "WIC", "meaning": "Walk-in Closet" },
    { "abbrev": "ENS", "meaning": "Ensuite Bathroom" }
  ]
}

If NO room legend or schedule is found, return:
{"has_legend": false, "room_entries": [], "abbreviations": []}`;

  const ROOM_DETECTION_PROMPT = `You are an expert residential architect analyzing an architectural floor plan drawing.

TASK: Identify EVERY room on this floor plan. For each room, determine:
1. Room type (use standardized names below)
2. Room name as labelled on the drawing
3. Approximate area in square feet (estimate from the drawing scale or proportions)
4. Whether the room has a sink (kitchen, bathroom, laundry, etc.)
5. Whether the room has a bathtub or shower
6. Number of usable walls (walls with enough space for receptacles)
7. Floor level (main, upper, lower, basement)
8. Confidence score (0.0 to 1.0)

STANDARDIZED ROOM TYPES (use these exactly):
- kitchen
- bathroom (full bath with tub/shower + sink + toilet — shared, NOT attached to primary)
- ensuite (bathroom attached to primary bedroom — has vanity + tub/shower, NOT a shared bathroom)
- half_bath (small WC / powder room — sink + toilet, no tub/shower, typically ≤40 SF)
- powder_room (alias for half_bath — use half_bath if possible)
- primary_bedroom
- bedroom
- living_room
- family_room
- dining_room
- hallway
- garage (attached)
- laundry_room
- basement_finished
- basement_unfinished
- closet_walkin
- closet_standard
- entry_foyer
- utility_room (water heater, general utility)
- mechanical_room (furnace room, MECH, panel board location)
- office_den
- mudroom
- pantry
- stairway
- covered_deck (covered outdoor deck with ceiling — gets ceiling lights, distinct from open deck)
- deck (outdoor open deck, no ceiling — generates NOTHING)
- patio (outdoor patio, separate from deck)
- open_to_below (double-height space only)
- sunroom
- greatroom (large open-concept room, often with fireplace — gets potlights + LED strip)
- sauna (sauna room — 240V heater + thermostat + waterproof light)

IMPORTANT INSTRUCTIONS:
- Look for room labels/text on the drawing. Common abbreviations: WIC = walk-in closet, MECH = mechanical_room, ENS = ensuite bathroom, PWD = powder room, BR = bedroom, LDY = laundry, KIT = kitchen, LIV = living room, DIN = dining room, WC = half bath
- Look for a ROOM SCHEDULE TABLE if one exists on this page — if found, USE IT as ground truth for room names and areas. Only use vision detection for rooms not listed in the schedule.
- Look for DIMENSION LINES on the drawing — use them to calculate accurate room areas. If no dimensions, use door widths (~3ft/0.9m standard) as a reference scale.
- Count ALL rooms including hallways, closets (both walk-in AND standard), stairways, and pantries. Closets are commonly missed — check inside every bedroom for closets.
- If a room label is visible on the drawing, use it for room_name
- Mark has_sink=true for kitchens, bathrooms, ensuites, half_baths, powder rooms, laundry rooms
- Mark has_bathtub_shower=true for full bathrooms and ensuites (NOT half_bath/powder_room)
- For MASTER/PRIMARY bedrooms, use "primary_bedroom" type
- For DEN/OFFICE rooms, use "office_den" type
- For FAMILY ROOM/REC ROOM, use "family_room" type
- ENS / ENSUITE next to primary bedroom = "ensuite" (NOT "bathroom" — different device counts)
- WC / POWDER / PWD = "half_bath" (NOT "powder_room" — we map to half_bath)
- BATH/BATHROOM shared between secondary bedrooms = "bathroom"
- COVERED DECK with visible ceiling = "covered_deck" (NOT "deck" — different lighting)
- LINEN / LINEN CLOSET next to bathroom = "closet_standard" (generates minimal devices)
- SUITE in basement context = "basement_finished"
- DECK = "deck", PATIO = "patio" (separate outdoor spaces, each needs own devices)
- MECH/FURNACE ROOM = "mechanical_room" (panel board location)
- If this is a MULTI-UNIT floor plan, identify which unit each room belongs to and prefix room_name accordingly (e.g., "Unit A - Kitchen")
- Look for SHARED BATHROOM serving secondary bedrooms — commonly missed between bedrooms
- GREATROOM / GREAT ROOM (large open-concept room, often with fireplace) = "greatroom"
- SAUNA = "sauna" (240V heater, dedicated circuit)
- SUN DECK (open, no ceiling) = "deck" — generates NO electrical devices
- STORAGE/MECH combined with MECH MAIN = single "mechanical_room" (don't double-count)

VERIFICATION:
- After identifying all rooms, COUNT the total number of enclosed spaces visible on the drawing. Your room count should match.
- Every bedroom should have at least one closet nearby. If you see a bedroom without a closet, look again.

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "floor_level": "main",
  "total_sqft": 1800,
  "rooms": [
    {
      "room_type": "kitchen",
      "room_name": "KITCHEN",
      "approx_area_sqft": 180,
      "has_sink": true,
      "has_bathtub_shower": false,
      "wall_count": 3,
      "confidence": 0.90
    }
  ]
}`;

  const ELECTRICAL_ANALYSIS_PROMPT = `You are an expert electrical estimator analyzing a residential electrical floor plan drawing.
This drawing follows Canadian Electrical Code (CEC) / NEC symbol conventions.

TASK: Identify and count EVERY electrical symbol on this drawing page.

For each symbol type found, provide:
1. The symbol type (use the standardized names below)
2. The exact count
3. A confidence score (0.0 to 1.0) for your count accuracy
4. Which room it's in

STANDARDIZED SYMBOL NAMES (use these exactly):
- duplex_receptacle (standard 15A/20A outlet)
- gfci_receptacle (ground fault circuit interrupter outlet)
- weather_resistant_receptacle
- split_receptacle
- dedicated_receptacle (for specific appliances)
- single_pole_switch
- three_way_switch
- four_way_switch
- dimmer_switch
- recessed_light
- surface_mount_light
- pendant_light
- track_light
- wall_sconce
- exterior_light
- ceiling_fan
- exhaust_fan
- range_hood_fan
- smoke_detector
- co_detector
- smoke_co_combo
- data_outlet
- tv_outlet
- phone_outlet
- doorbell
- thermostat
- panel_board
- subpanel
- junction_box
- ev_charger_outlet
- dryer_outlet
- range_outlet
- ac_disconnect
- outdoor_receptacle
- motion_sensor
- occupancy_sensor
- fluorescent_light
- led_panel_light
- under_cabinet_light (LED strip under kitchen cabinets)
- switched_soffit_outlet (switched outlet in soffit for holiday lights)
- led_strip_light (decorative LED strip on built-ins, fireplace, etc.)
- floor_heat (240V GFI in-floor radiant heating)
- baseboard_heater (240V baseboard heater with thermostat)
- sauna_heater (240V dedicated sauna heater)

COUNTING METHODOLOGY:
- Look for a SYMBOL LEGEND on the page first — if found, use it to identify non-standard or custom symbols
- Count receptacles methodically: go room by room, then wall by wall within each room
- Switches at both ends of a hallway or stairway are typically 3-way switches
- Bathroom receptacles near sinks are typically GFCI
- Outdoor/garage receptacles are typically weather-resistant or GFCI
- IMPORTANT: "nD" notations (e.g., "5D", "14D") are CIRCUIT LABELS, not room-level potlight counts — count individual symbols instead

REAL-WORLD BC RESIDENTIAL PATTERNS (verified from 4 BC projects — Bayliss, 1734, 4-Plex Vernon, Horizon):
- DISTINGUISH between ceiling flush lights (circle with X) and recessed potlights (small filled circle)
- Standard homes use flush lights in bedrooms, dining, WIC, garage, laundry
- Potlights appear in: kitchen (4), hallway (2-7), living room (4), covered deck (4), bathrooms (tub/shower area)
- Luxury homes add potlights to: primary bedroom (4), pantry (2 with built-in cabinets)
- Kitchen: 4 potlights, 1 island GFI 20A, 4 counter 20A (KCP), 1 island 20A, 240V range, DW + fridge dedicated, under-cabinet LED, 2 island pendants, 4 single switches
- Bedroom: 1 flush light, 4-5 receptacles, 1 single switch, smoke alarm
- Hallway: potlights (2-7 varies by length), 3-way switches, smoke/CO, 0-2 outlets
- Garage: 2-3 flush lights (size-dependent, NOT potlights), EV charger 240V, 2 outdoor sconces, outdoor GFI, NO smoke alarm, panel is in MECH ROOM not garage
- Ensuite: 2 vanity sconces + 1 shower potlight + 1 flush light, GFI, exhaust fan, 3 single switches, floor heat (luxury)
- Entrance/Foyer: 2 flush lights + outdoor sconce, front outdoor GFI, 2 three-way + 1 single switch
- WIC: ALWAYS 1 flush light (never potlights), 0 outlets, 1 switch
- Pantry (luxury): 2 potlights + 2 20A plugs + 1 GFI 20A (built-in cabinets)
- Pantry (standard): 1 flush light, 0 outlets
- Covered deck: 4 potlights, 1 15A weather outlet, soffit outlet, 3-way + single switches
- Mech room: 1 flush, 3 outlets, 200A panel
- Office: 1 flush, 4+ outlets, data/LV, smoke detector
- 20A vs 15A outlets: different symbols — 20A used in kitchens (island + counter)
- Floor Heat: 240V GFI dedicated (luxury ensuites)
- Baseboard Heat: 240V with thermostat (suite/basement rooms)
- Sauna Heater: 240V dedicated + LV thermostat

Also determine:
- Is this page an electrical plan? (true/false)
- What type of page is this? (electrical, architectural, mechanical, plumbing, cover, schedule, detail, other)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "is_electrical": true,
  "page_type": "electrical",
  "floor_level": "main",
  "rooms": [
    {
      "name": "KITCHEN",
      "floor": "Main Floor",
      "devices": [
        {"type": "duplex_receptacle", "count": 14, "confidence": 0.95, "notes": ""}
      ]
    }
  ],
  "observations": "Any relevant notes about the drawing"
}

If this is NOT an electrical page, return:
{"is_electrical": false, "page_type": "architectural", "rooms": [], "observations": "This appears to be an architectural floor plan"}

VERIFICATION:
- COUNT CAREFULLY. Double-check your counts by going room-by-room a second time.
- Mark confidence lower if symbols are unclear, overlapping, or in dense areas.
- Sanity check: For a typical residential floor, total receptacles should roughly equal perimeter_ft / 6 (CEC 1.8m wall spacing rule).`;

  app.post("/api/ai-analyze", upload.single("file"), async (req, res) => {
    const sessionId = (req.body?.sessionId as string) || null;
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const bodyParsed = analyzeBodySchema.safeParse(req.body);
      if (!bodyParsed.success) return res.status(400).json({ message: bodyParsed.error.issues.map(i => i.message).join(", ") });

      const mode = bodyParsed.data.mode;
      const projectId = bodyParsed.data.projectId ? parseInt(bodyParsed.data.projectId, 10) : null;
      const pageImagesRaw = bodyParsed.data.pageImages;

      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Gemini API key not configured" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let pageImages: Array<{ pageNumber: number; dataUrl: string }> = [];

      if (pageImagesRaw) {
        try {
          pageImages = JSON.parse(pageImagesRaw);
        } catch {
          pageImages = [];
        }
      }

      if (pageImages.length === 0) {
        const imageData = file.buffer.toString("base64");
        const mimeType = file.mimetype || "image/png";
        pageImages = [{ pageNumber: 1, dataUrl: `data:${mimeType};base64,${imageData}` }];
      }

      // ── Dwelling context ──
      const dwellingType = bodyParsed.data.dwellingType || "single";
      const hasLegalSuite = bodyParsed.data.hasLegalSuite === "true";
      const dwellingContext = buildDwellingContext(dwellingType, hasLegalSuite);

      const totalPages = pageImages.length;

      // ── Pass 1: Legend Extraction ──
      if (sessionId) emitProgress(sessionId, 0, totalPages, "extracting_legend");

      const legendPrompt = mode === "electrical"
        ? ELECTRICAL_LEGEND_EXTRACTION_PROMPT
        : ROOM_LEGEND_EXTRACTION_PROMPT;

      let extractedLegend: any = null;

      // Try first page, then last page to find the legend
      const legendPages = [pageImages[0]];
      if (pageImages.length > 1) legendPages.push(pageImages[pageImages.length - 1]);

      for (const legendPage of legendPages) {
        try {
          const dataUrlParts = legendPage.dataUrl.split(",");
          const mimeMatch = dataUrlParts[0]?.match(/data:([^;]+);base64/);
          const pageMime = mimeMatch ? mimeMatch[1] : "image/png";
          const pageBase64 = dataUrlParts[1] || dataUrlParts[0];

          const legendResult = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{
              role: "user",
              parts: [
                { text: legendPrompt },
                { inlineData: { mimeType: pageMime, data: pageBase64 } },
              ],
            }],
            config: { temperature: 0.1, maxOutputTokens: 4096 },
          });

          const legendText = legendResult.text || "";
          let legendParsed: any = null;
          try {
            let jsonStr = legendText.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.split("\n").slice(1).join("\n");
              if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3).trim();
            }
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) legendParsed = JSON.parse(jsonMatch[0]);
          } catch {}

          if (legendParsed?.has_legend) {
            extractedLegend = legendParsed;
            break;
          }
        } catch (legendErr: any) {
          console.error(`Legend extraction error on page ${legendPage.pageNumber}:`, legendErr.message);
        }
      }

      // ── Build legend context string ──
      let legendContext = "";
      if (extractedLegend) {
        if (mode === "electrical" && extractedLegend.legend_entries?.length > 0) {
          const entries = extractedLegend.legend_entries
            .map((e: any) => `  - "${e.drawing_label}" = ${e.standard_type}${e.notes ? ` (${e.notes})` : ""}`)
            .join("\n");
          legendContext = `\nSYMBOL LEGEND EXTRACTED FROM THIS DRAWING SET:\n${entries}\n\nUse this legend to identify symbols. Match each symbol on the page to the legend entries above.\n`;
        } else if (mode === "floor_plan") {
          const parts: string[] = [];
          if (extractedLegend.room_entries?.length > 0) {
            const rooms = extractedLegend.room_entries
              .map((e: any) => `  - ${e.room_name}${e.area_sqft ? ` (${e.area_sqft} sq ft)` : ""}${e.floor_level ? ` [${e.floor_level}]` : ""}`)
              .join("\n");
            parts.push(`ROOM SCHEDULE FROM DRAWING SET:\n${rooms}`);
          }
          if (extractedLegend.abbreviations?.length > 0) {
            const abbrevs = extractedLegend.abbreviations
              .map((a: any) => `  - ${a.abbrev} = ${a.meaning}`)
              .join("\n");
            parts.push(`ABBREVIATIONS FROM LEGEND:\n${abbrevs}`);
          }
          if (parts.length > 0) {
            legendContext = "\n" + parts.join("\n\n") + "\n\nUse this room schedule and abbreviations as ground truth when identifying rooms.\n";
          }
        }
      }

      // ── Build final prompt ──
      const basePrompt = mode === "electrical" ? ELECTRICAL_ANALYSIS_PROMPT : ROOM_DETECTION_PROMPT;
      const prompt = `${dwellingContext}\n${legendContext}\n${basePrompt}`;

      if (sessionId) emitProgress(sessionId, 0, totalPages, "starting");

      const allPageResults: any[] = [];
      for (let i = 0; i < pageImages.length; i++) {
        const page = pageImages[i];
        if (sessionId) emitProgress(sessionId, i + 1, totalPages, "analyzing");
        try {
          const dataUrlParts = page.dataUrl.split(",");
          const mimeMatch = dataUrlParts[0]?.match(/data:([^;]+);base64/);
          const pageMime = mimeMatch ? mimeMatch[1] : "image/png";
          const pageBase64 = dataUrlParts[1] || dataUrlParts[0];

          const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: pageMime, data: pageBase64 } },
                ],
              },
            ],
            config: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          });

          const responseText = result.text || "";
          let parsed: any = null;
          try {
            let jsonStr = responseText.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.split("\n").slice(1).join("\n");
              if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3).trim();
            }
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          } catch {}

          if (parsed) {
            parsed._pageNumber = page.pageNumber;
            allPageResults.push(parsed);
          }
        } catch (pageErr: any) {
          console.error(`Error analyzing page ${page.pageNumber}:`, pageErr.message);
        }
      }

      let finalResults: any;

      if (mode === "floor_plan") {
        const cecDevices = await import("./cec-devices");
        const allRooms: any[] = [];
        let totalSqFt = 0;
        let panelBoardAdded = false;

        for (const pageResult of allPageResults) {
          const floorLevel = pageResult.floor_level || "";
          totalSqFt += pageResult.total_sqft || 0;
          for (const room of (pageResult.rooms || [])) {
            const roomType = room.room_type || "office_den";
            const areaSqFt = room.approx_area_sqft || 0;
            const detectedRoom = {
              room_type: roomType,
              room_name: room.room_name || "Unknown",
              floor_level: room.floor_level || floorLevel,
              approx_area_sqft: areaSqFt,
              has_sink: room.has_sink || false,
              has_bathtub_shower: room.has_bathtub_shower || false,
              wall_count: room.wall_count || 4,
              confidence: room.confidence || 0.9,
              location: room.location || [],
            };
            const unitIdentifier = detectedRoom.room_name.match(/^(Unit\s+[A-Z0-9]+)/i)?.[1] || undefined;
            const roomDwellingCtx: import("./cec-devices").DwellingContext = { dwellingType, hasLegalSuite, unitIdentifier };
            const deviceArr = cecDevices.generateDevicesForRoom(detectedRoom, roomDwellingCtx);
            const deviceList = deviceArr.map(d => ({
              type: d.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              count: d.count,
              confidence: 0.95,
              notes: d.note,
            }));

            if (roomType === "mechanical_room" && !panelBoardAdded) {
              panelBoardAdded = true;
            }

            allRooms.push({
              name: detectedRoom.room_name,
              type: roomType,
              floor: detectedRoom.floor_level || "Main Floor",
              area_sqft: areaSqFt,
              page: pageResult._pageNumber,
              devices: deviceList,
            });
          }
        }

        if (!panelBoardAdded && allRooms.length > 0) {
          const mechRoom = allRooms.find((r: any) => r.type === "mechanical_room");
          const garageRoom = allRooms.find((r: any) => r.type === "garage");
          const utilRoom = allRooms.find((r: any) => r.type === "utility_room");
          const targetRoom = mechRoom || garageRoom || utilRoom || allRooms[0];
          targetRoom.devices.push({
            type: "Panel Board",
            count: 1,
            confidence: 0.95,
            notes: "CEC 26-400 — Main panel board (200A typical residential)",
          });
        }

        const deviceTotals: Record<string, { count: number; rooms: string[]; note: string }> = {};
        for (const room of allRooms) {
          for (const d of room.devices) {
            if (!deviceTotals[d.type]) deviceTotals[d.type] = { count: 0, rooms: [], note: d.notes || "" };
            deviceTotals[d.type].count += d.count;
            if (!deviceTotals[d.type].rooms.includes(room.name)) {
              deviceTotals[d.type].rooms.push(room.name);
            }
          }
        }

        const detectedRoomsForWholeHouse = allRooms.map((r: any) => ({
          room_type: r.type,
          room_name: r.name,
          floor_level: r.floor,
          approx_area_sqft: r.area_sqft || 0,
          has_sink: false,
          has_bathtub_shower: false,
          wall_count: 4,
          confidence: 0.9,
          location: [],
        }));
        const wholeHouseDwellingCtx: import("./cec-devices").DwellingContext = { dwellingType, hasLegalSuite };
        const wholeHouseDeviceArr = cecDevices.generateWholeHouseDevices(detectedRoomsForWholeHouse, wholeHouseDwellingCtx);
        const wholeHouseRoom = {
          name: "DWELLING EXTRAS",
          type: "whole_house",
          floor: "All Floors",
          area_sqft: totalSqFt,
          page: 0,
          devices: wholeHouseDeviceArr.map(d => ({
            type: d.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            count: d.count,
            confidence: 0.95,
            notes: d.note,
          })),
        };
        allRooms.push(wholeHouseRoom);

        for (const d of wholeHouseRoom.devices) {
          if (!deviceTotals[d.type]) deviceTotals[d.type] = { count: 0, rooms: [], note: d.notes || "" };
          deviceTotals[d.type].count += d.count;
          deviceTotals[d.type].rooms.push("Dwelling Extras");
        }

        const allDevices = Object.entries(deviceTotals).map(([type, data]) => ({
          type,
          count: data.count,
          confidence: 0.95,
          room: data.rooms.join(", "),
        }));

        const totalDevices = allDevices.reduce((s, d) => s + d.count, 0);

        finalResults = {
          rooms: allRooms,
          allDevices,
          totalDevices,
          totalSqFt,
          pageCount: pageImages.length,
          pagesAnalyzed: allPageResults.map(p => p._pageNumber),
          notes: `CEC 2021 minimum devices generated: ${totalDevices} total across ${allDevices.length} types.\n\nThese are CODE MINIMUMS per CEC 2021. Most homes exceed these counts. You can edit device counts directly in the review below.`,
          dwellingType,
          hasLegalSuite,
          extractedLegend: extractedLegend || null,
        };
      } else {
        const allRooms: any[] = [];
        for (const pageResult of allPageResults) {
          for (const room of (pageResult.rooms || [])) {
            allRooms.push({
              ...room,
              page: pageResult._pageNumber,
              floor: room.floor || pageResult.floor_level || "Main Floor",
            });
          }
        }

        const deviceTotals: Record<string, { count: number; rooms: string[] }> = {};
        for (const room of allRooms) {
          for (const d of (room.devices || [])) {
            const key = d.type;
            if (!deviceTotals[key]) deviceTotals[key] = { count: 0, rooms: [] };
            deviceTotals[key].count += d.count || 1;
            if (room.name && !deviceTotals[key].rooms.includes(room.name)) {
              deviceTotals[key].rooms.push(room.name);
            }
          }
        }

        const allDevices = Object.entries(deviceTotals).map(([type, data]) => ({
          type,
          count: data.count,
          confidence: 0.9,
          room: data.rooms.join(", "),
        }));

        const totalDevices = allDevices.reduce((s, d) => s + d.count, 0);

        finalResults = {
          rooms: allRooms,
          allDevices,
          totalDevices,
          pageCount: pageImages.length,
          pagesAnalyzed: allPageResults.map(p => p._pageNumber),
          notes: allPageResults.map(p => p.observations || "").filter(Boolean).join("\n"),
          dwellingType,
          hasLegalSuite,
          extractedLegend: extractedLegend || null,
        };
      }

      const analysis = await storage.createAiAnalysis({
        projectId,
        fileName: file.originalname,
        analysisMode: mode,
        results: finalResults,
        status: "completed",
      });

      // Auto-create room panel assignments from analysis results
      if (finalResults?.rooms) {
        for (const room of finalResults.rooms) {
          const panelName = room.panelAssignment || "Main Panel";
          await storage.createRoomPanelAssignment({
            analysisId: analysis.id,
            roomName: room.name || "General",
            panelName,
            isManualOverride: false,
          });
        }
      }

      // Persist uploaded file to disk for later access
      try {
        const uploadsDir = path.join(process.cwd(), "uploads", "ai-analyses");
        fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = path.extname(file.originalname) || ".bin";
        const filePath = path.join(uploadsDir, `${analysis.id}${ext}`);
        fs.writeFileSync(filePath, file.buffer);
      } catch (saveErr: any) {
        console.error("Failed to save analysis file:", saveErr.message);
      }

      if (sessionId) emitDone(sessionId, { id: analysis.id });
      res.json(analysis);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      if (sessionId) emitError(sessionId, err.message || "Analysis failed");
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

      // Accept user-edited counts and assembly overrides from Review step
      const body = req.body || {};
      const editedCounts: Record<string, number> = body.editedCounts || {};
      const assemblyOverrides: Record<string, number> = body.assemblyOverrides || {};

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

      // Build lookup maps
      const assemblyBySymbol = new Map<string, typeof assemblies[number]>();
      const assemblyById = new Map<number, typeof assemblies[number]>();
      for (const a of assemblies) {
        if (a.symbolType) {
          assemblyBySymbol.set(a.symbolType, a);
        }
        assemblyById.set(a.id, a);
      }

      // Fetch panel assignments for this analysis
      const panelAssignments = await storage.getRoomPanelAssignments(id);
      const panelMap = new Map<string, string>();
      for (const pa of panelAssignments) {
        panelMap.set(pa.roomName, pa.panelName);
      }

      // Wire distance from panel by room type (feet)
      const WIRE_DISTANCE_MAP: Record<string, number> = {
        mechanical_room: 10, garage: 15, utility_room: 15,
        laundry_room: 20, kitchen: 30, mudroom: 20,
        entry_foyer: 25, hallway: 25, powder_room: 25,
        bathroom: 35, living_room: 35, family_room: 35,
        dining_room: 30, office_den: 30, pantry: 25,
        closet_walkin: 30, closet_standard: 30,
        primary_bedroom: 45, bedroom: 40,
        basement_finished: 40, basement_unfinished: 30,
        stairway: 25, deck: 35, patio: 35, sunroom: 35,
      };

      // Aggregate devices: key = "symbolType|room" → { count, assembly }
      const aggregated = new Map<string, {
        symbolType: string;
        room: string;
        roomType: string;
        count: number;
        assembly: typeof assemblies[number] | undefined;
      }>();

      let itemsCreated = 0;
      for (let roomIdx = 0; roomIdx < results.rooms.length; roomIdx++) {
        const room = results.rooms[roomIdx];
        const roomName = room.name || "General";
        const roomType = room.type || "bedroom";

        for (let devIdx = 0; devIdx < (room.devices || []).length; devIdx++) {
          const device = room.devices[devIdx];
          const symbolType = device.type || "unknown";
          const editKey = `${roomIdx}-${devIdx}`;

          // Use edited count if provided, otherwise original AI count
          const count = editedCounts[editKey] !== undefined
            ? editedCounts[editKey]
            : (device.count || 1);

          // Skip zeroed-out devices
          if (count <= 0) continue;

          const key = `${symbolType}|${roomName}`;

          const existing = aggregated.get(key);
          if (existing) {
            existing.count += count;
          } else {
            let matched: typeof assemblies[number] | undefined;

            // Check for assembly override first
            if (assemblyOverrides[editKey] !== undefined) {
              matched = assemblyById.get(assemblyOverrides[editKey]);
            }

            // Direct lookup by symbolType
            if (!matched) {
              matched = assemblyBySymbol.get(symbolType);
            }

            // Fallback: fuzzy name match if no symbolType match
            if (!matched) {
              const normalizedType = symbolType.toLowerCase().replace(/_/g, " ");
              matched = assemblies.find(a =>
                a.name.toLowerCase().includes(normalizedType) ||
                normalizedType.includes(a.name.toLowerCase().split("(")[0].trim())
              );
            }

            aggregated.set(key, {
              symbolType,
              room: roomName,
              roomType,
              count,
              assembly: matched,
            });
          }
        }
      }

      // Create estimate items from aggregated data
      for (const item of Array.from(aggregated.values())) {
        const baseWireDistance = WIRE_DISTANCE_MAP[item.roomType] || 30;
        const assembly = item.assembly;

        const estimatedWireFootage = assembly?.wireFootage
          ? Math.max(assembly.wireFootage, baseWireDistance)
          : baseWireDistance;

        await storage.createEstimateItem({
          estimateId: estimate.id,
          deviceType: assembly?.name || item.symbolType,
          description: assembly?.device || item.symbolType.replace(/_/g, " "),
          room: item.room,
          quantity: item.count,
          materialCost: assembly?.materialCost || 0,
          laborHours: assembly?.laborHours || 0.25,
          wireType: assembly?.wireType || "14/2 NMD-90",
          wireFootage: estimatedWireFootage,
          markupPct: 0,
          boxType: assembly?.boxType || null,
          coverPlate: assembly?.coverPlate || null,
          panelName: panelMap.get(item.room) || "Main Panel",
          assemblyId: assembly?.id || null,
        });
        itemsCreated++;
      }

      await storage.updateAiAnalysis(id, { status: "estimated" });

      res.json({ estimateId: estimate.id, itemsCreated, message: "Estimate generated" });
    } catch (err: any) {
      console.error("Generate estimate error:", err);
      res.status(500).json({ message: err.message || "Failed to generate estimate" });
    }
  });

  // Re-analyze an existing analysis with a different mode
  app.post("/api/ai-analyses/:id/re-analyze", async (req, res) => {
    const reSessionId = (req.body?.sessionId as string) || null;
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid analysis ID" });

      const analysis = await storage.getAiAnalysis(id);
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });

      const mode = req.body?.mode;
      if (!mode || !["electrical", "floor_plan"].includes(mode)) {
        return res.status(400).json({ message: "mode must be 'electrical' or 'floor_plan'" });
      }

      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Gemini API key not configured" });

      // Find saved file on disk
      const uploadsDir = path.join(process.cwd(), "uploads", "ai-analyses");
      const possibleExts = [".pdf", ".png", ".jpg", ".jpeg", ".bin"];
      let filePath: string | null = null;
      let fileBuffer: Buffer | null = null;
      for (const ext of possibleExts) {
        const candidate = path.join(uploadsDir, `${id}${ext}`);
        if (fs.existsSync(candidate)) {
          filePath = candidate;
          fileBuffer = fs.readFileSync(candidate);
          break;
        }
      }
      if (!filePath || !fileBuffer) {
        return res.status(404).json({ message: "Original file not found on disk. Please re-upload." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Determine if it's a PDF or image
      const ext = path.extname(filePath).toLowerCase();
      const isPdf = ext === ".pdf";
      let mimeType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".pdf") mimeType = "application/pdf";

      // For simplicity, re-analyze sends the whole file as a single image
      const imageData = fileBuffer.toString("base64");
      const pageImages = [{ pageNumber: 1, dataUrl: `data:${mimeType};base64,${imageData}` }];

      // ── Dwelling context from stored results ──
      const storedResults = analysis.results as any;
      const dwellingType = storedResults?.dwellingType || "single";
      const hasLegalSuite = storedResults?.hasLegalSuite || false;
      const dwellingContext = buildDwellingContext(dwellingType, hasLegalSuite);

      const totalPages = pageImages.length;

      // ── Legend extraction (re-extract on re-analyze) ──
      if (reSessionId) emitProgress(reSessionId, 0, totalPages, "extracting_legend");

      const legendPrompt = mode === "electrical"
        ? ELECTRICAL_LEGEND_EXTRACTION_PROMPT
        : ROOM_LEGEND_EXTRACTION_PROMPT;

      let extractedLegend: any = storedResults?.extractedLegend || null;

      // Only re-extract if we don't have one stored
      if (!extractedLegend) {
        for (const legendPage of pageImages) {
          try {
            const dataUrlParts = legendPage.dataUrl.split(",");
            const mimeMatch = dataUrlParts[0]?.match(/data:([^;]+);base64/);
            const pageMime = mimeMatch ? mimeMatch[1] : "image/png";
            const pageBase64 = dataUrlParts[1] || dataUrlParts[0];

            const legendResult = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: [{
                role: "user",
                parts: [
                  { text: legendPrompt },
                  { inlineData: { mimeType: pageMime, data: pageBase64 } },
                ],
              }],
              config: { temperature: 0.1, maxOutputTokens: 4096 },
            });

            const legendText = legendResult.text || "";
            let legendParsed: any = null;
            try {
              let jsonStr = legendText.trim();
              if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.split("\n").slice(1).join("\n");
                if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3).trim();
              }
              const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
              if (jsonMatch) legendParsed = JSON.parse(jsonMatch[0]);
            } catch {}

            if (legendParsed?.has_legend) {
              extractedLegend = legendParsed;
              break;
            }
          } catch {}
        }
      }

      // ── Build legend context ──
      let legendContext = "";
      if (extractedLegend) {
        if (mode === "electrical" && extractedLegend.legend_entries?.length > 0) {
          const entries = extractedLegend.legend_entries
            .map((e: any) => `  - "${e.drawing_label}" = ${e.standard_type}${e.notes ? ` (${e.notes})` : ""}`)
            .join("\n");
          legendContext = `\nSYMBOL LEGEND EXTRACTED FROM THIS DRAWING SET:\n${entries}\n\nUse this legend to identify symbols.\n`;
        } else if (mode === "floor_plan") {
          const parts: string[] = [];
          if (extractedLegend.room_entries?.length > 0) {
            const rooms = extractedLegend.room_entries
              .map((e: any) => `  - ${e.room_name}${e.area_sqft ? ` (${e.area_sqft} sq ft)` : ""}${e.floor_level ? ` [${e.floor_level}]` : ""}`)
              .join("\n");
            parts.push(`ROOM SCHEDULE FROM DRAWING SET:\n${rooms}`);
          }
          if (extractedLegend.abbreviations?.length > 0) {
            const abbrevs = extractedLegend.abbreviations
              .map((a: any) => `  - ${a.abbrev} = ${a.meaning}`)
              .join("\n");
            parts.push(`ABBREVIATIONS FROM LEGEND:\n${abbrevs}`);
          }
          if (parts.length > 0) {
            legendContext = "\n" + parts.join("\n\n") + "\n\nUse this room schedule and abbreviations as ground truth.\n";
          }
        }
      }

      const basePrompt = mode === "electrical" ? ELECTRICAL_ANALYSIS_PROMPT : ROOM_DETECTION_PROMPT;
      const prompt = `${dwellingContext}\n${legendContext}\n${basePrompt}`;

      if (reSessionId) emitProgress(reSessionId, 0, totalPages, "starting");

      const allPageResults: any[] = [];
      for (let i = 0; i < pageImages.length; i++) {
        const page = pageImages[i];
        if (reSessionId) emitProgress(reSessionId, i + 1, totalPages, "analyzing");
        try {
          const dataUrlParts = page.dataUrl.split(",");
          const mimeMatch = dataUrlParts[0]?.match(/data:([^;]+);base64/);
          const pageMime = mimeMatch ? mimeMatch[1] : "image/png";
          const pageBase64 = dataUrlParts[1] || dataUrlParts[0];

          const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: pageMime, data: pageBase64 } },
                ],
              },
            ],
            config: { temperature: 0.1, maxOutputTokens: 8192 },
          });

          const responseText = result.text || "";
          let parsed: any = null;
          try {
            let jsonStr = responseText.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.split("\n").slice(1).join("\n");
              if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3).trim();
            }
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          } catch {}

          if (parsed) {
            parsed._pageNumber = page.pageNumber;
            allPageResults.push(parsed);
          }
        } catch (pageErr: any) {
          console.error(`Re-analyze page ${page.pageNumber} error:`, pageErr.message);
        }
      }

      let finalResults: any;
      if (mode === "floor_plan") {
        const cecDevices = await import("./cec-devices");
        const allRooms: any[] = [];
        let totalSqFt = 0;
        let panelBoardAdded = false;

        for (const pageResult of allPageResults) {
          const floorLevel = pageResult.floor_level || "";
          totalSqFt += pageResult.total_sqft || 0;
          for (const room of (pageResult.rooms || [])) {
            const roomType = room.room_type || "office_den";
            const areaSqFt = room.approx_area_sqft || 0;
            const detectedRoom = {
              room_type: roomType, room_name: room.room_name || "Unknown",
              floor_level: room.floor_level || floorLevel, approx_area_sqft: areaSqFt,
              has_sink: room.has_sink || false, has_bathtub_shower: room.has_bathtub_shower || false,
              wall_count: room.wall_count || 4, confidence: room.confidence || 0.9, location: room.location || [],
            };
            const reUnitId = detectedRoom.room_name.match(/^(Unit\s+[A-Z0-9]+)/i)?.[1] || undefined;
            const reRoomDwellingCtx: import("./cec-devices").DwellingContext = { dwellingType, hasLegalSuite, unitIdentifier: reUnitId };
            const deviceArr = cecDevices.generateDevicesForRoom(detectedRoom, reRoomDwellingCtx);
            const deviceList = deviceArr.map(d => ({
              type: d.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              count: d.count, confidence: 0.95, notes: d.note,
            }));
            if (roomType === "mechanical_room" && !panelBoardAdded) panelBoardAdded = true;
            allRooms.push({ name: detectedRoom.room_name, type: roomType, floor: detectedRoom.floor_level || "Main Floor", area_sqft: areaSqFt, page: pageResult._pageNumber, devices: deviceList });
          }
        }
        if (!panelBoardAdded && allRooms.length > 0) {
          const targetRoom = allRooms.find((r: any) => r.type === "mechanical_room") || allRooms.find((r: any) => r.type === "garage") || allRooms.find((r: any) => r.type === "utility_room") || allRooms[0];
          targetRoom.devices.push({ type: "Panel Board", count: 1, confidence: 0.95, notes: "CEC 26-400 — Main panel board (200A typical residential)" });
        }
        const deviceTotals: Record<string, { count: number; rooms: string[]; note: string }> = {};
        for (const room of allRooms) {
          for (const d of room.devices) {
            if (!deviceTotals[d.type]) deviceTotals[d.type] = { count: 0, rooms: [], note: d.notes || "" };
            deviceTotals[d.type].count += d.count;
            if (!deviceTotals[d.type].rooms.includes(room.name)) deviceTotals[d.type].rooms.push(room.name);
          }
        }
        const detectedRoomsForWholeHouse = allRooms.map((r: any) => ({
          room_type: r.type, room_name: r.name, floor_level: r.floor, approx_area_sqft: r.area_sqft || 0,
          has_sink: false, has_bathtub_shower: false, wall_count: 4, confidence: 0.9, location: [],
        }));
        const reWholeHouseCtx: import("./cec-devices").DwellingContext = { dwellingType, hasLegalSuite };
        const wholeHouseDeviceArr = cecDevices.generateWholeHouseDevices(detectedRoomsForWholeHouse, reWholeHouseCtx);
        const wholeHouseRoom = {
          name: "DWELLING EXTRAS", type: "whole_house", floor: "All Floors", area_sqft: totalSqFt, page: 0,
          devices: wholeHouseDeviceArr.map(d => ({ type: d.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), count: d.count, confidence: 0.95, notes: d.note })),
        };
        allRooms.push(wholeHouseRoom);
        for (const d of wholeHouseRoom.devices) {
          if (!deviceTotals[d.type]) deviceTotals[d.type] = { count: 0, rooms: [], note: d.notes || "" };
          deviceTotals[d.type].count += d.count;
          deviceTotals[d.type].rooms.push("Dwelling Extras");
        }
        const allDevices = Object.entries(deviceTotals).map(([type, data]) => ({ type, count: data.count, confidence: 0.95, room: data.rooms.join(", ") }));
        const totalDevices = allDevices.reduce((s, d) => s + d.count, 0);
        finalResults = { rooms: allRooms, allDevices, totalDevices, totalSqFt, pageCount: pageImages.length, pagesAnalyzed: allPageResults.map(p => p._pageNumber), notes: `CEC 2021 minimum devices generated: ${totalDevices} total across ${allDevices.length} types.\n\nThese are CODE MINIMUMS per CEC 2021.`, dwellingType, hasLegalSuite, extractedLegend: extractedLegend || null };
      } else {
        const allRooms: any[] = [];
        for (const pageResult of allPageResults) {
          for (const room of (pageResult.rooms || [])) {
            allRooms.push({ ...room, page: pageResult._pageNumber, floor: room.floor || pageResult.floor_level || "Main Floor" });
          }
        }
        const deviceTotals: Record<string, { count: number; rooms: string[] }> = {};
        for (const room of allRooms) {
          for (const d of (room.devices || [])) {
            const key = d.type;
            if (!deviceTotals[key]) deviceTotals[key] = { count: 0, rooms: [] };
            deviceTotals[key].count += d.count || 1;
            if (room.name && !deviceTotals[key].rooms.includes(room.name)) deviceTotals[key].rooms.push(room.name);
          }
        }
        const allDevices = Object.entries(deviceTotals).map(([type, data]) => ({ type, count: data.count, confidence: 0.9, room: data.rooms.join(", ") }));
        const totalDevices = allDevices.reduce((s, d) => s + d.count, 0);
        finalResults = { rooms: allRooms, allDevices, totalDevices, pageCount: pageImages.length, pagesAnalyzed: allPageResults.map(p => p._pageNumber), notes: allPageResults.map(p => p.observations || "").filter(Boolean).join("\n"), dwellingType, hasLegalSuite, extractedLegend: extractedLegend || null };
      }

      const updated = await storage.updateAiAnalysis(id, {
        analysisMode: mode,
        results: finalResults,
        status: "completed",
      });

      // Re-create room panel assignments
      await storage.deleteRoomPanelAssignments(id);
      if (finalResults?.rooms) {
        for (const room of finalResults.rooms) {
          const panelName = room.panelAssignment || "Main Panel";
          await storage.createRoomPanelAssignment({
            analysisId: id,
            roomName: room.name || "General",
            panelName,
            isManualOverride: false,
          });
        }
      }

      if (reSessionId) emitDone(reSessionId, { id });
      res.json(updated);
    } catch (err: any) {
      console.error("Re-analyze error:", err);
      if (reSessionId) emitError(reSessionId, err.message || "Re-analysis failed");
      res.status(500).json({ message: err.message || "Re-analysis failed" });
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

      const prompt = `Analyze this supplier price list/catalog document using vision. Categorize EVERY product into "material", "wire", or "part" type.

WIRE items include: NMD-90 cables, TECK cables, armoured cables, Romex, any wire/cable sold by length (per foot, per metre, per roll/spool).
MATERIAL items include: Complete device assemblies (receptacles with box+cover, switches with box+cover, complete light fixtures, panels).
PART items include: Individual components sold separately - boxes, cover plates, connectors, wire nuts, breakers, mounting hardware, ground pigtails, gaskets. These are components that make up a complete assembly.

For WIRE items, extract:
- itemType: "wire"
- name: wire type name (e.g., "14/2 NMD-90", "12/3 NMD-90", "10/2 NMD-90")
- costPerFoot: price per foot (convert from per-roll, per-metre, or per-spool pricing)
- supplier: "${supplierName}"
- partNumber: supplier part number if available
- description: any additional details (roll size, colour, etc.)

For MATERIAL items (complete assemblies), extract:
- itemType: "material"
- name: device/product name (e.g., "Duplex Receptacle (15A)")
- materialCost: unit price
- supplier: "${supplierName}"
- partNumber: supplier part number if available
- category: one of: receptacles, switches, lighting, safety, data_comm, specialty, service
- description: brief description

For PART items (individual components), extract:
- itemType: "part"
- name: part name (e.g., "Single-gang device box, NM", "Single-gang duplex cover", "Wire nuts (bag of 100)")
- unitCost: unit price
- supplier: "${supplierName}"
- partNumber: supplier part number if available
- category: one of: box, cover_plate, device, connector, wire_nut, mounting, misc, breaker, panel_component
- description: brief description

Return ONLY valid JSON:
{
  "items": [
    { "itemType": "material", "name": "Duplex Receptacle (15A)", "materialCost": 8.50, "supplier": "${supplierName}", "partNumber": "XYZ789", "category": "receptacles", "description": "15A TR duplex receptacle, white" },
    { "itemType": "wire", "name": "14/2 NMD-90", "costPerFoot": 0.45, "supplier": "${supplierName}", "partNumber": "ABC123", "description": "75m roll" },
    { "itemType": "part", "name": "Single-gang device box, NM", "unitCost": 1.25, "supplier": "${supplierName}", "partNumber": "DEF456", "category": "box", "description": "PVC single gang box" }
  ],
  "notes": "any observations about the document"
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

        if (item.itemType === "wire") {
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
        } else if (item.itemType === "part") {
          // Upsert into parts catalog
          const existingParts = await storage.searchParts(item.name);
          const match = existingParts.find(p => p.name === item.name);
          if (match) {
            await storage.updatePart(match.id, {
              unitCost: parseFloat(item.unitCost) || match.unitCost,
              supplier: item.supplier || importRecord.supplierName,
              partNumber: item.partNumber || match.partNumber,
            });
          } else {
            await storage.createPart({
              name: item.name,
              category: item.category || "misc",
              unitCost: parseFloat(item.unitCost) || 0,
              supplier: item.supplier || importRecord.supplierName,
              partNumber: item.partNumber || null,
              description: item.description || null,
              isActive: true,
            });
          }
          count++;
        } else {
          // Default: material (complete assembly)
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

    // Wire cost from wire_types catalog
    const wireTypesAll = await storage.getWireTypes();
    const wireCostMap = new Map(wireTypesAll.map(w => [w.name, w.costPerFoot]));
    const totalWireCost = items.reduce((sum, item) => {
      const costPerFt = wireCostMap.get(item.wireType || "") || 0;
      return sum + item.quantity * item.wireFootage * costPerFt;
    }, 0);

    const serviceMaterialCost = services.reduce((sum, s) => sum + s.materialCost, 0);
    const serviceLaborHours = services.reduce((sum, s) => sum + s.laborHours, 0);
    const serviceLaborCost = serviceLaborHours * estimate.laborRate;

    const combinedMaterialCost = totalMaterialCost + totalWireCost + serviceMaterialCost;
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
        name: settingsMap.companyName || "",
        phone: settingsMap.companyPhone || "",
        email: settingsMap.companyEmail || "",
        logoData: settingsMap.companyLogoData || null,
      },
      project: project ? { name: project.name, clientName: project.clientName, clientEmail: project.clientEmail, clientPhone: project.clientPhone, address: project.address } : null,
      estimate: { name: estimate.name, date: estimate.createdAt },
      lineItems: items.map(item => {
        const wireCostPerItem = item.wireFootage * (wireCostMap.get(item.wireType || "") || 0);
        const unitPrice = item.materialCost + wireCostPerItem + item.laborHours * estimate.laborRate;
        return {
          deviceType: item.deviceType,
          description: item.description,
          room: item.room,
          quantity: item.quantity,
          unitPrice,
          total: item.quantity * unitPrice,
        };
      }),
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

      // Wire cost from wire_types catalog
      const wireTypesAll = await storage.getWireTypes();
      const wireCostMap = new Map(wireTypesAll.map(w => [w.name, w.costPerFoot]));
      const totalWireCost = items.reduce((sum, item) => {
        const costPerFt = wireCostMap.get(item.wireType || "") || 0;
        return sum + item.quantity * item.wireFootage * costPerFt;
      }, 0);

      const serviceMaterialCost = services.reduce((sum, s) => sum + s.materialCost, 0);
      const serviceLaborHours = services.reduce((sum, s) => sum + s.laborHours, 0);
      const serviceLaborCost = serviceLaborHours * estimate.laborRate;

      const combinedMaterialCost = totalMaterialCost + totalWireCost + serviceMaterialCost;
      const combinedLaborCost = totalLaborCost + serviceLaborCost;
      const materialWithMarkup = combinedMaterialCost * (1 + estimate.materialMarkupPct / 100);
      const laborWithMarkup = combinedLaborCost * (1 + estimate.laborMarkupPct / 100);
      const subtotal = materialWithMarkup + laborWithMarkup;
      const overhead = subtotal * (estimate.overheadPct / 100);
      const subtotalWithOverhead = subtotal + overhead;
      const profit = subtotalWithOverhead * (estimate.profitPct / 100);
      let permitFeeAmount = 0;
      if (estimate.includePermit && estimate.permitFee) {
        permitFeeAmount = estimate.permitFee;
      }
      const grandTotal = subtotalWithOverhead + profit + permitFeeAmount;

      const taxRate = parseFloat(sm.gstRate || "5");
      const taxLabel = sm.gstLabel || `GST ${taxRate}%`;
      const taxAmount = (subtotalWithOverhead + profit) * (taxRate / 100);
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

      // Add permit fee as a line item if included
      if (permitFeeAmount > 0) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: "Electrical Permit",
          room: null,
          quantity: 1,
          unitPrice: permitFeeAmount,
          total: permitFeeAmount,
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
        name: sm.companyName || "",
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

  // ─── Permit Fee Schedules ───
  app.get("/api/permit-fee-schedules", async (_req, res) => {
    const schedules = await storage.getPermitFeeSchedules();
    res.json(schedules);
  });

  app.get("/api/permit-fee-schedules/active", async (_req, res) => {
    const schedule = await storage.getActivePermitFeeSchedule();
    if (!schedule) return res.status(404).json({ message: "No active permit fee schedule" });
    res.json(schedule);
  });

  app.patch("/api/permit-fee-schedules/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid schedule ID" });
    const schedule = await storage.updatePermitFeeSchedule(id, req.body);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });
    res.json(schedule);
  });

  // Calculate permit fee for an estimate
  app.get("/api/estimates/:id/permit-fee", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid estimate ID" });

    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    // If there's a manual override, use that
    if (estimate.permitFeeOverride !== null && estimate.permitFeeOverride !== undefined) {
      return res.json({ fee: estimate.permitFeeOverride, category: "manual_override", label: "Manual Override" });
    }

    const schedule = await storage.getActivePermitFeeSchedule();
    if (!schedule) return res.json({ fee: 0, category: "none", label: "No active fee schedule" });

    const rates = schedule.rates as any;

    // Get the project to check dwelling type
    const project = await storage.getProject(estimate.projectId);
    const dwellingType = project?.dwellingType || "single";
    const jobType = estimate.jobType || "new_construction";
    const panelAmps = estimate.panelSize || 200;

    let fee = 0;
    let category = "";
    let label = "";

    // Determine which rate table to use
    const isServiceUpgrade = jobType === "service_repair" || jobType === "renovation";
    const isSingleFamily = dwellingType === "single";

    if (isSingleFamily && !isServiceUpgrade && rates.residential_service) {
      category = "residential_service";
      const bracket = rates.residential_service.find((r: any) => panelAmps <= r.maxAmps);
      if (bracket) {
        fee = bracket.fee;
        label = `Single Family - ${bracket.label}`;
      }
    } else if (isServiceUpgrade && rates.service_upgrade) {
      category = "service_upgrade";
      const bracket = rates.service_upgrade.find((r: any) => panelAmps <= r.maxAmps);
      if (bracket) {
        fee = bracket.fee;
        label = `Service Upgrade - ${bracket.label}`;
      }
    } else if (rates.other) {
      category = "other";
      // Calculate estimate total for value-based lookup
      const items = await storage.getEstimateItems(id);
      const services = await storage.getEstimateServices(id);
      const wireTypesAll = await storage.getWireTypes();
      const wireCostMap = new Map(wireTypesAll.map(w => [w.name, w.costPerFoot]));

      let materialTotal = 0;
      let laborTotal = 0;
      let wireTotal = 0;
      for (const item of items) {
        materialTotal += (item.materialCost || 0) * (item.quantity || 1);
        laborTotal += (item.laborHours || 0) * (item.quantity || 1) * (estimate.laborRate || 90);
        const wireCost = wireCostMap.get(item.wireType || "") || 0;
        wireTotal += wireCost * (item.wireFootage || 0) * (item.quantity || 1);
      }
      let svcMaterial = 0;
      let svcLabor = 0;
      for (const svc of services) {
        svcMaterial += svc.materialCost || 0;
        svcLabor += (svc.laborHours || 0) * (estimate.laborRate || 90);
      }
      const estimateTotal = materialTotal + laborTotal + wireTotal + svcMaterial + svcLabor;
      const bracket = rates.other.find((r: any) => estimateTotal <= r.maxValue);
      if (bracket) {
        fee = bracket.fee;
        label = `Other - ${bracket.label}`;
      } else {
        // Over $200K — use last bracket
        const lastBracket = rates.other[rates.other.length - 1];
        fee = lastBracket?.fee || 0;
        label = `Other - Over ${lastBracket?.label || "$200K"}`;
      }
    }

    // Save calculated fee to estimate
    await storage.updateEstimate(id, { permitFee: fee });

    res.json({ fee, category, label, scheduleName: schedule.name });
  });

  // ─── Google Drive OAuth ───
  const pendingOAuthStates = new Set<string>();

  app.get("/api/google-drive/auth", (req, res) => {
    if (!isGoogleDriveOAuthAvailable()) {
      return res.status(503).json({ message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set in .env" });
    }
    const state = crypto.randomUUID();
    pendingOAuthStates.add(state);
    setTimeout(() => pendingOAuthStates.delete(state), 300_000); // expire after 5 min

    const redirectUri = `${req.protocol}://${req.get("host")}/api/google-drive/callback`;
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
      redirect_uri: redirectUri,
    });

    res.redirect(authUrl);
  });

  app.get("/api/google-drive/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!state || !pendingOAuthStates.has(state as string)) {
      return res.status(403).send("Invalid OAuth state. Please try again from Settings.");
    }
    pendingOAuthStates.delete(state as string);

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/google-drive/callback`;
      const oauth2Client = getOAuth2Client();

      const { tokens } = await oauth2Client.getToken({ code: code as string, redirect_uri: redirectUri });

      // Store tokens in settings table
      if (tokens.access_token) {
        await storage.upsertSetting("googleDriveAccessToken", tokens.access_token);
      }
      if (tokens.refresh_token) {
        await storage.upsertSetting("googleDriveRefreshToken", tokens.refresh_token);
      }
      if (tokens.expiry_date) {
        await storage.upsertSetting("googleDriveTokenExpiry", String(tokens.expiry_date));
      }

      // Fetch and store the connected email
      oauth2Client.setCredentials(tokens);
      try {
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email) {
          await storage.upsertSetting("googleDriveEmail", userInfo.data.email);
        }
      } catch { /* email fetch is best-effort */ }

      // Invalidate cached client so it re-reads tokens
      invalidateClient();

      // Set storage provider to google_drive
      await storage.upsertSetting("photoStorageProvider", "google_drive");

      // Redirect back to settings page
      res.redirect("/settings?tab=photos");
    } catch (err: any) {
      console.error("Google Drive OAuth callback error:", err);
      res.status(500).send("Google Drive authorization failed. Please try again.");
    }
  });

  app.post("/api/google-drive/disconnect", async (_req, res) => {
    try {
      const settingsRows = await storage.getSettings();
      const sm: Record<string, string> = {};
      settingsRows.forEach(s => { sm[s.key] = s.value; });

      // Revoke token at Google (best-effort)
      if (sm.googleDriveRefreshToken) {
        try {
          const oauth2Client = getOAuth2Client();
          await oauth2Client.revokeToken(sm.googleDriveRefreshToken);
        } catch { /* best-effort */ }
      }

      // Clear all Google Drive settings
      await storage.upsertSetting("googleDriveAccessToken", "");
      await storage.upsertSetting("googleDriveRefreshToken", "");
      await storage.upsertSetting("googleDriveTokenExpiry", "");
      await storage.upsertSetting("googleDriveEmail", "");
      await storage.upsertSetting("googleDriveRootFolderId", "");

      invalidateClient();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Project Photos ───
  app.get("/api/r2-status", async (_req, res) => {
    const gdConfigured = await isGoogleDriveConfigured();
    const settingsRows = await storage.getSettings();
    const sm: Record<string, string> = {};
    settingsRows.forEach(s => { sm[s.key] = s.value; });

    res.json({
      configured: isR2Configured() || gdConfigured,
      provider: isR2Configured() ? "r2" : gdConfigured ? "google_drive" : null,
      r2: isR2Configured(),
      googleDrive: gdConfigured,
      googleDriveOAuthAvailable: isGoogleDriveOAuthAvailable(),
      googleDriveEmail: sm.googleDriveEmail || null,
    });
  });

  app.get("/api/projects/:id/photos", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const phase = req.query.phase as string | undefined;
    const photos = await storage.getProjectPhotos(id, phase);
    // Fetch employee names for uploaded-by display
    const employeeIds = Array.from(new Set(photos.filter(p => p.employeeId).map(p => p.employeeId!)));
    const employeeMap = new Map<number, string>();
    for (const eid of employeeIds) {
      const emp = await storage.getEmployee(eid);
      if (emp) employeeMap.set(eid, emp.name);
    }
    // Generate download URLs for each photo (R2 or Google Drive)
    const photosWithUrls = await Promise.all(photos.map(async (photo) => {
      let url: string | null = null;
      if (photo.storageKey.startsWith("gdrive:")) {
        const fileId = photo.storageKey.replace("gdrive:", "");
        url = await getGoogleDriveDownloadUrl(fileId);
      } else {
        url = await getDownloadUrl(photo.storageKey);
      }
      return {
        ...photo,
        downloadUrl: url,
        uploadedBy: photo.employeeId ? (employeeMap.get(photo.employeeId) || "Employee") : "Owner",
      };
    }));
    res.json(photosWithUrls);
  });

  // Get presigned upload URL for a photo (R2) or upload directly (Google Drive)
  app.post("/api/projects/:id/photos/upload-url", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    if (!isR2Configured() && !(await isGoogleDriveConfigured())) {
      return res.status(503).json({ message: "Photo storage not configured. Set up Cloudflare R2 or Google Drive in Settings > Photos." });
    }
    const { filename, contentType, phase, employeeId, caption, gpsLat, gpsLng } = req.body;
    if (!filename || !contentType || !phase) {
      return res.status(400).json({ message: "filename, contentType, and phase are required" });
    }

    if (isR2Configured()) {
      // R2 path: return presigned upload URL
      const storageKey = buildStorageKey(id, phase, filename);
      const uploadUrl = await getUploadUrl(storageKey, contentType);
      if (!uploadUrl) return res.status(500).json({ message: "Failed to generate upload URL" });
      const photo = await storage.createProjectPhoto({
        projectId: id,
        employeeId: employeeId || null,
        inspectionPhase: phase,
        storageKey,
        originalFilename: filename,
        mimeType: contentType,
        fileSize: null,
        caption: caption || null,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
      });
      res.status(201).json({ photo, uploadUrl, provider: "r2" });
    } else {
      // Google Drive path: create folder structure, return info for direct upload
      const project = await storage.getProject(id);
      const projectName = project?.name || `Project-${id}`;
      const folderIds = await getProjectFolderIds(projectName);
      if (!folderIds) return res.status(500).json({ message: "Failed to create Google Drive folders" });
      const folderKey = phaseFolderKey(phase);
      const folderId = folderIds[folderKey] || folderIds.project;
      // Store the Google Drive folder ID as the storage key so we can upload later
      const storageKey = `gdrive:${folderId}:${Date.now()}-${filename}`;
      const photo = await storage.createProjectPhoto({
        projectId: id,
        employeeId: employeeId || null,
        inspectionPhase: phase,
        storageKey,
        originalFilename: filename,
        mimeType: contentType,
        fileSize: null,
        caption: caption || null,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
      });
      res.status(201).json({ photo, folderId, provider: "google_drive" });
    }
  });

  // Direct upload for Google Drive (file sent as multipart)
  app.post("/api/projects/:id/photos/upload-gdrive", upload.single("file"), async (req, res) => {
    const id = parseId(req.params.id as string);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    if (!(await isGoogleDriveConfigured())) return res.status(503).json({ message: "Google Drive not configured" });

    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file provided" });
    const { phase, employeeId, caption, gpsLat, gpsLng } = req.body;
    if (!phase) return res.status(400).json({ message: "phase is required" });

    const project = await storage.getProject(id);
    const projectName = project?.name || `Project-${id}`;
    const folderIds = await getProjectFolderIds(projectName);
    if (!folderIds) return res.status(500).json({ message: "Failed to create Google Drive folders" });

    const folderKey = phaseFolderKey(phase);
    const folderId = folderIds[folderKey] || folderIds.project;

    const result = await uploadToGoogleDrive(folderId, file.originalname, file.mimetype, file.buffer);
    if (!result) return res.status(500).json({ message: "Failed to upload to Google Drive" });

    const storageKey = `gdrive:${result.fileId}`;
    const photo = await storage.createProjectPhoto({
      projectId: id,
      employeeId: employeeId ? parseInt(employeeId) : null,
      inspectionPhase: phase,
      storageKey,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      caption: caption || null,
      gpsLat: gpsLat ? parseFloat(gpsLat) : null,
      gpsLng: gpsLng ? parseFloat(gpsLng) : null,
    });

    res.status(201).json({ photo, provider: "google_drive" });
  });

  // Delete photo (supports both URL patterns from frontend)
  const handlePhotoDelete = async (req: any, res: any) => {
    const photoId = parseId(req.params.photoId || req.params.id);
    if (!photoId) return res.status(400).json({ message: "Invalid photo ID" });
    // Get photo's storage key for cleanup
    const projectId = parseId(req.params.projectId);
    if (projectId) {
      const photos = await storage.getProjectPhotos(projectId);
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        try {
          if (photo.storageKey.startsWith("gdrive:")) {
            const fileId = photo.storageKey.replace("gdrive:", "");
            await deleteFromGoogleDrive(fileId);
          }
        } catch { /* best-effort cleanup */ }
      }
    }
    await storage.deleteProjectPhoto(photoId);
    res.status(204).send();
  };
  app.delete("/api/projects/:projectId/photos/:photoId", handlePhotoDelete);
  app.delete("/api/project-photos/:id", handlePhotoDelete);

  // ─── Project Photo Folders (Google Drive) ───
  app.get("/api/projects/:id/photo-folder", async (req, res) => {
    const id = parseId(req.params.id as string);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });

    const project = await storage.getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const gdConfigured = await isGoogleDriveConfigured();
    if (!gdConfigured) return res.json({ exists: false, provider: null });

    const exists = await hasProjectFolder(project.name);
    res.json({ exists, provider: "google_drive" });
  });

  app.post("/api/projects/:id/photo-folder", async (req, res) => {
    const id = parseId(req.params.id as string);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });

    const project = await storage.getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const folderIds = await getProjectFolderIds(project.name);
    if (!folderIds) return res.status(500).json({ message: "Failed to create folder structure" });

    res.json({ success: true, folderIds });
  });

  app.delete("/api/projects/:id/photo-folder", async (req, res) => {
    const id = parseId(req.params.id as string);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });

    const project = await storage.getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const deleted = await deleteProjectFolder(project.name);
    if (!deleted) return res.status(500).json({ message: "Failed to delete folder" });

    // Also delete all photo records for this project
    const photos = await storage.getProjectPhotos(id);
    for (const photo of photos) {
      await storage.deleteProjectPhoto(photo.id);
    }

    res.json({ success: true });
  });

  // ─── Project Assignments ───
  app.get("/api/projects/:id/assignments", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid project ID" });
    const assignments = await storage.getProjectAssignments(id);
    res.json(assignments);
  });

  app.get("/api/employees/:id/projects", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid employee ID" });
    const assignments = await storage.getEmployeeProjects(id);
    res.json(assignments);
  });

  app.post("/api/project-assignments", async (req, res) => {
    const parsed = insertProjectAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    try {
      const assignment = await storage.createProjectAssignment(parsed.data);
      res.status(201).json(assignment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/project-assignments/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid assignment ID" });
    await storage.deleteProjectAssignment(id);
    res.status(204).send();
  });

  // ─── Employee Portal Auth (PIN-based) ───
  app.post("/api/employee-auth", async (req, res) => {
    const { employeeId, pin } = req.body;
    if (!employeeId || !pin) return res.status(400).json({ message: "Employee ID and PIN required" });
    const employee = await storage.getEmployee(Number(employeeId));
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (!employee.pin || employee.pin !== String(pin)) return res.status(401).json({ message: "Invalid PIN" });
    if (!employee.isActive) return res.status(403).json({ message: "Employee account is inactive" });
    // Return employee info + their assigned projects
    const assignments = await storage.getEmployeeProjects(employee.id);
    res.json({ employee: { id: employee.id, name: employee.name, role: employee.role }, assignments });
  });

  return httpServer;
}

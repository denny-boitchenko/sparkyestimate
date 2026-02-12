import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  address: text("address"),
  dwellingType: text("dwelling_type").notNull().default("single"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimates = pgTable("estimates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  overheadPct: real("overhead_pct").notNull().default(15),
  profitPct: real("profit_pct").notNull().default(10),
  materialMarkupPct: real("material_markup_pct").notNull().default(0),
  laborMarkupPct: real("labor_markup_pct").notNull().default(0),
  laborRate: real("labor_rate").notNull().default(85),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimateItems = pgTable("estimate_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  deviceType: text("device_type").notNull(),
  description: text("description").notNull(),
  room: text("room"),
  quantity: integer("quantity").notNull().default(1),
  materialCost: real("material_cost").notNull().default(0),
  laborHours: real("labor_hours").notNull().default(0),
  wireType: text("wire_type"),
  wireFootage: real("wire_footage").notNull().default(0),
  markupPct: real("markup_pct").notNull().default(0),
  boxType: text("box_type"),
  coverPlate: text("cover_plate"),
});

export const deviceAssemblies = pgTable("device_assemblies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  device: text("device").notNull(),
  boxType: text("box_type"),
  coverPlate: text("cover_plate"),
  miscParts: text("misc_parts"),
  wireType: text("wire_type"),
  wireFootage: real("wire_footage").notNull().default(15),
  laborHours: real("labor_hours").notNull().default(0.18),
  materialCost: real("material_cost").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(true),
});

export const aiAnalyses = pgTable("ai_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  analysisMode: text("analysis_mode").notNull(),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true, createdAt: true });
export const insertEstimateItemSchema = createInsertSchema(estimateItems).omit({ id: true });
export const insertDeviceAssemblySchema = createInsertSchema(deviceAssemblies).omit({ id: true });
export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateItem = typeof estimateItems.$inferSelect;
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type DeviceAssembly = typeof deviceAssemblies.$inferSelect;
export type InsertDeviceAssembly = z.infer<typeof insertDeviceAssemblySchema>;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export const PROJECT_STATUSES = ["draft", "in_progress", "bid_sent", "won", "lost"] as const;
export const DWELLING_TYPES = ["single", "duplex", "triplex", "fourplex"] as const;
export const ANALYSIS_MODES = ["electrical", "floor_plan"] as const;

export const DEVICE_CATEGORIES = [
  "receptacles", "switches", "lighting", "safety", "data_comm", "specialty", "service"
] as const;

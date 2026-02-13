import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  role: text("role").notNull().default("electrician"),
  hourlyRate: real("hourly_rate").notNull().default(85),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  customerId: integer("customer_id"),
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

export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number").notNull(),
  estimateId: integer("estimate_id").references(() => estimates.id),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  customerId: integer("customer_id"),
  status: text("status").notNull().default("draft"),
  invoiceDate: timestamp("invoice_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  paymentDate: timestamp("payment_date"),
  subtotal: real("subtotal").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(5),
  taxLabel: text("tax_label").notNull().default("GST 5%"),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  room: text("room"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  total: real("total").notNull().default(0),
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
  supplier: text("supplier"),
});

export const aiAnalyses = pgTable("ai_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  analysisMode: text("analysis_mode").notNull(),
  results: jsonb("results"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const wireTypes = pgTable("wire_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  costPerFoot: real("cost_per_foot").notNull().default(0),
  supplier: text("supplier"),
});

export const serviceBundles = pgTable("service_bundles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  items: jsonb("items").notNull().default([]),
  materialCost: real("material_cost").notNull().default(0),
  laborHours: real("labor_hours").notNull().default(0),
});

export const panelCircuits = pgTable("panel_circuits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  circuitNumber: integer("circuit_number").notNull(),
  amps: integer("amps").notNull().default(15),
  poles: integer("poles").notNull().default(1),
  description: text("description").notNull(),
  wireType: text("wire_type"),
  isGfci: boolean("is_gfci").notNull().default(false),
  isAfci: boolean("is_afci").notNull().default(false),
});

export const estimateServices = pgTable("estimate_services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  serviceBundleId: integer("service_bundle_id").notNull().references(() => serviceBundles.id),
  name: text("name").notNull(),
  materialCost: real("material_cost").notNull().default(0),
  laborHours: real("labor_hours").notNull().default(0),
});

export const complianceDocuments = pgTable("compliance_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  version: text("version"),
  fileSize: integer("file_size"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const supplierImports = pgTable("supplier_imports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  supplierName: text("supplier_name").notNull(),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("pending"),
  previewData: jsonb("preview_data"),
  importedCount: integer("imported_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true, createdAt: true });
export const insertEstimateItemSchema = createInsertSchema(estimateItems).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertDeviceAssemblySchema = createInsertSchema(deviceAssemblies).omit({ id: true });
export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export const insertWireTypeSchema = createInsertSchema(wireTypes).omit({ id: true });
export const insertServiceBundleSchema = createInsertSchema(serviceBundles).omit({ id: true });
export const insertPanelCircuitSchema = createInsertSchema(panelCircuits).omit({ id: true });
export const insertEstimateServiceSchema = createInsertSchema(estimateServices).omit({ id: true });
export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({ id: true, uploadedAt: true });
export const insertSupplierImportSchema = createInsertSchema(supplierImports).omit({ id: true, createdAt: true });

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateItem = typeof estimateItems.$inferSelect;
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type DeviceAssembly = typeof deviceAssemblies.$inferSelect;
export type InsertDeviceAssembly = z.infer<typeof insertDeviceAssemblySchema>;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type WireType = typeof wireTypes.$inferSelect;
export type InsertWireType = z.infer<typeof insertWireTypeSchema>;
export type ServiceBundle = typeof serviceBundles.$inferSelect;
export type InsertServiceBundle = z.infer<typeof insertServiceBundleSchema>;
export type PanelCircuit = typeof panelCircuits.$inferSelect;
export type InsertPanelCircuit = z.infer<typeof insertPanelCircuitSchema>;
export type EstimateService = typeof estimateServices.$inferSelect;
export type InsertEstimateService = z.infer<typeof insertEstimateServiceSchema>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;
export type SupplierImport = typeof supplierImports.$inferSelect;
export type InsertSupplierImport = z.infer<typeof insertSupplierImportSchema>;

export const PROJECT_STATUSES = ["draft", "in_progress", "bid_sent", "won", "lost"] as const;
export const DWELLING_TYPES = ["single", "duplex", "triplex", "fourplex"] as const;
export const ANALYSIS_MODES = ["electrical", "floor_plan"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export const EMPLOYEE_ROLES = ["owner", "journeyman", "apprentice", "helper"] as const;

export const DEVICE_CATEGORIES = [
  "receptacles", "switches", "lighting", "safety", "data_comm", "specialty", "service"
] as const;

export const DEFAULT_WIRE_TYPES = [
  "14/2 NM-B", "14/3 NM-B", "12/2 NM-B", "12/3 NM-B",
  "10/2 NM-B", "10/3 NM-B", "6/3 NM-B", "3 AWG NM-B",
  "3/0 AL SER Cable", "18/2 Bell Wire", "18/5 Thermostat Wire",
  "Cat6", "RG6 Coax"
] as const;

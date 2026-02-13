import {
  customers, employees, projects, estimates, estimateItems, invoices, invoiceItems,
  deviceAssemblies, aiAnalyses, settings,
  wireTypes, serviceBundles, panelCircuits, estimateServices, complianceDocuments,
  supplierImports,
  type Customer, type InsertCustomer,
  type Employee, type InsertEmployee,
  type Project, type InsertProject,
  type Estimate, type InsertEstimate,
  type EstimateItem, type InsertEstimateItem,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type DeviceAssembly, type InsertDeviceAssembly,
  type AiAnalysis, type InsertAiAnalysis,
  type Setting, type InsertSetting,
  type WireType, type InsertWireType,
  type ServiceBundle, type InsertServiceBundle,
  type PanelCircuit, type InsertPanelCircuit,
  type EstimateService, type InsertEstimateService,
  type ComplianceDocument, type InsertComplianceDocument,
  type SupplierImport, type InsertSupplierImport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;

  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;

  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  getEstimates(): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  getEstimatesByProject(projectId: number): Promise<Estimate[]>;
  createEstimate(data: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: number): Promise<void>;

  getEstimateItems(estimateId: number): Promise<EstimateItem[]>;
  createEstimateItem(data: InsertEstimateItem): Promise<EstimateItem>;
  updateEstimateItem(id: number, data: Partial<InsertEstimateItem>): Promise<EstimateItem | undefined>;
  deleteEstimateItem(id: number): Promise<void>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByProject(projectId: number): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<void>;

  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<void>;
  deleteAllInvoiceItems(invoiceId: number): Promise<void>;

  getDeviceAssemblies(): Promise<DeviceAssembly[]>;
  createDeviceAssembly(data: InsertDeviceAssembly): Promise<DeviceAssembly>;
  updateDeviceAssembly(id: number, data: Partial<InsertDeviceAssembly>): Promise<DeviceAssembly | undefined>;
  deleteDeviceAssembly(id: number): Promise<void>;

  getAiAnalyses(): Promise<AiAnalysis[]>;
  getAiAnalysis(id: number): Promise<AiAnalysis | undefined>;
  getAiAnalysesByProject(projectId: number): Promise<AiAnalysis[]>;
  createAiAnalysis(data: InsertAiAnalysis): Promise<AiAnalysis>;
  updateAiAnalysis(id: number, data: Partial<InsertAiAnalysis>): Promise<AiAnalysis | undefined>;
  deleteAiAnalysis(id: number): Promise<void>;

  getSettings(): Promise<Setting[]>;
  upsertSetting(key: string, value: string): Promise<void>;

  getWireTypes(): Promise<WireType[]>;
  createWireType(data: InsertWireType): Promise<WireType>;
  updateWireType(id: number, data: Partial<InsertWireType>): Promise<WireType | undefined>;
  deleteWireType(id: number): Promise<void>;

  getServiceBundles(): Promise<ServiceBundle[]>;
  getServiceBundle(id: number): Promise<ServiceBundle | undefined>;
  createServiceBundle(data: InsertServiceBundle): Promise<ServiceBundle>;
  updateServiceBundle(id: number, data: Partial<InsertServiceBundle>): Promise<ServiceBundle | undefined>;
  deleteServiceBundle(id: number): Promise<void>;

  getPanelCircuits(estimateId: number): Promise<PanelCircuit[]>;
  createPanelCircuit(data: InsertPanelCircuit): Promise<PanelCircuit>;
  updatePanelCircuit(id: number, data: Partial<InsertPanelCircuit>): Promise<PanelCircuit | undefined>;
  deletePanelCircuit(id: number): Promise<void>;
  deleteAllPanelCircuits(estimateId: number): Promise<void>;

  getEstimateServices(estimateId: number): Promise<EstimateService[]>;
  createEstimateService(data: InsertEstimateService): Promise<EstimateService>;
  deleteEstimateService(id: number): Promise<void>;

  getComplianceDocuments(): Promise<ComplianceDocument[]>;
  getActiveComplianceDocument(): Promise<ComplianceDocument | undefined>;
  createComplianceDocument(data: InsertComplianceDocument): Promise<ComplianceDocument>;
  updateComplianceDocument(id: number, data: Partial<InsertComplianceDocument>): Promise<ComplianceDocument | undefined>;
  deleteComplianceDocument(id: number): Promise<void>;
  deactivateAllComplianceDocuments(): Promise<void>;

  getSupplierImports(): Promise<SupplierImport[]>;
  getSupplierImport(id: number): Promise<SupplierImport | undefined>;
  createSupplierImport(data: InsertSupplierImport): Promise<SupplierImport>;
  updateSupplierImport(id: number, data: Partial<InsertSupplierImport>): Promise<SupplierImport | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(data).returning();
    return customer;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(data).returning();
    return employee;
  }

  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return employee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getEstimates(): Promise<Estimate[]> {
    return db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));
    return estimate;
  }

  async getEstimatesByProject(projectId: number): Promise<Estimate[]> {
    return db.select().from(estimates).where(eq(estimates.projectId, projectId)).orderBy(desc(estimates.createdAt));
  }

  async createEstimate(data: InsertEstimate): Promise<Estimate> {
    const [estimate] = await db.insert(estimates).values(data).returning();
    return estimate;
  }

  async updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const [estimate] = await db.update(estimates).set(data).where(eq(estimates.id, id)).returning();
    return estimate;
  }

  async deleteEstimate(id: number): Promise<void> {
    await db.delete(estimates).where(eq(estimates.id, id));
  }

  async getEstimateItems(estimateId: number): Promise<EstimateItem[]> {
    return db.select().from(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  }

  async createEstimateItem(data: InsertEstimateItem): Promise<EstimateItem> {
    const [item] = await db.insert(estimateItems).values(data).returning();
    return item;
  }

  async updateEstimateItem(id: number, data: Partial<InsertEstimateItem>): Promise<EstimateItem | undefined> {
    const [item] = await db.update(estimateItems).set(data).where(eq(estimateItems.id, id)).returning();
    return item;
  }

  async deleteEstimateItem(id: number): Promise<void> {
    await db.delete(estimateItems).where(eq(estimateItems.id, id));
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByProject(projectId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.projectId, projectId)).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem> {
    const [item] = await db.insert(invoiceItems).values(data).returning();
    return item;
  }

  async updateInvoiceItem(id: number, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const [item] = await db.update(invoiceItems).set(data).where(eq(invoiceItems.id, id)).returning();
    return item;
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  async deleteAllInvoiceItems(invoiceId: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async getDeviceAssemblies(): Promise<DeviceAssembly[]> {
    return db.select().from(deviceAssemblies);
  }

  async createDeviceAssembly(data: InsertDeviceAssembly): Promise<DeviceAssembly> {
    const [assembly] = await db.insert(deviceAssemblies).values(data).returning();
    return assembly;
  }

  async updateDeviceAssembly(id: number, data: Partial<InsertDeviceAssembly>): Promise<DeviceAssembly | undefined> {
    const [assembly] = await db.update(deviceAssemblies).set(data).where(eq(deviceAssemblies.id, id)).returning();
    return assembly;
  }

  async deleteDeviceAssembly(id: number): Promise<void> {
    await db.delete(deviceAssemblies).where(eq(deviceAssemblies.id, id));
  }

  async getAiAnalyses(): Promise<AiAnalysis[]> {
    return db.select().from(aiAnalyses).orderBy(desc(aiAnalyses.createdAt));
  }

  async getAiAnalysis(id: number): Promise<AiAnalysis | undefined> {
    const [analysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.id, id));
    return analysis;
  }

  async getAiAnalysesByProject(projectId: number): Promise<AiAnalysis[]> {
    return db.select().from(aiAnalyses).where(eq(aiAnalyses.projectId, projectId)).orderBy(desc(aiAnalyses.createdAt));
  }

  async createAiAnalysis(data: InsertAiAnalysis): Promise<AiAnalysis> {
    const [analysis] = await db.insert(aiAnalyses).values(data).returning();
    return analysis;
  }

  async updateAiAnalysis(id: number, data: Partial<InsertAiAnalysis>): Promise<AiAnalysis | undefined> {
    const [analysis] = await db.update(aiAnalyses).set(data).where(eq(aiAnalyses.id, id)).returning();
    return analysis;
  }

  async deleteAiAnalysis(id: number): Promise<void> {
    await db.delete(aiAnalyses).where(eq(aiAnalyses.id, id));
  }

  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async getWireTypes(): Promise<WireType[]> {
    return db.select().from(wireTypes);
  }

  async createWireType(data: InsertWireType): Promise<WireType> {
    const [wt] = await db.insert(wireTypes).values(data).returning();
    return wt;
  }

  async updateWireType(id: number, data: Partial<InsertWireType>): Promise<WireType | undefined> {
    const [wt] = await db.update(wireTypes).set(data).where(eq(wireTypes.id, id)).returning();
    return wt;
  }

  async deleteWireType(id: number): Promise<void> {
    await db.delete(wireTypes).where(eq(wireTypes.id, id));
  }

  async getServiceBundles(): Promise<ServiceBundle[]> {
    return db.select().from(serviceBundles);
  }

  async getServiceBundle(id: number): Promise<ServiceBundle | undefined> {
    const [sb] = await db.select().from(serviceBundles).where(eq(serviceBundles.id, id));
    return sb;
  }

  async createServiceBundle(data: InsertServiceBundle): Promise<ServiceBundle> {
    const [sb] = await db.insert(serviceBundles).values(data).returning();
    return sb;
  }

  async updateServiceBundle(id: number, data: Partial<InsertServiceBundle>): Promise<ServiceBundle | undefined> {
    const [sb] = await db.update(serviceBundles).set(data).where(eq(serviceBundles.id, id)).returning();
    return sb;
  }

  async deleteServiceBundle(id: number): Promise<void> {
    await db.delete(serviceBundles).where(eq(serviceBundles.id, id));
  }

  async getPanelCircuits(estimateId: number): Promise<PanelCircuit[]> {
    return db.select().from(panelCircuits).where(eq(panelCircuits.estimateId, estimateId));
  }

  async createPanelCircuit(data: InsertPanelCircuit): Promise<PanelCircuit> {
    const [pc] = await db.insert(panelCircuits).values(data).returning();
    return pc;
  }

  async updatePanelCircuit(id: number, data: Partial<InsertPanelCircuit>): Promise<PanelCircuit | undefined> {
    const [pc] = await db.update(panelCircuits).set(data).where(eq(panelCircuits.id, id)).returning();
    return pc;
  }

  async deletePanelCircuit(id: number): Promise<void> {
    await db.delete(panelCircuits).where(eq(panelCircuits.id, id));
  }

  async deleteAllPanelCircuits(estimateId: number): Promise<void> {
    await db.delete(panelCircuits).where(eq(panelCircuits.estimateId, estimateId));
  }

  async getEstimateServices(estimateId: number): Promise<EstimateService[]> {
    return db.select().from(estimateServices).where(eq(estimateServices.estimateId, estimateId));
  }

  async createEstimateService(data: InsertEstimateService): Promise<EstimateService> {
    const [es] = await db.insert(estimateServices).values(data).returning();
    return es;
  }

  async deleteEstimateService(id: number): Promise<void> {
    await db.delete(estimateServices).where(eq(estimateServices.id, id));
  }

  async getComplianceDocuments(): Promise<ComplianceDocument[]> {
    return db.select().from(complianceDocuments).orderBy(desc(complianceDocuments.uploadedAt));
  }

  async getActiveComplianceDocument(): Promise<ComplianceDocument | undefined> {
    const [doc] = await db.select().from(complianceDocuments).where(eq(complianceDocuments.isActive, true));
    return doc;
  }

  async createComplianceDocument(data: InsertComplianceDocument): Promise<ComplianceDocument> {
    const [cd] = await db.insert(complianceDocuments).values(data).returning();
    return cd;
  }

  async updateComplianceDocument(id: number, data: Partial<InsertComplianceDocument>): Promise<ComplianceDocument | undefined> {
    const [cd] = await db.update(complianceDocuments).set(data).where(eq(complianceDocuments.id, id)).returning();
    return cd;
  }

  async deleteComplianceDocument(id: number): Promise<void> {
    await db.delete(complianceDocuments).where(eq(complianceDocuments.id, id));
  }

  async deactivateAllComplianceDocuments(): Promise<void> {
    await db.update(complianceDocuments).set({ isActive: false });
  }

  async getSupplierImports(): Promise<SupplierImport[]> {
    return db.select().from(supplierImports).orderBy(desc(supplierImports.createdAt));
  }

  async getSupplierImport(id: number): Promise<SupplierImport | undefined> {
    const [si] = await db.select().from(supplierImports).where(eq(supplierImports.id, id));
    return si;
  }

  async createSupplierImport(data: InsertSupplierImport): Promise<SupplierImport> {
    const [si] = await db.insert(supplierImports).values(data).returning();
    return si;
  }

  async updateSupplierImport(id: number, data: Partial<InsertSupplierImport>): Promise<SupplierImport | undefined> {
    const [si] = await db.update(supplierImports).set(data).where(eq(supplierImports.id, id)).returning();
    return si;
  }
}

export const storage = new DatabaseStorage();

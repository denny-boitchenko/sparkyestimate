import {
  projects, estimates, estimateItems, deviceAssemblies, aiAnalyses, settings,
  type Project, type InsertProject,
  type Estimate, type InsertEstimate,
  type EstimateItem, type InsertEstimateItem,
  type DeviceAssembly, type InsertDeviceAssembly,
  type AiAnalysis, type InsertAiAnalysis,
  type Setting, type InsertSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
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

  getDeviceAssemblies(): Promise<DeviceAssembly[]>;
  createDeviceAssembly(data: InsertDeviceAssembly): Promise<DeviceAssembly>;

  getAiAnalyses(): Promise<AiAnalysis[]>;
  getAiAnalysesByProject(projectId: number): Promise<AiAnalysis[]>;
  createAiAnalysis(data: InsertAiAnalysis): Promise<AiAnalysis>;

  getSettings(): Promise<Setting[]>;
  upsertSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

  async getDeviceAssemblies(): Promise<DeviceAssembly[]> {
    return db.select().from(deviceAssemblies);
  }

  async createDeviceAssembly(data: InsertDeviceAssembly): Promise<DeviceAssembly> {
    const [assembly] = await db.insert(deviceAssemblies).values(data).returning();
    return assembly;
  }

  async getAiAnalyses(): Promise<AiAnalysis[]> {
    return db.select().from(aiAnalyses).orderBy(desc(aiAnalyses.createdAt));
  }

  async getAiAnalysesByProject(projectId: number): Promise<AiAnalysis[]> {
    return db.select().from(aiAnalyses).where(eq(aiAnalyses.projectId, projectId)).orderBy(desc(aiAnalyses.createdAt));
  }

  async createAiAnalysis(data: InsertAiAnalysis): Promise<AiAnalysis> {
    const [analysis] = await db.insert(aiAnalyses).values(data).returning();
    return analysis;
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
}

export const storage = new DatabaseStorage();

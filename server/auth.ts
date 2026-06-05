import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";
import { storage } from "./storage";

function log(message: string, source = "auth") {
  console.log(`[${source}] ${message}`);
}

// Make session fields type-safe
declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
    employeeId?: number; // set by the employee PIN portal
  }
}

const BCRYPT_ROUNDS = 12;

// Endpoints reachable without an authenticated session.
// Auth endpoints (so you can log in) and the separate employee PIN login.
const OPEN_API_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/employee-login",
]);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Protects everything under /api except the open paths above.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api")) return next();
  if (OPEN_API_PATHS.has(req.path)) return next();
  // Admin user session OR employee PIN-portal session.
  if (req.session?.userId || req.session?.employeeId) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// Admin-only: requires a full user session with the admin role.
// Employee PIN sessions are explicitly rejected.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId && req.session?.role === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
}

const MIN_PASSWORD_LEN = 8;
const passwordField = z.string().min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters`);

// First-run: if there are no users, create the admin account.
// Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD env vars. If no
// password is set, generate a strong random one and print it once so the
// self-hosting operator can log in (no known default credential).
async function seedAdminUser() {
  const count = await storage.countUsers();
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(9).toString("base64url");
    generated = true;
  }

  const passwordHash = await hashPassword(password);
  await storage.createUser({ username, passwordHash, role: "admin", isActive: true });

  if (generated) {
    log("==================================================================", "auth");
    log(`  First-run admin created.  username: ${username}`, "auth");
    log(`  GENERATED PASSWORD: ${password}`, "auth");
    log("  Save it now and change it after first login.", "auth");
    log("  (Set ADMIN_USERNAME / ADMIN_PASSWORD in .env to control this.)", "auth");
    log("==================================================================", "auth");
  } else {
    log(`First-run admin created from env (username: ${username})`, "auth");
  }
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Wire session, auth routes, route guard, and seed the first admin.
// Call this BEFORE registering business routes so the guard covers them.
export async function setupAuth(app: Express) {
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // behind a TLS-terminating reverse proxy
  }

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
  // CSP is left off so it can be tuned per deployment without breaking the SPA
  // or the Vite dev server; everything else (incl. HSTS over HTTPS) is on.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({ pool, createTableIfMissing: true, tableName: "session" }),
      secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // requires HTTPS in prod
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    }),
  );

  if (!process.env.SESSION_SECRET) {
    log("WARNING: SESSION_SECRET not set — using an insecure dev secret. Set it in .env.", "auth");
  }

  // Throttle login attempts per IP to slow brute-force attacks.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Try again in a few minutes." },
  });

  // ── Auth routes (open) ──
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Username and password required" });

    const { username, password } = parsed.data;
    const user = await storage.getUserByUsername(username);
    // Always run a compare to keep timing roughly constant for unknown users.
    const ok = user && user.isActive ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !user.isActive || !ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Regenerate the session on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      res.json({ id: user.id, username: user.username, role: user.role });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
    });
  });

  // ── User account management (admin only) ──
  const safeUser = (u: { id: number; username: string; role: string; isActive: boolean; createdAt: Date }) =>
    ({ id: u.id, username: u.username, role: u.role, isActive: u.isActive, createdAt: u.createdAt });

  const createUserSchema = z.object({
    username: z.string().min(1).max(64),
    password: passwordField,
    role: z.enum(["admin", "estimator"]).default("estimator"),
  });
  const updateUserSchema = z.object({
    username: z.string().min(1).max(64).optional(),
    password: passwordField.optional(),
    role: z.enum(["admin", "estimator"]).optional(),
    isActive: z.boolean().optional(),
  });

  async function countActiveAdmins(excludeId?: number): Promise<number> {
    const all = await storage.getUsers();
    return all.filter((u) => u.role === "admin" && u.isActive && u.id !== excludeId).length;
  }

  app.get("/api/users", requireAdmin, async (_req, res) => {
    const all = await storage.getUsers();
    res.json(all.map(safeUser));
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    const { username, password, role } = parsed.data;
    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ message: "Username already taken" });
    const passwordHash = await hashPassword(password);
    const user = await storage.createUser({ username, passwordHash, role, isActive: true });
    res.status(201).json(safeUser(user));
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    const target = await storage.getUserById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const { username, password, role, isActive } = parsed.data;

    // Don't let the last active admin lose admin access or be deactivated.
    const demoting = (role && role !== "admin") || isActive === false;
    if (target.role === "admin" && demoting && (await countActiveAdmins(target.id)) === 0) {
      return res.status(400).json({ message: "Cannot remove the last active admin" });
    }
    if (username && username !== target.username) {
      const clash = await storage.getUserByUsername(username);
      if (clash) return res.status(409).json({ message: "Username already taken" });
    }

    const data: any = {};
    if (username) data.username = username;
    if (role) data.role = role;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password) data.passwordHash = await hashPassword(password);

    const updated = await storage.updateUser(id, data);
    if (!updated) return res.status(404).json({ message: "User not found" });
    // Keep the live session in sync if the admin edited their own account.
    if (id === req.session.userId) {
      req.session.username = updated.username;
      req.session.role = updated.role;
    }
    res.json(safeUser(updated));
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    if (id === req.session.userId) return res.status(400).json({ message: "You cannot delete your own account" });
    const target = await storage.getUserById(id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "admin" && (await countActiveAdmins(target.id)) === 0) {
      return res.status(400).json({ message: "Cannot delete the last active admin" });
    }
    await storage.deleteUser(id);
    res.json({ ok: true });
  });

  // ── Guard everything else under /api ──
  app.use(requireAuth);

  await seedAdminUser();
}

import { google } from "googleapis";
import { Readable } from "stream";
import { storage } from "./storage";

// OAuth2 client credentials (developer sets these once in .env)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

let driveClient: ReturnType<typeof google.drive> | null = null;
let cachedOAuth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

/**
 * Check if OAuth client credentials are configured (developer setup).
 */
export function isGoogleDriveOAuthAvailable(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

/**
 * Get or create the OAuth2 client instance.
 */
export function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  if (cachedOAuth2Client) return cachedOAuth2Client;
  cachedOAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  return cachedOAuth2Client;
}

/**
 * Check if Google Drive is connected (user has authorized via OAuth).
 */
export async function isGoogleDriveConfigured(): Promise<boolean> {
  if (!isGoogleDriveOAuthAvailable()) return false;
  const settingsRows = await storage.getSettings();
  return settingsRows.some(s => s.key === "googleDriveRefreshToken" && s.value);
}

/**
 * Get an authenticated Drive client using OAuth2 tokens from DB.
 */
async function getClient(): Promise<ReturnType<typeof google.drive> | null> {
  if (driveClient) return driveClient;

  if (!isGoogleDriveOAuthAvailable()) return null;

  const settingsRows = await storage.getSettings();
  const sm: Record<string, string> = {};
  settingsRows.forEach(s => { sm[s.key] = s.value; });

  const refreshToken = sm.googleDriveRefreshToken;
  if (!refreshToken) return null;

  try {
    const auth = getOAuth2Client();
    auth.setCredentials({
      access_token: sm.googleDriveAccessToken || undefined,
      refresh_token: refreshToken,
    });

    // Persist new tokens when they auto-refresh
    auth.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await storage.upsertSetting("googleDriveAccessToken", tokens.access_token);
      }
      if (tokens.refresh_token) {
        await storage.upsertSetting("googleDriveRefreshToken", tokens.refresh_token);
      }
    });

    driveClient = google.drive({ version: "v3", auth });
    return driveClient;
  } catch (err) {
    console.error("Google Drive OAuth client error:", err);
    return null;
  }
}

/**
 * Clear cached clients (call after disconnect or new authorization).
 */
export function invalidateClient(): void {
  driveClient = null;
  cachedOAuth2Client = null;
}

/**
 * Get the root folder ID, auto-creating "SparkyEstimate Photos" if needed.
 */
async function getRootFolderId(): Promise<string | null> {
  const settingsRows = await storage.getSettings();
  const sm: Record<string, string> = {};
  settingsRows.forEach(s => { sm[s.key] = s.value; });

  let folderId = sm.googleDriveRootFolderId;
  if (folderId) return folderId;

  const client = await getClient();
  if (!client) return null;

  // Check if folder already exists
  const res = await client.files.list({
    q: "name='SparkyEstimate Photos' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!;
  } else {
    const folder = await client.files.create({
      requestBody: {
        name: "SparkyEstimate Photos",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = folder.data.id!;
  }

  await storage.upsertSetting("googleDriveRootFolderId", folderId);
  return folderId;
}

/**
 * Find or create a folder by name inside a parent folder.
 */
async function findOrCreateFolder(name: string, parentId: string): Promise<string | null> {
  const client = await getClient();
  if (!client) return null;

  const res = await client.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folder = await client.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Get or create the full project folder structure:
 * SparkyEstimate Photos / ProjectName / { Service, Rough-in, Finish, Misc }
 */
export async function getProjectFolderIds(projectName: string): Promise<Record<string, string> | null> {
  if (!(await isGoogleDriveConfigured())) return null;

  const rootFolderId = await getRootFolderId();
  if (!rootFolderId) return null;

  const projectFolderId = await findOrCreateFolder(projectName, rootFolderId);
  if (!projectFolderId) return null;

  const phases = ["Service", "Rough-in", "Finish", "Misc"];
  const folderIds: Record<string, string> = { project: projectFolderId };

  for (const phase of phases) {
    const folderId = await findOrCreateFolder(phase, projectFolderId);
    if (folderId) {
      folderIds[phase.toLowerCase().replace("-", "")] = folderId;
    }
  }

  return folderIds;
}

/**
 * Upload a file to Google Drive in the specified folder.
 */
export async function uploadToGoogleDrive(
  folderId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ fileId: string; webViewLink: string | null } | null> {
  const client = await getClient();
  if (!client) return null;

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const file = await client.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink, webContentLink",
  });

  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink || null,
  };
}

/**
 * Get a download URL for a file.
 * Makes the file readable via link so the browser can display it.
 */
export async function getGoogleDriveDownloadUrl(fileId: string): Promise<string | null> {
  const client = await getClient();
  if (!client) return null;

  try {
    await client.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    const file = await client.files.get({
      fileId,
      fields: "webContentLink",
    });
    return file.data.webContentLink || null;
  } catch {
    return null;
  }
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  const client = await getClient();
  if (!client) return;

  try {
    await client.files.delete({ fileId });
  } catch (err) {
    console.error("Google Drive delete error:", err);
  }
}

/**
 * Delete a project folder (and all contents) from Google Drive.
 * Moves the folder to trash.
 */
export async function deleteProjectFolder(projectName: string): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;

  const rootFolderId = await getRootFolderId();
  if (!rootFolderId) return false;

  try {
    const res = await client.files.list({
      q: `name='${projectName.replace(/'/g, "\\'")}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      await client.files.delete({ fileId: res.data.files[0].id! });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Google Drive folder delete error:", err);
    return false;
  }
}

/**
 * Check if a project folder exists in Google Drive.
 */
export async function hasProjectFolder(projectName: string): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;

  const rootFolderId = await getRootFolderId();
  if (!rootFolderId) return false;

  try {
    const res = await client.files.list({
      q: `name='${projectName.replace(/'/g, "\\'")}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    return !!(res.data.files && res.data.files.length > 0);
  } catch {
    return false;
  }
}

/**
 * Map phase name to folder key.
 */
export function phaseFolderKey(phase: string): string {
  const map: Record<string, string> = {
    service: "service",
    roughin: "roughin",
    finish: "finish",
    misc: "misc",
  };
  return map[phase] || "misc";
}

import crypto from "crypto";

// Symmetric encryption for credentials stored at rest (e.g. OAuth client secret).
// Key is derived from SESSION_SECRET so there is no extra secret to manage; set a
// strong SESSION_SECRET in production. AES-256-GCM gives confidentiality + integrity.

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const KEY = crypto.scryptSync(SECRET, "sparky-credential-salt", 32);

// Returns "iv:authTag:ciphertext", all hex.
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

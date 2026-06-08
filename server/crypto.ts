import crypto from "crypto";

// Symmetric encryption for credentials stored at rest (e.g. OAuth client secret).
// AES-256-GCM gives confidentiality + integrity.
//
// Key source precedence: CREDENTIAL_ENCRYPTION_KEY > SESSION_SECRET > dev default.
// Falling back to SESSION_SECRET preserves backward compatibility: data encrypted
// before CREDENTIAL_ENCRYPTION_KEY existed still decrypts when it is unset.
// NOTE: setting CREDENTIAL_ENCRYPTION_KEY *after* data has been stored changes the
// derived key, so any already-encrypted creds must be re-entered through the UI.

const SECRET =
  process.env.CREDENTIAL_ENCRYPTION_KEY ||
  process.env.SESSION_SECRET ||
  "dev-insecure-secret-change-me";
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

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

// Shared format for local login and the explicit first-admin command.
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new TypeError("Password must be a nonempty string");
  }
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Accept existing bcrypt credentials without rewriting accounts on startup.
// Validate the entire format before crypto calls: malformed hashes are not errors.
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (typeof supplied !== "string" || typeof stored !== "string") return false;
  if (/^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(stored)) {
    // bcrypt only authenticates the first 72 bytes; do not accept suffixes.
    if (Buffer.byteLength(supplied, "utf8") > 72) return false;
    return bcrypt.compare(supplied, stored);
  }
  if (!/^[a-fA-F0-9]{128}\.[a-fA-F0-9]{32}$/.test(stored)) return false;
  const [hashed, salt] = stored.split(".");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), suppliedBuf);
}

import { createHash } from "crypto";
import { promisify } from "util";
import { scrypt } from "crypto";
import path from "path";
import fs from "fs";

export const scryptAsync = promisify(scrypt);

export async function generateAppHash(): Promise<string> {
  try {
    const hash = createHash('md5');
    const filesToCheck = [
      'package.json',
      'client/src/App.tsx',
      'client/src/main.tsx',
      'client/public/sw.js',
      'server/index.ts',
    ];
    for (const file of filesToCheck) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        hash.update(`${file}:${stats.mtime.getTime()}`);
      }
    }
    return hash.digest('hex').substring(0, 8);
  } catch (error) {
    console.error('Error generating app hash:', error);
    return Date.now().toString().substring(-8);
  }
}

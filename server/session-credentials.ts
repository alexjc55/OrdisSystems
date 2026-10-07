import { createHash } from "node:crypto";

// connect-pg-simple's deployed default, NOT shared/schema.ts's unused "sessions".
export const SESSION_TABLE_NAME = "session";

export type SessionIdentity = { id: string; passwordVersion: string };

export function sessionIdentity(user: { id: string; password: string }): SessionIdentity {
  return {
    id: user.id,
    passwordVersion: createHash("sha256").update(user.password).digest("hex"),
  };
}

export class PasswordUpdateConflict extends Error {
  constructor() {
    super("Password or reset token changed; retry authentication");
  }
}

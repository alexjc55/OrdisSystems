import { sql } from "drizzle-orm";
import { users } from "@shared/schema";

// Compute the boolean inside PostgreSQL: hashes never enter list/order caches.
export const publicUserSelection = {
  id: users.id,
  username: users.username,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  profileImageUrl: users.profileImageUrl,
  phone: users.phone,
  defaultAddress: users.defaultAddress,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  hasPassword: sql<boolean>`COALESCE(${users.password} <> '', false)`,
};

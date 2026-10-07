import type { User } from "./schema";

// Allowlist: new database fields must never become public automatically.
export type PublicUser = Pick<User,
  "id" | "username" | "email" | "firstName" | "lastName" |
  "profileImageUrl" | "phone" | "defaultAddress" | "role" |
  "createdAt" | "updatedAt"
> & { hasPassword: boolean };

export type AdminUser = PublicUser & {
  orderCount: number;
  totalOrderAmount: number;
  branchIds: number[];
  customerBranchIds: number[];
};

export function toPublicUser(user: User | PublicUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    phone: user.phone,
    defaultAddress: user.defaultAddress,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasPassword: "password" in user ? Boolean(user.password) : user.hasPassword,
  };
}

export function toAdminUser(user: AdminUser): AdminUser {
  return {
    ...toPublicUser(user),
    orderCount: user.orderCount,
    totalOrderAmount: user.totalOrderAmount,
    branchIds: user.branchIds,
    customerBranchIds: user.customerBranchIds,
  };
}

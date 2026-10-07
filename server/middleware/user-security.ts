import type { RequestHandler } from "express";

const allowedProfileFields = new Set([
  "firstName", "lastName", "phone", "profileImageUrl", "defaultAddress",
]);

// Match the emergency fix deployed on edahouse: never accept privileged fields.
export const validateProfileUpdates: RequestHandler = (req, res, next) => {
  const body = req.body;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length === 0 ||
    Object.keys(body).some(key => !allowedProfileFields.has(key)) ||
    Object.values(body).some(
      value => value !== null && typeof value !== "string"
    )
  ) {
    res.status(400).json({ message: "Invalid profile fields" });
    return;
  }
  req.body = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedProfileFields.has(key))
  );
  next();
};

// Mount before every user-management router, including password-setting routes.
// Reading users keeps its existing admin/worker checks in the underlying router.
export const requireAdminForUserWrites: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
};

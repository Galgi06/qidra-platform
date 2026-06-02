export type Role = "INVESTOR" | "ADMIN" | "SUPER_ADMIN";

export const appRoles = ["guest", "investor", "admin", "super_admin"] as const;

export const twoFactor = {
  enabled: process.env.ENABLE_2FA === "true",
  issuer: "Qidra"
};

export function canAccessAdmin(role?: Role | "guest") {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageManagers(role?: Role | "guest") {
  return role === "SUPER_ADMIN";
}

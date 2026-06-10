export type Role = "INVESTOR" | "TECH_SUPPORT" | "SALES_MANAGER" | "ADMIN" | "SUPER_ADMIN";

export const appRoles = ["guest", "investor", "tech_support", "sales_manager", "admin", "super_admin"] as const;

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

export function canAccessSupportDesk(role?: Role | "guest") {
  return role === "TECH_SUPPORT" || role === "SALES_MANAGER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canEditParticipantCards(role?: Role | "guest") {
  return role === "TECH_SUPPORT" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export type UserRole = "super_admin" | "admin" | "hr" | "office" | "driver" | "guest";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Owner / Admin",
  admin:       "Admin",
  hr:          "HR",
  office:      "Office Staff",
  driver:      "Driver",
  guest:       "Guest",
};

// Map roles from profiles.role to our internal role type
export function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return "guest";
  const r = raw.toLowerCase();
  if (r === "super_admin")  return "super_admin";
  if (r === "admin")        return "admin";
  if (r === "partner")      return "admin"; // partner = org admin
  if (r === "hr")           return "hr";
  if (r === "office")       return "office";
  if (r === "driver")       return "driver";
  return "guest";
}

const RULES: Record<string, UserRole[]> = {
  add_driver:        ["super_admin", "admin", "hr"],
  delete_driver:     ["super_admin", "admin"],
  edit_driver:       ["super_admin", "admin", "hr", "office"],
  suspend_driver:    ["super_admin", "admin", "hr"],
  send_login_invite: ["super_admin", "admin", "hr"],
  view_pay_summary:  ["super_admin", "admin", "hr"],
  view_pay_rate:     ["super_admin", "admin", "hr"],
  export_drivers:    ["super_admin", "admin", "hr", "office"],
  assign_load:       ["super_admin", "admin", "hr", "office"],
  assign_truck:      ["super_admin", "admin", "hr", "office"],
  upload_docs:       ["super_admin", "admin", "hr", "office"],
  view_all_drivers:  ["super_admin", "admin", "hr", "office"],
  view_history:      ["super_admin", "admin", "hr", "office"],
};

export function can(role: UserRole, action: string): boolean {
  return (RULES[action] ?? []).includes(role);
}

// What a driver sees depends on their own driver_id;
// higher roles see all. Used for table filtering.
export function driverSeesAll(role: UserRole): boolean {
  return role !== "driver" && role !== "guest";
}

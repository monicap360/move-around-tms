// lib/adminToken.ts
export const getAdminToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
export const setAdminToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token", token);
  }
};
export const clearAdminToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
  }
};
export const getAdminTokenExpiry = () =>
  typeof window !== "undefined" ? Number(localStorage.getItem("admin_token_expiry")) : 0;
export const setAdminTokenExpiry = (expiry: number) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token_expiry", String(expiry));
  }
};
export const isAdminTokenExpired = () => {
  const expiry = getAdminTokenExpiry();
  return expiry && Date.now() > expiry;
};

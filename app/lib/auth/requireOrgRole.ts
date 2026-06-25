// Dead duplicate: nothing imports this path — all callers use
// "@/lib/auth/requireOrgRole" (root lib/), which is the canonical, fixed module
// (awaited cookies(), user_id ProfileRecord). Re-export it so the two can never
// diverge and the mirror can't reintroduce the cutover-crash bug.
export * from "@/lib/auth/requireOrgRole";

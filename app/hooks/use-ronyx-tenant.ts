"use client";

import { useRonyxTenantContext } from "@/providers/ronyx-provider";

export function useRonyxTenant() {
  const context = useRonyxTenantContext();

  const features = Object.fromEntries(
    Object.entries(context.modules).map(([key, value]) => [key, value.enabled]),
  );

  return {
    company: { id: context.tenant.id, name: context.tenant.name },
    features,
    modules: context.modules,
    compliance: context.compliance,
  };
}

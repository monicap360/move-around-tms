"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { RonyxTenantConfig } from "@/src/tenant/ronyx/config";
import { RonyxTenantEntry } from "@/src/tenant/ronyx/entry";
import { RONYX_TENANT_CONFIG } from "@/src/tenant/ronyx/config";

type RonyxTenantContextValue = {
  tenant: {
    id: string;
    name: string;
    domain: string;
  };
  modules: RonyxTenantConfig["modules"];
  compliance: RonyxTenantConfig["compliance"];
};

const RonyxTenantContext = createContext<RonyxTenantContextValue | null>(null);

export function RonyxProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    RonyxTenantEntry.initializeRonyxTenant();
    setInitialized(true);
  }, [initialized]);

  const value = useMemo<RonyxTenantContextValue>(() => {
    return {
      tenant: {
        id: RONYX_TENANT_CONFIG.tenantId,
        name: RONYX_TENANT_CONFIG.tenantName,
        domain: RONYX_TENANT_CONFIG.domain,
      },
      modules: RONYX_TENANT_CONFIG.modules,
      compliance: RONYX_TENANT_CONFIG.compliance,
    };
  }, []);

  return (
    <RonyxTenantContext.Provider value={value}>
      {children}
    </RonyxTenantContext.Provider>
  );
}

export function useRonyxTenantContext() {
  const context = useContext(RonyxTenantContext);
  if (!context) {
    throw new Error("useRonyxTenantContext must be used within RonyxProvider");
  }
  return context;
}

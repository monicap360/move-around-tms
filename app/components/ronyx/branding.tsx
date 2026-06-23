"use client";

import Image from "next/image";
import { RONYX_CONFIG } from "@/shared/config/ronyx.config";

export function RonyxBranding() {
  return (
    <div className="ronyx-branding">
      <Image
        src={RONYX_CONFIG.branding.logo}
        alt="Ronyx logo"
        width={140}
        height={32}
        priority
      />
      <span className="ronyx-branding-name">{RONYX_CONFIG.branding.companyName}</span>
    </div>
  );
}

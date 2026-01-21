"use client";

import { useRonyxTenant } from "@/hooks/use-ronyx-tenant";
import RonyxLoadBoard from "@/components/ronyx/loads/load-board";
import RonyxDispatchSheet from "@/components/ronyx/loads/dispatch-sheet";

export default function RonyxLoadsPage() {
  const { tenant } = useRonyxTenant();

  if (tenant.id !== "ronyx") {
    return <div>Unauthorized access</div>;
  }

  return (
    <div className="ronyx-loads-dashboard">
      <h1 className="ronyx-heading">Ronyx Load Management</h1>

      <section>
        <h2>Active Loads</h2>
        <RonyxLoadBoard tenant="ronyx" />
      </section>

      <section>
        <h2>Available Loads</h2>
        <div className="ronyx-placeholder">Awaiting dispatch intake.</div>
      </section>

      <section>
        <h2>Dispatch Sheets</h2>
        <RonyxDispatchSheet tenant="ronyx" />
      </section>

      <div className="ronyx-disabled-module">
        PIT Module: Not available for Ronyx tenant
      </div>
    </div>
  );
}

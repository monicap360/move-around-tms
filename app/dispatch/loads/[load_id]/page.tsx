"use client";;
import { use } from "react";

import LoadDetail from "@/components/dispatch/LoadDetail";

export default function LoadDetailPage(props: any) {
  const params = use(props.params) as { load_id: string };
  return (
    <div style={{ padding: "24px 20px" }}>
      <LoadDetail loadId={params.load_id} />
    </div>
  );
}

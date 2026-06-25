"use client";;
import { use } from "react";

import LoadDetail from "@/components/dispatch/LoadDetail";

export default function LoadDetailPage(props: any) {
  const params = use(props.params) as { load_id: string };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Load Detail</h1>
      <LoadDetail loadId={params.load_id} />
    </div>
  );
}

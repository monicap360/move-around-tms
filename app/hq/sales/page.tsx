import HqShell from "../HqShell";
import SalesDashboard from "@/app/components/SalesDashboard";

export default function HqSalesPage() {
  return (
    <HqShell active="sales">
      <SalesDashboard apiPath="/api/hq/leads" title="TMS Sales Pipeline" subtitle="Every company you're selling MoveAround TMS to — first contact to close." scopeToUser />
    </HqShell>
  );
}

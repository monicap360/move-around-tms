import type { Metadata } from "next";
import Script from "next/script";
import { RonyxProvider } from "@/providers/ronyx-provider";
import { RonyxNavigation } from "@/components/ronyx/navigation";
import { RonyxBranding } from "@/components/ronyx/branding";

export const metadata: Metadata = {
  title: "Ronyx Transportation - MoveAroundTMS",
  description: "Transportation management for Ronyx aggregates business",
};

export default function RonyxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RonyxProvider>
      <div className="ronyx-theme">
        <RonyxBranding />
        <RonyxNavigation
          modules={[
            "loads",
            "finance",
            "tracking",
            "hr",
            "materials",
            "tickets",
            "dispatch",
            "fleet",
          ]}
          disabledModules={["pit"]}
        />
        <main className="ronyx-container">{children}</main>
        <Script src="/ronyx-analytics.js" strategy="afterInteractive" />
      </div>
    </RonyxProvider>
  );
}

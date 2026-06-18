// Central registry for MoveAround TMS official brand/module assets.
// Images live in public/brand/. Drop PNGs there — paths are referenced below.

export const brandAssets = {
  moveAroundTms: {
    name: "MoveAround TMS",
    src: "/brand/movearound-tms-logo.png",
    alt: "MoveAround TMS logo",
    fallback: "MoveAround TMS",
  },
  ccb: {
    name: "Carrier Clearance Bureau",
    src: "/brand/ccb-carrier-clearance-bureau-logo.png",
    alt: "CCB Carrier Clearance Bureau logo",
    fallback: "Carrier Clearance Bureau",
  },
  fastScanCertifiedScanner: {
    name: "Fast Scan Certified Scanner",
    src: "/brand/fast-scan-certified-scanner-logo.png",
    alt: "Fast Scan Certified Scanner logo",
    fallback: "Fast Scan Certified Scanner",
  },
} as const;

export type BrandAssetKey = keyof typeof brandAssets;

// Maps module slugs to brand asset keys so pages can auto-resolve logos.
export const MODULE_LOGO_MAP: Partial<Record<string, BrandAssetKey>> = {
  "fast-scan": "fastScanCertifiedScanner",
  "ccb":       "ccb",
};

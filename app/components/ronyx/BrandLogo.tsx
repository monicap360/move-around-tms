"use client";

import { useState } from "react";
import { brandAssets, BrandAssetKey } from "@/lib/brandAssets";
import CcbShieldLogo from "@/app/components/ronyx/CcbShieldLogo";

type Props = {
  asset: BrandAssetKey;
  maxHeight?: number;
  maxWidth?: number;
  style?: React.CSSProperties;
  fallbackStyle?: React.CSSProperties;
};

export default function BrandLogo({
  asset,
  maxHeight = 40,
  maxWidth,
  style,
  fallbackStyle,
}: Props) {
  const [failed, setFailed] = useState(false);
  const info = brandAssets[asset];

  // CCB uses an inline SVG — no PNG file needed.
  if (asset === "ccb") {
    return (
      <CcbShieldLogo
        height={maxHeight}
        style={{ maxWidth: maxWidth ?? "100%", display: "block", ...style }}
      />
    );
  }

  if (failed) {
    return (
      <span style={{
        fontSize: "0.82rem",
        fontWeight: 700,
        color: "#475569",
        letterSpacing: "0.01em",
        ...fallbackStyle,
      }}>
        {info.fallback}
      </span>
    );
  }

  return (
    <img
      src={info.src}
      alt={info.alt}
      onError={() => setFailed(true)}
      draggable={false}
      style={{
        maxHeight,
        maxWidth: maxWidth ?? "100%",
        width: "auto",
        objectFit: "contain",
        objectPosition: "left center",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

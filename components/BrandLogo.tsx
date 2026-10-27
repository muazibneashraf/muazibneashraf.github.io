import Image from "next/image";
import type { SiteSettings } from "@/lib/types";
import { imageCropStyle } from "@/lib/image-crop";

export function BrandLogo({ site, compact = false }: { site: SiteSettings; compact?: boolean }) {
  if (!compact && !site.logoUrl) return <span className="brand-lockup"><BrandLogo site={site} compact /><span className="brand-native-wordmark">{site.brand}<span>{site.brandAccent}</span></span></span>;
  const source = compact ? site.iconUrl : site.logoUrl;
  if (!source) return <span className="brand-text">{compact ? site.brand.slice(0, 1).toUpperCase() : `${site.brand}${site.brandAccent}`}</span>;
  return <span className={`brand-art${compact ? " brand-art--compact" : ""}`}>
    <Image src={source} alt={`${site.brand}${site.brandAccent}`} fill sizes={compact ? "64px" : "(max-width: 760px) 160px, 200px"} style={imageCropStyle(compact ? site.iconCrop : site.logoCrop)} unoptimized={source.startsWith("data:") || source.endsWith(".svg")} priority />
  </span>;
}

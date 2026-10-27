"use client";

import { usePathname } from "next/navigation";
import { SystemNarrativeBackground } from "./SystemNarrativeBackground";

export function PublicBackground() {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : <SystemNarrativeBackground />;
}

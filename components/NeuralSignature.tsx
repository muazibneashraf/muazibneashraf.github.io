"use client";

import { useEffect, useRef } from "react";
import type { SiteSettings } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";
import "./neural-finale.css";

export function NeuralSignature({ site }: { site: SiteSettings }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.dataset.assembled = "true"; observer.disconnect(); }
    }, { threshold: .6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="neural-signature" aria-hidden="true">
    <BrandLogo site={site} compact />
  </div>;
}

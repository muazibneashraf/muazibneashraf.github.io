"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import "./page-motion.css";

export function ProfileMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const bounds = useRef<DOMRect | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.dataset.profileVisible = "true";
        observer.disconnect();
      }
    }, { threshold: .12 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, []);
  const reset = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    ref.current?.style.setProperty("--profile-x", "0deg");
    ref.current?.style.setProperty("--profile-y", "0deg");
    bounds.current = null;
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motionPaused === "true") return;
    bounds.current ??= event.currentTarget.getBoundingClientRect();
    const rect = bounds.current;
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty("--profile-x", `${(-y * 2.6).toFixed(2)}deg`);
      ref.current?.style.setProperty("--profile-y", `${(x * 2.6).toFixed(2)}deg`);
    });
  };
  return <div ref={ref} className="education-card profile-motion" onPointerMove={move} onPointerLeave={reset}>
    {children}
  </div>;
}

export function PortraitFrameTrace() {
  return <svg className="portrait-frame-trace" viewBox="0 0 180 232" preserveAspectRatio="none" aria-hidden="true">
    <rect x="1" y="1" width="178" height="230" rx="12" pathLength="1" />
  </svg>;
}

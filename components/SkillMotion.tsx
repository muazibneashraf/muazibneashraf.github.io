"use client";

import { useEffect, useRef } from "react";
import "./section-visuals.css";

// CSS artwork stays mounted and pauses outside the viewport or with site motion.
export function useSceneMotion() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let sitePaused = document.documentElement.dataset.motionPaused === "true";
    const sync = () => { element.dataset.scenePaused = String(sitePaused || reduced.matches || document.hidden); };
    const onMotion = (event: Event) => {
      sitePaused = Boolean((event as CustomEvent<{ paused: boolean }>).detail?.paused);
      sync();
    };
    const rootObserver = new MutationObserver(() => {
      sitePaused = document.documentElement.dataset.motionPaused === "true";
      sync();
    });
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion-paused"] });
    const viewport = new IntersectionObserver(([entry]) => {
      element.dataset.sceneVisible = String(entry.isIntersecting);
    }, { threshold: .15 });
    viewport.observe(element);
    reduced.addEventListener("change", sync);
    window.addEventListener("muaz-motion-state", onMotion);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      viewport.disconnect(); rootObserver.disconnect();
      reduced.removeEventListener("change", sync);
      window.removeEventListener("muaz-motion-state", onMotion);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return ref;
}

export function SkillMotion({ kind = "", index = 0 }: { kind?: string; index?: number }) {
  const ref = useSceneMotion();
  const match = /language/i.test(kind) ? 0 : /web|back/i.test(kind) ? 1 : /data/i.test(kind) ? 2
    : /ai|machine|research/i.test(kind) ? 3 : /tool|deploy/i.test(kind) ? 4 : /foundation|computer|^cs/i.test(kind) ? 5 : index % 6;
  return <div ref={ref} className={`skill-motion section-scene skill-motion-${match}`} data-scene-visible="false" data-scene-paused="false" aria-hidden="true">
    <svg viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {match === 0 && <>
        <path className="sv-code-bracket" d="m27 15-15 15 15 15M93 15l15 15-15 15M67 10 53 50" />
        <path className="sv-code-line" d="M38 22h17M36 30h14M34 38h13M74 22h10M72 30h13M70 38h15" />
        <path className="sv-code-caret" d="M89 33v10" />
      </>}
      {match === 1 && <>
        <rect className="sv-panel" x="5" y="17" width="32" height="25" rx="5" /><path d="M12 47h18M21 42v5" />
        <rect className="sv-panel" x="83" y="7" width="31" height="46" rx="5" />
        {[17, 29, 41].map(y => <g key={y}><path d={`M90 ${y}h12`} opacity=".5" /><circle className="sv-status" cx="107" cy={y} r="1.5" fill="currentColor" stroke="none" /></g>)}
        <path className="sv-track" d="M37 25H83M83 36H37" />
        <path className="sv-request" d="M42 25h12m-4-4 4 4-4 4" />
        <path className="sv-response" d="M78 36H66m4-4-4 4 4 4" />
      </>}
      {match === 2 && <>
        {[0, 1, 2].map(i => <g key={i} className="sv-record" style={{ animationDelay: `${i * -.75}s` }}><rect x="7" y={11 + i * 15} width="30" height="10" rx="3" /><path d={`M13 ${16 + i * 15}h17`} opacity=".45" /></g>)}
        <path className="sv-track" d="M38 30H68" /><circle className="sv-data-dot" r="2.2" fill="currentColor" stroke="none" />
        <path className="sv-panel" d="M70 15C70 5 111 5 111 15V45C111 55 70 55 70 45Z" /><ellipse cx="90.5" cy="15" rx="20.5" ry="7" />
        <path className="sv-db-row" d="M70 29c0 10 41 10 41 0M70 42c0 10 41 10 41 0" />
      </>}
      {match === 3 && <>
        <g className="sv-neural-lines">{[11, 30, 49].flatMap((y, i) => [19, 41].map((next, j) => <path key={`${i}-${j}`} d={`M12 ${y} 46 ${next} 79 ${y} 108 30`} style={{ animationDelay: `${(i + j) * -.35}s` }} />))}</g>
        {[11, 30, 49].map((y, i) => <g key={y}><circle className="sv-neuron" cx="12" cy={y} r="3" style={{ animationDelay: `${i * -.4}s` }} /><circle className="sv-neuron" cx="79" cy={y} r="3" style={{ animationDelay: `${i * -.4 - .8}s` }} /></g>)}
        {[19, 41].map(y => <circle key={y} className="sv-neuron" cx="46" cy={y} r="3" />)}<circle className="sv-neuron" cx="108" cy="30" r="4" />
      </>}
      {match === 4 && <>
        <rect className="sv-panel" x="5" y="14" width="30" height="31" rx="5" /><path d="m12 23 5 5-5 5M21 34h7" />
        <path className="sv-track" d="M35 30H51V15H76V30H88" />
        <circle className="sv-deploy-dot" r="2.4" fill="currentColor" stroke="none" />
        <path className="sv-panel" d="M88 43V22a11 11 0 0 1 21-4 8 8 0 0 1 3 15v10Z" /><path className="sv-deploy-check" d="m94 31 5 5 9-11" />
        <path d="M55 48h20" opacity=".25" /><path className="sv-deploy-progress" d="M55 48h20" />
      </>}
      {match === 5 && <>
        <path className="sv-track" d="M60 13V26H24V44M60 26H96V44M60 26V47" />
        <path className="sv-tree-path" d="M60 13V26H24V44" pathLength="1" />
        <rect className="sv-panel" x="51" y="3" width="18" height="12" rx="3" />
        {[24, 60, 96].map((x, i) => <g key={x}><circle className="sv-tree-leaf" cx={x} cy="49" r="6" style={{ animationDelay: `${i * -.65}s` }} /><circle cx={x} cy="49" r="1" fill="currentColor" stroke="none" /></g>)}
      </>}
    </svg>
  </div>;
}

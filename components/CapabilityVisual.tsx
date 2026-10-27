"use client";

import { useSceneMotion } from "./SkillMotion";

export function CapabilityVisual({ kind = "", index = 0 }: { kind?: string; index?: number }) {
  const ref = useSceneMotion();
  const mode = /backend|server/i.test(kind) ? 0 : /connected|web|fullstack/i.test(kind) ? 1 : /ai|research/i.test(kind) ? 2 : index % 3;
  return <div ref={ref} className={`capability-visual section-scene capability-visual-${mode}`} data-scene-visible="false" data-scene-paused="false" aria-hidden="true">
    <svg viewBox="0 0 280 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path className="cv-baseline" d="M6 91H274" />
      {mode === 0 && <>
        <g className="cv-client"><rect className="sv-panel" x="10" y="27" width="48" height="41" rx="6" /><path d="m22 39 7 7-7 7M34 55h12" /></g>
        <path className="cv-route" d="M58 47H109M166 47H219" />
        <rect className="sv-panel" x="109" y="14" width="57" height="67" rx="8" />
        {[29, 46, 63].map((y, i) => <g key={y}><path d={`M121 ${y}h23`} opacity=".5" /><circle className="cv-server-status" cx="154" cy={y} r="2" fill="currentColor" stroke="none" style={{ animationDelay: `${i * -.65}s` }} /></g>)}
        <path className="sv-panel" d="M219 29c0-12 48-12 48 0v36c0 12-48 12-48 0Z" /><ellipse cx="243" cy="29" rx="24" ry="8" /><path d="M219 47c0 12 48 12 48 0" opacity=".45" />
        <circle className="cv-backend-packet" r="3" fill="currentColor" stroke="none" />
        <circle className="cv-backend-reply" r="2" fill="currentColor" stroke="none" />
      </>}
      {mode === 1 && <>
        <g className="cv-window cv-window-left"><rect className="sv-panel" x="12" y="17" width="88" height="62" rx="7" /><path d="M12 31h88" opacity=".4" /><circle cx="22" cy="24" r="1.5" fill="currentColor" /><path className="cv-sync-line" d="M26 44h59M26 53h40M26 62h52" /><rect x="76" y="60" width="12" height="9" rx="2" opacity=".4" /></g>
        <path className="cv-route" d="M100 48H180" /><circle className="cv-sync-orbit" cx="140" cy="48" r="17" /><path className="cv-sync-arrows" d="M132 44h16m-4-4 4 4-4 4M148 53h-16m4-4-4 4 4 4" />
        <g className="cv-window cv-window-right"><rect className="sv-panel" x="180" y="17" width="88" height="62" rx="7" /><path d="M180 31h88" opacity=".4" /><circle cx="190" cy="24" r="1.5" fill="currentColor" /><path className="cv-sync-line" d="M194 44h59M194 53h40M194 62h52" /><rect x="244" y="60" width="12" height="9" rx="2" opacity=".4" /></g>
      </>}
      {mode === 2 && <>
        <path className="sv-panel" d="M21 13h37l13 13v55H21Z" /><path d="M58 13v13h13M31 36h29M31 45h20M31 54h25M31 67h29" opacity=".5" />
        <path className="cv-scan" d="M26 27h39" /><path className="cv-route" d="M71 48H109M220 48H263" />
        <rect className="sv-panel" x="109" y="12" width="111" height="72" rx="10" />
        <g className="cv-neural-lines">{[29, 48, 67].flatMap((y, i) => [37, 59].map((next, j) => <path key={`${i}-${j}`} d={`M127 ${y} 163 ${next} 200 48`} style={{ animationDelay: `${(i + j) * -.35}s` }} />))}</g>
        {[29, 48, 67].map(y => <circle key={y} className="sv-neuron" cx="127" cy={y} r="3" />)}<circle className="sv-neuron" cx="163" cy="37" r="3" /><circle className="sv-neuron" cx="163" cy="59" r="3" /><circle className="sv-neuron" cx="200" cy="48" r="4" />
        <circle className="cv-research-output" cx="263" cy="48" r="5" /><circle className="cv-ai-packet" r="2.5" fill="currentColor" stroke="none" />
      </>}
    </svg>
  </div>;
}

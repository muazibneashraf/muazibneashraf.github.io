"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useSceneMotion } from "./SkillMotion";

const explanations = [
  "An uploaded report enters the document workflow.",
  "OCR isolates text regions and extracts the report’s fields.",
  "Extracted lab fields become a consistent, structured record.",
  "The proposed CNN + LSTM approach explores patterns in the structured data.",
  "The processed report is available for review within the application.",
];

function ResearchArtwork({ stage }: { stage: number }) {
  return <svg className="rs-artwork" viewBox="0 0 360 154" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g className="rs-art-grid" opacity=".12"><path d="M30 140H330M30 14V140M90 14V140M150 14V140M210 14V140M270 14V140M330 14V140" /><path d="M30 44H330M30 76H330M30 108H330" /></g>
    <g className="rs-art-scene" key={stage}>
      {stage === 0 && <>
        <path className="rs-paper" d="M132 12h77l23 23v108H124V20q0-8 8-8Z" /><path d="M209 12v23h23" opacity=".55" />
        <path d="M140 49h60M140 59h76M140 69h67M140 90h76M140 101h76M140 112h76M164 83v40M193 83v40M140 83h76v40h-76Z" opacity=".45" />
        <path className="rs-scanner-wash" d="M132 36H224V49H132Z" /><path className="rs-scanner" d="M116 49H240" />
        <path className="rs-scan-bracket" d="M104 27v-9h9M247 18h9v9M104 126v9h9M247 135h9v-9" />
      </>}
      {stage === 1 && <>
        <rect className="rs-paper" x="89" y="18" width="182" height="119" rx="9" />
        <g className="rs-ocr-tokens"><text x="110" y="48">WBC</text><text x="196" y="48">Hgb</text><text x="110" y="80">Na+</text><text x="196" y="80">K+</text><text x="110" y="112">PLT</text><text x="196" y="112">BUN</text></g>
        {[0, 1, 2].map(i => <g className="rs-token-box" key={i} style={{ animationDelay: `${i * .35}s` }}><rect x="102" y={30 + i * 32} width="63" height="25" rx="4" /><rect x="188" y={30 + i * 32} width="63" height="25" rx="4" /></g>)}
        <path className="rs-ocr-side" d="M58 37h12v77H58M290 37h12v77h-12" />
      </>}
      {stage === 2 && <>
        <rect className="rs-paper" x="58" y="25" width="244" height="106" rx="8" />
        <path d="M58 53H302M58 79H302M58 105H302M143 25V131M233 25V131" opacity=".35" />
        <g className="rs-table-head"><text x="75" y="43">FIELD</text><text x="159" y="43">VALUE</text><text x="246" y="43">UNIT</text></g>
        {[0, 1, 2].map(i => <g className="rs-table-record" key={i} style={{ animationDelay: `${i * -.55}s` }}><path d={`M76 ${66 + i * 26}h42M160 ${66 + i * 26}h52M250 ${66 + i * 26}h32`} /><circle cx="291" cy={66 + i * 26} r="2" fill="currentColor" stroke="none" /></g>)}
        <path className="rs-table-write" d="M58 53H302" />
      </>}
      {stage === 3 && <>
        <rect className="rs-neural-frame" x="45" y="16" width="270" height="122" rx="14" />
        <g className="rs-model-label"><text x="98" y="35" textAnchor="middle">CNN</text><text x="220" y="35" textAnchor="middle">LSTM</text></g>
        <g className="rs-neural-links">{[57, 82, 107].flatMap((y, i) => [65, 99].map((next, j) => <path key={`${i}-${j}`} d={`M73 ${y} 122 ${next} 177 ${y} 231 ${next} 284 82`} style={{ animationDelay: `${i * .18 + j * .25}s` }} />))}</g>
        {[73, 177].flatMap((x, i) => [57, 82, 107].map((y, j) => <circle key={`${x}-${y}`} className="rs-neuron" cx={x} cy={y} r="4" style={{ animationDelay: `${i * .6 + j * .18}s` }} />))}
        {[122, 231].flatMap((x, i) => [65, 99].map((y, j) => <circle key={`${x}-${y}`} className="rs-neuron" cx={x} cy={y} r="4" style={{ animationDelay: `${i * .6 + j * .18 + .3}s` }} />))}
        <circle className="rs-neuron" cx="284" cy="82" r="5" /><circle className="rs-neural-packet" r="2.6" fill="currentColor" stroke="none" />
        <path className="rs-chip-pins" d="M67 10v6M84 10v6M101 10v6M118 10v6M242 10v6M259 10v6M276 10v6M293 10v6M67 138v6M84 138v6M101 138v6M118 138v6M242 138v6M259 138v6M276 138v6M293 138v6" />
      </>}
      {stage === 4 && <>
        <rect className="rs-paper" x="112" y="12" width="126" height="130" rx="9" /><rect className="rs-review-header" x="142" y="6" width="66" height="15" rx="5" />
        {[0, 1, 2].map(i => <g className="rs-review-row" key={i} style={{ animationDelay: `${i * .3}s` }}><path d={`m128 ${48 + i * 26} 3 3 6-7`} /><path d={`M148 ${47 + i * 26}h66M148 ${54 + i * 26}h43`} opacity=".45" /></g>)}
        <circle className="rs-review-seal" cx="234" cy="111" r="22" /><path className="rs-review-check" d="m223 111 8 8 15-18" pathLength="1" />
      </>}
    </g>
  </svg>;
}

export function ResearchSequence({ steps, note }: { steps: string[]; note?: string }) {
  const ref = useSceneMotion();
  const [active, setActive] = useState(0);
  const interacting = useRef({ hover: false, focus: false });
  const id = useId();
  const current = Math.min(active, Math.max(steps.length - 1, 0));
  const setInteracting = (key: "hover" | "focus", value: boolean) => {
    interacting.current[key] = value;
    if (ref.current) ref.current.dataset.sceneInteracting = String(interacting.current.hover || interacting.current.focus);
  };

  useEffect(() => {
    const element = ref.current;
    if (!element || steps.length < 2) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      timer = undefined;
      if (element.dataset.sceneVisible === "true" && element.dataset.scenePaused !== "true" && element.dataset.sceneInteracting !== "true") {
        timer = setInterval(() => setActive(value => (value + 1) % steps.length), 2800);
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(element, { attributes: true, attributeFilter: ["data-scene-visible", "data-scene-paused", "data-scene-interacting"] });
    sync();
    return () => { clearInterval(timer); observer.disconnect(); };
  }, [steps.length, ref]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!offset && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : (index + offset + steps.length) % steps.length;
    setActive(next);
    ref.current?.querySelectorAll<HTMLButtonElement>(".rs-step")[next]?.focus();
  };

  if (!steps.length) return null;
  return <div ref={ref} className="research-sequence section-scene" data-scene-visible="false" data-scene-paused="false" data-research-stage={current}
    onPointerEnter={() => setInteracting("hover", true)} onPointerLeave={() => setInteracting("hover", false)}
    onFocusCapture={() => setInteracting("focus", true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting("focus", false); }}>
    <div className="rs-visual-stage"><ResearchArtwork stage={current % 5} /><span className="rs-stage-counter mono" aria-hidden="true">{String(current + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</span></div>
    <div className="rs-stage-list" role="group" aria-label="Choose a research stage">
      {steps.map((step, index) => <button className="rs-step flow-step" key={`${index}-${step}`} type="button" aria-pressed={index === current} aria-controls={`${id}-description`}
        onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} onKeyDown={event => move(event, index)}>
        <span className="rs-step-number mono">{String(index + 1).padStart(2, "0")}</span><span>{step}</span><span className="rs-step-mark" aria-hidden="true" />
      </button>)}
    </div>
    <p className="rs-description" id={`${id}-description`}>{explanations[current % 5]}</p>
    {note && <p className="rs-note mono">{note}</p>}
  </div>;
}

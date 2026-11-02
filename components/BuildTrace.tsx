"use client";

import { headingText } from "@/lib/editable-content";
import { getWalkthroughExample, getWalkthroughScenePhase } from "@/lib/walkthrough-examples";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Project, ContentSections } from "@/lib/types";
import { ProjectChooser } from "./ProjectChooser";
import { WalkthroughScene } from "./WalkthroughScene";
import { WalkthroughPreview } from "./WalkthroughPreview";
import "./walkthrough.css";

const STEP_DURATION = 4800;

export function BuildTrace({ projects, settings }: { projects: Project[]; settings: ContentSections["walkthrough"] }) {
  const available = useMemo(() => projects.filter(project => (project.walkthroughSteps?.length ?? 0) > 0), [projects]);
  const [selection, setSelection] = useState({ projectId: available[0]?.id, step: 0 });
  const [playing, setPlaying] = useState(false);
  const [inspectionKey, setInspectionKey] = useState<string | null>(null);
  const [motionBlocked, setMotionBlocked] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stageButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const stageId = useId();
  const projectIndex = Math.max(0, available.findIndex(project => project.id === selection.projectId));
  const project = available[projectIndex];
  const steps = project?.walkthroughSteps ?? [];
  const stepIndex = Math.min(selection.step, Math.max(0, steps.length - 1));
  const step = steps[stepIndex];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .15 });
    observer.observe(element);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const blocked = preference.matches || document.documentElement.dataset.motionPaused === "true" || document.hidden;
      setMotionBlocked(blocked);
      if (blocked) setPlaying(false);
    };
    sync();
    preference.addEventListener("change", sync);
    window.addEventListener("muaz-motion-state", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); preference.removeEventListener("change", sync); window.removeEventListener("muaz-motion-state", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  useEffect(() => {
    if (!playing || !visible || motionBlocked) return;
    const timer = window.setTimeout(() => {
      if (stepIndex === steps.length - 1) setPlaying(false);
      else setSelection(current => current.projectId === project?.id ? ({ ...current, step: stepIndex + 1 }) : current);
    }, STEP_DURATION);
    return () => window.clearTimeout(timer);
  }, [playing, visible, motionBlocked, stepIndex, steps.length, project?.id]);

  useEffect(() => {
    if (!project) return;
    window.dispatchEvent(new CustomEvent("muaz-trace-step", { detail: { step: stepIndex, project: project.id } }));
    const button = stageButtons.current[stepIndex];
    const list = button?.parentElement;
    if (!button || !list) return;
    const centerStage = () => {
      if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2, behavior: motionBlocked ? "instant" : "smooth" });
    };
    centerStage();
    const observer = new ResizeObserver(centerStage);
    observer.observe(list);
    return () => observer.disconnect();
  }, [project, stepIndex, motionBlocked]);

  if (!project || !step) return null;
  const example = getWalkthroughExample(project, step.title);
  const detail = step.detail || example?.description || settings.stepDetail.replaceAll("{project}", project.title);
  const tech = step.tech.length ? step.tech : project.stack?.slice(0, 3) ?? [];
  const accent = project.category === "AI / ML" ? "var(--lilac)" : project.id === "lifeline" ? "var(--coral)" : "var(--accent)";
  const inspectionId = `${project.id}-${step.id}`;
  const inspecting = inspectionKey === inspectionId;
  const active = playing && visible && !motionBlocked;
  const selectStep = (index: number) => { setInspectionKey(null); setPlaying(false); setSelection({ projectId: project.id, step: index }); };
  const stageKeyboard = (event: KeyboardEvent, index: number) => {
    let next: number | undefined;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % steps.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index - 1 + steps.length) % steps.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = steps.length - 1;
    if (next !== undefined) { event.preventDefault(); selectStep(next); stageButtons.current[next]?.focus({ preventScroll: true }); }
  };

  return <section id="trace" className="trace-section section-pad"><div className="site-wrap">
    <div className="section-heading trace-heading"><div><p className="eyebrow">{settings.eyebrow}</p><h2>{headingText(settings.title)}</h2></div><p className="trace-intro">{settings.intro}</p></div>
    <div ref={root} onKeyDown={event => { if (event.key === "Escape" && inspecting) { setInspectionKey(null); event.stopPropagation(); } }} className="walkthrough" data-visible={visible} data-playing={active} style={{ "--walk-accent": accent, "--step-duration": `${STEP_DURATION}ms` } as CSSProperties}>
      <div className="walk-toolbar"><ProjectChooser projects={available} selectedIndex={projectIndex} onSelect={index => { setInspectionKey(null); setPlaying(false); setSelection({ projectId: available[index].id, step: 0 }); }} /><span className="walk-toolbar-note mono">{String(steps.length).padStart(2, "0")} STAGES</span></div>
        <div className="walk-stage-list" role="tablist" aria-label="Workflow stages" aria-orientation="horizontal">
          {steps.map((item, index) => <button type="button" role="tab" id={`${stageId}-tab-${index}`} aria-controls={`${stageId}-panel`} aria-label={`${String(index + 1).padStart(2, "0")} ${item.title}`} aria-selected={index === stepIndex} tabIndex={index === stepIndex ? 0 : -1} ref={element => { stageButtons.current[index] = element; }} key={item.id} onClick={() => selectStep(index)} onKeyDown={event => stageKeyboard(event, index)} className="walk-stage" data-state={index === stepIndex ? "active" : index < stepIndex ? "passed" : "upcoming"}>
            <span className="walk-stage-number mono">{String(index + 1).padStart(2, "0")}</span><span className="walk-stage-title">{item.title}</span><span className="walk-stage-arrow" aria-hidden="true">{index < stepIndex ? "✓" : "↗"}</span>
          </button>)}
        </div>
      <div className="walk-body">
        <div className="walk-cinema" data-project={project.id} data-step={stepIndex} data-stage={step.title}>
          <div className="walk-scene-label mono"><span>{project.category}</span><span>WORKFLOW / {String(stepIndex + 1).padStart(2, "0")}</span></div>
          <div className="walk-scene-art" id={`${stageId}-inspection`} key={inspectionId}>
            {inspecting ? <div className="walk-inspector" role="region" aria-label="Step example" tabIndex={0}><WalkthroughPreview example={example} fallback={step.payload && step.payload !== "{}" ? step.payload : undefined} /></div> : <WalkthroughScene slug={project.slug} example={example} phase={getWalkthroughScenePhase(project, step.title)} />}
          </div>
        </div>
        <div className="walk-detail" id={`${stageId}-panel`} role="tabpanel" aria-labelledby={`${stageId}-tab-${stepIndex}`} tabIndex={0}><div className="walk-stage-content" key={`${project.id}-${step.id}`}>
          <p className="walk-chapter mono">THE PROCESS <span>{String(stepIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</span></p>
          <div className="walk-stage-heading"><h3>{step.title}</h3></div>
          <p className="walk-description">{detail}</p>
          <div className="walk-tech">{tech.map(item => <span key={item}>{item}</span>)}</div>
        </div></div>
      </div>
      <div className="walk-controls">
        <button className="walk-play" type="button" aria-label={playing ? "Pause walkthrough" : stepIndex === steps.length - 1 ? "Replay walkthrough" : "Play walkthrough"} aria-pressed={playing} disabled={motionBlocked} onClick={() => { setInspectionKey(null); if (!playing && stepIndex === steps.length - 1) setSelection({ projectId: project.id, step: 0 }); setPlaying(value => !value); }}><span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span><span>{playing ? "Pause" : stepIndex === steps.length - 1 ? "Replay" : "Play"}</span></button>
        <div className="walk-progress" aria-hidden="true">{steps.map((item, index) => <span data-complete={index < stepIndex} key={item.id}><i key={`${playing}-${visible}-${index === stepIndex}`} style={{ transform: index < stepIndex ? "scaleX(1)" : undefined, animationName: active && index === stepIndex ? "walk-play-progress" : undefined }} /></span>)}</div>
        <button type="button" className="walk-inspect-toggle" title={inspecting ? "Back to animation" : "Inspect this step"} aria-label={inspecting ? "Back to animation" : "Inspect this step"} aria-expanded={inspecting} aria-controls={`${stageId}-inspection`} onClick={() => { setPlaying(false); setInspectionKey(inspecting ? null : inspectionId); }}><span className="walk-inspect-label">{inspecting ? "Back to animation" : "Inspect this step"}</span><span className="walk-inspect-mobile" aria-hidden="true">{inspecting ? "Back" : "Inspect"}</span><span className="walk-inspect-icon" aria-hidden="true">{inspecting ? "↶" : "⌘"}</span></button>
        <div className="walk-step-controls"><button type="button" aria-label="Previous stage" disabled={stepIndex === 0} onClick={() => selectStep(stepIndex - 1)}>← <span>Previous</span></button><span className="mono">{stepIndex + 1} / {steps.length}</span><button type="button" aria-label="Next stage" disabled={stepIndex === steps.length - 1} onClick={() => selectStep(stepIndex + 1)}><span>Next</span> →</button></div>
      </div>
      <div className="walk-footer"><span>Illustrated workflow</span><Link href={`/projects/${project.slug}`}>{settings.linkLabel} <span className="walk-link-title">{project.title}</span> <span aria-hidden="true">↗</span></Link></div>
      <p className="sr-only" role="status">{project.title}: stage {stepIndex + 1} of {steps.length}, {step.title}.</p>
    </div>
  </div></section>;
}

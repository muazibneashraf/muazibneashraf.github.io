"use client";

import { headingText } from "@/lib/editable-content";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project, ContentSections } from "@/lib/types";

type TraceStep = {
  id: string;
  title: string;
  detail: string;
  tech: string[];
  payload?: Record<string, unknown>;
};

function getSteps(project: Project, fallback: string): TraceStep[] {
  return (project.walkthroughSteps ?? []).map(step => {
    let payload: Record<string, unknown> | undefined;
    try { if (step.payload.trim() && step.payload.trim() !== "{}") payload = JSON.parse(step.payload); } catch { /* Invalid draft data is never executed. */ }
    return { id: step.id, title: step.title, detail: step.detail || fallback.replaceAll("{project}", project.title), tech: step.tech.length ? step.tech : project.stack?.slice(0, 3) ?? [], payload };
  });
}

export function BuildTrace({ projects, settings }: { projects: Project[]; settings: ContentSections["walkthrough"] }) {
  const availableProjects = useMemo(
    () => projects.filter((project) => (project.walkthroughSteps?.length ?? 0) > 0),
    [projects],
  );
  const [projectIndex, setProjectIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const project = availableProjects[projectIndex];

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => {
      const nodes = [...element.querySelectorAll<HTMLButtonElement>(".trace-node")];
      const selected = nodes[Math.min(stepIndex, nodes.length - 1)];
      if (!selected || !nodes.length) return;
      const center = (node: HTMLElement) => node.offsetLeft + node.offsetWidth / 2;
      const start = center(nodes[0]), end = center(nodes[nodes.length - 1]), current = center(selected);
      const verticalCenter = selected.offsetTop + selected.offsetHeight / 2;
      element.style.setProperty("--trace-first", `${start}px`);
      element.style.setProperty("--trace-last", `${element.clientWidth - end}px`);
      element.style.setProperty("--trace-current", `${current}px`);
      element.style.setProperty("--trace-progress", `${current - start}px`);
      element.style.setProperty("--trace-rail-y", `${verticalCenter}px`);
      element.parentElement?.scrollTo({ left: current - element.parentElement.clientWidth / 2, behavior: "instant" });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [project, stepIndex]);

  useEffect(() => {
    if (typeof window !== "undefined" && project) {
      window.dispatchEvent(
        new CustomEvent("muaz-trace-step", {
          detail: { step: stepIndex, project: project.id },
        }),
      );
    }
  }, [stepIndex, project]);

  if (!availableProjects.length || !project) return null;

  const steps = getSteps(project, settings.stepDetail);
  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];

  const selectProject = (index: number) => {
    setProjectIndex(index);
    setStepIndex(0);
  };

  return (
    <section id="trace" className="trace-section section-pad">
      <div className="site-wrap">
        <div className="section-heading trace-heading">
          <div>
            <p className="eyebrow">{settings.eyebrow}</p>
            <h2>{headingText(settings.title)}</h2>
          </div>
          <p className="trace-intro">
            {settings.intro}
          </p>
        </div>

        <div className="trace-workbench">
          <div className="trace-toolbar">
            <div className="trace-window-controls" aria-hidden="true">
              <span className="dot-coral" />
              <span className="dot-lilac" />
              <span className="dot-cyan" />
            </div>
            <div className="trace-projects" aria-label="Choose a project">
              {availableProjects.map((item, index) => (
                <button
                  aria-pressed={index === projectIndex}
                  key={item.slug}
                  onClick={() => selectProject(index)}
                  type="button"
                >
                  {item.title}
                </button>
              ))}
            </div>
            <span className="trace-mode mono">{settings.modeLabel}</span>
          </div>

          <div className="trace-track-scroll"><div ref={track} className="trace-track" style={{gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, minWidth: steps.length * 105 + 40}}>
            <div className="trace-track-rail" aria-hidden="true" />
            <div
              className="trace-track-progress"
              aria-hidden="true"
            />
            {steps.map((item, index) => (
              <button
                aria-current={index === stepIndex ? "step" : undefined}
                className={`trace-node${index === stepIndex ? " selected" : ""}${index < stepIndex ? " visited" : ""}`}
                key={`${project.slug}-${item.id}`}
                onClick={() => setStepIndex(index)}
                type="button"
              >
                <span className="trace-node-number mono">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <span className="trace-node-state mono">
                  {index === stepIndex ? "INSPECTING" : index < stepIndex ? "PASSED" : "VIEW STAGE"}
                </span>
              </button>
            ))}
            <span
              className="trace-packet"
            >
              {settings.requestLabel}
            </span>
          </div></div>

          <div className="trace-inspector" aria-live="polite">
            <div className="trace-step-count mono">
              <span>STAGE</span>
              <strong>{String(stepIndex + 1).padStart(2, "0")}</strong>
              <span>OF {String(steps.length).padStart(2, "0")}</span>
            </div>
            <div className="trace-explanation" key={activeStep.title}>
              <p className="eyebrow">CURRENT STAGE</p>
              <h3>{activeStep.title}</h3>
              <p>{activeStep.detail}</p>
              {activeStep.tech.length > 0 && (
                <p className="trace-note mono">
                  {activeStep.tech.join(" · ")}
                </p>
              )}
              {activeStep.payload && (
                <div className="trace-payload-preview">
                  <div className="trace-payload-bar mono">
                    <span className="mint">◈ ILLUSTRATIVE STAGE SCHEMA</span>
                    <span>JSON</span>
                  </div>
                  <pre className="trace-payload-body mono">
                    <code>{JSON.stringify(activeStep.payload, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
            <div className="trace-controls">
              <button
                className="button secondary"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="button primary"
                disabled={stepIndex === steps.length - 1}
                onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                type="button"
              >
                Next step
              </button>
            </div>
          </div>

          <div className="trace-footer">
            <span>{project.category} · {project.role}</span>
            <Link href={`/projects/${project.slug}`}>{settings.linkLabel} {project.title}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

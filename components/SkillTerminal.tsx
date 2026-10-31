import Link from "next/link";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { Project } from "@/lib/types";
import { projectUsesSkill } from "@/lib/skill-evidence";
import "./skill-terminal.css";

type EvidenceProject = Pick<Project, "id" | "slug" | "title" | "category" | "stack"> & { walkthroughSteps?: { tech: string[] }[] };

export function SkillTerminal({ id, selected, projects }: { id: string; selected: string; projects: EvidenceProject[] }) {
  const related = selected ? projects.filter(project => projectUsesSkill(project, selected)) : [];
  const viewportRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);
  const previousHeight = useRef(0);
  useLayoutEffect(() => {
    const viewport = viewportRef.current, session = sessionRef.current;
    if (!viewport || !session) return;
    let animation: Animation | null = null;
    const measure = () => {
      const to = session.getBoundingClientRect().height;
      if (Math.abs(to - previousHeight.current) < .5) return;
      const from = animation ? viewport.getBoundingClientRect().height : previousHeight.current || to;
      animation?.cancel();
      previousHeight.current = to;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motionPaused === "true" || Math.abs(from - to) < .5) return;
      const current = viewport.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 420, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
      animation = current;
      current.finished.then(() => { if (animation === current) { current.cancel(); animation = null; } }).catch(() => {});
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(session);
    return () => { if (animation) previousHeight.current = viewport.getBoundingClientRect().height; animation?.cancel(); observer.disconnect(); };
  }, [selected]);
  const command = selected ? `projects "${selected}"` : "projects";
  return <div id={id} className="evidence-panel skills-terminal" role="region" aria-label="Projects by skill" data-selected-skill={selected}>
    <div className="skill-terminal-bar">
      <span className="skill-terminal-lights" aria-hidden="true"><i /><i /><i /></span>
      <span className="mono">C:\portfolio\projects</span>
      <span className="skill-terminal-shell mono">cmd</span>
    </div>
    <div ref={viewportRef} className="skill-terminal-viewport"><div ref={sessionRef} className="skill-terminal-session" key={selected || "idle"}>
      <div className="skill-terminal-command mono"><span>C:\portfolio&gt;</span><code style={{ "--command-steps": command.length } as CSSProperties}>{command}</code></div>
      <p className="skill-terminal-response">{selected ? related.length ? `${related.length} matching ${related.length === 1 ? "project" : "projects"}` : "No linked project for this skill yet." : `${projects.length} projects indexed.`}</p>
      {!selected && <p className="skill-terminal-idle-note">Select a skill to list its projects.<br />Select it again to reset.<br /><br />Click a result to open the project.</p>}
      {selected && <div className="skill-terminal-results">{related.map((project, index) => <Link href={`/projects/${project.slug}`} transitionTypes={["site-nav"]} key={project.id} className="skill-terminal-project" style={{ "--result-order": index } as CSSProperties}>
        <span className="skill-terminal-result-number mono" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <strong>{project.title}</strong><span className="skill-terminal-project-arrow" aria-hidden="true">↗</span>
      </Link>)}</div>}
      <div className="skill-terminal-ready mono" aria-hidden="true"><span>C:\portfolio&gt;</span><i /></div>
    </div></div>
    <span className="sr-only" role="status">{selected ? `${related.length} ${related.length === 1 ? "project uses" : "projects use"} ${selected}.` : "Choose a skill to show its projects."}</span>
  </div>;
}

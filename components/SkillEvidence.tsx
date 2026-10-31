"use client";

import { useId, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Project, SkillGroup } from "@/lib/types";
import { projectUsesSkill } from "@/lib/skill-evidence";
import "./skill-evidence.css";

type EvidenceProject = Pick<Project, "id" | "slug" | "title" | "category" | "stack"> & { walkthroughSteps?: { tech: string[] }[] };

export function SkillEvidence({ groups, projects }: { groups: SkillGroup[]; projects: EvidenceProject[] }) {
  const skills = [...new Set(groups.flatMap(group => group.items))];
  const [selected, setSelected] = useState("");
  const [activeGroup, setActiveGroup] = useState(() => groups.find(group => group.items.includes(selected))?.id ?? groups[0]?.id);
  const panelId = useId();
  const related = projects.filter(project => projectUsesSkill(project, selected));
  const mapHeight = Math.max(360, projects.length * 96);
  function select(skill: string) {
    const next = selected === skill ? "" : skill;
    setSelected(next);
    setActiveGroup(groups.find(group => group.items.includes(skill))?.id ?? "");
    if (next) window.dispatchEvent(new CustomEvent("muaz-skill-select", { detail: { skill: next, projectIds: projects.filter(project => projectUsesSkill(project, next)).map(project => project.id) } }));
  }
  if (!skills.length) return null;
  return <div className="skill-evidence" onKeyDown={event => { if (event.key === "Escape" && selected) { event.preventDefault(); setSelected(""); } }}>
    <div className="skill-catalog">
      <p className="evidence-instruction">Follow a skill into the work.</p>
      <div className="skill-mobile-families" aria-label="Skill categories">{groups.filter(group => group.items.length).map(group => <button type="button" key={group.id} aria-pressed={activeGroup === group.id} onClick={() => { setActiveGroup(group.id); if (!group.items.includes(selected)) setSelected(""); }}>{group.name}</button>)}</div>
      {groups.filter(group => group.items.length).map((group, i) => <div className="skill-family" data-active={activeGroup === group.id} key={group.id} style={{ "--family-accent": `var(${i % 3 === 1 ? "--blue" : i % 3 === 2 ? "--lilac" : "--accent"})` } as CSSProperties}>
        <h3><span className="skill-family-node" aria-hidden="true" />{group.name}</h3>
        <div className="skill-options">{group.items.map(skill => <button key={skill} type="button" aria-pressed={selected === skill} aria-controls={panelId} onClick={() => select(skill)}>
          {skill}{projects.some(project => projectUsesSkill(project, skill)) && <span className="skill-has-evidence" aria-label=" — linked to project work" />}
        </button>)}</div>
      </div>)}
    </div>
    <div id={panelId} className="evidence-panel">
      <div className="evidence-panel-heading"><span className="mono">IN THE WORK</span><span className="evidence-count mono" aria-live="polite">{selected ? `${related.length} ${related.length === 1 ? "connection" : "connections"}` : "Explore projects"}</span></div>
      <div className="evidence-map" style={{ "--evidence-map-height": `${mapHeight}px` } as CSSProperties} data-selected-skill={selected}>
        <svg viewBox={`0 0 600 ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
          {projects.map((project, i) => {
            const y = (i + .5) * mapHeight / projects.length;
            const active = projectUsesSkill(project, selected);
            const d = `M210 ${mapHeight / 2}C280 ${mapHeight / 2} 280 ${y} 348 ${y}`;
            return <g key={project.id} data-connected={active}><path className="evidence-edge" d={d} /><path key={`${project.id}-${selected}`} className="evidence-pulse" d={d} pathLength="1" style={{ animationDelay: `${i * .12}s` }} /></g>;
          })}
        </svg>
        <div className="evidence-source"><span className="evidence-source-halo" aria-hidden="true" /><span className="mono">{selected ? "SKILL" : "SKILLS"}</span><strong>{selected || "Explore"}</strong></div>
        <div className="evidence-destinations">{projects.map(project => <Link href={`/projects/${project.slug}`} transitionTypes={["site-nav"]} key={project.id} className="evidence-project" data-connected={projectUsesSkill(project, selected)}>
          <span className="evidence-project-node" aria-hidden="true" /><span><small>{project.category}</small><strong>{project.title}</strong></span><span aria-hidden="true">↗</span>
        </Link>)}</div>
      </div>
      <div className="evidence-caption" aria-live="polite" aria-atomic="true"><strong>{selected || "Choose a skill"}</strong><p>{!selected ? "Select a technology to see where I've used it. You can also open any project." : related.length ? `Used in ${related.map(project => project.title).join(", ")}. Follow a connection to explore the project.` : "Part of my broader toolkit. Explore the projects to see the technologies I've put into practice."}</p></div>
    </div>
  </div>;
}

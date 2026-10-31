"use client";

import { useId, useState, type CSSProperties } from "react";
import type { Project, SkillGroup } from "@/lib/types";
import { projectUsesSkill } from "@/lib/skill-evidence";
import { SkillTerminal } from "./SkillTerminal";
import "./skill-evidence.css";

type EvidenceProject = Pick<Project, "id" | "slug" | "title" | "category" | "stack"> & { walkthroughSteps?: { tech: string[] }[] };

export function SkillEvidence({ groups, projects }: { groups: SkillGroup[]; projects: EvidenceProject[] }) {
  const skills = [...new Set(groups.flatMap(group => group.items))];
  const [selected, setSelected] = useState("");
  const [activeGroup, setActiveGroup] = useState(() => groups.find(group => group.items.includes(selected))?.id ?? groups[0]?.id);
  const panelId = useId();
  function select(skill: string) {
    const next = selected === skill ? "" : skill;
    setSelected(next);
    setActiveGroup(groups.find(group => group.items.includes(skill))?.id ?? "");
    if (next) window.dispatchEvent(new CustomEvent("muaz-skill-select", { detail: { skill: next, projectIds: projects.filter(project => projectUsesSkill(project, next)).map(project => project.id) } }));
  }
  if (!skills.length) return null;
  return <div className="skill-evidence" onKeyDown={event => { if (event.key === "Escape" && selected) { event.preventDefault(); setSelected(""); } }}>
    <div className="skill-catalog">
      <p className="evidence-instruction">Choose a skill to see where I&apos;ve used it.</p>
      <div className="skill-mobile-families" aria-label="Skill categories">{groups.filter(group => group.items.length).map(group => <button type="button" key={group.id} aria-pressed={activeGroup === group.id} onClick={() => { setActiveGroup(group.id); if (!group.items.includes(selected)) setSelected(""); }}>{group.name}</button>)}</div>
      {groups.filter(group => group.items.length).map((group, i) => <div className="skill-family" data-active={activeGroup === group.id} key={group.id} style={{ "--family-accent": `var(${i % 3 === 1 ? "--blue" : i % 3 === 2 ? "--lilac" : "--accent"})` } as CSSProperties}>
        <h3>{group.name}</h3>
        <div className="skill-options">{group.items.map(skill => <button key={skill} type="button" aria-pressed={selected === skill} aria-controls={panelId} onClick={() => select(skill)}>
          {skill}
        </button>)}</div>
      </div>)}
    </div>
    <SkillTerminal id={panelId} selected={selected} projects={projects} />
  </div>;
}

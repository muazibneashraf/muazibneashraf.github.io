"use client";
import type {} from "react/canary";
import { addTransitionType, startTransition, useState, ViewTransition } from "react";
import type { Project, ContentSections } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";
export function ProjectsArchive({ projects, labels }: { projects: Project[]; labels: ContentSections["projectPage"] }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", ...new Set(projects.map((p) => p.category))];
  const filtered = projects.filter(
    (p) => filter === "All" || p.category === filter,
  );
  function selectFilter(next: string) {
    startTransition(() => {
      addTransitionType("project-filter");
      setFilter(next);
    });
  }
  return (
    <>
      <div className="project-filters" aria-label="Filter projects">
        {filters.map((f) => (
          <button
            key={f}
            aria-pressed={f === filter}
            onClick={() => selectFilter(f)}
          >
            {f === filter && <ViewTransition name="project-filter-selection" default="none" share="project-filter-selection"><span className="project-filter-indicator" aria-hidden="true" /></ViewTransition>}
            <span className="project-filter-label">{f === "All" ? "All categories" : f}</span>
            <span className="project-filter-count">
              {f === "All"
                ? projects.length
                : projects.filter((p) => p.category === f).length}
            </span>
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {filtered.length} projects shown
      </p>
      <div className="project-grid project-filter-grid" data-filter={filter}>
        {filtered.map((p, i) => (
          <ViewTransition key={p.id} default="none"
            enter={{ "project-filter": "project-filter-enter", default: "none" }}
            exit={{ "project-filter": "project-filter-exit", default: "none" }}
            update={{ "project-filter": "project-filter-move", default: "none" }}
          ><ProjectCard project={p} index={i} labels={labels} /></ViewTransition>
        ))}
      </div>
      {!filtered.length && (
        <p className="archive-empty">
          No projects are available in this category.
        </p>
      )}
    </>
  );
}

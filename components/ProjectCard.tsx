"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Project, ContentSections } from "@/lib/types";
import { ProjectVisual } from "./ProjectVisual";
import { ProjectTransition } from "./ProjectTransition";

export function ProjectCard({ project, labels }: { project: Project; labels: ContentSections["projectPage"]; index?: number }) {
  const href = "/projects/" + project.slug;
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => { card.dataset.motionVisible = String(entry.isIntersecting); }, { rootMargin: "100px 0px" });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;

    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (selection && selection.toString().length > 0) return;

    const titleLink = e.currentTarget.querySelector<HTMLAnchorElement>(".project-title-link");
    if (titleLink) {
      titleLink.click();
    }
  };

  return (
    <article ref={cardRef} className="project-card" onClick={handleCardClick}>
      <ProjectTransition slug={project.slug} part="art"><Link
        className="project-image-link"
        href={href}
        transitionTypes={["project-open"]}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProjectVisual project={project} />
      </Link></ProjectTransition>
      <div className="project-card-copy">
        <ProjectTransition slug={project.slug} part="title"><h3>
          <Link className="project-title-link" href={href} transitionTypes={["project-open"]}>{project.title}</Link>
        </h3></ProjectTransition>
        <p className="project-role">{project.role}</p>
        <p>{project.summary}</p>
        <div className="tags">
          {project.stack?.slice(0, 4).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="project-links">
          <Link href={href} transitionTypes={["project-open"]}>{labels.explore}</Link>
          {project.repository && (
            <a
              href={project.repository}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Source code
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

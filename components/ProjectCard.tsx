import Link from "next/link";
import type { Project, ContentSections } from "@/lib/types";
import { ProjectVisual } from "./ProjectVisual";
import { ProjectTransition } from "./ProjectTransition";
export function ProjectCard({ project, labels }: { project: Project; labels: ContentSections["projectPage"]; index?: number }) {
  const href = "/projects/" + project.slug;
  return (
    <article className="project-card">
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
          <Link href={href} transitionTypes={["project-open"]}>{project.title}</Link>
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
            <a href={project.repository} target="_blank" rel="noreferrer">
              Source code
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

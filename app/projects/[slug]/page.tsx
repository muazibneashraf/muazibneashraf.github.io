import { headingText } from "@/lib/editable-content";
import { CroppedImage } from "@/components/CroppedImage";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/SiteFrame";
import { ProjectVisual } from "@/components/ProjectVisual";
import { ProjectTransition } from "@/components/ProjectTransition";
import { getContent } from "@/lib/content-store";
export const revalidate = 0;
export async function generateStaticParams() {
  const c = await getContent();
  return c.projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getContent();
  const p = c.projects.find((p) => p.slug === slug);
  return p
    ? {
        title: p.title,
        description: p.summary,
        openGraph: { title: p.title, description: p.summary, images: [] },
        twitter: {
          card: "summary",
          title: p.title,
          description: p.summary,
          images: [],
        },
      }
    : {};
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await getContent();
  const index = content.projects.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  const project = content.projects[index];
  const labels = content.sections.projectPage;
  const next = content.projects[(index + 1) % content.projects.length];
  return (
    <SiteFrame content={content}>
      <article className="project-detail wrap">
        <Link className="back-link mono" href="/projects" transitionTypes={["project-return"]}>
          ALL PROJECTS
        </Link>
        <header className="page-intro">
          <p className="eyebrow">
            {[project.category, project.year].filter(Boolean).join(" / ")}
          </p>
          <ProjectTransition slug={project.slug} part="title"><h1>{headingText(project.title)}</h1></ProjectTransition>
          <p>{project.summary}</p>
          <div className="detail-actions">
            {project.repository && (
              <a
                href={project.repository}
                target="_blank"
                rel="noreferrer"
                className="button primary"
              >
                {labels.source}
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                {labels.live}
              </a>
            )}
          </div>
        </header>
        <div className="detail-visual">
          <ProjectTransition slug={project.slug} part="art"><div className="detail-shared-art"><ProjectVisual project={project} /></div></ProjectTransition>
          <p className="mono">
            {project.cover ? "Project image" : "Workflow illustration"}
          </p>
        </div>
        <div className="project-overview">
          <aside>
            <div>
              <span className="eyebrow">{labels.role}</span>
              <p>{project.role}</p>
            </div>
            <div>
              <span className="eyebrow">{labels.technologies}</span>
              <div className="tags">
                {project.stack?.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
            {project.credits.map((c) => (
              <div key={c.label}>
                <span className="eyebrow">{c.label}</span>
                <p>{c.value}</p>
              </div>
            ))}
          </aside>
          <div className="project-narrative">
            <section>
              <h2>{labels.overview}</h2>
              <p>{project.description}</p>
            </section>
            <section>
              <h2>{labels.challenge}</h2>
              <p>{project.challenge}</p>
            </section>
            <section>
              <h2>{labels.contribution}</h2>
              <ul>
                {project.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
            {project.gallery.length > 0 && (
              <section className="project-gallery">
                <h2>{labels.gallery}</h2>
                {project.gallery.map((src, i) => (
                  <CroppedImage
                    key={i}
                    src={src}
                    crop={project.galleryCrops?.[i]}
                    alt={`${project.title} image ${i + 1}`}
                    loading="lazy"
                  />
                ))}
              </section>
            )}
            <section className="project-context">
              <h2>{labels.context}</h2>
              <p>{project.limitations}</p>
            </section>
          </div>
        </div>
        <Link className="next-project" href={"/projects/" + next.slug} transitionTypes={["project-open"]}>
          <div>
            <span className="eyebrow">{labels.next}</span>
            <h2>{next.title}</h2>
          </div>
          
        </Link>
      </article>
    </SiteFrame>
  );
}

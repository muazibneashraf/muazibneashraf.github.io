import { headingText } from "@/lib/editable-content";
import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { ProjectsArchive } from "@/components/ProjectsArchive";
import { ContactSection } from "@/components/PortfolioSections";
import { getContent } from "@/lib/content-store";
export async function generateMetadata(): Promise<Metadata> { const content = await getContent(); return { title: content.sections.projectsPage.title.replace(/\.$/, ''), description: content.sections.projectsPage.intro }; }
export default async function Projects() {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <section className="page-intro wrap">
        <p className="eyebrow">{content.sections.projectsPage.eyebrow}</p>
        <h1>{headingText(content.sections.projectsPage.title)}</h1>
        <p>
          {content.sections.projectsPage.intro}
        </p>
      </section>
      <section className="archive-section wrap">
        <ProjectsArchive projects={content.projects} labels={content.sections.projectPage} />
      </section>
      <ContactSection content={content} />
    </SiteFrame>
  );
}

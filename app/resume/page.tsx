import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { ResumeLink } from "@/components/ResumeOverlay";
import { getContent } from "@/lib/content-store";

export async function generateMetadata(): Promise<Metadata> {
  const { identity, site } = await getContent();
  return { title: site.navigation.resume, description: `View ${identity.name}’s CV, projects, technical skills, and education.` };
}

export default async function Resume() {
  const content = await getContent();
  const url = content.identity.resumeUrl;
  return <SiteFrame content={content} openResume>
    <section className="resume-page wrap">
      <header className="resume-toolbar">
        <div>
          <p className="eyebrow">RÉSUMÉ</p>
          <h1>{content.identity.name}</h1>
          <p>{content.identity.role} · {content.identity.university}</p>
        </div>
        <div className="resume-actions">
          <ResumeLink className="button secondary">View résumé</ResumeLink>
          <a className="button primary" href={url} download>Download CV (PDF)</a>
        </div>
      </header>
      <p className="resume-note">Read the CV in the site preview, or download the original PDF.</p>
    </section>
  </SiteFrame>;
}

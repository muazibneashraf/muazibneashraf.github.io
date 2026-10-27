import { SiteFrame } from "@/components/SiteFrame";
import { Hero } from "@/components/Hero";
import { TechMarquee } from "@/components/TechMarquee";
import { BuildTrace } from "@/components/BuildTrace";
import { Capabilities } from "@/components/Capabilities";
import { JobExperienceSection } from "@/components/JobExperienceSection";
import {
  WorkSection,
  AboutSection,
  SkillsSection,
  ResearchSection,
  ExperienceSection,
  ContactSection,
} from "@/components/PortfolioSections";
import { getContent } from "@/lib/content-store";
export default async function Home() {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <Hero content={content} />
      {content.home.marquee.length > 0 && <div className="stack-section">
        <div className="stack-captions">
          <p className="mono stack-strip-lead">{content.hero.marqueeLead}</p>
          <p className="mono mint stack-strip-trail">{content.hero.marqueeTrail}</p>
        </div>
        <div className="stack-strip"><TechMarquee items={content.home.marquee} /></div>
      </div>}
      <AboutSection content={content} />
      <SkillsSection content={content} />
      <WorkSection content={content} />
      <BuildTrace projects={content.projects} settings={content.sections.walkthrough} />
      <ResearchSection content={content} />
      <JobExperienceSection content={content} />
      <ExperienceSection content={content} />
      <Capabilities content={content} />
      <ContactSection content={content} />
    </SiteFrame>
  );
}

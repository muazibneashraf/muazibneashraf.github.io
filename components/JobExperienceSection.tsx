import Link from "next/link";
import type { SiteContent } from "@/lib/types";
import { SectionHeading } from "./PortfolioSections";
import { CroppedImage } from "./CroppedImage";

export function JobExperienceSection({ content, standalone = false }: { content: SiteContent; standalone?: boolean }) {
  const experience = content.internship;
  return <section id="job-experience" className="section job-experience-section wrap">
    <SectionHeading eyebrow={experience.eyebrow} title={experience.title} as={standalone ? "h1" : "h2"}
      extra={!standalone && <Link className="text-link" href="/experience">{experience.linkLabel}</Link>} />
    {experience.intro && <p className="section-lede">{experience.intro}</p>}
    {experience.items.length ? <div className="experience-list">
      {experience.items.map((item, index) => <article className="experience-row job-experience-row" key={item.id}>
        <span className="experience-index mono">{String(index + 1).padStart(2, "0")}</span>
        <div><h3>{item.role}</h3><p>{item.company}</p>
          {item.overview && <p className="experience-description">{item.overview}</p>}
          {item.cover && <CroppedImage className="experience-photo" src={item.cover} crop={item.coverCrop} alt={item.company} loading="lazy" />}
          {item.learnings.length > 0 && <ul className="job-achievements">{item.learnings.map(outcome => <li key={outcome.id}><strong>{outcome.title}</strong>{outcome.description && <> — {outcome.description}</>}</li>)}</ul>}
        </div>
        <span className="experience-date mono">{item.period}</span>
      </article>)}
    </div> : <p className="muted">{experience.emptyText}</p>}
  </section>;
}

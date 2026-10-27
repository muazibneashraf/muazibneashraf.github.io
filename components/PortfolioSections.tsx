import { headingText } from "@/lib/editable-content";
import { ResumeLink } from "@/components/ResumeOverlay";
import Link from "next/link";
import Image from "next/image";
import type { SiteContent } from "@/lib/types";
import { gmailComposeUrl } from "@/lib/gmail";
import { Reveal } from "./Reveal";
import { ProjectCard } from "./ProjectCard";
import { CopyEmail } from "./CopyEmail";
import { AboutDetails } from "./AboutDetails";
import { CroppedImage } from "./CroppedImage";
import { ProfileMotion, PortraitFrameTrace } from "./ProfileMotion";
import { SkillMotion } from "./SkillMotion";
import { ResearchSequence } from "./ResearchSequence";

export function SectionHeading({
  eyebrow,
  title,
  extra,
  as: Component = "h2",
}: {
  number?: string;
  eyebrow: string;
  title: string;
  extra?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <Component>{headingText(title)}</Component>
      </div>
      {extra}
    </div>
  );
}

export function WorkSection({ content }: { content: SiteContent }) {
  const projects = content.projects.filter((project) => project.featured);
  return (
    <section id="work" className="section work-section wrap">
      <SectionHeading
        eyebrow={content.sections.work.eyebrow}
        title={content.sections.work.title}
        extra={
          <Link className="text-link" href="/projects">
            {content.sections.work.actionLabel}
          </Link>
        }
      />
      {content.sections.work.intro && <p className="section-lede">{content.sections.work.intro}</p>}
      <div className="project-grid featured-project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} labels={content.sections.projectPage} />
        ))}
      </div>
    </section>
  );
}

export function AboutSection({
  content,
  standalone = false,
}: {
  content: SiteContent;
  standalone?: boolean;
}) {
  const education = Object.fromEntries(
    content.about.education.map((item) => [item.label, item.value]),
  );
  const story = content.about.story.slice(0, 1);
  const Heading = standalone ? "h1" : "h2";
  return (
    <section
      id="about"
      className={`section about-section wrap ${standalone ? "about-section--full" : "about-section--compact"}`}
    >
      <div className="about-grid">
        <div className="about-copy">
          <p className="eyebrow about-eyebrow">{content.about.eyebrow}</p>
          <div className="section-heading"><div><Heading>{headingText(content.about.title)}</Heading></div></div>
          <p className="large-copy">{content.about.lede}</p>
          {story.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {content.about.statement && (
            <blockquote className="about-statement">
              {content.about.statement}
            </blockquote>
          )}
          <AboutDetails
            story={content.about.story.slice(1)}
            languages={content.about.languages}
            languagesLabel={content.about.languagesLabel}
          />
        </div>
        <ProfileMotion>
          <figure className="about-portrait">
            <div className="about-portrait-frame">
            {content.about.portraitUrl ? (
              <CroppedImage
                className="about-portrait-image"
                src={content.about.portraitUrl}
                crop={content.about.portraitCrop}
                alt=""
                width={1106}
                height={1422}
                loading="lazy"
              />
            ) : (
              <Image
                className="about-portrait-image"
                src="/portrait.webp"
                alt=""
                width={1106}
                height={1422}
                sizes="(max-width: 600px) 136px, (max-width: 850px) 160px, (max-width: 1100px) 144px, 180px"
              />
            )}
            <PortraitFrameTrace />
            </div>
            <figcaption className="about-portrait-caption">
              <strong>{content.identity.name}</strong>
              <span>{content.identity.role}</span>
              <span className="mono">{content.identity.location}</span>
            </figcaption>
          </figure>
          <div className="education-head">
            <span className="mono">{content.about.educationLabel}</span>
            <span className="mint" aria-hidden="true">⌘</span>
          </div>
          <div className="education-journey">
          <div className="education-degree-row education-milestone">
            <h3>{education.Degree}</h3>
            <span className="degree-date mono">{education.Graduation}</span>
          </div>
          <p className="mint">
            {education.Department}
          </p>
          <p>{education.University || content.identity.university}</p>
          {content.about.education
            .filter(
              (item) =>
                !["Degree", "University", "Department", "Graduation"].includes(
                  item.label,
                ),
            )
            .map((item, i) => (
              <p key={i}>
                <strong>{item.label}:</strong> {item.value}
              </p>
            ))}
          <div className="education-prior">
            {content.about.previousEducation.map(item => <div className="education-entry education-milestone" key={item.id}>
              <div><strong>{item.title}</strong><span>{item.period}</span></div>
              <p>{item.institution}{item.detail && ' · ' + item.detail}</p>
            </div>)}
          </div>
          </div>
          <div className="education-resume-row">
            <ResumeLink className="text-link">
              {content.about.resumeLabel}
            </ResumeLink>
          </div>
        </ProfileMotion>
      </div>
    </section>
  );
}

export function SkillsSection({ content }: { content: SiteContent }) {
  const groups = content.sections.skills.groups;
  return (
    <section id="skills" className="section skills-section wrap">
      <SectionHeading
        eyebrow={content.sections.skills.eyebrow}
        title={content.sections.skills.title}
      />
      {content.sections.skills.intro && <p className="section-lede">{content.sections.skills.intro}</p>}
      <div className="skills-grid">
        {groups
          .filter((group) => group.items.length)
          .map((group, index) => (
            <div className="skill-group" key={group.id}>
              <SkillMotion kind={group.id} index={index} />
              <h3>{group.name}</h3>
              <div className="skill-items">
                {group.items.map((skill) => (
                  <span key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

export function ResearchSection({ content }: { content: SiteContent }) {
  const thesis = content.projects.find((p) => p.id === content.sections.research.projectId);
  if (!thesis) return null;
  return (
    <section id="research" className="section research-section wrap">
      <SectionHeading eyebrow={content.sections.research.eyebrow} title={content.sections.research.title} />
      {content.sections.research.intro && <p className="section-lede">{content.sections.research.intro}</p>}
      <div className="research-panel">
        <div className="research-copy">
          <span className="research-badge mono">{content.sections.research.badge}</span>
          <h3>{thesis.title}</h3>
          <p className="research-subtitle">
            {content.sections.research.subtitle}
          </p>
          <p className="muted">{thesis.summary}</p>
          <div className="research-meta-tags mono" aria-label="Thesis technical focus">
            {content.sections.research.tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
          <Link href={"/projects/" + thesis.slug} className="text-link">
            {content.sections.research.linkLabel}
          </Link>
        </div>
        <div className="research-flow">
          <div className="flow-header">
            <p className="mono flow-label">{content.sections.research.flowLabel}</p>
            <span className="flow-live-pill mono" aria-hidden="true">{thesis.flow?.length ?? 0} STAGES</span>
          </div>
          <ResearchSequence steps={thesis.flow ?? []} note={content.sections.research.note} />
        </div>
      </div>
    </section>
  );
}

export function ExperienceSection({
  content,
  standalone = false,
}: {
  content: SiteContent;
  standalone?: boolean;
}) {
  return (
    <section
      id="experience"
      className={
        standalone ? "section wrap" : "section experience-section wrap"
      }
    >
      <SectionHeading
        eyebrow={content.extracurricular.eyebrow}
        title={content.extracurricular.title}
        as={standalone ? "h1" : "h2"}
      />
      <p className="section-lede">{content.extracurricular.intro}</p>
      <div className="experience-list">
        {content.extracurricular.items.map((e, i) => (
          <Reveal key={e.id}>
            <article className="experience-row">
              <span className="experience-index mono">0{i + 1}</span>
              <div>
                <h3>{e.role}</h3>
                <p>{e.title}</p>
                {e.description && (
                  <p className="experience-description">{e.description}</p>
                )}
                {e.image && (
                  <CroppedImage
                    src={e.image}
                    crop={e.imageCrop}
                    alt={e.title}
                    className="experience-photo"
                    loading="lazy"
                  />
                )}
              </div>
              <span className="experience-date mono">{e.year}</span>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ContactSection({ content }: { content: SiteContent }) {
  const [first, ...rest] = content.contact.title.split("\n");
  return (
    <section id="contact" className="section contact-section wrap">
      <p className="eyebrow">{content.contact.eyebrow}</p>
      <div className="contact-heading">
        <h2>
          {first}
          {rest.length > 0 && (
            <>
              <br />
              <span className="mint">{rest.join(" ")}</span>
            </>
          )}
        </h2>
        <svg className="contact-signal" viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 20H320" />
          <path className="contact-signal-beam" d="M0 20H320" pathLength="1" />
        </svg>
        <Link className="contact-arrow" href="/contact">
          {content.site.navigation.contact}
        </Link>
      </div>
      <div className="contact-bottom">
        <p>{content.contact.intro}</p>
        <div>
          <a
            className="contact-email"
            href={gmailComposeUrl(content.identity.email)}
            target="_blank"
            rel="noreferrer"
          >
            {content.identity.email}
          </a>
          <CopyEmail email={content.identity.email} />
        </div>
      </div>
    </section>
  );
}

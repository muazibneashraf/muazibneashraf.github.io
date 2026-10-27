import { ResumeLink } from "@/components/ResumeOverlay";
import { headingText } from "@/lib/editable-content";
import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { ContactForm } from "@/components/ContactForm";
import { CopyEmail } from "@/components/CopyEmail";
import { getContent } from "@/lib/content-store";
import { gmailComposeUrl } from "@/lib/gmail";
export async function generateMetadata(): Promise<Metadata> { const content = await getContent(); return { title: content.sections.contactPage.title.replace(/\.$/, ''), description: content.contact.intro }; }
export default async function Contact() {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <section className="contact-page-grid wrap">
        <div className="contact-page-copy">
          <header className="contact-page-intro">
            <p className="eyebrow">{content.sections.contactPage.eyebrow}</p>
            <h1>{headingText(content.sections.contactPage.title)}</h1>
            <p>{content.sections.contactPage.intro || content.contact.intro}</p>
          </header>
          <div className="contact-details">
            <h2>{headingText(content.sections.contactPage.detailsTitle)}</h2>
            <a
              className="contact-email"
              href={gmailComposeUrl(content.identity.email)}
              target="_blank"
              rel="noreferrer"
            >
              {content.identity.email}
            </a>
            <CopyEmail email={content.identity.email} />
            <dl>
              <div>
                <dt>BASED IN</dt>
                <dd>{content.identity.location}</dd>
              </div>
              <div>
                <dt>PHONE</dt>
                <dd>
                  <a href={"tel:" + content.identity.phone}>
                    {content.identity.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>ELSEWHERE</dt>
                <dd>
                  <a
                    href={content.site.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {content.site.githubLabel}
                  </a>
                  {content.contact.linkedin && (
                    <a
                      href={content.contact.linkedin}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {content.site.linkedinLabel}
                    </a>
                  )}
                </dd>
              </div>
            </dl>
            <ResumeLink className="button secondary">{content.hero.resumeLabel}</ResumeLink>
          </div>
        </div>
        <ContactForm email={content.identity.email} copy={content.sections.contactForm} />
      </section>
    </SiteFrame>
  );
}

import type { SiteContent } from "@/lib/types";
import { BackToTop } from "./BackToTop";
export function SiteFooter({
  content,
}: {
  content: SiteContent;
  showCallout?: boolean;
}) {
  return (
    <footer className="site-footer">
      <p>
        © {new Date().getFullYear()} {content.identity.name}
      </p>
      <span className="footer-location">{content.identity.location}</span>
      <a
        href={content.site.githubUrl}
        target="_blank"
        rel="noreferrer"
      >
        {content.site.githubLabel}
      </a>
      {content.contact.linkedin && (
        <a href={content.contact.linkedin} target="_blank" rel="noreferrer">
          {content.site.linkedinLabel}
        </a>
      )}
      <BackToTop label={content.site.backToTop} />
    </footer>
  );
}

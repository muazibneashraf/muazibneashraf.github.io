import { headingText } from "@/lib/editable-content";
import Link from "next/link";
import type { SiteContent } from "@/lib/types";
import { CapabilityVisual } from "./CapabilityVisual";

export function Capabilities({ content }: { content: SiteContent }) {
  const settings = content.sections.capabilities;
  return (
    <section
      id="capabilities"
      className="capabilities wrap"
      aria-labelledby="capabilities-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{settings.eyebrow}</p>
          <h2 id="capabilities-title">{headingText(settings.title)}</h2>
        </div>
      </div>
      {settings.intro && <p className="section-lede">{settings.intro}</p>}
      <div className="capability-grid">
        {settings.items.map((capability, index) => {
          const project = content.projects.find(
            (item) => item.id === capability.projectId,
          );
          return (
            <article className="capability-card" key={capability.id}>
              <CapabilityVisual kind={capability.title} index={index} />
              <h3>{capability.title}</h3>
              <p>{capability.summary}</p>
              {project && <Link className="text-link" href={`/projects/${project.slug}`}>
                {settings.linkLabel}: {project.title}
              </Link>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

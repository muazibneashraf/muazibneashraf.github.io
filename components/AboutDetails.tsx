import type { Credit } from "@/lib/types";

export function AboutDetails({
  story,
  languages,
  languagesLabel,
}: {
  story: string[];
  languages: Credit[];
  languagesLabel: string;
  moreLabel?: string;
  lessLabel?: string;
  standalone?: boolean;
}) {
  if (!story.length && !languages.length) return null;
  return (
    <div className="about-details">
      <div className="about-expanded is-expanded">
        <div className="about-expanded-inner">
          <div>
            {story.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {languages.length > 0 && (
              <div className="about-languages">
                <span className="mono">{languagesLabel}</span>
                <p>
                  {languages.map((language, index) => (
                    <span key={index}>
                      {index > 0 && " · "}
                      {language.label}{" "}
                      {language.value && <small>{language.value}</small>}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

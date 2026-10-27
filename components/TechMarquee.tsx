import type { CSSProperties } from "react";

export function TechMarquee({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;

  // Fill a wide viewport even when the editable list contains only one label.
  // Identical groups include the same trailing spacing for a seamless loop.
  const sequenceWidth = items.reduce((width, item) => width + item.length * 7 + 60, 0);
  const repeats = Math.max(3, Math.ceil(2800 / sequenceWidth));
  const loopItems = Array.from({ length: repeats }, () => items).flat();
  const style = { "--marquee-duration": `${sequenceWidth * repeats / 48}s` } as CSSProperties;

  return (
    <div
      className="marquee-track-container"
      role="region"
      aria-label="Core technologies marquee"
    >
      <p className="sr-only">Core technologies: {items.join(", ")}</p>
      <div className="marquee-track" aria-hidden="true" style={style}>
        <div className="marquee-group">
          {loopItems.map((item, index) => (
            <span
              key={`mq-primary-${item}-${index}`}
              className={`marquee-item${index >= items.length ? " marquee-item--loop" : ""}`}
            >
              <span className="marquee-tech">{item}</span>
              <span className="marquee-glyph">◈</span>
            </span>
          ))}
        </div>
        <div className="marquee-group">
          {loopItems.map((item, index) => (
            <span
              key={`mq-duplicate-${item}-${index}`}
              className="marquee-item"
            >
              <span className="marquee-tech">{item}</span>
              <span className="marquee-glyph">◈</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

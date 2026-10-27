import type { Project } from "@/lib/types";
import { CroppedImage } from "./CroppedImage";
import { LotteryDiagram, StudioDiagram } from "./ProjectScenes";
import { IcuDiagram, CommunityDiagram } from "./ProjectWorkflows";

export function ProjectVisual({ project }: { project: Project }) {
  const category = /ai|ml|research/i.test(project.category) ? "research" : /back/i.test(project.category) ? "backend" : "fullstack";
  if (project.cover) return <div className="project-visual project-cover" data-category={category}>
    <CroppedImage src={project.cover} crop={project.coverCrop} alt={project.title} loading="lazy" />
  </div>;

  const config = project.visual;
  if (!config || config.kind === "custom") return <div className="project-visual visual-lottery" data-category={category}>
    <div className="diagram-top mono"><span>{project.category}</span><span>{project.year}</span></div>
    <div className="custom-project-visual"><span className="mint mono">&lt;/&gt;</span><strong>{project.title}</strong></div>
    <div className="diagram-bottom mono">{project.stack?.slice(0, 3).join(" · ")}</div>
  </div>;

  const portfolio = config.kind === "studio", icu = config.kind === "icu", community = config.kind === "community";
  const diagramLabels = icu ? [...config.labels.slice(0, 6), config.labels[6] ?? "AI analysis", config.labels[7] ?? "CNN + LSTM"] : config.labels;
  const visual = portfolio ? "visual-lottery visual-portfolio" : icu ? "visual-icu" : community ? "visual-lifeline" : "visual-lottery";
  const diagram = icu ? <IcuDiagram labels={diagramLabels} />
    : community ? <CommunityDiagram labels={config.labels} />
    : portfolio ? <StudioDiagram labels={config.labels} />
    : <LotteryDiagram labels={config.labels} />;
  return <div className={`project-visual ${visual}`} data-category={category} role="img" aria-label={`${project.title}: ${diagramLabels.join(" to ")}`}>
    <div className="diagram-top mono"><span>{config.heading}</span><span>{config.description}</span></div>
    {diagram}
    <div className="diagram-bottom mono"><span>{config.footer}</span><span>{project.year}</span></div>
  </div>;
}

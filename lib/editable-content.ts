import seed from "@/data/editorial-defaults.json";
import type { ContentSections, HeroSettings, Project, SiteContent, SiteSettings, SkillGroup } from "./types";

/** Fill new editor fields without replacing content from existing exports. */
export function withEditableContent(content: SiteContent): SiteContent {
  const legacySkills = content.about.skills;
  const known = new Set(seed.sections.skills.groups.flatMap(group => group.items));
  const groups: SkillGroup[] = seed.sections.skills.groups.map(group => ({
    ...group,
    items: group.items.filter(item => legacySkills.includes(item)).map(item => item === "DSA" ? "Data structures & algorithms" : item),
  }));
  const extra = legacySkills.filter(item => !known.has(item));
  if (extra.length) groups.push({ id: "other", name: "Other skills", icon: "+", items: extra });
  const sections = Object.fromEntries(Object.entries(seed.sections).map(([key, value]) => [key, {
    ...value,
    ...(key === "skills" ? { groups } : {}),
    ...content.sections?.[key as keyof ContentSections],
  }])) as ContentSections;
  const site = { ...seed.site, ...content.site, navigation: { ...seed.site.navigation, ...content.site?.navigation } } as SiteSettings;
  if (site.logoUrl === "/brand/logo-wordmark.png") site.logoUrl = "";
  if (["/brand/logo-symbol.png", "/brand/mark.svg"].includes(site.iconUrl)) site.iconUrl = "/brand/neuro-wave-pulse.svg";
  if (["/brand/logo-symbol.png", "/brand/mark.svg"].includes(site.faviconUrl)) site.faviconUrl = "/brand/neuro-wave-pulse.svg";
  const resumeUrl = !content.identity?.resumeUrl || content.identity.resumeUrl.startsWith("/api/resume")
    ? "/Muaz_Ibne_Ashraf_CV.pdf"
    : content.identity.resumeUrl;
  return {
    ...content,
    identity: {
      ...content.identity,
      resumeUrl,
    },
    site,
    hero: { ...seed.hero, ...content.hero } as HeroSettings,
    sections,
    about: { ...seed.about, ...content.about },
    internship: { ...seed.jobs, ...content.internship },
    projects: content.projects.map(project => ({
      ...project,
      visual: project.visual ?? (seed.visuals[project.id as keyof typeof seed.visuals] as Project["visual"]) ?? { kind: "custom", heading: project.title, description: project.category, footer: project.stack?.join(" · ") ?? "", labels: [] },
      walkthroughSteps: project.walkthroughSteps?.map(step => ({ ...step, detail: step.detail === seed.sections.walkthrough.stepDetail.replaceAll("{project}", project.title) ? "" : step.detail })) ?? (project.flow ?? []).map((title, index) => ({
        id: `${project.id}-step-${index + 1}`, title,
        detail: "",
        tech: [],
        payload: JSON.stringify((seed.payloads as Record<string, Record<string, unknown>>)[project.id]?.[title] ?? {}, null, 2),
      })),
    })),
  };
}

export function headingText(value: string) {
  return value.trim().replace(/\.$/, "");
}

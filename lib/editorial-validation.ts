import seed from "@/data/editorial-defaults.json";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function shape(value: unknown, template: unknown): boolean {
  if (typeof template === "string") return typeof value === "string";
  if (typeof template === "number") return typeof value === "number" && Number.isFinite(value);
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return false;
    if (!value.every(item => shape(item, template[0]))) return false;
    const ids = value.filter(object).map(item => item.id).filter(id => id !== undefined);
    return ids.every(id => typeof id === "string" && !!id) && new Set(ids).size === ids.length;
  }
  return object(value) && object(template) && Object.entries(template).every(([key, item]) => shape(value[key], item));
}

export function validEditorialFields(value: Record<string, unknown>): boolean {
  for (const key of ["site", "hero", "sections"] as const) {
    if (value[key] === undefined) continue;
    const input = value[key];
    if (!object(input)) return false;
    if (key === "site" && input.navigation !== undefined && !object(input.navigation)) return false;
    const merged = key === "site" ? { ...seed.site, ...input, navigation: { ...seed.site.navigation, ...(object(input.navigation) ? input.navigation : {}) } }
      : key === "hero" ? { ...seed.hero, ...input }
      : Object.fromEntries(Object.entries(seed.sections).map(([name, section]) => [name, { ...section, ...(object(input[name]) ? input[name] : {}) }]));
    if (!shape(merged, seed[key])) return false;
    if (key === "sections" && Object.entries(input).some(([name, section]) => name in seed.sections && !object(section))) return false;
  }
  if (object(value.about)) for (const [key, template] of Object.entries(seed.about))
    if (value.about[key] !== undefined && !shape(value.about[key], template)) return false;
  if (object(value.internship)) for (const key of ["emptyText", "linkLabel"])
    if (value.internship[key] !== undefined && typeof value.internship[key] !== "string") return false;
  if (object(value.hero) && Array.isArray(value.hero.nodes) && (value.hero.nodes.length !== 3 || !value.hero.nodes.every(node => object(node) && ["backend", "research", "fullstack"].includes(String(node.id))))) return false;
  if (Array.isArray(value.projects)) for (const project of value.projects) {
    if (!object(project)) return false;
    if (project.visual !== undefined && (!object(project.visual) || !["icu", "community", "architecture", "studio", "custom"].includes(String(project.visual.kind)) || !shape(project.visual, seed.visuals["icu-analyzer"]))) return false;
    if (project.walkthroughSteps !== undefined) {
      if (!Array.isArray(project.walkthroughSteps)) return false;
      const ids = new Set();
      for (const step of project.walkthroughSteps) {
        if (!object(step) || !["id", "title", "detail", "payload"].every(key => typeof step[key] === "string") || !step.id || !step.title || ids.has(step.id) || !Array.isArray(step.tech) || !step.tech.every(item => typeof item === "string")) return false;
        ids.add(step.id);
        try { if (String(step.payload).trim() && !object(JSON.parse(String(step.payload)))) return false; } catch { return false; }
      }
    }
  }
  return true;
}

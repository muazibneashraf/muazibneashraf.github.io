// Relations come from editable project metadata, never inferred proficiency.
export function normalizeTechnology(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = { nextjs: "next", nodejs: "node", postgres: "postgresql", lstmbilstm: "lstm", bilstm: "lstm", bootstrap5: "bootstrap" };
  return aliases[normalized] ?? normalized;
}

export function projectUsesSkill(project: { stack?: string[]; walkthroughSteps?: { tech: string[] }[] }, skill: string) {
  const key = normalizeTechnology(skill);
  return key.length > 0 && [...(project.stack ?? []), ...(project.walkthroughSteps ?? []).flatMap(step => step.tech)]
    .some(technology => normalizeTechnology(technology) === key);
}

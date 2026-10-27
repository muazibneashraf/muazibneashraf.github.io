"use client";

import { useId } from "react";
import type { Project, SiteContent } from "@/lib/types";
import seed from "@/data/editorial-defaults.json";
import { ImagePicker } from "./ImagePicker";

type EditorProps = { content: SiteContent; onChange: (content: SiteContent) => void };
const label = (key: string) => ({ eyebrow: "Small heading", intro: "Introduction", githubUrl: "GitHub URL", brandAccent: "Brand suffix", primaryUrl: "Primary button link", primaryLabel: "Primary button text", codePath: "Code card filename", codeClass: "Code card name", codeBase: "Code card role", codeMindset: "Mindset text", codePrompt: "Code card footer", requestLabel: "Request badge text", flowLabel: "Workflow heading" } as Record<string, string>)[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, char => char.toUpperCase()).replace(/ url$/, " URL");
const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);
const id = () => crypto.randomUUID();
function move<T>(items: T[], index: number, direction: number) {
  const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next;
}

export function EditorField({ name, value, onChange, multiline = false, hint }: { name: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string }) {
  const fieldId = useId();
  const describedBy = hint ? `${fieldId}-hint` : undefined;
  return <label className="admin-field" htmlFor={fieldId}><span id={`${fieldId}-label`}>{name}</span>{multiline ? <textarea id={fieldId} aria-labelledby={`${fieldId}-label`} aria-describedby={describedBy} value={value} rows={4} onChange={event => onChange(event.target.value)} /> : <input id={fieldId} aria-labelledby={`${fieldId}-label`} aria-describedby={describedBy} value={value} onChange={event => onChange(event.target.value)} />}{hint && <small id={describedBy}>{hint}</small>}</label>;
}

export function TextFields<T extends object>({ value, onChange, exclude = [], multiline = [] }: { value: T; onChange: (next: T) => void; exclude?: string[]; multiline?: string[] }) {
  return <div className="admin-grid two">{Object.entries(value).filter(([key, item]) => typeof item === "string" && !exclude.includes(key)).map(([key, item]) => <EditorField key={key} name={label(key)} value={item} multiline={multiline.includes(key)} onChange={text => onChange({ ...value, [key]: text })} />)}</div>;
}

function Actions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (direction: number) => void; onRemove: () => void }) {
  return <div className="editor-row-actions"><button type="button" disabled={!index} onClick={() => onMove(-1)}>Move up</button><button type="button" disabled={index === count - 1} onClick={() => onMove(1)}>Move down</button><button className="danger" type="button" onClick={onRemove}>Remove</button></div>;
}

function ProjectSelect({ value, projects, onChange, name = "Linked project" }: { value: string; projects: Project[]; onChange: (id: string) => void; name?: string }) {
  return <label className="admin-field"><span>{name}</span><select aria-label={name} value={value} onChange={event => onChange(event.target.value)}><option value="">No linked project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>;
}

export function SiteEditor({ content, onChange }: EditorProps) {
  return <><details className="editor-group" open><summary>Website logos</summary><ImagePicker label="Website wordmark" value={content.site.logoUrl} crop={content.site.logoCrop} previewAspect="4 / 1" onChange={(logoUrl, logoCrop) => onChange({ ...content, site: { ...content.site, logoUrl, logoCrop } })} /><ImagePicker label="Compact logo" value={content.site.iconUrl} crop={content.site.iconCrop} previewAspect="1" onChange={(iconUrl, iconCrop) => onChange({ ...content, site: { ...content.site, iconUrl, iconCrop } })} /><EditorField name="Browser icon URL" value={content.site.faviconUrl} hint="Use a square PNG, WebP or SVG; the compact logo is used if this is empty" onChange={faviconUrl => onChange({ ...content, site: { ...content.site, faviconUrl } })} /></details>
    <details className="editor-group" open><summary>Brand, links and search listing</summary><TextFields value={content.site} exclude={["logoUrl", "iconUrl", "faviconUrl", "mark", "markAccent"]} onChange={site => onChange({ ...content, site })} multiline={["description"]} /></details>
    <details className="editor-group" open><summary>Navigation labels</summary><TextFields value={content.site.navigation} onChange={navigation => onChange({ ...content, site: { ...content.site, navigation } })} /></details></>;
}

export function HeroEditor({ content, onChange }: EditorProps) {
  const update = (hero: SiteContent["hero"]) => onChange({ ...content, hero });
  return <details className="editor-group"><summary>Hero buttons, ticker and globe content</summary>
    <TextFields value={content.hero} onChange={update} />
    <EditorField name="Code focus" value={content.hero.codeFocus.join("\n")} multiline hint="One focus per line" onChange={text => update({ ...content.hero, codeFocus: lines(text) })} />
    {content.hero.nodes.map((node, index) => <fieldset className="editor-repeat-card" key={node.id}><legend>Globe button {index + 1}</legend><EditorField name="Button label" value={node.label} onChange={text => update({ ...content.hero, nodes: content.hero.nodes.map((item, i) => i === index ? { ...item, label: text } : item) })} /><ProjectSelect value={node.projectId} projects={content.projects} onChange={projectId => update({ ...content.hero, nodes: content.hero.nodes.map((item, i) => i === index ? { ...item, projectId } : item) })} /></fieldset>)}
  </details>;
}

export function SkillsEditor({ content, onChange }: EditorProps) {
  const settings = content.sections.skills;
  const update = (next: typeof settings) => onChange({ ...content, about: { ...content.about, skills: [...new Set(next.groups.flatMap(group => group.items))] }, sections: { ...content.sections, skills: next } });
  return <><TextFields value={settings} onChange={update} /><div className="editor-collection">
    {settings.groups.map((group, index) => <fieldset className="editor-repeat-card" key={group.id}><legend>{group.name || `Skill group ${index + 1}`}</legend>
      <Actions index={index} count={settings.groups.length} onMove={direction => update({ ...settings, groups: move(settings.groups, index, direction) })} onRemove={() => update({ ...settings, groups: settings.groups.filter((_, i) => i !== index) })} />
      <TextFields value={group} exclude={["id"]} onChange={next => update({ ...settings, groups: settings.groups.map((item, i) => i === index ? next : item) })} />
      <EditorField name="Skills in this group" value={group.items.join("\n")} multiline hint="One skill per line, shown in this exact order" onChange={text => update({ ...settings, groups: settings.groups.map((item, i) => i === index ? { ...item, items: lines(text) } : item) })} />
    </fieldset>)}
    <button className="editor-add" type="button" onClick={() => update({ ...settings, groups: [...settings.groups, { id: id(), name: "New skill group", icon: "</>", items: [] }] })}>Add skill group</button>
  </div></>;
}

export function ResearchEditor({ content, onChange }: EditorProps) {
  const settings = content.sections.research;
  const update = (next: typeof settings) => onChange({ ...content, sections: { ...content.sections, research: next } });
  return <><ProjectSelect value={settings.projectId} name="Research project" projects={content.projects} onChange={projectId => update({ ...settings, projectId })} /><TextFields value={settings} exclude={["projectId"]} multiline={["subtitle", "intro", "note"]} onChange={update} /><EditorField name="Research tags" value={settings.tags.join("\n")} multiline onChange={text => update({ ...settings, tags: lines(text) })} /><p className="admin-section-note">The project summary and workflow come from the selected project. Edit those in Projects and Walkthroughs.</p></>;
}

export function CapabilitiesEditor({ content, onChange }: EditorProps) {
  const settings = content.sections.capabilities;
  const update = (next: typeof settings) => onChange({ ...content, sections: { ...content.sections, capabilities: next } });
  return <><TextFields value={settings} onChange={update} />{settings.items.map((item, index) => <fieldset className="editor-repeat-card" key={item.id}><legend>{item.title || "Capability"}</legend><Actions index={index} count={settings.items.length} onMove={direction => update({ ...settings, items: move(settings.items, index, direction) })} onRemove={() => update({ ...settings, items: settings.items.filter((_, i) => i !== index) })} /><TextFields value={item} exclude={["id", "projectId"]} multiline={["summary"]} onChange={next => update({ ...settings, items: settings.items.map((entry, i) => i === index ? next : entry) })} /><ProjectSelect value={item.projectId} projects={content.projects} onChange={projectId => update({ ...settings, items: settings.items.map((entry, i) => i === index ? { ...entry, projectId } : entry) })} /></fieldset>)}<button className="editor-add" type="button" onClick={() => update({ ...settings, items: [...settings.items, { id: id(), title: "New capability", summary: "", projectId: "" }] })}>Add capability</button></>;
}

export function PageCopyEditor({ content, onChange }: EditorProps) {
  return <>{(["work", "projectsPage", "contactPage", "contactForm", "projectPage"] as const).map(key => <details className="editor-group" key={key} open><summary>{({ work: "Selected projects section", projectsPage: "Projects page", contactPage: "Contact page", contactForm: "Contact form", projectPage: "Project detail labels" })[key]}</summary><TextFields value={content.sections[key]} multiline={["intro"]} onChange={next => onChange({ ...content, sections: { ...content.sections, [key]: next } })} /></details>)}</>;
}

export function AboutExtrasEditor({ content, onChange }: EditorProps) {
  const about = content.about;
  const update = (next: typeof about) => onChange({ ...content, about: next });
  return <><details className="editor-group" open><summary>University education</summary><div className="admin-grid two">{["Degree", "University", "Department", "Graduation"].map(key => <EditorField key={key} name={key} value={about.education.find(item => item.label === key)?.value ?? ""} onChange={value => update({ ...about, education: [...about.education.filter(item => item.label !== key), { label: key, value }] })} />)}</div></details>
    <details className="editor-group" open><summary>Statement and section labels</summary><TextFields value={about} exclude={["eyebrow", "title", "lede", "portraitUrl"]} multiline={["statement"]} onChange={update} /></details>
    <details className="editor-group" open><summary>Earlier education</summary>{about.previousEducation.map((item, index) => <fieldset className="editor-repeat-card" key={item.id}><legend>{item.title}</legend><Actions index={index} count={about.previousEducation.length} onMove={direction => update({ ...about, previousEducation: move(about.previousEducation, index, direction) })} onRemove={() => update({ ...about, previousEducation: about.previousEducation.filter((_, i) => i !== index) })} /><TextFields value={item} exclude={["id"]} onChange={next => update({ ...about, previousEducation: about.previousEducation.map((entry, i) => i === index ? next : entry) })} /></fieldset>)}<button type="button" className="editor-add" onClick={() => update({ ...about, previousEducation: [...about.previousEducation, { id: id(), title: "Qualification", institution: "", period: "", detail: "" }] })}>Add education</button></details>
    <details className="editor-group"><summary>Languages</summary>{about.languages.map((item, index) => <fieldset key={index} className="editor-repeat-card"><legend>Language {index + 1}</legend><TextFields value={item} onChange={next => update({ ...about, languages: about.languages.map((entry, i) => i === index ? next : entry) })} /><button type="button" className="editor-remove" onClick={() => update({ ...about, languages: about.languages.filter((_, i) => i !== index) })}>Remove language</button></fieldset>)}<button type="button" className="editor-add" onClick={() => update({ ...about, languages: [...about.languages, { label: "Language", value: "" }] })}>Add language</button></details></>;
}

export function ProjectVisualEditor({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  const visual = project.visual ?? { kind: "custom" as const, heading: project.title, description: project.category, footer: "", labels: [] };
  return <details className="editor-group"><summary>Animated card illustration</summary><label className="admin-field"><span>Illustration style</span><select value={visual.kind} onChange={event => { const kind = event.target.value as typeof visual.kind; const preset = Object.values(seed.visuals).find(item => item.kind === kind); onChange({ ...project, visual: { ...visual, ...preset, kind } }); }}><option value="custom">Project title</option><option value="icu">Document processing</option><option value="community">Community connections</option><option value="architecture">Lottery draw</option><option value="studio">Content studio</option></select></label><TextFields value={visual} exclude={["kind"]} onChange={next => onChange({ ...project, visual: next })} /><EditorField name="Diagram labels" value={visual.labels.join("\n")} multiline hint="One label per line, in the illustration's reading order" onChange={text => onChange({ ...project, visual: { ...visual, labels: lines(text) } })} /></details>;
}

export function WalkthroughEditor({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  const steps = project.walkthroughSteps ?? [];
  const update = (next: typeof steps) => onChange({ ...project, walkthroughSteps: next, flow: next.map(step => step.title) });
  return <div className="editor-collection">{steps.map((step, index) => <fieldset className="editor-repeat-card" key={step.id}><legend>Stage {index + 1}: {step.title}</legend><Actions index={index} count={steps.length} onMove={direction => update(move(steps, index, direction))} onRemove={() => update(steps.filter((_, i) => i !== index))} /><TextFields value={step} exclude={["id", "payload"]} multiline={["detail"]} onChange={next => update(steps.map((item, i) => i === index ? next : item))} /><EditorField name="Stage technologies" value={step.tech.join("\n")} multiline onChange={text => update(steps.map((item, i) => i === index ? { ...item, tech: lines(text) } : item))} /><details className="editor-group"><summary>Optional illustrative JSON</summary><EditorField name="Stage JSON" value={step.payload} multiline hint="A valid JSON object; leave empty to hide this panel" onChange={payload => update(steps.map((item, i) => i === index ? { ...item, payload } : item))} /></details></fieldset>)}<button type="button" className="editor-add" onClick={() => update([...steps, { id: id(), title: "New stage", detail: "", tech: [], payload: "" }])}>Add stage</button></div>;
}

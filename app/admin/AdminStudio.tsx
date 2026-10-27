"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { withEditableContent } from "@/lib/editable-content";
import { AdminInbox } from "@/components/admin/AdminInbox";
import { AboutExtrasEditor, CapabilitiesEditor, HeroEditor, PageCopyEditor, ProjectVisualEditor, ResearchEditor, SiteEditor, SkillsEditor, TextFields, WalkthroughEditor } from "@/components/admin/ContentEditors";
import { BrandLogo } from "@/components/BrandLogo";
import { ResumeUploader } from "@/components/admin/ResumeUploader";
import { GalleryPicker, ImagePicker } from "@/components/admin/ImagePicker";
import { DEFAULT_IMAGE_CROP } from "@/lib/image-crop";
import { isValidContent } from "@/lib/content-validation";
import { siteThemeStyle } from "@/lib/theme";
import type {
  ContactMessage,
  ExperienceItem,
  JobExperienceItem,
  Project,
  SiteContent,
} from "@/lib/types";

type Tab = "identity" | "site" | "home" | "about" | "skills" | "projects" | "research" | "walkthrough" | "capabilities" | "practice" | "jobs" | "contact" | "pages" | "inbox";
const tabs: {id: Tab; label: string; group: string; preview: string; hint: string}[] = [
 {id:'identity',label:'Identity',group:'Website',preview:'/#about',hint:'Your profile, contact details and published résumé'},
 {id:'site',label:'Site & navigation',group:'Website',preview:'/',hint:'Brand, navigation, social links and search listing'},
 {id:'pages',label:'Page text',group:'Website',preview:'/projects',hint:'Section headings, project pages and contact page copy'},
 {id:'home',label:'Homepage',group:'Content',preview:'/',hint:'Hero, ticker, buttons and globe labels'},
 {id:'about',label:'About',group:'Content',preview:'/#about',hint:'Biography, portrait, qualifications and languages'},
 {id:'skills',label:'Technical skills',group:'Content',preview:'/#skills',hint:'Skill categories, icons, items and display order'},
 {id:'projects',label:'Projects',group:'Content',preview:'/projects',hint:'Projects, images, diagrams and case studies'},
 {id:'research',label:'Research',group:'Content',preview:'/#research',hint:'Featured research project and its supporting copy'},
 {id:'walkthrough',label:'Walkthroughs',group:'Content',preview:'/#trace',hint:'Project stages, explanations and illustrative data'},
 {id:'capabilities',label:'Capabilities',group:'Content',preview:'/#capabilities',hint:'Contribution cards and their project links'},
 {id:'jobs',label:'Job experience',group:'Content',preview:'/#job-experience',hint:'Professional roles and achievements'},
 {id:'practice',label:'Leadership',group:'Content',preview:'/#experience',hint:'Leadership and volunteering activities'},
 {id:'contact',label:'Contact',group:'Content',preview:'/contact',hint:'Contact invitation and professional links'},
 {id:'inbox',label:'Inbox',group:'Messages',preview:'/contact',hint:'Read enquiries, manage their status and prepare replies'},
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function TextInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={props.type || "text"}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

function TextArea(props: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  "aria-label"?: string;
}) {
  return (
    <textarea
      value={props.value}
      rows={props.rows || 5}
      placeholder={props.placeholder}
      aria-label={props["aria-label"]}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="admin-section-title">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  );
}

export function AdminStudio({ theme, site }: { theme: SiteContent["theme"]; site: SiteContent["site"] }) {
  const [auth, setAuth] = useState<"checking" | "signed-out" | "signed-in">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [editorSearch, setEditorSearch] = useState("");
  const [tab, setTab] = useState<Tab>("identity");
  const [projectIndex, setProjectIndex] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [jobIndex, setJobIndex] = useState(0);
  const [status, setStatus] = useState("All changes saved");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const studioStyle = siteThemeStyle(content?.theme ?? theme);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { authenticated: boolean }) =>
        setAuth(data.authenticated ? "signed-in" : "signed-out"),
      )
      .catch(() => setAuth("signed-out"));
  }, []);

  useEffect(() => {
    if (auth !== "signed-in") return;
    const read = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error("Could not load the portfolio. Please sign in again.");
      return response.json();
    };
    Promise.all([read("/api/content"), read("/api/messages").catch(() => [])])
      .then(([siteContent, inbox]) => {
        setContent(siteContent as SiteContent);
        setMessages(Array.isArray(inbox) ? (inbox as ContactMessage[]) : []);
      })
      .catch(() => {
        setLoginError(
          "Could not load your content. Please try signing in again.",
        );
        setAuth("signed-out");
      });
  }, [auth]);

  function update(next: SiteContent) {
    setContent(next);
    setDirty(true);
    setStatus("Unsaved changes");
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setPassword("");
        setAuth("signed-in");
      } else {
        const result = (await response.json()) as { error?: string };
        setLoginError(result.error || "Unable to sign in.");
      }
    } catch {
      setLoginError("Could not connect. Please try again.");
    }
  }

  async function logout() {
    if (dirty && !confirm("Discard your unsaved changes and sign out?")) return;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      setContent(null);
      setDirty(false);
      setMessages([]);
      setAuth("signed-out");
    } catch {
      setStatus("Could not sign out. Please try again.");
    }
  }

  async function save() {
    if (!content || saving || uploadingResume) return;
    if (!isValidContent(content)) {
      setStatus(
        "Check required fields, unique project slugs, and valid URLs before saving.",
      );
      return;
    }
    setSaving(true);
    setStatus("Saving…");
    try {
      const response = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (response.ok) {
        setDirty(false);
        setStatus(
          `Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        );
      } else {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatus(result.error || "Save failed");
      }
    } catch {
      setStatus("Could not connect. Your unsaved changes are still here.");
    } finally {
      setSaving(false);
    }
  }

  function exportContent() {
    if (!content) return;
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "portfolio-content.json";
    link.click();
    URL.revokeObjectURL(href);
  }

  function importContent(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as SiteContent;
        if (!isValidContent(next)) throw new Error();
        update(withEditableContent(next));
        setProjectIndex(0);
        setPracticeIndex(0);
        setJobIndex(0);
        setStatus("Imported — review and save");
      } catch {
        setStatus("That file is not a valid portfolio export");
      }
    };
    reader.readAsText(file);
  }

  if (auth === "checking")
    return (
      <div className="admin-loading" style={studioStyle}>
        <BrandLogo site={content?.site ?? site} compact />
        <p>Opening portfolio studio…</p>
      </div>
    );

  if (auth === "signed-out") {
    return (
      <main className="admin-login" style={studioStyle}>
        <div className="login-art">
          <span>Portfolio / Studio</span>
          <blockquote>
            Manage your
            <br />
            portfolio.
          </blockquote>
          <p>Private content management for Portfolio Muaz.</p>
        </div>
        <form onSubmit={login}>
          <div className="login-mark"><BrandLogo site={site} compact /></div>
          <p>Admin access</p>
          <h1>Welcome back.</h1>
          <Field label="Portfolio password">
            <input
              autoFocus
              required
              type="password"
              autoComplete="current-password"
              value={password}
              placeholder="Enter password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
          <button className="admin-primary" type="submit">
            Enter studio 
          </button>
          <Link href="/">Return to portfolio</Link>
        </form>
      </main>
    );
  }

  if (!content)
    return (
      <div className="admin-loading" style={studioStyle}>
        <span>MA</span>
        <p>Loading your work…</p>
      </div>
    );

  const project = content.projects[projectIndex] || content.projects[0];
  const practiceItem =
    content.extracurricular.items[practiceIndex] ||
    content.extracurricular.items[0];
  const jobExperience =
    content.internship.items[jobIndex] || content.internship.items[0];

  function updateProject(nextProject: Project) {
    if (!content) return;
    const projects = [...content.projects];
    projects[projectIndex] = nextProject;
    update({ ...content, projects });
  }

  function addProject() {
    if (!content) return;
    const next: Project = {
      id: `project-${Date.now()}`,
      slug: `untitled-project-${content.projects.length + 1}`,
      title: "Untitled Project",
      year: String(new Date().getFullYear()),
      category: "Full-stack",
      summary: "Add a one-line project summary.",
      description: "Describe the project, your idea, and your process.",
      cover: "",
      coverCrop: DEFAULT_IMAGE_CROP,
      featured: false,
      aspect: "landscape",
      videoUrl: "",
      credits: [{ label: "Role", value: "Developer" }],
      outcomes: ["Add a learning or outcome."],
      gallery: [],
      galleryCrops: [],
    };
    update({ ...content, projects: [...content.projects, next] });
    setProjectIndex(content.projects.length);
  }

  function removeProject() {
    if (!content) return;
    if (content.projects.length <= 1 || !confirm(`Remove “${project.title}”?`))
      return;
    update({
      ...content,
      projects: content.projects.filter((_, index) => index !== projectIndex),
    });
    setProjectIndex(Math.max(0, projectIndex - 1));
  }

  function moveProject(direction: -1 | 1) {
    if (!content) return;
    const target = projectIndex + direction;
    if (target < 0 || target >= content.projects.length) return;
    const projects = [...content.projects];
    [projects[projectIndex], projects[target]] = [
      projects[target],
      projects[projectIndex],
    ];
    update({ ...content, projects });
    setProjectIndex(target);
  }

  function updatePracticeItem(nextItem: ExperienceItem) {
    if (!content) return;
    const items = [...content.extracurricular.items];
    items[practiceIndex] = nextItem;
    update({
      ...content,
      extracurricular: { ...content.extracurricular, items },
    });
  }

  function addPracticeItem() {
    if (!content) return;
    const next: ExperienceItem = {
      id: `practice-${Date.now()}`,
      title: "New activity",
      role: "Your role",
      year: String(new Date().getFullYear()),
      description:
        "Describe the activity, your contribution, and what you learned.",
      image: "",
      imageCrop: DEFAULT_IMAGE_CROP,
    };
    update({
      ...content,
      extracurricular: {
        ...content.extracurricular,
        items: [...content.extracurricular.items, next],
      },
    });
    setPracticeIndex(content.extracurricular.items.length);
  }

  function removePracticeItem() {
    if (!content || !practiceItem) return;
    if (!confirm(`Remove “${practiceItem.title}”?`)) return;
    update({
      ...content,
      extracurricular: {
        ...content.extracurricular,
        items: content.extracurricular.items.filter(
          (_, index) => index !== practiceIndex,
        ),
      },
    });
    setPracticeIndex(Math.max(0, practiceIndex - 1));
  }

  function movePracticeItem(direction: -1 | 1) {
    if (!content) return;
    const target = practiceIndex + direction;
    if (target < 0 || target >= content.extracurricular.items.length) return;
    const items = [...content.extracurricular.items];
    [items[practiceIndex], items[target]] = [
      items[target],
      items[practiceIndex],
    ];
    update({
      ...content,
      extracurricular: { ...content.extracurricular, items },
    });
    setPracticeIndex(target);
  }

  function updateJob(nextExperience: JobExperienceItem) {
    if (!content) return;
    const items = [...content.internship.items];
    items[jobIndex] = nextExperience;
    update({ ...content, internship: { ...content.internship, items } });
  }

  function addJob() {
    if (!content) return;
    const next: JobExperienceItem = {
      id: `job-${Date.now()}`,
      company: "Company name",
      role: "Job title",
      period: String(new Date().getFullYear()),
      overview:
        "Describe your responsibilities, process, and professional growth.",
      cover: "",
      coverCrop: DEFAULT_IMAGE_CROP,
      learnings: [],
    };
    update({
      ...content,
      internship: {
        ...content.internship,
        items: [...content.internship.items, next],
      },
    });
    setJobIndex(content.internship.items.length);
  }

  function removeJob() {
    if (!content || !jobExperience) return;
    if (!confirm(`Remove the ${jobExperience.company} job?`))
      return;
    update({
      ...content,
      internship: {
        ...content.internship,
        items: content.internship.items.filter(
          (_, index) => index !== jobIndex,
        ),
      },
    });
    setJobIndex(Math.max(0, jobIndex - 1));
  }

  function moveJob(direction: -1 | 1) {
    if (!content) return;
    const target = jobIndex + direction;
    if (target < 0 || target >= content.internship.items.length) return;
    const items = [...content.internship.items];
    [items[jobIndex], items[target]] = [
      items[target],
      items[jobIndex],
    ];
    update({ ...content, internship: { ...content.internship, items } });
    setJobIndex(target);
  }

  function addLearning() {
    if (!jobExperience) return;
    updateJob({
      ...jobExperience,
      learnings: [
        ...jobExperience.learnings,
        {
          id: `learning-${Date.now()}`,
          title: "New achievement",
          description: "Describe your contribution and its impact.",
        },
      ],
    });
  }

  function removeLearning(learningIndex: number) {
    if (!jobExperience)
      return;
    updateJob({
      ...jobExperience,
      learnings: jobExperience.learnings.filter(
        (_, index) => index !== learningIndex,
      ),
    });
  }

  return (
    <main className="admin-shell" style={studioStyle}>
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin" aria-label="Refresh admin panel" title="Refresh admin panel">
          <BrandLogo site={content.site} compact />
          <span>
            Portfolio
            <br />
            Studio
          </span>
        </a>
        <input className="admin-editor-search" type="search" aria-label="Find an editor" placeholder="Find a section…" value={editorSearch} onChange={event => setEditorSearch(event.target.value)} />
        <nav aria-label="Studio sections">
          {['Website','Content','Messages'].map(group => {
            const visible = tabs.filter(item => item.group === group && (item.label + ' ' + item.hint).toLowerCase().includes(editorSearch.toLowerCase()));
            return visible.length > 0 && <div className="admin-nav-group" key={group}><p>{group}</p>{visible.map(item => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => switchTab(item.id)}><span>{String(tabs.indexOf(item) + 1).padStart(2, '0')}</span>{item.label}{item.id === 'inbox' && messages.some(message => !message.readAt && !message.archivedAt) && <i>{messages.filter(message => !message.readAt && !message.archivedAt).length}</i>}</button>)}</div>;
          })}
        </nav>
        <label className="admin-mobile-editor"><span className="sr-only">Editor section</span><select aria-label="Editor section" value={tab} onChange={event => switchTab(event.target.value as Tab)}>{tabs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="admin-side-actions">
          <a href="/" target="_blank">
            View live site
          </a>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-toolbar">
          <div role="status" aria-live="polite">
            <span className={dirty ? "status-dot dirty" : "status-dot"} />
            {status}
          </div>
          <div>
            <input
              ref={importRef}
              hidden
              type="file"
              accept="application/json"
              aria-label="Import portfolio JSON"
              onChange={importContent}
            />
            <button type="button" disabled={saving || uploadingResume} onClick={() => importRef.current?.click()}>
              Import
            </button>
            <button type="button" onClick={exportContent}>
              Export
            </button>
            <button
              type="button"
              className="admin-save"
              disabled={!dirty || saving || uploadingResume}
              onClick={save}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </header>
        <fieldset className="admin-editor" disabled={saving}>
          <div className="admin-editor-guide"><p>{tabs.find(item => item.id === tab)?.hint}</p><a href={tabs.find(item => item.id === tab)?.preview} target="_blank" rel="noreferrer">Preview this section</a></div>
          {tab === "identity" && (
            <>
              <SectionTitle eyebrow="Identity" title="Your details" />
              <div className="admin-grid two">
                <Field label="Full name">
                  <TextInput
                    value={content.identity.name}
                    onChange={(name) =>
                      update({
                        ...content,
                        identity: { ...content.identity, name },
                      })
                    }
                  />
                </Field>
                <Field label="Professional line">
                  <TextInput
                    value={content.identity.role}
                    onChange={(role) =>
                      update({
                        ...content,
                        identity: { ...content.identity, role },
                      })
                    }
                  />
                </Field>
                <Field label="University">
                  <TextInput
                    value={content.identity.university}
                    onChange={(university) =>
                      update({
                        ...content,
                        identity: { ...content.identity, university },
                      })
                    }
                  />
                </Field>
                <Field label="Location">
                  <TextInput
                    value={content.identity.location}
                    onChange={(location) =>
                      update({
                        ...content,
                        identity: { ...content.identity, location },
                      })
                    }
                  />
                </Field>
                <Field label="Email">
                  <TextInput
                    type="email"
                    value={content.identity.email}
                    onChange={(email) =>
                      update({
                        ...content,
                        identity: { ...content.identity, email },
                      })
                    }
                  />
                </Field>
                <Field label="Phone">
                  <TextInput
                    value={content.identity.phone}
                    onChange={(phone) =>
                      update({
                        ...content,
                        identity: { ...content.identity, phone },
                      })
                    }
                  />
                </Field>
                <Field label="Résumé URL" hint="Use a hosted PDF URL, or upload a file below.">
                  <TextInput
                    value={content.identity.resumeUrl}
                    onChange={(resumeUrl) =>
                      update({
                        ...content,
                        identity: { ...content.identity, resumeUrl },
                      })
                    }
                  />
                </Field>
              </div>
              <ResumeUploader value={content.identity.resumeUrl} onBusy={setUploadingResume}
                onChange={(resumeUrl) => {
                  setContent(current => current ? { ...current, identity: { ...current.identity, resumeUrl } } : current);
                  setDirty(true); setStatus("Unsaved changes");
                }} />
              <p className="admin-section-note">
                Identity details appear in the site header, contact information,
                and footer. Public portraits are managed in the About section.
              </p>
            </>
          )}

          {tab === "home" && (
            <>
              <SectionTitle eyebrow="Homepage" title="Homepage content" />
              <div className="admin-grid">
                <Field label="Small heading">
                  <TextInput
                    value={content.home.eyebrow}
                    onChange={(eyebrow) =>
                      update({ ...content, home: { ...content.home, eyebrow } })
                    }
                  />
                </Field>
                <Field label="Main headline">
                  <TextInput
                    value={content.home.title}
                    onChange={(title) =>
                      update({ ...content, home: { ...content.home, title } })
                    }
                  />
                </Field>
                <Field label="Tagline">
                  <TextInput
                    value={content.home.accentWord}
                    onChange={(accentWord) =>
                      update({
                        ...content,
                        home: { ...content.home, accentWord },
                      })
                    }
                  />
                </Field>
                <Field label="Technology strip" hint="One item per line">
                  <TextArea
                    value={content.home.marquee.join("\n")}
                    onChange={(value) =>
                      update({
                        ...content,
                        home: {
                          ...content.home,
                          marquee: value.split("\n").filter(Boolean),
                        },
                      })
                    }
                  />
                </Field>
              </div>
              <HeroEditor content={content} onChange={update} />
            </>
          )}

          {tab === "about" && (
            <>
              <SectionTitle eyebrow="About" title="About you" />
              <div className="admin-grid">
                <Field label="Small heading">
                  <TextInput
                    value={content.about.eyebrow}
                    onChange={(eyebrow) =>
                      update({
                        ...content,
                        about: { ...content.about, eyebrow },
                      })
                    }
                  />
                </Field>
                <Field label="Page title">
                  <TextArea
                    rows={2}
                    value={content.about.title}
                    onChange={(title) =>
                      update({ ...content, about: { ...content.about, title } })
                    }
                  />
                </Field>
                <Field label="Opening line">
                  <TextArea
                    rows={3}
                    value={content.about.lede}
                    onChange={(lede) =>
                      update({ ...content, about: { ...content.about, lede } })
                    }
                  />
                </Field>
                <ImagePicker
                  label="Homepage & About portrait"
                  previewAspect="4 / 5"
                  value={content.about.portraitUrl}
                  crop={content.about.portraitCrop}
                  onChange={(portraitUrl, portraitCrop) =>
                    update({
                      ...content,
                      about: { ...content.about, portraitUrl, portraitCrop },
                    })
                  }
                />
                <Field
                  label="Story paragraphs"
                  hint="Separate paragraphs with a blank line"
                >
                  <TextArea
                    rows={10}
                    value={content.about.story.join("\n\n")}
                    onChange={(value) =>
                      update({
                        ...content,
                        about: {
                          ...content.about,
                          story: value.split(/\n\s*\n/).filter(Boolean),
                        },
                      })
                    }
                  />
                </Field>

              </div>
              <AboutExtrasEditor content={content} onChange={update} />
            </>
          )}

          {tab === "projects" && project && (
            <>
              <SectionTitle eyebrow="Projects" title="Manage projects" />
              <div className="project-manager">
                <div className="project-manager-list">
                  {content.projects.map((item, index) => (
                    <button
                      type="button"
                      className={projectIndex === index ? "active" : ""}
                      key={item.id}
                      onClick={() => setProjectIndex(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{item.title}</b>
                      <small>{item.category}</small>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="add-project"
                    onClick={addProject}
                  >
                    ＋ Add project
                  </button>
                </div>
                <div className="project-manager-editor">
                  <div className="project-editor-actions">
                    <button
                      type="button"
                      disabled={projectIndex === 0}
                      onClick={() => moveProject(-1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      disabled={projectIndex === content.projects.length - 1}
                      onClick={() => moveProject(1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={removeProject}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="admin-grid two">
                    <Field label="Project title">
                      <TextInput
                        value={project.title}
                        onChange={(title) =>
                          updateProject({ ...project, title })
                        }
                      />
                    </Field>
                    <Field label="URL slug">
                      <TextInput
                        value={project.slug}
                        onChange={(slug) =>
                          updateProject({
                            ...project,
                            slug: slug
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                          })
                        }
                      />
                    </Field>
                    <Field label="Category">
                      <TextInput
                        value={project.category}
                        onChange={(category) =>
                          updateProject({ ...project, category })
                        }
                      />
                    </Field>
                    <Field label="Year">
                      <TextInput
                        value={project.year}
                        onChange={(year) => updateProject({ ...project, year })}
                      />
                    </Field>
                  </div>
                  <Field label="Card summary">
                    <TextArea
                      aria-label="Card summary"
                      rows={2}
                      value={project.summary}
                      onChange={(summary) =>
                        updateProject({ ...project, summary })
                      }
                    />
                  </Field>
                  <Field label="Full description">
                    <TextArea
                      rows={6}
                      value={project.description}
                      onChange={(description) =>
                        updateProject({ ...project, description })
                      }
                    />
                  </Field>
                  <div className="admin-grid two">
                    <Field label="Repository URL">
                      <TextInput
                        value={project.repository || ""}
                        onChange={(repository) =>
                          updateProject({ ...project, repository })
                        }
                      />
                    </Field>
                    <Field label="Live project URL">
                      <TextInput
                        value={project.liveUrl || ""}
                        onChange={(liveUrl) =>
                          updateProject({ ...project, liveUrl })
                        }
                      />
                    </Field>
                    <Field label="Your role">
                      <TextInput
                        value={project.role || ""}
                        onChange={(role) => updateProject({ ...project, role })}
                      />
                    </Field>
                    <Field
                      label="Technologies"
                      hint="Separate technologies with commas"
                    >
                      <TextInput
                        value={(project.stack || []).join(", ")}
                        onChange={(value) =>
                          updateProject({
                            ...project,
                            stack: value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="The challenge">
                    <TextArea
                      value={project.challenge || ""}
                      onChange={(challenge) =>
                        updateProject({ ...project, challenge })
                      }
                    />
                  </Field>
                  <Field label="Project context and limitations">
                    <TextArea
                      value={project.limitations || ""}
                      onChange={(limitations) =>
                        updateProject({ ...project, limitations })
                      }
                    />
                  </Field>
                  <p className="admin-section-note">Workflow stages are managed in <button type="button" className="editor-inline-link" onClick={() => switchTab("walkthrough")}>Walkthroughs</button>.</p>
                  <div className="admin-grid two">
                    <ImagePicker
                      label="Cover image"
                      previewAspect={
                        project.aspect === "portrait"
                          ? "4 / 5"
                          : project.aspect === "square"
                            ? "1"
                            : "16 / 10"
                      }
                      value={project.cover}
                      crop={project.coverCrop}
                      onChange={(cover, coverCrop) =>
                        updateProject({ ...project, cover, coverCrop })
                      }
                    />
                    <label className="admin-check">
                      <input
                        type="checkbox"
                        checked={project.featured}
                        onChange={(event) =>
                          updateProject({
                            ...project,
                            featured: event.target.checked,
                          })
                        }
                      />
                      <span>Feature on homepage</span>
                    </label>
                  </div>
                  <Field label="Credits" hint="Use Label: Value, one per line">
                    <TextArea
                      value={project.credits
                        .map((item) => `${item.label}: ${item.value}`)
                        .join("\n")}
                      onChange={(value) =>
                        updateProject({
                          ...project,
                          credits: value
                            .split("\n")
                            .filter(Boolean)
                            .map((line) => {
                              const split = line.indexOf(":");
                              return {
                                label:
                                  split > -1
                                    ? line.slice(0, split).trim()
                                    : line,
                                value:
                                  split > -1
                                    ? line.slice(split + 1).trim()
                                    : "",
                              };
                            }),
                        })
                      }
                    />
                  </Field>
                  <Field label="Process & outcomes" hint="One point per line">
                    <TextArea
                      value={project.outcomes.join("\n")}
                      onChange={(value) =>
                        updateProject({
                          ...project,
                          outcomes: value.split("\n").filter(Boolean),
                        })
                      }
                    />
                  </Field>
                  <GalleryPicker
                    value={project.gallery}
                    crops={project.galleryCrops}
                    onChange={(gallery, galleryCrops) =>
                      updateProject({ ...project, gallery, galleryCrops })
                    }
                  />
                  <ProjectVisualEditor project={project} onChange={updateProject} />
                </div>
              </div>
            </>
          )}

          {tab === "practice" && (
            <>
              <SectionTitle
                eyebrow="Leadership"
                title="Leadership and volunteering"
              />
              <div className="admin-grid">
                <Field label="Small heading">
                  <TextInput
                    value={content.extracurricular.eyebrow}
                    onChange={(eyebrow) =>
                      update({
                        ...content,
                        extracurricular: {
                          ...content.extracurricular,
                          eyebrow,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Page title">
                  <TextArea
                    rows={2}
                    value={content.extracurricular.title}
                    onChange={(title) =>
                      update({
                        ...content,
                        extracurricular: { ...content.extracurricular, title },
                      })
                    }
                  />
                </Field>
                <Field label="Introduction">
                  <TextArea
                    value={content.extracurricular.intro}
                    onChange={(intro) =>
                      update({
                        ...content,
                        extracurricular: { ...content.extracurricular, intro },
                      })
                    }
                  />
                </Field>
              </div>
              <div className="project-manager section-manager">
                <div className="project-manager-list">
                  {content.extracurricular.items.map((item, index) => (
                    <button
                      type="button"
                      className={practiceIndex === index ? "active" : ""}
                      key={item.id}
                      onClick={() => setPracticeIndex(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{item.title}</b>
                      <small>{item.role}</small>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="add-project"
                    onClick={addPracticeItem}
                  >
                    ＋ Add activity
                  </button>
                </div>
                {practiceItem ? (
                  <div className="project-manager-editor">
                    <div className="project-editor-actions">
                      <button
                        type="button"
                        disabled={practiceIndex === 0}
                        onClick={() => movePracticeItem(-1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={
                          practiceIndex ===
                          content.extracurricular.items.length - 1
                        }
                        onClick={() => movePracticeItem(1)}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={removePracticeItem}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="admin-grid two">
                      <Field label="Title">
                        <TextInput
                          value={practiceItem.title}
                          onChange={(title) =>
                            updatePracticeItem({ ...practiceItem, title })
                          }
                        />
                      </Field>
                      <Field label="Role">
                        <TextInput
                          value={practiceItem.role}
                          onChange={(role) =>
                            updatePracticeItem({ ...practiceItem, role })
                          }
                        />
                      </Field>
                      <Field label="Year">
                        <TextInput
                          value={practiceItem.year}
                          onChange={(year) =>
                            updatePracticeItem({ ...practiceItem, year })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Description">
                      <TextArea
                        rows={6}
                        value={practiceItem.description}
                        onChange={(description) =>
                          updatePracticeItem({ ...practiceItem, description })
                        }
                      />
                    </Field>
                    <ImagePicker
                      label="Activity image"
                      previewAspect="16 / 10"
                      value={practiceItem.image}
                      crop={practiceItem.imageCrop}
                      onChange={(image, imageCrop) =>
                        updatePracticeItem({
                          ...practiceItem,
                          image,
                          imageCrop,
                        })
                      }
                    />
                  </div>
                ) : (
                  <p className="empty-state">
                    No activities added yet. Use Add activity to include one.
                  </p>
                )}
              </div>
            </>
          )}

          {tab === "jobs" && (
            <>
              <SectionTitle eyebrow="Professional experience" title="Job experience" />
              <details className="editor-group"><summary>Link and empty state</summary><TextFields value={{emptyText: content.internship.emptyText, linkLabel: content.internship.linkLabel}} onChange={next => update({...content, internship: {...content.internship,...next}})} /></details>
              <p className="admin-section-note">Saved jobs appear on the homepage and the Job Experience page. <a href="/experience" target="_blank" rel="noreferrer">Preview job experience</a></p>
              <div className="admin-grid">
                <Field label="Small heading">
                  <TextInput
                    value={content.internship.eyebrow}
                    onChange={(eyebrow) =>
                      update({
                        ...content,
                        internship: { ...content.internship, eyebrow },
                      })
                    }
                  />
                </Field>
                <Field label="Page title">
                  <TextInput
                    value={content.internship.title}
                    onChange={(title) =>
                      update({
                        ...content,
                        internship: { ...content.internship, title },
                      })
                    }
                  />
                </Field>
                <Field label="Introduction">
                  <TextArea
                    value={content.internship.intro}
                    onChange={(intro) =>
                      update({
                        ...content,
                        internship: { ...content.internship, intro },
                      })
                    }
                  />
                </Field>
              </div>
              <div className="project-manager section-manager">
                <div className="project-manager-list">
                  {content.internship.items.map((item, index) => (
                    <button
                      type="button"
                      className={jobIndex === index ? "active" : ""}
                      key={item.id}
                      onClick={() => setJobIndex(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{item.company}</b>
                      <small>{item.role}</small>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="add-project"
                    onClick={addJob}
                  >
                    ＋ Add job
                  </button>
                </div>
                {jobExperience ? (
                  <div className="project-manager-editor">
                    <div className="project-editor-actions">
                      <button
                        type="button"
                        disabled={jobIndex === 0}
                        onClick={() => moveJob(-1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={
                          jobIndex ===
                          content.internship.items.length - 1
                        }
                        onClick={() => moveJob(1)}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={removeJob}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="admin-grid two">
                      <Field label="Company">
                        <TextInput
                          value={jobExperience.company}
                          onChange={(company) =>
                            updateJob({
                              ...jobExperience,
                              company,
                            })
                          }
                        />
                      </Field>
                      <Field label="Role">
                        <TextInput
                          value={jobExperience.role}
                          onChange={(role) =>
                            updateJob({ ...jobExperience, role })
                          }
                        />
                      </Field>
                      <Field label="Period">
                        <TextInput
                          value={jobExperience.period}
                          onChange={(period) =>
                            updateJob({
                              ...jobExperience,
                              period,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Overview">
                      <TextArea
                        aria-label="Overview"
                        rows={6}
                        value={jobExperience.overview}
                        onChange={(overview) =>
                          updateJob({
                            ...jobExperience,
                            overview,
                          })
                        }
                      />
                    </Field>
                    <ImagePicker
                      label="Job cover"
                      previewAspect="16 / 9"
                      value={jobExperience.cover}
                      crop={jobExperience.coverCrop}
                      onChange={(cover, coverCrop) =>
                        updateJob({
                          ...jobExperience,
                          cover,
                          coverCrop,
                        })
                      }
                    />
                    <div className="subsection-heading">
                      <div>
                        <span>Responsibilities & achievements</span>
                        <p>Add or remove the responsibilities and achievements from this role.</p>
                      </div>
                      <button type="button" onClick={addLearning}>
                        ＋ Add achievement
                      </button>
                    </div>
                    <div className="repeat-editor">
                      {jobExperience.learnings.map((learning, index) => (
                        <div className="repeat-card" key={learning.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <button
                            type="button"
                            className="repeat-remove"
                            aria-label={`Remove achievement ${index + 1}`}
                            onClick={() => removeLearning(index)}
                          >
                            Remove
                          </button>
                          <Field label="Achievement title">
                            <TextInput
                              value={learning.title}
                              onChange={(title) => {
                                const learnings = [
                                  ...jobExperience.learnings,
                                ];
                                learnings[index] = { ...learning, title };
                                updateJob({
                                  ...jobExperience,
                                  learnings,
                                });
                              }}
                            />
                          </Field>
                          <Field label="What you contributed">
                            <TextArea
                              aria-label="What you contributed"
                              value={learning.description}
                              onChange={(description) => {
                                const learnings = [
                                  ...jobExperience.learnings,
                                ];
                                learnings[index] = { ...learning, description };
                                updateJob({
                                  ...jobExperience,
                                  learnings,
                                });
                              }}
                            />
                          </Field>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="empty-state">
                    No job experience added yet. Use Add job when you
                    have a role to include.
                  </p>
                )}
              </div>
            </>
          )}

          {tab === "contact" && (
            <>
              <SectionTitle
                eyebrow="Contact"
                title="Make it easy to reach you."
              />
              <div className="admin-grid">
                <Field label="Small heading">
                  <TextInput
                    value={content.contact.eyebrow}
                    onChange={(eyebrow) =>
                      update({
                        ...content,
                        contact: { ...content.contact, eyebrow },
                      })
                    }
                  />
                </Field>
                <Field label="Main invitation">
                  <TextArea
                    rows={3}
                    value={content.contact.title}
                    onChange={(title) =>
                      update({
                        ...content,
                        contact: { ...content.contact, title },
                      })
                    }
                  />
                </Field>
                <Field label="Supporting copy">
                  <TextArea
                    rows={4}
                    value={content.contact.intro}
                    onChange={(intro) =>
                      update({
                        ...content,
                        contact: { ...content.contact, intro },
                      })
                    }
                  />
                </Field>
                <Field label="LinkedIn URL">
                  <TextInput
                    value={content.contact.linkedin}
                    onChange={(linkedin) =>
                      update({
                        ...content,
                        contact: { ...content.contact, linkedin },
                      })
                    }
                  />
                </Field>
              </div>
            </>
          )}

          {tab === 'site' && <><SectionTitle eyebrow="Website" title="Site & navigation" /><SiteEditor content={content} onChange={update} /></>}
          {tab === 'pages' && <><SectionTitle eyebrow="Website" title="Page text" /><PageCopyEditor content={content} onChange={update} /></>}
          {tab === 'skills' && <><SectionTitle eyebrow="Skills" title="Technical skills" /><SkillsEditor content={content} onChange={update} /></>}
          {tab === 'research' && <><SectionTitle eyebrow="Research" title="Research feature" /><ResearchEditor content={content} onChange={update} /></>}
          {tab === 'capabilities' && <><SectionTitle eyebrow="Capabilities" title="What you can contribute" /><CapabilitiesEditor content={content} onChange={update} /></>}
          {tab === 'walkthrough' && <><SectionTitle eyebrow="Walkthroughs" title="How your projects work" /><details className="editor-group"><summary>Section heading and labels</summary><TextFields value={content.sections.walkthrough} multiline={['intro']} onChange={walkthrough => update({...content, sections: {...content.sections, walkthrough}})} /></details><label className="admin-field"><span>Project to edit</span><select value={projectIndex} onChange={event => setProjectIndex(Number(event.target.value))}>{content.projects.map((item,index) => <option value={index} key={item.id}>{item.title}</option>)}</select></label>{project && <WalkthroughEditor project={project} onChange={updateProject} />}</>}
          {tab === 'inbox' && <><SectionTitle eyebrow="Inbox" title="Messages" /><AdminInbox messages={messages} onChange={setMessages} /></>}

        </fieldset>
      </section>
    </main>
  );
}


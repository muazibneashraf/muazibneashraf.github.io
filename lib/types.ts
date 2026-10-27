export type Credit = { label: string; value: string };

export type ImageCrop = {
  x: number;
  y: number;
  zoom: number;
  fit: "cover" | "contain";
};

export type SectionCopy = { eyebrow: string; title: string; intro: string };
export type SkillGroup = { id: string; icon: string; name: string; items: string[] };
export type EducationItem = { id: string; title: string; institution: string; period: string; detail: string };
export type SiteSettings = {
  mark: string; markAccent: string; brand: string; brandAccent: string; title: string; description: string;
  githubUrl: string; githubLabel: string; linkedinLabel: string; emailLabel: string; backToTop: string;
  logoUrl: string; iconUrl: string; faviconUrl: string; logoCrop: ImageCrop; iconCrop: ImageCrop;
  navigation: { about: string; projects: string; experience: string; capabilities: string; resume: string; contact: string };
};
export type HeroSettings = {
  primaryLabel: string; primaryUrl: string; resumeLabel: string; scrollLabel: string; marqueeLead: string; marqueeTrail: string;
  visualCaption: string; visualHint: string; codePath: string; codeClass: string; codeBase: string; codeFocus: string[]; codeMindset: string; codePrompt: string;
  nodes: { id: "backend" | "research" | "fullstack"; label: string; projectId: string }[];
};
export type ContentSections = {
  work: SectionCopy & { actionLabel: string };
  skills: SectionCopy & { groups: SkillGroup[] };
  research: SectionCopy & { projectId: string; badge: string; subtitle: string; tags: string[]; linkLabel: string; flowLabel: string; note: string };
  walkthrough: SectionCopy & { modeLabel: string; requestLabel: string; stepDetail: string; linkLabel: string };
  capabilities: SectionCopy & { linkLabel: string; items: { id: string; title: string; summary: string; projectId: string }[] };
  projectsPage: SectionCopy;
  contactPage: SectionCopy & { detailsTitle: string };
  contactForm: { nameLabel: string; emailLabel: string; subjectLabel: string; messageLabel: string; namePlaceholder: string; emailPlaceholder: string; subjectPlaceholder: string; messagePlaceholder: string; submitLabel: string; sendingLabel: string; successText: string; errorText: string; directEmailLabel: string };
  projectPage: { overview: string; challenge: string; contribution: string; gallery: string; context: string; role: string; technologies: string; next: string; source: string; live: string; explore: string };
};

export type Project = {
  stack?: string[];
  repository?: string;
  liveUrl?: string;
  role?: string;
  challenge?: string;
  limitations?: string;
  flow?: string[];
  id: string;
  slug: string;
  title: string;
  year: string;
  category: string;
  summary: string;
  description: string;
  cover: string;
  coverCrop: ImageCrop;
  featured: boolean;
  aspect: "portrait" | "landscape" | "square";
  videoUrl: string;
  credits: Credit[];
  outcomes: string[];
  gallery: string[];
  galleryCrops: ImageCrop[];
  walkthroughSteps?: { id: string; title: string; detail: string; tech: string[]; payload: string }[];
  visual?: { kind: "icu" | "community" | "architecture" | "studio" | "custom"; heading: string; description: string; footer: string; labels: string[] };
};

export type ExperienceItem = {
  id: string;
  title: string;
  role: string;
  year: string;
  description: string;
  image: string;
  imageCrop: ImageCrop;
};

export type JobExperienceItem = {
  id: string;
  company: string;
  role: string;
  period: string;
  overview: string;
  cover: string;
  coverCrop: ImageCrop;
  learnings: { id: string; title: string; description: string }[];
};

export type SiteContent = {
  site: SiteSettings;
  hero: HeroSettings;
  sections: ContentSections;
  identity: {
    name: string;
    initials: string;
    role: string;
    university: string;
    location: string;
    email: string;
    phone: string;
    availability: string;
    portraitUrl: string;
    portraitCrop: ImageCrop;
    resumeUrl: string;
  };
  home: {
    eyebrow: string;
    title: string;
    accentWord: string;
    intro: string;
    heroImage: string;
    heroCrop: ImageCrop;
    showreelUrl: string;
    marquee: string[];
  };
  about: {
    eyebrow: string;
    title: string;
    lede: string;
    portraitUrl: string;
    portraitCrop: ImageCrop;
    story: string[];
    education: Credit[];
    skills: string[];
    statement: string;
    previousEducation: EducationItem[];
    languages: Credit[];
    educationLabel: string;
    languagesLabel: string;
    moreLabel: string;
    lessLabel: string;
    resumeLabel: string;
  };
  projects: Project[];
  extracurricular: {
    eyebrow: string;
    title: string;
    intro: string;
    items: ExperienceItem[];
  };
  // Legacy storage key retained so existing entries and exports remain valid.
  internship: {
    eyebrow: string;
    title: string;
    intro: string;
    emptyText: string;
    linkLabel: string;
    items: JobExperienceItem[];
  };
  contact: {
    eyebrow: string;
    title: string;
    intro: string;
    instagram: string;
    linkedin: string;
    behance: string;
  };
  theme: {
    background: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    line: string;
    displayFont: string;
    bodyFont: string;
  };
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
};
export type MessageAction = "read" | "unread" | "archive" | "restore" | "delete";

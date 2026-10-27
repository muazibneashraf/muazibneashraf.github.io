import type { SiteContent } from "./types";
import { validEditorialFields } from "./editorial-validation";

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: RecordValue, keys: string[]) =>
  keys.every((key) => typeof v[key] === "string");
const list = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const records = (v: unknown, check: (v: RecordValue) => boolean) =>
  Array.isArray(v) && v.every((x) => object(x) && check(x));
const credits = (v: unknown) =>
  records(v, (x) => strings(x, ["label", "value"]));
const crop = (v: unknown) =>
  v === undefined ||
  (object(v) &&
    ["x", "y", "zoom"].every(
      (k) => typeof v[k] === "number" && Number.isFinite(v[k]),
    ) &&
    ["cover", "contain"].includes(String(v.fit)));

// Shared by the import screen and API: invalid imports must never replace working content.
export function isValidContent(value: unknown): value is SiteContent {
  if (!object(value)) return false;
  const {
    identity,
    home,
    about,
    projects,
    extracurricular,
    internship,
    contact,
    theme,
  } = value;
  if (
    ![identity, home, about, extracurricular, internship, contact, theme].every(
      object,
    )
  )
    return false;
  const i = identity as RecordValue,
    h = home as RecordValue,
    a = about as RecordValue;
  const e = extracurricular as RecordValue,
    n = internship as RecordValue,
    c = contact as RecordValue,
    t = theme as RecordValue;
  if (
    !strings(i, [
      "name",
      "initials",
      "role",
      "university",
      "location",
      "email",
      "phone",
      "availability",
      "portraitUrl",
      "resumeUrl",
    ]) ||
    !i.name ||
    !crop(i.portraitCrop)
  )
    return false;
  if (
    !strings(h, [
      "eyebrow",
      "title",
      "accentWord",
      "intro",
      "heroImage",
      "showreelUrl",
    ]) ||
    !h.title ||
    !list(h.marquee) ||
    !crop(h.heroCrop)
  )
    return false;
  if (
    !strings(a, ["eyebrow", "title", "lede", "portraitUrl", "statement"]) ||
    !list(a.story) ||
    !list(a.skills) ||
    !credits(a.education) ||
    !crop(a.portraitCrop)
  )
    return false;
  if (
    !Array.isArray(projects) ||
    projects.length === 0 ||
    !records(
      projects,
      (p) =>
        strings(p, [
          "id",
          "slug",
          "title",
          "year",
          "category",
          "summary",
          "description",
          "cover",
          "videoUrl",
        ]) &&
        !!p.id &&
        !!p.title &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(p.slug)) &&
        typeof p.featured === "boolean" &&
        ["portrait", "landscape", "square"].includes(String(p.aspect)) &&
        list(p.outcomes) &&
        list(p.gallery) &&
        credits(p.credits) &&
        crop(p.coverCrop) &&
        (p.galleryCrops === undefined ||
          (Array.isArray(p.galleryCrops) && p.galleryCrops.every(crop))) &&
        ["stack", "flow"].every((k) => p[k] === undefined || list(p[k])) &&
        ["repository", "liveUrl", "role", "challenge", "limitations"].every(
          (k) => p[k] === undefined || typeof p[k] === "string",
        ),
    )
  )
    return false;
  if (
    new Set(projects.map((p) => p.slug)).size !== projects.length ||
    new Set(projects.map((p) => p.id)).size !== projects.length
  )
    return false;
  if (
    !strings(e, ["eyebrow", "title", "intro"]) ||
    !records(
      e.items,
      (x) =>
        strings(x, ["id", "title", "role", "year", "description", "image"]) &&
        crop(x.imageCrop),
    )
  )
    return false;
  if (
    !strings(n, ["eyebrow", "title", "intro"]) ||
    !records(
      n.items,
      (x) =>
        strings(x, ["id", "company", "role", "period", "overview", "cover"]) &&
        crop(x.coverCrop) &&
        records(x.learnings, (l) => strings(l, ["id", "title", "description"])),
    )
  )
    return false;
  if (
    !strings(c, [
      "eyebrow",
      "title",
      "intro",
      "instagram",
      "linkedin",
      "behance",
    ]) ||
    !strings(t, [
      "background",
      "surface",
      "ink",
      "muted",
      "accent",
      "line",
      "displayFont",
      "bodyFont",
    ])
  )
    return false;
  if (
    !["background", "surface", "ink", "muted", "accent", "line"].every((k) =>
      /^#[0-9a-f]{6}$/i.test(String(t[k])),
    )
  )
    return false;
  return validEditorialFields(value) && safeLinks(value);
}

function safeLinks(value: unknown, parent = ""): boolean {
  if (Array.isArray(value)) return value.every(item => safeLinks(item, parent));
  if (!object(value)) return true;
  return Object.entries(value).every(([key, v]) => {
    const image = parent !== "projectPage" && [
      "portraitUrl",
      "heroImage",
      "cover",
      "image",
      "gallery",
      "logoUrl",
      "iconUrl",
      "faviconUrl",
    ].includes(key);
    const link =
      image ||
      /Url$/.test(key) ||
      ["repository", "linkedin", "instagram", "behance"].includes(key);
    if (link) {
      const urls = Array.isArray(v) ? v : [v];
      return urls.every(
        (url) =>
          typeof url === "string" &&
          (!url ||
            /^https?:\/\//i.test(url) ||
            (/^\/(?![\/\\])/.test(url) && !/[\\\r\n]/.test(url)) ||
            (image &&
              /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(
                url,
              ))),
      );
    }
    return safeLinks(v, key);
  });
}

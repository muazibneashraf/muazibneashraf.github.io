import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import fsSync from "node:fs";
import os from "node:os";
import { put, get } from "@vercel/blob";
import { defaultContent } from "./default-content";
import { normalizeImageCrop } from "./image-crop";
import { withEditableContent } from "./editable-content";
import type { ContactMessage, MessageAction, SiteContent } from "./types";

const CONTENT_KEY = "muaz-portfolio:content";
const MESSAGES_KEY = "muaz-portfolio:messages";
const dataDirectory = path.join(process.cwd(), "data");

function resolveDataFile(fileName: string) {
  if (process.env.VERCEL) {
    const tmpPath = path.join(os.tmpdir(), fileName);
    if (!fsSync.existsSync(tmpPath)) {
      const bundled = path.join(dataDirectory, fileName);
      if (fsSync.existsSync(bundled)) {
        try {
          fsSync.copyFileSync(bundled, tmpPath);
        } catch {}
      }
    }
    return tmpPath;
  }
  return path.join(dataDirectory, fileName);
}

const contentFile = resolveDataFile("portfolio-content.json");
const messagesFile = resolveDataFile("messages.json");

function remoteConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function blobConfig() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const enabled =
    (Boolean(process.env.VERCEL) || process.env.USE_BLOB_STORAGE === "true") &&
    Boolean(token);
  return enabled ? { token: token! } : null;
}

async function remoteCommand<T>(command: (string | number)[]): Promise<T> {
  const config = remoteConfig();
  if (!config) throw new Error("Remote storage is not configured.");

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok)
    throw new Error(`Storage request failed (${response.status}).`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

async function readLocal<T>(file: string, fallback: T): Promise<T> {
  try {
    const value = await fs.readFile(file, "utf8");
    return JSON.parse(value) as T;
  } catch {
    return structuredClone(fallback);
  }
}

async function writeLocal(file: string, value: unknown) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

function normalizeContent(value: SiteContent): SiteContent {
  const normalized = withEditableContent(value);

  return {
    ...normalized,
    identity: {
      ...normalized.identity,
      portraitCrop: normalizeImageCrop(normalized.identity.portraitCrop),
    },
    home: {
      ...normalized.home,
      heroCrop: normalizeImageCrop(normalized.home.heroCrop),
    },
    about: {
      ...normalized.about,
      portraitCrop: normalizeImageCrop(normalized.about.portraitCrop),
    },
    projects: normalized.projects.map((project) => ({
      ...project,
      coverCrop: normalizeImageCrop(project.coverCrop),
      galleryCrops: project.gallery.map((_, index) =>
        normalizeImageCrop(project.galleryCrops?.[index]),
      ),
    })),
    extracurricular: {
      ...normalized.extracurricular,
      items: normalized.extracurricular.items.map((item) => ({
        ...item,
        imageCrop: normalizeImageCrop(item.imageCrop),
      })),
    },
    internship: {
      ...normalized.internship,
      eyebrow: ["Career direction", "Internship", "Internships"].includes(normalized.internship.eyebrow) ? "PROFESSIONAL EXPERIENCE" : normalized.internship.eyebrow,
      title: ["Ready for the next challenge.", "Internship", "Internships"].includes(normalized.internship.title) ? "Job experience." : normalized.internship.title,
      items: normalized.internship.items.map((item) => ({
        ...item,
        coverCrop: normalizeImageCrop(item.coverCrop),
      })),
    },
  };
}

export const getContent = cache(async (): Promise<SiteContent> => {
  if (remoteConfig()) {
    const stored = await remoteCommand<string | null>(["GET", CONTENT_KEY]);
    if (stored) return normalizeContent(JSON.parse(stored) as SiteContent);
    return normalizeContent(structuredClone(defaultContent));
  }
  const blob = blobConfig();
  if (blob) {
    try {
      const res = await get("data/portfolio-content.json", {
        access: "private",
        token: blob.token,
      });
      if (res) {
        const text = await new Response(res.stream).text();
        return normalizeContent(JSON.parse(text) as SiteContent);
      }
    } catch {}
  }
  return normalizeContent(await readLocal(contentFile, defaultContent));
});

export type UploadedResume = { base64: string; filename: string; hash: string };

export async function getUploadedResume(hash: string): Promise<UploadedResume | null> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  if (remoteConfig()) {
    const stored = await remoteCommand<string | null>(["GET", `muaz-portfolio:resume:${hash}`]);
    return stored ? JSON.parse(stored) as UploadedResume : null;
  }
  const blob = blobConfig();
  if (blob) {
    try {
      const res = await get(`data/resumes/${hash}.json`, {
        access: "private",
        token: blob.token,
      });
      if (res) {
        const text = await new Response(res.stream).text();
        return JSON.parse(text) as UploadedResume;
      }
    } catch {}
  }
  return readLocal(path.join(dataDirectory, "resumes", `${hash}.json`), null);
}

export async function saveUploadedResume(resume: UploadedResume) {
  if (remoteConfig()) {
    await remoteCommand<string>(["SET", `muaz-portfolio:resume:${resume.hash}`, JSON.stringify(resume)]);
    return;
  }
  const blob = blobConfig();
  if (blob) {
    await put(`data/resumes/${resume.hash}.json`, JSON.stringify(resume), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blob.token,
    });
    return;
  }
  if (process.env.VERCEL) throw new Error("Persistent storage is not configured.");
  const directory = path.join(dataDirectory, "resumes");
  await fs.mkdir(directory, { recursive: true });
  // Content-addressed documents keep the published version intact while a new
  // upload is still being edited in the admin.
  await writeLocal(path.join(directory, `${resume.hash}.json`), resume);
}

export async function saveContent(content: SiteContent) {
  content = normalizeContent(content);
  if (remoteConfig()) {
    await remoteCommand<string>(["SET", CONTENT_KEY, JSON.stringify(content)]);
    return;
  }
  const blob = blobConfig();
  if (blob) {
    await put("data/portfolio-content.json", JSON.stringify(content, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blob.token,
    });
  }
  try {
    await writeLocal(contentFile, content);
  } catch (err) {
    if (!blob) throw err;
  }
}

export async function getMessages(): Promise<ContactMessage[]> {
  if (remoteConfig()) {
    const stored = await remoteCommand<string | null>(["GET", MESSAGES_KEY]);
    return stored ? (JSON.parse(stored) as ContactMessage[]) : [];
  }
  const blob = blobConfig();
  if (blob) {
    try {
      const res = await get("data/messages.json", {
        access: "private",
        token: blob.token,
      });
      if (res) {
        const text = await new Response(res.stream).text();
        return JSON.parse(text) as ContactMessage[];
      }
    } catch {}
  }
  return readLocal(messagesFile, []);
}

async function saveMessages(messages: ContactMessage[]) {
  const blob = blobConfig();
  if (blob) {
    await put("data/messages.json", JSON.stringify(messages, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blob.token,
    });
  }
  try {
    await writeLocal(messagesFile, messages);
  } catch (err) {
    if (!blob) throw err;
  }
}

let messageWrite: Promise<void> = Promise.resolve();

export async function addMessage(message: ContactMessage) {
  if (remoteConfig()) {
    // Keep the existing JSON format while making concurrent inbox writes atomic.
    await remoteCommand<number>([
      "EVAL",
      "local raw=redis.call('GET',KEYS[1]); local items=raw and cjson.decode(raw) or {}; table.insert(items,1,cjson.decode(ARGV[1])); while #items>250 do table.remove(items) end; redis.call('SET',KEYS[1],cjson.encode(items)); return 1",
      1,
      MESSAGES_KEY,
      JSON.stringify(message),
    ]);
    return;
  }
  const write = messageWrite.then(async () => {
    const messages = await getMessages();
    await saveMessages([message, ...messages].slice(0, 250));
  });
  messageWrite = write.catch(() => {});
  await write;
}

export async function deleteMessage(id: string): Promise<boolean> {
  if (remoteConfig()) {
    const result = await remoteCommand<number>([
      "EVAL",
      "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local items=cjson.decode(raw); for i,m in ipairs(items) do if m.id==ARGV[1] then table.remove(items,i); redis.call('SET',KEYS[1],cjson.encode(items)); return 1 end end; return 0",
      1,
      MESSAGES_KEY,
      id,
    ]);
    return result === 1;
  }
  let deleted = false;
  const write = messageWrite.then(async () => {
    const messages = await getMessages();
    const filtered = messages.filter((item) => item.id !== id);
    if (filtered.length !== messages.length) {
      deleted = true;
      await saveMessages(filtered);
    }
  });
  messageWrite = write.catch(() => {});
  await write;
  return deleted;
}

export async function updateMessage(id: string, action: MessageAction): Promise<ContactMessage | null> {
  if (action === "delete") {
    return (await deleteMessage(id)) ? ({ id } as ContactMessage) : null;
  }
  const now = new Date().toISOString();
  if (remoteConfig()) {
    const result = await remoteCommand<string | null>(["EVAL",
      "local raw=redis.call('GET',KEYS[1]); if not raw then return nil end; local items=cjson.decode(raw); for _,m in ipairs(items) do if m.id==ARGV[1] then local key=(ARGV[2]=='archive' or ARGV[2]=='restore') and 'archivedAt' or 'readAt'; if ARGV[2]=='read' or ARGV[2]=='archive' then m[key]=ARGV[3] else m[key]=nil end; redis.call('SET',KEYS[1],cjson.encode(items)); return cjson.encode(m) end end; return nil",
      1, MESSAGES_KEY, id, action, now]);
    return result ? JSON.parse(result) as ContactMessage : null;
  }
  let updated: ContactMessage | null = null;
  const write = messageWrite.then(async () => {
    const messages = await getMessages();
    const message = messages.find(item => item.id === id);
    if (!message) return;
    if (action === "read") message.readAt = now;
    if (action === "unread") delete message.readAt;
    if (action === "archive") message.archivedAt = now;
    if (action === "restore") delete message.archivedAt;
    await saveMessages(messages);
    updated = message;
  });
  messageWrite = write.catch(() => {});
  await write;
  return updated;
}

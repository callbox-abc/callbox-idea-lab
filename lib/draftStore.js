import { normalizeContent } from "./normalizeContent";

export const STORAGE_KEY = "callbox-idea-lab:drafts:v1";

const MAX_ITEMS = 200;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const STRING_FIELDS = ["title", "service", "meta_description", "excerpt", "content", "inspired_by", "blogType", "savedAt"];

function sanitizeItem(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  const out = {};
  for (const key of STRING_FIELDS) {
    if (typeof raw[key] === "string") out[key] = raw[key];
  }
  if (typeof out.content === "string") out.content = normalizeContent(out.content);
  if (Array.isArray(raw.industries)) out.industries = raw.industries.filter((x) => typeof x === "string");
  else if (typeof raw.industries === "string") out.industries = raw.industries;
  return out;
}

function sanitizeList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const item = sanitizeItem(raw);
    if (item) out.push(item);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function loadDrafts() {
  try {
    if (typeof window === "undefined") return [];
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return [];
    return sanitizeList(JSON.parse(text));
  } catch {
    return [];
  }
}

export function saveDrafts(items) {
  try {
    if (typeof window === "undefined") return { ok: false, error: "Storage is not available." };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeList(items)));
    return { ok: true };
  } catch (e) {
    const quota = e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, error: quota ? "Storage is full." : "Storage is blocked or unavailable." };
  }
}

export function exportDrafts(items) {
  try {
    const now = new Date();
    const payload = { app: "callbox-idea-lab", version: 1, exportedAt: now.toISOString(), drafts: sanitizeList(items) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "callbox-idea-lab-drafts-" + now.toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not create the export file." };
  }
}

export function parseImport(text) {
  try {
    if (typeof text !== "string" || !text) return { ok: false, error: "The file is empty." };
    if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "The file is larger than 5 MB." };
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data) || data.app !== "callbox-idea-lab" || data.version !== 1 || !Array.isArray(data.drafts)) {
      return { ok: false, error: "This file is not a Callbox Idea Lab drafts export." };
    }
    const drafts = sanitizeList(data.drafts);
    if (!drafts.length) return { ok: false, error: "No valid drafts found in this file." };
    return { ok: true, drafts };
  } catch {
    return { ok: false, error: "The file could not be read as JSON." };
  }
}

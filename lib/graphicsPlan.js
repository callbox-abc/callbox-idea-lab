// Pure helpers for the Graphics feature. None of these functions throw.
import { parseBlocks } from "./contentBlocks";
import { proofPointsBlock } from "./proofPoints";
import { BRAND_STYLE } from "./brandStyle";

export const IMAGE_GEO_RULES = `IMAGE RULES (these follow the same GEO principles as the article):
1. Images supplement the text and never replace it. AI search engines cannot read text inside images, so any data an image shows must also exist as text or a table in the article. Prefer sections that already contain a table, numbered list or data points for chart, diagram and infographic images.
2. Placement protects the answer-first structure: an inline image goes AFTER the first paragraph under its ## heading, never between the heading and its direct-answer sentence, and never in or above the Quick Answer.
3. Figures: prompts for "canva_build" items, alt text and captions may use ONLY numbers that appear in the article text or in the CALLBOX PROOF POINTS. Never invent statistics, prices, results or percentages.
4. Alt text: one natural, standalone sentence describing what the image shows, max 125 characters. No "image of", no keyword stuffing, no Callbox or competitor names.
5. Captions: standalone and factual, max 100 characters. Do not repeat the article title or the heading verbatim. No Callbox or competitor names. No statistics unless they appear in the article.
6. File name: descriptive, lowercase, hyphenated, 3 to 6 words, ending in .webp. No dates, no "image1".
7. No competitor logos or brand names, no real people. Prompts for "ai_image" items contain no text, letters, numbers or logos.
8. Featured image plus 2 to 3 inline images maximum. No decorative filler: each image must explain something specific in its section.
9. Type hints: How-To uses a process diagram for the step list; Strategy uses a framework or pillar diagram or a chart; Listicle uses a category overview illustration with no competitor logos; Article uses a conceptual illustration.`;

const GRAPHICS_PROMPT =
  'Plan blog images for this article. Title: [title]. Blog type: [blogType]. Sections (heading, then first sentence): [one line per section]. Return ONLY a JSON array of exactly [N] items. Exactly 1 item has slot "featured" and the rest have slot "inline". Each item has: slot, after_heading, tool, type, description, alt_text, caption, file_name, dimensions, style, ai_prompt. For inline images, after_heading must be copied exactly from the section list. Each inline image goes in a different section, spread across the article, and never in the Quick Answer, the FAQ, or the closing call to action. For the featured image after_heading is an empty string. Choose sections where a visual explains something: a process, a comparison, a concept, a before and after. tool is "canva_build" for anything containing numbers, charts, tables, step lists or labeled diagrams; its ai_prompt then describes the layout and the exact text to place, using ONLY figures that appear in the article. tool is "ai_image" for illustrations and concept art. type is one of: illustration, diagram, infographic, chart, photo-style. dimensions: featured "1200x630", inline "1200x675". style: use this visual style for ALL images so they look like one set: [BRAND_STYLE]. Follow the IMAGE RULES below exactly. Do not use em dashes.';

export const CAPS = { altText: 125, caption: 100, description: 300, aiPrompt: 800, style: 200, afterHeading: 200 };
export const TOOL_LABEL = { canva_build: "Build in Canva", ai_image: "AI image" };
const TYPES = ["illustration", "diagram", "infographic", "chart", "photo-style"];
const DIMENSIONS = { featured: "1200x630", inline: "1200x675" };
const MAX_ITEMS = 4;
const MAX_INLINE = 3;

const str = (v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const clean = (v, max) => str(v).replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max).trim();
const stripMd = (s) => str(s).replace(/\*\*|__|`/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
const normHeading = (s) => stripMd(s).replace(/^#+\s*/, "").toLowerCase().trim();
const blockText = (b) => {
  if (b.type === "quote") return b.lines.join(" ");
  if (b.type === "ol") return b.items.join(" ");
  if (b.type === "table") return b.header.join(" ") + " " + b.rows.map((r) => r.join(" ")).join(" ");
  return b.text || "";
};

export function extractSections(content) {
  try {
    const out = [];
    let cur = null;
    let hasPara = false;
    parseBlocks(typeof content === "string" ? content : "").forEach((b) => {
      if (b.type === "h2") {
        cur = { index: out.length, heading: stripMd(b.text), firstSentence: "", hasData: false };
        hasPara = false;
        out.push(cur);
        return;
      }
      if (!cur) return;
      if (b.type === "table" || b.type === "ol" || /\d/.test(blockText(b))) cur.hasData = true;
      if (b.type === "p" && !hasPara && b.text.trim()) {
        hasPara = true;
        const t = stripMd(b.text);
        const m = t.match(/^.*?[.!?](?=\s|$)/);
        cur.firstSentence = (m ? m[0] : t).trim().slice(0, 200);
      }
    });
    return out;
  } catch {
    return [];
  }
}

export function buildGraphicsPrompt(title, blogType, sections) {
  const list = Array.isArray(sections) ? sections : [];
  const n = list.length >= 4 ? 4 : 3;
  const lines = list.map((s) => "- " + s.heading + (s.firstSentence ? " | " + s.firstSentence.replace(/[.!?]+$/, "") : "")).join("\n");
  const values = { title: str(title), blogType: str(blogType), "one line per section": lines ? "\n" + lines : "none", N: String(n), BRAND_STYLE };
  const filled = GRAPHICS_PROMPT.replace(/\[(title|blogType|one line per section|N|BRAND_STYLE)\]/g, (_, k) => values[k]);
  return filled + "\n\n" + IMAGE_GEO_RULES + "\n\n" + proofPointsBlock();
}

export function matchHeading(raw, sections) {
  const n = normHeading(raw);
  if (!n || !Array.isArray(sections)) return null;
  const exact = sections.find((s) => normHeading(s.heading) === n);
  if (exact) return exact;
  if (n.length < 4) return null;
  return sections.find((s) => {
    const h = normHeading(s.heading);
    return h && (h.includes(n) || n.includes(h));
  }) || null;
}

const slug = (s) =>
  str(s)
    .toLowerCase()
    .replace(/\.(webp|png|jpe?g|gif|svg)$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const fileBase = (s) => slug(s).slice(0, 55).replace(/-+$/, "");
const firstWords = (s, n) => stripMd(s).split(" ").slice(0, n).join(" ");

function fileNameFrom(raw, altText, description) {
  let base = fileBase(raw);
  if (base.length < 3) base = fileBase(firstWords(altText, 6));
  if (base.length < 3) base = fileBase(firstWords(description, 6));
  if (base.length < 3) base = "blog-visual";
  return base + ".webp";
}

const stripNonFigures = (s) =>
  str(s)
    .replace(/#[0-9a-f]{3,8}\b/gi, " ")
    .replace(/\b\d{3,4}\s*[x\u00d7]\s*\d{3,4}\b/gi, " ")
    .replace(/\b\d+\s*(?:px|:\d+)\b/gi, " ");

function cleanItem(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  const pick = (a, b) => (r[a] !== undefined ? r[a] : r[b]);
  const altText = clean(pick("alt_text", "altText"), CAPS.altText);
  const description = clean(r.description, CAPS.description);
  const aiPrompt = clean(pick("ai_prompt", "aiPrompt"), CAPS.aiPrompt);
  if (!altText && !description && !aiPrompt) return null;
  const slot = str(r.slot).toLowerCase().trim() === "featured" ? "featured" : "inline";
  let tool = /canva/i.test(str(r.tool)) ? "canva_build" : "ai_image";
  // Anything involving figures must be built, never generated, so the numbers stay accurate.
  if (tool === "ai_image" && /\d/.test(stripNonFigures(aiPrompt + " " + description))) tool = "canva_build";
  const typeRaw = str(r.type).toLowerCase().trim().replace(/[\s_]+/g, "-");
  return {
    slot,
    afterHeading: clean(pick("after_heading", "afterHeading"), CAPS.afterHeading),
    matched: r.matched !== false,
    tool,
    type: TYPES.includes(typeRaw) ? typeRaw : tool === "canva_build" ? "diagram" : "illustration",
    description,
    altText,
    caption: clean(r.caption, CAPS.caption),
    fileName: fileNameFrom(pick("file_name", "fileName"), altText, description),
    dimensions: DIMENSIONS[slot],
    style: clean(r.style, CAPS.style),
    aiPrompt,
    textEquivalent: r.textEquivalent !== false,
  };
}

export function normalizePlan(rawItems, sections) {
  try {
    const items = (Array.isArray(rawItems) ? rawItems : []).map(cleanItem).filter(Boolean);
    if (!items.length) return [];
    const featured = items.find((x) => x.slot === "featured") || items[0];
    featured.slot = "featured";
    featured.dimensions = DIMENSIONS.featured;
    featured.afterHeading = "";
    featured.matched = true;
    featured.textEquivalent = true;
    const inline = items
      .filter((x) => x !== featured)
      .slice(0, MAX_INLINE)
      .map((x) => {
        const m = matchHeading(x.afterHeading, sections);
        return {
          ...x,
          slot: "inline",
          dimensions: DIMENSIONS.inline,
          afterHeading: m ? m.heading : x.afterHeading,
          matched: !!m,
          textEquivalent: !(x.tool === "canva_build" && m && !m.hasData),
          _order: m ? m.index : 999,
        };
      })
      .sort((a, b) => a._order - b._order)
      .map(({ _order, ...rest }) => rest);
    return [featured, ...inline].slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

// Stored plans go through the same field caps as freshly generated ones.
export function sanitizeStoredPlan(list) {
  try {
    if (!Array.isArray(list)) return [];
    return list.map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

// One entry per plan item, matched against the CURRENT article headings.
// stale is true when an inline item no longer has a section to sit in.
export function resolveSlots(plan, content) {
  try {
    const sections = extractSections(content);
    return (Array.isArray(plan) ? plan : []).map((g, i) => {
      const slot = { n: i + 1, slot: g.slot, altText: g.altText, dimensions: g.dimensions, heading: "", sectionIndex: -1, stale: false, hasData: true, note: "" };
      if (g.slot === "featured") return slot;
      const m = g.afterHeading ? matchHeading(g.afterHeading, sections) : null;
      if (m) return { ...slot, heading: m.heading, sectionIndex: m.index, hasData: m.hasData };
      return { ...slot, stale: true, hasData: false, note: g.matched === false ? "Placement unclear, regenerate" : "Section changed, regenerate" };
    });
  } catch {
    return [];
  }
}

const placeholderText = (s) => String(s.altText || "").replace(/[*\r\n]+/g, " ").trim() + " | " + s.dimensions;
const isParagraphLine = (l) => !!l.trim() && !/^(#{2,3} |>|- |\d+\.\s|\s*\|)/.test(l);

// Returns article text with [FEATURED IMAGE: ...] / [IMAGE n: ...] lines added. Export only, never stored.
export function withImagePlaceholders(content, plan) {
  const text = typeof content === "string" ? content : "";
  try {
    const slots = resolveSlots(plan, text);
    if (!slots.length) return text;
    const bySection = {};
    slots.forEach((s) => {
      if (s.slot === "featured" || s.sectionIndex < 0) return;
      (bySection[s.sectionIndex] = bySection[s.sectionIndex] || []).push(s);
    });
    const out = [];
    const featured = slots.find((s) => s.slot === "featured");
    if (featured) out.push("[FEATURED IMAGE: " + placeholderText(featured) + "]");
    let pending = [];
    let ordinal = -1;
    const flush = () => {
      pending.forEach((s) => out.push("[IMAGE " + s.n + ": " + placeholderText(s) + "]"));
      pending = [];
    };
    text.split("\n").forEach((l) => {
      if (l.startsWith("## ")) {
        flush();
        ordinal += 1;
        pending = bySection[ordinal] ? [...bySection[ordinal]] : [];
        out.push(l);
        return;
      }
      out.push(l);
      if (pending.length && isParagraphLine(l)) flush();
    });
    flush();
    return out.join("\n");
  } catch {
    return text;
  }
}

export function altTextList(plan) {
  return (Array.isArray(plan) ? plan : []).map((g) => g.altText).filter(Boolean).join("\n");
}

// Tab-separated, one row per image, ready to paste into a spreadsheet.
export function imageSheet(plan, content) {
  const list = Array.isArray(plan) ? plan : [];
  const slots = resolveSlots(list, content);
  const cell = (v) => String(v == null ? "" : v).replace(/[\t\r\n]+/g, " ").trim();
  const rows = [["Number", "Slot", "Section", "File name", "Alt text", "Caption", "Dimensions", "Tool"]];
  list.forEach((g, i) => {
    const section = g.slot === "featured" ? "" : (slots[i] && slots[i].heading) || g.afterHeading;
    rows.push([i + 1, g.slot, section, g.fileName, g.altText, g.caption, g.dimensions, TOOL_LABEL[g.tool] || g.tool]);
  });
  return rows.map((r) => r.map(cell).join("\t")).join("\n");
}

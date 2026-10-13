import { parseBlocks } from "./contentBlocks";
import { PROOF_POINTS } from "./proofPoints";
import { resolveSlots, CAPS } from "./graphicsPlan";

const QA_PREFIX = "> **Quick Answer:**";
const BANNED = ["in today's fast-paced", "in the ever-evolving", "in today\u2019s fast-paced"];

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const sentences = (s) => (s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).filter((x) => x.trim()).length;

// Pure, informational checks. Returns [{ id, label, pass, detail }].
// An optional graphics plan adds the image checks.
export function geoCheck(content, plan) {
  const text = content || "";
  const lines = text.split("\n");
  const blocks = parseBlocks(text);
  const items = [];

  const qaIdx = lines.findIndex((l) => l.trim().startsWith(QA_PREFIX));
  const wordsBefore = qaIdx >= 0 ? words(lines.slice(0, qaIdx).join(" ")) : 0;
  items.push({
    id: "qa-position",
    label: "Quick Answer callout within the first 120 words",
    pass: qaIdx >= 0 && wordsBefore < 120,
    detail: qaIdx < 0 ? "Not found" : "Starts at word " + (wordsBefore + 1),
  });

  const qaWords = qaIdx >= 0 ? words(lines[qaIdx].trim().slice(QA_PREFIX.length).replace(/\*\*/g, "")) : 0;
  items.push({
    id: "qa-length",
    label: "Quick Answer is 40-60 words",
    pass: qaIdx >= 0 && qaWords >= 40 && qaWords <= 60,
    detail: qaIdx < 0 ? "Not found" : qaWords + " words",
  });

  const h2s = blocks.filter((b) => b.type === "h2");
  const qCount = h2s.filter((b) => b.text.trim().endsWith("?")).length;
  const qPct = h2s.length ? Math.round((qCount / h2s.length) * 100) : 0;
  items.push({
    id: "question-headings",
    label: "Question-style ## headings (expected for How-To and Article)",
    pass: h2s.length > 0 && qPct >= 50,
    detail: qCount + " of " + h2s.length + " (" + qPct + "%)",
  });

  const hasTable = blocks.some((b) => b.type === "table");
  const hasOl = blocks.some((b) => b.type === "ol");
  items.push({
    id: "formats",
    label: "At least one table or numbered list",
    pass: hasTable || hasOl,
    detail: hasTable && hasOl ? "Table and numbered list" : hasTable ? "Table" : hasOl ? "Numbered list" : "None found",
  });

  const longParas = blocks.filter((b) => b.type === "p" && sentences(b.text) > 3).length;
  items.push({
    id: "paragraph-length",
    label: "No paragraph over 3 sentences",
    pass: longParas === 0,
    detail: longParas === 0 ? "All short" : longParas + " too long",
  });

  const lower = text.toLowerCase();
  const hit = BANNED.find((b) => lower.includes(b));
  items.push({
    id: "openers",
    label: "No throat-clearing openers",
    pass: !hit,
    detail: hit ? 'Found "' + hit + '"' : "None found",
  });

  const sections = [];
  blocks.forEach((b) => {
    if (b.type === "h2") sections.push({ title: b.text, body: "" });
    else if (sections.length) {
      const s = sections[sections.length - 1];
      if (b.type === "quote") s.body += " " + b.lines.join(" ");
      else if (b.type === "ol") s.body += " " + b.items.join(" ");
      else if (b.type === "table") s.body += " " + b.header.join(" ") + " " + b.rows.map((r) => r.join(" ")).join(" ");
      else if (b.text) s.body += " " + b.text;
    }
  });
  const noDigit = sections.filter((s) => !/\d/.test(s.body)).length;
  items.push({
    id: "digits",
    label: "Every ## section contains a figure",
    pass: sections.length > 0 && noDigit === 0,
    detail: sections.length ? sections.length - noDigit + " of " + sections.length + " sections" : "No sections",
  });

  const flagged = figureSentences(blocks);
  items.push({
    id: "figures",
    label: "Figures to verify",
    pass: flagged.length === 0,
    detail: flagged.length + (flagged.length === 1 ? " sentence" : " sentences"),
    list: flagged,
  });

  const mentions = (text.match(/callbox/gi) || []).length;
  items.push({
    id: "callbox-mentions",
    label: "Callbox mentions (6 or fewer)",
    pass: mentions <= 6,
    detail: String(mentions),
  });

  if (Array.isArray(plan) && plan.length) items.push(...imageChecks(text, plan));

  return items;
}

const FIGURE_RE = /\d+(?:\.\d+)?\s*%|\$\s?\d|\b\d+(?:\.\d+)?x\b|\b(?:over|up to)\s+\$?\d/i;
const numbersIn = (s) => (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, ""));
const PROOF_NUMBERS = new Set(PROOF_POINTS.flatMap(numbersIn));

// Shared by the sentence check and the image check: numbers that are neither
// in the approved proof points nor in the optional extra set (the article's own numbers).
const unknownNumbers = (s, extra) => numbersIn(s).filter((n) => !PROOF_NUMBERS.has(n) && !(extra && extra.has(n)));

// Dimensions, hex colors and pixel sizes in prompts are not figures.
const withoutLayoutNumbers = (s) =>
  s
    .replace(/#[0-9a-f]{3,8}\b/gi, " ")
    .replace(/\b\d{3,4}\s*[x\u00d7]\s*\d{3,4}\b/gi, " ")
    .replace(/\b\d+\s*(?:px|:\d+)\b/gi, " ");

function imageChecks(text, plan) {
  const slots = resolveSlots(plan, text);
  const inline = plan.map((g, i) => i).filter((i) => plan[i].slot !== "featured");
  const featuredCount = plan.length - inline.length;
  const placed = inline.filter((i) => slots[i] && slots[i].sectionIndex >= 0);
  const used = placed.map((i) => slots[i].sectionIndex);
  const sharedSection = used.length !== new Set(used).size;
  const complete = featuredCount === 1 && inline.length >= 2 && placed.length === inline.length && !sharedSection;
  const unplaced = inline.length - placed.length;

  const badText = plan.filter((g) => (g.altText || "").length > CAPS.altText || (g.caption || "").length > CAPS.caption || /callbox/i.test((g.altText || "") + " " + (g.caption || ""))).length;

  const noText = inline.filter((i) => plan[i].tool === "canva_build" && (!slots[i] || slots[i].sectionIndex < 0 || !slots[i].hasData)).length;

  const known = new Set(numbersIn(text));
  const seen = new Set();
  const figures = [];
  plan.forEach((g, i) => {
    const fields = [["alt text", g.altText], ["caption", g.caption]];
    if (g.tool === "canva_build") fields.unshift(["prompt", g.aiPrompt]);
    fields.forEach(([name, value]) => {
      unknownNumbers(withoutLayoutNumbers(value || ""), known).forEach((n) => {
        const entry = n + " in image " + (i + 1) + " " + name;
        if (!seen.has(entry)) {
          seen.add(entry);
          figures.push(entry);
        }
      });
    });
  });

  return [
    {
      id: "image-plan",
      label: "Image plan complete",
      pass: complete,
      detail: featuredCount + " featured, " + inline.length + " inline" + (unplaced ? ", " + unplaced + " unplaced" : "") + (sharedSection ? ", two in one section" : ""),
    },
    {
      id: "image-text",
      label: "Alt text and captions",
      pass: badText === 0,
      detail: badText === 0 ? "All within limits" : badText + (badText === 1 ? " image to fix" : " images to fix"),
    },
    {
      id: "image-data",
      label: "Image data has a text equivalent",
      pass: noText === 0,
      detail: noText === 0 ? "Yes" : noText + (noText === 1 ? " section lacks data" : " sections lack data"),
    },
    {
      id: "image-figures",
      label: "Image figures to verify",
      pass: figures.length === 0,
      detail: figures.length + (figures.length === 1 ? " figure" : " figures"),
      list: figures,
      listLabel: "Show figures",
    },
  ];
}

function figureSentences(blocks) {
  const units = [];
  blocks.forEach((b) => {
    if (b.type === "quote") units.push(...b.lines);
    else if (b.type === "ol") units.push(...b.items);
    else if (b.type === "table") units.push(b.header.join(" "), ...b.rows.map((r) => r.join(" ")));
    else if (b.text) units.push(b.text);
  });
  const out = [];
  units.forEach((u) => {
    u.replace(/\*\*/g, "")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        if (!FIGURE_RE.test(s)) return;
        if (unknownNumbers(s).length === 0) return;
        out.push(s);
      });
  });
  return out;
}

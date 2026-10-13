import { parseBlocks } from "./contentBlocks";
import { PROOF_POINTS } from "./proofPoints";
import { resolveSlots, CAPS } from "./graphicsPlan";

const QA_PREFIX = "> **Quick Answer:**";
const BANNED = ["in today's fast-paced", "in the ever-evolving", "in today\u2019s fast-paced"];

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const sentences = (s) => (s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).filter((x) => x.trim()).length;

// Word count of the Quick Answer text only: the "> **Quick Answer:**" label and
// bold markers are stripped first. Returns -1 when there is no Quick Answer.
export function quickAnswerWords(content) {
  const line = (content || "").split("\n").find((l) => l.trim().startsWith(QA_PREFIX));
  return line ? words(line.trim().slice(QA_PREFIX.length).replace(/\*\*/g, "")) : -1;
}

const PLACEHOLDER_RES = [/\[[^\]\n]*\bNEEDED\b[^\]\n]*\]/gi, /\[\s*(?:STAT|STATISTIC|SOURCE|CITATION)\s*\]/gi];
export function findPlaceholders(content) {
  const text = content || "";
  return PLACEHOLDER_RES.flatMap((re) => text.match(re) || []);
}

const blockText = (b) => b.text || (b.lines ? b.lines.join(" ") : "") || (b.items ? b.items.join(" ") : "");
const firstSentence = (s) => s.split(/(?<=[.!?])\s+/)[0] || "";

// Which of the three required Callbox placements are missing.
function missingCallboxPlacements(blocks, qaLine) {
  const named = (s) => /callbox/i.test(s || "");
  const missing = [];
  if (!named(qaLine)) missing.push("Quick Answer");

  let closingIdx = -1;
  blocks.forEach((b, i) => {
    if (b.type === "h2" && !/\bfaq|frequently asked/i.test(b.text)) closingIdx = i;
  });
  const opener = closingIdx >= 0 ? blocks.slice(closingIdx + 1).find((b) => !/^h[23]$/.test(b.type) && blockText(b)) : null;
  if (!opener || !named(firstSentence(blockText(opener)))) missing.push("closing section opening");

  const last = [...blocks].reverse().find((b) => !/^h[23]$/.test(b.type) && b.type !== "table" && blockText(b));
  if (!last || !named(blockText(last))) missing.push("CTA");
  return missing;
}

// Pure, informational checks. Returns [{ id, label, pass, detail }].
// An optional graphics plan adds the image checks. approvedNums is a Set of
// number strings the user approved, which are not flagged as unverified figures.
// meta is optional: { primaryKeyword, blogType, userFacts } from the saved item.
export function geoCheck(content, plan, approvedNums, meta) {
  const text = content || "";
  const lines = text.split("\n");
  const blocks = parseBlocks(text);
  const items = [];
  const { primaryKeyword = "", blogType = "", userFacts = "" } = meta || {};
  const userLower = String(userFacts).toLowerCase();
  const approved = new Set([...(approvedNums || []), ...numbersIn(String(userFacts))]);

  const qaIdx = lines.findIndex((l) => l.trim().startsWith(QA_PREFIX));
  const wordsBefore = qaIdx >= 0 ? words(lines.slice(0, qaIdx).join(" ")) : 0;
  items.push({
    id: "qa-position",
    label: "Quick Answer callout within the first 120 words",
    pass: qaIdx >= 0 && wordsBefore < 120,
    detail: qaIdx < 0 ? "Not found" : "Starts at word " + (wordsBefore + 1),
  });

  const qaWords = quickAnswerWords(text);
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

  const h3Sections = [];
  blocks.forEach((b) => {
    if (b.type === "h2") h3Sections.push({ title: b.text, h3: 0 });
    else if (b.type === "h3" && h3Sections.length) h3Sections[h3Sections.length - 1].h3 += 1;
  });
  const loneH3 = h3Sections.filter((s) => s.h3 === 1).map((s) => s.title);
  items.push({
    id: "lone-h3",
    label: "No ## section with a single ### sub-heading",
    pass: loneH3.length === 0,
    detail: loneH3.length === 0 ? "None found" : loneH3.length + (loneH3.length === 1 ? " section" : " sections"),
    list: loneH3,
    listLabel: "Show sections",
  });

  const standalone = blocks.filter((b) => b.type === "p" && /^(?:this|these|that|those|it)\b/i.test(plainText(b.text).trim())).map((b) => plainText(b.text).trim().slice(0, 80));
  items.push({
    id: "standalone-openers",
    label: "At most 2 paragraphs open with This, These, That, Those or It",
    pass: standalone.length <= 2,
    detail: String(standalone.length),
    list: standalone,
    listLabel: "Show paragraphs",
  });

  const kw = keywordStats(blocks, primaryKeyword);
  items.push({
    id: "keyword-density",
    label: "Primary keyword in at most 2 headings and no more than once per 150 words",
    pass: !kw.phrase || (kw.headings <= 2 && kw.per150 <= 1),
    detail: kw.phrase ? '"' + kw.phrase + '"' + (kw.auto ? " (auto) " : " ") + kw.total + " uses, " + kw.headings + " in headings, " + kw.per150.toFixed(1) + " per 150 words" : "No repeated phrase found",
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

  const flagged = figureSentences(blocks, approved, userLower);
  items.push({
    id: "figures",
    label: "Figures to verify",
    pass: flagged.length === 0,
    detail: flagged.length + (flagged.length === 1 ? " sentence" : " sentences"),
    list: flagged,
  });

  const vague = allSentences(blocks).filter((s) => VAGUE_RE.test(s) && !/\b(?:19|20)\d{2}\b/.test(s));
  items.push({
    id: "vague-attribution",
    label: "No vague attribution such as \"a recent study\" without a year",
    pass: vague.length === 0,
    detail: vague.length + (vague.length === 1 ? " sentence" : " sentences"),
    list: vague,
  });

  const mentions = (text.match(/callbox/gi) || []).length;
  items.push({
    id: "callbox-mentions",
    label: "Callbox mentions (6 or fewer)",
    pass: mentions <= 6,
    detail: String(mentions),
  });

  const missingPlacements = missingCallboxPlacements(blocks, qaIdx >= 0 ? lines[qaIdx] : "");
  items.push({
    id: "callbox-placements",
    label: "Callbox named in the Quick Answer, closing section opening, and CTA",
    pass: missingPlacements.length === 0,
    detail: missingPlacements.length ? "Missing: " + missingPlacements.join(", ") : "All three",
  });

  if (blogType === "listicle" || blogType === "strategy") {
    const lastParas = blocks.filter((b) => b.type === "p" && b.text.trim()).slice(-2);
    const hasAction = lastParas.some((b) => CTA_ACTION_RE.test(b.text));
    items.push({
      id: "closing-action",
      label: "Closing call to action in the last two paragraphs",
      pass: hasAction,
      detail: hasAction ? "Found" : "Not found",
    });
  }

  const placeholders = findPlaceholders(text);
  items.push({
    id: "placeholders",
    label: "No placeholder text such as [STAT NEEDED]",
    pass: placeholders.length === 0,
    detail: placeholders.length ? placeholders.length + " found" : "None found",
    list: placeholders,
    listLabel: "Show placeholders",
  });

  if (Array.isArray(plan) && plan.length) items.push(...imageChecks(text, plan));

  return items;
}

const FIGURE_RE = new RegExp(
  [
    "\\d+(?:\\.\\d+)?\\s*%",
    "\\$\\s?\\d",
    "\\b\\d+(?:\\.\\d+)?x\\b",
    "\\b(?:over|up to)\\s+\\$?\\d",
    "\\d+(?:\\.\\d+)?\\s*(?:-|\\u2013|to)\\s*\\d+(?:\\.\\d+)?\\s*(?:times|x\\b|%)",
    "\\b\\d+(?:\\.\\d+)?\\s*times\\b",
    "\\b\\d+\\s+out\\s+of\\s+\\d+\\b",
    "\\b\\d+\\s+in\\s+\\d+\\b",
    "\\b\\d+(?:\\.\\d+)?-?\\s?fold\\b",
  ].join("|"),
  "i"
);
const MULTIPLIER_RE = /\b(?:doubled|tripled|quadrupled)\b/i;
const VAGUE_RE = /\brecent\s+(?:study|studies|survey|surveys|report|research)\b|\b(?:studies|research|surveys|data)\s+(?:show|shows|suggest|suggests|indicate|indicates)\b|\bexperts\s+(?:say|agree|believe)\b|\baccording\s+to\s+(?:a|one)\s+(?:study|survey|report)\b/i;
const CTA_ACTION_RE = /\b(?:book|schedule|contact|talk\s+to|request|get\s+started|reach\s+out)\b/i;
const numbersIn = (s) => (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, ""));
const PROOF_NUMBERS = new Set(PROOF_POINTS.flatMap((p) => numbersIn(p.text)));
const plainText = (s) => (s || "").replace(/\*\*/g, "");

const STOPWORDS = new Set(
  "a an the and or but of to in on at for with from by as is are was were be been it its this that these those you your we our they their can will not no more most how what why when which who into than then so if about over under up out one".split(" ")
);

// Primary keyword stats: counts, headings containing it and uses per 150 words.
// With no keyword supplied the most repeated 2-3 word phrase (not starting or ending
// with a stopword) stands in for it.
function keywordStats(blocks, keyword) {
  const units = textUnits(blocks).map(plainText);
  const hay = units.join("\n");
  const headings = blocks.filter((b) => b.type === "h2" || b.type === "h3").map((b) => plainText(b.text));
  const wordTotal = words(hay);
  let phrase = String(keyword || "").trim().toLowerCase();
  let auto = false;
  if (!phrase) {
    auto = true;
    const toks = hay.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || [];
    const counts = new Map();
    let best = "";
    let bestCount = 1;
    [2, 3].forEach((n) => {
      for (let i = 0; i + n <= toks.length; i++) {
        const gram = toks.slice(i, i + n);
        if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[n - 1])) continue;
        const key = gram.join(" ");
        const c = (counts.get(key) || 0) + 1;
        counts.set(key, c);
        if (c > bestCount) {
          best = key;
          bestCount = c;
        }
      }
    });
    phrase = best;
  }
  if (!phrase) return { phrase: "", auto, total: 0, headings: 0, per150: 0 };
  const re = new RegExp("(?<![a-z0-9])" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+") + "(?![a-z0-9])", "gi");
  const total = (hay.match(re) || []).length;
  const inHeadings = headings.filter((h) => new RegExp(re.source, "i").test(h)).length;
  return { phrase, auto, total, headings: inHeadings, per150: wordTotal ? total / (wordTotal / 150) : 0 };
}

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

function textUnits(blocks) {
  const units = [];
  blocks.forEach((b) => {
    if (b.type === "quote") units.push(...b.lines);
    else if (b.type === "ol") units.push(...b.items);
    else if (b.type === "table") units.push(b.header.join(" "), ...b.rows.map((r) => r.join(" ")));
    else if (b.text) units.push(b.text);
  });
  return units;
}

function allSentences(blocks) {
  return textUnits(blocks).flatMap((u) =>
    plainText(u)
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function figureSentences(blocks, approvedNums, userLower) {
  return allSentences(blocks).filter((s) => {
    const multiplier = s.match(MULTIPLIER_RE);
    if (multiplier && !(userLower || "").includes(multiplier[0].toLowerCase())) return true;
    return FIGURE_RE.test(s) && unknownNumbers(s, approvedNums).length > 0;
  });
}

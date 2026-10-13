export const MAX_FACTS = 5;

const YEAR_RE = /^(?:19|20)\d{2}$/;

export const emptyFact = () => ({ stat: "", source: "", year: "" });

const clean = (value, max) =>
  String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/"{3,}/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// Only rows with a stat, a source and a four-digit year are used, because every
// statistic has to carry its source and year in the same sentence.
export function usableFacts(rows) {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, MAX_FACTS)
    .map((r) => ({ stat: clean(r && r.stat, 240), source: clean(r && r.source, 120), year: clean(r && r.year, 4) }))
    .filter((r) => r.stat && r.source && YEAR_RE.test(r.year));
}

export function isIncompleteFact(row) {
  const filled = [row.stat, row.source, row.year].filter((v) => String(v || "").trim()).length;
  return filled > 0 && usableFacts([row]).length === 0;
}

// Numbers the user approved, so the figure checker does not flag them as unverified.
export function approvedNumbers(rows) {
  const out = new Set();
  usableFacts(rows).forEach((f) => {
    (f.stat.match(/\d[\d,]*(?:\.\d+)?/g) || []).forEach((n) => out.add(n.replace(/,/g, "")));
    out.add(f.year);
  });
  return out;
}

export const MAX_USER_FACTS = 1500;

// Free-text facts keep their line breaks. Control characters and triple quotes are removed
// so the text cannot break out of the quoted prompt block.
export function cleanUserFacts(text) {
  return String(text == null ? "" : text)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/"{3,}/g, '"')
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_USER_FACTS);
}

export function userFactsBlock(text) {
  const facts = cleanUserFacts(text);
  if (!facts) return "";
  return 'USER-SUPPLIED FACTS (you may cite these exactly as written, with the source as given; do not extend, round or change them):\n"""\n' + facts + '\n"""';
}

const NO_PLACEHOLDERS =
  "Never write a placeholder such as [STAT NEEDED] or [SOURCE] anywhere in the article. If a figure is missing, write a qualitative statement instead.";

export function approvedFactsBlock(rows) {
  const facts = usableFacts(rows);
  if (!facts.length) {
    return "NO APPROVED FACTS WERE SUPPLIED: for figures use only CALLBOX PROOF POINTS or qualitative statements, and do not invent a number. " + NO_PLACEHOLDERS;
  }
  const lines = facts.map((f, i) => i + 1 + ". " + f.stat + " (Source: " + f.source + ", " + f.year + ")");
  return (
    "APPROVED FACTS (supplied by the user, so they are safe to use). Use each fact only where it fits, exactly as written, and name its source and year in the same sentence. Put the strongest one in the problem section and use another where the article needs a fresh, dated figure. Prefer these over any figure from memory, and do not round, combine or extend them.\n" +
    lines.join("\n") +
    "\n" +
    NO_PLACEHOLDERS
  );
}

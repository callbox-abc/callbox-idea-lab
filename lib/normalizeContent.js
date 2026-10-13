const TOC_RE = /^#{1,6}\s+(table of contents|contents):?\s*$/i;
const RULE_RE = /^(\*\s*){3,}$/;

// Pure and idempotent cleanup for AI-generated markdown. Only the cases below are touched.
export function normalizeContent(content) {
  if (typeof content !== "string") return "";
  const lines = content.split("\n");
  const out = [];
  let seenH2 = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (TOC_RE.test(line.trim())) {
      if (i + 1 < lines.length && !lines[i + 1].trim()) i++;
      continue;
    }

    if (line.startsWith("# ")) line = "#" + line;
    else if (/^#{4,} /.test(line)) line = line.replace(/^#{4,} /, "### ");

    if (line.startsWith("### ") && !seenH2) line = line.slice(1);
    if (line.startsWith("## ")) seenH2 = true;

    if (!RULE_RE.test(line.trim())) line = line.replace(/^(?:\* |\+ |\u2022 )/, "- ");

    out.push(line);
  }

  const collapsed = [];
  let blanks = 0;
  for (const line of out) {
    if (!line.trim()) {
      blanks++;
      if (blanks > 2) continue;
    } else {
      blanks = 0;
    }
    collapsed.push(line);
  }
  return collapsed.join("\n");
}

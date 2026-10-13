// Hand-written parser for the limited markdown the blog generator emits.
// Shared by the preview renderer, the DOC export, the plain-text copy and geoCheck.

const SEP_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isTableLine(l) {
  return l.trim().startsWith("|");
}

// A line that continues a paragraph: not blank, heading, quote, numbered item, bullet or table row.
function isPlainLine(l) {
  return !!l.trim() && !/^(#{2,3} |>|- |\d+\.\s)/.test(l) && !isTableLine(l);
}

// Returns an array of blocks:
// h2/h3/li/p {text}, br, quote {lines}, ol {items}, table {header, rows}
export function parseBlocks(text) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("### ")) {
      blocks.push({ type: "h3", text: l.slice(4) });
      i++;
      continue;
    }
    if (l.startsWith("## ")) {
      blocks.push({ type: "h2", text: l.slice(3) });
      i++;
      continue;
    }
    if (/^>\s?/.test(l)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }
    if (/^\d+\.\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    if (isTableLine(l)) {
      const start = i;
      const group = [];
      while (i < lines.length && isTableLine(lines[i])) {
        group.push(lines[i]);
        i++;
      }
      const header = splitRow(group[0]);
      const valid = group.length >= 2 && header.length >= 2 && SEP_RE.test(group[1].trim());
      if (valid) {
        const rows = group.slice(2).map((r) => {
          const cells = splitRow(r);
          while (cells.length < header.length) cells.push("");
          return cells.slice(0, header.length);
        });
        blocks.push({ type: "table", header, rows });
      } else {
        for (let k = start; k < i; k++) blocks.push({ type: "p", text: lines[k] });
      }
      continue;
    }
    if (l.startsWith("- ")) {
      blocks.push({ type: "li", text: l.slice(2) });
      i++;
      continue;
    }
    if (!l.trim()) {
      blocks.push({ type: "br" });
      i++;
      continue;
    }
    // Consecutive non-blank text lines form one paragraph, joined with a single space.
    const para = [l.trim()];
    i++;
    while (i < lines.length && isPlainLine(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }
  return blocks;
}

export function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineHtml(s) {
  return escHtml(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

function blockToHtml(b) {
      switch (b.type) {
        case "h2":
          return "<h2>" + inlineHtml(b.text) + "</h2>";
        case "h3":
          return "<h3>" + inlineHtml(b.text) + "</h3>";
        case "p":
          return "<p>" + inlineHtml(b.text) + "</p>";
        case "quote":
          return (
            "<blockquote style='background:#f3f3f3;border-left:4px solid #555;margin:12px 0;padding:10px 16px'>" +
            b.lines.filter((x) => x.trim()).map((x) => "<p style='margin:0'>" + inlineHtml(x) + "</p>").join("") +
            "</blockquote>"
          );
        case "ol":
          return "<ol>" + b.items.map((x) => "<li>" + inlineHtml(x) + "</li>").join("") + "</ol>";
        case "table":
          return (
            "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;margin:12px 0'><tr>" +
            b.header.map((c) => "<th>" + inlineHtml(c) + "</th>").join("") +
            "</tr>" +
            b.rows.map((r) => "<tr>" + r.map((c) => "<td>" + inlineHtml(c) + "</td>").join("") + "</tr>").join("") +
            "</table>"
          );
        default:
          return "";
      }
}

// Consecutive "- " lines (blank lines between them do not break the run) become one <ul>.
export function blocksToHtml(text) {
  let out = "";
  let items = [];
  const flush = () => {
    if (items.length) out += "<ul>" + items.map((x) => "<li>" + inlineHtml(x) + "</li>").join("") + "</ul>";
    items = [];
  };
  parseBlocks(text).forEach((b) => {
    if (b.type === "li") {
      items.push(b.text);
      return;
    }
    if (b.type === "br") return;
    flush();
    out += blockToHtml(b);
  });
  flush();
  return out;
}

export function blocksToPlainText(text) {
  let x = "";
  parseBlocks(text).forEach((b) => {
    switch (b.type) {
      case "h2":
        x += "\n" + b.text.toUpperCase() + "\n---\n\n";
        break;
      case "h3":
        x += b.text + "\n\n";
        break;
      case "li":
        x += "- " + b.text + "\n\n";
        break;
      case "p":
        x += b.text + "\n\n";
        break;
      case "quote":
        x += b.lines.filter((l) => l.trim()).join("\n") + "\n\n";
        break;
      case "ol":
        x += b.items.map((it, n) => n + 1 + ". " + it).join("\n") + "\n\n";
        break;
      case "table":
        x += [b.header].concat(b.rows).map((r) => "| " + r.join(" | ") + " |").join("\n") + "\n\n";
        break;
      default:
        break;
    }
  });
  return x;
}

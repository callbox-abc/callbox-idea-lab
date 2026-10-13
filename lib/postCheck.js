import { quickAnswerWords, findPlaceholders } from "./geoCheck";

export const LIMITS = { metaTitle: 60, metaDescription: 155, qaMin: 40, qaMax: 60 };
export const MAX_ATTEMPTS = 3;

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Deterministic checks run in code after every generation. Returns a list of
// plain-language failures; an empty list means the article may be kept.
export function validateArticle({ metaTitle, metaDescription, content }) {
  const failures = [];

  const title = str(metaTitle);
  if (!title) failures.push("meta_title is missing. Write a meta title of " + LIMITS.metaTitle + " characters or fewer.");
  else if (title.length > LIMITS.metaTitle) failures.push("meta_title is " + title.length + " characters. It must be " + LIMITS.metaTitle + " or fewer.");

  const desc = str(metaDescription);
  if (!desc) failures.push("meta_description is missing. Write one of " + LIMITS.metaDescription + " characters or fewer.");
  else if (desc.length > LIMITS.metaDescription) failures.push("meta_description is " + desc.length + " characters. It must be " + LIMITS.metaDescription + " or fewer.");

  const qa = quickAnswerWords(content);
  if (qa < 0) failures.push('The Quick Answer blockquote is missing. Add a single line starting with "> **Quick Answer:** ".');
  else if (qa < LIMITS.qaMin || qa > LIMITS.qaMax) {
    failures.push("The Quick Answer is " + qa + " words, not counting the label. It must be " + LIMITS.qaMin + "-" + LIMITS.qaMax + " words.");
  }

  const placeholders = findPlaceholders(content);
  if (placeholders.length) failures.push("The article contains placeholder text (" + placeholders.slice(0, 3).join(", ") + "). Replace each with a qualitative statement.");

  return failures;
}

export function regenerationNote(failures) {
  return "\n\nYOUR PREVIOUS ATTEMPT FAILED THESE AUTOMATIC CHECKS. Rewrite the whole article and fix every one:\n- " + failures.join("\n- ");
}

export function writingInstruction(monthYear) {
  return `WRITING INSTRUCTION (applies to every blog type. The GEO RULES, the blog type structure above, and the JSON output format requested below take priority wherever they conflict with anything here):
GOAL: AI models should cite the post AND keep the Callbox name in the answer they generate (the "ghost citation" problem: pages get sourced, but the brand name gets dropped). Write every section so it survives being copied out on its own.

VOICE AND FORMAT
- Casual but authoritative, peer-to-peer, E-E-A-T. Write like a practitioner talking to another practitioner.
- NEVER use em dashes or en dashes anywhere, including meta text. Use commas, periods, or colons. Use a hyphen for number ranges.
- Bold key phrases. Use bulleted lists where they help scanning.
- Include 1 or 2 callouts written as "**Expert Tip:** ...".
- Banned phrases: "in today's fast-paced world", "ever-evolving landscape", "game-changer", "unlock", "supercharge", "delve", "it's worth noting", "in conclusion".
- Line one of the body: "**Last updated:** ${monthYear}"
- Intro: 1-2 sentences that name the concrete outcome the reader gets. The primary keyword appears within the first 50-100 words.

READABILITY
- Target Flesch Reading Ease 60-70. Average sentence 14-18 words, no sentence over 28 words, paragraphs of 1-3 sentences, plain words, active voice.
- Define every acronym (SDR, ABM, AEO) on first use.

ANSWER-FIRST AND BRAND RULES
- Open every section with a 1-2 sentence direct answer, then add the detail.
- Make every section self-contained. At the start of a section, repeat the subject by name instead of "it", "this", or "they".
- The Quick Answer must name the subject, include the primary keyword, and name Callbox inside the answer itself.
- Name Callbox in the Quick Answer, in the first sentence of the closing Callbox section, and in the closing CTA. Never use "the agency" in place of the name.
- Only Callbox gets outcome language (leads, meetings, deals, dollar figures). Describe any other vendor by its niche only.

COMPARISONS
- Compare APPROACHES (in-house vs outsourced, channel vs channel, DIY vs agency), never Callbox vs a named competitor. Use a table or side-by-side bullets with specific values. Skip a comparison only if the topic truly does not call for one.

FACT DISCIPLINE
- Every statistic carries its source and year in the same sentence. Prefer data from the last 2 years. Use HubSpot-sourced statistics when you are certain of them.
- The problem section includes at least one number (time, money, or percentage) that you are certain of or that comes from CALLBOX PROOF POINTS. Otherwise state the problem qualitatively.

CTA DISCIPLINE
- 2-3 soft CTAs in the body (inline prompts such as "See how outsourced SDR teams work"). Link only to URLs the user supplied.
- Exactly 1 hard CTA ("Book a free strategy session" unless the topic says otherwise) at the very end. It is the last thing in the post. No other asks in the final section.

KEYWORDS AND META
- The primary keyword goes in the title, meta description, slug, first 50-100 words, the Quick Answer, and at least 2 headings, all phrased naturally. Use each secondary keyword at least once. Never stuff, and keep primary keyword density under 1.5%.
- Meta description: maximum 155 characters, primary keyword plus an action verb. Slug: 3-5 words, lowercase, hyphenated, includes the primary keyword. Count characters before you output and rewrite anything over its maximum. Do not truncate mid-word.

SELF-CHECK (do this silently before you answer): meta description is 155 characters or fewer; the Quick Answer is 40-60 words and names Callbox; no em or en dashes; no banned phrases; no invented facts; exactly one hard CTA, placed last; "Last updated" is the first body line. Fix anything that fails, then output.`;
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Long articles can take a while to generate.
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_PROMPT_CHARS = 40000;

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Set it in .env.local (local) or in your Vercel project settings (production)." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: "Prompt is too long." }, { status: 413 });
  }

  const maxOutputTokens = Math.min(Math.max(parseInt(body?.maxTokens, 10) || 4096, 256), 8192);

  const generationConfig = { maxOutputTokens, temperature: 0.7 };
  // Ask Gemini for strict JSON when the caller expects JSON back.
  if (body?.json) generationConfig.responseMimeType = "application/json";
  // 2.5 Flash spends output tokens on "thinking" by default, which can
  // truncate long answers. Turn it off for this tool.
  if (/2\.5.*flash/i.test(MODEL)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gemini request failed (" + res.status + ")." },
        { status: 502 }
      );
    }

    const candidate = data?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((p) => p.text || "").join("");

    if (!text) {
      const reason = data?.promptFeedback?.blockReason;
      return NextResponse.json(
        { error: reason ? "Request blocked by Gemini: " + reason : "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text, finishReason: candidate?.finishReason || null });
  } catch (err) {
    return NextResponse.json({ error: "Could not reach Gemini: " + (err?.message || "unknown error") }, { status: 502 });
  }
}

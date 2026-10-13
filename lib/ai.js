// Client-side helper. Calls our own /api/ai route, which holds the Gemini key
// server-side. The key is never exposed to the browser.
export async function callAI(prompt, maxTokens = 4096, json = false) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens, json }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI request failed (" + res.status + ")");

  return (data.text || "").replace(/[\u2014\u2013]/g, "-");
}

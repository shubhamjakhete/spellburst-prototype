// Shared by the three model functions. The leading underscore keeps Vercel
// from treating this file as a route of its own.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5";

let client;

function anthropic() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Rejects anything that is not an authorised POST. Returns true when the
 * caller should carry on, false when a response has already been sent.
 */
export function accept(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return false;
  }

  const expected = process.env.DEMO_KEY;
  if (!expected) {
    res.status(500).json({ error: "DEMO_KEY is not configured" });
    return false;
  }

  const supplied = req.headers["x-demo-key"];
  if (supplied !== expected) {
    res.status(401).json({ error: "add the access code to the link" });
    return false;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return false;
  }

  return true;
}

/**
 * Models wrap code in markdown fences even when told not to. Cheaper to
 * tolerate than to keep re-prompting.
 */
export function stripFences(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

/**
 * Pulls a JSON object out of a reply. The plan is asked for as bare JSON, but
 * models still fence it or introduce it with a sentence, so take the outermost
 * braces and ignore whatever surrounds them.
 *
 * The usual trick of prefilling the assistant turn with "{" is not available:
 * this model rejects a conversation that does not end on a user message.
 */
export function parseJsonReply(text) {
  const body = stripFences(text);
  const open = body.indexOf("{");
  const close = body.lastIndexOf("}");
  if (open === -1 || close <= open) return null;
  try {
    return JSON.parse(body.slice(open, close + 1));
  } catch {
    return null;
  }
}

export async function ask({ system, user, maxTokens }) {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return { text, stopReason: response.stop_reason };
}

export function fail(res, error) {
  const status = typeof error?.status === "number" ? error.status : 502;
  const message =
    error?.error?.error?.message ?? error?.message ?? "the model call failed";
  res.status(status === 401 ? 500 : status).json({ error: String(message) });
}

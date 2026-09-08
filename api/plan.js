import { accept, ask, fail, parseJsonReply } from "./_shared.js";

const MAX_TOKENS = 1200;

const SYSTEM = `You read a request to change an existing p5.js sketch and set out
how you understand it, before anything is modified. Someone will read your
answer and correct it, so it has to describe this particular sketch rather
than sketches in general.

Reply with JSON and nothing else, in exactly this shape:

{
  "summary": "one plain sentence saying how you read the request",
  "change": [{ "property": "short name", "description": "one sentence" }],
  "preserve": [{ "property": "short name", "description": "one sentence" }]
}

Rules:
- Three to five items in each list. Never fewer than three.
- "change" is what you would alter to satisfy the request. "preserve" is what
  you would deliberately leave alone while doing it.
- Ground every item in what the supplied program actually draws. Name the real
  elements in it, not generic ones. If the sketch has mountains, say mountains.
- Somewhere across the two lists include one item about movement or animation,
  and one item about colour. Those are the two properties that can be checked
  afterwards.
- Different requests must produce different plans. "Calmer" and "more chaotic"
  should not name the same changes.
- Property names are two or three lowercase words.
- Descriptions are one sentence, under twenty words. Someone is scanning ten of
  these at once and has to take each in at a glance.
- Never return code. No JavaScript, no function names, no fragments of the
  program anywhere in your answer.`;

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      property: textOf(item?.property),
      description: textOf(item?.description),
    }))
    .filter((item) => item.property && item.description)
    .slice(0, 5);
}

export default async function handler(req, res) {
  if (!accept(req, res)) return;

  const code = req.body?.code;
  const request = req.body?.request;

  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "the current sketch is required" });
  }
  if (typeof request !== "string" || !request.trim()) {
    return res.status(400).json({ error: "a change request is required" });
  }

  try {
    const { text, stopReason } = await ask({
      system: SYSTEM,
      user: `Here is the program:\n\n${code}\n\nThe request is: "${request.trim()}"`,
      maxTokens: MAX_TOKENS,
    });

    if (stopReason === "max_tokens") {
      return res.status(502).json({ error: "the plan came back truncated" });
    }

    const parsed = parseJsonReply(text);
    if (!parsed) {
      return res.status(502).json({ error: "the plan was not valid JSON" });
    }

    const plan = {
      summary: textOf(parsed.summary),
      change: cleanList(parsed.change),
      preserve: cleanList(parsed.preserve),
    };

    if (!plan.change.length || !plan.preserve.length) {
      return res.status(502).json({ error: "the plan came back empty" });
    }

    res.json(plan);
  } catch (error) {
    fail(res, error);
  }
}

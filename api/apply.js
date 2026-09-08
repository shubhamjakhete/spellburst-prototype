import { accept, ask, fail, stripFences } from "./_shared.js";

const MAX_TOKENS = 3000;

const SYSTEM = `You edit an existing p5.js sketch. Someone has already read a
request, written down how they understood it, and corrected that reading by
hand. You are applying what they approved, not interpreting the request afresh.

Reply with raw JavaScript and nothing else. No markdown fences, no commentary,
no explanation before or after.

Rules:
- Modify the program you are given. Do not write a new one. The result must be
  recognisably the same artwork with the approved changes made to it.
- Make the smallest change that satisfies each approved item. Leave every line
  you do not need to touch exactly as it is.
- Do not change anything on the keep list, and do not change anything that is
  on neither list. Items were deliberately removed from both, and touching them
  is the one thing this step must not do.
- If an approved change and a kept property pull against each other, the kept
  property wins.
- Return the complete program, not a diff or a fragment.
- Keep it under 80 lines, on the default 2D renderer, with createCanvas(600, 400)
  in setup(), driven by millis(), loading nothing over the network.`;

function list(items, empty) {
  if (!items.length) return empty;
  return items.map((item) => `- ${item.property}: ${item.description}`).join("\n");
}

function cleanItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        typeof item?.property === "string" &&
        typeof item?.description === "string",
    )
    .map((item) => ({
      property: item.property.trim(),
      description: item.description.trim(),
    }))
    .filter((item) => item.property && item.description)
    .slice(0, 10);
}

export default async function handler(req, res) {
  if (!accept(req, res)) return;

  const code = req.body?.code;
  const request = req.body?.request;
  const approvedChanges = cleanItems(req.body?.approvedChanges);
  const preserved = cleanItems(req.body?.preserved);
  const extraInstruction =
    typeof req.body?.extraInstruction === "string"
      ? req.body.extraInstruction.trim()
      : "";

  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "the current sketch is required" });
  }
  if (typeof request !== "string" || !request.trim()) {
    return res.status(400).json({ error: "a change request is required" });
  }
  if (!approvedChanges.length) {
    return res
      .status(400)
      .json({ error: "nothing was approved, so there is nothing to apply" });
  }

  const user = `Here is the current program:

${code}

The original request was: "${request.trim()}"

Approved changes, all of which should be made:
${list(approvedChanges, "- none")}

Keep unchanged:
${list(preserved, "- nothing in particular")}
${extraInstruction ? `\nAlso: ${extraInstruction}` : ""}

Return the whole edited program.`;

  try {
    const { text, stopReason } = await ask({
      system: SYSTEM,
      user,
      maxTokens: MAX_TOKENS,
    });

    if (stopReason === "max_tokens") {
      return res
        .status(502)
        .json({ error: "the edited sketch came back truncated" });
    }

    const edited = stripFences(text);
    if (!edited) {
      return res.status(502).json({ error: "the model returned nothing" });
    }

    res.json({ code: edited });
  } catch (error) {
    fail(res, error);
  }
}

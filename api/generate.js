import { accept, ask, fail, stripFences } from "./_shared.js";

const MAX_TOKENS = 2000;

const SYSTEM = `You write short p5.js sketches.

Reply with raw JavaScript and nothing else. No markdown fences, no commentary,
no explanation before or after.

Rules for the sketch:
- Use p5.js 1.x global mode: define setup() and draw().
- Call createCanvas(600, 400) in setup(). Use the default 2D renderer, never WEBGL.
- Keep the whole program under 80 lines. This is a hard limit: use fewer
  elements rather than more code.
- If the sketch is meant to move, animate it and do not call noLoop().
- Make any movement plainly visible rather than a slow drift: something should
  clearly change position, size or brightness within half a second.
- Drive animation from millis() rather than frameCount, so it runs at the same
  speed regardless of frame rate.
- Draw everything in code. Do not load external images, fonts, video or sound,
  and do not fetch anything over the network.
- Do not use alert, prompt, or any DOM access outside p5.`;

export default async function handler(req, res) {
  if (!accept(req, res)) return;

  const prompt = req.body?.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "a prompt is required" });
  }

  try {
    const { text, stopReason } = await ask({
      system: SYSTEM,
      user: `Write a p5.js sketch for: ${prompt.trim()}`,
      maxTokens: MAX_TOKENS,
    });

    if (stopReason === "max_tokens") {
      return res
        .status(502)
        .json({ error: "the sketch came back truncated, try a simpler prompt" });
    }

    const code = stripFences(text);
    if (!code) {
      return res.status(502).json({ error: "the model returned nothing" });
    }

    res.json({ code });
  } catch (error) {
    fail(res, error);
  }
}

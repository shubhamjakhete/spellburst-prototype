// Health check. Reports only whether the secrets are present, never their
// values, so it is safe to leave open on the deployed URL.
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  res.status(200).json({
    ok: true,
    service: "spellburst-prototype",
    time: new Date().toISOString(),
    env: {
      anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      demoKey: Boolean(process.env.DEMO_KEY),
    },
  });
}

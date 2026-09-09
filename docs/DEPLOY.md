# DEPLOY.md

Target: Vercel Hobby, free `.vercel.app` domain, a public link anyone
can open and use.

## What changes

**No Express server.** Vercel runs serverless functions from an `/api`
folder. Two files replace `server.js`:

```
/api/generate.js    prompt to p5 code
/api/plan.js        request to Change/Preserve plan
/api/apply.js       approved plan to modified code
```

Each exports a default handler:

```js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  // ...
  res.json({ code });
}
```

This is simpler than what was planned. One terminal instead of two, and
`/api/*` works in dev and production without changing any URLs in the
frontend.

**Local dev becomes `vercel dev`** instead of running Vite and Express
separately. It serves the frontend and the functions together on one
port, exactly like production.

**`vercel.json`:**

```json
{
  "functions": {
    "api/*.js": { "maxDuration": 30 }
  }
}
```

Hobby allows up to 60 seconds. Our calls take 3 to 8. Setting 30 gives
headroom without letting a stuck call hang for a minute.

## Deploy on the first commit, not the last

Connect the repo to Vercel during M0, while the app is a single `<h1>`.
Every push then deploys automatically.

The reason is not convenience. A deploy that first runs at hour three,
on a deadline, with a key that turns out to be misconfigured, is how
this goes wrong. Deploying an empty page at minute fifteen costs five
minutes and removes that failure mode entirely.

Set `ANTHROPIC_API_KEY` in the Vercel dashboard under Settings,
Environment Variables. It is not read from your local `.env` in
production.

## Protecting the key

Your key sits behind a public URL. Anyone who finds it can spend your
money. Three layers, in order of importance.

**1. Set a hard spend limit in the Anthropic console. Do this first.**
Not a budget alert, an actual cap. This is the only measure that
cannot be worked around, and it is the difference between a bad
afternoon and a bad month.

**2. Cap `max_tokens` in every function.** 2000 for generate and apply,
800 for plan. Nothing legitimate needs more, and it puts a ceiling on
the cost of any single call.

**3. Gate it with a shared code.** Put `DEMO_KEY` in the Vercel env.
All three functions reject requests without it. The frontend reads it from
the URL, so the link you send just works:

```
https://your-app.vercel.app/?k=whatever
```

Be clear with yourself about what this is. It is obfuscation, not
security. The code is visible in the browser to anyone who looks. What
it stops is a crawler or a scraper finding the endpoint and hammering
it, which is the realistic threat to an unlisted demo. The spend limit
is what stops a determined person.

Say this in the README. Knowing the difference between obfuscation and
security, and saying which one you built, is worth more than pretending
you shipped auth.

## Do not let visitors run the eval

The eval fires 24 apply calls per run. Public, that is both a cost hole
and a long wait nobody will sit through.

Run the eval locally, paste the results into the README, and commit
them. Ship a plain results page that reads the committed numbers. The
numbers load instantly and nobody pays for them.

Keep the button, hidden behind the same `?k=` gate, so you can still run
it. Note in the README when the numbers were generated.

## Cold starts

The first request after idle takes a few extra seconds. Anyone opening
the link days later will hit this every time.

Do not try to fix it. Just make the status line honest: "writing code",
"running sketch", "describing output". A labeled wait reads as a system
working. An unlabeled one reads as broken.

## Give them somewhere to start

Ship a sketch already on screen when the page loads, plus three example
refinement buttons: "make it more dramatic", "make it calmer", "make it
feel futuristic".

The checkpoint is the point of the project and it does not exist until a
sketch exists and someone asks for a change. If a visitor has to write
two prompts before seeing anything interesting, most will not.

One click on a seeded sketch should put them in front of the plan
screen within about fifteen seconds.

## Checklist before publishing the link

- [x] Spend limit set in the Anthropic console
- [x] `ANTHROPIC_API_KEY` and `DEMO_KEY` set in Vercel
- [x] `.env` is gitignored, and the key is not in any commit
- [ ] Open the deployed URL in a private window and use it start to
      finish. Not localhost. The deployed URL. (Walked end-to-end on
      the deployed URL from here. A private-window pass is still yours.)
- [x] A sketch is on screen at page load
- [x] Example refinement buttons work
- [x] The plan screen renders and items can be unchecked and moved
- [x] README has real committed evaluation numbers and a run date
- [x] README matches what actually shipped

## Time

About 20 minutes total: 5 at M0 to connect the repo, 10 to convert the
routes to functions, 5 for the gate and example prompts.

Most of that is not extra work, it is work moved. Writing
`/api/generate.js` as a Vercel function instead of an Express route
takes the same time. The genuine additions are the gate and the seeded
demo, at roughly 10 minutes.

If you need the time back, cut Monaco and the revert button. Never cut
the checkpoint, the verification, or the eval.

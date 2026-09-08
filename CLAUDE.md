# CLAUDE.md

## What we are building

A small creative coding tool. You type "a night sky with mountains and
moving stars", and an AI writes p5.js code that draws it.

Then you ask for a change: "make it more dramatic."

The AI does **not** change the artwork yet. First it shows you how it
read the request:

```
CHANGE                        PRESERVE
[x] Darken the sky            [x] Mountain shapes
[x] Speed up the stars        [x] Composition
[x] Increase contrast         [x] Number of stars
```

You uncheck "speed up the stars", move it to Preserve, and type "keep the
calm movement". Then you press Apply.

Only now does the AI change the code.

Afterwards we **measure** whether it actually kept its promise, and say
so plainly.

## Why this exists

This responds to Spellburst (UIST 2023), a node interface for creative
coding with natural language prompts. It is a good system. We are not
fixing it.

We are answering a narrower question: if you were on that team, what
would you propose next?

The answer comes from their own evaluation. Participant P5 said the
system had "a little bit too much magic." Prompts like "make it more
dramatic" have many valid readings, and the system picks one silently.

So: show the reading before acting on it. Let the artist correct it.

And then the part that makes this more than an obvious suggestion:
**a promise nobody checks is not a promise.** Writing "preserve star
movement" into a prompt is a polite request, not a guarantee. So we
measure it.

## The two claims

1. **Show the plan.** Never modify existing artwork straight from an
   ambiguous request. Interpret first, show the interpretation, let the
   user edit it, then act.
2. **Check the plan was followed.** Measure the preserved properties
   before and after. If one moved, say so in the interface.

Claim 2 is what makes this interesting. Anyone would suggest claim 1.

## Tone

Never write that Spellburst got something wrong. This is a proposal a
teammate would make, not a critique. In every document, phrase it as an
interaction direction we would explore if we were on the team.

## The one thing that must work

Prompt, artwork, ambiguous change request, plan appears, user unchecks
something, apply, and the result visibly respects what the user
unchecked.

That is the demo. Everything else supports it.

## Hard rules

- No branching node graph. One current sketch plus its previous version.
- No merge, no extract, no semantic sliders, no collaboration.
- No database, no accounts. State lives in React memory.
- Generated code runs only inside a sandboxed iframe, never in the app.
- The API key never reaches frontend code.
- Never skip the checkpoint. A natural-language refinement always goes
  through plan, review, apply. No "quick apply" shortcut.

## Stack

- Vite + React + TypeScript
- Vercel serverless functions in `/api`
- p5.js from a CDN inside an iframe
- `@anthropic-ai/sdk`, model constant `claude-sonnet-5`
- Monaco for code editing. P1, not P0.

One terminal: `vercel dev`. Deploys to Vercel Hobby. See DEPLOY.md.

## File layout

```
/api/generate.js       prompt to p5 code
/api/plan.js           request to Change/Preserve plan
/api/apply.js          approved plan to modified code
/vercel.json

/src/App.tsx           state and layout
/src/components/
    PromptInput.tsx
    SketchPreview.tsx
    RefinementInput.tsx
    ChangePlan.tsx      the checkpoint. Most important component.
    BeforeAfter.tsx
    VerifyBadge.tsx     preserved / changed anyway
    ErrorPanel.tsx
/src/lib/
    sketch.ts           iframe document + frame capture
    measure.ts          motion and palette, no AI
    verify.ts           compare before and after against the plan
    api.ts              three fetch helpers
/src/eval/
    sketches.ts         6 fixed base sketches
    cases.ts            12 eval cases
    run.ts              the eval
```

## How sketches run

Built as an HTML string, dropped into an iframe with `srcdoc`: p5 from
CDN, then the code, then a capture script.

Inside the iframe:

1. Wait 1200ms so p5 is drawing.
2. Grab the canvas, `toDataURL('image/png')`. Frame A.
3. Wait 500ms. Grab it again. Frame B.
4. `window.parent.postMessage({ type: 'frames', a, b }, '*')`

Also catch `window.onerror` inside the iframe and post it out, so a
broken sketch shows an error panel instead of a blank box.

The iframe gets `sandbox="allow-scripts"`. Generated code must not reach
the parent DOM or any secret.

## Measuring (`measure.ts`)

No AI. This is arithmetic, which is the point.

```ts
measureMotion(a, b): Promise<number>     // 0 to 1
measurePalette(frame): Promise<string>   // dominant colour bucket
```

Motion: both frames to 64x64 offscreen canvases, mean absolute RGB
difference over 255.

Palette: sample the frame at 64x64, skip near-black background pixels,
bucket each remaining pixel to the nearest of about eight named colours,
return the most common.

Coarse on purpose. We are catching "the sky got much brighter", not
adjudicating teal against cyan.

## The three AI operations

All three are Vercel functions using `claude-sonnet-5`. Force clean JSON
by ending the messages array with an assistant turn containing `{`, then
parsing `"{" + response`. Cap `max_tokens`. Check `DEMO_KEY`.

### POST /api/generate

Input `{ prompt }`. Returns `{ code }`.

Tell the model: raw JavaScript only, no fences, no explanation.
`createCanvas(600, 400)`. Under 80 lines. Do not call `noLoop()` if the
sketch is meant to move.

### POST /api/plan

Input `{ code, request }`. Returns a plan. **This must never return
code.**

Ask for JSON with `summary`, `change`, and `preserve`, each item having
`property` and `description`. Three to five items per list.

Tell the model to include at least one item about movement and one about
colour in one of the two lists, because those are the two we can
measure. This is a deliberate bias and it is written down in NOTES.md.

### POST /api/apply

Input `{ code, request, approvedChanges, preserved, extraInstruction }`.
Returns `{ code }`.

Tell the model: modify the supplied program, do not write a new one.
Make the smallest reasonable change. Do not touch the preserved
properties. Return the complete program, raw, no fences.

## Verification (`verify.ts`)

After apply, run the new sketch, measure, and compare against the old
measurements for anything the user put in Preserve.

- If a preserved item mentions movement, motion, speed, or animation:
  compare motion. Preserved if the relative change is under 25%.
- If it mentions colour, palette, or a colour word: compare the dominant
  bucket. Preserved if unchanged.
- Anything else: not checkable. Say "not checked", not "preserved".

Render one badge per preserved item: **kept**, **changed anyway**, or
**not checked**.

"Not checked" is important. Never imply we verified something we did
not.

## The checkpoint UI (`ChangePlan.tsx`)

This is the contribution. Give it the most care.

- Two columns, Change and Preserve, checkboxes on every item.
- An item can be moved from Change to Preserve.
- A free text field for an extra instruction.
- Cancel and Apply.
- Unchecked Change items are excluded from the apply request entirely.

Loading states must name the step: "writing the sketch", "working out
what you mean", "applying your approved changes". The three-step
structure should be visible in the interface, not just in the code.

## Priority

The checkpoint, the verification, and the eval are the project. Monaco,
revert, before/after and styling are conveniences and go first if
anything has to.

Time is not the constraint on this build. Where there is a choice
between doing something quickly and doing it in a way that can be
checked, choose the one that can be checked.

# BUILD.md

Modules, a test after each one, an integration check whenever two meet.

## Ordering principle

Build the parts with no AI in them first. They are deterministic, so
they can be tested exactly, and one of them (measurement) is what makes
the whole proposal more than an obvious suggestion.

Then the three AI operations, each plugged into something already
proven. When something breaks, you know which piece is new.

## Testing

No test framework. The hard parts here are iframes and canvases, which
are awkward to unit test, so every module ends with a visible check
instead: something on the page or in the console that you look at and
confirm.

Some of these checks are exact and automatic. Others are judgement by
eye. The README says which is which. Knowing which of your checks are
rigorous is worth more than implying they all are.

Do not move past a module whose check has not passed. The point of the
ordering is that when something breaks later, everything underneath it
already works.

---

## M0. Skeleton, deployed

Vite + React + TS. One heading. `/api/ping.js`. `vercel.json` with
`maxDuration: 30`. Push to GitHub, connect Vercel, set
`ANTHROPIC_API_KEY` and `DEMO_KEY` in the dashboard.

**Check:** `vercel dev` serves page and ping. Then the deployed URL does
too.

Deploy now, while it is one heading. A first deploy at the end, on a
deadline, with a misconfigured env var, is the classic way this goes
wrong.

**Commit:** `skeleton: vite app + api function, deployed`

---

## M1. Sketch runner

`src/lib/sketch.ts`

```ts
runSketch(code: string): Promise<{ frameA: string; frameB: string }>
```

Iframe with `srcdoc` and `sandbox="allow-scripts"`. p5 from CDN, then
the code, then the capture script. Catch `window.onerror` inside and
post it out.

**Check:** run a hand-written sketch, render both returned frames as
`<img>` on the page. For a moving sketch they visibly differ. Then feed
it deliberately broken code and confirm you get an error message, not a
blank box or a crashed app.

Test the broken path now. Every later module depends on the app
surviving bad generated code.

**Commit:** `sketch runner: sandboxed iframe, frame capture, error catch`

---

## M2. Measurement

`src/lib/measure.ts`. `measureMotion` and `measurePalette`. No AI.

**Check:** pure maths, so test it directly. Feed `measureMotion` two
identical frames and expect near zero. Two very different frames and
expect high. Feed `measurePalette` a frame you know is mostly red.

**Commit:** `measure: motion and palette, no model involved`

---

## IT-1. Runner plus measurement

Loop the 6 base sketches in `src/eval/sketches.ts` through `runSketch`
then both measures. Print measured against expected.

**Pass condition: 6 out of 6 on motion, 6 out of 6 on palette.** Exact.
No model is involved, so a miss is your bug or a wrong threshold.

This is also the foundation of the eval. Get it right here and the eval
is mostly assembled already.

**Commit:** `integration: measurement correct on all base sketches`

---

## M3. Generate

`/api/generate.js` and `generateSketch` in `api.ts`. Cap `max_tokens`,
check `DEMO_KEY`, strip stray fences.

**Check:** "a night sky with mountains and moving stars". Read the code
that comes back. Confirm it has `createCanvas(600, 400)` and no
`noLoop()`. Render it.

**Commit:** `api: prompt to p5 sketch`

---

## M4. Plan

`/api/plan.js` and `planModification`. Returns `summary`, `change`,
`preserve`. **Never code.**

**Check:** with a real sketch, send "make it more dramatic". Print the
JSON. It should have three to five items per list, and at least one item
mentioning movement or colour.

Then send "make it calmer" and "make it feel futuristic". If the plans
come back generic or identical, fix the prompt now. Weak plans make the
checkpoint pointless, and this is the module worth spending extra time
on.

**Commit:** `api: interpret a refinement into change and preserve`

---

## M5. The checkpoint

`ChangePlan.tsx`. Two columns, checkboxes, move an item from Change to
Preserve, an extra instruction field, Cancel and Apply.

The most important component. Give it the time.

**Check:** with a real plan, uncheck two items, move one across, type an
instruction. Log the object you would send to apply. Confirm the
unchecked items are gone entirely and the moved item is now in
`preserved`.

Check the object, not the pixels. This is where a silent bug would
destroy the demo, because the interface would look right while sending
the wrong thing.

**Commit:** `checkpoint: editable change and preserve plan`

---

## M6. Apply

`/api/apply.js` and `applyModification`.

**Check:** run the full sequence by hand. Generate a night sky, ask for
"more dramatic", uncheck "speed up the stars" and move it to Preserve,
apply.

**Pass condition:** the new sketch is recognisably the same scene, and
the stars are not obviously faster.

**Commit:** `api: apply the approved plan`

---

## IT-2. The demo path

The exact sequence you will show. Prompt, artwork, refine, plan, edit
the plan, apply, look at the result.

**Pass condition:** you get through it in the browser with no console,
no reload, and no broken state.

Push and run it again on the deployed URL. This is the first time real
model calls run in production. Find the env var problems now.

**Commit:** `integration: full demo path works deployed`

---

## M7. Verification

`src/lib/verify.ts` and `VerifyBadge.tsx`. Compare before and after
measurements against the preserved list. Three states: kept, changed
anyway, not checked.

**Check:** force it both ways. Preserve movement on a change that should
not affect movement, and see **kept**. Then preserve movement while
asking for "make everything move much faster", and see **changed
anyway**.

If you cannot make it say "changed anyway" on demand, the verification
is not working. A checker that always passes is worse than no checker.

**Commit:** `verify: measure whether preserved properties held`

---

## IT-3. The interesting moment

Run the case where the model breaks its promise, in the browser, end to
end. Confirm the badge shows it.

This is the part that separates your proposal from the obvious version
of it. If you have time for one screenshot in the README, make it this
one.

---

## M8. Before and after, revert — P1

Keep the previous version in state. Show the two side by side. A revert
button.

**Check:** apply a change, compare, revert, confirm you are back.

**Commit:** `ui: before and after, revert`

---

## M9. Monaco — P1

Editable code panel. Re-render on valid edits, debounced.

**Check:** edit a number by hand, see the sketch change. Type a syntax
error, see an error panel and not a crash.

**Commit:** `ui: editable code panel`

---

## M10. Eval

`src/eval/run.ts`. Three parts, all specified in EVAL.md.

- **Part 1, preservation.** 12 cases, 2 conditions, 5 repetitions.
- **Part 2, plan discrimination.** 42 plans, overlap and opposite-pair
  checks.
- **Part 3, measurement sanity.** The 6 base sketches. This is IT-1
  again, formalised.

Fix the thresholds before the first run and do not change them
afterwards. Tuning thresholds against results is the fastest way to make
an eval meaningless.

Run it locally, paste real numbers and a run date into EVAL.md, commit
them. Do not let deployed visitors run it.

**Commit:** `eval: preservation, plan discrimination, measurement sanity`

---

## M11. Demo polish

Three example prompt buttons. Three example refinement buttons ("make it
more dramatic", "make it calmer", "make it feel futuristic"). Loading
text that names the step. A pre-generated sketch on load so the first
screen is not empty.

Someone landing cold on an empty text box does not know what this wants,
and the checkpoint is invisible until a sketch exists.

**Commit:** `demo: example prompts, seeded sketch, named loading states`

---

## Final

Reconcile every document against what shipped. Walk the DEPLOY.md
checklist. Open the deployed URL in a private window and use it start to
finish.

---

## Priority

If something has to give, it gives from the bottom.

- **P0.** M0 to M7. Generation, the checkpoint, apply, and verification.
  This is the proposal. Without M7 the prototype demonstrates the
  obvious half of the idea only.
- **P0.** M10, the eval. It is the reason to believe the interface does
  what it says. Part 1 is the priority within it; Parts 2 and 3 are
  quick once Part 1 runs.
- **P1.** M11 polish, M8 before and after.
- **P2.** Monaco, revert, styling.

Monaco is the cheapest thing to drop. The eval is the most expensive,
because without it the whole claim rests on a demo that worked once.

## Running the eval

Part 1 is 120 apply calls plus rendering. Budget 20 to 30 minutes of
wall clock and run it in the background while finishing the UI.

Write results to a JSON file as they come in, not only at the end. A
crash at call 90 should not cost the whole run.

## If a module runs long

Finish it. Do not leave two modules half done. One finished module with
a passing check is a fine stopping point; two unfinished ones with no
checks is not.

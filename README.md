# Plan First

A small creative coding prototype. You describe an artwork in plain
language, an AI writes the p5.js, and it runs.

When you then ask for a change, the AI shows you how it read your
request before it touches anything.

---

## What this is

An interaction direction I would explore if I were on the Spellburst
team, built small enough to try.

[Spellburst](https://arxiv.org/abs/2308.03921) (UIST 2023) lets artists
explore creative coding through natural language, branching, and
semantic operations. This prototype implements a thin slice of that loop
and adds one step to it.

It is not a fix for Spellburst and not a claim that anything is missing
from it. It is one proposal, taken from something the paper's own
participants said.

## Where the idea comes from

Section 6.2 of the paper, participant P5, on the system:

> a little bit too much magic

Requests like "make it more dramatic" have many valid readings. Darker
sky? Faster movement? Higher contrast? All three? The system picks one
and acts, and the artist finds out by looking at what came back.

So: interpret first, show the interpretation, let the artist correct it,
then act.

## The flow

```
"make it more dramatic"
        |
   AI interprets
        |
   YOU REVIEW AND EDIT     <- the point
        |
   AI modifies the code
        |
   we measure whether it kept its promise
```

The checkpoint looks like this:

```
CHANGE                        PRESERVE
[x] Darken the sky            [x] Mountain shapes
[ ] Speed up the stars        [x] Composition
[x] Increase contrast         [x] Star movement

Also: keep the calm movement
```

Uncheck what you did not mean. Move anything you want left alone into
Preserve. Add an instruction. Then apply.

## The second half, which matters more

Showing the plan is the obvious idea. Anyone in that design meeting
would suggest it.

The part worth arguing about is this: **"preserve star movement" is a
sentence in a prompt.** It is a polite request to a language model, not
a guarantee. If the model speeds the stars up anyway, an interface that
shows a checked box next to "preserved" has told the artist something
untrue.

That is worse than no checkpoint, because now the artist trusts it.

So each preserved property gets measured, before and after:

- **Movement** is the pixel difference between two frames half a second
  apart. Arithmetic. It cannot be wrong.
- **Colour** is the dominant colour sampled from the frame.

After applying, each preserved item shows **kept**, **changed anyway**,
or **not checked**.

"Not checked" appears often, because most properties an artist cares
about cannot be measured this way. Saying so is the honest option. The
alternative is implying a guarantee that does not exist.

## Does it hold?

See [EVAL.md](./EVAL.md). Twelve ambiguous refinement requests, each run
twice: once asking the model to preserve a measurable property, once
without asking. Then count how often the property moved in each
condition.

The control condition is the part that makes the number mean anything. A
high preservation rate proves nothing if the model was never going to
touch that property.

## Running it

```
npm install
cp .env.example .env
vercel dev
```

The deployed build is rate-limited behind a shared access code. See
DEPLOY.md for how that works and why it is obfuscation rather than
security.

## What is deliberately not here

No node graph, no branching, no merging, no semantic sliders, no
accounts, no storage. Spellburst has those. This is one interaction,
built small so the idea is legible.

More things I considered and did not build are in
[NOTES.md](./NOTES.md), with reasons.

## What this cannot tell you

**Only two properties are measurable.** Movement and colour. Composition,
mood, and geometry are not, and those are often what an artist most
wants held still. The verification covers a real but narrow slice.

**Twelve cases is a smoke test, not a study.** It catches a checkpoint
that does nothing. It does not establish an effect size.

**Nothing here shows the checkpoint helps artists.** It shows the
mechanism works and reports how often the model honours a preserve
request. Whether seeing and editing a plan actually makes people feel
more in control needs people, and this prototype is too small to be that
study.

**No test framework.** The checks are visual, module by module, plus two
exact automatic ones (measurement against known sketches, and the eval).
That is proportionate at this size and would not be at ten times it.

## Credit

Angert, Suzara, Han, Pondoc, and Subramonyam. *Spellburst: A Node-based
Interface for Exploratory Creative Coding with Natural Language
Prompts.* UIST 2023.

# Does the checkpoint do anything?

The interface lets you mark a property as preserved. That puts a
sentence in the prompt asking the model to leave it alone.

This eval asks whether that sentence changes what the model does.

It is a mechanism check, not a user study. It measures the system, not
whether anyone finds the system useful.

---

## Part 1. Preservation

### Design

Twelve cases. Six base sketches, each paired with two ambiguous
refinement requests. Every case names one property measurable without
AI: movement or colour.

Each case runs in two conditions:

- **Asked.** The property is in Preserve, so the apply prompt asks the
  model to leave it alone.
- **Not asked.** The same refinement, same base sketch, no mention of
  that property.

Each condition runs **five times**, because these models are
non-deterministic and a single run tells you almost nothing. That is
12 cases, 2 conditions, 5 repetitions: 120 apply calls.

Report a drift *rate* per case, not a yes or no.

### Why the control condition exists

Without it the numbers mean nothing.

Say the asked condition preserves the property 11 times out of 12. That
reads as a working checkpoint. But the model may never have intended to
touch that property, in which case the checkbox did nothing and 11 out
of 12 is simply what happens anyway.

The gap between the two conditions is the result. The asked number
alone is not.

### Why five repetitions

One run per condition confuses model variance with a real effect. With
five, a case that drifts 5/5 without asking and 1/5 when asked is a
signal. A case that drifts 3/5 and 2/5 is noise, and should be reported
as noise rather than rounded into a story.

### Thresholds

- **Movement** drifted if the relative change in motion score exceeds
  25%.
- **Colour** drifted if the dominant colour bucket changed.

Both coarse on purpose. The question is whether the constraint was
respected at all, not whether a shade shifted.

Thresholds were fixed before the first run. Tuning them after seeing
results would make the whole thing meaningless.

### Cases

| # | base sketch | request | preserved property |
|---|---|---|---|
| 1 | night sky, moving stars | make it more dramatic | movement |
| 2 | night sky, moving stars | make it feel colder | colour |
| 3 | drifting particles | make it more chaotic | movement |
| 4 | drifting particles | make it warmer | colour |
| 5 | pulsing circle | make it calmer | movement |
| 6 | pulsing circle | make it feel futuristic | colour |
| 7 | rotating grid | make it more alive | movement |
| 8 | rotating grid | make it more mysterious | colour |
| 9 | wave line | make it more energetic | movement |
| 10 | wave line | make it softer | colour |
| 11 | scattered dots | make it more intense | movement |
| 12 | scattered dots | make it feel organic | colour |

Cases 1, 3, 9 and 11 are the interesting ones. Each asks for something
that normally implies more motion while preserving motion, putting the
request and the constraint in direct conflict. That is where a
checkpoint either works or does not.

Cases 5 and 10 are the reverse: the request and the constraint agree.
Expect little drift in either condition. They are there to show what a
null case looks like, so a small gap elsewhere is not over-read.

### Results

<!-- paste from the eval run -->

| # | property | drift, not asked | drift, asked | gap |
|---|---|---|---|---|
|  |  | /5 | /5 | |

**Overall drift without asking:** _ / 60
**Overall drift when asked:** _ / 60

### Reading this

<!-- Two or three sentences once numbers exist.

     Large gap: the constraint does real work and the checkbox is
     meaningful. Say by how much.

     Small or no gap: the checkbox is decoration. Say so plainly, then
     say what would fix it. The obvious fix is enforcement rather than
     request: reject an applied change that violates a measured
     constraint and retry with the violation named.

     Mixed: report which cases moved and which did not, and resist
     inventing a pattern from twelve cases.

     A negative result reported clearly is worth more than a positive
     one that was never at risk. -->

---

## Part 2. Do the plans discriminate?

A checkpoint is worthless if the plan is the same regardless of what was
asked. Cheap to check, and worth checking, because it is a plausible
failure that the preservation eval would not catch.

### Design

Each of the six base sketches gets seven ambiguous requests: more
dramatic, calmer, futuristic, more chaotic, warmer, more alive, more
mysterious. Forty-two plans.

For each, record the `change` property names.

Two measures:

- **Cross-request overlap.** For one sketch, how much do the change
  lists overlap between different requests? High overlap means the plan
  is mostly ignoring what was asked.
- **Opposite-pair check.** "Calmer" and "more chaotic" should produce
  change lists pointing in opposite directions. If they name the same
  properties with the same direction, the plan step is decorative.

### Results

<!-- paste from the eval run -->

| sketch | mean overlap across 7 requests | calmer vs chaotic conflict? |
|---|---|---|
|  |  |  |

### Reading this

<!-- Low overlap and clear opposition means the plan reflects the
     request. High overlap means the plan is boilerplate and the
     checkpoint is showing the artist something that was not really an
     interpretation. -->

---

## Part 3. Measurement sanity

The measurement code is the foundation of Part 1, so it gets checked
independently.

Six base sketches with known movement and dominant colour, run through
`measureMotion` and `measurePalette`.

**Expected: 6/6 on both.** No model is involved, so anything less is a
bug or a wrong threshold, not variance.

| sketch | motion expected | motion measured | colour expected | colour measured |
|---|---|---|---|---|
|  |  |  |  |  |

---

## What none of this tells you

**Two properties only.** Movement and colour. Composition, geometry and
mood cannot be measured this way, and those are often what someone most
wants held still. The verification covers a real but narrow slice, and
the interface says "not checked" rather than implying otherwise.

**Six base sketches, all AI generated then frozen.** Frozen so runs are
comparable, which also makes them tidier than what a real session
produces.

**Twelve cases can show a large effect or none.** It cannot size a small
one, and no statistics are claimed here beyond counting.

**The plan prompt is biased toward measurable properties.** The model is
asked to include at least one movement item and one colour item, which
makes verification demonstrable and also inflates how often it applies.
Recorded in NOTES.md.

**Accuracy is not usefulness.** Even a checkpoint that provably
constrains the model says nothing about whether it makes anyone feel
more in control of their work. That needs people using it on their own
projects over time.

---

## Run details

<!-- date, model version, number of calls, approximate cost -->

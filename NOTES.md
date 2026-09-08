# Notes

Decisions that shape the results, written down when they were made rather
than reconstructed afterwards. Mostly these are places where the prototype
is nudged toward being measurable, which is worth stating plainly because it
flatters the verification.

## Deliberate biases

### The generate prompt asks for visible movement

`/api/generate.js` tells the model to make movement "plainly visible rather
than a slow drift".

Left to itself the model writes very subtle motion. The three example
prompts first measured 0.0011, 0.0016 and 0.0250 on the motion scale,
against 0.0197 to 0.1715 for the six hand-written base sketches. Two of the
three were indistinguishable from a still image.

This matters because verification compares motion before and after a change
and calls it drifted past a 25% relative difference. On a baseline of 0.0011
that threshold is noise: a sketch nobody would call changed can read as
"changed anyway", and the badge would be wrong in the direction that makes
the checker look strict.

The instruction is therefore a thumb on the scale, and it should be read as
one. It also inflated code length until the 80-line rule was restated as a
hard limit, which is worth knowing before adding further instructions.

It only half works, and the half that fails is the more interesting one.
Measured after the change: drifting particles moved from 0.0011 to between
0.0143 and 0.0404, the pulsing circle stayed around 0.022, and the night sky
did not move at all, holding between 0.0003 and 0.0016 over five runs.

The night sky is not a prompting failure. Motion here is the mean absolute
difference across the whole frame, and in that scene the moving part is a
handful of small stars over a large static sky and static mountains. The
average barely registers however fast the stars travel. Any artwork whose
movement lives in a small fraction of the canvas behaves this way.

The consequence for verification is concrete: below roughly the 0.005 mark a
relative comparison of motion is arithmetic on noise, and the honest answer
is "not checked" rather than a confident verdict either way.

Run through the finished interface, the night sky prompt measured 0.000
before the change and 0.000 after it, so movement genuinely cannot be
checked on the one prompt the project keeps using as its example. Colour
moved blue to purple on the same run and was checkable. The demo therefore
opens on a sketch that does move, and the night sky is left as an honest
illustration of the "not checked" verdict rather than quietly presented as
though it had been verified.

### The 80-line rule is advisory in practice

`generate.js` states a hard limit of 80 lines. The night sky prompt came
back at 99 lines, and 107 after a change was applied. Restating the limit
more firmly moved it slightly and did not fix it.

Nothing depends on the number: it exists to keep sketches legible and token
counts down, and both are still fine at 100 lines. It is recorded because
the M3 check reports it as a pass or a failure, and a check that fails
sometimes without anything being wrong is worth explaining rather than
quietly relaxing.

## Things measured, not assumed

### Sketches must be painted or they read as motionless

The sketch runner keeps its iframe on screen inside a 1x1 clipping window.
An iframe hidden with `opacity: 0`, `visibility: hidden`, or parked
off-screen has its `requestAnimationFrame` throttled by the browser, and
every animated sketch then captures two identical frames.

This was measured across seven host styles in both headless and headed
Chrome. It is recorded because the failure is silent: motion would simply
have read as zero everywhere, and the preservation eval would have produced
tidy, meaningless numbers.

### Measurement noise sits far below the drift threshold

Each of the six base sketches was run five times. The spread between the
highest and lowest motion reading of the same sketch was 0.1% to 2.7%, and
the dominant colour bucket was identical across all thirty runs.

The eval calls movement drifted at a 25% relative change, so repeat noise is
roughly an order of magnitude below the threshold it has to clear. Drift the
eval reports is the model changing the artwork, not the measurement moving.

## Departures from the plan documents

### Palette buckets by hue, not by RGB distance

CLAUDE.md says to bucket each pixel to "the nearest of about eight named
colours". `measure.ts` reads "nearest" in hue rather than in RGB distance,
with a saturation guard sending washed-out pixels to white or grey.

The artwork here is dark. A night sky of `#101a2e` is a long way in RGB from
pure blue and nearly as close to pure green, so nearest-anchor in RGB would
be close to a coin flip on exactly the sketches that matter. Hue bucketing
puts dark, pale and vivid versions of a colour together, which is what "the
palette changed" ought to mean.

Eight hue names as specified, plus white, grey and black for pixels with no
usable hue.

### JSON is extracted, not forced by prefill

CLAUDE.md says to end the messages array with an assistant turn containing
`{` and parse `"{" + response`. `claude-sonnet-5` rejects that outright:
"This model does not support assistant message prefill. The conversation
must end with a user message." All three plan requests failed with a 400
before the technique was dropped.

`parseJsonReply` in `api/_shared.js` does the same job after the fact:
strip any markdown fence, take the outermost braces, parse what is between
them. Weaker than prefill, since it trusts the model to produce JSON rather
than obliging it to, so the plan endpoint validates the shape afterwards
and returns 502 rather than passing a malformed plan to the interface.

### The six base sketches are hand written

EVAL.md describes them as AI generated then frozen. BUILD.md orders the
integration check that needs them before the generate endpoint exists, so
they were written by hand in the style the model produces. Unresolved; either
regenerate them once generation works, or correct EVAL.md.

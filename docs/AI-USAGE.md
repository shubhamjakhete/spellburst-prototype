# AI usage

I used an AI coding agent, in Cursor, to implement this prototype from
a written brief. This note says what that covered, what I decided
myself, and what the result is evidence of.

It is not a claim that the prototype was unsupervised, and it is not a
claim that the checkpoint helps artists. It is a record of how a
narrow interaction question became a running, deployed system.

---

## What I am showing

A complete path from an interaction question to a public prototype:

the question (show the reading, then measure whether Preserve held) →
a scoped brief → a module order with a check after each piece → a
working interface → a mechanism check → a deployed URL.

That is the capability I used AI for: turning a specified prototype
into running code without dropping the two claims or the non-goals.

The product also calls a model (`claude-sonnet-5`) to write and edit
sketches. That is the system under test. It is separate from the agent
that wrote the repository.

---

## Time

All times are Pacific (UTC−7) on **8 September 2026**. They come from
the Cursor session and from `git log`. They are wall clock, not a
claim about focused hours.

The implementation session started at **12:11**. The first commit, a
deployed skeleton, landed at **12:14**. The eval landed at **15:07**.
The writeup landed at **17:04**.

| | Clock | Elapsed from 12:11 |
|---|---|---|
| Session start | 12:11 | — |
| M0 deployed (`1017181`) | 12:14 | 3 min |
| Eval committed (`660ad89`) | 15:07 | **2 h 56 min** |
| Docs committed (`767dc75`) | 17:04 | **4 h 53 min** |

A working, measured prototype — generate, checkpoint, apply, verify,
eval — was on `main` in just under three hours. The remaining time
was the README and this folder.

| Commit | Time | Module |
|---|---|---|
| `1017181` | 12:14 | M0 skeleton, deployed |
| `381b081` | 13:06 | M1 sketch runner |
| `92f54f2` | 13:12 | M2 measure |
| `bf9f1bb` | 13:20 | IT-1 base sketches 6/6 |
| `255ef54` | 13:33 | M3 generate |
| `ecead81` | 13:41 | M4 plan |
| `e9cb8ef` | 13:44 | M5 checkpoint |
| `bbc24ea` | 13:51 | M6 apply |
| `e2736b4` | 14:04 | M7 verify |
| `8ee04a3` | 14:16 | M8 before/after, revert |
| `abca795` | 14:18 | IT-2 demo path deployed |
| `b9a532a` | 14:29 | M9 Monaco |
| `660ad89` | 15:07 | M10 eval |
| `767dc75` | 17:04 | README and `docs/` |

---

## What I specified

I wrote the claims, the hard rules, and the build order before the
implementation started. They are in [CLAUDE.md](./CLAUDE.md) and
[BUILD.md](./BUILD.md).

In particular I locked:

- no node graph, no merge, no “quick apply”
- generated code only inside `sandbox="allow-scripts"`
- the API key never on the client
- measurement as arithmetic, not a second model
- **not checked** as a first-class verdict
- thresholds fixed before the eval run
- deploy on the first commit, not the last

The agent worked inside that envelope. When a suggestion left it — a
shortcut around the checkpoint, a hidden iframe that froze motion, RGB
palette buckets that flipped on dark skies, assistant-turn prefill
that `claude-sonnet-5` rejects — I kept the constraint and changed the
implementation.

---

## What the agent implemented

Module by module, with a visible check before the next one:

| Module | What shipped |
|---|---|
| M0 | Vite app, `/api/ping`, deployed to Vercel |
| M1 | Sandboxed p5 iframe, two-frame capture, error channel |
| M2 | Motion and palette measurement, no model |
| IT-1 | 6/6 on the frozen base sketches |
| M3–M6 | Generate, plan, checkpoint, apply |
| IT-2 | Full demo path on the deployed URL |
| M7 | **Kept / changed anyway / not checked** |
| M8–M9 | Before/after, revert, Monaco |
| M10 | Preservation eval, plan overlap, measurement sanity |

I reviewed the code, ran the checks, and read the eval. I did not
paste an unspecified “build me Spellburst” prompt and accept the
result.

The interesting failures were implementation, not prompt theatre. An
off-screen iframe made every sketch look still. A recolour moved the
raw motion score past the drift threshold. Prefill returned 400. Those
are in the README because they change how the numbers should be read.

---

## What this does not show

It does not show that artists prefer the checkpoint. It does not show
that I could have reached the same prototype with no agent, or that
the agent could have reached it with no brief. It does not make the
access code into authentication.

The eval found that naming a property in Preserve dropped drift from
25/60 to 6/60, and that this was not a guarantee. That is a finding
about the product model, not about the coding agent.

---

## Tools

| Role | Tool |
|---|---|
| Implementation agent | Cursor, with Claude as the coding model |
| Product model | `claude-sonnet-5` via `@anthropic-ai/sdk` |
| Host | Vercel Hobby |

The demonstration link and the committed eval figures are in the
[README](./README.md). How to run and publish it is in
[DEPLOY.md](./DEPLOY.md).

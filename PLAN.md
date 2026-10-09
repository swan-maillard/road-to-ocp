# OCP Lab - Plan

Learn-by-practising trainer for the Oracle Certified Professional Java 25 exam (1Z0-831),
built from `OCP_Java_25_Certification_Exam_Refresher.pdf` (Ch. 1-12).

Core loop: **predict -> run on a real JVM -> explain -> teach-back -> spaced requeue**.
Enthuware ETSViewer stays for long, multi-concept questions; OCP Lab provides **short,
single-rule micro-drills**.

Non-goals: replacing ETSViewer, cloud accounts, an LLM ever being the source of truth
(the JVM is the source of truth).

---

## Architecture

- `server.js` - dependency-free Node server: static files, `GET /api/content`,
  `GET /api/ref`, `POST /api/run` (JVM runner), `POST /api/ai` + `GET /api/ai/status`
  (DeepSeek proxy; key from `.env`).
- `runner/javaRunner.js` - writes `Main.java`, runs `java Main.java` on JDK 25
  (classic or compact source files), captures stdout/stderr/exit code, 15s timeout.
- `public/` - `index.html`, `app.js`, `style.css` (vanilla, no build step).
- `content/*.json` - one file per chapter, array of drills.
- `content/reference/chN.txt` - per-chapter PDF text used to ground AI explanations.
- `scripts/verify.mjs` - runs every code drill on the JVM and asserts the expected
  outcome/answer. Content must pass before it ships.
- `.env` / `.env.sample` - server-side secrets (DeepSeek key), git-ignored.
- `vendor/cm-entry.js` + `scripts/build-vendor.mjs` - esbuild bundles CodeMirror 6 into
  `public/vendor/cm.js` (offline). Rebuild with `npm run build:vendor`.
- `content/tasks.json` - writing exercises (hidden harness tests), merged into Practice.

### Drill schema

```jsonc
{
  "id": "ch1-int-division",
  "chapter": 1,
  "section": "1.2",
  "objective": "Evaluate arithmetic and boolean expressions",
  "kind": "code",              // "code" | "concept" | "fill" | "trace" | "order"
  "outcome": "OUTPUT",         // code only: OUTPUT | NO_OUTPUT | COMPILE_ERROR | RUNTIME_ERROR
  "trap": "integer-division",  // recurring-error tag (drives Traps + Cheat Sheet)
  "difficulty": 1,             // 1..3
  "prompt": "What happens?",
  "code": "void main(){ ... }",// Java 25 compact source file, <= 8 lines, one rule
  "options": [{ "id": "a", "text": "..." }], // concept/fill/order only
  "answer": "3.0",             // OUTPUT: exact stdout; RUNTIME_ERROR: exception name; else ""
  "explanation": "...",
  "ref": "1.2 Binary numeric promotion",
  "hints": ["...", "..."],     // progressive hints (T11)
  "teachBack": "When do you get 3.5 instead of 3.0 here?"
}
```

---

## Feature checklist (initial plan -> status)

### Exercise types
- [x] Predict output
- [x] Will it compile / runtime error / no output (outcome class)
- [x] Fill-the-blank (MCQ)
- [ ] Find the bug (spot the offending line)
- [ ] Write & run with hidden tests (free coding)
- [ ] Order / match
- [ ] Trace (fill a state table)

### Adaptive engine / coverage
- [x] Spaced repetition (Leitner boxes)
- [x] Weak-tag detection (trap counters)
- [x] Daily review queue ("Due now")
- [x] Coverage dashboard
- [ ] Per-section minimum-coverage indicator
- [ ] Exam mode (timed, weighted mix)

### Learning-quality features
- [x] JVM diff view (your answer vs reality)
- [x] Teach-back with self-grade
- [x] Cheat sheet built from recurring errors
- [x] "Traps I keep falling for"
- [x] Keyboard-first
- [x] Snapshot / restore progress
- [ ] Progressive hints
- [ ] Error-anatomy cards
- [ ] Clickable PDF jump-links
- [ ] Day 1 -> exam-day study plan

### AI (added beyond initial plan)
- [x] Grounded teach-back grading
- [x] "Why was I wrong?"
- [x] Q&A chat (grounded, refuses when unsure)
- [x] Generate similar / trickier drills (JVM-verified)
- [x] Verifier + report; caching; key in `.env`

### Content
- [x] Chapter 1 (18 drills, JVM-verified)
- [ ] Chapters 2-12

---

## Tasks and Definition of Done

### T1. Outcome-class reply buttons  [DONE]
Four buttons per code drill (Prints / No output / Compile error / Runtime error) + optional
exact text; outcome compared to the JVM-observed outcome.

### T2. Cheat Sheet from recurring errors  [DONE]
Lists only traps with misses > 0, most-missed first, with deduped rules and `ref`s.

### T3. Content schema migration + verification  [DONE]
Ch.1 migrated to `kind`/`outcome`; `verify.mjs` checks outcome + exact stdout; 100% pass.

### T4. DeepSeek integration via .env  [DONE]
`POST /api/ai` uses `DEEPSEEK_API_KEY` from `.env`; `GET /api/ai/status`; `.env.sample`;
`.gitignore`; key never logged or stored in the browser.

### T5. AI features  [DONE]
Grade teach-back, explain mistake, Q&A, generate similar/trickier (JVM-verified). Cached;
never automatic.

### T5b. AI correctness safeguards  [DONE]
JVM sole authority for code; grounding from `content/reference` with "quote or say unsure";
JSON mode + enums; refuse-when-ungrounded; verifier; report button.

### T6. Content expansion (Chapters 2-12)  [TODO]
- **DoD (per chapter)**: one `content/chN.json` with short, single-rule micro-drills covering
  that chapter's sections, including concept/fill items; `node scripts/verify.mjs` passes
  100%; Coverage tab shows section-level bars.

### T7. Polish  [TODO]
- **DoD**: `node --check` clean on all JS; no secrets under version control.

### T8. Write & run (free coding with hidden tests)  [TODO]
The core "learn by practising code" mode.
- **DoD**: a task prompt + starter code + hidden test(s); learner edits and runs real code;
  tests are compiled/run on the JVM and report pass/fail per assertion; solutions are never
  shipped to the client; JVM output is the only judge; results feed the same SR/trap engine.

### T9. Exam mode (timed, weighted mix)  [TODO]
- **DoD**: build a mixed, non-repeating set weighted like the real exam (by objective);
  countdown timer; no reveal until submit/end; per-question and overall scoring; a review
  screen listing misses that feeds Traps/Cheat Sheet; configurable length/time.

### T10. Extra exercise types  [TODO]
- **DoD**:
  - **Trace**: given a snippet + inputs, learner fills a small state table; graded
    cell-by-cell against JVM-verified expected states (can be a pure-prediction item).
  - **Order / match**: drag-or-click ordering (e.g. precedence, thread states, bundle search
    order, module readability); exact-match grading.
  - **Find the bug**: highlight the offending line (single-line click) with an optional
    short reason; graded against a designated line id.

### T11. Progressive hints + error-anatomy cards  [TODO]
- **DoD**: each drill may carry 2-3 hints (Ch. -> rule name -> rule text) revealed one at a
  time and logged (used-hint lowers SR weight but keeps the item in rotation); each wrong
  answer shows an auto- or AI-classified "error anatomy" (precedence / conversion / syntax /
  ambiguity / wrong API / state) that increments that taxonomy counter.

### T12. Coverage rigor + PDF jump-links  [TODO]
- **DoD**: Coverage marks sections below a minimum drill count as "thin"; every `ref` opens
  the PDF at the right page (e.g. `file:///...pdf#page=N`, page resolved from the section
  index) or the extracted reference text when the browser blocks local links.

### T13. Study plan + stats dashboard  [TODO]
- **DoD**: a start date + target exam date produce a day-by-day plan (new drills + review
  queue + a weekly mixed test); a stats view shows mastery %, retention by box, trap trend
  over time, and forecast "exam readiness".

### T14. Interleaving + gamification polish  [TODO]
- **DoD**: sessions interleave topics by default (avoid blocking); streak, best streak, and
  a small daily-goal ring; all persisted and exportable.

### T15. Content quality harness  [TODO]
- **DoD**: `verify.mjs` also validates schema (required fields, valid enums, hint/ref shape)
  and flags duplicate `code`/near-duplicate prompts; CI-style exit codes.

### T16. Coverage audit + gap fill  [IN PROGRESS]
An independent per-chapter audit compared every chapter's reference text with its drills and
listed every missing point/behavior/exception. Gap-fill drills added in `content/gaps1..4.json`.
- **DoD**
  - Audit run for all 12 chapters; gaps enumerated per section. [done]
  - Exam-critical gaps filled with JVM-verified code or concept/fill drills. [substantially done]
  - Remaining: a tail of overlapping/descriptive items (many overload signatures, some command
    switches, and purely narrative statements) either folded into concept drills or still to add.
  - UTF-8 stdout forced in the runner so symbol/`€`/`£`/Unicode outputs verify correctly. [done]

---

## Priority order (recommended)

1. **T6 - Content Ch.2-12** (nothing else matters without coverage).
2. **T8 - Free coding with hidden tests** (highest learning value: the generation effect).
3. **T9 - Exam mode** (tests retrieval under real constraints).
4. **T11 - Hints + error anatomy** and **T13 - Study plan** (learning quality + pacing).
5. **T10 - Extra types**, **T12 - Coverage/jump-links**, **T14/T15 - Polish**.

---

## Status

- [x] T0 JDK 25 + runner + server + UI scaffold + Ch.1 seed + verify harness
- [x] T1 Outcome-class reply buttons
- [x] T2 Cheat Sheet from recurring errors
- [x] T3 Schema migration + verification
- [x] T4 DeepSeek integration via .env
- [x] T5 AI features
- [x] T5b AI correctness safeguards
- [x] T6 Content expansion (Ch.2-12)
- [x] T7 Polish (node --check clean; cache + parallel verify; no secrets committed)
- [~] T16 Coverage audit + gap fill (498 drills total: 405 code, 70 concept, 17 fill, 6 extra types)
- [x] T8 Write & run sandbox with hidden tests (content/tasks.json, 27 tasks across all chapters, all verified)
- [x] T8b Writing exercises merged into Practice (no separate tab) + VS Code-style CodeMirror 6 editor (vendored, offline; highlighting, auto-close brackets/quotes, auto-indent, bracket matching, line numbers, undo/redo, find - NO autocomplete and NO linting/typo hints)
- [x] T10 Extra exercise types (order, trace, find-the-bug)
- [x] T11 Progressive hints + error-anatomy categories. Hints: (1) where it's from, (2) an authored per-trap conceptual cue, (3) an authored per-trap "narrow it down" decision - none reveal the answer. `content/hints.json` covers all 419 traps. Removed the chip tags above each exercise.
- [x] T12 PDF jump-links (/pdf + pages.json) + thin-section coverage flags
- [x] T13 Study plan + readiness/stats dashboard (retention, trap sparkline)
- [x] T14 Interleaving toggle + daily-goal ring + streak
- [x] T15 Quality harness (schema validation, duplicate detection, task verification)
- [ ] T9 Exam mode - intentionally NOT built (per user request)

## UX foundations applied (NN/g)

- Visibility of system status: spinners for JVM/AI actions (>1s), session + daily-goal progress, toasts.
- User control & freedom: Skip, Reset code, Show solution, modal Esc/backdrop close, export/import.
- Recognition over recall: visible keyboard hints, ref text + PDF link on every explain, status chips per drill.
- Error prevention: confirm on reset, disabled controls while revealed.
- Flexible & efficient: keyboard-first (Ctrl+Enter, 1-4, H, R, ?), interleave toggle, focus scopes.
- Aesthetic & minimalist: single accent, clear hierarchy, no clutter.
- Error recovery: plain-language error anatomy + rule reference.
- Accessibility: focus-visible rings, aria roles/labels, prefers-reduced-motion.

## Frontend architecture (Vue 3)

The UI is a modern Vue 3 SPA (Vite + SFC + Composition API), built to `public/` and served
by `server.js` alongside the JSON API.

- `web/src/composables/` - singleton stores: `useContent` (drills/tasks/hints/pages),
  `useProgress` (SR, traps, taxonomy, history, plan, persistence), `useAi` (DeepSeek + cost),
  `useRun` (JVM runner + run progress), `usePractice` (session/scopes/interleave),
  `useTheme`, `useToasts`.
- `web/src/lib/` - `util.js` (grading/classify), `cm.js` (CodeMirror 6 factory, no autocomplete).
- `web/src/components/` - small reusable pieces: `ui/*`, `code/CodeBlock` + `code/CodeEditor`,
  `layout/*` (TopBar, NavTabs, GoalRing, Toasts, RunBar), `drill/*` (DrillHost, WriteDrill,
  CodeBlock, OutcomeButtons, OptionsInput, OrderInput, TraceInput, BugInput, Hints, RevealPanel,
  TeachBack), `ai/AiPanel`, `views/*`, `modals/*`.
- Java/OCP theme: `web/src/styles/theme.css` (light + dark tokens, Java orange/blue/red accents).

Build/run: `npm run build` then `node server.js`; or `npm run dev` (Vite HMR, proxies `/api`).

## Road to OCP - UI overhaul (design system)

- Design system in `theme.css`: tokens (space/radius/type/control heights), flat button system
  (xs/sm/md, primary/secondary/ghost/danger), subtle tonal badges, markdown styles. Compact by default.
- Logo shows **25**; nav = Home · Cheat Sheet · Traps · Coverage · Plan (no Practice tab; practice
  launched from Home / Traps, with a "Home" back control). Top bar slimmed (goal ring · theme · settings).
- New UI primitives: `ui/Markdown.vue` (marked + DOMPurify), `ui/Badge.vue`, `ui/Stat`, `ui/Bar`, `ui/Modal`.
- AI replies and teach-back feedback render as **markdown**.
- Cheat Sheet / Traps / Coverage rebuilt with **chapter titles (parts) and section titles (subparts)**,
  collapsible blocks, a shared legend, and clear states (missed = left red bar; "few drills" replaces "thin").
- Practice: compact two-line session header (New / Review / Done + today vs goal) and a compact card.


- App renamed to **Road to OCP**; added a **Home** page (readiness, stats, today's goal,
  weakest areas, start/review actions).
- **Practice**: session bar now separates **New / Review / Done** and shows today vs daily goal.
- **Daily plan model**: unseen cards are *new*, not *due*. Each day = **reviews due first, then
  new cards up to your goal** (`new = max(0, goal - reviewsDue - newIntroducedToday)`), so the
  daily load tracks your goal. Unseen cards are never counted as "due".
- **Cheat Sheet**: reworked to be organised by **chapter → section/topic** (not by question),
  compact, with an "Only missed" filter to sweep exactly the knowledge you're missing.
- **Traps**: grouped **by chapter** with mini bars + per-trap "Train".
- **Coverage / Plan**: kept, tightened.
- AI / Data / Help moved into a **settings menu** (cog) in the top bar; theme toggle stays.
- **Light theme darkened** to a calmer "paper" palette (no pure-white surfaces).


- Light/dark theme with system default + toggle (persisted); CodeMirror theme follows.
- Design tokens for both themes; single accent + semantic colors; 3-size type scale.
- Visual hierarchy: grouped layout via whitespace/containers, one prominent primary action per view.
- Microinteractions: button states, view/reveal/hint/modal entrance animations, correct/incorrect pulses,
  animated progress + daily-goal ring, run progress bar during JVM/AI work, dismissible toasts.
- Code blocks get a chrome bar (language + Copy button); outcomes are a segmented control with the
  safest default ("Compiles & prints") preselected.
- Wider content area for list views (Cheat/Traps/Coverage/Plan); responsive down to mobile.
- [ ] T8 Write & run with hidden tests
- [ ] T9 Exam mode
- [ ] T10 Extra exercise types (trace / order / find-the-bug)
- [ ] T11 Progressive hints + error-anatomy cards
- [ ] T12 Coverage rigor + PDF jump-links
- [ ] T13 Study plan + stats dashboard
- [ ] T14 Interleaving + gamification polish
- [ ] T15 Content quality harness

# Screen reader protocol

**Time: 25 minutes.** Run it before every launch, and after any change to navigation,
forms, or the page builder.

Automated checks catch roughly 30–40% of real accessibility barriers. Everything in this
file is in the other 60–70%: things that are technically valid, pass every automated
check, and still make the site unusable. A `<button>` with a perfect accessible name of
"Click here" passes axe and tells a blind user nothing.

> **What this is not.** Twenty-five minutes of a sighted developer using a screen reader
> is not the same as a daily user's judgment, and this protocol should not be described to
> a client as if it were. It catches the gross failures — the ones that make a task
> impossible — and it will miss friction that a fluent user would find immediately. It is
> the floor. If a client's audience includes a significant number of assistive technology
> users, budget for testing by someone who uses one daily. That is a different line item
> and it is worth quoting honestly.

---

## Before you start

**macOS — VoiceOver.** `⌘ + F5` toggles it on and off. Learn these four:

| Keys | Does |
|---|---|
| `⌃ ⌥ →` | Next item |
| `⌃ ⌥ U` | Open the rotor — then `←` / `→` between Headings, Links, Landmarks |
| `⌃ ⌥ Space` | Activate the current item |
| `⌃` | Shut it up mid-sentence. You will need this constantly |

**Windows — NVDA.** Free, from nvaccess.org. `Insert + Q` quits. `H` jumps by heading,
`D` by landmark, `K` by link, `Insert + F7` opens the elements list.

**Use headphones the first time.** The voice is fast and disorienting, and the instinct
to turn it off before the page has finished announcing is strong.

**Test in the browser the client's audience uses.** VoiceOver's behaviour differs
meaningfully between Safari and Chrome; Safari is the better-supported pairing on macOS.

---

## When this runs — per client, not per commit

**This is a launch step for a client site, not a standing obligation on the starter.**
It is triggered by one thing: **publishing an accessibility statement.**
`docs/templates/accessibility-statement.md` opens by saying it must not be published
until the audit has run, and this protocol is half of that audit. A statement is a dated,
public claim; running this is what makes it true rather than aspirational. WP9's launch
checklist carries the trigger.

It is deliberately **not** part of CI and not owed by the starter, for a reason worth
stating so nobody re-adds it as a blocker:

- The starter's interactive surface is small and entirely native — links, buttons, and a
  `<details>` disclosure. The barriers automation misses are mostly *custom widget*
  barriers: focus traps in modals, live-region announcements, invented ARIA. Almost none
  of that exists here, so the automated share of coverage is far higher than the usual
  "30–40%" average implies.
- What this protocol would surface on the starter is mostly **content judgement** — is
  that alt text accurate, does that heading describe what follows, does that link make
  sense out of context. On the starter those are placeholder words no client will ever
  have, so the result does not transfer.
- On a **client** site all of that inverts. Real copy, real navigation, possibly forms,
  and someone whose reputation is attached to the claim.

**Already verified mechanically on the starter (2026-08-18), so do not spend the session
re-doing it:** every interactive element is keyboard focusable, focus order follows the
DOM with no positive `tabindex` anywhere, the disclosure toggles from the keyboard, a
visible focus indicator appears on both styled controls and bare links, reflow at 320px
loses nothing, and target sizes pass. Start from the tasks below, which are the part that
needs a person.

---

## What you can run today

**All five tasks are runnable.** They were not until WP12: the page-builder sections had
no renderer, so tasks 3 and 4 had nothing to exercise. Pages now render their sections,
articles render their bodies, and the blog index lists real articles.

Two of the checks below need no screen reader at all, and those two were run on real
content on 2026-08-18 — reflow at 320px and target size, both clean across all eight
pages. That is recorded in the WP12 handoff. **It is not a substitute for tasks 1 to 5**,
which need a person and a screen reader; automation reaches perhaps 30–40% of real
barriers, and none of the five tasks below is automatable.

---

## Task 1 · Find out what this business does, without looking

**Turn the screen off, or close your eyes.** This is the part people skip and it is the
part that works.

1. Load the home page.
2. Listen to the first fifteen seconds without touching anything.
3. Open the rotor to **Headings** and move through them.

**Pass:** within about thirty seconds you can say what the business does and what it wants
you to do next. The heading list reads like an outline of the page — one `h1` naming the
page, `h2`s naming its sections.

**Fail, and what it sounds like:**

- The first thing you hear is a cookie banner, a chat widget, or the navigation menu, and
  there is no way past it. → A skip link is missing, or focus is being trapped.
- The heading list is `h1, h3, h3, h2`. → Levels are being set by appearance rather than
  structure. `heading-outline.ts` exists to prevent exactly this; if you hear it, the
  renderer is not using it.
- Headings say "Section", "More", "Learn more". → Technically valid, useless as an
  outline. Headings are the table of contents for someone who cannot see the page.

## Task 2 · Get to a specific page using only the keyboard

Reload, and **do not touch the mouse**.

1. Press `Tab` once. Something should appear — a "Skip to content" link.
2. Keep tabbing. Watch where the focus ring goes.
3. Navigate to a named page through the menu, and activate it.

**Pass:** every stop is visible, the order matches the visual order, and you can reach the
page. Focus never disappears.

**Fail:**

- **Nothing visible on the first Tab.** No skip link, so every keyboard user traverses the
  whole menu on every page.
- **The focus ring vanishes.** Either a `:focus` outline has been removed, or focus has
  moved into something off-screen. Both are failures of 2.4.7, and the second is worse
  because it is invisible.
- **A sticky header covers the focused element** when tabbing back up the page. This is
  **2.4.11 Focus Not Obscured**, new in WCAG 2.2, and no automated tool catches it.
- **Focus jumps somewhere unexpected after opening a menu.** Radix handles this correctly
  by default — if it is wrong, something has overridden it.

## Task 3 · Read an article

*(Needs WP12.)*

1. Open an article. Move through it with the rotor set to Headings.
2. Then move through Links.
3. Then find the images.

**Pass:** headings outline the article. Link text makes sense read aloud on its own.
Images either describe themselves usefully or are silent.

**Fail:**

- **Several links all announce "Read more".** Out of context they are indistinguishable.
  The rotor reads links as a list, with no surrounding sentence.
- **An image announces its filename**, or reads out a description that repeats the caption
  word for word. The schema requires alt text and offers a decorative flag —
  `mediaImage` enforces the presence, not the quality. This is where quality is checked.
- **A decorative image announces anything at all.** It should be silent.

## Task 4 · Complete the thing the page is asking you to do

*(Needs WP12, and a form.)*

Whatever the primary call to action is — enquiry form, contact link, download — do it
without the mouse and without the screen.

**Pass:** you know what each field wants before typing, you know when you have made an
error, and you know when it succeeded.

**Fail:**

- **An error appears visually and is never announced.** The most common serious failure on
  any site with a form. The error needs to reach a live region or focus has to move to it.
- **Fields identified only by placeholder text.** The placeholder disappears on focus, so
  the label disappears exactly when it is needed.
- **"Required" communicated only by a red asterisk.**
- **A drag interaction with no alternative.** **2.5.7 Dragging Movements**, new in 2.2.
- **Re-entering information already given earlier in the same flow.** **3.3.7 Redundant
  Entry**, new in 2.2.

## Task 5 · Get lost, then recover

1. Visit a URL that does not exist.
2. Visit a page that has been deliberately removed — the redirect map's `410`.

**Pass:** both announce what happened and offer a way back. The `410` page says the page is
gone rather than implying it might return.

**Fail:** the page announces nothing beyond a status code, or reads as an empty document.

---

## Two checks that need no screen reader

Run these in the same sitting; both are WCAG AA and neither is caught by CI.

**Zoom to 400%** (`⌘ +` repeatedly) at a 1280px window, or set the viewport to 320px wide.
Nothing may be lost, and nothing may scroll horizontally. This is **1.4.10 Reflow**, and
it fails most often on tables and wide code blocks.

**Tap target size.** Anything clickable should be at least 24×24 CSS pixels with adequate
spacing — **2.5.8 Target Size (Minimum)**, new in 2.2. Small icon-only buttons in a footer
row are the usual offender.

---

## Recording the result

Write the outcome into the launch checklist as: **date, who ran it, browser and screen
reader, which tasks passed, and every failure with a decision** — fixed, accepted with a
reason, or deferred with a date.

**"Ran the screen reader protocol ✓" is not a record.** It cannot be audited, it cannot be
handed to the next person, and it is indistinguishable from not having run it. A client
asking whether their site is accessible deserves the list, including what was accepted and
why.

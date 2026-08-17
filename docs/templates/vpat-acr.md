# Accessibility Conformance Report (ACR) — [CLIENT NAME] [PRODUCT/SITE]

Based on **VPAT® 2.5 Rev [INT | EU | 508]**

> **Template and orientation.** Replace every `[BRACKETED]` value and delete this block.
>
> **VPAT vs ACR.** A VPAT is the blank form; an **ACR** is the filled-in report. Clients
> and procurement teams say "send us your VPAT" and mean the ACR. Deliver a document
> titled Accessibility Conformance Report.
>
> **Pick the right edition.** `INT` covers WCAG only. `508` adds US Section 508 —
> required for US federal procurement. `EU` adds EN 301 549 — required for EU public
> sector, and increasingly asked for under the European Accessibility Act. `WCAG` is
> WCAG-only and largely superseded by INT. Get the current form from the ITI at
> <https://www.itic.org/policy/accessibility/vpat>; do not reuse an old copy, since the
> revisions change.
>
> ## When to produce one — and when not to
>
> Most small-business marketing sites **do not need this**. It is procurement paperwork,
> and it exists because a buyer's process demands a document in a known format. Produce
> one when the client sells to **government, education, healthcare, or enterprise
> procurement**, or when a specific buyer asks.
>
> Producing one unprompted is a signal that costs real time and invites scrutiny of every
> row. The accessibility statement is the right public artefact; this is the right
> *procurement* artefact.
>
> ## The part that gets people into trouble
>
> **An ACR is a formal claim, frequently contractual, and sometimes read by a lawyer.**
> "Supports" against a criterion nobody tested is not optimism, it is a false statement in
> a document a buyer relied on.
>
> Fill it from evidence: the completed `docs/runbooks/accessibility-audit.md`, the
> screen-reader protocol record, and the CI results. Where there is no evidence, the
> honest value is **"Not Evaluated"** — a legitimate, commonly used entry that buyers
> accept far more readily than a claim that collapses under questioning.

---

## Name of product/version

[CLIENT NAME] website — [URL], as at [DATE]

## Report date

[DATE]

## Product description

[One or two sentences. What the site is and who uses it.]

## Contact information

[name] · [accessibility@example.com] · [phone]

## Notes

[Anything a reader needs to interpret the tables — e.g. "This report covers the public
marketing site. The client portal at portal.example.com is a separate product and is not
covered."]

## Evaluation methods used

[Be specific and honest. For example:]

- Automated testing with **axe-core [version]** via Playwright, run on every code change
  against [N] representative pages
- Manual keyboard-only testing of all primary journeys
- Manual screen reader testing with **[VoiceOver [version] on Safari [version]]**,
  following a documented protocol
- Reflow verified at 400% zoom and at a 320 px viewport
- Colour contrast verified at the design-token level, enforced at build time
- Testing performed by **[WHO]** on **[DATE]**
- **A representative sample of [N] page types was tested, not every page**
- **[If applicable] No testing by users of assistive technology was carried out.**

> That last line is uncomfortable and belongs there if it is true. A buyer who discovers
> it later trusts nothing else in the document.

## Applicable standards/guidelines

| Standard | Included |
|---|---|
| WCAG 2.2 Level A | [Yes/No] |
| WCAG 2.2 Level AA | [Yes/No] |
| WCAG 2.2 Level AAA | [usually No] |
| Revised Section 508 | [Yes/No] |
| EN 301 549 | [Yes/No] |

## Terms

| Term | Meaning |
|---|---|
| **Supports** | The functionality meets the criterion **without known defects**. |
| **Partially Supports** | Some functionality does not meet the criterion. |
| **Does Not Support** | The majority of functionality does not meet the criterion. |
| **Not Applicable** | The criterion is not relevant — the product has no such content. |
| **Not Evaluated** | Not tested. **Permitted for Level AAA only** in a standard VPAT. For AA rows you have not tested, the honest options are to test them or to say Partially Supports with a remark explaining what is unverified. |

---

## Table 1 — Success Criteria, Level A

| Criteria | Conformance Level | Remarks and Explanations |
|---|---|---|
| 1.1.1 Non-text Content | [ ] | [e.g. Supports. Alt text is required by the content model, with an explicit decorative flag. Quality sampled during the audit on [DATE].] |
| 1.2.1 Audio-only and Video-only (Prerecorded) | [ ] | [Not Applicable — no audio or video content.] |
| 1.3.1 Info and Relationships | [ ] | [Heading levels are derived from document structure rather than stored, so reordering content cannot produce a skipped level.] |
| 1.3.2 Meaningful Sequence | [ ] | |
| 1.3.3 Sensory Characteristics | [ ] | |
| 1.4.1 Use of Color | [ ] | |
| 1.4.2 Audio Control | [ ] | |
| 2.1.1 Keyboard | [ ] | |
| 2.1.2 No Keyboard Trap | [ ] | |
| 2.1.4 Character Key Shortcuts | [ ] | |
| 2.2.1 Timing Adjustable | [ ] | |
| 2.2.2 Pause, Stop, Hide | [ ] | |
| 2.3.1 Three Flashes or Below Threshold | [ ] | |
| 2.4.1 Bypass Blocks | [ ] | [Skip link, first in tab order.] |
| 2.4.2 Page Titled | [ ] | |
| 2.4.3 Focus Order | [ ] | |
| 2.4.4 Link Purpose (In Context) | [ ] | |
| 2.5.1 Pointer Gestures | [ ] | |
| 2.5.2 Pointer Cancellation | [ ] | |
| 2.5.3 Label in Name | [ ] | |
| 2.5.4 Motion Actuation | [ ] | |
| 3.1.1 Language of Page | [ ] | |
| 3.2.1 On Focus | [ ] | |
| 3.2.2 On Input | [ ] | |
| 3.3.1 Error Identification | [ ] | |
| 3.3.2 Labels or Instructions | [ ] | |
| 4.1.2 Name, Role, Value | [ ] | |

## Table 2 — Success Criteria, Level AA

| Criteria | Conformance Level | Remarks and Explanations |
|---|---|---|
| 1.2.4 Captions (Live) | [ ] | |
| 1.2.5 Audio Description (Prerecorded) | [ ] | |
| 1.3.4 Orientation | [ ] | |
| 1.3.5 Identify Input Purpose | [ ] | |
| 1.4.3 Contrast (Minimum) | [ ] | [Contrast is validated at the design-token level and the token build fails below AA, so a rebrand cannot silently regress it.] |
| 1.4.4 Resize Text | [ ] | |
| 1.4.5 Images of Text | [ ] | |
| 1.4.10 Reflow | [ ] | [Verified at 400% zoom and 320 px.] |
| 1.4.11 Non-text Contrast | [ ] | |
| 1.4.12 Text Spacing | [ ] | |
| 1.4.13 Content on Hover or Focus | [ ] | |
| 2.4.5 Multiple Ways | [ ] | |
| 2.4.6 Headings and Labels | [ ] | |
| 2.4.7 Focus Visible | [ ] | [Focus ring contrast is gated at the token level — WP3 found the default below the 3:1 that 1.4.11 requires.] |
| 2.4.11 Focus Not Obscured (Minimum) | [ ] | **New in 2.2.** [Verified manually — no automated tool covers this.] |
| 2.5.7 Dragging Movements | [ ] | **New in 2.2.** |
| 2.5.8 Target Size (Minimum) | [ ] | **New in 2.2.** |
| 3.1.2 Language of Parts | [ ] | |
| 3.2.3 Consistent Navigation | [ ] | |
| 3.2.4 Consistent Identification | [ ] | |
| 3.2.6 Consistent Help | [ ] | **New in 2.2.** |
| 3.3.3 Error Suggestion | [ ] | |
| 3.3.4 Error Prevention (Legal, Financial, Data) | [ ] | |
| 3.3.7 Redundant Entry | [ ] | **New in 2.2.** |
| 3.3.8 Accessible Authentication (Minimum) | [ ] | **New in 2.2.** |
| 4.1.3 Status Messages | [ ] | [The one most often missed — an error that appears visually and is never announced.] |

---

## Legal disclaimer

[CLIENT NAME] makes this report available for informational purposes. It reflects testing
carried out on the date stated, against the version of the site live on that date. It is
not a legal opinion or a warranty of compliance with any statute.

> Keep this. WCAG conformance and legal obligation under the ADA, EAA, Equality Act or
> Section 508 are related and not identical — a fact worth stating plainly to a client who
> asks whether the ACR makes them "compliant".

# Accessibility statement — [CLIENT NAME]

> **Template.** Replace every `[BRACKETED]` value and delete this block. Publish it at
> `/accessibility` and link it from the footer of every page.
>
> **Do not publish this until the audit has actually run.** A statement is a public claim
> about a specific site on a specific date. Publishing one because the template existed —
> before `docs/runbooks/accessibility-audit.md` and the screen-reader protocol have been
> completed — is worse than publishing nothing: it is a documented, dated, false claim,
> and it is the first thing anyone brings up in a complaint.
>
> **The known-issues section is the point.** A statement listing no problems is not read as
> a perfect site; it is read as a site nobody checked. Regulators and disabled users both
> treat an honest, specific list as evidence of a real process, and an empty one as
> evidence of none.

---

## Our commitment

[CLIENT NAME] wants this website to be usable by as many people as possible, including
people who use screen readers, magnification, speech input, or a keyboard rather than a
mouse.

## How accessible this website is

This website **[aims to conform | conforms | partially conforms]** to the
[Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) at
**level AA**.

> Pick one, honestly:
>
> - **Conforms** — every page meets every level A and AA criterion. Only claim this if the
>   audit found nothing outstanding.
> - **Partially conforms** — some content does not fully conform. **This is the honest
>   answer for most sites**, and it is not an admission of failure. It is what the known
>   issues section below is for.
> - **Aims to conform** — the target is set and testing has not finished. Say this only
>   while that is true, with a date by which it will be resolved.

## Known issues

We are aware of the following and are working on them.

| Issue | Who it affects | What to do instead | Fix expected |
|---|---|---|---|
| [e.g. Some older PDFs are not tagged for screen readers] | [Screen reader users] | [Contact us and we will supply the content in another format] | [Month YYYY] |
| [ ] | [ ] | [ ] | [ ] |

> If this table is empty, either the audit has not run or its results have not been
> transferred here. Both are worth checking before publishing.

## What we have not tested

- [e.g. Third-party embeds — the booking widget on /book is supplied by [VENDOR] and we do
  not control its markup. We have raised [reference] with them.]
- [e.g. PDF documents published before [DATE].]

> Third-party embeds are the most common genuine gap and the one clients are most
> surprised by. Naming the vendor and the ticket is the difference between a limitation
> and an excuse.

## Feedback

If you cannot access part of this website, or need content in a different format —
accessible PDF, large print, easy read, audio, braille — contact us:

- **Email:** [accessibility@example.com]
- **Phone:** [+44 …]
- **Post:** [address]

We aim to reply within **[N] working days**.

> A contact route is not optional. Several jurisdictions require one, and it is the only
> mechanism by which you find out about the barriers your audit missed — which, given the
> automation ceiling and the limits of a 25-minute manual pass, there will be some of.

## Enforcement

[UK: If you are not happy with our response, contact the
[Equality Advisory and Support Service (EASS)](https://www.equalityadvisoryservice.com/).]

[EU: Under the European Accessibility Act, complaints may be directed to [national body].]

[US: [Reference the client's own complaint process.]]

> Delete the jurisdictions that do not apply. Keep the one that does — and check it, since
> these bodies and their names change.

## How we tested

This website was last tested on **[DATE]** by **[WHO]**.

Testing covered:

- Automated checks with **axe-core**, on every code change, across [N] representative
  pages — see the accessibility job in our continuous integration
- A **manual screen reader pass** using [VoiceOver on Safari | NVDA on Firefox], following
  a documented protocol
- **Keyboard-only navigation** of every primary journey
- **Reflow at 400% zoom** and at a 320-pixel viewport
- Colour contrast, verified at the design-token level so it cannot regress unnoticed

We tested a **representative sample** of pages rather than every page.

> Do not overstate this. Automated tooling detects roughly 30–40% of accessibility
> barriers; the rest requires human judgment, and our manual pass is a structured
> half-hour rather than testing by people who use assistive technology daily. If that
> matters for this client's audience, say so here and quote for it separately.

## Preparation of this statement

This statement was prepared on **[DATE]** and last reviewed on **[DATE]**.

> Review it whenever the site changes materially, and at least annually. A statement dated
> three years ago describes a site that no longer exists, and the date is the first thing
> anyone checks.

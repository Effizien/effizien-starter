/**
 * WCAG 2.2 contrast gate for the token set.
 *
 * WHY THIS EXISTS
 * A rebrand changes tier 1 only, and the semantic tier keeps pointing at the
 * same rungs of the ramp — so the UI restyles itself correctly and *looks*
 * right. Contrast, however, is a property of the pair, not of either colour.
 * Swapping the neutral ramp for a blue one of the same apparent lightness took
 * muted-foreground from 4.74:1 to 3.69:1, which fails AA for normal text, with
 * nothing on screen looking obviously wrong.
 *
 * That is the failure 05-DISCOVERY-KIT Step 5 warns about: "do it now, not in
 * QA — retrofitting contrast means redesigning". This makes it a build error.
 *
 * The oklch → sRGB conversion is Björn Ottosson's OKLab transform, implemented
 * here rather than pulled in as a dependency, and verified against the browser's
 * own computed values (see tokens/README.md). An accessibility gate that lies is
 * worse than no gate, so it is checked against ground truth rather than trusted.
 */

const DEG = Math.PI / 180

/** oklch(L C H [/ A]) → [r, g, b] 0-255, plus alpha. Returns null if not oklch. */
export function oklchToRgb(value) {
  const m = String(value)
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i)
  if (!m) return null

  const pct = (s) => (s.endsWith('%') ? Number.parseFloat(s) / 100 : Number.parseFloat(s))
  const L = pct(m[1])
  const C = Number.parseFloat(m[2])
  const H = Number.parseFloat(m[3])
  const alpha = m[4] === undefined ? 1 : pct(m[4])

  const a = C * Math.cos(H * DEG)
  const b = C * Math.sin(H * DEG)

  // OKLab → LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const mm = m_ ** 3
  const s = s_ ** 3

  // LMS → linear sRGB
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]

  // Linear → gamma-encoded sRGB, clamped to gamut the same way a browser does.
  const enc = (v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(c * 255)))
  }
  return { rgb: lin.map(enc), alpha }
}

/** WCAG relative luminance from 0-255 sRGB. */
function luminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Contrast ratio between two oklch strings. Returns null if either is unparseable. */
export function contrast(fg, bg) {
  const a = oklchToRgb(fg)
  const b = oklchToRgb(bg)
  if (!a || !b) return null
  /* Alpha compositing is not attempted. A translucent token's effective contrast
     depends on whatever renders behind it, which the token set cannot know, so
     guessing would produce a confident wrong answer. Those pairs are reported as
     skipped rather than silently passed. */
  if (a.alpha < 1 || b.alpha < 1) return null
  const l1 = luminance(a.rgb)
  const l2 = luminance(b.rgb)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/**
 * Pairs that must pass, and at what level.
 *
 * 4.5 is AA for normal text. 3.0 is AA for large text (≥24px, or ≥18.66px bold)
 * and for non-text UI components and graphical objects (WCAG 1.4.11).
 *
 * muted-foreground is held to 4.5 deliberately: it is used for body copy at
 * 14–18px throughout, which is normal text, not large.
 */
export const PAIRS = [
  { fg: 'foreground', bg: 'background', min: 4.5, note: 'body text' },
  { fg: 'muted-foreground', bg: 'background', min: 4.5, note: 'secondary body text' },
  { fg: 'card-foreground', bg: 'card', min: 4.5, note: 'text on cards' },
  { fg: 'popover-foreground', bg: 'popover', min: 4.5, note: 'text in popovers' },
  { fg: 'primary-foreground', bg: 'primary', min: 4.5, note: 'primary button label' },
  {
    fg: 'secondary-foreground',
    bg: 'secondary',
    min: 4.5,
    note: 'secondary button label',
  },
  { fg: 'accent-foreground', bg: 'accent', min: 4.5, note: 'accent/hover state label' },
  { fg: 'sidebar-foreground', bg: 'sidebar', min: 4.5, note: 'sidebar text' },
  {
    fg: 'sidebar-primary-foreground',
    bg: 'sidebar-primary',
    min: 4.5,
    note: 'sidebar active item',
  },
  { fg: 'destructive', bg: 'background', min: 4.5, note: 'error text' },
  { fg: 'ring', bg: 'background', min: 3, note: 'focus indicator (non-text, 1.4.11)' },
]

/** Resolve {reference} chains against the flat token map. */
function resolve(name, tokens, seen = new Set()) {
  const raw = tokens[name]
  if (raw === undefined) return undefined
  const ref = String(raw).match(/^\{([^}]+)\}$/)
  if (!ref) return raw
  const target = ref[1].replace(/\./g, '-')
  if (seen.has(target)) return undefined
  seen.add(target)
  return resolve(target, tokens, seen)
}

/**
 * Check one mode. `tokens` is a flat { name: value } map where values may be
 * raw colours or {references}.
 */
export function checkMode(modeName, tokens) {
  const failures = []
  const skipped = []
  const passes = []

  for (const { fg, bg, min, note } of PAIRS) {
    const fgv = resolve(fg, tokens)
    const bgv = resolve(bg, tokens)
    if (fgv === undefined || bgv === undefined) {
      skipped.push({ pair: `${fg} on ${bg}`, why: 'token not defined' })
      continue
    }
    const ratio = contrast(fgv, bgv)
    if (ratio === null) {
      skipped.push({ pair: `${fg} on ${bg}`, why: 'translucent or non-oklch value' })
      continue
    }
    const record = { mode: modeName, pair: `${fg} on ${bg}`, ratio, min, note }
    if (ratio < min) failures.push(record)
    else passes.push(record)
  }
  return { failures, skipped, passes }
}

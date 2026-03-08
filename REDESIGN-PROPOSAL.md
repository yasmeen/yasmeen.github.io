# Refined Concept: "The Quiet Game"

A minimalist portfolio that rewards attention and curiosity. Clean on the surface,
deep underneath. Every pixel is intentional. Mobile-first. The gamification isn't
flashy -- it's *discovery*.

---

## Core Philosophy

> "The best interfaces feel like they were inevitable."

The site looks deceptively simple -- monochrome, generous whitespace, impeccable
typography. But the more you interact, the more you find. Hidden layers, subtle
responses, tiny rewards. It's a portfolio that treats the visitor like a player
in an ambient game -- no score, no leaderboard, just the pleasure of noticing
things most people miss.

This is how you signal "design engineer": the surface is minimal, but the
craftsmanship underneath is undeniable.

---

## The Gamification Layer: "Discovery, Not Competition"

### How it works

The site tracks a quiet **"attention score"** (never shown as a number). As
visitors interact more deeply -- hovering, scrolling slowly, finding hidden
details -- the site subtly *evolves*:

**Level 0 -- First Visit (The Clean Read)**
- Pristine black-on-white layout
- Beautiful typography, generous spacing
- Projects listed with titles + one-liners
- Feels complete. Most people stop here. That's fine.

**Level 1 -- Curious (Triggered by: slow scrolling, hovering on elements)**
- Subtle color accents begin to appear (your company colors fade in on
  project cards as you hover)
- Micro-animations activate: text has a barely-perceptible letter-spacing
  shift on hover, images gain a soft parallax
- A small "?" or compass icon pulses once in the corner, then goes still

**Level 2 -- Engaged (Triggered by: clicking into projects, spending 30s+ on page)**
- Project cards expand to reveal richer content: process shots, design
  decisions, before/after comparisons
- The background shifts from pure white to a barely-warm off-white (#faf9f6)
- Navigation gains a subtle "breadcrumb trail" showing which sections
  you've visited (small dots that fill in)

**Level 3 -- Explorer (Triggered by: finding easter eggs, visiting all sections)**
- Easter eggs reveal themselves:
  - Clicking your name 3x triggers a brief CSS animation where the entire
    layout "explodes" into a grid/wireframe view for 2 seconds, then
    reassembles -- showing the engineering underneath
  - A Konami code or specific gesture unlocks a hidden "/lab" page with
    experimental prototypes and WIPs
  - Long-pressing on mobile (or hovering 3s on desktop) on any project
    image reveals a "design annotation" overlay -- like a museum placard
    explaining your thinking
- The compass/? icon now shows a subtle completion state

### Why this gamification works

- **It's invisible to people who don't care.** The base experience is a
  perfectly functional, beautiful portfolio. Nothing feels missing.
- **It rewards the exact behavior you want from hiring managers.** The people
  who spend time, who hover, who click deeper -- they're the ones who see
  the best version of your work.
- **It demonstrates design engineering.** The progressive enhancement IS the
  portfolio piece. You're showing that you think about interaction states,
  edge cases, and delight.

---

## Layout & Structure

### Mobile-First Grid System

```
┌─────────────────────────┐
│                         │
│     YASMEEN ROUMIE      │  <- Name in 48px display font
│     design engineer     │  <- Subtitle in 14px mono, muted
│                         │
│  ┌───┐  ┌───┐  ┌───┐   │
│  │ W │  │ C │  │ A │   │  <- Work / Craft / About
│  └───┘  └───┘  └───┘   │     (pill-shaped tabs)
│                         │
│  ─────────────────────  │  <- Hairline divider
│                         │
│  SNAPCHAT               │  <- Company name, 11px mono, tracked
│  Camera Platform        │  <- Role, 18px serif
│  Prototyped AR lenses   │  <- One-liner, 15px sans
│  for hand & body        │
│  tracking               │
│  2017                   │  <- Year in muted mono
│                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  <- Dashed divider (subtle)
│                         │
│  NASA                   │
│  Launch Vehicle AR      │
│  Built HoloLens         │
│  experiences for        │
│  spacecraft viz         │
│  2015-2016              │
│                         │
│  ─────────────────────  │
│                         │
│  ↓ scroll for more      │  <- Subtle scroll indicator
│                         │
│  ┌─┐ ┌─┐ ┌─┐           │
│  │G│ │L│ │@│           │  <- GitHub, LinkedIn, Email
│  └─┘ └─┘ └─┘           │     (icon row, fixed bottom)
│                         │
└─────────────────────────┘
```

### Desktop (>768px) adds:

```
┌────────────────┬──────────────────────────────┐
│                │                              │
│  YASMEEN       │  ┌────────────────────────┐  │
│  ROUMIE        │  │                        │  │
│                │  │   [Project Visual]      │  │
│  design        │  │                        │  │
│  engineer      │  │   Hover to annotate    │  │
│                │  │                        │  │
│  ──────        │  └────────────────────────┘  │
│                │                              │
│  > Work        │  SNAPCHAT                    │
│    Craft       │  Camera Platform, 2017       │
│    About       │                              │
│                │  Prototyped augmented reality │
│  ──────        │  lenses implementing hand    │
│                │  and body tracking. Created   │
│  GH  LI  @    │  public resources for Lens   │
│                │  Studio developers.           │
│                │                              │
│  ──────        │  ┌──────┐ ┌──────┐ ┌──────┐ │
│                │  │ AR   │ │ ML   │ │ 3D   │ │
│  NYC, NY       │  └──────┘ └──────┘ └──────┘ │
│                │                              │
│  (fixed)       │  (scrolls)                   │
│                │                              │
└────────────────┴──────────────────────────────┘
```

---

## The Micro-Details (What Makes It Feel "Hard to Make")

These are the invisible-until-you-notice-them details that separate a design
engineer's portfolio from a developer's:

### 1. Typography That Breathes
- **Optical sizing:** Headings use a display cut, body uses text cut of the same
  family. Most devs use one font-weight for everything.
- **Fluid type scale:** Font sizes interpolate smoothly between mobile and
  desktop using CSS `clamp()`. No jarring breakpoint jumps.
- **Tabular numbers:** Dates and years use `font-variant-numeric: tabular-nums`
  so they align perfectly in lists.
- **Hanging punctuation:** Quotes and bullet points hang outside the text block
  using `hanging-punctuation: first`. Tiny, correct, rare.

### 2. Scroll-Linked Animations (CSS-only where possible)
- **Progress indicator:** A 1px line at the very top of the viewport fills left
  to right as you scroll. Pure CSS using `animation-timeline: scroll()`.
- **Staggered reveals:** Each project entry fades in with a 50ms delay from its
  sibling using `animation-delay` + intersection observer. Not a library --
  15 lines of vanilla JS.
- **Parallax depth:** Project images move at 0.95x scroll speed (barely
  noticeable, but creates depth). CSS `transform: translateY()` driven by
  scroll position.

### 3. Color That Responds
- **Ambient color bleeding:** When you scroll a project into view, its accent
  color faintly tints the background (2-3% opacity). Like the room changes
  mood for each project.
- **Dark mode that's actually designed:** Not just "invert colors." Custom dark
  palette with reduced contrast (not pure white on black), warmer shadows,
  and slightly different type weights (lighter fonts in dark mode look
  thinner, so bump weight by 1 step).
- **Automatic detection + manual toggle:** Respects `prefers-color-scheme` but
  has a tiny sun/moon toggle. The toggle itself animates -- the sun morphs
  into a moon with a CSS clip-path transition.

### 4. Cursor & Touch Craft
- **Desktop custom cursor:** A small, clean crosshair or dot that replaces the
  default arrow. On links, it expands into a circle. On project images, it
  becomes a magnifying glass or "view" indicator.
- **Magnetic hover:** Links and buttons have a slight "magnetic" pull -- as your
  cursor approaches within 30px, the element shifts 2-3px toward the cursor.
  Subtle. Feels alive.
- **Mobile haptics:** On iOS Safari, use the Vibration API for subtle taps on
  button presses and card expansions. Most mobile sites ignore this. Yours
  won't.
- **Touch-friendly targets:** All interactive elements are minimum 44x44px tap
  targets. Generous padding. No "miss-clicks."

### 5. Loading & Transitions
- **View Transitions API:** Page navigations use the browser's native View
  Transitions for smooth cross-page morphing. Project titles animate from
  list position to detail page header position.
- **Skeleton-free loading:** Instead of skeleton screens, use a simple
  opacity fade-in on content. The layout never shifts (all images have
  explicit dimensions via aspect-ratio).
- **Route prefetching:** On hover/touchstart of a link, prefetch that page.
  By the time they click, it's instant.

### 6. The Sound Layer (Optional, Toggleable)
- A tiny speaker icon in the footer. Clicking it enables ambient interaction
  sounds:
  - Soft click on navigation (like a mechanical switch)
  - Subtle whoosh on page transitions
  - A gentle chime when you find an easter egg
- **Off by default.** This respects the user. But when enabled, it transforms
  the experience.
- Uses the Web Audio API with tiny (<5kb total) synthesized sounds -- no audio
  files to load.

---

## Easter Eggs & Hidden Details

These are the "game" elements. None are required to use the site. All are
delightful to find.

### The Annotation System
- Long-press (mobile) or hold Shift+hover (desktop) on any project to reveal
  a translucent overlay with handwritten-style annotations:
  ```
  ┌──────────────────────────────────┐
  │  [Project Image]                 │
  │         ┌──────────────────┐     │
  │    ●────│ This was the     │     │
  │         │ hardest part --  │     │
  │         │ getting hand     │     │
  │         │ tracking to work │     │
  │         │ under 16ms       │     │
  │         └──────────────────┘     │
  │                                  │
  │              ┌────────────┐      │
  │         ●────│ Built this │      │
  │              │ in 48hrs   │      │
  │              │ at a       │      │
  │              │ hackathon  │      │
  │              └────────────┘      │
  └──────────────────────────────────┘
  ```
- Styled with a handwriting font (Caveat or Patrick Hand) to contrast the
  clean sans-serif of the main site. Feels personal and behind-the-scenes.

### The Grid Reveal
- Press `G` on desktop (or triple-tap the logo on mobile) to flash the
  underlying design grid for 3 seconds: column guides, baseline grid,
  spacing tokens. Then it fades away.
- This is *meta-gamification* -- you're showing the player the game's source
  code. Design nerds will screenshot this.

### The Visitor Map
- Hidden page at `/here` that shows an abstract, anonymized heatmap of where
  visitors have clicked/tapped. No personal data -- just aggregate interaction
  patterns rendered as a beautiful generative art piece.
- Updated in real-time with simple analytics. The art piece IS the analytics
  dashboard.

### The Version History
- Footer contains a tiny, nearly invisible "v3.0" (or whatever version).
  Clicking it slides up a minimal changelog:
  ```
  v3.0  2026  The quiet game
  v2.0  2024  Semantic UI era
  v1.0  2017  The beginning
  ```
- Each version links to a Web Archive snapshot or GitHub tag. Shows evolution.

### The Secret Resume
- Typing "resume" anywhere on the site (no input field needed -- just
  keyboard listener) triggers a smooth transition where the entire page
  reformats into a perfectly typeset, printable resume layout. Press Escape
  to return.
- This is ridiculously practical AND an easter egg. Hiring managers will love
  it.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro** | Zero JS by default, ships only what's needed. Perfect for a content site with islands of interactivity. |
| Styling | **Vanilla CSS** (no Tailwind) | A design engineer should write their own CSS. Custom properties for the design system. |
| Animations | **CSS animations + View Transitions API** | Native > library. GSAP only if needed for complex sequences. |
| Interactions | **Vanilla JS** (<5kb total) | Intersection Observer, scroll timeline, pointer events. No React. |
| Hosting | **GitHub Pages** (keep it) | Simple, free, fast CDN. No reason to change. |
| Analytics | **Fathom or Plausible** | Privacy-respecting, lightweight. Replaces Google Analytics. |

### Performance Budget

```
HTML:       < 15kb per page (gzipped)
CSS:        < 10kb total (gzipped)
JS:         < 8kb total (gzipped)
Fonts:      2 weights max, subset to Latin (< 40kb)
Images:     WebP/AVIF, lazy-loaded, explicit dimensions
LCP:        < 800ms
CLS:        0
FID:        < 50ms
Total:      < 100kb first load
```

This is part of the flex. When someone opens DevTools on your site and sees a
100kb total page weight with zero layout shift, that's a design engineering
statement.

---

## Mobile-First Details

The site isn't "responsive" as an afterthought. Mobile is the primary design.

### Touch Interactions
- **Swipe between projects:** Horizontal swipe on project cards to navigate
  (with snap points via CSS `scroll-snap-type`).
- **Pull-to-reveal:** Pulling down past the top of the page reveals a hidden
  "currently working on..." banner, then snaps back.
- **Long-press annotations:** The annotation system described above is
  designed for touch first.

### Mobile Navigation
- No hamburger menu. Three visible tabs (Work / Craft / About) always
  accessible.
- Tabs are at the **bottom** of the screen (thumb-friendly, like native iOS/
  Android apps). This is unusual for portfolios and immediately signals
  mobile-first thinking.
- Active tab has a subtle dot indicator, not a heavy underline.

### Mobile-Specific Polish
- **Safe area insets:** Proper `env(safe-area-inset-bottom)` for notched
  phones and dynamic island.
- **Overscroll behavior:** `overscroll-behavior: none` on the body prevents
  the rubber-band bounce that makes web apps feel "webby."
- **Touch callout suppression:** `-webkit-touch-callout: none` on interactive
  elements to prevent the context menu from interrupting interactions.
- **Standalone mode:** A `manifest.json` that allows "Add to Home Screen"
  with a custom icon, splash screen, and standalone display mode. Your
  portfolio as a "native app."

### Mobile Performance
- **No web fonts on slow connections:** Detect `Save-Data` header or slow
  `effectiveType` via Network Information API. Fall back to system fonts
  (-apple-system, system-ui) gracefully.
- **Reduced motion:** Respect `prefers-reduced-motion` -- disable all
  animations, parallax, and transitions. This is accessibility AND
  performance.
- **Touch target audit:** Every interactive element tested at 44x44px
  minimum. Generous spacing between tap targets.

---

## Content Reframing

Current descriptions are engineer-speak. Reframe for design engineering:

### Before (Current Site)
> **Snapchat** -- Camera Platform
> Prototyped augmented reality lenses implementing hand and body tracking
> technology using Lens Studio and created public resources and documentation
> for developer use.

### After (Design Engineer Voice)
> **Snapchat** -- Camera Platform, 2017
>
> Designed and prototyped AR experiences that let people interact with lenses
> using their hands and body. Collaborated with computer vision researchers
> to translate ML-based tracking into intuitive, playful mixed-reality
> interactions. Created Lens Studio resources that became public documentation
> for the developer community.
>
> *The challenge: making bleeding-edge computer vision feel effortless.*

The shift: from "what I coded" to "what I designed and why it mattered."

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up Astro project
- Design system: CSS custom properties, typography scale, color tokens
- Mobile-first layout (the grid, navigation, footer)
- Dark mode toggle with `prefers-color-scheme`

### Phase 2: Content & Polish (Week 2)
- Rewrite all project descriptions in design engineer voice
- Add project visuals (screenshots, videos, demos)
- Scroll animations (intersection observer reveals)
- View Transitions for page navigation

### Phase 3: The Game Layer (Week 3)
- Progressive enhancement system (attention tracking)
- Easter eggs (grid reveal, secret resume, annotations)
- Ambient color bleeding on scroll
- Custom cursor (desktop)
- Sound layer (optional)

### Phase 4: Performance & Launch (Week 4)
- Lighthouse audit (target: all 100s)
- Font subsetting, image optimization
- OG image generation
- manifest.json for standalone mode
- Analytics setup

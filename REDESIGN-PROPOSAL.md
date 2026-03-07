# Portfolio Redesign: Rebranding as a Design Engineer

## Current State Analysis

Your current site is a clean, Semantic UI-based portfolio that positions you as a
**"hackathon-obsessed software engineer exploring fun & futuristic ideas."** It's
text-heavy, list-driven, and functionally organized (Work / Projects / About tabs).
The strongest design moment is the gradient hover effect on company names -- that
hint of interactivity is the seed of a design engineering identity.

**What's working:** Minimalist layout, branded company colors, clear hierarchy.
**What's holding you back:** Bitmoji instead of real craft, Semantic UI defaults,
no visual evidence of *design* thinking, project descriptions read like resume
bullets, no interactive or visual artifacts.

---

## The Rebrand: From "Software Engineer" to "Design Engineer"

A design engineer lives at the intersection of aesthetics and implementation --
someone who doesn't just build, but *crafts* experiences. Your background in AR,
3D, and creative tech already supports this. The portfolio needs to **show** it.

**New tagline direction:**
> "I design and build things at the intersection of engineering and experience."

or

> "Design engineer crafting interactive, spatial, and human-centered software."

---

## 5 Redesign Concepts

### Concept 1: "The Living Canvas"
**Vibe:** Generative art meets portfolio. The site itself is the proof of craft.

- **Hero:** A full-viewport generative background (WebGL/Canvas) that responds to
  cursor movement -- subtle particle fields, flowing gradients, or a mesh that
  deforms on hover. Not gratuitous; elegant and restrained.
- **Navigation:** Floating text links that magnetically respond to the cursor
  (like the macOS dock effect, but for text). "Work," "Craft," "About."
- **Project cards:** Each project gets a small interactive canvas thumbnail --
  e.g., the 3DHBGen project shows a slowly rotating body mesh, the AR projects
  show a parallax depth effect on screenshots.
- **Micro-interactions everywhere:** Scroll-triggered reveals, smooth page
  transitions, cursor trail effects that feel intentional.
- **Tech:** Three.js or p5.js for generative elements, GSAP for animations,
  vanilla CSS for layout (no framework).
- **Why it works for you:** Your 3DHBGen project already proves Three.js skill.
  Scaling that craft to the portfolio itself is the ultimate design engineer flex.

---

### Concept 2: "The Case Study Gallery"
**Vibe:** Stripe/Linear-quality product storytelling. Every project is a narrative.

- **Structure:** Single-page scroll with full-bleed project sections. Each project
  gets a "chapter" -- not a bullet point.
- **Hero:** Your name in a custom variable font that morphs weight/width on scroll
  (using CSS `font-variation-settings`). Below it: a single sentence identity
  statement and nothing else. No bitmoji.
- **Project sections:** Each project gets:
  - A bold typographic title
  - A hero image/video showing the *designed artifact* (not a screenshot of code)
  - 2-3 sentences on the *design challenge*, not the tech stack
  - An embedded interactive demo where possible (3DHBGen inline, AR projects as
    video walkthroughs)
  - A "tools" strip at the bottom (subtle, not the star)
- **Color system:** Monochrome base (off-white + charcoal) with ONE accent color
  per project section that bleeds into the background as you scroll into it
  (extending your existing company-color idea).
- **Typography:** Inter or Satoshi for body, a display serif (e.g., Instrument
  Serif, Playfair) for headings. This contrast signals "I care about type."
- **Why it works for you:** Your work at Snapchat (AR lenses), NASA (HoloLens),
  and your hackathon projects are *visual stories* that deserve visual
  presentation. This format lets the work speak.

---

### Concept 3: "The Spatial Portfolio"
**Vibe:** Your AR/3D background manifests as a navigable 3D space.

- **Entry:** The site loads into a subtle 3D environment (Three.js). Not a
  full metaverse -- think Apple Vision Pro marketing site. A clean white space
  with floating cards/objects that have depth and respond to mouse parallax.
- **Navigation:** Projects exist as 3D cards floating in space. Hovering pulls
  them closer (z-axis). Clicking transitions into a flat 2D detail view with
  smooth animation.
- **Mobile fallback:** On mobile, degrades to a beautiful 2D card layout with
  CSS perspective transforms for faux-3D feel.
- **Signature element:** A small 3D model of yourself (stylized, not realistic)
  that idle-animates in the corner -- replacing the bitmoji with something you
  actually *made*.
- **Easter egg:** Pressing a key toggles "wireframe mode" showing the 3D geometry
  underneath, a nod to your engineering side.
- **Why it works for you:** This directly leverages your NASA HoloLens and
  Snapchat AR experience. You're not claiming to be a design engineer -- the
  site *proves* it.

---

### Concept 4: "The Minimalist Atelier"
**Vibe:** Dieter Rams meets developer portfolio. Radical simplicity as a statement.

- **Layout:** Asymmetric two-column grid. Left column is fixed (your name,
  one-liner, contact links in a tight vertical stack). Right column scrolls
  with content.
- **Hero:** No hero image. Just your name set in a single, beautiful typeface
  (e.g., GT Alpina, Neue Montreal) at 72px+. Below it, a rotating subtitle
  that cycles through your identities: "design engineer," "AR prototyper,"
  "creative technologist" -- using a typewriter/morphing text effect.
- **Work presentation:** Timeline-style with vertical line + dots. Each entry
  is hyper-minimal: company name, role, one sentence. Hovering expands inline
  with a smooth height animation to reveal details + a project image.
- **Color:** True black (#000) on true white (#fff). The only color comes from
  project images/videos themselves. This restraint is the design statement.
- **Secret detail:** Custom cursor that changes based on what you're hovering
  (arrow for nav, crosshair for projects, pointer for links). Signals
  attention to detail.
- **Interactions:** Everything uses spring physics (not ease curves) for a
  tactile, app-like feel. Libraries like Framer Motion or anime.js.
- **Why it works for you:** Sometimes the strongest design statement is knowing
  what to remove. This approach says "I'm confident enough in my work that I
  don't need to shout."

---

### Concept 5: "The Engineering Notebook"
**Vibe:** Field Notes meets Notion meets personal wiki. A living document of craft.

- **Aesthetic:** Warm off-white (#faf9f6) background, monospace type for headers
  (JetBrains Mono or Berkeley Mono), proportional type for body (Söhne or
  Inter). Grid lines or dot-grid patterns subtly visible in the background,
  like engineering graph paper.
- **Structure:** Non-traditional. Instead of Work/Projects/About, organize by
  *themes*: "Spatial Computing," "Creative Tools," "Systems & Infrastructure."
  Each theme groups work + projects together, showing how your thinking spans
  company boundaries.
- **Project entries:** Styled like notebook pages with:
  - A hand-drawn-style diagram or sketch (CSS/SVG illustrations)
  - Technical annotations that appear on hover (like margin notes)
  - "Process" toggle that reveals your design thinking, not just outcomes
- **Navigation:** A persistent side index (like a book's table of contents)
  with section numbers. Clicking smooth-scrolls to sections.
- **Signature element:** A "currently exploring" ticker at the top that shows
  what you're learning/building right now. Signals growth mindset.
- **Interactive touches:** Drag-to-highlight text (like a real notebook),
  footnotes that expand inline, code snippets that are live-editable.
- **Why it works for you:** This reframes your diverse experience (NASA, Snap,
  blockchain, AI) as a coherent intellectual journey rather than a job list.
  Design engineers think in systems -- this layout *is* systems thinking.

---

## Recommended Direction

**Concept 2 ("Case Study Gallery") + elements from Concept 4 ("Minimalist Atelier")**

Here's why:

1. **Lowest risk, highest impact.** Case studies are the industry standard for
   design engineering portfolios (see: Rauno Freiberg, Paco Coursey, Emil
   Kowalski). You'd be speaking the right visual language.
2. **Your work already has the stories.** Snapchat AR lenses, NASA HoloLens
   experiences, a 3D body generator -- these are inherently visual and
   interactive. They just need to be *presented* as design work.
3. **The minimalist structure keeps it buildable.** You don't need a full 3D
   scene or generative art (though you could add those as progressive
   enhancements later).
4. **Borrowing Concept 4's fixed sidebar + spring animations** adds
   sophistication without complexity.

## Key Changes to Make Regardless of Concept

| Current | Redesigned |
|---|---|
| "Hackathon-obsessed software engineer" | "Design engineer" / "Creative technologist" |
| Bitmoji avatar | Professional headshot or custom 3D avatar |
| Semantic UI framework | Custom CSS (or Tailwind) -- own your design |
| Company list with bullet descriptions | Visual case studies with images/video |
| Tech labels ("Machine Learning," "AR") | Integrated into narrative, not tags |
| Static hover gradients | Purposeful micro-interactions |
| jQuery | Vanilla JS or lightweight framework (Astro, SvelteKit) |
| Generic OG image (Pinterest stock photo) | Custom OG image with your branding |

## Typography Recommendations

| Use Case | Font | Why |
|---|---|---|
| Display/Headings | Instrument Serif or Playfair Display | Adds warmth + editorial quality |
| Body | Inter, Satoshi, or Geist | Clean, modern, highly legible |
| Mono (code/accents) | JetBrains Mono or Geist Mono | For technical credibility |

## Color System

```
--bg:        #fafafa     (warm white)
--text:      #171717     (near-black)
--muted:     #737373     (secondary text)
--accent:    #bae1ff     (keep your existing blue -- continuity)
--border:    #e5e5e5     (subtle dividers)
```

Plus your existing per-company accent colors for project sections.

## Interaction Design Principles

1. **Every animation should have a purpose.** Hover states communicate
   interactivity. Scroll animations guide attention. Nothing moves just to move.
2. **Spring physics > ease curves.** Use spring-based animations (e.g.,
   `transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`) for a
   tactile, modern feel.
3. **Progressive disclosure.** Show less upfront, reveal on interaction. This
   respects the viewer's attention and rewards curiosity.
4. **Performance is design.** A design engineer's portfolio must be fast. Target
   < 1s LCP, zero layout shift. This is part of the craft.

## Next Steps

1. Choose a concept direction (or hybrid)
2. Create a simple design mockup / wireframe
3. Set up a modern build tool (Astro recommended -- it's built for content sites,
   outputs minimal JS, and supports partial hydration for interactive components)
4. Build the layout and typography system first (this is 80% of the design)
5. Add project content as case studies with real visuals
6. Layer in interactions and micro-animations last

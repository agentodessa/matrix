# Design System Specification: The Executive Presence

## 1. Overview & Creative North Star

**Creative North Star: "The Architectural Dossier"**
This design system moves away from the "app-like" clutter of standard productivity tools toward a high-end, editorial experience. It is designed to feel like a bespoke physical workspace—think leather-bound planners, frosted glass partitions, and precision-milled instruments.

We break the "template" look by rejecting the rigid 1px grid. Instead, we use **Intentional Asymmetry** and **Tonal Depth**. Large headers are often offset, and information density is managed through expansive breathing room rather than containment lines. This is a system built for focus, power, and clarity.

## 2. Color & Surface Philosophy

The palette is rooted in a deep charcoal base, punctuated by "Executive Red" (#ac0b18) for high-stakes urgency and a sophisticated secondary blue for structural organization.

### The "No-Line" Rule

**Borders are prohibited for sectioning.** To define boundaries, you must use background color shifts.

- A `surface-container-low` section sitting on a `surface` background creates a natural, sophisticated break.
- Use `surface-container-highest` only for the most critical interactive elements to provide a "lift" without a shadow.

### Surface Hierarchy & Nesting

Treat the UI as a series of stacked materials.

- **Base:** `surface` (#131313) - The desk surface.
- **Secondary Area:** `surface-container-low` (#1c1b1b) - Subtle grouping.
- **Active Elements:** `surface-container-high` (#2a2a2a) - The "Paper" layer.
- **Floating Elements:** `surface-bright` (#393939) - High-focus modals or popovers.

### The "Glass & Gradient" Rule

To achieve the "Executive" aesthetic, primary CTAs and header backgrounds should utilize **Signature Textures**.

- **Urgency/Action:** Gradient from `primary_container` (#ac0b18) to `primary` (#ffb3ac) at a 135-degree angle.
- **Floating Modals:** Use a 60% opacity of `surface_container` with a `backdrop-filter: blur(20px)`. This creates a frosted glass effect that allows the underlying colors to bleed through, ensuring the UI feels integrated, not "pasted on."

## 3. Typography: The Manrope Scale

We use **Manrope** exclusively. Its geometric yet humane construction provides the "Modern Professional" tone required.

- **Display (Display-LG/MD):** Used for "Big Picture" metrics. Extra-Bold (800) weight with -0.02em letter spacing. High contrast against the background is mandatory.
- **Headlines (Headline-LG/MD):** Used for page titles. Medium (500) weight. These should feel like a newspaper masthead—authoritative and steady.
- **The Narrative (Body-LG):** 1rem. Regular (400) weight. Use a slightly taller line-height (1.6) to ensure the executive doesn't feel rushed while reading.
- **The Technical (Label-MD/SM):** Semi-Bold (600) and Uppercase for metadata. This provides a "technical" contrast to the fluid body text.

## 4. Elevation & Depth

In this system, depth is a function of light and shadow, not lines.

### The Layering Principle

Depth is achieved by "stacking" the `surface-container` tiers. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural "recessed" look.

### Ambient Shadows

Shadows must be invisible until noticed.

- **Value:** `0px 24px 48px rgba(0, 0, 0, 0.4)` for floating cards.
- **Tinting:** Never use pure black shadows. Tint the shadow with a 4% opacity of the `on-surface` color to mimic natural ambient light.

### The "Ghost Border" Fallback

If a border is required for accessibility (e.g., in high-contrast mode), use a **Ghost Border**: `outline-variant` at **15% opacity**. Standard 100% opaque borders are strictly forbidden as they "cheapen" the editorial feel.

## 5. Components

### Buttons: The "Power" Action

- **Primary:** A vibrant `primary_container` (#ac0b18) base with `on_primary_container` text. Apply a subtle inner-glow (1px white at 10% opacity) on the top edge to simulate a physical edge.
- **Secondary:** Glassmorphic. Semi-transparent `surface_variant` with a backdrop blur.
- **Corner Radius:** Use the `md` (0.375rem) scale for a sharp, professional look.

### Input Fields: The "Underline" Aesthetic

Avoid the "box" input. Use a `surface-container-highest` background with a 2px bottom-only border in `primary` that animates from the center outward when focused.

### Cards & Lists: The "Whitespace Partition"

- **Strict Rule:** No divider lines between list items.
- **Implementation:** Use `8` (2rem) from the Spacing Scale between items. Use `surface-container-low` for the hovered state to define the row.

### The "Executive Timeline" (Special Component)

A custom vertical progress indicator using the `secondary` (cool blue) scale. Use `secondary_container` for the track and a glowing `secondary` pulse for the "Current Time" indicator to contrast against the red urgency of tasks.

## 6. Do’s and Don’ts

### Do:

- **Do** use `24` (6rem) spacing for top-level section margins to create an elite, spacious feel.
- **Do** use dynamic gradients for data visualization—Deep Red to Scarlet for "Overdue," Cool Blue for "Planned."
- **Do** leverage `Manrope` Extra-Bold for numbers; let the data be the hero.

### Don’t:

- **Don’t** use a 1px solid border to separate a sidebar from the main content. Use a shift from `surface-container-lowest` to `surface`.
- **Don’t** use standard "Drop Shadows" with high opacity. If it looks like a shadow, it’s too dark.
- **Don’t** use pure white (#FFFFFF) in Dark Mode. Always use `on-surface` (#e5e2e1) to reduce eye strain and maintain the "Slate" aesthetic.

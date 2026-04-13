---
name: animation-systems
description: High-end animation guidelines inspired by Stripe, Linear, Apple, and Vercel. Focuses on tasteful motion, choreography, performance, and accessibility.
---

# Animation Systems (Stripe × Linear × Apple × Vercel)

This skill helps you ship tasteful, product-grade motion. Not “more animation.” Better animation: clarity, hierarchy, feedback, and delight—without jank.

## 1. The Goals (Why Motion Exists)
Use animation to:
*   **Explain hierarchy:** What matters most.
*   **Confirm action:** Visual feedback.
*   **Guide attention:** Where to look next.
*   **Maintain continuity:** Spatial relationships.
*   **Add polish:** Craft signals.
> *Rule:* If an animation doesn’t serve one of these, delete it.

---

## 2. The Premium Style (Shared Traits)
1.  **Restraint:** Fewer animations, better chosen. One strong hero moment; the rest is supporting motion.
2.  **Clear Choreography:** Primary element moves first. Secondary elements follow with a small stagger. Motion establishes a “reading order.”
3.  **Physical but not cartoony:** Use easing that feels human (soft acceleration + gentle settle). Avoid bouncy defaults for serious product UI.
4.  **Texture + Depth (Subtle):** Small parallax, soft shadows, blur fades, light beams. Avoid heavy 3D unless it’s the hero.

---

## 3. Motion Primitives (Core Patterns)
Think in primitives you can reuse everywhere (CSS or GSAP).

*   **A) Fade + Rise (Default Entrance)**
    *   *Use for:* Text blocks, cards, modals.
    *   *Motion:* Opacity `0 → 1`, Y `12–24px → 0`
    *   *Duration:* 300–700ms depending on size.
*   **B) Scale + Fade (Micro Emphasis)**
    *   *Use for:* Popovers, toasts, selected states, hover buttons.
    *   *Motion:* Scale `0.98 → 1`, Opacity `0 → 1`
*   **C) Slide (Navigation)**
    *   *Use for:* Drawers, step transitions.
    *   *Motion:* Use `transform: translate`. Avoid animating layout (`width`/`height`/`margin`).

---

## 4. Default Tokens (Practical Numbers)

### Durations (Rule of Thumb)
| Interaction | Duration |
| :--- | :--- |
| **Micro (hover/press)** | 120–200ms |
| **UI state change (toggle, select)** | 180–260ms |
| **Small transitions (popover, toast)** | 220–320ms |
| **Page section entrance (scroll)** | 400–800ms |
| **Hero sequences** | 800–1600ms (with internal beats) |

### Easing (GSAP Equivalents)
Pick a small set and reuse:
*   **UI/Hover:** ease-out with gentle settle (`power2.out` or `power3.out`).
*   **Emphasis:** slightly stronger ease (`expo.out`).
*   **Entering:** ease-out.
*   **Exiting:** ease-in (faster, e.g., `power2.in`).
*   *Avoid elastic/bounce unless the brand is highly playful.*

### Stagger
*   **40–90ms** per element (text lines/cards).
*   Use smaller stagger on mobile devices.

---

## 5. Choreography Patterns

1.  **“Hero → Supporting Elements”:** Hero visual animates in first. Headline appears next. CTA appears last.
2.  **“Section Reveal on Scroll”:** Trigger when the section is ~20–30% visible. Animate once (don’t replay on tiny scroll up/down).
3.  **“Hover: Lift + Glow”:** `Y: -2 to -6px`, Shadow: subtle increase, Optional: border/gradient glow.
4.  **“Focus Ring + Micro Shift”:** For form fields: focus ring + tiny scale/translate for responsiveness.

---

## 6. Performance Rules (Non-negotiable)

**Animate the right properties:**
*   ✅ *Prefer:* `transform` (translate/scale/rotate), `opacity`.
*   ❌ *Avoid:* `width`, `height`, `top`, `left`, expensive filters on large areas.

**Respect the GPU:**
*   Keep blurs subtle and small.
*   Avoid many simultaneous animated box-shadows.

**Reduce Reflows:**
*   Don’t measure layout (`offsetWidth`, `getBoundingClientRect`) every frame.
*   For scroll effects, rely on GSAP ScrollTrigger which batches reads/writes.

---

## 7. Accessibility: Reduced Motion
Always support `prefers-reduced-motion`.

*   **Policy:** Keep content visible. Replace motion with instant state + subtle opacity transitions.
*   **Action:** Disable scroll-scrub/pin animations for these users.

```css
/* CSS Implementation */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```
```javascript
// GSAP Implementation
let prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
  // Disable complex scroll triggers or convert them to simple fades
});
```

---

## Output Format (For Prompts)
When requesting animation implementation:
*"Apply Stripe-style animations to the Hero section in `index.html`. Use a stagger of `0.06s` with `power3.out` easing, animating only `y` and `opacity`. Hero image should appear first, followed by the text and CTAs."*
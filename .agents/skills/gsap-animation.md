---
name: gsap-animation
description: Web animation skill using GSAP (GreenSock) for high-quality UI motion, timeline-based sequences, and scroll-driven storytelling via ScrollTrigger.
---

# GSAP (GreenSock) — Web Animation Skill

## When to use
*   **High-quality UI/motion design:** entrances, micro-interactions, page transitions.
*   **Timeline-based sequences:** (vs. scattered CSS transitions).
*   **Scroll-driven storytelling:** (with ScrollTrigger).
*   **Complex orchestration:** easing, staggering, and orchestrating across many elements.

---

## Key concepts & APIs

### Tweens:
```javascript
gsap.to(targets, vars)
gsap.from(targets, vars)
gsap.fromTo(targets, fromVars, toVars)
```

### Timelines:
```javascript
const tl = gsap.timeline({ defaults, repeat, yoyo, paused })
// Chain: 
tl.to(...).from(...).addLabel('x').add(() => ...)
```

### Position Parameter (Crucial for Timelines):
*   `absolute 1.2` (at exactly 1.2 seconds)
*   `relative "+=0.5"` (0.5 seconds after previous tween ends)
*   `overlap "-=0.3"` (0.3 seconds before previous tween ends)
*   `label "intro"` (at a specific label)

### Eases & Staggers:
*   **Eases:** `ease: "power2.out"`, `"expo.inOut"`, `"elastic.out(1, 0.3)"`
*   **Staggers:** `stagger: 0.05` or `{ each, from: "start|center|end|random", grid }`

### Performance-friendly properties:
*Prefer* `transforms` (x, y, scale, rotation) and `opacity` (autoAlpha). *Never* animate `top/left/width/height`.

### ScrollTrigger (Plugin):
```javascript
gsap.registerPlugin(ScrollTrigger)

// Inline: 
gsap.to(".box", { scrollTrigger: ".box", x: 500 })

// Advanced: 
scrollTrigger: { trigger, start, end, scrub, pin, snap, markers }

// Standalone: 
ScrollTrigger.create({ trigger, start, end, onUpdate, onToggle })
```

---

## Common Pitfalls (And Fixes) ⚠️

1.  **Animating layout properties (top/left/width/height) → jank:**
    *Fix:* Use transforms (`x`, `y`, `scale`), add `will-change: transform` in CSS, avoid forced reflow.
2.  **ScrollTrigger "not firing" due to wrong trigger sizing/overflow containers:**
    *Fix:* Ensure trigger exists, has explicit height, and check the scroll container (nested scrolling needs specific config).
3.  **Not cleaning up in SPA/React:**
    *Fix:* Use `gsap.context()` and `revert()` on unmount; kill triggers (`ScrollTrigger.getAll().forEach(t => t.kill())`) if needed. *(Not applicable for Vanilla HTML unless page transitions are used).*
4.  **FOUC / measuring before fonts/images load:**
    *Fix:* Initialize after layout is stable; run `ScrollTrigger.refresh()` after all images load.

---

## Quick Recipes

### 1) Hero entrance (Stagger)
```javascript
gsap.from(".hero [data-anim]", {
  y: 24,
  autoAlpha: 0,
  duration: 0.8,
  ease: "power2.out",
  stagger: 0.06,
});
```

### 2) Sequenced timeline
```javascript
const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });
tl.from(".nav", { y: -20, autoAlpha: 0 })
  .from(".hero-title", { y: 30, autoAlpha: 0 }, "-=0.2")
  .from(".hero-cta", { scale: 0.95, autoAlpha: 0 }, "-=0.2");
```

### 3) Scroll-scrub pinned section
```javascript
gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: ".story",
    start: "top top",
    end: "+=800",
    scrub: 1,
    pin: true,
  },
}).to(".story .panel", { xPercent: -200 });
```

---

## Project Context Note
*This project relies heavily on Vanilla JS and GSAP. Always ensure `ScrollTrigger.refresh()` is called if DOM changes dynamically (e.g., Tab switching or language changing).*
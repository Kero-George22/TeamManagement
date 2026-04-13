---
name: cobe-js-globe
description: Lightweight WebGL globe library for decorative and interactive 3D globes with markers. Perfect for hero sections and about pages.
---

# cobe.js — Lightweight WebGL Globe Skill

## When to use
*   A "spinning globe" / location markers in hero or about pages.
*   You want a small, focused globe library (not full `three.js`).
*   Decorative + interactive (markers, rotation) with minimal setup.

---

## Key APIs & Patterns

**Core:**
```javascript
import createGlobe from "cobe"
const globe = createGlobe(canvas, { ...options, onRender(state) { ... } })
```

**Important options (common):**
*   `devicePixelRatio`, `width`, `height`
*   `phi`, `theta` (rotation angles)
*   `scale`, `dark`, `diffuse`
*   `baseColor`, `markerColor`, `glowColor`
*   `markers`: `[{ location: [lat, lon], size, color? }]`

**Lifecycle:**
*   `globe.toggle()` pauses RAF (Request Animation Frame).
*   `globe.destroy()` removes instance (Crucial for unmounting/resizing).

---

## Common Pitfalls & Fixes ⚠️

1.  **Canvas sizing mismatch:** Set CSS size AND set canvas `width`/`height` scaled for Device Pixel Ratio (DPR).
2.  **Not updating on resize:** Recompute width/height and recreate or update parameters.
3.  **Too high DPR on mobile:** Clamp DPR to 1–2 to prevent performance lag (`Math.min(window.devicePixelRatio, 2)`).

---

## Quick Recipe: Responsive Globe with Markers

```javascript
import createGlobe from "cobe";

const canvas = document.getElementById("cobe");
let phi = 0;

function setup() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: canvas.width,
    height: canvas.height,
    phi: 0,
    theta: 0.2,
    dark: 0,
    diffuse: 1.2,
    scale: 1,
    mapSamples: 16000,
    mapBrightness: 6,
    baseColor: [0.2, 0.2, 0.25],
    glowColor:,
    markerColor: [0.8, 0.5, 1],
    markers: [{ location: [1.3521, 103.8198], size: 0.08 }],
    onRender: (state) => {
      state.phi = phi;
      phi += 0.01;
    },
  });

  return globe;
}

let globe = setup();
window.addEventListener("resize", () => {
  globe.destroy();
  globe = setup();
});
```

---

## What to ask the user
1.  Globe size and placement (hero, section, card)?
2.  Marker locations + colors (brand-aligned)?
3.  Interaction needs (drag to rotate vs. ambient spin)?
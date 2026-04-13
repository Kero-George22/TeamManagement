---
name: vanta-js-backgrounds
description: Create quick, decorative animated WebGL backgrounds for hero sections using Vanta.js and Three.js.
---

# Vanta.js — Animated WebGL Backgrounds

## When to use
*   **Decorative animated backgrounds** behind hero sections.
*   You want a **"wow" factor quickly** without building a full Three.js scene.
*   Lightweight integration into static sites (HTML/CSS/JS) or frameworks.

> **⚠️ Project Context Note:** Vanta.js is great for a specific section (like the Hero of the Custom/Enterprise page), but avoid using it on every page to prevent high GPU usage, especially on mobile devices.

---

## How it works
Vanta injects a `<canvas>` into a container element and renders a WebGL effect (most use `three.js` under the hood).
*Typical usage:* Include `three.min.js` + one Vanta effect bundle (e.g., `vanta.waves.min.js`).

---

## Key APIs & Patterns

**1. Initialization:**
```javascript
const effect = VANTA.WAVES({ 
  el: "#hero", 
  color: 0x0b1220, 
  shininess: 40 
});
```

**2. Update after init:**
```javascript
effect.setOptions({ color: 0xff88cc });
```

**3. Resize:**
```javascript
effect.resize(); // Call if the container size changes dynamically
```

**4. Cleanup (Important for SPAs):**
```javascript
effect.destroy(); 
```

---

## Common Pitfalls & Fixes ⚠️

1.  **Container has no size → nothing visible:**
    Ensure the target element (`#hero`) has explicit `width` and `height` (e.g., `min-height: 100vh;`) or is properly laid out by CSS.
2.  **Multiple WebGL canvases on one page → High GPU load:**
    Keep it to **1 effect per page maximum**.
3.  **Mobile/Older GPU issues:**
    Always provide a fallback CSS background color or image (`background-color: #0b1220;`). Consider disabling the effect entirely on small screens (`window.innerWidth < 768`).

---

## Quick Recipes

### 1) Minimal Waves Background (Vanilla HTML)
```html
<!-- The Container MUST have a height -->
<div id="hero-background" style="min-height: 100vh; background-color: #0b1220;">
  <h1 style="position: relative; z-index: 10; color: white;">Welcome to the Future</h1>
</div>

<!-- Scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vanta/dist/vanta.waves.min.js"></script>
<script>
  const effect = VANTA.WAVES({ el: "#hero-background", color: 0x0b1220, shininess: 40, waveHeight: 16, zoom: 0.9 });
</script>
```
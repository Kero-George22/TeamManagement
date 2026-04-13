---
name: progressive-blur
description: Create smooth, hardware-accelerated progressive gradient blurs using CSS backdrop-filter and masks. Perfect for modern sticky navbars and sticky footers.
---

# Progressive Blur Skill

## Workflow
1. Confirm placement (top or bottom), height, and z-index relative to UI.
2. Provide the matching snippet and a short usage checklist.
3. Offer only targeted tweaks (height, blur steps, direction, opacity stops).

## Usage Checklist
- [ ] Insert the HTML inside `<body>`.
- [ ] Keep the `.gradient-blur` element near the top of the DOM.
- [ ] Ensure the background behind it exists (`backdrop-filter` blurs what is behind).
- [ ] Adjust `z-index` to sit above content but below modals.
- [ ] Ensure `pointer-events: none;` is present so it doesn't block clicks.

---

## Top Blur (From Top)

**HTML:**
```html
<div class="gradient-blur">
  <div></div><div></div><div></div><div></div><div></div><div></div>
</div>
```

**CSS:**
```css
.gradient-blur {
  position: fixed;
  z-index: 5;
  inset: 0 0 auto 0;
  height: 12%;
  pointer-events: none;
}

.gradient-blur > div,
.gradient-blur::before,
.gradient-blur::after {
  position: absolute;
  inset: 0;
}

.gradient-blur::before {
  content: "";
  z-index: 1;
  backdrop-filter: blur(0.5px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%);
}
.gradient-blur > div:nth-of-type(1) {
  z-index: 2;
  backdrop-filter: blur(1px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 0) 50%);
}
.gradient-blur > div:nth-of-type(2) {
  z-index: 3;
  backdrop-filter: blur(2px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 62.5%);
}
.gradient-blur > div:nth-of-type(3) {
  z-index: 4;
  backdrop-filter: blur(4px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 0) 75%);
}
.gradient-blur > div:nth-of-type(4) {
  z-index: 5;
  backdrop-filter: blur(8px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 87.5%);
}
.gradient-blur > div:nth-of-type(5) {
  z-index: 6;
  backdrop-filter: blur(16px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%);
}
.gradient-blur > div:nth-of-type(6) {
  z-index: 7;
  backdrop-filter: blur(32px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 1) 100%);
}
.gradient-blur::after {
  content: "";
  z-index: 8;
  backdrop-filter: blur(64px);
  mask: linear-gradient(to top, rgba(0, 0, 0, 0) 87.5%, rgba(0, 0, 0, 1) 100%);
}
```

---

## Bottom Blur (From Bottom)

**HTML:**
```html
<div class="gradient-blur">
  <div></div><div></div><div></div><div></div><div></div><div></div>
</div>
```

**CSS:**
```css
.gradient-blur {
  position: fixed;
  z-index: 5;
  inset: auto 0 0 0;
  height: 65%; /* Adjust based on needs */
  pointer-events: none;
}

/* Reuse the exact same layer definitions as the Top Blur, just change the mask direction to 'to bottom' */
/* Example for first layer: */
.gradient-blur::before {
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%);
}
/* Ensure all masks use 'to bottom' */
```

---

## Customization Knobs
*   **Direction:** flip `to top` ↔ `to bottom`.
*   **Height:** adjust `.gradient-blur` height percentage (e.g., `12%` or `150px`).
*   **Strength:** change blur values (`0.5px` → `64px`).
*   **Steps:** add/remove layers to control smoothness.

## Common Pitfalls
- ⚠️ `backdrop-filter` needs content behind it; it will not blur a flat solid background color.
- ⚠️ High blur values are GPU-heavy; consider reducing steps on low-end devices.
- ⚠️ Ensure `pointer-events: none` stays to avoid blocking clicks underneath the gradient.

## Questions to ask when specs are missing
1. Should the blur start from the top or bottom?
2. How tall should the blur area be?
3. Is performance a concern on lower-end devices?
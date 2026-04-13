---
name: css-border-gradient
description: Create premium, hardware-accelerated gradient borders using CSS masks and pseudo-elements. Avoids double-borders and layout shifts.
---

# CSS Border Gradient Skill

## Workflow
1. Confirm environment (plain CSS vs Tailwind) and gather missing specs (border radius, thickness, angle, colors).
2. Provide the baseline snippet and a short usage checklist.
3. Offer focused tweaks only (change angle, colors, thickness, radius) and avoid redesigning the component.

## Baseline Snippet
```css
.border-gradient {
  position: relative;
}

.border-gradient::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 10px; /* Match parent's border-radius */
  padding: 1px; /* Border thickness */
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  background: linear-gradient(225deg,
    rgba(255, 255, 255, 0.0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.0) 100%);
  pointer-events: none;
}
```

## Usage Checklist
- [ ] Insert the snippet in global CSS (`style.css`) or the page `<head>`.
- [ ] Add `border-gradient` class to the element.
- [ ] **Remove any existing border styles** on the parent element.
- [ ] Match the element radius to the pseudo-element radius.

## Tailwind Example
```html
<div class="border-gradient rounded-lg before:rounded-lg">
  ...
</div>
```
*If a project uses Tailwind layers, wrap the class in `@layer utilities`.*

## Customization Knobs
*   **Thickness:** change `padding` (for example `2px`).
*   **Radius:** change `border-radius` or the `before:rounded-*` class.
*   **Angle:** change the `linear-gradient(225deg, ...)` angle.
*   **Colors:** adjust the `rgba(...)` stops to fit the theme (e.g., using `--accent-primary`).

## Common Pitfalls
- ⚠️ **Mismatched radius:** Between the element and pseudo-element.
- ⚠️ **Double border:** Leaving an existing border on the parent element.
- ⚠️ **Tailwind purge:** Removing the class because it is not referenced in content files.
- ⚠️ **Z-index issues:** If the parent has `overflow: hidden`, ensure the pseudo-element is not inadvertently clipped or hiding content.

## Questions to ask when specs are missing
1. What border radius and thickness do you want?
2. What gradient angle and colors should it use?
3. Is this for light, dark, or both themes?
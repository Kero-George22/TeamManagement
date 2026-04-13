---
name: css-alpha-masking
description: Apply CSS alpha masks to create smooth fade-out effects on edges of containers, images, or scrolling marquees.
---

# CSS Alpha Masking Skill

## Workflow
1. Confirm direction (horizontal or vertical) and fade stop percentages.
2. Provide the inline CSS snippet and any needed class usage.
3. Offer small tweaks only (direction, stop positions, colors).

## Usage Checklist
- [ ] Apply the mask styles directly on the element or in a CSS class.
- [ ] Always include both `mask-image` and `-webkit-mask-image` for Safari.
- [ ] Ensure the element has visible content; masks reveal/hide alpha only.

## Code Snippets

### Horizontal (Left/Right) Fade
```css
/* Add this inline CSS or to a class */
mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
-webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
```

### Vertical (Top/Bottom) Fade
```css
/* Add this inline CSS or to a class */
mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
-webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
```

## Customization Knobs
*   **Direction:** `to right`, `to left`, `to bottom`, `to top`.
*   **Fade depth:** adjust `15%` and `85%` stops to control how wide the fade is.
*   **Strength:** change `transparent` to `rgba(0,0,0,0.2)` for softer, semi-transparent fades.

## Common Pitfalls
- ⚠️ Forgetting the `-webkit-mask-image` fallback for Safari support.
- ⚠️ Expecting masks to work on elements with `overflow: hidden` but no visible content inside.

## Questions to ask when specs are missing
1. Which direction should the fade go?
2. How wide should the fade edges be?
3. Is this for images, text, or a container background?
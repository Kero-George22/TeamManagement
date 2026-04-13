---
name: web-interface-guidelines
description: A comprehensive collection of UI/UX and Frontend development skills, covering accessibility, forms, performance, typography, and future React/Next.js best practices.
---

# Web Interface Guidelines (Skills Collection)

This document is a collection of essential frontend skills. It is divided into skills you can apply **immediately** to your Vanilla JS/CSS projects, and skills reserved for **future** framework-based projects.

---

## 🟢 SECTION 1: ACTIVE SKILLS (Apply Now)
*These skills are highly relevant to your current Vanilla HTML/CSS/JS projects.*

### Skill 1.1: Accessibility (a11y) & Semantic HTML
*   **Icon-only buttons:** Must have `aria-label`.
*   **Form controls:** Must have `<label>` or `aria-label`.
*   **Interactive elements:** Need keyboard handlers (`onKeyDown`/`onKeyUp`).
*   **Semantics first:** Use `<button>` for actions, `<a>` for navigation. *Never* use `<div onClick>`.
*   **Images:** Must have `alt` (or `alt=""` if purely decorative).
*   **Decorative icons:** Need `aria-hidden="true"`.
*   **Async updates:** (Toasts, validation) need `aria-live="polite"`.
*   **Headings:** Strictly hierarchical `<h1>`–`<h6>`; include a skip link for main content.
*   **Anchor scrolling:** Use `scroll-margin-top` on heading anchors.

### Skill 1.2: Focus & Interactive States
*   **Visible focus:** Interactive elements need visible focus (e.g., `focus-visible:ring-*`).
*   **No outline hiding:** Never use `outline: none` without providing a focus replacement.
*   **`:focus-visible`:** Use `:focus-visible` over `:focus` to avoid showing focus rings on mouse click.
*   **Compound controls:** Group focus with `:focus-within`.
*   **Hover states:** Buttons/links must have a hover state for visual feedback.
*   **State contrast:** Interactive states (hover/active/focus) must be more prominent than the rest.

### Skill 1.3: Forms & Input UX
*   **Autocomplete:** Inputs need `autocomplete` and a meaningful `name`.
*   **Input types:** Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`.
*   **Paste safety:** *Never* block paste (do not use `onPaste` with `preventDefault`).
*   **Clickable labels:** Use `for` (or `htmlFor`) or wrap the control inside the label.
*   **Spellcheck:** Disable spellcheck on emails, codes, usernames (`spellcheck="false"`).
*   **Checkboxes/Radios:** Label + control must share a single hit target (no dead zones).
*   **Submit buttons:** Stay enabled until the request starts; show a spinner during the request.
*   **Inline errors:** Show errors inline next to fields; focus the first error on submit.
*   **Placeholders:** End with `…` and show an example pattern.
*   **Non-auth autocomplete:** Use `autocomplete="off"` on non-auth fields to avoid password manager triggers.
*   **Unsaved changes:** Warn before navigation with unsaved changes (`beforeunload`).

### Skill 1.4: Animation & Motion
*   **Reduced motion:** Honor `prefers-reduced-motion` (provide reduced variant or disable).
*   **Performance:** Animate `transform` and `opacity` only (compositor-friendly).
*   **No global transitions:** *Never* use `transition: all` — list properties explicitly.
*   **Transform origins:** Set correct `transform-origin`.
*   **SVG Transforms:** Apply transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`.
*   **Interruptible:** Animations must respond to user input mid-animation.

### Skill 1.5: Typography & Content Handling
*   **Ellipsis:** Use proper ellipsis `…` not three dots `...`.
*   **Quotes:** Use curly quotes `""` not straight `""`.
*   **Non-breaking spaces:** Use `&nbsp;` for units (e.g., `10&nbsp;MB`, `⌘&nbsp;K`).
*   **Loading states:** End with `…` (e.g., "Loading…").
*   **Numbers:** Use `font-variant-numeric: tabular-nums` for number columns/comparisons.
*   **Headings wrap:** Use `text-wrap: balance` or `text-pretty` on headings (prevents widows).
*   **Text truncation:** Containers must handle long content: truncate, `line-clamp-*`, or `break-words`.
*   **Flex limits:** Flex children need `min-w-0` to allow text truncation.
*   **Empty states:** Handle them gracefully—don't render broken UI for empty strings/arrays.

### Skill 1.6: Touch, Layout & Theming
*   **Touch action:** Use `touch-action: manipulation` (prevents double-tap zoom delay).
*   **Tap highlight:** Set `-webkit-tap-highlight-color` intentionally (or transparent).
*   **Overscroll:** Use `overscroll-behavior: contain` in modals/drawers/sheets.
*   **Drag states:** During drag, disable text selection; apply `inert` on dragged elements.
*   **Auto-focus:** Use sparingly—desktop only, single primary input; avoid on mobile.
*   **Safe Areas:** Full-bleed layouts need `env(safe-area-inset-*)` for mobile notches.
*   **Scrollbars:** Avoid unwanted scrollbars: use `overflow-x: hidden` on containers.
*   **Layout:** Prefer Flex/Grid over JS measurements for layout.
*   **Dark Mode:** Use `color-scheme: dark` on `<html>` for dark themes (fixes scrollbar, inputs).
*   **Theme color:** `<meta name="theme-color">` should match the page background.

### Skill 1.7: Performance Basics
*   **Image dimensions:** `<img>` needs explicit `width` and `height` (prevents CLS).
*   **Lazy loading:** Below-fold images need `loading="lazy"`.
*   **Priority loading:** Above-fold critical images need `fetchpriority="high"`.
*   **Preconnections:** Add `<link rel="preconnect">` for CDN/asset domains.
*   **Fonts:** Critical fonts need `<link rel="preload" as="font">` with `font-display: swap`.
*   **DOM Batching:** Batch DOM reads/writes; avoid interleaving.
*   **Layout reads:** No layout reads in render/scroll loops (`getBoundingClientRect`, `offsetHeight`, `scrollTop`).

### Skill 1.8: Copy & Content Strategy
*   **Active voice:** "Install the CLI" not "The CLI will be installed".
*   **Title Case:** Use for headings/buttons (Chicago style) - applicable to EN.
*   **Numerals:** For counts: "8 deployments" not "eight".
*   **Specific labels:** "Save API Key" not "Continue".
*   **Error messages:** Include fix/next step, not just the problem.
*   **Perspective:** Second person ("You"); avoid first person ("I").
*   **Ampersand:** Use `&` over "and" where space-constrained.

---

## 🔵 SECTION 2: FUTURE SKILLS (React, Next.js, Frameworks)
> **⚠️ NOTE (ملاحظة هامة):**
> هذه المهارات مخصصة للمستقبل فقط (Future Use). لا تقم بتطبيقها الآن في مشروعك الحالي المبني على (Vanilla HTML/CSS/JS). ستحتاج هذه القواعد عندما تبدأ في بناء مشاريع باستخدام إطارات عمل مثل React أو Next.js.

### Skill 2.1: Hydration Safety
*   **Inputs:** Inputs with `value` need `onChange` (or use `defaultValue` for uncontrolled).
*   **Dates:** Date/time rendering must be guarded against hydration mismatch (server vs client).
*   **Suppression:** Use `suppressHydrationWarning` only where truly needed (e.g., dynamic timestamps).

### Skill 2.2: Advanced State & Navigation
*   **URL State:** URL reflects state—filters, tabs, pagination, expanded panels should live in query params.
*   **Framework Links:** Use framework specific components `<Link>` for navigation, ensuring Cmd/Ctrl+click support.
*   **Deep-linking:** Deep-link all stateful UI (if using `useState`, consider URL sync via `nuqs` or similar).
*   **Destructive actions:** Need confirmation modal or undo window—never immediate.

### Skill 2.3: Advanced React Performance
*   **Virtualization:** Large lists (>50 items) must be virtualized (e.g., `virtua`, `content-visibility: auto`).
*   **Controlled inputs:** Prefer uncontrolled inputs; controlled inputs must be extremely cheap per keystroke.
*   **Intl API:** Use `Intl.DateTimeFormat` and `Intl.NumberFormat` instead of hardcoded formats for dates/currency.

---

## 🛑 SECTION 3: ANTI-PATTERNS CHECKLIST (Flag These!)
*If you see any of the following in the code, they must be fixed immediately:*

- [ ] `user-scalable=no` or `maximum-scale=1` (Disabling zoom is strictly forbidden).
- [ ] `onPaste` with `preventDefault`.
- [ ] `transition: all` used in CSS.
- [ ] `outline: none` without a `:focus-visible` replacement.
- [ ] Inline `onClick` navigation without an `<a>` tag.
- [ ] `<div>` or `<span>` with click handlers (Should be `<button>`).
- [ ] Images without explicit `width` and `height`.
- [ ] Form inputs without `<label>`.
- [ ] Icon buttons without `aria-label`.
- [ ] Hardcoded date/number formats instead of using `Intl.*`.
- [ ] `autoFocus` without clear, strict justification.
- [ ] (Future) Large arrays `.map()` without virtualization.

---

## Output Format (For automated reviews)
When reviewing files using this skill, output findings concisely in this format:

```text
## path/to/file.html

path/to/file.html:42 - icon button missing aria-label
path/to/file.html:67 - transition: all → list properties

## path/to/another.css

✓ pass
```
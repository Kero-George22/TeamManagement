---
name: web-design-reviewer
description: A systematic workflow for visual inspection, validation, and fixing of website design quality across various viewports, focusing on layout, responsive, and accessibility issues.
---

# Web Design Reviewer

This skill enables visual inspection and validation of website design quality, identifying and fixing issues at the source code level.

## Scope of Application
*   **Static sites (HTML/CSS/JS)** - *Highly relevant for current project*
*   SPA frameworks (React / Vue / Angular / Svelte)
*   Full-stack frameworks (Next.js / Nuxt)
*   CMS platforms (WordPress / Drupal)

---

## Workflow Overview

1.  **Step 1: Information Gathering** (Detect framework, styling method, target pages)
2.  **Step 2: Visual Inspection** (Traverse pages, capture DOM/Screenshots, test viewports)
3.  **Step 3: Issue Fixing** (Prioritize, locate source, apply minimal fixes)
4.  **Step 4: Re-verification** (Compare Before/After, regression testing)

---

## Step 1: Information Gathering Phase
Identify the styling method to know where to apply fixes:
| Method | Detection | Edit Target |
| :--- | :--- | :--- |
| **Pure CSS** | `*.css` files | Global CSS or component CSS |
| **Tailwind CSS** | `tailwind.config.*` | `className` in components |
| **SCSS/Sass** | `*.scss`, `*.sass` | SCSS files |

---

## Step 2: Visual Inspection Phase

### 2.1 Viewport Testing (Responsive)
Test at the following standard viewports:
| Name | Width | Representative Device |
| :--- | :--- | :--- |
| **Mobile** | `375px` | iPhone SE / 12 mini |
| **Tablet** | `768px` | iPad |
| **Desktop** | `1280px` | Standard PC |
| **Wide** | `1920px` | Large display |

### 2.2 Inspection Items Checklist

**Layout Issues:**
*   [ ] **Element Overflow:** Content overflows from parent element or viewport *(High Severity)*.
*   [ ] **Element Overlap:** Unintended overlapping of elements *(High Severity)*.
*   [ ] **Alignment Issues:** Grid or flex alignment problems *(Medium Severity)*.
*   [ ] **Inconsistent Spacing:** Padding/margin inconsistencies *(Medium Severity)*.
*   [ ] **Text Clipping:** Long text not handled properly *(Medium Severity)*.

**Responsive Issues:**
*   [ ] **Non-mobile Friendly:** Layout breaks on small screens *(High Severity)*.
*   [ ] **Breakpoint Issues:** Unnatural transitions when screen size changes *(Medium Severity)*.
*   [ ] **Touch Targets:** Buttons too small on mobile *(Medium Severity)*.

**Accessibility & Consistency:**
*   [ ] **Insufficient Contrast:** Low contrast ratio between text and background *(High Severity)*.
*   [ ] **No Focus State:** Cannot determine state during keyboard navigation *(High Severity)*.
*   [ ] **Visual Inconsistency:** Mixed fonts, non-unified brand colors *(Medium Severity)*.

---

## Step 3: Issue Fixing Phase

### 3.1 Issue Prioritization
1.  **P1: Fix Immediately** (Layout issues affecting functionality like unclickable buttons or major overlaps).
2.  **P2: Fix Next** (Visual issues degrading UX like bad contrast or text clipping).
3.  **P3: Fix If Possible** (Minor visual inconsistencies like slightly off spacing).

### 3.2 Fix Principles
*   **Minimal Changes:** Only make the minimum changes necessary to resolve the issue.
*   **Respect Existing Patterns:** Follow existing code style in the project (e.g., use CSS variables).
*   **Avoid Breaking Changes:** Ensure global CSS changes do not break other pages.
*   **Add Comments:** Explain the reason for complex fixes.

---

## Step 4: Re-verification Phase

1.  **Post-fix Confirmation:** Reload browser, compare before and after.
2.  **Regression Testing:** Verify that fixes haven't affected other areas (e.g., fixing mobile didn't break desktop).
3.  **Iteration Limit:** If more than 3 fix attempts are needed for a specific issue, step back and rethink the approach.

---

## Best Practices & Anti-Patterns

### DO (Recommended)
✅ Always check changes on `375px` (Mobile) and `1280px` (Desktop).
✅ Fix one issue at a time and verify each.
✅ Follow the project's existing code style (Vanilla CSS & GSAP).

### DON'T (Not Recommended)
❌ Large-scale refactoring without testing side effects.
❌ Ignoring design systems (e.g., hardcoding `#fff` instead of using `var(--bg-card)`).
❌ Fixes that ignore performance (e.g., using heavy box-shadows on scroll).
❌ Fixing multiple complex issues at once without testing in between.

---

## Output Format (For Review Reports)
When asked to review a page, generate a report in this format:

```markdown
# Web Design Review Results

## Summary
- **Target URL/File:** `index.html`
- **Styling:** Vanilla CSS (`style.css`)
- **Tested Viewports:** Desktop (1280px), Mobile (375px)
- **Issues Detected:** {N}

## Detected Issues

### [P1] Element Overflow in Mobile Hero
- **Element:** `.hero-text-area`
- **Issue:** Text overflows the screen width on 375px viewports causing horizontal scrolling.
- **Fixed File:** `style.css`
- **Fix Details:** Added `word-wrap: break-word` and `max-width: 100%`.
```
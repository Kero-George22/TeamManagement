---
name: seo-images
description: Image optimization analysis for SEO and performance. Checks alt text, file sizes, formats, responsive images, lazy loading, and CLS prevention.
---

# Image Optimization Analysis

Analyze images on a webpage or site for SEO and performance optimization. Provide actionable recommendations sorted by impact.

## CRITICAL: Data Extraction Method
Use curl via Bash to extract image tags accurately (WebFetch loses attributes like alt, loading, srcset).
*   `curl -sL [URL] | grep -oP '<img[^>]+>' | head -20`
*   `curl -sL [URL] | grep -i -E '(<picture|srcset|<source.*type=)'`

---

## Analysis Checklist

### 1. Alt Text Quality
Every `<img>` must have descriptive alt text (except decorative images with `role="presentation"` or `alt=""`).
*   **Good:** "Chocolate labrador puppy playing with tennis ball"
*   **Bad:** "IMG_2847.jpg" (filename), "photo" (generic), "click here" (CTA).

### 2. File Size Optimization
| Image Category | Target | Warning | Critical | Examples |
| :--- | :--- | :--- | :--- | :--- |
| Thumbnails / Icons | < 50KB | > 100KB | > 200KB | Product thumbnails, avatars |
| Content images | < 100KB | > 200KB | > 500KB | Blog photos, gallery items |
| Hero / Banner | < 200KB | > 300KB | > 700KB | Above-fold hero images |

### 3. Modern Format Usage
*   **AVIF / WebP** are highly recommended over JPEG and PNG.
*   Use `<picture>` elements for fallbacks:
    ```html
    <picture>
      <source srcset="hero.avif" type="image/avif">
      <source srcset="hero.webp" type="image/webp">
      <img src="hero.jpg" alt="..." loading="lazy" decoding="async">
    </picture>
    ```

### 4. Responsive Images Implementation
Check for proper `srcset` and `sizes` attributes for images > 400px wide.

### 5. Lazy Loading Strategy (Critical)
*   ✅ `loading="lazy"` on below-fold images.
*   ❌ NEVER lazy-load LCP (Largest Contentful Paint) images (Above the fold).

### 6. LCP Image Optimization (Hero Images)
*   Add `fetchpriority="high"` to the LCP image.
*   Include explicit dimensions (`width` and `height`).

### 7. Async Decoding
Add `decoding="async"` to all images except the LCP image to prevent blocking the main thread.

### 8. CLS Prevention (Cumulative Layout Shift)
Every image needs `width` and `height` attributes OR a CSS `aspect-ratio` property to reserve space.

### 9. SEO-Friendly File Naming
Descriptive, hyphenated, lowercase, no special characters (e.g., `blue-nike-running-shoes.webp`).
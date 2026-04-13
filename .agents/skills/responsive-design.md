---
name: responsive-design
description: Master modern responsive design techniques including container queries, fluid typography, modern viewport units (dvh), and layout patterns.
---

# Responsive Design

Master modern responsive design techniques to create interfaces that adapt seamlessly across all screen sizes and device contexts.

---

## 🟢 SECTION 1: ACTIVE SKILLS (Vanilla HTML/CSS)
*Apply these principles immediately to your current HTML/CSS/JS projects.*

### 1. Modern Breakpoint Scale (Mobile-First)
Always start with mobile styles outside of media queries, then enhance for larger screens.
```css
/* Base: Mobile (< 640px) */

@media (min-width: 640px) {
  /* sm: Landscape phones, small tablets */
}
@media (min-width: 768px) {
  /* md: Tablets */
}
@media (min-width: 1024px) {
  /* lg: Laptops, small desktops */
}
@media (min-width: 1280px) {
  /* xl: Desktops */
}
```

### 2. Fluid Typography & Spacing
Use `clamp()` to smoothly scale text and spacing without needing multiple media queries.
```css
:root {
  /* Min size, preferred (fluid), max size */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
  --text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem);

  /* Fluid spacing scale */
  --space-sm: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-md: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-lg: clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem);
}
```

### 3. Dynamic Viewport Units (Crucial for Mobile)
Avoid `100vh` on mobile as it ignores the browser's address bar. Use `dvh` instead.
```css
.full-height {
  height: 100vh; /* ❌ May cause issues on mobile (hidden behind address bar) */
}

.full-height-dynamic {
  height: 100dvh; /* ✅ Accounts for mobile browser UI dynamically */
}

.min-full-height {
  min-height: 100svh; /* Smallest possible viewport height */
}
```

### 4. CSS Grid Responsive Layouts
```css
/* Auto-fit grid - items wrap automatically to fill space */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}

/* Responsive grid with named areas */
.page-layout {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "sidebar"
    "footer";
  gap: 1rem;
}

@media (min-width: 1024px) {
  .page-layout {
    grid-template-columns: 250px 1fr 300px;
    grid-template-areas:
      "header header header"
      "nav main sidebar"
      "footer footer footer";
  }
}
```

### 5. Container Queries
Query the parent container's size instead of the entire viewport. Perfect for reusable components.
```css
/* 1. Define a containment context on the parent */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* 2. Query the container */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

/* Container query units (cqi) */
.card-title {
  font-size: clamp(1rem, 5cqi, 2rem);
}
```

### 6. Responsive Images (Art Direction)
Use the `<picture>` tag to serve completely different image crops based on screen size (preventing awkward scaling).
```html
<picture>
  <!-- Desktop wide crop -->
  <source media="(min-width: 1024px)" srcSet="assets/hero-wide.webp" type="image/webp" />
  <!-- Tablet medium crop -->
  <source media="(min-width: 768px)" srcSet="assets/hero-medium.webp" type="image/webp" />
  <!-- Mobile portrait crop (Default fallback) -->
  <img src="assets/hero-mobile.jpg" alt="Hero image" class="w-full h-auto" loading="eager" fetchpriority="high" />
</picture>
```

---

## 🛑 Anti-Patterns & Common Issues
- [ ] **Horizontal Overflow:** Content breaking out of viewport (fix with `max-width: 100%; overflow-wrap: break-word;`).
- [ ] **Fixed Widths:** Using `px` instead of relative units like `%` or `rem` for containers.
- [ ] **Viewport Height:** `100vh` issues on mobile browsers (use `100dvh` instead).
- [ ] **Touch Targets:** Buttons too small to tap accurately on mobile (maintain minimum `44px` height/width).
- [ ] **Aspect Ratio Squish:** Images stretching (fix with `object-fit: cover;`).

---

## 🔵 SECTION 2: FUTURE SKILLS (React & Tailwind)
> **⚠️ NOTE:** This section is for future projects using React and Tailwind CSS.

### React Responsive Navigation
```jsx
function ResponsiveNav({ items }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="relative">
      <button className="lg:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X /> : <Menu />}
      </button>
      <ul className={cn(
          "absolute top-full left-0 right-0 flex-col",
          isOpen ? "flex" : "hidden",
          "lg:static lg:flex lg:flex-row"
        )}>
        {items.map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}
      </ul>
    </nav>
  );
}
```

### Responsive Data Tables (Desktop Table -> Mobile Cards)
```jsx
function ResponsiveDataTable({ data, columns }) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden md:table w-full">...</table>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            {columns.map(col => (
              <div key={col.key} className="flex justify-between">
                <span className="text-muted-foreground">{col.label}</span>
                <span>{row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

### Tailwind Container Queries (`@tailwindcss/container-queries`)
```jsx
function ResponsiveCard({ title, image }) {
  return (
    <div className="@container">
      <article className="flex flex-col @md:flex-row @md:gap-4">
        <img src={image} className="w-full @md:w-48 aspect-video @md:aspect-square object-cover" />
      </article>
    </div>
  );
}
```
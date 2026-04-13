---
name: animejs-v4
description: Lightweight JavaScript animation library (Anime.js v4) covering modular imports, timelines, stagger, scroll animations, SVG utilities, and React integration.
---

# Anime.js v4 Animation Skill

Anime.js is a lightweight JavaScript animation library with a simple yet powerful API. It works with CSS properties, SVG, DOM attributes, and JavaScript Objects.

> **⚠️ Project Context Note:** Your current project uses **GSAP**. Anime.js is documented here for future projects requiring a smaller bundle size (via modular imports) or specific SVG/Draggable utilities. Avoid mixing GSAP and Anime.js in the same project.

## 1. Installation & Imports

Anime.js v4 is modular and tree-shakeable. Import only what you need to keep bundle sizes extremely small.

```javascript
// NPM: npm install animejs

// Full import
import { animate, createTimeline, stagger, createDraggable } from 'animejs';

// Standalone modules for smaller bundles
import { animate } from 'animejs/animation';
import { createTimeline } from 'animejs/timeline';
import { createTimer } from 'animejs/timer';
```

---

## 2. Core Concepts & Modules

*   **Animation (`animate`):** Targets (CSS, DOM, JS Objects). Supports keyframes, numerical interpolation, relative values (`+=`), and color functions.
*   **Timeline (`createTimeline`):** Chain animations together. Supports absolute (`ms`), relative (`-=`, `+=`, `<`, `>`), and label positioning.
*   **Draggable (`createDraggable`):** Easily make DOM elements draggable with built-in physics (friction, mass, stiffness, snap).
*   **Layout (`createLayout`):** Handle CSS display animations, staggered layouts, enter/exit, and DOM order animations.
*   **Scroll (`onScroll`):** Trigger animations based on scroll position (similar to GSAP ScrollTrigger).
*   **SVG Utilities:** `morphTo()`, `createDrawable()` (line drawing), `createMotionPath()`.

---

## 3. Quick Reference Recipes

### Basic Animation
```javascript
import { animate } from 'animejs';

animate('.element', {
  translateX: 250,
  rotate: '1turn',
  duration: 800,
  ease: 'outExpo'
});
```

### Timeline & Positioning
```javascript
import { createTimeline } from 'animejs';

const tl = createTimeline({ defaults: { duration: 500 } });
tl.add('.box1', { x: 100 })
  .add('.box2', { x: 100 }, '<')      // Start with previous
  .add('.box3', { x: 100 }, '-=200'); // 200ms before end
```

### Staggering (Grid & Center)
```javascript
import { animate, stagger } from 'animejs';

animate('.item', {
  translateY: [-20, 0],
  opacity:,
  delay: stagger(100, { from: 'center' }),
  duration: 600
});
```

### Scroll Animation (Sync with Scrollbar)
```javascript
import { animate, onScroll } from 'animejs';

animate('.element', {
  translateX:,
  autoplay: onScroll({
    target: '.element',
    sync: true
  })
});
```

### Keyframes
```javascript
animate('.element', {
  translateX: [
    { to: 100, duration: 500 },
    { to: 0, duration: 500, delay: 200 }
  ],
  rotate: ['0turn', '1turn', '0turn']
});
```

### Function-Based Values
```javascript
animate('.element', {
  translateX: (el, i, total) => i * 50,
  rotate: (el, i) => anime.random(-180, 180),
  delay: (el, i) => i * 100
});
```

### SVG Line Drawing
```javascript
import { animate, createDrawable } from 'animejs';

animate(createDrawable('path'), {
  draw: ['0 0', '0 1'],
  duration: 2000,
  ease: 'inOutQuad'
});
```

### Advanced Draggable with Spring Physics
```javascript
import { createDraggable, createSpring } from 'animejs';

createDraggable('.draggable', {
  container: '.container',
  releaseEase: createSpring({ stiffness: 200, damping: 20 })
});
```

---

## 4. React Integration (Future Use)

When using Anime.js in React, use `useRef` for elements and `createScope` to handle cleanup properly (preventing memory leaks and strict mode double-invocations).

```jsx
import { useRef, useEffect } from 'react';
import { animate, createScope } from 'animejs';

function AnimatedComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      animate('.box', { rotate: 360 });
    });
    return () => scope.current.revert(); // Cleanup
  }, []);

  return (
    <div ref={root}>
      <div className="box" />
    </div>
  );
}
```

---

## 5. Performance & Bundle Sizes (Minified + Gzipped)

| Module | Size |
| :--- | :--- |
| **Full Bundle** | ~24.5 KB |
| Timer | ~5.6 KB |
| Animation | +5.2 KB |
| Timeline | +0.55 KB |
| Draggable | +6.4 KB |
| Scroll | +4.3 KB |
| Scope | +0.22 KB |
| SVG | ~0.35 KB |
| Stagger | +0.48 KB |
| Spring | ~0.52 KB |
| WAAPI | ~3.5 KB |

*Anime.js v4 heavily utilizes WAAPI (Web Animation API) where possible for hardware-accelerated animations.*
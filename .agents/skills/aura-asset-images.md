---
name: aura-asset-images
description: Guide for using the Aura Asset Library to source high-quality, Unsplash-style images. Includes search techniques, URL formatting, cropping ratios, and curated image picks.
---

# Aura Asset Images (Unsplash-style)

Aura has a big searchable asset library at: [https://www.aura.build/assets](https://www.aura.build/assets)
Use it like Unsplash: search by tag, pick 5 strong candidates, and return direct image URLs.

## How to search (fast)
Open: `https://www.aura.build/assets`
Use the search box or URL query:
`https://www.aura.build/assets?q=<tag>&order=popular`

**Tags that work well:** `background`, `abstract`, `architecture`, `portrait`, `headshot`

## URL formats (what to return)
Aura thumbnails commonly look like:
`https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/<UUID>_800w.jpg`

**Higher-res (recommended)**
Many images support a larger variant by swapping `_800w` → `_1600w`
*   800w: `.../<id>_800w.jpg`
*   1600w: `.../<id>_1600w.jpg`

> *Note: If a `_1600w` variant 404s, keep `_800w` and instruct the user to open the asset page and download/export.*

## Ratios (what to crop to)
*   **Avatars:** 1:1 (square)
*   **Headshots:** 4:5 or 3:4
*   **Website heroes / large backgrounds:** 16:9
*   **Mobile wallpapers / stories:** 9:16

**Cropping tip:**
*   For faces, keep eyes ~1/3 from the top; avoid cutting chin/forehead.
*   For backgrounds, preserve horizon lines and keep 30–50% negative space for text.

---

## Curated picks (5 each)

### 1) Backgrounds
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/fa51902b-c2a4-4c33-a96e-a8f1ef67edc6_3840w.jpg
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/d14dc069-558a-4c51-8aad-5cc237f9b61d_3840w.jpg
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/75134536-4198-40bf-9944-315511fe8c0b_3840w.jpg
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/c31dd008-598b-4fc9-b5c7-9c3e1d296d38_3840w.jpg
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/a4780cd9-2a3d-4bdc-9e5f-85a097b3a8bf_3840w.webp
*   **Suggested exports:** 16:9 (1920×1080, 2400×1350) | 9:16 (1080×1920)

### 2) Abstract
*   Abstract Gradient Hills in Neon Pastel Colors
*   Abstract Blue Wave at Dusk
*   Abstract Blue Wave with Orange Highlights
*   Abstract neon light wave on black
*   Blue credit card on vibrant gradient background
*   **Suggested exports:** Desktop (2560×1600 or 2880×1800) | Mobile (1080×1920)

### 3) Architecture
*   Futuristic Deconstructed Pyramid in Grayscale
*   Modern glass villa at dusk in lush landscape
*   Ring-Shaped Futuristic City Against Starry Night
*   Minimalist glass office overlooking misty fjord
*   Isometric 3D Render of Modern Tiny House
*   **Suggested exports:** Web hero (2400×1350) | Feature section (1600×900)

### 4) Portraits
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/0d868fef-f560-45ca-ab35-5dad4fc29059_3840w.webp
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/3186f9ea-5f5a-49f7-8fcf-568ad52f515e_3840w.webp
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/65695f80-23f9-46ee-8487-cbb6c93cc48b_3840w.webp
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/0d063fd9-f7c1-4536-ade0-9fd133f07279_3840w.webp
*   https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/582afef4-b810-47b8-a047-8b3597c323e1_3840w.webp
*   **Suggested exports:** 3:4 (1500×2000) | 4:5 (1200×1500)

### 5) Headshots
*   Black-and-white portrait of smiling man
*   Black-and-white studio portrait of a confident woman
*   Confident man in light blue shirt portrait
*   Studio portrait of woman with striking blue eyes
*   Professional Portrait of Curly-Haired Businessman
*   **Suggested exports:** 4:5 (800×1000, 1200×1500) | 1:1 variant (512×512)
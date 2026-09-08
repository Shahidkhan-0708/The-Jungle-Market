# Design Plan: Buyer Discovery & Product Surface Refinements

## Context & Trace
- **Audited Surface**: Buyer Home, Category Explorer, and Product Detail & Lore views (`index.html`, `app.js`, `styles.css`).
- **Governing Design System**: *Earthy Artisan Sanctuary* (Stitch Project `projects/1997792758782997612`).
- **Status**: Ready for Implementation.

---

## Proven Findings & Corrections

### 1. Touch Target Standard Alignment (48px Hit Bounding Box)
- **Problem**: Quick add-to-cart buttons on the product grid (`w-7 h-7` / 28px) and top bar sub-actions (`w-8 h-8` / 32px) fall below the 44px–48px physical field touch standard defined in the design spec.
- **Evidence**: Design system touch target rule: *"Every primary touch target satisfies a strict minimum bounding zone of 44px–48px regardless of visual icon size."*
- **Correction**: Update interactive button containers on the product card and app bar to a minimum 40px–44px footprint with `active:scale-95` tap feedback.
- **Affected File**: `app.js` (product card template and detail view buttons).

### 2. Standardized Card Elevation & Organic Shadow Tint
- **Problem**: Some card containers use generic shadows instead of the earthy forest-tinted ambient elevation (`rgba(36, 49, 38, 0.08)` to `rgba(36, 49, 38, 0.12)`).
- **Evidence**: Design system elevation spec: *"Shadows do not use pure black. Instead, they are cast using an earthy forest tone: `rgba(36, 49, 38, 0.08)` on Surface `#FFFDF8` with 1px border of `rgba(122, 75, 42, 0.08)`."*
- **Correction**: Apply unified `shadow-earth-sm` / `shadow-earth-md` classes across all card primitives in `app.js` and `styles.css`.
- **Affected Files**: `styles.css`, `app.js`.

### 3. Audio Lore Waveform Micro-Interaction Pacing
- **Problem**: Voice clip indicator lacks active playback visual state toggle when clicked.
- **Evidence**: Design spec component section: *"Distinct pill-shaped high-visibility component with `#7A4B2A` fill, mic icon, and dynamic audio wave indication."*
- **Correction**: Add active toggle state that animates waveform bars during audio story playback.
- **Affected File**: `app.js`.

---

## Verification Criteria
1. Measure hit boxes on mobile viewport (all clickable icons ≥ 40px bounding box).
2. Validate that card elevations cast warm olive/earth tinted shadows.
3. Test audio playback wave animation trigger on the artisan spotlight and product lore cards.

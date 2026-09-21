# Jungle Market Design Direction

## Source

- Reference: https://shop.app/
- Capture date: 2026-09-13
- Evidence: live page structure and current public screenshots
- Target stack: Expo, React Native, React Native Web

## Design Summary

Recreate Shop's search-first, product-led simplicity without copying its logo, purple identity, product assets, or copy. Jungle Market uses a calm light canvas, oversized editorial prompts, floating craft previews, rounded category controls, and personalized discovery. Provenance, maker voice, and transparent impact replace generic personalization as the distinctive product idea.

## Design Tokens

- Canvas: warm mist `#FAFAF7` (inferred adaptation)
- Surface: pure white `#FFFFFF`
- Ink: forest-black `#102018`
- Primary: Earthy Forest `#004525`
- Secondary: Terracotta Clay `#835331`
- Accent: Amber Glow `#C99A45`
- Selected state: Sage Container `#E8F8E7`
- Typography: existing Outfit and Plus Jakarta Sans
- Layout: mobile-first 8px spacing; wide web canvas up to 1180px
- Controls: 44px minimum targets and pill radii

## Components and page pattern

1. Minimal role-aware navigation
2. Oversized discovery prompt
3. Natural-language search
4. Suggested-query pills
5. Floating featured crafts
6. Category and provenance filters
7. Connected artisan to ambassador to buyer story
8. Product feed and transparent checkout

## Motion

Use restrained spring movement, subtle search elevation, and the adapted Skiper40 arrow motion. Essential information never depends on animation; reduced-motion mode disables continuous motion.

## Build Instructions

- Keep Shop's hierarchy and calm density, not its brand identity.
- Use Jungle Market products, imagery, language, and trust signals.
- Make provenance visible before price comparison.
- Preserve commerce, voice, verification, and role navigation.
- Verify 375px, 768px, 1024px, and 1440px behavior.

## Rerun Inputs

workflow: firecrawl-website-design-clone  
source_url: https://shop.app/  
target_stack: Expo / React Native Web  
output: DESIGN.md

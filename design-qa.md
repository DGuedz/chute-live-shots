# CHUTE — Design QA

- Reference: `/Users/doublegreen/.codex/generated_images/019f727c-26d8-73d2-8173-b25ad2e0f699/exec-315501e0-760e-4c12-860c-70ec025dffc7.png`
- Desktop evidence: `/Users/doublegreen/mind_v2/chute/artifacts/chute-home-desktop.png`
- Mobile evidence: `/Users/doublegreen/mind_v2/chute/artifacts/chute-home-mobile.png`
- Refined 16:9 hero: `/Users/doublegreen/mind_v2/chute/artifacts/chute-hero-16x9.png`
- Scroll video master: `/Users/doublegreen/mind_v2/chute/artifacts/hyperframes/messi-yamal-scroll/messi-yamal-scroll-master.mp4`
- Web scroll encode: `/Users/doublegreen/mind_v2/chute/apps/web/public/messi-yamal-scroll.mp4`
- Web scroll encode v2: `/Users/doublegreen/mind_v2/chute/apps/web/public/messi-yamal-scroll-v2.mp4`
- Tested URL: `http://localhost:5174/`
- Viewports: 1280 × 720 and 390 × 844

## Review

- P0: none.
- P1: none.
- P2: none remaining.
- Visual hierarchy matches the selected dark command-center direction: condensed display type, graphite surfaces, lime decisions and restrained card density.
- Five folds are present and readable: hero, market model, World Cup intelligence, proof flow and final CTA.
- Hero uses a real project image as an explicit temporary video slide.
- Hero media measures 1.778 (16:9), has no score card overlay and renders without dimming filters.
- The 12-second hero video is scroll-scrubbed across a sticky 220vh section and encoded with one keyframe per frame.
- V2 separates the supplied artwork into background, left-player and right-player layers; the public filename is versioned to prevent stale browser caching.
- Mobile has no horizontal overflow; primary navigation collapses and the CTA remains above the media.
- Claims are separated by evidence level: editorial history, future TxLINE resolution and devnet/paper receipt preview.
- Wallet action supports Phantom, Solflare and Backpack through the existing provider flow.
- Quiz remains sequential: each answer unlocks the next question.
- Tests: 14/14 passed. Production build passed.

final result: passed

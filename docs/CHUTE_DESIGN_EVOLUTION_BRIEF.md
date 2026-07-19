# CHUTE Design Evolution Brief

## Executive summary

The reference design is within reach when treated as a product-language upgrade. CHUTE already has the important foundation: a Neo Arcade token system, replay and predictive quiz modes, snapshot-backed scoring, ranking, wallet flow and proof surfaces. The gap is not basic capability; it is composition. The next version should make every screen feel like a focused match terminal with one dominant number, one clear decision and one visible evidence state.

## Key findings

### What the reference does well

- Establishes hierarchy through very large values and short labels.
- Uses one fluorescent action color to identify the current decision.
- Separates primary cards from muted supporting surfaces.
- Treats mobile as the primary product surface.
- Uses charts and segmented controls as analytical tools, not decoration.
- Makes navigation and utility actions compact and predictable.

### What CHUTE already has

- Consolidated CSS files and shared tokens.
- One-question-at-a-time quiz behavior.
- Replay and predictive flows.
- Odds, risk tiers and statistical basis on answer options.
- Content hash, snapshot ID, proof reference and ranking output.
- Solana anchoring as a trust layer.

### Main design gap

The existing Neo Arcade language is energetic and angular, while the reference is calm, rounded and information-dense. CHUTE should not abandon the former. It should use a hybrid: rounded terminal surfaces for data and interaction, with Neo Arcade lime/orange accents for competition, live state and action.

## Implications

The visual system should evolve in layers:

1. Surface layer: dark terminal canvas, rounded data cards, tighter mobile spacing.
2. Information layer: dominant score/metric, explicit source state, evidence-backed chart.
3. Decision layer: thesis cards with one selected lime state and clear risk language.
4. Trust layer: proof capsule and network label always visible at result/settlement boundaries.
5. Motion layer: press, reveal and layout transitions with reduced-motion support.

## Recommendations

### Recommended library set

- Motion for React animation and touch gestures.
- Radix UI primitives for accessible dialogs, sheets, tabs, tooltips and scroll areas.
- Recharts for the first evidence charts.
- One icon system only; consolidate the current Tabler/Phosphor overlap.

### Phased implementation

**Phase A — surface foundation**

- Add terminal surface tokens and radius scale.
- Create `TerminalShell`, `MetricHero`, `ThesisCard` and `ProofCapsule`.
- Recompose the Match and Quiz screens without changing API behavior.

**Phase B — analytical interaction**

- Add `SignalChart` backed only by available snapshot metrics.
- Add selected-card transitions and segmented progress.
- Add accessible wallet/network sheet.

**Phase C — result and social layer**

- Redesign ranking rail and result breakdown.
- Add animated proof reveal and share card.
- Validate replay/predictive parity and mobile touch behavior.

## Decision

Proceed with a component-level redesign, not a wholesale library replacement. The current codebase is capable of reaching the reference quality; the work is primarily a disciplined visual architecture and interaction pass.

## Appendix: evidence and constraints

- Reference source supplied as an image; no originating URL was supplied, so a Firecrawl website scrape could not be run.
- Existing CHUTE implementation and build output were inspected locally.
- Motion documentation supports React gestures, layout animation and `whileTap`/`whileHover` patterns.
- Radix documentation supports unstyled, accessible primitives that can be themed by CHUTE.
- Recharts documentation supports React-native chart composition.

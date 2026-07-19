# DESIGN.md: CHUTE Match Intelligence / Neo Terminal

## Source

- Visual reference: user-provided mobile finance/quiz interface image.
- Capture date: 2026-07-17.
- Evidence: attached reference image, current CHUTE source, `NEO_ARCADE_SYSTEM.md`, current CSS tokens and React screens.
- External library evidence: official Motion, Radix Primitives and Recharts documentation.

## Design Summary

The target is achievable as a translation, not a copy. CHUTE should evolve from an arcade football quiz into a compact match-intelligence terminal: one dominant number or thesis, one decisive action, and one visible confidence/proof layer per screen.

Keep CHUTE's lime/navy/orange identity, but borrow the reference's discipline:

- black or deep navy canvas;
- oversized numeric hierarchy;
- one fluorescent lime decision surface;
- stacked rounded data cards;
- restrained gray secondary surfaces;
- compact bottom navigation and utility actions;
- charts that explain a decision instead of decorating the page;
- tactile press, reveal, and transition states.

Do not reproduce third-party logos, copy, product names, or screenshots. Use the reference only as visual inspiration.

## Design Tokens

### Colors

Observed/inferred from the reference and mapped to existing CHUTE tokens:

| Role | CHUTE token | Value | Use |
|---|---|---:|---|
| Canvas | `--neo-bg-dark` | `#0A0F1F` | App shell and terminal backgrounds |
| Brand action | `--neo-lime` | `#C8F000` | Selected state, primary action, progress |
| Competitive action | `--neo-orange` | `#FF5A00` | Urgency, live state, high-risk reveal |
| Primary text | `--neo-white` | `#F8F8F3` | Main copy and numeric values |
| Card | `--neo-bg-card` | `#1A2240` | Match, quiz, ranking cards |
| Muted surface | new `--neo-surface-soft` | `#E7E8E5` inferred | Light contrast panels where useful |
| Muted text | `--neo-blue-gray` | `#4D5870` | Labels and supporting copy |

The reference uses a very bright lime as a semantic color, not as a full-page wash. Lime should occupy decisions, positive movement, and focus states; it should not fill every component.

### Typography

- Display: keep Teko/Anton for the CHUTE identity and major match numbers.
- Interface: add a neutral UI face such as Inter or system sans for dense labels and data tables.
- Numeric display: use tabular numerals and a single dominant value per view.
- Scale: 12/14/16 for utility, 20/24 for card headings, 32/48/64 for decision values.
- Copy: short, direct, sentence-case supporting text; uppercase only for metadata and status labels.

### Spacing And Layout

- Mobile-first content width: 100%, with 16px side padding and 12px card gaps.
- Desktop cap: 420–480px for the app-like game surface; allow a wider analytics shell only for match dashboards.
- Card radius: introduce a product surface radius of 20–28px for the new terminal cards while retaining the sharper Neo Arcade treatment for brand/CTA accents.
- Action height: 52–56px minimum for primary touch actions.
- Section rhythm: 8px micro, 16px card, 24px group, 40px screen-level.
- Shadows: low-contrast depth; reserve neon glow for selected or live states.

## Components

### Match Header

Back action, fixture identity, network/proof status, and one key value. It should feel like a financial quote header translated to football.

### Signal Chart

One lightweight line/area chart for momentum, xG, shots, or pressure. The chart must have a stated metric, timestamp, and source state. Use Recharts only where the snapshot supplies data.

### Thesis Cards

Three or four stacked cards representing the available quiz theses. Each card contains a question, probability/odd, confidence badge, and selected state. The selected card is lime; unselected cards are graphite/navy.

### Progressive Quiz Stepper

Thin lime segmented progress, question number, and one question per viewport. Never expose future questions to the client.

### Reveal Card

After submission, animate the chosen thesis into correct/incorrect/proof states. Keep the answer explanation short and show the source reference.

### Ranking Rail

Compact list with rank, participant, score, and current user highlight. Use a bottom sheet or scroll area on mobile.

### Proof Capsule

Snapshot ID, content hash, proof status, network, and Explorer action. This is a trust component, not a decorative footer.

### Wallet/Network Sheet

Use an accessible dialog/sheet primitive. Clearly label devnet/paper mode and never imply that real value is moving.

## Page Patterns

1. **Home / briefing** — short product promise, active fixture, one primary action.
2. **Match terminal** — score/value header, signal chart, editorial reading, tier cards.
3. **Quiz** — one question, one decision surface, progress, odds and stat basis.
4. **Reveal** — answer status, payoff, explanation, next action.
5. **Result** — score, ranking, proof capsule, share and anchor actions.
6. **Predictive mode** — timer, frozen answers, polling state, post-resolution breakdown.

Responsive behavior should preserve the app-like narrow composition on mobile and expand into a two-column terminal on desktop: primary decision column plus evidence/ranking rail.

## Library Recommendation

Adopt incrementally:

- `motion`: screen transitions, press feedback, layout/reveal animations and gesture-aware cards.
- `radix-ui`: Dialog, Popover, Tabs, Scroll Area and Tooltip primitives; style them with CHUTE tokens.
- `recharts`: only for evidence-backed signal charts.
- Keep `@tabler/icons-react` or `@phosphor-icons/react`; consolidate to one icon family during the component migration.

Do not add a full visual framework, CSS-in-JS runtime, or charting stack until a real screen needs it.

## Agent Build Instructions

1. Preserve the API contract, quiz ordering, snapshot hash, proof references and fail-closed behavior.
2. Build a component layer before rewriting screens: `TerminalShell`, `MetricHero`, `SignalChart`, `ThesisCard`, `QuizStepper`, `RevealCard`, `ProofCapsule`, `RankingRail`.
3. Add Motion only to state transitions and gestures; respect `prefers-reduced-motion`.
4. Use Radix for behavior-heavy primitives, never for visual defaults.
5. Keep charts honest: no chart for missing data, no fabricated probability basis.
6. Validate mobile viewport, touch target size, keyboard focus, and screen-reader labels.
7. Test replay and predictive modes separately; a visual refactor must not alter scoring or proof semantics.

## Rerun Inputs

workflow: firecrawl-website-design-clone
source_url: user-provided image only; no source URL supplied
target_stack: React + Vite + TypeScript + existing CHUTE CSS tokens
output: DESIGN.md

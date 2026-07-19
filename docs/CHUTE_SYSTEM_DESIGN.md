# CHUTE Match Intelligence Terminal — System Design

## 1. Abstract

CHUTE is a Telegram-native football quiz and match-intelligence product. It converts validated TxLINE match snapshots into five shared questions, exposes a focused decision interface, scores against a frozen participant snapshot, ranks participants and optionally anchors a proof memo on Solana.

The design evolution adds a terminal-style component layer without changing the scoring, snapshot, proof or fail-closed guarantees.

## 2. Goals and non-goals

### Goals

- Make the mobile experience feel like a premium analytical terminal.
- Keep every displayed metric traceable to a snapshot or clearly labeled editorial source.
- Preserve shared question ordering and one-question-at-a-time delivery.
- Improve interaction quality with accessible primitives and restrained motion.
- Keep replay, predictive, ranking, wallet and proof flows compatible.

### Non-goals

- Replacing the backend quiz contract.
- Fabricating live match data or probabilities.
- Turning devnet/paper mode into real-money wagering.
- Copying third-party branding or proprietary assets from the reference.

## 3. Proposed architecture

```text
Telegram Mini App
  └─ TerminalShell
      ├─ MatchHeader / MetricHero
      ├─ SignalChart (snapshot-backed)
      ├─ ThesisCard / QuizStepper
      ├─ RevealCard / ResultBreakdown
      ├─ RankingRail
      └─ ProofCapsule / WalletSheet

API / FastAPI
  ├─ fixture + insights routes
  ├─ snapshot validation
  ├─ quiz generation and frozen sessions
  ├─ answer idempotency + scoring
  ├─ predictive polling and resolution
  └─ ranking / wallet / proof metadata

TxLINE worker ──> persisted snapshots ──> content hash + proof refs
Solana devnet ──> optional Memo anchor + Explorer URL
```

### Core components

- `TerminalShell`: responsive app frame, navigation and global status.
- `MetricHero`: score, fixture and one dominant metric.
- `SignalChart`: evidence-backed chart with metric and timestamp.
- `ThesisCard`: option, probability, odd, risk and selected state.
- `QuizStepper`: progress and current question only.
- `RevealCard`: answer status, actual result, payoff and explanation.
- `ProofCapsule`: snapshot, hash, proof status and network.
- `RankingRail`: durable ranking with current-user emphasis.

## 4. Request lifecycle

1. The client requests fixture insights and quiz metadata.
2. The API loads a validated snapshot and fails closed if required data is absent.
3. On first current-question access, the participant session freezes the snapshot/content hash.
4. The API returns only the current question and its options.
5. The answer endpoint validates question ID, option value and idempotency request ID.
6. The session writes the answer and score ledger before returning the next question.
7. Completion produces a result with score, error, proof refs and ranking.
8. Optional wallet anchoring creates a paper/devnet memo containing the result identifiers.

## 5. API and data contracts

The existing API remains authoritative. The visual layer consumes:

- fixture metadata and insights;
- quiz metadata, current question and progress;
- answer acknowledgement and next question;
- result, ranking, snapshot ID, content hash and proof status;
- predictive progress and final breakdown;
- wallet/session and anchor status.

The UI must never infer a metric from an absent field. A missing snapshot disables the tier and communicates the reason.

## 6. Consistency, idempotency and replay

- Participant sessions score against a frozen snapshot/content hash.
- Answer submissions use `request_id` for idempotency.
- Question IDs and order are stable for all participants in the same quiz.
- Ranking is reconstructed durably from SQLite state.
- Predictive answers remain frozen until the TxLINE snapshot is available.

## 7. Security and privacy

- Keep Telegram identity and wallet session boundaries explicit.
- Never present devnet/paper mode as a financial product.
- Keep secrets and RPC credentials outside the client bundle.
- Treat proof metadata as public audit data and avoid unnecessary personal data in memos.
- Keep administrative ingest routes authenticated.

## 8. Operational readiness

- Add component tests for terminal states and reduced-motion behavior.
- Run front-end build and tests on every visual migration.
- Run backend tests from `apps/api` with the complete dependency set, including PyNaCl.
- Monitor missing-data rates, answer rejection rates, predictive resolution latency and anchor failures.

## 9. Alternatives considered

- Full visual kit replacement: rejected because it would erase Neo Arcade identity and add unnecessary coupling.
- CSS-only motion: retained for simple effects, but insufficient for coordinated card/reveal/layout transitions.
- Full charting platform: deferred; Recharts is sufficient for the first evidence-backed charts.
- Custom accessibility primitives: rejected for dialogs/sheets/tabs; use Radix behavior and own the styling.

---
name: community-quiz-market-maker
description: Design creator-led quizzes with TxLINE and TxOdds intelligence. Invoke when a wallet-connected user wants to curate stats, mint a quiz and distribute it to their community.
---
# Community Quiz Market Maker

Use this skill when CHUTE needs to let a creator build a new quiz market for their own community.

## Mission

Turn creator intent into a safe, monetizable community quiz flow:

1. Read the market from TxLINE and TxOdds.
2. Suggest stat families that make sense for a creator-led quiz.
3. Build a creator-facing panel of stats, priors and proof coverage.
4. Propose a 5-question structure.
5. Prepare the wallet-sign + mint flow for a new quiz.
6. Map fee split between CHUTE and the creator.

## When To Invoke

Invoke this skill when:

- a user connects a wallet and wants to create their own quiz;
- CHUTE needs a creator economy flow on top of native quizzes;
- the app must recommend which stats a creator should use;
- fee split, mint gating and publishability need to be decided before minting.

## Workflow

1. Resolve the authoritative fixture and market depth.
2. Pull TxLINE proof-capable families and TxOdds prior signals.
3. Build a creator stats panel with:
   - live-proof capability
   - historical priors
   - zebra potential
   - volatility
   - audience clarity
4. Recommend a creator-safe 5-question quiz structure.
5. Define mint metadata:
   - creator wallet
   - quiz config
   - tier family
   - fee split
   - publish rules
6. Return a `CommunityQuizProposal`.

## Required Output

- `creator_wallet_required`
- `resolved_fixture_id`
- `creator_stats_panel`
- `market_recommendations`
- `quiz_proposal`
- `mint_payload_outline`
- `fee_model`
- `publishability_status`
- `required_child_skills`
- `evidence_refs`
- `recommended_actions`
- `blocked_actions`
- `confidence_score`

## Fee Model Expectations

The skill must always surface:

- CHUTE platform fee
- creator curator fee
- payout logic assumptions
- activation threshold
- anti-spam or anti-empty-market rules

## Guardrails

- Do not propose a creator quiz without wallet ownership and explicit signing.
- Do not mint a quiz whose decisive stats lack a proof path or clearly labeled historical fallback.
- Do not hide the difference between CHUTE-native quizzes and creator-led quizzes.
- Do not infer profitability without participant thresholds and fee rules.

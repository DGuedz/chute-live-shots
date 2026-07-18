---
name: chute-market-intelligence-orchestrator
description: Orchestrate TxLINE and TxOdds market intelligence for CHUTE. Invoke when composing quiz tiers, mining internal market signals, or planning child skills for data, proof and submission.
---
# CHUTE Market Intelligence Orchestrator

Use this skill as the parent router for any work that turns TxLINE or TxOdds data into quiz composition decisions.

Canonical flow:

`txline-stat-curator -> quiz-question-generator -> probability-option-generator -> quiz-snapshot-locker -> quiz-score-engine -> txline-solana-proof-settler`

This parent skill adds a market-intelligence layer before quiz publication.

## Mission

Build a source-backed internal intelligence pack that explains:

1. Which fixtures are usable now.
2. Which stat families have enough proof coverage.
3. Which markets are attractive for quiz composition.
4. Which tiers should open, stay blocked or degrade gracefully.
5. Which new child skills the project needs next.

## When To Invoke

Invoke this skill when:

- a new CHUTE tier must be created or rebalanced;
- TxLINE live feed and TxOdds historical priors need to be reconciled;
- the team wants mined market intelligence for quiz composition;
- a fixture has partial proof coverage and the product must decide what can be published;
- a new child skill or pipeline step is required for CHUTE.

## Workflow

1. Resolve the fixture and confirm the authoritative TxLINE ID.
2. Read TxLINE fixture state, score snapshots, proof refs and validation availability.
3. Read TxOdds historical/editorial priors used by CHUTE for predictive tiers.
4. Map stat coverage by family:
   - shots / shots on target
   - corners
   - fouls
   - yellow cards / red cards
   - player-centric events
5. Score each family for:
   - freshness
   - proofability
   - historical depth
   - editorial clarity
   - quizability
   - settlement safety
6. Produce a `MarketIntelligencePack` with:
   - tier recommendations
   - blocked tiers
   - confidence score
   - evidence refs
   - next child skills required
7. Stop on `MISSING_DATA`, stale feed, missing proof coverage, unresolved fixture identity or network mismatch.

## Required Output

Return compact JSON with:

- `fixture_id`
- `resolved_fixture_id`
- `market_map`
- `tier_recommendations`
- `quiz_composition_rules`
- `proof_coverage`
- `historical_priors`
- `editorial_signals`
- `required_child_skills`
- `evidence_refs`
- `recommended_actions`
- `blocked_actions`
- `confidence_score`

## Child Skills This Parent Should Spawn Or Route

- `txline-market-depth-miner`
  - Mine proof-capable stat families and coverage gaps from TxLINE.
- `txodds-historical-prior-analyst`
  - Turn TxOdds history into priors, volatility and player/team baselines.
- `community-quiz-market-maker`
  - Turn creator intent, wallet ownership and market evidence into a mintable community quiz proposal.
- `quiz-tier-composer`
  - Decide which tier opens and how five questions should be distributed.
- `proof-coverage-auditor`
  - Verify whether each question can be settled with explicit TxLINE evidence.
- `submission-evidence-packager`
  - Convert runtime evidence into README/demo/submission material.

If a child skill is missing, do not fabricate the result. Return it in `required_child_skills`.

## Guardrails

- TxLINE remains the source of truth for fixture identity, live stats and proof.
- TxOdds historical/editorial data may shape priors, never override live proof.
- Creator-led quizzes must remain distinct from CHUTE-native quizzes in publish rules, fee logic and risk review.
- Never publish a tier whose decisive stat family lacks proof strategy.
- Never claim live validation if only replay proof exists.
- Keep outputs compact and operational; prefer JSON over narrative.

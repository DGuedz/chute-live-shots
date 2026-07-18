---
name: txodds-historical-prior-analyst
description: Analyze TxOdds historical priors, volatility and zebra signals. Invoke when CHUTE needs to compose better quiz options, odds or creator-facing market recommendations.
---
# TxOdds Historical Prior Analyst

Use this skill to convert TxOdds historical/editorial data into priors that improve quiz composition without pretending to be live proof.

## Mission

Turn historical depth into usable composition intelligence:

1. Team and player baselines.
2. Volatility by stat family.
3. Strong favorite vs. zebra asymmetry.
4. Repeated high-signal players or team patterns.
5. Safe prior ranges for 5-question quiz design.

## When To Invoke

Invoke this skill when:

- CHUTE needs better priors for `chutes`, `escanteios`, `faltas` or future tiers;
- a creator wants suggestions for a new community quiz;
- odds, risk labels or option spacing must be recalibrated;
- editorial signals and live TxLINE evidence need historical context.

## Workflow

1. Read the relevant TxOdds historical store and editorial layer.
2. Segment by fixture, team, player and stat family.
3. Compute:
   - mean
   - variance
   - skew
   - outlier frequency
   - favorite vs. zebra gap
4. Produce prior bands that the CHUTE quiz engine can use.
5. Mark which priors are only contextual and which are composition-grade.

## Required Output

- `historical_priors`
- `player_signals`
- `team_signals`
- `zebra_opportunities`
- `volatility_map`
- `recommended_ranges`
- `editorial_alignment`
- `evidence_refs`
- `recommended_actions`
- `blocked_actions`
- `confidence_score`

## Guardrails

- TxOdds priors shape composition; they do not authorize live settlement.
- Separate historical signal from proof-capable signal.
- Keep outputs compact and reusable by the quiz engine.

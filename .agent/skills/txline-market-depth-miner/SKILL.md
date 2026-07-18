---
name: txline-market-depth-miner
description: Mine TxLINE market depth, stat families and proof coverage. Invoke when CHUTE needs to know which live markets are publishable, settleable or blocked.
---
# TxLINE Market Depth Miner

Use this skill to mine the real depth of TxLINE for a fixture before opening or expanding any CHUTE market.

## Mission

Discover what TxLINE can actually support for quiz publication and settlement:

1. Which stat families are present for the fixture.
2. Which `statKeys` appear in snapshots or proofs.
3. Which families update frequently enough for live product use.
4. Which families have explicit proof coverage.
5. Which families are too sparse, stale or ambiguous for CHUTE.

## When To Invoke

Invoke this skill when:

- a new tier or market family is being considered;
- a live fixture must be audited for proof-capable coverage;
- the team wants to know which stats can safely drive quiz settlement;
- a creator wants to build a custom quiz from TxLINE-backed stats.

## Workflow

1. Resolve the authoritative TxLINE fixture ID.
2. Read fixture state, score snapshots, validation payloads and proof refs.
3. Extract stat families and their numeric/non-numeric `statKeys`.
4. Group coverage by family:
   - shots
   - shots on target
   - corners
   - fouls
   - yellow cards
   - red cards
   - player-centric stats
5. Score each family for:
   - availability
   - update frequency
   - proof coverage
   - semantic clarity
   - settlement safety
6. Return a compact `TxlineMarketDepthMap`.

## Required Output

- `resolved_fixture_id`
- `fixture_state`
- `market_depth`
- `proof_coverage`
- `live_readiness`
- `blocked_families`
- `recommended_families`
- `evidence_refs`
- `recommended_actions`
- `blocked_actions`
- `confidence_score`

## Guardrails

- TxLINE is the only authority for live market depth.
- Do not infer proof coverage from editorial hints.
- A family is not publishable if the decisive stat path is ambiguous.
- Return `MISSING_DATA` when the fixture or proof evidence is incomplete.

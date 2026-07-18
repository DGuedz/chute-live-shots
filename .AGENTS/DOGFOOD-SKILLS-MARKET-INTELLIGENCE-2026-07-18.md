# Dogfood - Skills de Market Intelligence CHUTE

**Data:** 2026-07-18  
**Escopo:** `txline-market-depth-miner`, `txodds-historical-prior-analyst`, `community-quiz-market-maker`, `chute-market-intelligence-orchestrator`

---

## Comandos executados

```bash
python3 -m pytest scripts/test_semantic_skill_hook.py scripts/test_market_intelligence_skills.py -q
python3 scripts/dogfood_market_intelligence_skills.py
```

---

## Resultado

- `pytest`: verde
- `dogfood`: `status = ok`
- artefato gerado:
  - `artifacts/skill-dogfood/market-intelligence-skills-dogfood-20260718T174430Z.json`

---

## O que foi validado

### 1. Registro estrutural

- presença dos arquivos `SKILL.md`
- presença dos contratos `.json`
- skill-mae e skills-filhas presentes no repo

### 2. Roteamento semântico

- `proof coverage` e `market depth` roteiam para `txline-market-depth-miner`
- `historical priors`, `volatilidade` e `zebra` roteiam para `txodds-historical-prior-analyst`
- `creator quiz`, `wallet`, `mint` e `fee split` roteiam para `community-quiz-market-maker`

### 3. Guardrails contratuais

- `community-quiz-market-maker` exige `requires_human_approval = true`
- contratos mantêm `evidence_required = true`
- `confidence_score` e `blocked_actions` seguem obrigatórios
- creator flow exige `write_solana_only_after_approval`

### 4. Orquestração

- a skill-mae lista explicitamente as novas skills-filhas
- a lane creator-led ficou separada da lane native do CHUTE

---

## Leitura operacional

**GO para GitHub e review interno**

- as skills novas estão roteadas
- os contratos estão consistentes
- o dogfood estrutural está verde

**NO-GO para claim de produção creator-led**

- ainda não existe runtime de mint do quiz comunitário
- ainda não existe painel creator implementado no frontend
- ainda não existe fee split ativado no backend

---

## Decisão

**Status:** `GO PARCIAL`

Interpretacao:

- **GO** para versionar, revisar e dogfoodar a arquitetura das skills
- **GO** para abrir PR e integrar ao trilho do CHUTE
- **NO_GO** para chamar a economia creator-led de pronta em produção

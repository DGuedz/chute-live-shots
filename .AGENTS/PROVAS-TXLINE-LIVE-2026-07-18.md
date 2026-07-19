# Provas Operacionais - TxLINE Live + Prova On-Chain

**Data:** 2026-07-18  
**Objetivo:** registrar evidencias reproduziveis do estado atual do plano `TxLINE ao vivo + prova de validacao on-chain`.

---

## 1. Prova - Worker ativo e poller ligado

**Comando executado**

```bash
python3 - <<'PY'
import json, urllib.request
with urllib.request.urlopen('http://127.0.0.1:8000/api/txline/status', timeout=20) as r:
    data=json.load(r)
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
```

**Saida observada**

```json
{
  "configured": true,
  "network": "devnet",
  "apiBase": "https://txline-dev.txodds.com/api",
  "programId": "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  "guestSession": "configured",
  "sseConfigured": false,
  "poller": {
    "enabled": true,
    "fixtureIntervalMs": 600000,
    "scoreIntervalMs": 60000,
    "lastFixtureSyncAt": "2026-07-18T17:08:39.617Z",
    "lastScoreSyncAt": "2026-07-18T17:13:36.638Z",
    "fixtureSyncCount": 3,
    "scoreSyncCount": 26,
    "consecutiveFailures": 0,
    "lastError": null,
    "backoffMs": 0,
    "trackedFixtures": []
  },
  "data_status": "txline_configured"
}
```

**Leitura**

- `poller.enabled = true`
- sem falhas acumuladas
- `backoffMs = 0`
- bridge local API <-> worker funcional

---

## 2. Prova - Fixture real da final persistido

**Comando executado**

```bash
python3 - <<'PY'
import json, urllib.request
with urllib.request.urlopen('http://127.0.0.1:8000/api/fixtures', timeout=20) as r:
    data=json.load(r)
match=[f for f in data.get('fixtures',[]) if f.get('home_team')=='Spain' and f.get('away_team')=='Argentina']
print(json.dumps({'matches': match}, ensure_ascii=False, indent=2))
PY
```

**Saida observada**

```json
{
  "matches": [
    {
      "fixture_id": "18257739",
      "competition_id": "72",
      "home_team": "Spain",
      "away_team": "Argentina",
      "start_time": "1784487600000",
      "game_state": "1",
      "network": "devnet",
      "source_timestamp": "1784149200000",
      "updated_at": "2026-07-18 17:08:39",
      "snapshot_status": null
    }
  ]
}
```

**Leitura**

- fixture real da final confirmado como `18257739`
- reconciliacao da Fase 2 confirmada
- `snapshot_status = null` mostra que ainda nao entrou snapshot live persistido

---

## 3. Prova - Quiz preditivo continua funcional

**Comando executado**

```bash
python3 - <<'PY'
import json, urllib.request
with urllib.request.urlopen('http://127.0.0.1:8000/api/predictions/argentina-spain/Argentina/chutes', timeout=20) as r:
    data=json.load(r)
print(json.dumps({
    'quiz_id': data.get('quiz_id'),
    'questions': len(data.get('questions',[])),
    'fixture_id': data.get('fixture_id'),
    'mode': data.get('mode')
}, ensure_ascii=False, indent=2))
PY
```

**Saida observada**

```json
{
  "quiz_id": "pred-argentina-spain-Argentina-chutes",
  "questions": 5,
  "fixture_id": "argentina-spain",
  "mode": "predictive"
}
```

**Leitura**

- quiz preditivo segue abrindo normalmente
- 5 perguntas continuam disponiveis
- o alias editorial `argentina-spain` segue estavel na UX

---

## 4. Prova - Checker fail-closed do fixture live

**Comando executado**

```bash
python3 scripts/check_txline_live_fixture.py; echo EXIT:$?
```

**Saida observada**

```json
{
  "fixture_id": "18257739",
  "teams": [
    "Spain",
    "Argentina"
  ],
  "metrics": {
    "fixture_in_txline": true,
    "game_state": "1",
    "start_time": "1784487600000",
    "snapshot_id": "MISSING_DATA",
    "snapshot_data_status": "MISSING_DATA",
    "score_sequence": "MISSING_DATA",
    "stats_keys_count": 0,
    "event_count": 0,
    "poller_enabled": true,
    "poller_last_fixture_sync_at": "2026-07-18T17:08:39.617Z",
    "poller_last_score_sync_at": "2026-07-18T17:12:36.637Z"
  },
  "recent_form": "MISSING_DATA",
  "source_timestamp": "1784149200000",
  "txline_proof_refs": [],
  "confidence_score": 0.25,
  "data_status": "fixture_discovered_snapshot_pending",
  "evidence_refs": [
    "http://127.0.0.1:8000/api/txline/status",
    "http://127.0.0.1:8000/api/txline/fixtures",
    "http://127.0.0.1:8000/api/fixtures",
    "http://127.0.0.1:8000/api/fixtures/18257739/snapshot"
  ],
  "recommended_actions": [
    "Wait for the first live score snapshot or trigger a manual score sync when the match starts."
  ],
  "blocked_actions": [
    "Do not resolve the predictive quiz against replay or unstamped data."
  ],
  "on_chain_validation": null
}
EXIT:2
```

**Leitura**

- o fixture existe
- o live sync existe
- ainda nao ha snapshot live
- ainda nao ha `proof_refs` live
- o sistema esta corretamente bloqueado (`EXIT:2`) em vez de fabricar resultado

---

## 5. Prova - Enriquecimento de proof live implementado

**Arquivos**

- `apps/txline-worker/src/txlineClient.ts`
- `apps/txline-worker/src/persistence.ts`
- `apps/txline-worker/src/poller.ts`
- `apps/txline-worker/src/server.ts`
- `apps/txline-worker/tests/persistence.test.ts`

**Evidencia tecnica**

- o cliente agora le proof por URL completa ou `proofRef`
- o worker extrai `proof_refs` explicitos ou deriva a URL oficial `stat-validation`
- o worker tenta anexar `validation` com:
  - `statsToProve`
  - `targetTimestamp`
  - `summary`
  - `proofRefs`
  - `onChainValidation.method = validateStatV2.view`
  - `programId`
  - `valid = null`
  - `dryRun = true`
  - `proofStatus = "proof_fetched_unverified"`

**Interpretacao**

- a trilha tecnica da Fase 3 esta pronta para receber a proof live real
- o bloqueio atual nao e de implementacao, e de ausencia do primeiro score snapshot live da final

---

## 6. Prova - Testes e build verdes

**Comandos executados**

```bash
npm --workspace apps/txline-worker run test
npm --workspace apps/txline-worker run build
```

**Saida observada**

```text
Test Files  2 passed (2)
Tests       7 passed (7)

> build
> tsc --noEmit
```

**Leitura**

- implementacao do worker validada
- sem erro de TypeScript
- regressao local controlada

---

## 7. Estagio do plano

**Nota atual:** `8.4 / 10`

### Fase 1

- **Status:** quase fechada
- **Nota:** `9.0 / 10`
- **Motivo:** autosync ligado e worker saudavel; falta o fixture entrar em estado score-worthy

### Fase 2

- **Status:** fechada
- **Nota:** `9.5 / 10`
- **Motivo:** fixture real da final confirmado e reconciliado

### Fase 3

- **Status:** muito avancada
- **Nota:** `8.5 / 10`
- **Motivo:** backend, frontend, memo e worker ja preparados; falta a prova live real entrar em runtime

### Fase 4

- **Status:** parcial
- **Nota:** `4.0 / 10`
- **Motivo:** falta pacote de submissao final

---

## 8. Conclusao objetiva

- O plano nao esta mais no estagio de construcao arquitetural.
- O projeto esta no estagio de **espera operacional + fechamento de submissao**.
- O principal bloqueio tecnico agora e externo ao codigo: o primeiro snapshot live real do fixture `18257739`.

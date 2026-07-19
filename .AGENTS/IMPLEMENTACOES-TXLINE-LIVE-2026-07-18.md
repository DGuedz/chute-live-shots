# Implementacoes TxLINE Live + Prova On-Chain

**Data:** 2026-07-18
**Contexto:** continuidade do plano `PLANO-TXLINE-LIVE-VALIDATION-PROOF-2026-07-18.md`
**Escopo desta rodada:** ligar live sync, reconciliar fixture real, expor prova no produto e preparar enriquecimento live de `proof_refs` + `validation` em modo fail-closed.

---

## Resumo executivo

- O trilho tecnico principal foi implementado sem quebrar o fluxo validado do quiz.
- O worker TxLINE esta ativo com `TXLINE_AUTOSYNC=true` e a API responde `poller.enabled: true`.
- O fixture real da final foi confirmado como `18257739` (`Spain x Argentina`) e o progress preditivo agora resolve esse fixture live, sem cair no replay.
- O backend ja expoe `proof_refs` e `on_chain_validation`; o frontend mostra esses campos e inclui `proof_ref` curto no memo Solana.
- O worker agora persiste `proof_refs` no ingest live e, quando consegue ler a proof, anexa um bloco `validation` em `dryRun`, com `onChainValidation.method = "validateStatV2.view"` e `valid = null`.
- O estado real continua `snapshot_pending` porque o fixture ainda esta em `GameState = 1`, sem score snapshot persistido. Isso esta correto e fail-closed.

---

## Implementacoes concluidas

### 1. Fase 1 - Sync ao vivo ligado

- `.env` ajustado para `TXLINE_AUTOSYNC=true`.
- API e worker reiniciados e verificados localmente.
- Evidencia operacional:
  - `GET /api/txline/status` retorna `poller.enabled: true`
  - sem `consecutiveFailures`
  - `backoffMs: 0`

### 2. Fase 2 - Fixture real reconciliado

- O fixture real `Spain x Argentina` foi encontrado na TxLINE com `fixture_id = 18257739`.
- O replay antigo continua separado.
- O progress preditivo passou a usar resolucao especifica para fixture live, sem confundir com o replay `18179551`.
- Quando nao ha snapshot live, o endpoint retorna `snapshot_pending` em vez de inventar resolucao.

### 3. Fase 3 - Prova exposta no produto

- Backend:
  - `predictive_quiz_progress` retorna `proof_refs`
  - `predictive_quiz_progress` retorna `on_chain_validation`
  - `predictive_quiz_progress` retorna `resolved_fixture_id`
- Frontend:
  - a tela de resultado mostra `PROOF REF`
  - a tela de resultado mostra `VALIDACAO`
  - o memo `CHUTE-PRED` aceita `proof_ref` opcional e usa versao curta

### 4. Worker - Enriquecimento live de prova

- O worker passou a extrair `proof_refs` do score live de duas formas:
  - reutiliza `proofRefs` explicitos, quando vierem no payload
  - monta a URL oficial `stat-validation` usando apenas `fixtureId + seq + statKeys` numericos presentes no score
- O worker agora tenta buscar a proof real e anexar:
  - `validation.statsToProve`
  - `validation.targetTimestamp`
  - `validation.summary`
  - `validation.proofRefs`
  - `validation.onChainValidation.method`
  - `validation.onChainValidation.programId`
  - `validation.onChainValidation.valid = null`
  - `validation.onChainValidation.dryRun = true`
  - `validation.onChainValidation.proofStatus = "proof_fetched_unverified"`
- Se a leitura da proof falhar, o snapshot continua persistindo com `proof_refs` e sem derrubar o ingest.

### 5. Verificacao operacional

- Script criado:
  - `scripts/check_txline_live_fixture.py`
- Objetivo:
  - inspecionar o fixture `18257739`
  - informar status fail-closed
  - retornar JSON com `confidence_score`, `data_status`, `txline_proof_refs`, `recommended_actions` e `blocked_actions`
- Estado real na ultima execucao:
  - `fixture_discovered_snapshot_pending`
  - `confidence_score: 0.25`
  - `game_state: 1`
  - `snapshot_id: MISSING_DATA`
  - `txline_proof_refs: []`
  - `on_chain_validation: null`

---

## Arquivos alterados nesta trilha

- `apps/api/app/storage.py`
- `apps/api/app/snapshot_builder.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_predictive_progress.py`
- `apps/web/src/solana-anchor.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/solana-anchor.test.ts`
- `apps/txline-worker/src/txlineClient.ts`
- `apps/txline-worker/src/persistence.ts`
- `apps/txline-worker/src/poller.ts`
- `apps/txline-worker/src/server.ts`
- `apps/txline-worker/tests/persistence.test.ts`
- `scripts/check_txline_live_fixture.py`
- `README.md`

---

## Validacao executada

- `python3 scripts/semantic_skill_hook.py "..."`
- `python3 -m pytest tests/test_predictive_progress.py -q`
- `npm --workspace apps/web run test -- src/solana-anchor.test.ts`
- `npm --workspace apps/web run build`
- `npm --workspace apps/txline-worker run test`
- `npm --workspace apps/txline-worker run build`
- `python3 scripts/check_txline_live_fixture.py`

Resultados:

- API preditiva: verde
- Web memo/prova: verde
- Worker: `7` testes verdes
- TypeScript worker: verde
- Checker live: executando corretamente e retornando `EXIT:2` enquanto nao ha snapshot live

---

## Avaliacao do plano (0 a 10)

**Nota atual: 8.4 / 10**

### Justificativa

- **Fase 1:** 9.0/10
  - autosync ligado, worker ativo, telemetria saudavel
  - pendencia: `trackedFixtures` ainda vazio para a final porque o jogo ainda nao entrou em estado score-worthy
- **Fase 2:** 9.5/10
  - fixture real identificado e reconciliado
  - alias live separado do replay no progress preditivo
- **Fase 3:** 8.5/10
  - prova exposta no backend, frontend e memo
  - enriquecimento live de `proof_refs` e `validation` implementado
  - pendencia: falta prova real live entrando em runtime para validar ponta a ponta com o fixture `18257739`
- **Fase 4:** 4.0/10
  - README parcialmente atualizado
  - ainda faltam repo publico/acesso, video final, submissao e confirmacao formal sobre devnet/mainnet

### Leitura objetiva da nota

- O nucleo tecnico esta quase fechado.
- O que impede nota 9.5+ nao e arquitetura; e a ausencia do primeiro snapshot live real da final e o pacote final de submissao.
- Se o snapshot live entrar e a prova aparecer no runtime como esperado, a nota sobe rapidamente.

---

## Pendencias criticas

- Esperar ou forcar o primeiro score snapshot real do fixture `18257739`.
- Confirmar no runtime se o payload live retorna `proof_refs` e `validation` como esperado.
- Registrar evidencia final do `proof_ref` real no produto e no memo.
- Fechar Fase 4:
  - repo publico/acesso avaliador
  - video de demo
  - submissao Superteam
  - confirmacao oficial sobre aceitacao de Devnet

---

## Recomendacao imediata

1. Continuar rodando `python3 scripts/check_txline_live_fixture.py` ate o fixture sair de `GameState = 1`.
2. No primeiro snapshot live, verificar:
   - `proof_refs` preenchido
   - `validation` preenchido
   - `on_chain_validation.method = validateStatV2.view`
3. Assim que isso acontecer, capturar evidencia de tela + JSON e fechar o pacote de submissao.

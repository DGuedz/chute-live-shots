# Plano seguro — TxLINE ao vivo + prova de validação on-chain

**Criado em:** 2026-07-18 · **Prazo de submissão Superteam Earn:** 2026-07-19 (amanhã) · **Anúncio dos vencedores:** 2026-07-29
**Trilha:** Consumer & Fan Experiences — TxODDS World Cup Hackathon ($16K)
**Contexto crítico:** o editorial do produto já aponta a final Espanha × Argentina para **19/07/2026**, o mesmo dia do prazo de submissão. O jogo real e o deadline coincidem.

---

## 0. Onde estamos agora (diagnóstico, não é tarefa)

| Peça | Estado real | Evidência |
|---|---|---|
| Quiz preditivo (Argentina/Espanha, 3 tiers) | ✅ Funcionando, dados reais TxOdds histórico | `data/wc2026-player-stats.json`, testado ponta a ponta |
| Leitura editorial pré-jogo | ✅ Corrigida (bug de fixture resolvido) | `apps/api/app/main.py::fixture_insights` |
| Resolução do quiz contra evento real | ✅ **Já está implementada**, só falta dado ao vivo entrando | `apps/api/app/main.py::predictive_quiz_progress` já lê `latest_snapshot()` e faz scoring real via `prediction_resolver.score_prediction_quiz` |
| Worker TxLINE (sync automático) | ❌ Desligado | `.env:20` → `TXLINE_AUTOSYNC=false`; poller já teve `enabled:false`, `trackedFixtures:[]` confirmado ao vivo |
| Prova de validação on-chain (proofRefs / onChainValidation) | ⚠️ Existe no formato do envelope (`validation.proofRefs`, `validation.onChainValidation.method: "validateStatV2.view"`), mas **não é repassada** para o participante nem para o memo Solana | `data/txline-replay-snapshot.json`, `predictive_quiz_progress` não inclui esses campos na resposta |
| Settlement on-chain do CHUTE | ⚠️ Memo simples (hash do resultado), sem citar a prova TxLINE | `apps/web/src/solana-anchor.ts::buildPredictiveMemo` |

**Conclusão:** a arquitetura para "TxLINE como fonte primária + prova on-chain" já existe no código. Não precisamos construir do zero — precisamos **ligar** o que está desligado e **expor** o que já é calculado mas fica escondido. Isso é o que torna esse plano seguro: baixo risco, mudanças pequenas e isoladas.

---

## Princípios de segurança deste plano

1. **Nunca quebrar o que já funciona.** O quiz preditivo com dados históricos TxOdds continua funcionando mesmo se a Fase 1 falhar — o código já tem fail-closed (`MISSING_DATA` em vez de inventar dado).
2. **Uma mudança por vez, testável isoladamente.** Cada fase tem um comando de verificação antes de passar para a próxima.
3. **Reversível.** Toda mudança de config é uma variável de ambiente (flip fácil de desligar). Toda mudança de código é um diff pequeno e localizado.
4. **Sem tocar em Mainnet.** Tudo continua em Devnet até o fim deste plano — mudar de rede é uma decisão separada, fora de escopo aqui.
5. **Prazo real:** cortar qualquer fase que não fechar até amanhã. A ordem abaixo já está priorizada para isso — pare em qualquer checkpoint e o produto continua submetível.

---

## Fase 1 — Ligar o sync ao vivo da TxLINE (30–45 min)

**Objetivo:** o worker passa a puxar fixtures e placares reais da TxLINE automaticamente, sem precisar configurar fixture por fixture (o poller já descobre sozinho quais jogos estão "score-worthy").

**Passos:**
1. `apps/txline-worker/.env` (ou `.env` raiz usado pelo worker): trocar `TXLINE_AUTOSYNC=false` → `true`.
2. Reiniciar o worker: `cd apps/txline-worker && npm run dev` (ou restart do processo já rodando).
3. Verificar: `curl http://127.0.0.1:8000/api/txline/status` → esperar `poller.enabled: true` e, após 1 ciclo (até 10 min, ou forçar um sync manual se houver endpoint de trigger), `trackedFixtures` não-vazio.
4. **Checkpoint de segurança:** se o worker falhar (token expirado, rate limit), o `consecutiveFailures`/`backoffMs` do poller já isolam o erro — a API e o quiz preditivo continuam respondendo normalmente com os dados estáticos. Não há modo de falha que derrube o app.

**Risco identificado:** o token TxLINE (`TXLINE_API_TOKEN`) ativado nos dias anteriores pode ter expirado ou ter rate limit por transação (já vimos esse erro antes: "Activation request is already processing"). Se o sync falhar por auth, **não reativar o token repetidamente** — checar `lastError` no status primeiro.

---

## Fase 2 — Reconciliar o fixture real da final (15–20 min)

**Objetivo:** confirmar que o ID numérico que a TxLINE usa para "Espanha × Argentina — Final" é o mesmo que nosso alias `argentina-spain` resolve. Hoje isso é uma suposição, não um fato verificado.

**Passos:**
1. Com o sync ativo, checar `GET /api/fixtures` (lista persistida) e procurar a entrada com `Participant1`/`Participant2` = Spain/Argentina e a data mais próxima de 19/07/2026.
2. Comparar esse `FixtureId` real com o que está hardcoded em `apps/api/app/snapshot_builder.py::REPLAY_ALIASES` (hoje aponta para `18179551`, que é Espanha × Áustria — **não** a final).
3. **Se o ID real da final for diferente:** criar um alias novo e explícito (`FINAL_FIXTURE_ID` ou similar) em vez de reaproveitar `REPLAY_ALIASES`, para não misturar o fixture de demo/replay com o fixture real da final. Isso é o ponto mais delicado do plano — errar aqui faz o app resolver o placar errado silenciosamente.
4. **Checkpoint de segurança:** enquanto o ID real não estiver confirmado, `predictive_quiz_progress` continua retornando `snapshot_pending` (fail-closed) em vez de inventar um resultado. Não há regressão possível, só ausência de dado.

---

## Fase 3 — Expor a prova de validação on-chain (20–30 min)

**Objetivo:** o critério da trilha ("TxLINE cronometra cada pacote de dados on-chain, trilha de auditoria tamper-evident") precisa aparecer no produto, não só existir nos bastidores.

**Passos (backend, `apps/api/app/main.py::predictive_quiz_progress`):**
1. Ler `snapshot_data.get("validation", {})` já disponível na função.
2. Adicionar ao retorno JSON: `"proof_refs": validation.get("proofRefs", [])` e `"on_chain_validation": validation.get("onChainValidation")`.
3. Isso é aditivo — nenhum campo existente muda, só novos campos aparecem na resposta. Zero risco de quebrar o frontend atual.

**Passos (frontend, `apps/web/src/solana-anchor.ts::buildPredictiveMemo` + `apps/web/src/main.tsx`):**
4. Estender `buildPredictiveMemo` para aceitar `proof_ref` opcional e incluir no texto do memo (ex.: `proof:{proofRef}` truncado, memos Solana têm limite de tamanho — usar só a referência curta, não a URL inteira).
5. Na tela de resultado (`screen==='result'`), passar `predictiveProgress.proof_refs?.[0]` para `buildPredictiveMemo`.
6. **Checkpoint de segurança:** se `proof_refs` vier vazio (dado ainda não chegou), o memo cai no formato atual sem quebrar — comportamento idêntico ao que já temos hoje.

---

## Fase 4 — Checklist de submissão (antes de 19/07)

Não é código, é processo — mas é parte do "próxima etapa" e evita perder o prazo por burocracia:

- [ ] Repositório público no GitHub (ou acesso liberado para o e-mail de avaliação do Superteam, conforme regra geral de hackathons Superteam)
- [ ] README atualizado explicando: como o TxLINE entra como fonte primária, onde está a prova on-chain, como rodar localmente
- [ ] Vídeo de demo curto e direto (Kaue recomendou objetividade nos primeiros segundos)
- [ ] Link de submissão: https://superteam.fun/earn/listing/consumer-and-fan-experiences/
- [ ] Confirmar se a build precisa estar em Mainnet ou se Devnet é aceito para esta trilha (checar com https://t.me/TxLINEChat se houver dúvida — não assumir)

---

## O que este plano **não** faz (fora de escopo, de propósito)

- Não migra para Mainnet.
- Não implementa `validate_stat`/`insert_scores_root` no nosso próprio programa — essas instruções são do programa da TxODDS; nosso papel é **referenciar** a prova deles, não publicá-la.
- Não altera o fluxo de UX já validado (zero fricção, wallet sticky, quiz sem trava de tempo) — todas essas mudanças ficam intocadas.

---

## Ordem de execução recomendada

**Fase 1 → verificar → Fase 2 → verificar → Fase 3 → verificar → Fase 4.**

Se o tempo apertar, o corte seguro é: **Fase 1 + Fase 4 são o mínimo defensável** (dado ao vivo ligado + submissão organizada). Fases 2 e 3 são o que eleva a nota do critério "TxLINE como trilha de auditoria on-chain", mas o produto já é submetível sem elas.

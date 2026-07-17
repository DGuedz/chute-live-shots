# CHUTE Quiz Engine Skills

O moat do CHUTE é a cadeia auditável que transforma dados esportivos em um quiz competitivo:

```text
TxLINE → curadoria → perguntas → opções probabilísticas → snapshot → respostas → score → prova Solana
```

As skills locais estão em `.agent/skills/` e seus contratos em `.agent/contracts/`.

## Ordem canônica

1. `txline-stat-curator`
2. `quiz-question-generator`
3. `probability-option-generator`
4. `quiz-snapshot-locker`
5. `quiz-score-engine`
6. `txline-solana-proof-settler`

`chute-quiz-orchestrator` coordena a cadeia e bloqueia transições inseguras.

## Fonte de verdade

TxLINE é a autoridade para fixture, estatísticas, eventos e provas. Fixtures locais são permitidas apenas em `DRY_RUN` e devem retornar `data_status=mock_fixture`.

## Interação

O Telegram recebe somente a pergunta atual. A resposta é persistida com idempotência antes da revelação da próxima pergunta. O snapshot contém métricas, opções, versão do modelo, timestamp e referências de evidência.

## Solana

O uso inicial é devnet e dry-run. Tokens, JWTs e API tokens permanecem no backend/worker. Settlement exige prova TxLINE válida, correspondência de rede/programa e aprovação explícita.

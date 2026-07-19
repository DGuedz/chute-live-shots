# Roadmap — Bolão Pago On-chain (feat futura, NÃO é escopo da submissão)

**Data:** 2026-07-19
**Status:** roadmap aprovado pelo founder; validação atual usa apenas quizzes criados pelo CHUTE, sem dinheiro real.

## Filosofia

Se aconteceu em campo, virou dado. O dado vira pergunta; a pergunta vira chute; o chute
vira registro on-chain. O user pensa no futuro com base no histórico, marca sua predição,
assina com a wallet — e o jogo real responde, chute a chute, em tempo real via TxLINE/TxOdds (SL12).
Abstraímos toda a complexidade em uma palavra: **CHUTE**.

## Economia do pote (modelo de referência)

| Parâmetro | Valor |
|---|---|
| Vagas por quiz | 50 wallets (1 entrada por wallet — anti-sybil) |
| Preço por chute (predição) | US$ 1 |
| Chutes por quiz | 5 → entrada = US$ 5 |
| Pote cheio | 50 × US$ 5 = **US$ 250** |
| Taxa da plataforma | 10% → US$ 25 |
| Pote líquido | US$ 225 |

**Distribuição (top 3 por pontuação):**
- 1º lugar: 50% do pote líquido → US$ 112,50
- 2º lugar: 30% → US$ 67,50
- 3º lugar: 20% → US$ 45,00

**Critério de vitória:** 100% de acertos; se ninguém cravar, vence quem mais se aproximou.
**Desempates (nesta ordem):** (1) maior pontuação ponderada pelas odds (zebra certa vale mais
que óbvio certo — coragem paga); (2) timestamp da assinatura on-chain (quem chutou antes leva).

## Fluxo do usuário (o "grupo de amigos")

1. Acessa chute.xyz → vê as oportunidades abertas (quizzes com vagas e pote atual).
2. Conecta Phantom / Solflare / Backpack (zero fricção para o nativo cripto).
3. Entra no quiz, lê os dados mastigados, faz 5 predições guiadas pelas odds.
4. Assina o conjunto de predições com a wallet → o "bilhete" É a wallet;
   recibo digital com link do explorer (carimbo on-chain da predição).
5. Acompanha em dashboard gráfico ao vivo: cada chute que "bate" acende em tempo real
   (TxLINE SL12 alimenta a resolução pergunta a pergunta).
6. Fim de jogo → ranking do quiz fecha, top 3 recebem a parte do pote.

## Blocos técnicos necessários (quando a feat entrar)

- **Escrow do pote:** programa Solana (ou custódia intermediária na fase 1) recebendo USDC;
  release automático para top 3 após snapshot final assinado da TxLINE.
- **Bilhete on-chain:** já existe a base — memo `CHUTE-PRED|fixture|snapshot|hash|score`;
  evolui para incluir `pool_id` e a taxa.
- **Resolução ao vivo:** endpoint `/api/predictions/{quiz}/progress` já resolve pergunta a
  pergunta contra snapshot; falta o push (SSE/WebSocket) para o dashboard acender em tempo real.
- **Anti-sybil:** 1 entrada por wallet por quiz (constraint no backend + verificação de assinatura já existente).
- **Quiz de criador (fase seguinte):** `POST /api/quizzes` parametrizado; criador define
  perguntas sobre os índices TxLINE, ganha % da taxa; CHUTE fica com o restante.
  Reputação on-chain do criador = histórico de memos.

## O que fica FORA da validação atual (decisão explícita)

- Sem pagamento, sem pote, sem premiação (landing e recibo já dizem "paper · sem premiação").
- Só quizzes criados pelo CHUTE.
- Prioridade: landing única PT/EN sem jargão + wallet + entrar no quiz + assinar + recibo.

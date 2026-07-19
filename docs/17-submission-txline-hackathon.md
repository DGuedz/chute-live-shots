# CHUTE — Submissão · Consumer and Fan Experiences (TxODDS / Superteam Earn)

> Prazo: 19 jul 2026, 23:59 UTC · Anúncio: 29 jul 2026
> Requisitos eliminatórios: vídeo demo (≤5 min), link funcionando, repo público, doc técnico, feedback da API.

## 0. Atualização mainnet (2026-07-19)

Desde a versão original deste documento, o CHUTE deixou de ser só devnet:

- **Assinatura TxLINE mainnet real** (SL12, tempo real, tier gratuito da Copa) — `subscribe` on-chain
  confirmado + token de API ativado, dados reais de 48 seleções puxados e conferidos.
- **Âncora de prova em mainnet-beta real** (Memo program), transação confirmada e finalizada.
- Detalhes, hashes de transação e passo a passo reprodutível: `.AGENTS/PRONTIDAO-MAINNET-2026-07-19.md`
  e `scripts/txline-mainnet/`.

O restante deste documento (fluxo devnet/replay) permanece válido como caminho garantido de demo.

## 1. Ideia central (one-liner)

**CHUTE transforma a leitura estatística do torcedor em um jogo de 5 decisões com recibo verificável.**
O fã lê os sinais TxLINE da partida, escolhe um tier (Gols, Escanteios, Cartões),
responde 5 perguntas com probabilidade/odd explícitas e sai com um recibo criptográfico —
snapshot congelado + content hash + prova Merkle ancorada no programa TxLINE na Solana.

Diferencial vs. as ideias-exemplo do edital: não é um feed reempacotado nem um palpite cego —
é *leitura provável auditável*. A zebra paga mais porque a probabilidade de cada opção é declarada
antes do chute, e o resultado só pode vir de snapshot TxLINE verificado (fail-closed em MISSING_DATA).

## 2. Como o TxLINE alimenta o backend (endpoints usados)

| Endpoint TxLINE | Uso no CHUTE |
| --- | --- |
| `POST /auth/guest/start` | Sessão guest (JWT 30 dias) criada no backend — token nunca chega ao browser |
| `GET /api/fixtures/snapshot?competitionId&startEpochDay` | Sync de fixtures da Copa → SQLite (`fixtures`) |
| `GET /api/scores/snapshot/{fixtureId}` | Snapshots de score → SQLite (`match_snapshots`) |
| `GET /api/scores/stat-validation?fixtureId&seq&statKeys` | Prova Merkle dos stats usados no quiz (proofRefs no recibo) |
| `validateStatV2.view` (Program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`, devnet) | Validação on-chain do stat key ancorado no recibo |

Pipeline: worker Node (`apps/txline-worker`, polling opcional com backoff + telemetria)
→ `POST /internal/txline/*` (protegido por service token) → SQLite → FastAPI → DApp React/Telegram.

## 3. Como a Solana entra ("sign up through Solana")

- **Autenticação por assinatura, não só connect**: nonce servido por `/api/wallet/challenge`,
  assinado via Phantom `signMessage`, verificado ed25519 (PyNaCl) no servidor. Sessão só existe
  com posse provada da wallet.
- **Prova ancorada**: o recibo referencia a validação `validateStatV2.view` no programa TxLINE devnet.
- Modo explícito **paper/devnet — sem premiação nem settlement** (compliance nota do edital).

## 4. Mapeamento nos critérios de julgamento

| Critério | Como o CHUTE responde |
| --- | --- |
| Fan Accessibility & UX | Telegram Mini App mobile-first; intro cinematográfica; leitura de sinais em cards; 1 pergunta por vez com haptics; odds em linguagem de torcedor (zebra/acessível) |
| Real-Time Responsiveness | Worker com polling TxLINE (fixtures 10 min, scores 60 s) + pulso ao vivo na tela de match (poll 20 s do snapshot persistido, sequência exibida) |
| Originality & Value | "Leitura provável com recibo verificável" — probabilidade declarada antes do chute; zebra paga 3.5×; ranking por tier |
| Commercial Path | Free-to-play com stake paper US$1 → caminho natural: entrada paga por rodada, tiers premium por pacote de dados, rake de liga entre amigos; a prova on-chain é o diferencial anti-fraude para operar com dinheiro real |
| Completeness | Fluxo E2E funcional: fixture → leitura → tier → 5 respostas persistidas → recibo → ranking durável (sobrevive a restart). `verify_e2e.py` com 29 provas, worker com 7 testes + build verde, web build verde |

## 5. Roteiro do vídeo (4 min — eliminatório)

1. **0:00–0:30 · Problema**: "Todo torcedor palpita. Nenhum consegue provar que leu o jogo certo."
2. **0:30–1:00 · Entrada**: site → Telegram → intro → home com fixtures TxLINE reais (badges honestos).
3. **1:00–2:00 · Leitura + tier**: abrir a final Espanha × Argentina → sinais (ataque Argentina/defesa Espanha/Messi/Rodri) → mostrar tier travado fail-closed → trocar para o fixture replay validado → 3 tiers abertos.
4. **2:00–3:00 · Jogo**: conectar Phantom (mostrar a assinatura do nonce!), jogar o tier Escanteios: 5 perguntas, probabilidade/odd visíveis, escolher uma zebra.
5. **3:00–3:40 · Recibo + confiança**: recibo com snapshot ID, content hash, proof ref TxLINE, rede devnet/paper; **reiniciar a API ao vivo** e mostrar o ranking idêntico (durabilidade).
6. **3:40–4:00 · Fechamento**: "Mesma arquitetura, do replay ao ao-vivo: o TxLINE publica, o CHUTE congela, a Solana prova."

## 6. Feedback sobre a API TxLINE (campo do formulário)

**O que funcionou bem:** schema JSON único e consistente entre fixtures e scores tornou o normalizador
trivial; o guest session de 30 dias simplificou o onboarding devnet; a stat-validation com Merkle proof
+ `validateStatV2.view` é o recurso mais diferenciado — permite recibo verificável sem operar infraestrutura própria.

**Fricções encontradas:** (1) mapear os stat keys numéricos (1, 1001, 2001…) exigiu engenharia reversa —
uma tabela de dicionário no docs resolveria; (2) o snapshot de score usa `Participant1/Participant2`
enquanto fixtures usam nomes — um campo de join explícito ajudaria; (3) não encontramos endpoint de
lista de competições com epochDay de referência, o que tornou a descoberta de fixtures manual no início.

## 7. Checklist de submissão

- [ ] Vídeo ≤5 min gravado (roteiro acima) — Loom/YouTube
- [ ] Deploy HTTPS estável (link do formulário) — apontar Mini App do Telegram para ele
- [ ] Repo público (limpar segredos; `.env.example` já saneado)
- [ ] Este doc como "Brief Technical Documentation"
- [ ] Campo feedback preenchido com a seção 6
- [ ] Formulário Superteam Earn — track Consumer and Fan Experiences

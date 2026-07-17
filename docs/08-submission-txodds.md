# CHUTE · Submissão — TxODDS World Cup Hackathon (Consumer and Fan Experiences)

**Deadline: 19 jul 2026 · 23:59 UTC**

## Core idea (para o formulário)

CHUTE é um Mini App do Telegram onde o torcedor "lê" a partida com dados verificados TxLINE e transforma a leitura em 5 chutes por tier (chutes a gol, escanteios, faltas & cartões). Cada rodada gera um resultado auditável: snapshot congelado, content hash, proof reference TxLINE — e o jogador pode ancorar a prova do próprio placar on-chain (Solana, transação Memo assinada pela wallet). É a camada social/humana do TxLINE: dado verificável vira disputa, ranking e ritual de matchday.

## Diferenciais frente aos critérios

- **Fan Accessibility & UX** — 100% dentro do Telegram (/start → Mini App), haptics, mobile-first, modo replay garantido para demo.
- **Real-Time Responsiveness** — worker TxLINE sincroniza snapshots; a UI faz live pulse (poll a cada 20s) e o modo preditivo resolve respostas contra atualizações TxLINE em tempo quase real.
- **Originality** — quiz probabilístico com odds auditáveis derivadas do feed + prova on-chain do resultado do fã (não é repackaging de feed).
- **Monetization path** — stake paper de US$1 por chute hoje; caminho claro para stakes reais/settlement via Solana + tiers premium de dados.
- **Completeness** — fluxo fechado: bot → Mini App → wallet verificada (ed25519) → quiz → ranking → prova on-chain com link do Explorer.

## Endpoints TxLINE usados

| Endpoint | Uso |
|---|---|
| `POST /auth/guest/start` | Sessão guest JWT (worker e backend `/api/txline/guest`) |
| `GET /fixtures/snapshot` | Descoberta de fixtures da Copa |
| `GET /scores/{fixtureId}` | Score/eventos ao vivo → snapshots congelados no SQLite |
| `GET /proofs/{proofRef}` | Proof reference / Merkle proof do snapshot |
| `POST /api/token/activate` | Ativação de token (fluxo SL12, mainnet, dry-run) |
| Program ID devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | `validateStatV2.view` — validação Merkle do stat key |

## Stack Solana

- Verificação de posse da wallet: challenge nonce + `signMessage` ed25519, verificada no backend (PyNaCl).
- Multi-wallet: Phantom, Solflare, Backpack; sessão persistida; toggle devnet/mainnet.
- Saldo via RPC `getBalance`; ancoragem de prova via Memo program (`signAndSendTransaction`).

## Provas de eficiência (reproduzíveis pelos jurados)

Rodada completa em 2026-07-17 — tudo verde:

| Prova | Comando | Resultado |
|---|---|---|
| API (pytest) | `cd apps/api && PYTHONPATH=. python3 -m pytest -q` | 22 passed |
| Frontend Solana (vitest) | `npm test` | 14 passed (memo, Explorer, redes, fallback signTransaction, erros, persistência) |
| Worker TxLINE | `cd apps/txline-worker && npm test` | 2 passed |
| Replay determinístico | `python3 scripts/verify_demo.py` | score 634 · `txline_replay_proof_validated` |
| **E2E sem mocks** | `python3 scripts/verify_e2e.py` | **26 provas** — API real + banco efêmero: replay 5/5 → ranking, preditivo 5/5 → breakdown resolvido contra snapshot TxLINE, memos on-chain no formato documentado, wallet ed25519 real (assinatura válida aceita; adulterada e replay de nonce → 401) |
| Build web | `npm run build` | ✓ (web3.js em chunk lazy) |

Bugs reais encontrados e corrigidos por essas provas: progress preditivo lia campo inexistente (`payload_json` vs `payload`), parse de `quiz_id` quebrava com fixture hifenizado, e alias de fixture não era resolvido para o id numérico TxLINE — cada um agora coberto por teste de regressão (`apps/api/tests/test_predictive_progress.py`).

## Prova on-chain real (devnet)

Transação Memo confirmada na devnet em 2026-07-17, ancorando a prova do resultado replay com o content hash TxLINE:

- **Assinatura**: `5xN6h8uDD3igxpkEsHuekv2wK8dKa8dxzVH6MSsEUtsQsTnhSXfP1DnE6wJp7gaBeRy3xpNk3zpnCXxjxjoRmxF8`
- **Explorer**: https://explorer.solana.com/tx/5xN6h8uDD3igxpkEsHuekv2wK8dKa8dxzVH6MSsEUtsQsTnhSXfP1DnE6wJp7gaBeRy3xpNk3zpnCXxjxjoRmxF8?cluster=devnet
- **Slot**: 477016879 · sem erro · log do Memo program registra o payload integral:
  `CHUTE|18179551|txline-replay-18179551-892|sha256:267abbc4…c2dc|score:634`
- **Payer**: `2p7atbV7QnSV11zbBHrHskdFUBv2bir2aNfm3fNxLWBo` (wallet devnet do projeto)
- Reproduzível: `node scripts/anchor_memo_devnet.mjs` (mesmo payload do botão "Ancorar prova on-chain" do app)

## Checklist de submissão

- [ ] **Demo video ≤5 min** (obrigatório p/ triagem): problema → /start no Telegram → leitura do jogo → 5 chutes → resultado + ranking → ancorar prova on-chain + Explorer → mostrar worker TxLINE sincronizando.
- [ ] **Link deployado** (web app HTTPS + API acessível para os jurados).
- [ ] **Repo público** (verificar se este repo está público / criar mirror).
- [ ] Doc técnica: este arquivo + README.
- [ ] Feedback TxLINE no formulário (abaixo).

## Feedback TxLINE (rascunho para o formulário)

**Gostamos:** schema JSON único e normalizado entre competições — o mesmo worker serve replay e Copa sem mudança de código; guest JWT de onboarding zero-fricção; proof references Merkle que permitem produto "fail-closed" (sem snapshot verificado, sem quiz).

**Fricções:** (completar com a experiência real) latência/paginação do endpoint de scores; documentação dos stat keys para `validateStatV2`; fluxo de ativação de token SL12 exige aprovação manual, difícil de demonstrar em hackathon.

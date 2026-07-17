# CHUTE

Jogo mobile de torcida para leituras e previsões de futebol verificáveis.

## Ideia

Antes do jogo, o usuário lê sinais históricos do TxLINE, responde cinco perguntas e disputa o ranking com a torcida. O resultado e a prova são verificáveis na Solana.

O nome é literal e emocional: o CHUTE é o palpite do torcedor. A experiência deve ser simples, imersiva e demonstrável em poucos minutos.

## Status

Fluxo-herói P0 verificável fechado (2026-07-17):

- Quiz montado de snapshots persistidos no SQLite (`match_snapshots`), nunca de arquivo estático; o replay validado é semeado no banco na inicialização da API.
- Snapshot **congelado por participante** (`quiz_sessions`) no primeiro acesso: pontuação sempre contra o `content_hash` travado.
- 5 perguntas, 4 opções mutuamente exclusivas, cada opção com `probability`/`odd`/`risk` auditáveis (priors Poisson, independentes do resultado). Zebra paga mais.
- Ranking reconstruído do banco — sobrevive a restart da API; ordenação numérica (score, exatos, erro, tempo).
- Phantom com **assinatura obrigatória**: nonce (`/api/wallet/challenge`) + verificação ed25519 no servidor.
- Prova honesta: `txline_replay_proof_validated` / `txline_snapshot_unverified`; rede sempre rotulada `devnet · paper (sem premiação)`. Fixtures sem snapshot são fail-closed (`MISSING_DATA`).
- Worker TxLINE com polling automático opcional (`TXLINE_AUTOSYNC=true`) com backoff exponencial e telemetria em `/txline/status`.
- Rotas internas `/internal/txline/*` protegidas por `CHUTE_SERVICE_TOKEN` (obrigatório fora do dev local).

## Reprodução local

Pré-requisitos: Python 3.11+, Node 20+.

```bash
# 1. Dependências
pip install -r apps/api/requirements.txt
npm install

# 2. API (semeia o replay no SQLite na subida)
cd apps/api && python3 -m uvicorn app.main:app --port 8000

# 3. Web (em outro terminal)
npm run dev --workspace apps/web   # http://localhost:5173

# 4. (Opcional) Worker TxLINE devnet — requer credenciais em variáveis de ambiente
cd apps/txline-worker && npm start  # TXLINE_AUTOSYNC=true liga o polling
```

Teste do jurado: abra a web, escolha o fixture `REPLAY VALIDADO`, conecte a Phantom (assinatura de nonce), responda as 5 perguntas, veja o recibo (snapshot congelado + prova), **reinicie a API** e confira que recibo e ranking voltam idênticos.

### Verificações

```bash
cd apps/api && python3 -m pytest tests/ -q          # 16 testes, banco efêmero
cd apps/txline-worker && npm test && npm run build  # 2 testes
npm run build --workspace apps/web
python3 scripts/verify_demo.py
```

## Endpoints principais

| Endpoint | Descrição |
| --- | --- |
| `GET /api/fixtures` | Fixtures persistidos + estado do snapshot (badge honesto) |
| `GET /api/quizzes/{fixture_id}` | Metadados do quiz do fixture (404 `MISSING_DATA` se sem snapshot) |
| `GET /api/quizzes/{fixture_id}/current` | Pergunta atual; congela o snapshot na 1ª chamada |
| `POST /api/quizzes/{fixture_id}/answers` | Resposta idempotente (`request_id`) validada contra a pergunta atual |
| `GET /api/quizzes/{fixture_id}/ranking` | Ranking durável reconstruído do SQLite |
| `POST /api/wallet/challenge` → `POST /api/wallet/session` | Nonce + assinatura ed25519 da Phantom |
| `POST /internal/txline/{fixtures,snapshots}` | Ingestão do worker (exige `X-Chute-Service-Token` quando configurado) |

Variáveis de ambiente: ver [.env.example](.env.example) (nunca commitar valores). Config sensível local do worker fica em `~/.config/chute/`, fora do repositório.

## Escopo V0

- Uma partida por vez.
- Uma família de mercado: finalizações/chutes a gol.
- Variáveis iniciais: total de finalizações, finalizações no alvo, intervalo de minutos e time.
- Devnet primeiro.
- Wallet + autenticação TxLINE no backend.
- Mercado paper/escrow com settlement demonstrável.
- Quiz social com envelope de prova CHUTE, referência TxLINE e rastreabilidade Solana.

Fora do escopo: múltiplas modalidades, narrador, social graph, múltiplos feeds esportivos, mainnet com dinheiro real e três tracks simultâneas.

## Documentos

- [Visão do produto](docs/01-product-brief.md)
- [Escopo e critérios de aceite](docs/02-scope-and-acceptance.md)
- [Arquitetura mobile](docs/03-mobile-architecture.md)
- [Contrato TxLINE](docs/04-txline-contract.md)
- [Envelope de prova](docs/06-proof-envelope.json)
- [Fontes citadas](docs/07-cited-sources.md)
- [Relatório de prontidão](.AGENTS/RELATORIO-PRONTIDAO-HACKATHON.md)

## Demo reproduzível (replay)

O caminho garantido usa o replay TxLINE congelado em `data/txline-replay-snapshot.json`, semeado no SQLite na subida da API.

```bash
python3 scripts/verify_demo.py
npm run build --workspace apps/web
```

O replay registra `fixtureId`, sequência de score, timestamp, proof reference e `contentHash`. A Merkle proof do stat key `1` foi validada via `validateStatV2.view` no Program ID TxLINE devnet. O resultado é paper/devnet: a proof está validada, mas não há payout ou settlement financeiro.

## Bot Telegram (/start)

Bot de long-polling sem dependências que responde `/start` com o botão do Mini App:

```bash
TELEGRAM_BOT_TOKEN=<token do BotFather> WEBAPP_URL=https://seu-host python3 apps/bot/bot.py
```

`WEBAPP_URL` precisa ser HTTPS para o botão `web_app` abrir dentro do Telegram; sem HTTPS o bot cai para um link comum.

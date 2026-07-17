# CHUTE — Telegram Mini App Stack

## Decisão

O CHUTE será construído como Telegram Mini App com bot de entrada, backend seguro e settlement TON. O modo inicial é paper/dry-run.

## Contratos mínimos

- `Telegram.initData`: validação HMAC no backend; `initDataUnsafe` nunca é fonte de autorização.
- `SportsExecutionIntent`: `eventId`, `marketId`, `wallet`, `network`, `sourceTimestamp`, `receivedAt`, `requestedAction`, `amount`, `requestId`, `txlineProofRef`.
- `ProofEnvelope`: fonte TxLINE, decisão CHUTE, settlement e rastreabilidade Solana.

## Ordem de implementação

1. Mini App React/TypeScript e tema Telegram.
2. Bot, Main Mini App, menu button e deep links `startapp`.
3. Sessão Telegram validada no backend.
4. Mercado único de finalizações e TxLINE mock.
5. Policy CHUTE mock com `ALLOW/BLOCK/REVIEW`.
6. Idempotência, stale data e proof store.
7. TON Connect testnet e settlement paper.
8. TxLINE devnet real e settlement controlado.

Solana permanece fora do Mini App até existir uma decisão compatível com as regras do Telegram para blockchain.

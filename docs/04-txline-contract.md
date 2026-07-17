# Contrato TxLINE

## Fonte canônica

TxLINE é a fonte de verdade para fixtures, odds, scores/eventos e provas de validação. Outras fontes podem enriquecer texto ou UX, mas não podem decidir o resultado do mercado.

## Ambiente inicial

- Rede: devnet
- API host: `https://txline-dev.txodds.com`
- API base: `https://txline-dev.txodds.com/api`
- Programa: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
- Serviço inicial: nível `1`, conforme a matriz atual de devnet

## Autenticação

1. Criar/submeter subscription na rede correta.
2. `POST /auth/guest/start`.
3. Assinar `${txSig}:${leagues}:${jwt}` com a mesma wallet.
4. Enviar assinatura Base64 a `/api/token/activate`.
5. Usar `Authorization: Bearer <jwt>` e `X-Api-Token: <apiToken>` nas consultas.

Não hardcodar endpoints, headers ou tier fora da documentação canônica.

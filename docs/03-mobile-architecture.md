# Arquitetura mobile

## Camadas

`Mobile UI -> CHUTE API -> TxLINE adapter -> decision/market engine -> Solana settlement -> proof store`

O mobile nunca recebe JWT de convidado nem API token ativado. A API do CHUTE mantém credenciais e normaliza os eventos.

## Telas V0

1. Home: partida ativa e status do feed.
2. Market: pergunta, linha, janela, timestamp e botão de posição.
3. Position: estado aberto, evento observado e resultado.
4. Proof: origem TxLINE, decisão, assinatura e settlement.

## Tecnologia proposta

React Native/Expo para a primeira experiência mobile; Node/TypeScript no backend; Solana devnet; armazenamento mínimo para mercados, posições e provas.

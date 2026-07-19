# Pedido de credencial mainnet — TxODDS

**Para enviar via:** o mesmo canal onde o token/JWT devnet foi obtido (Discord do
hackathon TxODDS/Superteam Earn ou suporte direto).
**Urgência:** deadline da submissão é hoje, 2026-07-19 23:59 UTC — improvável resposta
a tempo, mas vale enviar agora e mencionar na submissão como "credencial solicitada".

---

## Mensagem (PT)

> Olá! Somos o time do **CHUTE** (chute.xyz), participando do hackathon TxODDS ×
> Superteam Earn com integração TxLINE em devnet já funcional (fixtures, snapshots,
> resolução de quiz preditivo ao vivo via SL12).
>
> Gostaríamos de solicitar credencial de acesso **mainnet** para `txline.txodds.com`
> (confirmamos que o endpoint responde HTTP 401, ou seja, existe e aguarda auth) —
> mesmo tipo de token/JWT que já usamos em devnet. Objetivo: demonstrar a mesma
> integração de dados ao vivo (fixtures + snapshots + proof TxLINE) rodando contra
> a rede real, não apenas a âncora on-chain.
>
> Nosso token devnet atual: `[referenciar o e-mail/Discord onde foi obtido]`.
> Ficamos à disposição para qualquer verificação adicional do projeto.

## Message (EN)

> Hi! We're the **CHUTE** team (chute.xyz), competing in the TxODDS × Superteam Earn
> hackathon with a working TxLINE devnet integration (fixtures, snapshots, live
> predictive quiz resolution via SL12).
>
> We'd like to request **mainnet** access credentials for `txline.txodds.com` (we
> confirmed the endpoint returns HTTP 401, so it exists and is waiting on auth) —
> the same kind of token/JWT we already use on devnet. Goal: demonstrate the same
> live data integration (fixtures + snapshots + TxLINE proof) running against the
> real network, not just the on-chain anchor.
>
> Our current devnet token was issued via: `[reference the email/Discord thread]`.
> Happy to provide any additional project verification.

---

## Se não houver resposta a tempo (plano B, já em execução)

Não bloqueamos a submissão nisso. Em paralelo:

1. ✅ Keypair mainnet gerada localmente (`scripts/generate_mainnet_keypair.mjs`) —
   endereço público: **fundear com SOL real** (~0.001 SOL cobre dezenas de memos).
2. ✅ Script de âncora mainnet pronto (`scripts/anchor_memo_mainnet.mjs`), com trava
   `CONFIRM_MAINNET_SPEND=yes` para não gastar por acidente.
3. Narrativa da submissão: **dados TxLINE provados ponta a ponta em devnet** +
   **âncora de prova real em mainnet-beta** (transação verificável no Explorer) +
   **credencial mainnet solicitada à TxODDS** (evidência do pedido, mesmo sem resposta
   ainda). Isso é honesto e demonstra prontidão real sem fabricar acesso que não temos.

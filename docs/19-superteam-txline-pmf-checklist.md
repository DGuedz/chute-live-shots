# CHUTE — checklist Superteam × TxODDS/TxLINE × PMF

Atualizado em 17/07/2026. Use este documento como checklist de submissão e como roteiro de validação final.

## 1. Requisitos eliminatórios do Superteam/TxODDS

- [x] Projeto público no GitHub: `https://github.com/DGuedz/chute-live-shots`.
- [x] Produto funcional, não mockup.
- [x] Link público do app: `https://chute-live-shots.vercel.app`.
- [x] API pública: `https://chute-api-production.up.railway.app`.
- [x] TxLINE como fonte primária do fluxo replay/preditivo.
- [x] Solana usada para conexão de wallet e ancoragem Memo em devnet.
- [x] Documentação técnica com ideia, destaques, endpoints TxLINE e feedback.
- [x] Testes de produção: `scripts/verify_prod.py` — 20/20.
- [ ] Vídeo público de até 5 minutos, com problema, app funcionando e TxLINE alimentando o backend.
- [ ] Submissão na trilha global **Consumer and Fan Experiences**.
- [ ] Submissão na listing regional **World Cup Hackathon Brasil**.
- [ ] Conferir equipe elegível, máximo de 3 pessoas, carteira e dados fiscais/pagamento no perfil Superteam.
- [ ] Revisar os termos do hackathon e o disclaimer de responsabilidade legal sobre betting/gaming/consumer protection.

Fontes: [trilha global](https://superteam.fun/earn/listing/consumer-and-fan-experiences), [trilha Brasil](https://superteam.fun/earn/listing/world-cup-hackathon-brasil), [hub do hackathon](https://superteam.fun/earn/hackathon/world-cup/).

## 2. Evidência obrigatória da demo

- [ ] Abrir a URL bonita `chute-live-shots.vercel.app`, não apenas o deployment temporário.
- [ ] Mostrar que o app não depende de localhost.
- [ ] Mostrar selo `REPLAY VALIDADO`/`DEVNET` e explicar honestamente o modo usado.
- [ ] Conectar Phantom em devnet e assinar o challenge.
- [ ] Jogar cinco perguntas sequenciais.
- [ ] Mostrar odds, risco e uma escolha zebra.
- [ ] Mostrar snapshot ID, content hash, proof ref, score e ranking.
- [x] Transação Memo real confirmada na Solana devnet via Plano B reproduzível.
- [ ] Clicar `Ancorar prova on-chain (devnet)` na Phantom para capturar a melhor cena de UX.
- [ ] Aprovar na Phantom — melhoria de demonstração, não bloqueio técnico.
- [x] Abrir o link do Solana Explorer e verificar a assinatura: `5xN6h8uDD3igxpkEsHuekv2wK8dKa8dxzVH6MSsEUtsQsTnhSXfP1DnE6wJp7gaBeRy3xpNk3zpnCXxjxjoRmxF8`.
- [x] Memo contém fixture, snapshot, content hash e score; payer devnet verificado por RPC.
- [ ] Mostrar rapidamente o worker/API ou documentação que explica a origem TxLINE.
- [x] URL da transação guardada como evidência de backup para o vídeo.

### Regra operacional da Vercel

Após todo `vercel deploy --prod`, executar imediatamente:

```bash
vercel alias set <deployment-url> chute-live-shots.vercel.app
```

Depois conferir o bundle servido e repetir `verify_prod.py`; aliases antigos podem não acompanhar o deploy automaticamente.

## 3. Checklist TxLINE/TxODDS

- [x] Endpoint de guest session documentado.
- [x] Endpoint de snapshot/fixtures documentado.
- [x] Endpoint de scores documentado.
- [x] Endpoint de proofs documentado.
- [x] Endpoint de ativação de token documentado, sem token no browser.
- [x] Snapshot congelado antes das respostas.
- [x] Content hash propagado até resultado e Memo.
- [x] Preditivo resolve contra snapshot persistido.
- [x] Dados faltantes falham fechados com `MISSING_DATA`.
- [x] Worker/API e frontend não expõem JWT ou API token.
- [ ] Confirmar no feedback da submissão quais endpoints foram mais úteis.
- [ ] Registrar fricções reais: autenticação, schema, campos ausentes, latência, SSE/polling e documentação.
- [ ] Sugerir melhoria concreta para TxLINE: exemplos de payload, SDK/typed schema, sandbox replay e mensagens de erro.
- [ ] Não chamar editorial/histórico de feed live.

## 4. PMF — hipótese e evidência mínima

### Hipótese principal

Torcedores querem uma experiência rápida, social e verificável para testar a leitura estatística de uma partida; o valor não é apostar, mas transformar contexto TxLINE em uma tese, pontuação, ranking e recibo on-chain.

### Segmentos prioritários

- Torcedor de Copa que já usa Telegram durante o jogo.
- Fã de fantasy/prediction games que entende odds e payoffs.
- Comunidades de futebol que precisam de um ranking rápido para watch party.
- Entusiastas Solana interessados em provar uma ação sem usar uma exchange.

### Experimentos antes/depois da submissão

- [ ] Testar com 5–10 torcedores sem explicar a interface.
- [ ] Medir tempo até a primeira pergunta.
- [ ] Medir conclusão dos 5 chutes.
- [ ] Medir compreensão de `replay`, `devnet`, `odd`, `zebra` e `content hash`.
- [ ] Medir quantos conectam a wallet sem ajuda.
- [ ] Medir quantos concluem a ancoragem.
- [ ] Perguntar se compartilhariam o resultado e por quê.
- [ ] Perguntar se voltariam para outra partida.
- [ ] Registrar frases literais e objeções, sem fabricar feedback.

### Sinais de PMF inicial

- Conversão visita → primeira pergunta: alvo ≥ 60%.
- Conclusão quiz 5/5: alvo ≥ 50%.
- Conexão wallet entre concluintes: alvo ≥ 30%.
- Ancoragem entre wallets conectadas: alvo ≥ 50%.
- Compartilhamento ou convite: alvo ≥ 20%.
- Intenção de retorno declarada: alvo ≥ 60%.

Esses números são metas internas de experimento, não dados observados nem promessa de mercado.

## 5. Mensagem de submissão

> CHUTE transforma dados TxLINE em uma disputa de leitura de jogo: o torcedor recebe contexto verificável, escolhe uma tese probabilística, acompanha a resolução e deixa um recibo da própria leitura na Solana.

Evitar dizer que o produto é uma plataforma de apostas ou que há prêmio/settlement real. O build atual é uma experiência de pontuação, ranking e prova em `replay/devnet`.

## 6. Critério final de aprovação

A submissão só está pronta quando:

1. as duas listings foram enviadas;
2. o vídeo tem até 5 minutos e mostra o fluxo completo;
3. o link bonito abre o build que aponta para a API Railway;
4. `verify_prod.py` passa novamente;
5. a transação Memo devnet existe no Explorer;
6. nenhum segredo aparece no repositório, vídeo, frontend ou logs;
7. a narrativa explica claramente o problema, o uso de TxLINE, a Solana e o valor para o fã.

## Status atual

**9,5/10 técnico.** Infraestrutura, validação pública e Memo devnet real estão verdes. O restante é vídeo, dupla submissão e coleta inicial de feedback/PMF; Phantom é agora uma melhoria de UX, não um gate eliminatório.

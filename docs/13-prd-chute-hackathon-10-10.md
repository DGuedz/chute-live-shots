# PRD — CHUTE TxLINE Matchday Quiz

Status: execução para hackathon  
Objetivo: maximizar aderência verificável à trilha Consumer and Fan Experiences, com camada opcional de proof/settlement em Solana devnet.

## 1. Visão

CHUTE é um Telegram Mini App de quizzes de futebol baseados em dados reais da TxLINE. O usuário escolhe uma categoria estatística, inspeciona o histórico e a distribuição provável, responde cinco perguntas uma por vez e acompanha a partida até o resultado ser validado por proof TxLINE.

Proposta:

> Transformar dados esportivos ao vivo em uma experiência de previsão social, verificável e divertida dentro do Telegram.

## 2. Resultado esperado

Um avaliador deve conseguir, sem intervenção do time:

1. abrir o Mini App;
2. escolher uma partida real ou replay válido do TxLINE;
3. escolher Finalizações, Escanteios ou Cartões Amarelos;
4. ver estatísticas, amostra, timestamp e fonte;
5. responder cinco perguntas sequenciais;
6. receber um bilhete com hash e requestId;
7. acompanhar eventos do jogo;
8. visualizar score, ranking e proof;
9. entender claramente quando o modo é replay, live, paper ou devnet.

## 3. Escopo do MVP

### Incluído

- Telegram WebApp SDK e layout mobile-first;
- Matchday com dois times, status, relógio, fonte e freshness;
- fixture TxLINE real ou replay oficial;
- três pacotes estatísticos;
- painel histórico com últimos jogos, médias, tendência e distribuição;
- cinco perguntas por pacote;
- uma pergunta visível por vez;
- snapshot imutável antes da primeira resposta;
- quatro opções com cobertura probabilística auditável;
- acerto exato e score por proximidade;
- recibo de participação;
- ranking por rodada e pacote;
- stream ou polling TxLINE para atualização ao vivo;
- proof envelope e validação Solana devnet;
- modo paper/devnet, sem dinheiro real;
- documentação, testes, replay e vídeo demo.

### Fora do MVP

- dinheiro real;
- token próprio;
- trading agent;
- odds externas para decidir respostas;
- escrow de produção;
- payout real;
- gol olímpico ou evento sem suporte explícito do feed;
- dependência obrigatória de Argentina × Espanha.

## 4. Categorias e perguntas

### Finalizações

- total de finalizações;
- finalizações de cada equipe;
- finalizações no alvo;
- equipe com mais finalizações;
- faixa de finalizações totais.

### Escanteios

- total de escanteios;
- escanteios da equipe A;
- escanteios da equipe B;
- escanteios no primeiro tempo;
- faixa mais provável.

### Cartões amarelos

- total de cartões;
- cartões da equipe A;
- cartões da equipe B;
- haverá cartão antes do intervalo;
- faixa mais provável.

Cada pergunta deve apontar para uma métrica, uma distribuição e uma evidência. Perguntas altamente correlacionadas devem ser rejeitadas pelo quality gate.

## 5. Verdade dos dados

Estados permitidos:

- `LIVE`: feed TxLINE atualizado;
- `REPLAY`: histórico TxLINE reproduzido;
- `PAPER`: participação sem valor financeiro;
- `DEVNET`: transação/proof em Solana devnet;
- `MOCK_FIXTURE`: somente desenvolvimento, nunca apresentado como dado oficial;
- `MISSING_DATA`: bloquear publicação do quiz.

Regras:

- TxLINE é a fonte primária para fixture, score, estatísticas e proof.
- Sem timestamp, fixture válido e referência de evidência, o quiz não publica.
- Não usar dados inventados para preencher ausência de feed.
- Não usar Argentina × Espanha se o fixture não estiver no feed.
- O snapshot precisa conter `snapshotId`, `contentHash`, `sourceTimestamp`, `fixtureId`, `modelVersion`, `dataStatus` e `proofRefs`.

## 6. Motor de quiz

Pipeline obrigatório:

```text
TxLINE adapter
→ curadoria estatística
→ quality gate
→ distribuição probabilística
→ perguntas e opções
→ snapshot lock
→ respostas idempotentes
→ score
→ proof
→ ranking
```

Critérios do motor:

- quatro opções por pergunta;
- cobertura probabilística mínima de 70%, salvo bloqueio explícito;
- zebra representa cauda real da distribuição;
- nenhuma opção deve ser manipulada para induzir erro;
- o modelo deve guardar versão e evidências;
- snapshot é imutável depois da primeira resposta;
- a próxima pergunta só aparece após persistência da resposta anterior.

## 7. Score e ranking

Score V0:

- acerto exato: 100 pontos;
- proximidade numérica: decaimento proporcional à distância;
- resposta categórica correta: 100 pontos;
- resposta categórica incorreta: 0 pontos;
- bônus de confiança somente se derivado da distribuição congelada;
- empate resolvido por maior número de acertos exatos, depois menor latência de envio.

O ranking deve exibir score, acertos exatos, proximidade agregada, snapshotId e status da prova. Nunca exibir “ganho” quando não houver settlement validado.

## 8. UX e telas

1. Intro CHUTE.
2. Matchday/filtro de partidas.
3. Seleção de pacote estatístico.
4. Painel de inteligência.
5. Quiz sequencial.
6. Bilhete fechado.
7. Live tracker.
8. Resultado e ranking.
9. Proof envelope.

O visual deve preservar a identidade já escolhida: futebol arcade premium, verde-lima, navy, laranja, tipografia pixel controlada e leitura rápida em tela pequena.

## 9. Arquitetura

- `apps/web`: Telegram Mini App React/TypeScript;
- `apps/api`: FastAPI, sessão, quiz, respostas, score e ranking;
- `apps/txline-worker`: Node/TypeScript, autenticação TxLINE, fixtures, scores, SSE e proofs;
- Solana devnet: validação/âncora demonstrável;
- armazenamento persistente para snapshots, respostas, scores e auditoria;
- secrets somente no worker/API;
- nenhum JWT ou API token no navegador.

## 10. Segurança e governança

- fail-closed em `MISSING_DATA`, `STALE_FEED`, `INVALID_PROOF` e `NETWORK_MISMATCH`;
- validação de Telegram initData no backend;
- idempotência por `requestId`;
- proteção contra dupla resposta e dupla liquidação;
- nenhuma chave privada armazenada pelo produto;
- wallet externa e opcional;
- paper/devnet por padrão;
- revisão legal antes de qualquer dinheiro real ou linguagem de aposta.

## 11. Critérios de aceitação

### Dados

- [ ] fixture real/replay TxLINE carregado;
- [ ] três categorias normalizadas;
- [ ] histórico e live snapshot disponíveis;
- [ ] timestamp e fonte exibidos;
- [ ] proofRef validável.

### Quiz

- [ ] cinco perguntas geradas a partir do snapshot;
- [ ] quatro opções por pergunta;
- [ ] coverage e distribuição registradas;
- [ ] uma pergunta por vez;
- [ ] snapshot bloqueado antes da primeira resposta;
- [ ] respostas idempotentes.

### Resultado

- [ ] score exato e proximidade calculados;
- [ ] ranking persistido;
- [ ] recibo reproduzível;
- [ ] proof envelope visível;
- [ ] settlement somente simulado/devnet.

### Submissão

- [ ] build funcional;
- [ ] testes verdes;
- [ ] README técnico;
- [ ] endpoints documentados;
- [ ] vídeo até cinco minutos;
- [ ] repo público;
- [ ] modo replay para demo;
- [ ] trilha Consumer and Fan Experiences selecionada.

## 12. Ordem de execução

1. Ativar TxLINE devnet com a carteira do operador.
2. Implementar busca e seleção de replay/fixture real.
3. Criar schema persistente do snapshot.
4. Normalizar os três pacotes.
5. Implementar análise visual antes do quiz.
6. Conectar perguntas e opções probabilísticas.
7. Implementar score, ranking e recibo.
8. Validar proof TxLINE/Solana.
9. Executar QA end-to-end no Telegram.
10. Gravar vídeo e publicar documentação.

## 13. Prompt mestre de execução

```text
Você é o agente principal do CHUTE. Trabalhe em /Users/doublegreen/mind_v2/chute.

Objetivo: elevar o CHUTE a um MVP de hackathon verificável na trilha Consumer and Fan Experiences.

Produto: Telegram Mini App de quiz de futebol baseado primariamente em TxLINE, com três pacotes — Finalizações, Escanteios e Cartões Amarelos —, painel histórico, quiz de cinco perguntas uma por vez, snapshot imutável, score por exatidão/proximidade, ranking e proof ancorada na Solana devnet.

Regras inegociáveis:
1. Nunca apresentar mock como TxLINE real.
2. Bloquear em MISSING_DATA, fixture ausente, feed obsoleto, proof inválida ou mismatch de rede.
3. Não usar odds ou estatísticas de outra API para decidir perguntas.
4. Não revelar a próxima pergunta antes da resposta persistida.
5. Congelar o snapshot antes da primeira resposta.
6. Manter JWT, API token e chaves privadas fora do frontend.
7. Usar paper/devnet; não habilitar dinheiro real, token próprio ou payout real.
8. Não inventar Argentina × Espanha; usar somente fixture TxLINE real ou replay válido.

Antes de alterar código:
- execute o hook semântico;
- leia as skills/contratos aplicáveis;
- verifique o estado dos serviços e testes;
- registre o status atual e os riscos.

Para cada mudança:
- implemente a menor mudança vertical que gere valor demonstrável;
- atualize schemas, evidências e estados de dados;
- escreva ou ajuste testes;
- execute API tests e builds;
- confirme que a UI mostra fonte, timestamp, modo e proof status.

Definition of Done:
- fluxo completo abre no Telegram/browser local;
- partida real/replay TxLINE selecionável;
- três categorias exibidas;
- painel estatístico aparece antes do quiz;
- cinco perguntas são respondidas sequencialmente;
- snapshot, respostas, score e ranking persistem;
- proof é validada ou o app bloqueia honestamente;
- README, endpoints, replay e vídeo estão prontos para submissão.

Próxima tarefa prioritária: ativar TxLINE devnet, localizar um replay/fixture real e substituir o mock_fixture por um snapshot auditável.
```

# Arquitetura - Skill Mae de Inteligencia de Mercado CHUTE

**Data:** 2026-07-18  
**Objetivo:** registrar o que as implementacoes recentes exigem de um projeto como o CHUTE e formalizar a skill orquestradora-mae para inteligencia interna TxLINE + TxOdds.

---

## 1. Contexto

As ultimas implementacoes mudaram o patamar do projeto:

- o CHUTE ja nao e apenas um quiz com replay;
- o projeto agora reconcilia fixture live real, `proof_refs`, `on_chain_validation` e memo;
- o gargalo tecnico migrou de "como montar o quiz" para "como decidir, com evidencia, quais mercados sao publicaveis e quais perguntas fazem sentido".

Isso exige uma camada nova de inteligencia interna de mercado.

---

## 2. O que agora o CHUTE precisa saber antes de compor quizzes

### A. Inteligencia de identidade

- qual fixture TxLINE e o fixture real autorizado do editorial;
- se o alias textual ainda aponta para o fixture certo;
- se o jogo esta em estado publicavel, score-worthy ou apenas editorial.

### B. Inteligencia de cobertura

- quais familias de estatistica tem `proof_refs` auditaveis;
- quais families tem apenas historico TxOdds, mas nao settlement seguro;
- quais perguntas podem ser resolvidas live sem fallback enganoso.

### C. Inteligencia de composicao

- quais tiers abrir:
  - `chutes`
  - `escanteios`
  - `faltas`
  - futuros mercados
- qual mistura ideal de:
  - pergunta quantitativa
  - pergunta binaria
  - zebra
  - pergunta de jogador
- qual equilibrio entre chance de acerto, odd, clareza e prova futura.

### D. Inteligencia de risco

- quando bloquear um tier por cobertura fraca;
- quando manter apenas editorial + historico;
- quando uma pergunta e comercialmente interessante mas tecnicamente perigosa.

### E. Inteligencia de submissao

- quais evidencias viram README/demo/formulario;
- quais claims podem ser feitos sem extrapolar o que a prova realmente cobre;
- qual status real e GO/NO-GO para a trilha do Superteam Earn.

### F. Inteligencia creator-led

- quais stats um criador deveria escolher para seu proprio quiz;
- quais familias fazem sentido para uma comunidade especifica;
- quando um quiz creator-led e publicavel ou deve ser bloqueado;
- qual fee split faz sentido para CHUTE e para o criador;
- quando wallet sign e mint podem ser propostos em seguranca.

---

## 3. Skill criada

**Skill:** `chute-market-intelligence-orchestrator`

**Arquivos**

- `.agent/skills/chute-market-intelligence-orchestrator/SKILL.md`
- `.agent/contracts/chute-market-intelligence-orchestrator.json`

**Papel**

- funcionar como skill-mae;
- orquestrar a inteligencia de dados, prova, composicao e readiness;
- listar skills-filhas faltantes em vez de inventar resultados;
- bloquear abertura insegura de mercados.

---

## 4. Skills-filhas que o projeto agora pede

### 1. `txline-market-depth-miner`

**Missao**

- minerar a profundidade de mercados da TxLINE por fixture e familia estatistica.

**Saida esperada**

- familias disponiveis
- `statKeys`
- frequencia de update
- proof coverage
- lacunas por mercado

### 2. `txodds-historical-prior-analyst`

**Missao**

- transformar historico TxOdds em priors operacionais para composicao dos quizzes.

**Saida esperada**

- medias por time/jogador
- volatilidade
- assimetria
- sinais de zebra
- jogadores dominantes

### 3. `quiz-tier-composer`

**Missao**

- converter inteligencia de mercado em 5 perguntas equilibradas por tier.

**Saida esperada**

- distribuicao das 5 perguntas
- risco/odd por opcao
- equilibrio entre acessivel e zebra
- justificativa curta por pergunta

### 4. `proof-coverage-auditor`

**Missao**

- verificar se cada pergunta tem trilha clara de settlement e evidencia.

**Saida esperada**

- pergunta publicavel ou bloqueada
- razao do bloqueio
- `proof_ref` esperado
- familia estatistica de settlement

### 5. `submission-evidence-packager`

**Missao**

- transformar as evidencias reais do runtime em material de submissao.

**Saida esperada**

- provas
- claims permitidos
- roteiro de demo
- checklist final

### 6. `community-quiz-market-maker`

**Missao**

- converter intencao do criador em um quiz publicavel, com painel de stats, wallet sign, mint outline e fee split.

**Saida esperada**

- painel creator
- quiz proposto
- outline de mint
- modelo de fee
- status de publicacao

---

## 5. Leitura estrategica

O CHUTE agora precisa separar com nitidez tres camadas:

1. **TxOdds como inteligencia de priors**
   - serve para compor perguntas, difficulty e narrativa pre-jogo;
   - nao serve para fingir settlement live.

2. **TxLINE como autoridade de fixture + snapshot + proof**
   - serve para reconciliar o evento real e dar trilha de auditoria;
   - e a fonte primaria para claims tecnicos da trilha.

3. **CHUTE como camada de produto**
   - transforma dado em leitura provavel auditavel;
   - decide quais tiers abrir e como congelar snapshots;
   - nunca deve prometer mais do que a cobertura de prova permite.

---

## 6. Regras operacionais para o projeto

- nao abrir novo mercado so porque existe dado historico;
- abrir apenas tiers cuja familia estatistica tenha caminho claro de prova;
- usar TxOdds para composicao e TxLINE para autorizacao de publicacao;
- creator-led e native quizzes precisam permanecer separados em governanca e monetizacao;
- manter saida curta e estruturada:
  - `market_map`
  - `tier_recommendations`
  - `proof_coverage`
  - `required_child_skills`
  - `confidence_score`
- bloquear claims de live validation enquanto o fixture real nao gerar snapshot comprovavel.

---

## 7. Estado atual dessa frente

**Nota:** `7.8 / 10`

### Ja existe

- fixture live reconciliado
- `proof_refs` e `on_chain_validation` expostos
- E2E corrigido e verde
- skill-mae criada

### Ainda falta

- mineracao sistematica da profundidade de mercados da TxLINE
- camada analitica estruturada do historico TxOdds
- compositor automatico de tiers baseado nessa inteligencia
- auditoria de proof coverage por pergunta
- camada creator-led para quiz mintado e fee split

---

## 8. Recomendacao

O proximo salto de produto nao e mais "mais tela" nem "mais UX".  
O proximo salto e **inteligencia interna de mercado + prova por familia estatistica**.

Esse e o caminho para:

- quizzes melhores;
- tiers novos sem chute cego;
- claims mais fortes para o hackathon;
- base real para futuras skills filhas do CHUTE.

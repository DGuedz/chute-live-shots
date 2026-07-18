# Skills Filhas e Moat do CHUTE

**Data:** 2026-07-18  
**Objetivo:** registrar as novas skills-filhas da skill-mae e explicar por que elas viram ativo estrategico do CHUTE.

---

## 1. Tese

O moat do CHUTE nao esta apenas na interface do quiz.  
O moat esta na **curadoria operacional de mercados esportivos com prova, priors e economia creator-led**.

Em termos simples:

- TxLINE nos diz o que existe, o que prova e o que pode ser resolvido.
- TxOdds nos diz o que e interessante, improvavel, desequilibrado ou editorialmente forte.
- CHUTE transforma isso em:
  - quiz nativo
  - quiz creator-led
  - fee split
  - distribuicao para comunidade
  - camada de prova e confianca

---

## 2. Skills criadas

### A. `txline-market-depth-miner`

**Arquivos**

- `.agent/skills/txline-market-depth-miner/SKILL.md`
- `.agent/contracts/txline-market-depth-miner.json`

**Papel**

- descobrir profundidade real de mercado por fixture;
- mapear familias estatisticas;
- identificar `statKeys`, proof coverage e readiness live;
- bloquear familias ruins antes de virarem tier.

### B. `txodds-historical-prior-analyst`

**Arquivos**

- `.agent/skills/txodds-historical-prior-analyst/SKILL.md`
- `.agent/contracts/txodds-historical-prior-analyst.json`

**Papel**

- transformar historico em priors de composicao;
- identificar volatilidade, zebra e ranges recomendados;
- ajudar o CHUTE a montar quizzes que "fazem sentido" e nao perguntas aleatorias.

### C. `community-quiz-market-maker`

**Arquivos**

- `.agent/skills/community-quiz-market-maker/SKILL.md`
- `.agent/contracts/community-quiz-market-maker.json`

**Papel**

- habilitar um creator a montar seu proprio quiz;
- ler TxLINE + TxOdds e propor quais stats usar;
- estruturar painel de stats para o criador;
- preparar outline de mint, wallet sign e fee split;
- separar quiz nativo CHUTE de quiz creator-led.

---

## 3. Novo fluxo de produto habilitado

### Quizzes nativos

- continuam existindo como hoje;
- `chutes`, `escanteios`, `faltas`;
- curadoria central do CHUTE;
- fee e regra da plataforma.

### Quizzes creator-led

- o user conecta wallet;
- escolhe fixture e familia estatistica;
- recebe painel de stats TxLINE + TxOdds;
- recebe recomendacoes de mercado e estrutura de 5 perguntas;
- assina transacao;
- o quiz e mintado/publicado;
- o criador distribui para sua comunidade;
- CHUTE ganha fee de plataforma;
- o criador ganha fee de curadoria/distribuicao.

---

## 4. Porque isso e moat

### Nao e so UGC

O user nao cria um quiz cego.  
Ele cria um quiz com curadoria apoiada por inteligencia de mercado.

### Nao e so palpite

O sistema sabe:

- qual mercado esta vivo;
- qual mercado tem prova;
- qual mercado tem bom prior historico;
- qual pergunta e boa para comunidade;
- qual creator flow e publicavel sem fraude semantica.

### Nao e so monetizacao

O fee split vira sustentavel porque:

- CHUTE fornece a infra, curadoria e camada de confianca;
- o criador fornece distribuicao, nicho e repertorio;
- ambos ganham quando o quiz de fato engaja.

---

## 5. Guardrails do creator flow

- quiz creator-led exige wallet;
- wallet ownership precisa ser assinada;
- mint real exige aprovacao humana;
- quiz nao pode ser publicado se a familia estatistica principal nao tiver caminho claro de prova;
- fee model nao pode ser ativado sem threshold minimo e regra anti-spam;
- creator-led e CHUTE-native precisam permanecer separados no produto e na governanca.

---

## 6. O que isso exige do projeto

### Backend

- modelo de `creator_quiz`
- modelo de fee split
- publishability status por quiz
- regras de mint/persistencia

### Frontend

- painel creator com stats TxLINE + TxOdds
- seletor de familias estatisticas
- preview de 5 perguntas sugeridas
- resumo de fee e regra de publicacao
- assinatura de wallet

### Economia

- plataforma fee do CHUTE
- curator fee do creator
- threshold minimo de participantes
- regras de ativacao e distribuicao

---

## 7. Estado atual

**Nota desta frente:** `8.2 / 10`

### Feito

- skill-mae criada
- 3 skills-filhas materializadas
- contratos de risco e aprovacao definidos
- tese de moat formalizada

### Falta

- implementacao do backend creator-led
- UI do painel creator
- regra concreta de mint e fee split
- skill adicional de `quiz-tier-composer`
- skill adicional de `proof-coverage-auditor`

---

## 8. Leitura final

Se o CHUTE fizer isso direito, o diferencial nao sera "mais um quiz de futebol".  
Sera uma **plataforma de mercados de quiz curados**, onde:

- a plataforma entende o mercado;
- o creator entende sua comunidade;
- a prova reduz fraude;
- a composicao melhora o engajamento;
- o fee split cria incentivo economico bilateral.

Esse e um moat mais forte do que simplesmente adicionar mais tiers nativos.

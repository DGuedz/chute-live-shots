# CHUTE — definição do produto e entrega do hackathon

## 1. O que é o produto

CHUTE é um quiz de futebol dentro de um Telegram Mini App. O usuário escolhe um pacote estatístico de uma partida, estuda o painel baseado em TxLINE, responde cinco perguntas — uma por vez — e recebe uma pontuação por acerto exato e proximidade.

Frase do produto:

> A Telegram-native football quiz where communities predict match moments from TxLINE statistics and compete through transparent Solana-anchored scoring.

## 2. Usuário e problema

O torcedor acompanha uma partida, mas não tem uma forma simples, rápida e verificável de transformar leitura estatística em participação. CHUTE reduz a entrada a um fluxo de três decisões: escolher uma estatística, analisar o contexto e registrar o chute.

## 3. Loop principal

```text
Telegram → partida → pacote de estatística → painel TxLINE → quiz de 5 perguntas
        → snapshot congelado → comprovante → acompanhamento ao vivo
        → proof TxLINE/Solana → score → ranking → claim simulado
```

O usuário nunca vê a pergunta seguinte antes de confirmar a atual. Todos os participantes de uma rodada recebem o mesmo snapshot, as mesmas perguntas e a mesma ordem.

## 4. Trilhas do produto

### Trilha A — Fan Experience (principal)

Entrega competitiva do CHUTE para o hackathon:

- entrada pelo Telegram Mini App;
- tela Matchday com times, fonte, timestamp e estado do dado;
- seleção de pacote estatístico;
- painel de histórico, média, tendência e distribuição;
- quiz sequencial com cinco perguntas;
- cartão de respostas/comprovante;
- acompanhamento do jogo e atualização do feed;
- score de exatidão + proximidade;
- ranking por partida e por pacote.

### Trilha B — Data-to-Quiz Engine (moat)

Camada que diferencia o CHUTE de uma interface de palpites:

- coleta TxLINE histórica e ao vivo;
- curadoria de estatísticas relevantes;
- cálculo de média, tendência e distribuição;
- quality gate de fonte, amostra, recência e conflito;
- geração de quatro opções probabilísticas com cobertura;
- inclusão de cauda/zebra somente quando sustentada pelo modelo;
- snapshot imutável antes da primeira resposta;
- rastreabilidade por sourceTimestamp, snapshotId, modelVersion e proofRef.

Pacotes V0:

1. Finalizações — total de chutes; separado de chutes no alvo.
2. Escanteios — total, por equipe e por tempo quando disponível.
3. Cartões amarelos — total, por equipe e distribuição temporal quando disponível.

### Trilha C — Proof e Settlement (demonstrável, sem dinheiro real)

- worker TxLINE com credenciais exclusivamente no servidor;
- validação de proof por fixture/score;
- envelope de prova com hash do snapshot;
- referência de transação e settlement na Solana devnet;
- ranking e distribuição simulada em paper/devnet;
- fluxo de claim idempotente preparado para futura auditoria.

Não entregar dinheiro real, token próprio ou incentivo financeiro no MVP do hackathon.

## 5. O que será entregue

### Produto funcional

- frontend Telegram-ready rodando localmente;
- API FastAPI;
- TxLINE Worker Node;
- três pacotes estatísticos, com dados reais quando a ativação estiver disponível;
- replay determinístico para demo;
- cinco perguntas por rodada;
- respostas persistidas e ranking;
- estados explícitos `LIVE`, `REPLAY`, `MOCK_FIXTURE` e `MISSING_DATA`.

### Prova técnica

- adapter TxLINE para fixtures, scores, stream e proofs;
- snapshot com conteúdo hash;
- validação de rede/programa/assinatura;
- registro de requestId, sourceTimestamp, txlineProofRef e settlementId;
- fail-closed quando não houver dado verificável.

### Submissão

- repositório público;
- README de arquitetura e setup;
- endpoints documentados;
- vídeo demo de até cinco minutos;
- cenário replay pré-gravado, caso não exista partida ao vivo adequada;
- formulário na trilha Consumer and Fan Experiences;
- evidência clara de uso primário da TxLINE.

## 6. Fora do escopo

- trading agent;
- três submissões independentes;
- mercado financeiro real;
- token CHUTE;
- odds manipuladas ou opções artificialmente difíceis;
- dependência obrigatória de Argentina × Espanha;
- gol olímpico ou eventos que não existam no feed TxLINE;
- estatísticas inventadas apresentadas como reais;
- contrato de escrow de produção antes da validação jurídica e técnica.

## 7. Critérios de pronto

O MVP está pronto quando um avaliador consegue abrir o app, escolher um pacote, ver a origem dos dados, responder cinco perguntas sequencialmente, receber um comprovante, acompanhar a atualização, consultar o ranking e abrir a prova — tudo sem fixture falso ser apresentado como TxLINE real.

## 8. Ordem de execução

1. Ativar TxLINE devnet com carteira autorizada.
2. Buscar fixture real ou replay válido.
3. Normalizar os três pacotes estatísticos.
4. Gerar e congelar o snapshot.
5. Ligar os quizzes à UI, uma pergunta por vez.
6. Persistir respostas, score e ranking.
7. Validar proof TxLINE na Solana.
8. Fazer QA do fluxo Telegram e gravar a demo.
9. Publicar repo, documentação e submissão.

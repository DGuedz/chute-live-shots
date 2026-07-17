# Fluxo End-to-End Quiz Preditivo — Guia de Execução

## Visão Geral

O CHUTE agora oferece **quizzes preditivos** que testam a leitura do jogo em tempo real:
- 5 perguntas por tier (3 fáceis 1x payoff + 2 zebra 3.5x payoff)
- Probabilidades baseadas em histórico Copa 2026
- Respostas congeladas no início; resolvidas contra eventos TxLINE conforme o jogo avança
- 3 tiers: faltas/cartões, escanteios, chutes

## Arquitetura Técnica

```
Frontend (React)
  ↓
GET /api/predictions/{fixture_id}/{team}/{tier}
  ↓
Quiz com 5 perguntas (3 easy + 2 zebra)
  ↓
POST /api/predictions/{quiz_id}/answer (x5)
  ↓
GET /api/predictions/{quiz_id}/progress (polling)
  ↓
Score real-time contra TxLINE events
```

## Iniciar Servers

### Terminal 1: API Backend

```bash
cd /Users/doublegreen/mind_v2/chute/apps/api
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

API rodando em: `http://127.0.0.1:8001`

### Terminal 2: Frontend Web

```bash
cd /Users/doublegreen/mind_v2/chute/apps/web
npm run dev
```

Frontend rodando em: `http://localhost:5173`

## Teste via cURL

### 1. Obter Quiz Preditivo

```bash
curl -s http://127.0.0.1:8001/api/predictions/18179551/Argentina/faltas | jq '.questions[0:2]'
```

Resposta: 5 perguntas sobre faltas/cartões da Argentina

**Exemplo — Q1 (Fácil):**
```json
{
  "id": "q1",
  "kind": "team_fouls",
  "prompt": "Quantas faltas Argentina vai cometer?",
  "options": [
    {"value": 4, "label": "4", "probability": 0.063, "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0},
    {"value": 6, "label": "6", "probability": 0.128, "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0},
    {"value": 7, "label": "7", "probability": 0.143, "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0},
    {"value": 9, "label": "9", "probability": 0.121, "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0}
  ],
  "stat_basis": "TxLINE histórico Argentina: 7.8 faltas/jogo",
  "payoff_multiplier": 1.0
}
```

**Exemplo — Q4 (Zebra, 3.5x payoff):**
```json
{
  "id": "q4",
  "kind": "player_yellow",
  "prompt": "Messi vai levar amarelo?",
  "options": [
    {"value": "Sim", "label": "Sim", "probability": 0.18, "odd": 5.56, "risk": "ZEBRA", "reward_multiplier": 3.5},
    {"value": "Não", "label": "Não", "probability": 0.82, "odd": 1.22, "risk": "ACESSIVEL", "reward_multiplier": 1.0}
  ],
  "stat_basis": "TxLINE histórico Messi: 0.15 amarelos/jogo",
  "payoff_multiplier": 3.5
}
```

### 2. Submeter Resposta

```bash
curl -X POST http://127.0.0.1:8001/api/predictions/pred-18179551-Argentina-faltas/answer \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "user-demo-001",
    "question_id": "q1",
    "answer": 7
  }'
```

Resposta:
```json
{
  "accepted": true,
  "quiz_id": "pred-18179551-Argentina-faltas",
  "question_id": "q1",
  "answer": 7
}
```

### 3. Verificar Progresso (Scoring em Tempo Real)

```bash
curl -s 'http://127.0.0.1:8001/api/predictions/pred-18179551-Argentina-faltas/progress?participant_id=user-demo-001' | jq '.'
```

Resposta:
```json
{
  "status": "scoring",
  "quiz_id": "pred-18179551-Argentina-faltas",
  "participant_id": "user-demo-001",
  "progress": 1,
  "total": 1,
  "score": 100,
  "percentage": 100.0,
  "breakdown": [
    {
      "question_id": "q1",
      "correct": true,
      "payoff": 1.0,
      "expected": 7,
      "actual": 7
    }
  ],
  "timestamp": "2026-07-02T20:44:59.554Z"
}
```

### 4. Todos os 3 Tiers

```bash
# Escanteios
curl -s http://127.0.0.1:8001/api/predictions/18179551/Argentina/escanteios | jq '.title, .questions | length'

# Chutes no alvo
curl -s http://127.0.0.1:8001/api/predictions/18179551/Argentina/chutes | jq '.title, .questions | length'

# Ambas times (Argentina + Spain)
curl -s http://127.0.0.1:8001/api/predictions/18179551/Spain/faltas | jq '.team'
```

## Fluxo Completo no Navegador

1. Abrir `http://localhost:5173`
2. Clicar "Ver o matchday demo" → Seleciona Argentina × Spain
3. Selecionar tier "FALTAS" (ou ESCANTEIOS / CHUTES)
4. Responder 5 perguntas (3 fáceis + 2 zebra)
5. Ver resultado com breakdown de acertos/erros e payoffs

## Estrutura de Dados da Pergunta Preditiva

```typescript
type PredictiveQuestion = {
  id: string;           // "q1", "q2", ..., "q5"
  kind: string;         // "team_fouls", "yellow_card_early", "player_fouls", etc.
  answer_type: "numeric" | "categorical";
  prompt: string;       // "Quantas faltas Argentina vai cometer?"
  options: [
    {
      value: string | number;
      label: string;
      probability: number;    // 0.0 - 1.0 (Poisson ou binomial)
      odd: number;           // 1/probability, arredondado
      risk: "ACESSIVEL" | "ZEBRA";
      reward_multiplier: 1.0 | 3.5;  // 1x easy, 3.5x zebra
    }
  ];
  stat_basis: string;   // "TxLINE histórico Argentina: 7.8 faltas/jogo"
  payoff_multiplier: 1.0 | 3.5;
};
```

## Scoring (Resolver Contra TxLINE)

### Fouls Tier

| Q | Tipo | Resolução |
|---|------|-----------|
| Q1 | numeric | Compara answer com `stats.fouls_committed` do TxLINE score |
| Q2 | categorical | Busca `yellow_card` em eventos com `minute <= 25` |
| Q3 | categorical | Busca falta do jogador em histórico de eventos |
| Q4 (zebra) | categorical | Busca `yellow_card` específico para Messi |
| Q5 (zebra) | categorical | Busca qualquer `red_card` na partida |

### Corners Tier

| Q | Tipo | Resolução |
|---|------|-----------|
| Q1 | numeric | Compara answer com `stats.corners_for` |
| Q2 | categorical | `corners_for > 10` → Sim/Não |
| Q3 | categorical | Busca `corner` com `minute <= 15` |
| Q4 (zebra) | categorical | Busca `goal` com `assist_type == "corner"` |
| Q5 (zebra) | categorical | Busca cartão com `reason == "corner_dispute"` |

### Shots Tier

| Q | Tipo | Resolução |
|---|------|-----------|
| Q1 | numeric | Compara answer com `stats.shots_on_target` |
| Q2 | categorical | Busca `shot_on_target` para Messi |
| Q3 | categorical | `shots_on_target > 3` → Sim/Não |
| Q4 (zebra) | categorical | Busca player com ≥3 gols (`hat_trick`) |
| Q5 (zebra) | categorical | Busca `goal` com `shot_type == "header"` |

## Payload de Progresso em Detalhes

```json
{
  "status": "scoring",
  "quiz_id": "pred-18179551-Argentina-faltas",
  "participant_id": "user-demo-001",
  "progress": 3,
  "total": 5,
  "score": 550,
  "percentage": 60.0,
  "breakdown": [
    {
      "question_id": "q1",
      "correct": true,
      "payoff": 1.0,
      "expected": 7,
      "actual": 7
    },
    {
      "question_id": "q2",
      "correct": false,
      "payoff": 0.0,
      "expected": "Sim",
      "actual": "Não"
    },
    {
      "question_id": "q3",
      "correct": true,
      "payoff": 1.0,
      "expected": "Sim",
      "actual": "Sim"
    },
    {
      "question_id": "q4",
      "correct": true,
      "payoff": 3.5,
      "expected": "Não",
      "actual": "Não"
    },
    {
      "question_id": "q5",
      "correct": false,
      "payoff": 0.0,
      "expected": "Sim",
      "actual": "Não"
    }
  ],
  "timestamp": "2026-07-02T20:44:59.554Z"
}
```

**Score Calculation:**
- Q1: 1.0 × 100 = 100 pts ✓
- Q2: 0.0 × 100 = 0 pts ✗
- Q3: 1.0 × 100 = 100 pts ✓
- Q4: 3.5 × 100 = 350 pts ✓
- Q5: 0.0 × 350 = 0 pts ✗
- **Total: 550 pts (60% acertos)**

## Dados Históricos Usados

Arquivo: `data/wc2026-player-stats.json`

- **Argentina:** 7.8 faltas/jogo, 9.2 escanteios, 4.1 chutes/jogo
  - Messi: 1.2 faltas, 0.15 amarelos
  - De Paul: 2.1 faltas, 0.25 amarelos
  - Otamendi: 1.8 faltas, 0.22 amarelos
  
- **Spain:** 6.2 faltas/jogo, 10.1 escanteios, 5.3 chutes/jogo
  - Rodri: 0.9 faltas, 0.08 amarelos
  - Busquets: 1.2 faltas, 0.14 amarelos
  - Gavi: 1.8 faltas, 0.25 amarelos

**Distribuições:**
- Faltas, escanteios, chutes → Poisson (λ = média histórica)
- Cartões, gols → Binomial ou proporção histórica
- Eventos raros (vermelho, hat-trick) → 5-18% de chance

## Validação & Fail-Closed

- Se TxLINE snapshot não existe → `MISSING_DATA` 409
- Se pergunta não pode ser resolvida → marca como `{resolved: false}`
- Sem acesso a dados de player específico → usa time mean
- Revert simples: remove predictive endpoints, fica só com replay quiz

## Próximas Implementações (P1+)

1. **Worker Poll:** background task escuta TxLINE a cada 20s
2. **SSE/WebSocket:** notifica participantes de resoluções em tempo real
3. **Ranking durável:** persiste scores no SQLite por tier
4. **Frontend UI:** tic-tac visual, glow reveal, progresso dinâmico
5. **Mainnet ready:** validação on-chain real (não paper)


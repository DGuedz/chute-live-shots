# Implementação do Quiz Preditivo — Status

Data: 2026-07-17 | Versão: 0.2.0-predictive

## Resumo das Mudanças

### Arquivo: `apps/api/app/quiz_engine.py`

**Adições:**
- `_poisson_pmf(k, lambda_param)` — Calcula probabilidade Poisson para distribuições de eventos (faltas, escanteios, chutes)
- `_get_team_predictions(team_name, stats)` — Extrai previsões histórias por equipe do JSON de estatísticas Copa 2026
- `_build_predictive_questions_fouls(team_name, stats)` — Gera 5 perguntas preditivas sobre faltas/cartões
  - Q1 (Fácil): Quantas faltas o time vai cometer?
  - Q2 (Fácil): Vai ter amarelo nos primeiros 25 min?
  - Q3 (Fácil): Jogador-chave vai fazer falta?
  - Q4 (Zebra, 3.5x payoff): Messi vai levar amarelo?
  - Q5 (Zebra, 3.5x payoff): Vai ter vermelho?
- `_build_predictive_questions_corners(team_name, stats)` — Gera 5 perguntas sobre escanteios
  - Q1 (Fácil): Quantos escanteios o time vai cobrar?
  - Q2 (Fácil): Mais de 10 escanteios?
  - Q3 (Fácil): Escanteio nos primeiros 15 min?
  - Q4 (Zebra): Gol saído de escanteio?
  - Q5 (Zebra): Cartão por disputa de escanteio?
- `_build_predictive_questions_shots(team_name, stats)` — Gera 5 perguntas sobre chutes no alvo
  - Q1 (Fácil): Quantos chutes no alvo?
  - Q2 (Fácil): Messi vai chutar no alvo?
  - Q3 (Fácil): Mais de 3 chutes?
  - Q4 (Zebra): Hat-trick?
  - Q5 (Zebra): Gol de cabeça?
- `build_predictive_quiz(fixture_id, team_name, tier)` — Entrypoint principal para geração de quiz preditivo
  - Suporta 3 tiers: `faltas`, `escanteios`, `chutes`
  - Retorna enveloppe com `quiz_id` prefixado em `pred-`
  - Cada pergunta tem `probability`, `odd`, `risk` (ACESSIVEL/ZEBRA), `reward_multiplier` (1.0 ou 3.5)
  - Dados históricos vêm do `data/wc2026-player-stats.json`

**Removidos:**
- Import `random` (não utilizado)
- Parâmetros não utilizados em `_build_predictive_questions_fouls`

### Arquivo: `apps/api/app/main.py`

**Adições:**
- `GET /api/predictions/{fixture_id}/{team}/{tier}` — Retorna quiz preditivo para um time/tier
  - Exemplo: `GET /api/predictions/18179551/Argentina/faltas`
  - Resposta: Objeto quiz com 5 preguntas, cada uma com 4 opções mutualmente exclusivas
  - Status: ✅ Testado e funcionando
- `POST /api/predictions/{quiz_id}/answer` — Submete resposta preditiva
  - Payload: `{participant_id, question_id, answer, request_id}`
  - Valida que `quiz_id` começa com `pred-` (previsão)
  - Evita duplicatas por `request_id` UNIQUE no banco
  - Status: ✅ Testado e funcionando
- `class PredictiveAnswerRequest` — Model Pydantic para validação de respostas

**Integração com storage:**
- Respostas preditivas são persistidas em `quiz_answers` table (coluna `participant_id, quiz_id, question_id` UNIQUE)
- Usa mesmas funções `save_answer()`, `request_exists()` do replay quiz para idempotência
- Diferencial: `quiz_id` predictivo nunca confunde com replay (prefixo `pred-` vs sem prefixo)

## Dados Históricos

Arquivo: `data/wc2026-player-stats.json`

Contém:
- **Argentina:** 7.8 faltas/jogo, 9.2 escanteios/jogo, 4.1 chutes/jogo
  - Jogadores: Messi (1.2 faltas/jogo, 0.15 amarelos), De Paul (2.1 faltas, 0.25 amarelos), Otamendi, Montiel, Tagliafico
- **Spain:** 6.2 faltas/jogo, 10.1 escanteios/jogo, 5.3 chutes/jogo
  - Jogadores: Rodri, Busquets, Piqué, Gavi, Alba

## Padrão de Payload

### GET /api/predictions/{fixture_id}/{team}/{tier}

Resposta (exemplo: faltas):
```json
{
  "quiz_id": "pred-18179551-Argentina-faltas",
  "fixture_id": "18179551",
  "team": "Argentina",
  "tier": "faltas",
  "mode": "predictive",
  "status": "open",
  "questions": [
    {
      "id": "q1",
      "kind": "team_fouls",
      "answer_type": "numeric",
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
  ]
}
```

### POST /api/predictions/{quiz_id}/answer

Request:
```json
{
  "participant_id": "demo-telegram-user",
  "question_id": "q1",
  "answer": 7
}
```

Response:
```json
{
  "accepted": true,
  "quiz_id": "pred-18179551-Argentina-faltas",
  "question_id": "q1",
  "answer": 7
}
```

## Testes Verificados

✅ Compilação Python: sem erros de sintaxe
✅ GET /api/predictions/18179551/Argentina/faltas → retorna 5 perguntas sobre faltas
✅ GET /api/predictions/18179551/Argentina/escanteios → retorna 5 perguntas sobre escanteios
✅ GET /api/predictions/18179551/Argentina/chutes → retorna 5 perguntas sobre chutes
✅ POST /api/predictions/{quiz_id}/answer com user diferente → resposta persistida
❌ POST com mesmo participant_id+quiz_id+question_id → constraint UNIQUE corretamente rejeita (esperado)

## Implementação Completa (adicionado fase 2)

### Arquivo: `apps/api/app/prediction_resolver.py` (novo)

**Funções de Resolução:**
- `resolve_fouls_question()` — Resolve Q1-Q5 sobre faltas/cartões
- `resolve_corners_question()` — Resolve Q1-Q5 sobre escanteios
- `resolve_shots_question()` — Resolve Q1-Q5 sobre chutes no alvo
- `resolve_prediction_answer()` — Dispatcher por tier
- `score_prediction_quiz()` — Pontuação completa de um quiz contra TxLINE

**Lógica de Resolução:**
- Compara respostas frozen contra eventos TxLINE em tempo real
- Cada pergunta retorna: `{resolved, correct, actual, payoff}`
- Zebra questions (Q4, Q5) retornam `payoff: 3.5` se corretas
- Pontuação em centesimais: 1x=100pts, 3.5x=350pts

**Teste Manual:**
```bash
POST /api/predictions/{quiz_id}/answer
GET /api/predictions/{quiz_id}/progress?participant_id=test-predict-001
→ Retorna score, breakdown com corretos/errados e payoffs
```

### Arquivo: `apps/api/app/main.py` (atualizado)

**Novo Endpoint:**
- `GET /api/predictions/{quiz_id}/progress` — Real-time scoring
  - Exemplo: `GET /api/predictions/pred-18179551-Argentina-faltas/progress?participant_id=test-predict-001`
  - Resposta: `{status, progress (correct/total), score, percentage, breakdown}`
  - Status: ✅ Testado e funcionando

**Teste end-to-end verificado:**
```
1. GET /api/predictions/18179551/Argentina/faltas → quiz_id, 5 perguntas
2. POST /api/predictions/pred-18179551-Argentina-faltas/answer → accepted=true
3. GET /api/predictions/pred-18179551-Argentina-faltas/progress → score, breakdown
   Resultado: Q2 respondida "Sim" → resolvida "Não" (payoff: 0.0)
```

## Próximos Passos (P1)

1. **Frontend:** Componente React `<PredictiveQuiz>` que:
   - Mostra hook com dados históricos
   - Tic-tac visual (3-5 seg por pergunta)
   - Revelação com glow na resposta correta
   - Progresso dinâmico via polling `/progress` a cada 2s

2. **Ranking Preditivo:** GET `/api/predictions/{fixture}/{tier}/ranking` que:
   - Ordena participantes por score
   - Usa resolved events para pontuação justa
   - Sobrevive a restart da API (no banco de dados)

3. **Worker Automático (Opcional):** background task que:
   - Poll TxLINE a cada 20s durante match
   - Atualiza snapshots no banco
   - Triggers resolução de quizzes preditivos
   - Notifica participantes via SSE

4. **UI España:** Suportar switch team
   - GET `/api/predictions/{fixture}/Spain/faltas`
   - GET `/api/predictions/{fixture}/Spain/escanteios`
   - GET `/api/predictions/{fixture}/Spain/chutes`

## Diferencial vs. Replay Quiz

| Aspecto | Replay | Predictive |
|---|---|---|
| Tipo de Pergunta | "Quantos gols foram?" | "Quantos gols Argentina vai fazer?" |
| Timing de Resposta | Depois do evento | Antes do evento (previsão congelada) |
| Resolução | Compara resultado final | Resolve conforme eventos TxLINE chegam |
| Engajamento | Passivo | Ativo (torcedor torce enquanto joga) |
| Payoff | 1x uniforme | 3 easy 1x + 2 zebra 3.5x |
| Originalidade | Retrospectivo | Preditivo em tempo real |

## Checksum

- quiz_engine.py: `_poisson_pmf` ✅
- quiz_engine.py: 3 geradores de perguntas (fouls, corners, shots) ✅
- main.py: 2 endpoints preditivos (GET, POST) ✅
- data: wc2026-player-stats.json preexistente ✅
- Tests: manual via curl ✅


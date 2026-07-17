# CHUTE — Arquitetura de Quiz Preditivo Inteligente

## Conceito

Quiz que testa a **leitura do jogo em tempo real**, não adivinhação de passado. O torcedor vê dados históricos da Copa 2026, congela suas previsões, e conforme TxLINE publica eventos, o quiz marca respostas como "acertou" ou "errou".

**Diferencial:** 3 perguntas fáceis (70-80% probabilidade, payoff 1x) + 2 perguntas zebra (15-25% probabilidade, payoff 3.5x). Torcedor escolhe o risco.

---

## Modelo de Dados Preditivo

### 1. Histórico Copa 2026 (por equipe + jogador)

```json
{
  "Argentina": {
    "stats_per_game": {
      "fouls": 7.8,
      "corners": 9.2,
      "shots_on_target": 4.1,
      "yellow_cards": 0.8,
      "red_cards": 0.05
    },
    "players": {
      "Messi": {"fouls": 1.2, "yellow_cards": 0.15, "shots": 3.2},
      "De Paul": {"fouls": 2.1, "yellow_cards": 0.25, "tackles": 4.8},
      "Otamendi": {"fouls": 1.8, "yellow_cards": 0.22, "tackles": 6.1}
    }
  },
  "Spain": {
    "stats_per_game": {
      "fouls": 6.2,
      "corners": 10.1,
      "shots_on_target": 5.3,
      "yellow_cards": 0.6,
      "red_cards": 0.02
    },
    "players": {...}
  }
}
```

### 2. Tier: FALTAS & CARTÕES (Exemplo completo)

**Pergunta 1 (Fácil — 75% prob):**
- Prompt: "Argentina vai cometer quantas faltas?"
- Base: 7.8 faltas/jogo (histórico)
- Opções: 4-6 (20%), **6-8 (60%)**, 9-11 (15%), 12+ (5%)
- Correta: 6-8
- Payoff: 1x (100 pts)
- Tipo: Aberta (resolve conforme TxLINE conta faltas)

**Pergunta 2 (Fácil — 78% prob):**
- Prompt: "Vai ter cartão amarelo nos primeiros 25 minutos?"
- Base: 0.8 amarelos/jogo Argentina; distribuição uniforme por tempo
- Opções: Sim (22%), **Não (78%)**
- Correta: Não
- Payoff: 1x (100 pts)
- Tipo: Resolvida quando houver amarelo OU passarem 25 min sem

**Pergunta 3 (Fácil — 72% prob):**
- Prompt: "De Paul vai fazer falta?"
- Base: 2.1 faltas/jogo, ~90% dos jogos com ≥1 falta
- Opções: **Sim (90%)**, Não (10%)
- Correta: Sim
- Payoff: 1x (100 pts)
- Tipo: Aberta (resolve quando De Paul fizer falta)

**Pergunta 4 (Zebra — 18% prob, 3.5x payoff):**
- Prompt: "Messi leva amarelo?"
- Base: 0.15 amarelos/jogo (histórico); jogador ofensivo, baixa indisciplina
- Opções: **Sim (18%)**, Não (82%)
- Correta: Sim
- Payoff: 3.5x (350 pts se acertar)
- Tipo: Aberta (resolvida quando sair amarelo para Messi OU encerrar jogo)

**Pergunta 5 (Zebra — 8% prob, 3.5x payoff):**
- Prompt: "Vai ter cartão vermelho na partida?"
- Base: 0.05 vermelhos/jogo Argentina + 0.02 Espanha = 0.035 chance combinada
- Opções: **Sim (8%)**, Não (92%)
- Correta: Não (probabilidade baixa, mas paga 3.5x se acertar)
- Payoff: 3.5x (350 pts se acertar "Não")
- Tipo: Aberta (resolvida ao final do jogo)

---

## Dinâmica de Engajamento (Premium Quiz Pattern)

### 0:00–0:15 · **Hook + Contexto**
- "Argentina (7.8 faltas/jogo) vs. Espanha (6.2). Messi tem histórico de 0.15 amarelos/jogo."
- Mostra os dados históricos em cards animados.
- CTA: "Você lê o jogo melhor que os números?"

### 0:15–1:00 · **Pergunta 1 (Fácil)**
- Exibe a pergunta com opções.
- Torcedor escolhe (3 segundos de suspense com tic-tac visual).
- **Revelação:** fundo glow na resposta correta, som de acerto/erro.
- Mostrador de pontos: +100 (ou 0 se errou).
- Progresso: "1/5 acertadas".

### 1:00–1:45 · **Pergunta 2 (Fácil)**
- Mesma dinâmica.
- Torcedor agora tem 200 pts acumulados (ou menos se errou).

### 1:45–2:30 · **Pergunta 3 (Fácil)**
- Último "aquecimento" fácil.
- Mostrador: "300 pts. Próximo: RISCO ALTO (+350)".

### 2:30–3:15 · **Pergunta 4 (Zebra)**
- Mudança visual: borda fica vermelha/dourada, som mais tenso.
- Prompt fica maior: "ZEBRA: Messi vai levar amarelo? (18% de chance)"
- Torcedor escolhe — tic-tac agora mais longo (5 segundos).
- **Revelação:** se acertou → GLOW DOURADO + som de vitória épica + "+350!" em grande.
- Se errou → som frustrado, "Errou. Messi não fez falta." (ou "...fez 1 falta" em tempo real).

### 3:15–4:00 · **Pergunta 5 (Zebra)**
- Mesma tensão.
- "Última chance: vai ter vermelho? (8% de chance)".
- Conclusão do jogo: mostra quantos acertaram, ranking dos torcedores que jogaram, CTA para compartilhar.

### 4:00–4:15 · **Recibo + Proof**
- Mostra: snapshot das previsões (frozen no início) + eventos TxLINE que resolveram cada pergunta.
- Score final + ranking.
- "Seu recibo está ancorado em Solana. Compartilhe sua leitura."

---

## Tier: ESCANTEIOS (Mesmo padrão, estatísticas diferentes)

**Dados base:**
- Argentina: 9.2 escanteios/jogo
- Espanha: 10.1 escanteios/jogo

**5 Perguntas (3 fáceis + 2 zebra):**
1. **Fácil:** "Quantos escanteios Argentina vai cobrar?" → Opções 6-8, 9-11 (60%), 12+, 0-5
2. **Fácil:** "Espanha vai cobrar mais de 10 escanteios?" → Sim (65%), Não (35%)
3. **Fácil:** "Vai ter escanteio nos primeiros 10 min?" → Sim (70%), Não (30%)
4. **Zebra:** "Vai ter golaço de escanteio?" → Sim (8%), Não (92%)
5. **Zebra:** "Escanteio resultará em amarelo/vermelho?" → Sim (12%), Não (88%)

---

## Tier: CHUTES A GOL (Mesmo padrão)

**Dados base:**
- Argentina: 4.1 finalizações/jogo, 2.1 no alvo
- Espanha: 5.3 finalizações/jogo, 2.8 no alvo

**5 Perguntas:**
1. **Fácil:** "Quantos chutes no alvo Argentina fará?" → Opções 1-2, 2-3 (60%), 4-5, 0-1
2. **Fácil:** "Messi vai chutar?" → Sim (85%), Não (15%)
3. **Fácil:** "Espanha fará mais de 3 chutes no alvo?" → Sim (72%), Não (28%)
4. **Zebra:** "Haverá hat-trick de um jogador?" → Sim (5%), Não (95%)
5. **Zebra:** "Gol será de cabeça?" → Sim (18%), Não (82%)

---

## Fluxo de Resolução em Tempo Real

Conforme TxLINE publica eventos:

```
Minuto 0: Quiz congelado com odds preditivas
Minuto 5: TxLINE: "Argentina foul count: 1"
  → Pergunta 1 ("quantas faltas?") mostra progresso: "1/6-8" (em aberto)
Minuto 12: TxLINE: "Yellow card to De Paul"
  → Pergunta 2 ("amarelo nos 25 min?") marcada ERRADO se escolheu "Não"
Minuto 18: TxLINE: "Messi yellow card"
  → Pergunta 4 ("Messi amarelo?") marcada CORRETO (+350 pts)
Minuto 90: Jogo encerra
  → Pergunta 5 ("vermelho?") resolvida CORRETO se jogo terminou sem
```

---

## Arquitetura Técnica

### Backend (FastAPI)

```python
@app.get("/api/predictions/{fixture_id}/{tier}")
def get_predictions(fixture_id: str, tier: str):
    """
    Retorna 5 perguntas preditivas frozen no início.
    Cada pergunta tem: prompt, opções com probabilities, payoff, tipo.
    """
    
@app.post("/api/predictions/{quiz_id}/answer")
def answer_prediction(quiz_id: str, question_id: str, answer: str):
    """
    Torcedor responde. Resposta é frozen no banco.
    Não é comparada contra resultado agora — apenas armazenada.
    """

@app.get("/api/predictions/{quiz_id}/progress")
def get_progress(quiz_id: str):
    """
    Retorna estado atual: quais perguntas foram resolvidas por eventos TxLINE.
    Score parcial.
    Usa: respostas frozen + eventos TxLINE já publicados.
    """

# Worker Task
async def resolve_predictions_from_txline():
    """
    A cada evento TxLINE (falta, cartão, gol):
      - Busca todas as quizzes ativas para esse fixture
      - Marca perguntas como resolvidas (correto/errado)
      - Atualiza score de cada torcedor
    """
```

### Frontend (React)

```tsx
// Pergunta preditiva isolada (isolado por 3-5 seg com tic-tac)
<PredictiveQuestion
  prompt="Argentina vai cometer quantas faltas?"
  options={[
    { label: "4-6", probability: 0.20, payoff: 1 },
    { label: "6-8", probability: 0.60, payoff: 1 },
    { label: "9-11", probability: 0.15, payoff: 1 },
    { label: "12+", probability: 0.05, payoff: 1 }
  ]}
  onAnswer={(answer) => submitAnswer(answer)}
  timeoutSeconds={3}
/>

// Progress em tempo real (enquanto o jogo rola)
<PredictiveProgress
  questions={quizState.questions}
  resolvedEvents={txlineEvents} // Argentina foul count: 2, etc.
  score={currentScore}
/>
```

---

## Por que isso funciona (vs. Replay Quiz)

| Aspecto | Replay (Antes) | Predictive (Novo) |
|---|---|---|
| Pergunta | "Quantos gols foram?" (já sabe) | "Quantos gols Argentina vai fazer?" (lê o jogo) |
| Engajamento | Passivo (responde depois) | Ativo (torcedor torce enquanto responde) |
| Real-Time | Snapshot congelado, nunca muda | TxLINE events resolvem conforme acontecem |
| Competição | Ranking fixo (resultado final) | Ranking dinâmico (score muda a cada evento) |
| Monetização | Paper/devnet | Prototipo payout: acertos altos pagam 3.5x |
| Originalidade | Quiz sobre passado | Análise preditiva ao vivo com proof on-chain |

---

## Checklist para MVP Preditivo

- [ ] Dados históricos Copa 2026 por equipe + jogador (wc2026-player-stats.json)
- [ ] Gerador de perguntas preditivas (3 fáceis + 2 zebra por tier)
- [ ] Congelamento de odds no início da sessão (não resultado)
- [ ] Endpoint `/predictions/{fixture}/progress` que resolve conforme TxLINE eventos
- [ ] UI: pergunta com tic-tac (3-5 seg), revelação com glow, progresso dinâmico
- [ ] Worker: escuta TxLINE scores, resolve quiz questions, atualiza score
- [ ] Recibo: frozen predictions + resolved events + on-chain proof

---

## Por que isso ganha o hackathon

1. **Real-Time Responsiveness:** Dinâmica muda a cada evento TxLINE (não estática).
2. **Originality:** Nenhuma das ideias-exemplo faz análise preditiva ao vivo.
3. **Fan Value:** Torcedor viciado em bets AMA essa dinâmica (90% do seu mercado).
4. **Completeness:** Funciona hoje com dados já que temos; pronto para vídeo.
5. **Proof:** Cada resposta congelada + eventos TxLINE = auditável on-chain.

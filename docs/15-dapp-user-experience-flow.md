# CHUTE — fluxo da experiência do usuário

## Promessa

CHUTE é um jogo mobile de torcida: o usuário lê o pulso estatístico de Espanha × Argentina, faz cinco palpites e descobre se enxerga o jogo melhor que a comunidade. A diversão está no palpite; a confiança está no replay, no score e na prova TxLINE.

FIFA entra como contexto editorial e narrativa. TxLINE é a fonte canônica para métricas, resultados e referências de prova.

## Fluxo principal

### 1. Entrada cinematográfica — 0 a 3 segundos

Ao abrir o DApp, aparece um jogador em movimento: domínio, drible e chute. A bola atravessa a tela e revela o logotipo CHUTE.

Texto na tela:

> Leia o jogo. Faça o CHUTE. Prove o resultado.

Elementos:

- animação curta, sem bloquear o usuário;
- botão primário `Entrar no matchday`;
- ação secundária `Pular intro`;
- primeira visita vê a intro; visitas seguintes entram direto no matchday.

### 2. Matchday — escolher a partida

O usuário chega a uma tela com uma única ação dominante:

> Espanha × Argentina
>
> O próximo grande CHUTE começa aqui.

O card mostra:

- escudos e cores das seleções;
- status da partida;
- contador ou etiqueta `pré-jogo`;
- selo `Dados TxLINE`;
- CTA `Fazer meu CHUTE`.

Se houver mais partidas disponíveis, elas aparecem abaixo como cards secundários. A primeira tela nunca deve parecer um dashboard técnico.

### 3. Pré-jogo — criar tensão e contexto

Antes da primeira pergunta, o usuário vê um resumo visual em três blocos:

- `Forma`: sinais históricos de cada seleção;
- `Duelo`: comparação direta das métricas disponíveis;
- `Pulso TxLINE`: snapshot, replay e timestamp.

O texto deve explicar a origem sem interromper o jogo:

> O CHUTE é construído a partir de dados históricos e replay verificável. A previsão é sua; a evidência é TxLINE.

O usuário toca em `Começar quiz`.

### 4. Quiz — uma pergunta por vez

O quiz é o moat e deve parecer uma partida em andamento, não um formulário.

Header persistente:

- `Espanha 0 — 0 Argentina` como placar narrativo;
- progresso `1/5`, `2/5` etc.;
- pontos acumulados;
- botão de saída discreto.

Cada pergunta ocupa a tela inteira. O usuário responde com toque, arraste ou seleção rápida. Depois da resposta:

1. a escolha é congelada;
2. uma microanimação confirma o palpite;
3. aparece uma justificativa curta baseada no sinal histórico;
4. o botão `Próximo lance` leva à pergunta seguinte.

As cinco perguntas devem usar sinais complementares, sem contar o mesmo evento cinco vezes. A ordem é compartilhada entre participantes e as perguntas futuras ficam ocultas.

Famílias previstas para o modelo de quiz:

1. total de finalizações no alvo;
2. seleção com mais finalizações no alvo;
3. faixa ou limite de finalizações;
4. liderança de posse;
5. faixa de xG combinado.

Cada pergunta precisa carregar internamente `question_id`, `kind`, `stat_basis`, `options_ref`, `source_refs` e `model_version`.

### 5. Momento de decisão — última pergunta

Na quinta pergunta, a interface cria um clímax:

> Último lance. Confia na leitura ou vai pela torcida?

O CTA muda para `Finalizar meu CHUTE`. Após o toque, o usuário vê uma transição breve de chute/impacto enquanto o score é calculado.

### 6. Resultado — transformar resposta em jogo social

A tela de resultado mostra primeiro o que importa:

> Seu CHUTE: 68 pontos
>
> Você está no top 24% da rodada.

Depois apresenta:

- acertos exatos;
- proximidade dos palpites numéricos;
- melhor pergunta e pior pergunta;
- score ledger resumido;
- posição no ranking;
- CTA `Compartilhar com a torcida`;
- CTA `Ver minha prova`.

O score só é publicado quando o outcome final e a proof ref TxLINE estiverem validados. Sem prova válida, o estado deve ser `resultado pendente`, nunca um ranking apresentado como final.

### 7. Prova — confiança em linguagem humana

`Ver minha prova` abre um painel simples, com opção de detalhes:

- `snapshotId`;
- fixture;
- timestamp;
- hash do conteúdo;
- replay ou proof ref TxLINE;
- status da validação on-chain;
- link para o Solana Explorer quando existir uma assinatura.

Mensagem principal:

> Seu resultado está ligado a um snapshot verificável. Qualquer pessoa pode conferir a origem.

O detalhe técnico fica recolhido em `Ver dados completos`, evitando quebrar a experiência de jogo.

### 8. Ranking e retorno

O ranking é uma tela viva de torcida:

- posição do usuário destacada;
- três melhores jogadores;
- variação desde a última rodada;
- respostas mais populares;
- botão `Fazer outro CHUTE` quando houver nova rodada.

Critério de desempate visível em uma linha:

> Primeiro, acertos exatos. Depois, menor erro total. Em seguida, respostas válidas concluídas.

O timestamp de submissão só entra como último desempate determinístico. Prêmios ou distribuição de valor permanecem bloqueados até aprovação humana e settlement validado.

## Estados de erro

### TxLINE indisponível

Não mostrar “quiz normal” fingindo que há dados reais. Mostrar:

> Estamos reconectando ao replay TxLINE. Seu jogo ainda não começou.

CTA `Tentar novamente` e uma indicação clara do último snapshot válido.

### Snapshot incompleto ou adulterado

Bloquear quiz e score:

> Não foi possível validar a base estatística desta rodada.

### Prova ainda pendente

Permitir visualizar o resumo, mas marcar:

> Score calculado localmente — ranking aguardando validação TxLINE.

## Princípios de UX

- Uma decisão por tela.
- Linguagem de torcida na superfície; evidência técnica no detalhe.
- Movimento curto e funcional: entrada, confirmação e resultado.
- O usuário sempre sabe onde está, quantas perguntas faltam e por que ganhou pontos.
- Nenhuma métrica é inventada para preencher a tela.
- O produto deve continuar interessante mesmo quando o usuário erra: proximidade, rivalidade e ranking mantêm o retorno.

## Próximo passo

Receber o modelo de quiz do produto e mapear cada pergunta para uma métrica TxLINE disponível, com seu `source_ref`, regra de pontuação e estado de prova. Só depois disso devemos fechar copy, animações e componentes finais.

# Direção de modificação do CHUTE

## O que estamos fazendo

Vamos transformar o CHUTE em uma experiência mobile de torcida dentro do Telegram. O usuário entra em um universo de futebol, acompanha uma intro animada, escolhe uma oportunidade minerada pela TxLINE, responde a cinco perguntas e compara sua leitura com a comunidade.

O produto deixa de parecer um protótipo técnico e passa a funcionar como um jogo: existe tensão antes do lance, decisão durante o quiz e recompensa emocional no resultado.

## O que será modificado

### Identidade visual

A identidade oficial será exclusivamente CHUTE. A inspiração visual anterior serviu apenas como referência de branding e não fará parte da narrativa.

Vamos consolidar:

- logo esportiva CHUTE;
- personagem do jogador como elemento recorrente;
- estádio, torcida, gol e linhas de velocidade;
- lime e laranja como energia da marca;
- navy como base de contraste;
- purple, cyan e green apenas como estados técnicos de dados e proof;
- tipografia esportiva na marca e tipografia legível no conteúdo;
- JetBrains Mono para números, hashes e identificadores técnicos.

### Intro

A abertura será um vídeo de futebol com movimento real: jogador, chute, trajetória da bola, impacto na rede e surgimento da logo.

Sobre o vídeo, teremos frases curtas sincronizadas em beats de aproximadamente 1,6 segundo:

- `Dados vivos no lance`;
- `TxLINE lê o jogo`;
- `Solana prova a leitura`;
- `Telegram reúne a torcida`;
- `Cinco chutes. Um ranking`;
- `Entre no matchday.`

Nos últimos 1,6 segundos, o texto superior desaparece em fade para que a logo original do vídeo tenha um fechamento limpo. O botão `Pular intro` continua disponível durante toda a abertura.

### Home

A home será uma central de oportunidades, não um dashboard de blockchain.

O usuário verá:

- oportunidade principal Espanha × Argentina;
- estado da rodada;
- sinais disponíveis;
- quantidade de perguntas;
- indicação de replay TxLINE;
- status de proof;
- ranking e histórico da própria leitura.

A linguagem será de jogo: `Ler oportunidade`, `Fazer meu CHUTE`, `Próximo lance` e `Ver minha prova`.

### Quiz

O quiz será o principal diferencial do produto.

O usuário permanece no mesmo contexto visual durante as cinco perguntas. A tela mantém a partida, o personagem, o progresso e o ambiente de estádio. Apenas a pergunta e as opções mudam.

Cada resposta deve:

1. reagir imediatamente ao toque;
2. gerar uma microanimação de impacto;
3. registrar a resposta;
4. atualizar o progresso;
5. levar ao próximo lance.

As perguntas serão construídas a partir de métricas TxLINE validadas. Nenhuma métrica será inventada para completar a experiência.

### Score e ranking

O score será calculado por exatidão e proximidade, com ledger determinístico. O ranking usará:

1. acertos exatos;
2. menor erro agregado;
3. respostas válidas concluídas;
4. timestamp determinístico como último desempate.

O resultado só será apresentado como final quando o outcome e a proof estiverem validados.

### Proof e Solana

Solana não será apresentada como uma carteira de apostas. Ela será a camada de confiança do jogo.

A tela de prova mostrará:

- `snapshotId`;
- fixture;
- timestamp;
- content hash;
- proof reference TxLINE;
- status de validação on-chain;
- assinatura e link para o Solana Explorer quando disponíveis.

Credenciais TxLINE, JWT e tokens de API permanecem exclusivamente no backend. Nenhum segredo será exposto ao Telegram ou ao navegador.

Settlement real continua bloqueado até existir outcome final, proof válida e aprovação explícita. O modo de demonstração permanece em devnet/dry-run.

### Telegram Mini App

O CHUTE será adaptado ao ambiente do Telegram com:

- layout mobile-first;
- safe areas;
- viewport dinâmico;
- BackButton nativo;
- MainButton para confirmar o CHUTE;
- feedback háptico discreto;
- suporte ao tema do Telegram;
- fallback para aparelhos com menor desempenho.

## Resultado esperado

Ao final, o usuário deverá sentir que:

> entrou em um jogo de futebol, fez uma leitura rápida, disputou com a torcida e recebeu uma prova verificável do resultado.

A narrativa final é simples:

> Jogue o momento. Prove a leitura.

TxLINE fornece os sinais. O CHUTE transforma sinais em jogo. Solana preserva a confiança. Telegram entrega a experiência social.

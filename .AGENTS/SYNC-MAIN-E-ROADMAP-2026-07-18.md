# Sync Main e Retorno ao Roadmap CHUTE

**Data:** 2026-07-18

## 1. Sync do `main`

- `main` local foi sincronizado com `origin/main` em worktree limpo:
  - merge commit atual: `1cd787e6c99630183987d194c388f9a569c7181e`
- o PR `#1` foi mergeado com escopo limpo.

## 2. Branches

### Seguro e concluído

- branch temporária `feat/market-intel-skills-dogfood-clean` removida localmente
- branch remota do PR foi removida no merge

### Não seguro mexer agora

- branch local `feat/market-intel-skills-dogfood` continua presa ao worktree principal
- esse worktree está sujo com mudanças amplas e paralelas
- não é seguro apagar ou trocar essa branch sem primeiro isolar o trabalho em andamento

## 3. Decisão operacional

### Agora

- **GO** para trabalhar a partir de `main` limpo no trilho separado
- **GO** para planejar a próxima PR (`quiz-tier-composer` + `proof-coverage-auditor`)
- **NO_GO** para limpar a branch local antiga no worktree principal agora

### Motivo

- o risco atual não está no GitHub;
- o risco está no worktree local contaminado por mudanças de runtime, mídia e design fora do pacote mergeado.

## 4. Roadmap imediato do CHUTE até o deadline

### P0 - hoje

1. fechar pacote humano da submissão:
   - vídeo demo
   - formulário Superteam
   - link final do app
   - checagem Mini App
2. manter trilho TxLINE live em fail-closed e pronto para prova real
3. preservar runtime e não misturar isso com o worktree sujo

### P1 - próxima PR técnica

1. `quiz-tier-composer`
2. `proof-coverage-auditor`

Essas duas skills completam a camada que transforma inteligência em publicação segura.

### P2 - pós-submissão

1. spec do creator flow
2. backend `creator_quiz`
3. painel creator
4. mint outline e fee split

## 5. Leitura do deadline

- prazo crítico de submissão: `2026-07-19`
- status atual: `GO PARCIAL`
- o gargalo imediato não é mais arquitetura
- o gargalo imediato é submissão humana + prova live final quando disponível

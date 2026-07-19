# Pacote Final de Submissao - Superteam Earn

**Data:** 2026-07-18  
**Track:** Consumer & Fan Experiences  
**Guardrail aplicado:** `mind-earn-navigator`  
**Decisao atual:** `GO PARCIAL`  
**Motivo:** o nucleo tecnico esta pronto e provado; faltam artefatos humanos de submissao.

---

## 1. Provas tecnicas atuais

### Fluxo E2E

**Comando**

```bash
python3 scripts/verify_e2e.py
```

**Resultado**

- `29 provas passaram`
- `API real`
- `banco efemero`
- `zero mocks`

**Cobertura**

- replay validado
- ingestao live interna
- quiz preditivo com fixture reconciliado
- `proof_refs`
- `on_chain_validation.method`
- memo replay
- memo preditivo
- assinatura ed25519 real
- protecao contra replay de nonce

### Worker / bridge / live

**Comandos**

```bash
python3 scripts/check_txline_live_fixture.py
cd apps/txline-worker && npm test && npm run build
```

**Resultado**

- checker fail-closed operacional
- `7` testes do worker verdes
- TypeScript verde

---

## 2. Claims que podemos fazer sem exagero

- CHUTE usa TxLINE como fonte de fixture, snapshots e proof refs.
- CHUTE usa TxOdds historico/editorial para compor a leitura pre-jogo e os priors do quiz.
- O backend expõe `proof_refs` e `on_chain_validation`.
- O memo do resultado inclui referencia compacta de proof quando disponivel.
- O fluxo E2E e reproduzivel localmente.
- A experiencia opera em `devnet` e `paper`, sem premiacao real.
- O sistema e fail-closed quando o snapshot live ainda nao existe.

---

## 3. Claims que NAO devemos fazer

- nao dizer que o produto faz settlement real em mainnet;
- nao dizer que toda partida ja esta live-proofed;
- nao dizer que toda familia estatistica esta coberta pela mesma profundidade de prova;
- nao dizer que a submissao esta pronta sem video, repo/acesso e formulario.

---

## 4. Checklist final de submissao

### Tecnico

- [x] README com verificacoes atualizado
- [x] doc tecnico de submissao existente em `docs/17-submission-txline-hackathon.md`
- [x] fluxo E2E provado
- [x] prova replay e live path documentadas
- [x] status live fail-closed documentado

### Humano

- [ ] repo publico ou acesso liberado para avaliacao
- [ ] deploy HTTPS estavel
- [ ] Mini App apontando para deploy correto
- [ ] video demo gravado
- [ ] formulario do Superteam preenchido
- [ ] confirmacao formal sobre aceitacao de Devnet se houver duvida

---

## 5. Roteiro curto de video demo

### Corte 1 - 0:00 a 0:20

- problema: torcedor palpita, mas nao prova a leitura do jogo.

### Corte 2 - 0:20 a 1:00

- abrir CHUTE;
- mostrar fixture;
- mostrar leitura editorial pre-jogo;
- mostrar tiers e badge honesto.

### Corte 3 - 1:00 a 2:10

- conectar Phantom;
- exibir assinatura de nonce;
- responder 5 perguntas do quiz;
- destacar probabilidade, odd e zebra.

### Corte 4 - 2:10 a 3:10

- mostrar `snapshot_id`, `content_hash`, `proof_ref` e memo;
- mostrar que o fixture live reconciliado e `18257739`;
- mostrar que o runtime expõe `on_chain_validation.method`.

### Corte 5 - 3:10 a 3:50

- mostrar replay validado;
- reiniciar a API;
- ranking e recibo permanecem identicos.

### Corte 6 - 3:50 a 4:10

- fechamento:
  - TxOdds compoe leitura e priors
  - TxLINE entrega fixture, snapshot e prova
  - CHUTE congela, pontua e prova

---

## 6. GO / NO-GO pelo guardrail `mind-earn-navigator`

### GO tecnico

- o build e demonstravel
- ha evidencia local forte
- ha fluxo real de produto
- ha doc tecnico
- ha guardrails honestos

### NO-GO de submissao automatica

- falta aprovacao humana
- falta pacote humano final
- nao ha write externo executado nem submissao automatizada

### Decisao correta agora

**`GO PARCIAL`**

Interpretacao:

- **GO** para preparar e apresentar o produto;
- **GO** para gravar demo e fechar repositorio/documentacao;
- **NO_GO** para afirmar que a submissao ja esta concluida.

---

## 7. Nota do plano

**Nota geral:** `8.8 / 10`

### Por que subiu

- o fluxo E2E agora esta realmente verde;
- a prova ponta a ponta ficou reproduzivel;
- a skill-mae de inteligencia de mercado foi criada;
- README e evidencias ficaram mais alinhados.

### O que segura abaixo de 9.5

- falta o pacote humano final;
- falta snapshot live real da final no runtime publico;
- falta prova live real do fixture final em tela para fortalecer a claim.

---

## 8. Proximo passo imediato

1. gravar video com o roteiro acima;
2. abrir repo/acesso;
3. apontar deploy HTTPS e Mini App;
4. preencher formulario Superteam;
5. anexar `verify_e2e.py` e os docs de prova como base da submissao.

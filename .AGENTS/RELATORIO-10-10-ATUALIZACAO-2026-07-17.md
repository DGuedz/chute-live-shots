# CHUTE — plano de fechamento 10/10

Data: 17 de julho de 2026  
Deadline informada: 19 de julho de 2026, 23:59 UTC

## Estado comprovado

| Área | Estado | Evidência local |
| --- | --- | --- |
| API | Verde | 22 testes passaram |
| E2E replay + preditivo + wallet | Verde | `scripts/verify_e2e.py`: 26 provas, zero mocks |
| Ancoragem Solana | Verde em dry-run | 14 testes web passaram: Memo, Explorer, redes, fallback e erros |
| Worker TxLINE | Verde | build e testes existentes passam |
| Web build | Verde | `npm run build` passa |
| GitHub público | Entregue | `DGuedz/chute-live-shots` |
| Web Vercel | Entregue | `https://chute-live-shots.vercel.app` responde HTTP 200 |
| API pública | Bloqueada externamente | Render exige login manual; `render.yaml` e Dockerfile já preparados |
| Teste de componente React | Opcional | testes de lógica existem; clique visual completo ainda não é coberto |

## Objetivo 10/10

Um jurado deve conseguir abrir o link público, entender em menos de um minuto que os dados são replay/devnet, conectar uma wallet, jogar cinco perguntas, ver o ranking, ancorar uma prova e abrir o Explorer — sem depender da máquina local da equipe e sem credenciais expostas.

## Ordem crítica de execução

### P0 — desbloquear produção

1. Criar o Blueprint no Render usando `DGuedz/chute-live-shots`.
2. Configurar `CHUTE_CORS_ORIGINS` com:

   `https://chute-live-shots.vercel.app,https://web-six-lemon-25.vercel.app`

3. Validar `/health` e copiar a URL pública da API.
4. Configurar `VITE_API_URL` na Vercel e executar redeploy de produção.
5. Validar produção com `curl` e navegador: health, fixtures, quiz, respostas, ranking, preditivo e CORS.

**Critério de saída:** o site não faz nenhuma chamada de dados para `127.0.0.1` em produção.

### P0 — prova de produção

1. Conectar Phantom em devnet com uma wallet de demonstração.
2. Usar somente saldo devnet e confirmar uma transação Memo real.
3. Guardar assinatura, timestamp, rede e URL do Explorer para o roteiro do vídeo.
4. Confirmar que a UI distingue claramente `devnet`, `replay` e `mainnet`.

**Critério de saída:** uma assinatura devnet verificável aparece no Explorer e não há qualquer promessa de settlement/prêmio.

### P0 — vídeo e submissão

1. Gravar o fluxo hero em até 4–5 minutos:
   - problema e proposta;
   - fixture e leitura TxLINE;
   - cinco respostas preditivas;
   - resolução contra snapshot;
   - ranking;
   - Memo on-chain e Explorer.
2. Mostrar pelo menos uma opção zebra e explicar o payoff.
3. Submeter GitHub, URL Vercel, URL da API, vídeo, Telegram Mini App e carteira exigida pelo formulário.
4. Fazer uma submissão de teste antes do prazo final e revisar todos os links em janela anônima.

**Critério de saída:** outra pessoa consegue reproduzir o caminho principal sem explicação oral da equipe.

## P1 — elevar a confiabilidade antes do corte final

- Adicionar um smoke test de produção que falhe se `VITE_API_URL` estiver ausente ou apontar para localhost.
- Adicionar teste de componente para conexão da wallet e clique no botão de ancoragem; não é bloqueador, mas reduz risco de regressão visual.
- Validar rede em todos os pontos: wallet session, RPC, Explorer e payload Memo devem concordar.
- Confirmar que uma troca devnet/mainnet limpa ou revalida a sessão da wallet, evitando usar uma sessão assinada em rede diferente.
- Confirmar limites de tamanho do Memo e caracteres permitidos com os valores reais de fixture/hash.
- Adicionar confirmação explícita da transação após envio, não apenas retorno da assinatura, quando o tempo permitir.
- Executar auditoria final de segredos: `.env`, tokens, bancos, caches, logs e artefatos de build.

## Não fazer antes da submissão

- Não ativar mainnet, settlement ou premiação.
- Não colocar JWT TxLINE, API token ou token Telegram no frontend.
- Não apresentar editorial/histórico como evento live.
- Não expandir para novas features que não melhorem o fluxo hero.
- Não depender de `localhost`, túnel temporário ou sessão de wallet pré-existente.

## Comandos de validação final

```bash
cd apps/api && python3 -m pytest -q
cd ../.. && npm run build
npm test --workspace apps/txline-worker
cd apps/web && npm test -- --run src/solana-anchor.test.ts
cd ../.. && env PYTHONPATH=apps/api python3 scripts/verify_e2e.py
```

## Alternativa ao Render — decisão de hosting

O Render deixou de ser a rota recomendada porque o pagamento/login bloqueia a criação do serviço. Para este MVP, a alternativa principal é **Railway**:

- deploy direto do GitHub;
- detecção do `apps/api/Dockerfile` já existente;
- variáveis de ambiente no painel;
- domínio público HTTPS gerado pelo serviço;
- trial informado oficialmente como sem cartão, com crédito inicial por 30 dias e cobrança mínima posterior de US$1/mês.

Referências: [Railway pricing](https://railway.com/pricing), [deploy com Dockerfile e domínio público](https://docs.railway.com/guides/docker-compose).

Alternativa secundária: **Koyeb**, que oferece uma instância Web Service free de 512 MB/0,1 vCPU/2 GB, mas escala a zero após uma hora sem tráfego, limita-se a uma instância e não suporta Worker Service free. Isso é aceitável para um endpoint de demo, mas menos adequado ao caminho live TxLINE.

### Rota Railway recomendada

1. Criar projeto em Railway e escolher `Deploy from GitHub Repo`.
2. Selecionar `DGuedz/chute-live-shots`.
3. Confirmar que o serviço usa `apps/api/Dockerfile` com contexto na raiz.
4. Adicionar `CHUTE_CORS_ORIGINS=https://chute-live-shots.vercel.app,https://web-six-lemon-25.vercel.app`.
5. Adicionar `CHUTE_DRY_RUN=true`.
6. Gerar domínio em `Settings → Networking → Generate Domain`.
7. Validar com `python3 scripts/verify_prod.py https://<dominio>.up.railway.app`.
8. Configurar `VITE_API_URL` na Vercel e redeployar.

O Dockerfile já escuta `0.0.0.0` e respeita `${PORT:-8000}`, portanto não exige alteração para Railway/Koyeb.

## Bloqueio atual

O único bloqueio que não pode ser resolvido pela máquina sem autoridade externa é a criação do serviço no provedor escolhido, pois o dashboard exige login do proprietário. Railway é a rota recomendada; depois da URL pública da API, a configuração Vercel e a validação de produção são tarefas imediatas.

## Atualização desta sessão

- Confirmado que as antigas pendências do preditivo foram resolvidas.
- Confirmado: 22 testes API, 26 provas E2E e 14 testes de ancoragem web.
- Corrigido o diagnóstico anterior: ausência de testes de componente React é uma melhoria opcional, não falha do build.
- Registrado o caminho crítico para alcançar 10/10 sem ampliar escopo de risco.
- Alternativa Railway preparada pelo terminal: CLI `railway 5.27.0` instalada; autenticação ainda necessária via `railway login`.
- Adicionado `.dockerignore` para reduzir o contexto de build e excluir `.git`, caches, `node_modules`, bancos auxiliares e segredos.

## Atualização — preparação de build Railway

- A implementação foi registrada como preparação local, não como deploy concluído.
- O terminal confirmou que a CLI Railway está instalada, porém retorna `Unauthorized` até a autenticação interativa.
- O Dockerfile da API já usa `0.0.0.0` e respeita a variável `PORT`, compatível com Railway.
- O `.dockerignore` foi adicionado para reduzir o contexto e evitar envio de artefatos desnecessários.
- O pipeline sem credenciais TxLINE/Solana permanece em dry-run; nenhum settlement ou transação foi executado.
- Build local da imagem `chute-api:railway` concluído com sucesso usando `docker build -f apps/api/Dockerfile .`.
- Container iniciou com Uvicorn em `0.0.0.0:8000`; a sonda de porta publicada pelo Docker Desktop não respondeu neste ambiente local, portanto a validação HTTP definitiva permanece para a URL pública do Railway.

## Atualização — deploy público concluído

- Railway autenticado via CLI e projeto `sweet-celebration` vinculado ao serviço `chute-api`.
- O primeiro deploy falhou porque o serviço estava em `RAILPACK` e ignorava o Dockerfile; `railway.toml` corrigiu o builder para Docker.
- Deploy concluído com sucesso em `https://chute-api-production.up.railway.app`.
- `VITE_API_URL` configurado na Vercel e web redeployado; alias `https://web-six-lemon-25.vercel.app` está READY.
- `scripts/verify_prod.py` executado contra produção: **20/20 validações passaram**.
- Restante para 10/10: uma transação Memo real na devnet via Phantom e o link do Explorer para o vídeo.

### Próximo comando após login

```bash
railway login
railway init
railway up
railway domain
```

Após gerar o domínio, executar `python3 scripts/verify_prod.py <URL>` antes de apontar a Vercel.

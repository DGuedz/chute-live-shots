# Deploy — CHUTE (hackathon)

## 1. API (Render, via Docker)

1. Render → New → Web Service → conecte o repo GitHub. O `render.yaml` na raiz já descreve o serviço (`apps/api/Dockerfile`, contexto na raiz para copiar `data/`).
2. Env vars:
   - `CHUTE_CORS_ORIGINS=https://<seu-web>.vercel.app` (separar múltiplos por vírgula)
   - `TELEGRAM_BOT_TOKEN=<token do BotFather>` (se a API validar initData)
3. O SQLite é efêmero no free tier — ok para demo: o replay TxLINE é re-seedado a cada boot.
4. Smoke test: `curl https://<api>.onrender.com/health` → `{"ok": true}`.

Alternativas: Fly.io (`fly launch --dockerfile apps/api/Dockerfile`) ou Railway (aponte o Dockerfile e o contexto raiz).

## 2. Web (Vercel)

1. Vercel → New Project → repo GitHub → **Root Directory: `apps/web`** (o `vercel.json` já está lá).
2. Env var: `VITE_API_URL=https://<api>.onrender.com` (sem barra final).
3. Deploy → anote a URL HTTPS.
4. Volte no Render e confirme que `CHUTE_CORS_ORIGINS` contém exatamente essa URL.

## 3. Bot Telegram

```bash
TELEGRAM_BOT_TOKEN=<token> WEBAPP_URL=https://<web>.vercel.app python3 apps/bot/bot.py
```

Roda de qualquer máquina (long polling, não precisa de porta pública). Para o Mini App abrir embutido, configure também no BotFather: `/newapp` → aponte para a URL do Vercel.

## 4. Checklist pós-deploy

- [ ] `GET /health` na API pública responde.
- [ ] Web app abre pela URL Vercel e carrega fixtures (sem erro de CORS no console).
- [ ] `/start` no bot responde com o botão do Mini App.
- [ ] Quiz replay completo pela URL pública (5 chutes → ranking).
- [ ] Ancoragem on-chain com Phantom devnet → link do Explorer (guardar para o vídeo).

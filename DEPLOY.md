# CHUTE — Guia de Deploy (Superteam Brasil)

**Tempo total**: ~5 minutos  
**Custo**: FREE tier (Vercel + Railway)

---

## 🚀 Deploy Frontend (Vercel)

### Step 1: Preparar no GitHub

```bash
# Certificar que tudo está commitado
git status  # Deve estar limpo
git push    # Enviar para origin/feat/market-intel-skills-dogfood
```

### Step 2: Vercel Setup

1. **Acesse** [vercel.com](https://vercel.com)
2. **Sign in** com GitHub (ou criar conta)
3. **Clique** "Add New..." → "Project"
4. **Conecte** repositório `DGuedz/chute-live-shots`
5. **Configure build**:
   ```
   Framework: Vite
   Build Command: npm run build
   Output Directory: apps/web/dist
   Root Directory: ./ (ou deixar vazio)
   ```
6. **Environment Variables**:
   ```
   VITE_PUBLIC_APP_URL = https://seu-app-name.vercel.app
   VITE_API_URL = https://seu-backend.railway.app
   VITE_SOLANA_RPC_URL = https://api.mainnet-beta.solana.com
   ```
7. **Deploy!** (Vercel faz automaticamente)

**Resultado**: App está live em `https://seu-app-name.vercel.app` ✅

---

## 🚀 Deploy Backend (Railway)

### Step 1: Railway Setup

1. **Acesse** [railway.app](https://railway.app)
2. **Sign in** com GitHub (ou criar conta)
3. **Clique** "Create New" → "Project from GitHub repo"
4. **Selecione** `DGuedz/chute-live-shots`
5. **Configure**:
   - **Root Directory**: `apps/api`
   - **Start Command**: `python app/main.py`
   - **Port**: 8000

### Step 2: Environment Variables (Railway)

Na dashboard Railway, vá em "Variables" e adicione:

```
PORT = 8000
CHUTE_ENV = production
CHUTE_DRY_RUN = false
HELIUS_API_KEY = (copie do seu .env local)
```

### Step 3: Connect Database (SQLite)

Railway automaticamente persiste files em `/data`, então SQLite funciona:

```python
# apps/api/app/storage.py já usa:
DB_PATH = os.getenv('CHUTE_DB_PATH', '/data/chute.db')
```

**Resultado**: Backend está live em `https://seu-backend.railway.app` ✅

---

## 🔗 Conectar Frontend ↔ Backend

Após ambos deployarem, **atualize Vercel env**:

```
VITE_API_URL = https://seu-backend.railway.app
```

(Vercel auto-redeploy quando env muda)

---

## ✅ Teste de Integração

Após deploy:

1. **Abra** seu app Vercel
2. **Clique** "Conectar carteira"
3. **Phantom** abre
4. **Assina** (1 popup, retry 3x ativo)
5. **Quiz carrega** com dados TxLINE
6. **Resultado salvo** on-chain (mainnet)

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| **CORS error** | Vercel env `VITE_API_URL` incorreta ou backend offline |
| **Phantom timeout** | Retry automático (3x). Se falhar: wallet não conectada |
| **"RPC not configured"** | `VITE_SOLANA_RPC_URL` deve ter valor. Use `api.mainnet-beta.solana.com` |
| **Backend 502** | Railway ainda buildando. Aguarde 2-3 min |
| **SQLite lock** | Railway persiste files em `/data`. Reiniciar pod limpa locks |

---

## 📋 Checklist Pré-Submissão

- [ ] Frontend compilando sem erros (`npm run build`)
- [ ] Backend rodando localmente (`npm --workspace apps/api run dev`)
- [ ] Vercel projeto criado e deployado
- [ ] Railway projeto criado e deployado
- [ ] Env vars corretos em ambos
- [ ] App pública acessível
- [ ] Quiz carrega dados TxLINE
- [ ] Phantom wallet conecta e assina
- [ ] Retry automático funciona (fácil testar matando RPC temporariamente)

---

## 🎬 Próximo Passo: Gravar Vídeo Demo

Com app public pronta:

```bash
# 1. Abra seu app Vercel (https://seu-app.vercel.app)
# 2. Use Loom/ScreenFlow para gravar 5 min:
#    - Intro (30s): o que é CHUTE + TxLINE
#    - Demo (2min): conectar wallet, fazer quiz, resultado on-chain
#    - Prova (2min 30s): abrir explorer.solana.com, verificar TX
# 3. Salve como MP4
```

---

## 📞 URLs Finais

Após deploy:

```
Frontend:   https://seu-app.vercel.app
Backend:    https://seu-backend.railway.app
GitHub:     https://github.com/DGuedz/chute-live-shots
Explorer:   https://explorer.solana.com/tx/{signature}?cluster=mainnet
```

---

**Status**: Pronto para submissão Superteam Brasil World Cup! 🎯

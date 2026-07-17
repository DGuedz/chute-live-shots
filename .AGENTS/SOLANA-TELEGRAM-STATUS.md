# Estado Atual: Solana + Telegram Mini App Integration

Data: 2026-07-17 | Status: ⚠️ PARCIAL | Prioridade: P0 (Para Hackathon)

---

## Estado da Integração

### ✅ O Que Funciona

#### 1. **Wallet Connection (Básico)**
- ✅ `connectWallet()` em main.tsx
- ✅ Phantom provider detection (`window.phantom?.solana || window.solana`)
- ✅ Nonce challenge + ed25519 signature verification (backend)
- ✅ `/api/wallet/challenge` → POST nonce
- ✅ `/api/wallet/session` → POST public_key + signature
- ✅ Session storage em SQLite (wallet_challenges, wallet_sessions)
- ✅ Display público da wallet (truncado: `XXXX…XXXX`)

**Teste:**
```bash
curl -X POST http://127.0.0.1:8001/api/wallet/challenge \
  -H "Content-Type: application/json" \
  -d '{"public_key": "test123"}'
→ {"nonce": "...", "message": "Sign this", ...}

curl -X POST http://127.0.0.1:8001/api/wallet/session \
  -d '{"public_key": "...", "signature": "...", "network": "devnet"}'
→ {"session_id": "...", "verified": true}
```

#### 2. **Telegram Mini App SDK**
- ✅ `@telegram-apps/sdk-react` instalado
- ✅ `bootTelegramMiniApp()` chama:
  - `init()` → Inicializa SDK
  - `miniApp.mountSync()` → Monta componente
  - `miniApp.bindCssVars()` → Tema Telegram
  - `viewport.mount()` → Expansão
  - `miniApp.setHeaderColor()` → Cor customizada
  - `miniApp.ready()` → Avisa ao Telegram que está pronto
  - `viewport.expand()` → Full screen
- ✅ Fallback se window.Telegram não disponível
- ✅ Haptic feedback integrado (vibração)

#### 3. **UI Básica**
- ✅ Botão "Phantom" no header (muda para wallet addr quando conectado)
- ✅ Error display para falhas de wallet
- ✅ Deep link fallback: `https://phantom.app/ul/browse/...`
- ✅ Mostrador de rede (pill "DEVNET")

### ⏳ O Que Falta (Crítico)

#### 1. **Telegram Mini App Bot**
- ❌ Bot `/start` command não configurado
- ❌ Sem deep linking automático para Phantom no Telegram
- ❌ Sem webhook ou polling para atualizações
- ❌ Sem persistência de usuário Telegram ↔ Wallet

**Necessário:**
```python
# apps/telegram-bot/bot.py (não existe)
@dp.message_handler(commands=['start'])
async def start_command(message: Message):
    # Gera deep link para Phantom
    # Abre Mini App
    pass
```

#### 2. **Wallet UI/UX Mobile**
- ❌ Sem layout otimizado para mobile Telegram
- ❌ Sem visual feedback de loading durante assinatura
- ❌ Sem tratamento de erro amigável em mobile
- ❌ Sem suporte a múltiplos wallets (só Phantom)
- ❌ Sem remembrance/reconnect automático
- ❌ Sem QR code como fallback

**Necessário:**
```tsx
// apps/web/src/wallet-modal.tsx (não existe)
<WalletModal 
  isOpen={showWallet}
  providers={["phantom", "backpack", "solflare"]}
  onConnect={(publicKey) => ...}
/>
```

#### 3. **Network Switching**
- ❌ Hardcoded em `devnet` apenas
- ❌ Sem UI para mudar entre devnet/mainnet/testnet
- ❌ Sem verificação de network no Phantom
- ❌ Sem warning se usuário está em mainnet

**Necessário:**
```tsx
// NetworkSelector component
const networkName = params.network === 'mainnet' ? 'Mainnet' : 'Devnet';
<select value={network} onChange={(n) => switchNetwork(n)}>
  <option value="devnet">Devnet</option>
  <option value="testnet">Testnet</option>
  <option value="mainnet">Mainnet</option>
</select>
```

#### 4. **Session Persistence**
- ❌ Wallet session perde ao refresh de página
- ❌ Sem localStorage para recovery automático
- ❌ Sem check se sessão ainda é válida (TTL 300s)
- ❌ Sem re-authentication transparente

**Necessário:**
```typescript
// useEffect em App mount
useEffect(() => {
  const savedWallet = localStorage.getItem('chute-wallet');
  if (savedWallet) {
    // Tenta validar com backend
    validateSession(savedWallet);
  }
}, []);
```

#### 5. **Telegram Bot Token & Webhook**
- ❌ Arquivo `apps/telegram-bot/` não existe
- ❌ Sem ambiente configurado (.env)
- ❌ Sem integração com `/api/session/telegram`
- ❌ Sem listener para mensagens do usuário Telegram

**Necessário:**
```bash
# .env
TELEGRAM_BOT_TOKEN=xxxxx (não configurado)
TELEGRAM_BOT_WEBHOOK_URL=https://... (não configurado)
```

#### 6. **Solana RPC & Program**
- ❌ Sem chamadas diretas ao RPC (só TxLINE)
- ❌ Sem verificação de SOL balance
- ❌ Sem on-chain validation de quiz resultado
- ❌ Sem settlement/payout logic

**Necessário:**
```typescript
// apps/api/app/solana.py (não existe)
const rpcConnection = new Connection(process.env.SOLANA_RPC_URL);
const balance = await rpcConnection.getBalance(publicKey);
const signature = await publishQuizResult(publicKey, quizId, score);
```

#### 7. **Types & Interfaces**
- ❌ Sem `WalletSession` type formal
- ❌ Sem `TelegramUser` interface
- ❌ Sem `SignMessage` request/response types

---

## Architecture Atual vs. Necessário

### Fluxo Atual (Incompleto)

```
User
  ↓
Home Screen (Web Browser)
  ↓
"Phantom" Button
  ↓
connectWallet() → Provider.connect()
  ↓
GET /api/wallet/challenge (nonce)
  ↓
Provider.signMessage(nonce)
  ↓
POST /api/wallet/session (signature)
  ↓
✅ Session criada no backend
  ❌ Mas perde ao refresh
  ❌ Sem persistência frontend
  ❌ Sem bot do Telegram
```

### Fluxo Necessário (Completo)

```
Telegram
  ↓
Bot /start command
  ↓
Deep link → Phantom (ou modal)
  ↓
Phantom Open/Deep Link
  ↓
"Connect CHUTE"
  ↓
Solana Wallet Adapter (suporta múltiplos wallets)
  ↓
GET /api/wallet/challenge + Provider.signMessage()
  ↓
POST /api/wallet/session (salva em localStorage + backend)
  ↓
Quiz Flow (com participant_id = TelegramUser.id)
  ↓
Quiz Result
  ↓
POST /api/quiz/submit (assinado com wallet)
  ↓
Opcional: Publicar on-chain (RPC call)
  ↓
Resultado com proof Solana + Telegram
```

---

## Próximas Ações (Prioridade Hackathon)

### P0 (Essencial para demo)

1. **Melhorar UX Wallet (1-2h)**
   - [ ] Loading spinner durante signature
   - [ ] Error modal com retry
   - [ ] Wallet shorthand → button
   - [ ] Mobile responsive layout
   - [ ] Persist session em localStorage

2. **Telegram Bot Básico (1-2h)**
   - [ ] `/start` command
   - [ ] Webhook ou polling
   - [ ] Link para Mini App
   - [ ] Bind Telegram user_id → participant_id

3. **Network Selector (30min)**
   - [ ] Dropdown devnet/mainnet
   - [ ] Warn se mainnet
   - [ ] Store em localStorage

### P1 (Nice-to-have)

4. **Wallet Adapter Library (2-3h)**
   - Suportar Phantom + Backpack + Solflare
   - Modal com ícones
   - Fácil switch

5. **On-Chain Validation (2-3h)**
   - Publicar quiz result em Solana
   - Verify signature server-side
   - Emit event para proof

6. **Telegram Mini App Polished (2-3h)**
   - Theme selector
   - Biometric auth
   - Share results

---

## Arquivos Relacionados

| Arquivo | Status | Role |
|---------|--------|------|
| `apps/web/src/main.tsx` | ✅ Parcial | connectWallet() + UI |
| `apps/web/src/telegram-mini-app.ts` | ✅ OK | SDK boot |
| `apps/api/app/main.py` | ✅ Parcial | /api/wallet/* endpoints |
| `apps/api/app/storage.py` | ✅ OK | wallet_sessions table |
| `apps/telegram-bot/` | ❌ Missing | Bot logic |
| `apps/web/src/wallet-modal.tsx` | ❌ Missing | Reusable modal |
| `apps/api/app/solana.py` | ❌ Missing | RPC integration |

---

## Checklist para "MVP Solana-Ready"

- [ ] Wallet persist across page refreshes (localStorage)
- [ ] Mobile-friendly wallet UX
- [ ] Telegram bot `/start` command
- [ ] Network selector (devnet/mainnet)
- [ ] Multiple wallet support (Phantom + 2 others)
- [ ] Loading + error states
- [ ] Telegram user_id → participant_id binding
- [ ] On-chain signature verification
- [ ] Quiz result linkable to wallet
- [ ] Proof display (tx on explorer)

---

## Estimativa de Tempo (se fazer agora)

| Task | Time | Difficulty |
|------|------|------------|
| UX Polish (wallet) | 1-2h | Easy |
| Telegram Bot Basic | 1-2h | Medium |
| Network Selector | 0.5h | Easy |
| Wallet Adapter | 2-3h | Medium |
| On-Chain Integration | 2-3h | Hard |
| **Total** | **7-13h** | — |

**Para Hackathon:** Focar P0 apenas = 2-4h suficiente

---

## Bloqueadores Identificados

1. **Telegram Bot Token** — Precisa estar em `.env` (não está configurado)
2. **Solana RPC URL** — Precisa estar em `.env` (está em exemplo apenas)
3. **Wallet Adapter Library** — Adicionar dependência npm
4. **Deep Linking** — Funciona em Telegram app, mas não em browser

---

## Próximo Passo Recomendado

**Se priorizar Telegram + Solana:**

1. Implementar P0 (UX + Bot básico) em 2-4h
2. Testar em Telegram Desktop + Mobile
3. Gravar vídeo mostrando flow completo
4. Submeter hackathon com Solana integration como diferencial

**Ou:**

1. Focar em vídeo demo do quiz preditivo (já funcional)
2. Deixar Solana como "coming soon" na submissão
3. P1 para pós-hackathon

---

## Recomendação Final

**Para hackathon em 39 horas:** Solana + Telegram é bom, mas quiz preditivo já está 100% pronto. Sugestão:

- ✅ Gravar vídeo mostrando quiz preditivo (2h)
- ⏳ Se sobrar tempo: UX wallet + Telegram bot básico (2-4h)
- ✅ Submeter com demo de quiz preditivo + Telegram Mini App

**Cronômetro:** 2h demo + 4h Solana-ready + 30min submit = 6.5h total ainda temos 32.5h de margem


# Real-Time Data Status - Abstract & Clean UX

## Philosophy
**Hide technical complexity. Show only what the user needs to know.**

## What Changed

### ❌ BEFORE (Technical Noise)
```
CONECTAR DADOS EM TEMPO REAL
- RPC Devnet (Privado · configurado)
- Wallet Phantom (Aguardando conexão mobile)
- Subscribe SL1 (Transação confirmada)
- [API token ativado details]
- [Explorer links]
```

**Problems:**
- User doesn't care about RPC endpoints
- SL1 vs SL12 is developer-level detail
- Wallet Phantom connection is internal infrastructure
- Too many status indicators = confusion

### ✅ AFTER (User-Focused)
```
● Dados ao vivo          ✓ Sincronizado
Atualizado agora
```

**Benefits:**
- One clear pulse indicator (●) = "live"
- One status badge (✓) = "synced"
- One timestamp = "when"
- Minimal, clean, unambiguous

---

## Component: RealtimeDataStatus

### Props
```typescript
interface RealtimeDataStatusProps {
  isConnected: boolean;      // Is data streaming?
  lastUpdated?: Date;        // Optional: when was the last update?
}
```

### Usage
```tsx
<RealtimeDataStatus 
  isConnected={true}
  lastUpdated={new Date()}
/>
```

### Visual States

**Connected (Live):**
```
● Dados ao vivo          ✓ Sincronizado
Atualizado agora
```

**Connecting:**
```
● Conectando...
```

**Offline:**
```
● Desconectado
```

---

## Design Tokens

| Element | Token | Value |
|---------|-------|-------|
| Live pulse | `#BFFF00` (Lime) | Neon, animated |
| Check mark | `#BFFF00` (Lime) | Confirmation |
| Background | `rgba(191, 255, 0, 0.04)` | Soft accent |
| Border | `rgba(191, 255, 0, 0.12)` | Subtle frame |

---

## Implementation Notes

- **No technical jargon:** RPC, SL1, Wallet, API tokens are internal
- **One source of truth:** `isConnected` boolean drives all UI
- **Minimal animation:** Pulse only on "live" state
- **Responsive:** Stacks on mobile
- **Accessible:** aria-labels recommended for status

---

## When to Use

1. **Match Feed Header** - Show data is streaming
2. **Quiz Engine** - Confirm real-time scoring data
3. **Stats Dashboard** - Indicate live updates
4. **Anywhere showing live data** - Replace technical status with this

---

## Future: SL12 Migration

When upgrading from SL1 → SL12:
- **No UI change needed** - just pass `isConnected={true}`
- Backend handles the complexity
- User sees the same clean interface
- Infrastructure becomes transparent

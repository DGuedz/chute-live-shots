# 🎯 Guia de Implementação - CHUTE Icons & Clean Components

Status: ✅ **Pronto para usar** | Icons: 50+ | Components: 6 | Logos: 2 placeholders

---

## 📦 Componentes Criados

### 1. **Icon System** (`src/icons/`)
```typescript
import { Icon, IconVariants, IconSizes } from './icons';

// Uso básico
<Icon name="soccer" size={24} color="lime" />

// Com variantes
{IconVariants.action('play', 24)}
{IconVariants.alert('warning', 24)}
```

### 2. **Logo Placeholders** (`src/components/LogoPlaceholders.tsx`)
```typescript
import { SolanaLogoBrand, TxLINELogoBrand, LogoBadge } from './components/LogoPlaceholders';

// Placeholder Solana
<SolanaLogoBrand size={32} />

// Placeholder TxLINE
<TxLINELogoBrand size={32} />

// Com label
<LogoBadge name="solana" showLabel />
<LogoBadge name="txline" />
```

**Nota:** Espaço reservado para inserir logos oficiais quando disponíveis.

### 3. **Header** (`src/components/Header.tsx`)
```typescript
import { Header } from './components/Header';

<Header
  wallet="9B85wQnf3QuiQC1pFQrZiuvVMjjxya5d4yd7wJ726fpD"
  network="devnet"
  onMenuClick={() => {}}
  onWalletClick={() => {}}
  onSettingsClick={() => {}}
/>
```

### 4. **Clean Components** (`src/components/CleanComponents.tsx`)

#### CleanButton
```typescript
import { CleanButton } from './components/CleanComponents';

<CleanButton
  icon="play"
  label="Começar"
  variant="primary"
  onClick={() => {}}
/>
```

#### StatusBadge
```typescript
import { StatusBadge } from './components/CleanComponents';

<StatusBadge status="available" label="5 PERGUNTAS" />
<StatusBadge status="locked" label="BLOQUEADO" />
```

#### StatRow
```typescript
import { StatRow } from './components/CleanComponents';

<StatRow icon="trophy" label="SCORE" value={850} color="lime" />
<StatRow icon="rank" label="RANKING" value="#1" color="orange" />
```

#### InfoAlert
```typescript
import { InfoAlert } from './components/CleanComponents';

<InfoAlert
  type="success"
  message="Chute registrado!"
  dismissible
  onDismiss={() => {}}
/>
```

#### EmptyState
```typescript
import { EmptyState } from './components/CleanComponents';

<EmptyState
  icon="loading"
  title="Aguardando dados"
  description="TxLINE está processando o snapshot"
  action={{ label: "Atualizar", onClick: () => {} }}
/>
```

#### DividerWithIcon
```typescript
import { DividerWithIcon } from './components/CleanComponents';

<DividerWithIcon icon="bolt" />
```

---

## 🎨 Copy Limpa - Padrão de Uso

### ❌ Evitar (Poluído)
```typescript
<p>Você fez 3 chutes dos 5 disponíveis neste quiz. 
Clique aqui para ver os seus resultados.</p>
```

### ✅ Fazer (Limpo)
```typescript
<StatRow icon="stats" label="PROGRESSO" value="3/5" color="lime" />
<CleanButton icon="replay" label="Ver Resultado" onClick={() => {}} />
```

---

## 📝 Padrões de Implementação

### Padrão 1: Card com Ícone + Ação

**Antes:**
```typescript
<div>
  <h3>Chutes a Gol</h3>
  <p>Acerte o número de chutes a gol</p>
  <p>5 perguntas disponíveis</p>
  <button>Começar Quiz</button>
</div>
```

**Depois:**
```typescript
<div className="bg-neo-bg-card border-2 border-neo-lime rounded p-6">
  <div className="flex items-center gap-3 mb-4">
    <Icon name="shot" size={24} color="lime" />
    <div>
      <h3 className="text-neo-white font-black">Chutes a Gol</h3>
      <p className="text-neo-blue-gray text-sm">5 perguntas</p>
    </div>
  </div>
  <CleanButton icon="play" label="Começar" variant="primary" />
</div>
```

### Padrão 2: Status com Badge

**Antes:**
```typescript
{available ? (
  <p className="text-green-500">Este quiz está disponível para jogar agora</p>
) : (
  <p className="text-gray-500">Este quiz será ativado quando houver dados</p>
)}
```

**Depois:**
```typescript
<StatusBadge status={available ? 'available' : 'locked'} />
```

### Padrão 3: Mensagens de Estado

**Antes:**
```typescript
{loading && <p>Carregando dados...</p>}
{error && <p className="text-red-500">Erro: {error}</p>}
{success && <p className="text-green-500">Sucesso!</p>}
```

**Depois:**
```typescript
{loading && <InfoAlert type="info" message="Carregando..." />}
{error && <InfoAlert type="error" message={error} dismissible />}
{success && <InfoAlert type="success" message="Sucesso!" />}
```

---

## 🔌 Integração no Main.tsx

Substituir estrutura polida por componentes com ícones:

```typescript
// Import dos componentes
import { Header } from './components/Header';
import { Icon } from './icons';
import { CleanButton, StatusBadge, EmptyState, StatRow } from './components/CleanComponents';

// No App component
function App() {
  return (
    <main>
      <Header
        wallet={wallet}
        network={network}
        onMenuClick={() => setScreen('home')}
        onWalletClick={wallet ? disconnectWallet : connectWallet}
        onSettingsClick={() => setScreen('setup')}
        loading={walletConnecting}
      />

      {/* Hero Section - Limpo */}
      <section className="py-12">
        <div className="text-center">
          <Icon name="soccer" size={48} color="lime" className="mx-auto mb-4" />
          <h1 className="text-neo-lime font-black text-4xl mb-2">CHUTE</h1>
          <p className="text-neo-blue-gray mb-6">Jogue o momento.</p>
          <CleanButton
            icon="play"
            label="Começar"
            variant="primary"
            onClick={loadMeta}
          />
        </div>
      </section>

      {/* Quiz Cards - Com Ícones */}
      <section className="grid gap-4">
        {[
          { tier: 'chutes', icon: 'shot', label: 'Chutes' },
          { tier: 'escanteios', icon: 'corner', label: 'Escanteios' },
          { tier: 'faltas', icon: 'card', label: 'Faltas' },
        ].map(({ tier, icon, label }) => (
          <div key={tier} className="bg-neo-bg-card border-2 border-neo-lime rounded p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name={icon} size={24} color="orange" />
                <span className="font-bold text-neo-white">{label}</span>
              </div>
              <CleanButton
                icon="play"
                label="Jogar"
                variant="primary"
                size="sm"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Stats Row - Ranking */}
      <section className="flex gap-6">
        <StatRow icon="trophy" label="SCORE" value={score} color="lime" />
        <StatRow icon="rank" label="RANKING" value={`#${rank}`} color="orange" />
        <StatRow icon="checkmark" label="ACERTOS" value={accuracy} color="neonGreen" />
      </section>
    </main>
  );
}
```

---

## 🚀 Checklist de Implementação

- [ ] Header integrado com ícones
- [ ] Quiz cards com ícones + CleanButtons
- [ ] Stats com StatRow
- [ ] Alerts/Errors com InfoAlert
- [ ] Status de disponibilidade com StatusBadge
- [ ] Empty states com EmptyState
- [ ] Logos placeholder (Solana + TxLINE) em header/footer
- [ ] Copy revisada (sem poluição)
- [ ] Testar no dev server
- [ ] Revisar acessibilidade (labels nos botões)

---

## 📊 Benefícios

✅ **Copy Limpa** - Menos texto, mais clareza visual
✅ **Ícones Realistas** - Tabler + Phosphor premium
✅ **Componentes Reutilizáveis** - DRY principle
✅ **Acessível** - Labels, ARIA, feedback visual
✅ **Performance** - SVG leve, tree-shakeable
✅ **Manutenível** - Componentes documentados

---

## 📚 Referências

- `ICON_SYSTEM.md` - Sistema de ícones completo
- `src/icons/` - Implementação do Icon System
- `src/components/` - Todos os componentes
- `/design-system.html` - Showcase visual (http://localhost:5175/design-system.html)

---

**Próximo:** Integre no main.tsx seguindo os padrões acima.

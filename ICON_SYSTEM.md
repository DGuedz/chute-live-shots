# CHUTE Icon System
## Neo Arcade Football - Tabler Icons + Phosphor Icons

Sistema de ícones SVG realistas e customizáveis para o CHUTE com integração completa ao design system Neo Arcade Football.

---

## 📦 Dependências Instaladas

```bash
npm install tabler-icons-react @phosphor-icons/react
```

- **Tabler Icons**: 5.2K+ ícones open-source
- **Phosphor Icons**: 8K+ ícones com múltiplos pesos (thin, light, regular, bold, fill)

---

## 🎨 Paleta de Cores

```typescript
const NEO_ARCADE_COLORS = {
  navy: '#031330',           // Azul-marinho profundo
  lime: '#C8F000',           // Verde-limão (identidade principal)
  orange: '#FF5A00',         // Laranja energético (ação)
  white: '#F8F8F3',          // Branco neutro
  neonGreen: '#A7D900',      // Verde neon
  electricYellow: '#E7FF00', // Amarelo elétrico
  blueGray: '#4D5870',       // Cinza azulado
};
```

---

## 🚀 Uso Básico

### Componente `Icon`

```typescript
import { Icon } from './icons';

// Uso básico
<Icon name="soccer" size={24} color="lime" />

// Com customização completa
<Icon 
  name="trophy" 
  size={32} 
  color="orange" 
  weight="bold" 
  strokeWidth={2}
/>

// Cores disponíveis
<Icon name="goal" color="white" />
<Icon name="shot" color="lime" />
<Icon name="error" color="orange" />
<Icon name="user" color="neonGreen" />
<Icon name="warning" color="electricYellow" />
<Icon name="info" color="blueGray" />
<Icon name="inherit" /> {/* Usa cor do parent */}
```

### Props

| Prop | Type | Default | Descrição |
|------|------|---------|-----------|
| `name` | string | - | Nome do ícone (obrigatório) |
| `size` | 16 \| 20 \| 24 \| 32 \| 40 \| 48 | 24 | Tamanho em pixels |
| `color` | keyof NEO_ARCADE_COLORS \| 'inherit' | 'white' | Cor do ícone |
| `weight` | 'thin' \| 'light' \| 'regular' \| 'bold' \| 'fill' | 'regular' | Peso/espessura (Phosphor) |
| `strokeWidth` | number | 1.5 | Espessura do traço (Tabler) |
| `className` | string | - | Classes CSS adicionais |

---

## 📚 Ícones Disponíveis

### ⚽ Esportes & Futebol

```typescript
'soccer'      // Bola de futebol
'goal'        // Gol/troféu
'shot'        // Chute
'ball'        // Bola
'corner'      // Escanteio
'card'        // Cartão
'yellowCard'  // Cartão amarelo
'redCard'     // Cartão vermelho
'whistle'     // Apito
'stadium'     // Estádio
```

### ▶️ Ação & Controle

```typescript
'play'        // Play
'pause'       // Pausa
'stop'        // Parar
'replay'      // Replay
'refresh'     // Atualizar
```

### 🏠 UI & Navegação

```typescript
'home'        // Home
'menu'        // Menu
'close'       // Fechar (X)
'back'        // Voltar
'forward'     // Avançar
'chevronDown' // Chevron para baixo
'chevronUp'   // Chevron para cima
```

### ✓ Status & Feedback

```typescript
'checkmark'   // Checkmark
'success'     // Sucesso
'error'       // Erro
'warning'     // Aviso
'info'        // Info
'loading'     // Carregando
```

### 🏆 Ranking & Achievement

```typescript
'trophy'      // Troféu
'medal'       // Medalha
'rank'        // Ranking/números
'star'        // Estrela
'bolt'        // Raio
'flame'       // Chama
```

### 📊 Dados & Analytics

```typescript
'chart'       // Gráfico
'trend'       // Tendência
'stats'       // Estatísticas
'users'       // Usuários
'user'        // Usuário
```

### 💳 Wallet & Pagamento

```typescript
'wallet'      // Carteira
'coin'        // Moeda
'transaction' // Transação
```

### ⚙️ Configuração

```typescript
'settings'    // Configurações
'config'      // Configuração
```

---

## 🎯 Variantes Pré-definidas

```typescript
import { IconVariants, Icon } from './icons';

// Variante de Ação (Lime)
{IconVariants.action('play', 24)}

// Variante Padrão (Branco)
{IconVariants.default('home', 24)}

// Variante de Alerta (Laranja)
{IconVariants.alert('warning', 24)}

// Variante de Sucesso (Verde Neon)
{IconVariants.success('checkmark', 24)}

// Variante Sutil (Cinza)
{IconVariants.subtle('info', 24)}

// Badge (Pequeno, fundo navy, texto lime)
{IconVariants.badge('trophy')}
```

---

## 🔧 Tamanhos Pré-definidos

```typescript
import { IconSizes } from './icons';

// Nomes disponíveis
IconSizes.xs   // 16px
IconSizes.sm   // 20px
IconSizes.base // 24px
IconSizes.lg   // 32px
IconSizes.xl   // 40px
IconSizes['2xl'] // 48px

// Uso
<Icon name="trophy" size={IconSizes.lg} />
```

---

## 💻 Exemplos de Componentes

### Icon Button

```typescript
<button className="icon-button icon-button-primary">
  <Icon name="play" size={20} color="inherit" />
  Começar
</button>

<button className="icon-button icon-button-danger">
  <Icon name="stop" size={20} color="inherit" />
  Parar
</button>
```

### Icon Badge

```typescript
<div className="icon-badge">
  <Icon name="trophy" size={16} color="inherit" />
</div>
```

### Combo Icon + Text

```typescript
<div className="flex items-center gap-2">
  <Icon name="trophy" size={24} color="lime" />
  <span className="text-neo-lime font-bold">850 pontos</span>
</div>
```

### Header Actions

```typescript
<header className="flex items-center justify-between">
  <Icon name="menu" size={24} color="lime" />
  <h1>CHUTE</h1>
  <Icon name="settings" size={24} color="white" />
</header>
```

---

## 📋 Quiz Card Example

```typescript
import { QuizCardWithIcons } from './components/QuizCardWithIcons';

<QuizCardWithIcons
  title="Chutes a Gol"
  description="Acerte o número de chutes"
  tier="chutes"
  available={true}
  questions={5}
/>
```

---

## 🎭 Icon Showcase

Para visualizar todos os ícones e cores:

```typescript
import { IconShowcase } from './icons';

// Em uma rota ou página
<IconShowcase />
```

Acesso: `/icon-showcase` (se configurado nas rotas)

---

## 🔌 Integração com Tailwind CSS

O sistema usa classes CSS que herdam as variáveis de cor:

```css
/* neo-arcade-tokens.css */
.neo-lime { color: var(--neo-lime); }
.neo-orange { color: var(--neo-orange); }
.neo-surface { background-color: var(--neo-surface); }
```

**Uso com Tailwind:**

```typescript
<div className="text-neo-lime">
  <Icon name="trophy" size={24} color="inherit" />
</div>
```

---

## 🎨 Customização

### Adicionar novo ícone

No arquivo `icon-system.tsx`:

```typescript
const ICON_REGISTRY: IconRegistry = {
  // ... ícones existentes

  myCustomIcon: {
    tabler: TablerIcons.IconMyIcon,
    phosphor: PhosphorIcons.MyIcon,
  },
};
```

Depois use:

```typescript
<Icon name="myCustomIcon" size={24} color="lime" />
```

### Adicionar nova cor

No arquivo `icon-system.tsx`:

```typescript
export const NEO_ARCADE_COLORS = {
  // ... cores existentes
  myColor: '#HEXCODE',
};
```

---

## 📚 Recursos

- **Tabler Icons**: https://tabler-icons.io
- **Phosphor Icons**: https://phosphoricons.com
- **NPM Tabler**: https://www.npmjs.com/package/tabler-icons-react
- **NPM Phosphor**: https://www.npmjs.com/package/@phosphor-icons/react

---

## ✅ Checklist de Implementação

- [x] Instalar tabler-icons-react + @phosphor-icons/react
- [x] Criar icon-system.tsx com registry
- [x] Criar icon-showcase.tsx para visualizar
- [x] Adicionar classes CSS no neo-arcade-tokens.css
- [x] Criar exemplos de componentes (QuizCardWithIcons)
- [x] Integrar com design system Neo Arcade
- [ ] Aplicar ícones nos componentes do CHUTE
- [ ] Testar no navegador (http://localhost:5175/icon-showcase)
- [ ] Otimizar performance de bundle

---

## 🚀 Próximos Passos

1. **Visualizar showcase**: Acesse `/icon-showcase` no dev server
2. **Integrar componentes**: Use `Icon` e `QuizCardWithIcons` nos layouts existentes
3. **Customizar**: Adicione mais ícones conforme necessário
4. **Otimizar**: Verifique bundle size, remova ícones não usados

---

**Última atualização**: 2026-07-17
**Design System**: Neo Arcade Football
**Status**: ✅ Pronto para uso

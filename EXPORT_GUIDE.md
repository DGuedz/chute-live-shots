# 📦 CHUTE - Guia de Exportação e Integração de Ferramentas

**Data:** 2026-07-17 | **Versão:** 1.0 | **Status:** Pronto para Integração

---

## 📋 Índice

1. [Estrutura do Projeto](#estrutura-do-projeto)
2. [Ferramentas Disponíveis](#ferramentas-disponíveis)
3. [Guia de Integração](#guia-de-integração)
4. [Exemplos de Uso](#exemplos-de-uso)
5. [Checklist de Implementação](#checklist-de-implementação)
6. [Referência Rápida](#referência-rápida)

---

## 📁 Estrutura do Projeto

```
/Users/doublegreen/mind_v2/chute/
├── apps/
│   └── web/                          ← App React Web Principal
│       ├── src/
│       │   ├── components/            ← Componentes Reutilizáveis
│       │   │   ├── Header.tsx         ✅ Com ícones integrados
│       │   │   ├── CleanComponents.tsx✅ 6 componentes minimalistas
│       │   │   ├── LogoPlaceholders.tsx✅ Solana + TxLINE logos
│       │   │   └── [Adicione aqui]    📝 Novos componentes
│       │   │
│       │   ├── icons/                 ← Sistema de Ícones
│       │   │   ├── icon-system.tsx    ✅ 50+ ícones (Tabler + Phosphor)
│       │   │   ├── icon-showcase.tsx  ✅ Showcase interativo
│       │   │   └── index.ts           📝 Exporta componentes
│       │   │
│       │   ├── utils/                 ← Utilitários
│       │   │   ├── api.ts             📝 Configuração Axios
│       │   │   ├── format.ts          📝 Formatações
│       │   │   └── storage.ts         📝 AsyncStorage wrapper
│       │   │
│       │   ├── styles/                ← Estilos
│       │   │   ├── neo-arcade-tokens.css    ✅ Variáveis CSS
│       │   │   ├── neo-arcade-main.css      ✅ Componentes base
│       │   │   └── neo-arcade-sections.css  ✅ Seções específicas
│       │   │
│       │   ├── main.tsx               ✅ App principal (integrado)
│       │   └── vite-env.d.ts          ✅ Types Vite
│       │
│       ├── dist/                      ← Build de produção
│       ├── package.json               ✅ Dependências configuradas
│       ├── vite.config.ts             ✅ Config Vite
│       └── tsconfig.json              ✅ Config TypeScript
│
├── scripts/                           ← Scripts de automação
├── docs/                              ← Documentação
├── EXPORT_GUIDE.md                    ← Este arquivo
└── package.json                       ✅ Monorepo root
```

---

## 🛠️ Ferramentas Disponíveis

### 1. **Axios** (`axios@1.18.1`)

**Status:** ✅ Já incluída

**Uso Básico:**
```typescript
import axios from 'axios';

// GET
const { data } = await axios.get('/endpoint');

// POST
const response = await axios.post('/endpoint', payload);

// Com tratamento de erro
try {
  const { data } = await axios.get('/endpoint');
} catch (error) {
  console.error(error.message);
}
```

---

### 2. **Ícones** (Tabler + Phosphor)

**Status:** ✅ Já incluída
- `@tabler/icons-react@3.45.0` (5.2K+ ícones)
- `@phosphor-icons/react@2.1.10` (8K+ ícones)

**50+ Ícones Disponíveis:**
```
Sports: soccer, goal, shot, ball, corner, card, wallet, coin
UI: menu, close, home, play, refresh, checkmark, error, warning
Data: chart, trend, stats, users, trophy, medal, star, bolt
```

**Uso:**
```typescript
import { Icon, IconVariants, IconSizes } from '@/icons';

<Icon name="wallet" size={24} color="lime" />
{IconVariants.action('play', 24)}
<Icon name="trophy" size={IconSizes.lg} />
```

---

### 3. **Design System Neo Arcade**

**Cores:**
```
Navy: #031330        | Lime: #C8F000       | Orange: #FF5A00
White: #F8F8F3       | BlueGray: #4D5870   | NeonGreen: #A7D900
```

**Tipografia:**
```
Títulos: Teko, Anton
Corpo: Rajdhani, Space Grotesk
```

---

### 4. **Componentes Clean**

```typescript
<CleanButton icon="play" label="Começar" variant="primary" />
<StatusBadge status="available" label="5 PERGUNTAS" />
<StatRow icon="trophy" label="SCORE" value={850} color="lime" />
<InfoAlert type="success" message="Sucesso!" dismissible />
<EmptyState icon="loading" title="Processando..." />
<DividerWithIcon icon="bolt" />
```

---

## 🔌 Guia de Integração

### 1. Requisições de API

**Criar arquivo:** `src/utils/api.ts`
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Usar em componente:**
```typescript
import apiClient from '@/utils/api';

const fetchData = async () => {
  try {
    const { data } = await apiClient.get('/endpoint');
    return data;
  } catch (error) {
    console.error(error);
  }
};
```

---

### 2. Adicionar Novo Ícone

**Editar:** `src/icons/icon-system.tsx`
```typescript
const ICON_REGISTRY: IconRegistry = {
  // Existentes...
  myNewIcon: { tabler: TablerIcons.YourIcon },
};
```

**Usar:**
```typescript
<Icon name="myNewIcon" size={24} color="lime" />
```

---

### 3. Criar Novo Componente

**Arquivo:** `src/components/MyComponent.tsx`
```typescript
import React from 'react';
import { Icon } from '@/icons';

export const MyComponent: React.FC<Props> = ({ title }) => (
  <div>
    <Icon name="wallet" size={24} color="lime" />
    <h3>{title}</h3>
  </div>
);
```

**Usar no main.tsx:**
```typescript
import { MyComponent } from './components/MyComponent';
<MyComponent title="Título" />
```

---

### 4. Formatação de Dados

**Criar:** `src/utils/format.ts`
```typescript
export const formatCurrency = (value: number, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
};
```

**Usar:**
```typescript
import { formatCurrency, formatDate } from '@/utils/format';

<Text>{formatCurrency(5000, 'USD')}</Text>
<Text>{formatDate('2026-07-17')}</Text>
```

---

## 📖 Exemplo Completo: Conversor de Moedas

```typescript
import React, { useState, useEffect } from 'react';
import { Icon } from '@/icons';
import { CleanButton, StatRow, InfoAlert } from '@/components/CleanComponents';
import axios from 'axios';
import { formatCurrency } from '@/utils/format';

export function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BRL');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
        );
        setExchangeRate(data.rates[toCurrency]);
        setError(null);
      } catch (err) {
        setError('Erro ao buscar taxa');
      } finally {
        setLoading(false);
      }
    };
    fetchRate();
  }, [fromCurrency, toCurrency]);

  const result = exchangeRate 
    ? (parseFloat(amount) * exchangeRate).toFixed(2)
    : null;

  return (
    <div className="converter">
      <h1>Conversor 💱</h1>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
      />

      <div className="currencies">
        <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
          <option>USD</option>
          <option>BRL</option>
          <option>EUR</option>
        </select>
        <Icon name="forward" size={24} color="lime" />
        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
          <option>USD</option>
          <option>BRL</option>
          <option>EUR</option>
        </select>
      </div>

      {loading && <div>Carregando...</div>}
      {error && <InfoAlert type="error" message={error} dismissible />}

      {result && (
        <StatRow
          icon="trending-up"
          label={`${amount} ${fromCurrency}`}
          value={formatCurrency(parseFloat(result), toCurrency)}
          color="lime"
        />
      )}

      <CleanButton
        icon="play"
        label="Converter"
        variant="primary"
        onClick={() => {}}
      />
    </div>
  );
}
```

---

## ✅ Checklist de Implementação

- [ ] Fase 1: Setup Básico
  - [ ] Verificar axios instalado
  - [ ] Verificar ícones disponíveis
  - [ ] Confirmar Header e CleanComponents funcionando

- [ ] Fase 2: Utilitários
  - [ ] Criar `src/utils/api.ts`
  - [ ] Criar `src/utils/format.ts`
  - [ ] Testar requisições

- [ ] Fase 3: Componentes
  - [ ] Criar novo componente
  - [ ] Integrar em main.tsx
  - [ ] Validar estilos

- [ ] Fase 4: Features
  - [ ] Implementar feature com Axios
  - [ ] Implementar histórico
  - [ ] Implementar notificações

- [ ] Fase 5: Deploy
  - [ ] Build (`npm run build`)
  - [ ] Testar em produção
  - [ ] Documentar padrões

---

## 🔍 Referência Rápida

**Imports:**
```typescript
import { Icon, IconVariants, IconSizes } from '@/icons';
import { CleanButton, StatusBadge, StatRow, InfoAlert } from '@/components/CleanComponents';
import axios from 'axios';
```

**Cores:**
```css
var(--neo-navy)      /* #031330 */
var(--neo-lime)      /* #C8F000 */
var(--neo-orange)    /* #FF5A00 */
var(--neo-white)     /* #F8F8F3 */
```

**Ícones Comuns:**
```
play, refresh, loading, checkmark, error, warning
menu, close, home, wallet, chart, stats, trophy
```

---

**Status:** ✅ Pronto para Integração | **Data:** 2026-07-17

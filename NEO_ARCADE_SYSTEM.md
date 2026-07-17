# Neo Arcade Football - Design System

## 📋 Visão Geral

**CHUTE** usa o design system **Neo Arcade Football** — uma fusão de **esporte + anime + arcade + pixel art + neon competitivo**.

Conceitos centrais: **velocidade, competição, impacto, energia, precisão, experiência ao vivo, cultura gamer**

---

## 🎨 Paleta de Cores

### Cores Primárias (Proporção: 45% + 30% + 15% + 10%)

| Cor | Hex | Uso | %  |
|-----|-----|-----|-----|
| **Azul-Marinho Profundo** | `#031330` | Fundo, estrutura, contornos | 30% |
| **Verde-Limão** | `#C8F000` | Identidade principal, destaque | 45% |
| **Laranja Energético** | `#FF5A00` | Ação, CTAs, movimento | 10% |
| **Branco** | `#F8F8F3` | Texto, neutralidade | 15% |

### Cores Secundárias

| Cor | Hex | Uso |
|-----|-----|-----|
| Verde Neon | `#A7D900` | Texto secundário, bordas |
| Verde-Oliva Escuro | `#29430F` | Sombras, profundidade |
| Amarelo Elétrico | `#E7FF00` | Avisos, destaque crítico |
| Cinza Azulado | `#4D5870` | Texto atenuado, backgrounds |

---

## 🔤 Tipografia

### Fontes Recomendadas

**Display (Headlines):**
- Teko ExtraBold
- Anton
- Black Ops One
- Russo One

**Body (Texto):**
- Rajdhani Bold
- Space Grotesk
- Courier New (monospace para códigos)

### Estilos

**Headline (CHUTE)**
- Tamanho: 48px+
- Peso: 900 (Black/Extra Black)
- Estilo: Italic
- Cor: #F8F8F3 com stroke #031330
- Detalhes: #FF5A00
- Propriedade: Extra bold, condensada, inclinada, geométrica

**Subheading (LIVE SHOTS)**
- Tamanho: 24-32px
- Peso: 700-900
- Estilo: Italic
- "LIVE" em #C8F000
- "SHOTS" em #FF5A00

**Body Text**
- Tamanho: 14-16px
- Peso: 400-700
- Cor: #F8F8F3
- Legibilidade em telas

---

## 🎮 Componentes

### Botão Primário
```
Background: #FF5A00 (Laranja)
Texto: #031330 (Azul-Marinho)
Peso: 900 | Caixa Alta
Borda: cortada 2px
Sombra: 0 4px 8px rgba(0,0,0,0.3)
Transform: skewX(-5deg)
Hover: +2px shadow, mais brilho
```

### Botão Secundário
```
Background: #031330 (Azul-Marinho)
Borda: 2px #C8F000 (Verde-Limão)
Texto: #F8F8F3 (Branco)
Peso: 900 | Caixa Alta
Hover: glow verde-limão
```

### Card
```
Background: #1a2240 (Fundo escuro)
Borda: 2px #A7D900 (Verde neon)
Cantos: cortados (2-4px)
Sombra: 0 4px 16px rgba(0,0,0,0.4)
Detalhe: canto superior direito em verde-limão
```

### Badge / Status
```
Background: cor por status
Padding: 0.5rem 1rem
Peso: 700 | Caixa Alta
Tamanho: 0.85rem

Status:
- Sucesso: #A7D900 (verde neon)
- Warning: #E7FF00 (amarelo elétrico)
- Error: #FF5A00 (laranja)
- Info: #C8F000 (verde-limão)
```

---

## ✨ Efeitos & Estilos

### Sombras
```
Leve:    0 2px 8px rgba(3, 19, 48, 0.3)
Normal:  0 4px 16px rgba(3, 19, 48, 0.4)
Pesada:  0 8px 24px rgba(3, 19, 48, 0.5)
```

### Glows
```
Lime:   0 0 12px rgba(200, 240, 0, 0.4)
Orange: 0 0 12px rgba(255, 90, 0, 0.4)
```

### Animações
```
Fast:   150ms cubic-bezier(0.4, 0, 0.2, 1)
Normal: 300ms cubic-bezier(0.4, 0, 0.2, 1)
Slow:   500ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Motion
- Linhas de velocidade
- Partículas quadradas
- Rastros de movimento
- Halftone/ruído
- Fragmentação digital
- Glow moderado

---

## 📐 Geometria

### Formas Preferidas
- Diagonais
- Trapézios
- Setas
- Recortes 45°
- Quadrados pixelados
- Linhas radiais
- Faixas inclinadas
- Bordas espessas

### Evitar
- Cantos arredondados suaves
- Círculos delicados
- Sombras difusas
- Formas minimalistas neutras

**Princípio:** parecer **rápido, agressivo, tecnológico**

---

## 🎯 Hierarquia Visual

1. **CHUTE** (logo principal)
2. Jogador/ação (focal visual)
3. Trajetória/movimento
4. Objetivo
5. **LIVE SHOTS** (descritor)
6. Slogan/contexto
7. Ambiente

O logo ocupa 35-45% da área visual.

---

## 📱 Aplicações

Especialmente eficaz em:
- Landing pages
- Apps esportivos
- Fantasy games
- Palpites/betting
- Transmissões ao vivo
- Cards de jogadores
- Rankings
- NFTs esportivos
- Uniformes/assets
- Banners
- Stories/social
- Thumbnails
- Overlays de streaming
- Placares digitais

---

## ⚡ Regra Central

> **Toda composição deve transmitir movimento em direção a um objetivo.**

Nada pode parecer estático. Textos, personagens, linhas, partículas e formas **devem compartilhar a mesma direção visual**.

---

## 🔗 Referências de Implementação

### CSS Tokens
Importar: `./neo-arcade-tokens.css`

Exemplo:
```css
background-color: var(--neo-navy);
color: var(--neo-lime);
border: var(--neo-border-heavy);
box-shadow: var(--neo-shadow-md);
transition: all var(--neo-transition-normal);
```

### Design System Visual
Acessar: `/design-system.html`

---

## 📝 Notas de Implementação

- **Tipo de Fonte:** Implementar com Google Fonts ou fonte proprietária
- **Contraste:** Verificar relação de contraste 4.5:1 para acessibilidade
- **Dark Mode:** Sistema otimizado para dark mode (default)
- **Responsive:** Proporções devem escalar mantendo impacto visual
- **Performance:** Motion blur e glows podem impactar performance — otimizar com CSS transforms

---

**Resumo da Identidade:**

**Esporte + Anime + Arcade + Pixel Art + Neon Competitivo**

Cores: Azul-Marinho | Verde-Limão | Laranja | Branco
Movimento: Agressivo | Rápido | Tecnológico | Preciso
Público: Gamers | Fãs de esporte | Web3 natives | Competidores

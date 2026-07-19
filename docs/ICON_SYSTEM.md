# CHUTE Icon System — Premium Design Standards

## Philosophy
Ícones devem ser **elegantes, minimalistas e sofisticados** — não genéricos.

## ✅ O que USAR

### Phosphor Icons (Curated Selection)
- **Estilo:** Thin, Light, Regular (preferir Regular + Fill para destaque)
- **Peso visual:** Consistente, sem desproporcionalidade
- **Uso:** Selecionamos apenas ícones que passam no teste de "bom gosto"

**Exemplos aprovados:**
- `Shield` (weight="fill") → DEFESA
- `Star` (weight="fill") → CRAQUE  
- `Target` (weight="fill") → MEIO-CAMPO
- `Lightning` (weight="fill") → MOMENTUM
- `ArrowsClockwise` (weight="fill") → POSSESSÃO
- `Crosshair` (weight="fill") → FINALIZAÇÕES

### Alternativas Premium
- **Heroicons** (por Tailwind) — ícones minimalistas, excelente qualidade
- **Feather Icons** — simplicidade elegante
- **Material Icons** — apenas a versão "Outlined" ou "Rounded" (não "Filled" ou "TwoTone")

## ❌ O que NÃO USAR

- Ícones "flat" ou "cartoon" de repositórios gratuitos genéricos
- Font Awesome (muito genérico, muito usado)
- Emoji simples sem contexto de design
- Ícones com muitos detalhes ornamentais
- Ícones desproporcionais (muito grossos ou muito finos)

## Color Palette (Neo Arcade Premium)

```
DEFESA       → #60A5FA (Sky Blue)
CRAQUE       → #FBBF24 (Amber)
MEIO-CAMPO   → #34D399 (Emerald)
MOMENTUM     → #BFFF00 (Lime) ← Primary accent
POSSESSÃO    → #818CF8 (Indigo)
FINALIZAÇÕES → #FB923C (Orange)
```

## Implementation Rules

### Size Consistency
- **Display icons:** 20px (md), 24px (lg)
- **Edge/context icons:** 14px (sm)
- Nunca misturar tamanhos na mesma seção

### Weight Consistency  
- **Action/Signal icons:** `weight="fill"` (destaque)
- **Context icons:** `weight="regular"` (background)
- Nunca misturar weights no mesmo tipo de ícone

### Accessibility
- Todos os ícones DEVEM ter `aria-label`
- Exemplo: `<Shield aria-label="Defesa" />`

## Premium Checklist Before Ship

- [ ] Ícone passa no teste de "elegância" visual (sem design genérico)
- [ ] Tamanho é consistente com outros ícones na seção
- [ ] Peso é consistente (fill vs regular)
- [ ] Cor é exata da paleta Neo Arcade
- [ ] `aria-label` está presente
- [ ] Funciona bem em tema escuro (#080B0A background)
- [ ] Não parece "cansado" ou "poluído"

## Design Debt
- ⏭️ Considerar SVG customizado para ícones que não encontrem match perfeito em bibliotecas
- ⏭️ Se Phosphor + Heroicons não tiverem ícone premium suficiente, criar no Figma

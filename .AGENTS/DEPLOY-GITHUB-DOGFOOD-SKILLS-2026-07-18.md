# Deploy GitHub + Dogfood - Skills de Market Intelligence

**Data:** 2026-07-18  
**Escopo aprovado pelo usuario:** publicar **somente** skills CHUTE, contratos, testes e dogfood

---

## GitHub

- branch criada:
  - `feat/market-intel-skills-dogfood`
- commit publicado:
  - `4442515` — `feat(skills): add market intelligence dogfood stack`
- PR aberto:
  - `https://github.com/DGuedz/chute-live-shots/pull/1`

---

## Dogfood

**Comandos**

```bash
python3 -m pytest scripts/test_semantic_skill_hook.py scripts/test_market_intelligence_skills.py -q
python3 scripts/dogfood_market_intelligence_skills.py
```

**Resultado**

- `pytest`: verde
- `dogfood`: `status = ok`
- artefato:
  - `artifacts/skill-dogfood/market-intelligence-skills-dogfood-20260718T174430Z.json`

---

## Deploy do sistema

### Estado atual

- GitHub: **publicado**
- PR: **aberto**
- checks automáticos no PR: **nenhum reportado**
- preview/deploy automático do sistema: **não confirmado**

### Decisão operacional

**Não executei deploy manual de Vercel/Railway nesta rodada.**

### Motivo

1. o escopo aprovado foi apenas skills/dogfood;
2. essas mudanças não alteram runtime do app público;
3. o worktree local contém muitas mudanças paralelas fora desse escopo;
4. um deploy manual agora arriscaria publicar arquivos e mudanças não aprovados.

### Leitura correta

- **GO** para GitHub e review do pacote de skills
- **GO** para dogfood interno
- **NO_GO** para deploy manual público a partir deste worktree sujo

---

## Próxima ação segura

1. revisar e mergear o PR `#1`;
2. se o projeto GitHub estiver ligado ao Vercel/Railway, usar o merge como gatilho oficial;
3. se quiser deploy manual, primeiro isolar o worktree de runtime em branch/commit limpo separado.

# Guia de Migração — CLAUDE.md v9.1 → v10 slim

## Resumo

O CLAUDE.md passou de **2502 linhas** (~30k tokens, 17% do contexto consumido só ao abrir) para uma estrutura modular com:

- **CLAUDE.md** (232 linhas, ~6k tokens, ~3% do contexto) — só regras universais
- **7 skills** em `.claude/skills/` — carregadas sob demanda
- **2 docs** em `docs/` — carregados por referência explícita

**Ganho esperado:**
- Compactação automática dispara muito mais tarde
- Claude segue as regras com mais consistência (dentro do budget de ~150-200 instruções)
- Conhecimento especializado só entra no contexto quando relevante

## Como instalar

1. Fazer backup do CLAUDE.md atual:
   ```bash
   cp CLAUDE.md CLAUDE.md.v9.1.backup
   ```

2. Substituir pelo novo:
   ```bash
   cp auExpert-slim/CLAUDE.md ./CLAUDE.md
   ```

3. Copiar skills:
   ```bash
   mkdir -p .claude/skills
   cp -r auExpert-slim/.claude/skills/* .claude/skills/
   ```

4. Copiar docs:
   ```bash
   mkdir -p docs
   cp auExpert-slim/docs/aldeia-spec.md docs/
   cp auExpert-slim/docs/prototypes-catalog.md docs/
   ```

5. Testar na próxima sessão do Claude Code:
   ```
   /context
   ```
   Confirmar que o CLAUDE.md está consumindo menos tokens que antes.

## Tabela de rastreabilidade

Cada seção do CLAUDE.md antigo → onde foi parar na nova estrutura. Use pra validar que nada importante se perdeu.

| Seção antiga (v9.1) | Destino novo | Enxuto? |
|---|---|---|
| Cabeçalho v9.1 / changelog | `CLAUDE.md` → Identity (resumido) | Sim |
| Database (rules iniciais) | `CLAUDE.md` → Database workflow | Consolidado |
| Code Quality | `CLAUDE.md` → Debug workflow | Sim |
| Platform Compatibility | `CLAUDE.md` → Debug workflow | Sim |
| Important Rules (sobrescrever assets) | `CLAUDE.md` → Debug workflow | Sim |
| Testing & Verification | `CLAUDE.md` → Debug workflow | Sim |
| ⛔ 1. STRINGS HARDCODED | `skill/auexpert-i18n/SKILL.md` | Preservado |
| ⛔ 2. Alert.alert() PROIBIDO | `skill/auexpert-ui-patterns/SKILL.md` | Preservado |
| ⛔ 3. EMOJIS PROIBIDOS | `skill/auexpert-design-system/SKILL.md` → Ícones | Preservado |
| ⛔ 4. DELETE FÍSICO PROIBIDO | `CLAUDE.md` → Inviolable rule #4 + Database | Sim |
| ⛔ 5. NARRAÇÃO 3ª PESSOA | `CLAUDE.md` + `skill/auexpert-i18n/SKILL.md` | Preservado |
| ⛔ 6. NUNCA INVENTAR NOMES DE DB | `CLAUDE.md` → Database workflow | Preservado |
| ⛔ 7. MODELO IA NUNCA HARDCODED | `CLAUDE.md` + `skill/auexpert-edge-functions/SKILL.md` | Preservado |
| ⛔ 8. CORES HARDCODED PROIBIDAS | `skill/auexpert-design-system/SKILL.md` | Preservado |
| ⛔ 9. ARQUIVOS PROTEGIDOS | `CLAUDE.md` → Protected files + `skill/auexpert-diary-flow/SKILL.md` | Preservado |
| ⛔ 10. FONTES CUSTOMIZADAS PROIBIDAS | `skill/auexpert-design-system/SKILL.md` → Tipografia | Preservado |
| §1 Identidade do projeto | `CLAUDE.md` → Identity | Sim |
| §1.1 Filosofia AI-first | `skill/auexpert-ui-patterns/SKILL.md` → Filosofia AI-first | Preservado |
| §2.1 Filosofia visual / equilíbrio de cores | `skill/auexpert-design-system/SKILL.md` | Preservado |
| §2.2 Paleta de cores | `skill/auexpert-design-system/SKILL.md` → Paleta | Preservado (tabela completa) |
| §2.3 Sombras | `skill/auexpert-design-system/SKILL.md` → Sombras | Preservado |
| §2.4 Tipografia completa | `skill/auexpert-design-system/SKILL.md` → Tipografia | Preservado (hierarquia inteira) |
| §2.5 Espaçamento e raios | `skill/auexpert-design-system/SKILL.md` → Espaçamento e raios | Preservado |
| §2.6 Ícone + logotipo | `skill/auexpert-design-system/SKILL.md` → Logotipo | Preservado (3 tamanhos) |
| §2.7 Cores por contexto | `skill/auexpert-design-system/SKILL.md` → Cores por contexto | Preservado |
| §2.8 Hierarquia de botões (5 tipos) | `skill/auexpert-design-system/SKILL.md` → Hierarquia de botões | Preservado |
| §2.9 Cores hardcoded proibidas | `skill/auexpert-design-system/SKILL.md` → Regra de cores hardcoded | Preservado |
| §3 Ícones / catálogo Lucide | `skill/auexpert-design-system/SKILL.md` → Ícones | Preservado (catálogo completo) |
| §4 Comunicação com tutor (Toast/confirm) | `skill/auexpert-ui-patterns/SKILL.md` → Sistema Toast | Preservado |
| §5 Estrutura do projeto (árvore detalhada) | `skill/auexpert-architecture/SKILL.md` → Estrutura de pastas | Enxuto (só estrutura macro — Claude descobre detalhes com `ls`) |
| §6 Tech stack | `CLAUDE.md` → Stack | Sim |
| §6.1 Regras de código (strings hardcoded) | `skill/auexpert-i18n/SKILL.md` | Preservado |
| §7 Banco de dados (12 tabelas) | `CLAUDE.md` → Database workflow + Core business rules | Sim (lista de tabelas movida pra skill de diário) |
| §8 Regras de negócio | `CLAUDE.md` → Core business rules | Consolidado |
| §8.1 Fluxo do diário completo | `skill/auexpert-diary-flow/SKILL.md` | Preservado (4 cenários, pipeline, regras) |
| §9.1 Regra de idioma da IA | `skill/auexpert-i18n/SKILL.md` → Regra de idioma da IA | Preservado |
| §9.2 Regras gerais de IA | `skill/auexpert-diary-flow/SKILL.md` → Prompts de IA + `skill/auexpert-edge-functions/SKILL.md` | Preservado |
| §9.3 Aldeia (pós-MVP, 22 tabelas) | `docs/aldeia-spec.md` | Preservado (doc estático, não skill) |
| §10.2 i18n / estrutura de chaves | `skill/auexpert-i18n/SKILL.md` | Preservado |
| §11.1 Princípio fundamental | `skill/auexpert-architecture/SKILL.md` → Princípio fundamental | Preservado |
| §11.2 Arquitetura em camadas | `skill/auexpert-architecture/SKILL.md` → Arquitetura em camadas | Preservado |
| §11.3 Gestão de estado | `skill/auexpert-architecture/SKILL.md` → Gestão de estado | Preservado |
| §11.4 Template de hook | `skill/auexpert-architecture/SKILL.md` → Template de hook | Preservado |
| §11.5 Performance | `skill/auexpert-architecture/SKILL.md` → Performance | Preservado |
| §11.6 Escalabilidade | `skill/auexpert-architecture/SKILL.md` → Escalabilidade | Preservado |
| §12.1 Filosofia resiliência | `skill/auexpert-resilience/SKILL.md` → Filosofia | Preservado |
| §12.2 Camadas de proteção | `skill/auexpert-resilience/SKILL.md` → Camadas de proteção | Preservado |
| §12.3 Mensagens de erro / tabela | `skill/auexpert-ui-patterns/SKILL.md` → Mensagens de erro | Preservado (tabela PT/EN completa) |
| §12.4 Regras anti-crash | `skill/auexpert-resilience/SKILL.md` → Regras anti-crash | Preservado |
| §12.5 NetworkGuard | `skill/auexpert-resilience/SKILL.md` → NetworkGuard | Preservado |
| §12.6 Hierarquia de providers | `skill/auexpert-resilience/SKILL.md` → Hierarquia de providers | Preservado |
| §12.7 Offline-first | `skill/auexpert-resilience/SKILL.md` → Estratégia Offline-First | Preservado |
| §12.8 PDF export | `skill/auexpert-resilience/SKILL.md` → Relatórios PDF | Preservado |
| §13.1 Modelo IA via app_config | `skill/auexpert-edge-functions/SKILL.md` → Modelo via app_config | Preservado |
| §13.2 Offline first (resumo) | Consolidado em `skill/auexpert-resilience/SKILL.md` | Consolidado |
| §13.3 RAG por Pet | `CLAUDE.md` → Core business rules | Sim |
| §13.4 Classificador de gastos | `CLAUDE.md` → Core business rules | Sim |
| §13.5 Hierarquia de exclusão | `skill/auexpert-diary-flow/SKILL.md` → Hierarquia de exclusão | Preservado |
| §13.6 Dataset IA proprietária | ❌ REMOVIDO | Não é regra operacional — mover pra doc específico se for implementar |
| §13.7 CRONs | ❌ REMOVIDO | Igual — é especificação de produto, não regra de código |
| §13.8 Multilíngue classificador | `skill/auexpert-i18n/SKILL.md` | Consolidado |
| §14 Glossário | `CLAUDE.md` → Glossary | Preservado |
| §15 Referência de protótipos | `docs/prototypes-catalog.md` | Preservado |
| §16 Performance Edge Functions | `skill/auexpert-edge-functions/SKILL.md` | Preservado (todas as 7 seções) |
| §17 Arquivos protegidos | `CLAUDE.md` → Protected files + `skill/auexpert-diary-flow/SKILL.md` → Arquivos protegidos | Preservado |

## O que foi removido (e por quê)

Apenas duas coisas saíram completamente:

- **§13.6 Dataset para IA Proprietária** — especificação de produto futuro (LGPD/GDPR, `ai_training_dataset`, anonimização). Não é regra de código operacional. Se virar feature ativa, criar `docs/ia-proprietaria-spec.md`.

- **§13.7 CRONs do Assistente Proativo** — tabela de 5 CRONs de features futuras (preventive-care-alerts, financial-monitor, weather-alerts). Idem — quando implementar, vira `docs/crons-spec.md` ou skill dedicada.

Tudo o mais foi preservado, apenas movido de lugar.

## O que mudou de versão

Nada no conteúdo — só organização. As regras v9.1 são **todas respeitadas** na v10. A diferença é que:

- CLAUDE.md v9.1: 2502 linhas, ~30k tokens, **sempre carregadas**
- CLAUDE.md v10: 232 linhas, ~6k tokens, **sempre carregadas** + skills que carregam **sob demanda**

## Como validar que está funcionando

1. Na próxima sessão do Claude Code, rode `/context` — você deve ver o CLAUDE.md consumindo ~6k tokens em vez de ~30k.

2. Trabalhe por ~30-40 minutos em uma feature (ex: mexendo no diário ou em uma tela). O auto-compact deve demorar muito mais a disparar.

3. Teste se o Claude puxa as skills corretamente: peça algo como "adicione um botão de exportar PDF na tela de cardápio". Ele deve carregar `auexpert-resilience` (PDF) e `auexpert-design-system` (botão) automaticamente.

4. Teste aderência às regras: peça para ele "mostrar um toast de sucesso ao criar um pet". Ele deve:
   - Usar `toast()`, não `Alert.alert()` ✅
   - Usar chave i18n `toast.*`, não string hardcoded ✅
   - Escrever na voz do pet ✅
   - Em PT-BR E EN-US (E es-MX, es-AR, pt-PT) ✅

Se algum desses falhar consistentemente, a skill correspondente precisa ser reforçada.

## Manutenção futura

**Quando adicionar regra nova:**

1. Primeiro pergunte: "é universalmente aplicável a qualquer arquivo/tarefa?"
   - Sim → vai pro CLAUDE.md (seção correspondente)
   - Não → vai pra skill específica (ou cria skill nova se for domínio novo)

2. Se for doc de referência estática (pós-MVP, catálogo, spec de produto futuro):
   - Vai pra `docs/`, não pra skill

3. Antes de adicionar, busque no material existente se já há regra relacionada — reforçar > duplicar.

**Quando cortar regra:**

- Se Claude já faz isso corretamente sem a instrução, DELETE.
- Se é trabalho de linter (ESLint/Prettier), DELETE e configure o linter.
- Se nunca foi violada em PR recente, pode ter virado conhecimento implícito.

**Sinal de alerta:** CLAUDE.md voltou a passar de ~400 linhas → hora de extrair outra skill.

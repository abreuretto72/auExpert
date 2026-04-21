---
name: auexpert-ui-patterns
description: Padrões de UI do auExpert — filosofia AI-first (câmera/voz antes de digitar), sistema Toast/confirm com balão de patinhas (nunca Alert.alert), tabela obrigatória de tradução de erros técnicos para mensagens amigáveis na voz do pet, regras de progress bars e microfone STT. Use SEMPRE que for mostrar mensagem ao tutor (toast, erro, confirmação), criar formulário, decidir se um dado deve ser inferido por IA ou pedido manualmente, lidar com feedback de ação, desenhar fluxo de entrada de dados, ou quando o usuário mencionar "toast", "alerta", "erro", "mensagem", "confirmar", "formulário", "microfone", "voz do pet", "AI-first". Esta skill complementa auexpert-design-system (visual) e auexpert-i18n (textos).
---

# auExpert UI Patterns

## Filosofia AI-first (regra fundamental de produto)

O app se chama "Uma inteligência única para o seu pet". A IA deve trabalhar ANTES do tutor digitar. Toda tela, todo formulário, todo fluxo prioriza:

1. **IA analisa primeiro** → tutor confirma ou corrige depois
2. **Microfone (STT) sempre disponível** → digitação é último recurso
3. **Câmera resolve mais que formulários** → 1 foto > 10 campos

### Hierarquia de entrada de dados (ordem obrigatória)

```
1º  CÂMERA + IA    → foto/vídeo → IA extrai dados automaticamente
2º  MICROFONE STT  → tutor fala → app transcreve → IA interpreta
3º  SELEÇÃO RÁPIDA → chips, toggles, sliders — 1 toque
4º  DIGITAÇÃO      → último recurso, apenas quando inevitável
```

### Aplicação por feature

| Feature | ERRADO (manual) | CERTO (AI-first) |
|---|---|---|
| Cadastro de pet | Digitar raça, peso, idade | Foto → IA identifica raça, estima peso/idade/porte |
| Diário | Digitar tudo | Fala no mic → STT → IA narra |
| Vacinas | Digitar nome, data, lote | Foto da carteira → OCR extrai tudo |
| Prontuário | Preencher form | Foto de receita/exame → OCR + IA estrutura |
| Alergias | Digitar reação | IA sugere por histórico + tutor confirma por voz |
| Humor do pet | Selecionar mood manual | Foto → IA infere pela expressão/postura |
| Perfil do tutor | Digitar cidade | GPS detecta → tutor confirma |

### Regras para campos de texto

- **Ícone de microfone (STT) obrigatório** em TODOS os campos de texto, SEMPRE em `accent` (laranja)
- **Única exceção:** campos de senha não têm microfone (segurança)
- Mic sempre visível, acessível com 1 toque
- Ao ativar: feedback visual imediato (animação pulsante laranja)
- Ao terminar STT: texto aparece no campo, tutor pode editar

### Regras para formulários

- Se dado PODE ser inferido por IA (foto, OCR, GPS, histórico) → NÃO pedir ao tutor
- Dado inferido aparece como "sugerido pela IA" com badge roxo + % de confiança
- Tutor sempre pode editar/corrigir inferências
- Campos de ajuste pós-IA são opcionais e colapsáveis
- Placeholder mostra o que a IA estimou: "IA estimou ~30 kg"

### Regras para câmera/foto

- 1 foto > N campos sempre que possível
- Animação de análise com progresso (linhas aparecendo uma a uma)
- Resultado visual: cards com ícone + valor + % confiança
- Disclaimer obrigatório: "Análise feita por IA. Confirme ou edite."
- Botão "Nova foto" sempre disponível

---

## Sistema Toast — balão de patinhas

**`Alert.alert()` do React Native é PROIBIDO.** Sempre usar `toast()` ou `confirm()` do ToastProvider.

### Estrutura do balão

```
┌──────────────────────────┐
│                     [X]  │  ← X vermelho (fechar)
│      ┌────────────┐      │
│      │ 🐾 branca  │      │  ← patinha branca sobre fundo colorido 56x56
│      └────────────┘      │
│   Mensagem na voz do     │  ← sistema 500, 15px, center
│   pet, simples e leve    │
│  [Cancelar] [Confirmar]  │  ← apenas no confirm()
│       — seu pet          │  ← sistema 400, SEM italic
└──────────────────────────┘
```

Balão centralizado. Backdrop `rgba(11, 18, 25, 0.6)` — foco total.

### Dois métodos

**1. `toast(texto, tipo)`** — mensagem simples
- Patinha + texto + assinatura "— seu pet"
- Fecha com X, toque no backdrop, ou automaticamente em 4s
- Uso: `toast(t('toast.petCreated', { name }), 'success')`

**2. `confirm({ text, type })`** — pergunta com sim/não
- Patinha + texto + 2 botões (Cancelar cinza com `X`, Confirmar laranja com `Check`)
- Retorna `Promise<boolean>`
- NÃO fecha sozinho — espera resposta
- Backdrop NÃO fecha
- Uso: `const yes = await confirm({ text: t('settings.logoutConfirm'), type: 'warning' })`

### Regras

- Nunca `Alert.alert()` do RN
- Nunca mensagem no topo da tela — sempre balão centralizado
- Todas as mensagens via i18n (chaves `toast.*`, `errors.*`)
- Tom: voz do pet, leve, carinhoso — nunca técnico
- Ver `auexpert-i18n` para estrutura de chaves e voz do pet

### Patinhas disponíveis

- `pata_verde.png` — sucesso
- `pata_vermelha.png` — erro/perigo
- `pata_amarela.png` — warning
- `pata_rosa.png` — emoção/legado

### Progress bars (padrão do app)

- Track: `border`
- Fill: gradiente `accent → accentLight`
- Altura 3-5px, radius 2-3

---

## Mensagens de erro — tradução obrigatória

**NUNCA mostrar mensagem técnica ao tutor.** O tutor é uma pessoa que ama o pet, não programador. "Error 500", "Network timeout", "null reference", "PostgreSQL constraint violation" ou "JWT expired" causam medo, frustração e abandono.

### Princípios

Toda mensagem de erro deve ser:

- Em linguagem simples, como falaria com um amigo
- Curta (1-2 frases no máximo)
- Orientada à ação (o que o tutor pode fazer)
- Empática (nunca culpar o tutor)
- Na voz do pet (ver `auexpert-i18n`)

### Tabela de tradução (OBRIGATÓRIA)

| Erro técnico | PT-BR | EN-US |
|---|---|---|
| Network / timeout | "Sem conexão. Verifique sua internet e tente de novo." | "No connection. Check your internet and try again." |
| 500 / Server error | "Nossos servidores estão descansando. Tente de novo em alguns minutos." | "Our servers are resting. Try again in a few minutes." |
| 401/403 / JWT expired | "Sua sessão expirou. Faça login novamente." | "Your session expired. Please log in again." |
| 404 | "Não encontramos o que você procura. Tente atualizar a tela." | "We couldn't find what you're looking for. Try refreshing." |
| 409 / Conflict | "Esse registro já existe. Verifique os dados e tente de novo." | "This record already exists. Check the data and try again." |
| 422 / Validation | "Alguns dados precisam de ajuste. Verifique os campos marcados." | "Some data needs adjustment. Check the marked fields." |
| Crash / render | "Algo deu errado. Tente novamente." | "Something went wrong. Try again." |
| Upload failed | "Não conseguimos enviar a foto. Tente com uma imagem menor." | "We couldn't upload the photo. Try a smaller image." |
| AI analysis failed | "A análise não funcionou desta vez. Tente tirar outra foto." | "The analysis didn't work this time. Try taking another photo." |
| Biometric failed | "Não reconhecemos você. Tente de novo ou use sua senha." | "We didn't recognize you. Try again or use your password." |
| Storage full | "Sem espaço para salvar. Libere espaço no dispositivo." | "No space to save. Free up space on your device." |
| Rate limited | "Muitas tentativas. Aguarde um momento e tente de novo." | "Too many attempts. Wait a moment and try again." |

### Implementação obrigatória

Toda chamada de API passa pelo mapeamento antes de exibir:

```typescript
// ⛔ PROIBIDO — vaza erro técnico
toast(error.message)

// ✅ OBRIGATÓRIO — traduz para humano
import { getErrorMessage } from '../utils/errorMessages';
toast(getErrorMessage(error))
```

### Regras adicionais

- Erros de validação de formulário: destacar o campo com borda `danger` + texto explicativo ABAIXO ("A senha precisa ter pelo menos 8 caracteres")
- NUNCA usar palavras isoladas: "erro", "falha", "inválido", "exceção", "código", "servidor" — sempre contextualizar
- Preferir tom positivo: "Verifique sua internet" > "Erro de rede"
- Fallback universal em caso de dúvida: "Algo deu errado. Tente de novo."
- Todas as mensagens DEVEM estar em i18n — nunca hardcoded

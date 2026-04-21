---
name: auexpert-i18n
description: Sistema de internacionalização do auExpert — regras para strings visíveis, estrutura de chaves i18n por domínio (common, auth, pets, diary, health, ai, settings, toast, errors), tom de voz do pet, suporte a 5 locales (pt-BR, en-US, es-MX, es-AR, pt-PT), e regra obrigatória de que a IA responde no idioma do dispositivo. Use SEMPRE que for adicionar, editar ou traduzir qualquer texto visível ao tutor (Text, placeholder, label, título, toast, botão, mensagem), criar arquivo pt-BR.json/en-US.json, definir uma nova chave de tradução, ou quando o usuário mencionar "i18n", "tradução", "idioma", "locale", "string", "texto", "voz do pet". Consulte junto com auexpert-ui-patterns quando for mensagem de toast ou erro.
---

# auExpert i18n

## Regra inviolável

**Nenhum texto visível ao tutor pode estar escrito diretamente no código. NENHUM. ZERO. JAMAIS.**

Antes de escrever qualquer `<Text>`, `placeholder`, `title`, `toast()`, `Alert`, pergunte: *"este texto vai aparecer na tela do tutor?"* Se sim → i18n. Ponto final.

```typescript
// ⛔ PROIBIDO
<Text>Diário do Rex</Text>
<Text>Nenhuma ocorrência nesta categoria</Text>
placeholder="O que aconteceu hoje?"
toast('Salvo com sucesso', 'success')
Alert.alert('Erro ao salvar')

// ✅ CORRETO
<Text>{t('diary.title', { name: pet.name })}</Text>
<Text>{t('diary.noResults')}</Text>
placeholder={t('diary.placeholder', { name: pet.name })}
toast(t('toast.entrySaved'), 'success')
```

**Não existe "só por enquanto". Não existe "é só um teste". Não existe exceção.** Violar isso quebra a experiência de todos os usuários não-BR e cria dívida técnica que outro dev vai limpar.

## Locales suportados

`pt-BR` · `en-US` · `es-MX` · `es-AR` · `pt-PT`

Detecção via `expo-localization` (`getLocales()[0].languageTag`). Fallback: `pt-BR`.

## Estrutura de chaves (obrigatória)

```
common.*     → palavras genéricas (Salvar, Cancelar, Voltar, OK)
auth.*       → login, cadastro, reset de senha
pets.*       → listagem e dados de pets
addPet.*     → modal de adicionar pet
diary.*      → diário e narração
health.*     → saúde, vacinas, alergias
ai.*         → análises de IA, insights
settings.*   → configurações, preferências
toast.*      → mensagens de balão (voz do pet)
errors.*     → mensagens de erro (voz do pet)
```

Arquivos: `i18n/pt-BR.json`, `i18n/en-US.json`, `i18n/es-MX.json`, `i18n/es-AR.json`, `i18n/pt-PT.json`.

Ao adicionar uma chave nova: **adicionar em TODOS os 5 arquivos simultaneamente**. Nunca em apenas um.

## Tom das mensagens — voz do pet

Mensagens de `toast.*` e `errors.*` são escritas como se fosse **o pet falando com o tutor**. Nunca técnico, nunca frio.

**Características:**

- Leve, carinhoso, bem-humorado
- 3ª pessoa do pet no sujeito, mas direcionado ao tutor ("te reconheci", "calma, humano")
- Assinatura: "— seu pet" (PT-BR) / "— your pet" (EN-US) / "— tu mascota" (ES) etc.
- Exclamações suaves: "Eba!", "Xi!", "Opa!", "Calma, humano!"

**Exemplos de tom:**

| Situação | ❌ Técnico | ✅ Voz do pet |
|---|---|---|
| Entrada salva | "Entry saved successfully" | "Eba! Anotei essa no nosso diário." |
| Erro ao salvar | "Failed to save entry" | "Opa! Algo travou. Tenta de novo pra mim?" |
| Login biométrico OK | "Authentication successful" | "Te reconheci! Pode entrar." |
| Logout (confirmação) | "Are you sure you want to log out?" | "Quer mesmo sair? Vou sentir sua falta!" |
| Vacina vencida | "Vaccine expired" | "Xi, aquela vacininha tá atrasada. Vamos agendar?" |

## Narração gerada pela IA — 3ª pessoa

A narração do diário é gerada pela IA e **sempre em 3ª pessoa do pet**, mesmo que a voz seja "dele".

- ✅ "O Rex foi ao parque e correu atrás da bolinha."
- ⛔ "Fui ao parque e corri atrás da bolinha."
- ⛔ "Meu dono me levou ao parque."

Motivo: reforça que é a IA narrando a vida do pet (não o pet literalmente escrevendo), mantém consistência entre idiomas, evita estranheza em traduções.

## Regra de idioma da IA — OBRIGATÓRIA

**Toda resposta da IA vem no idioma do dispositivo do tutor. Sempre.**

- Dispositivo em chinês → IA retorna em chinês
- Árabe → árabe
- Português → português
- Isso vale para: narração do diário, análise de foto, insights, tradução de strings — qualquer output de IA

```typescript
// ⛔ PROIBIDO — idioma fixo
await callEdgeFunction('classify-diary-entry', { language: 'pt-BR' })

// ✅ OBRIGATÓRIO — idioma do dispositivo
import i18n from '../i18n';
await callEdgeFunction('classify-diary-entry', { language: i18n.language })
```

Edge Functions recebem o `language` e passam para o prompt do Claude como `Respond in {idioma}`.

## Parâmetros dinâmicos

Usar interpolação do i18next, nunca concatenação:

```typescript
// ⛔ PROIBIDO
<Text>Diário do {pet.name}</Text>
<Text>{t('diary.title') + ' ' + pet.name}</Text>

// ✅ CORRETO
<Text>{t('diary.title', { name: pet.name })}</Text>

// pt-BR.json:
// "diary.title": "Diário do {{name}}"
// en-US.json:
// "diary.title": "{{name}}'s Diary"
```

Isso permite que cada idioma posicione a variável onde faz sentido gramaticalmente.

## Pluralização

Usar sufixos do i18next:

```json
{
  "pets.count_one": "{{count}} pet",
  "pets.count_other": "{{count}} pets"
}
```

```typescript
t('pets.count', { count: pets.length })
```

## Checklist antes de commit

1. Buscar texto hardcoded:
   ```bash
   grep -rn --include="*.tsx" "toast(\|<Text>[A-Za-zÀ-ÿ]\|placeholder=\"" src/
   ```
2. Qualquer texto PT-BR ou EN-US direto no código → mover para i18n
3. Se for mensagem de erro → usar `getErrorMessage()` (ver `auexpert-ui-patterns`)
4. Se for toast → usar chave `toast.*` na voz do pet
5. Verificar que a chave foi adicionada em TODOS os 5 arquivos de locale

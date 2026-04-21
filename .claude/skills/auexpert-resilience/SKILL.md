---
name: auexpert-resilience
description: Estratégia de resiliência do auExpert — filosofia "app nunca pode quebrar na mão do tutor", ErrorBoundary global + por seção, regras anti-crash (optional chaining, fallbacks, try/catch obrigatório, timeouts, validação Zod), NetworkGuard com banner offline/online, estratégia offline-first completa (fila de mutações AsyncStorage, React Query persistente, sync automático ao reconectar), hierarquia de providers no root layout, e especificação obrigatória de relatórios PDF (expo-print, template com logo/rodapé, tela dedicada de preview). Use SEMPRE que for lidar com tratamento de erro, timeout, loading state, conexão, offline, sync, ErrorBoundary, AsyncStorage, PDF export, estabilidade. Também quando o usuário mencionar "crash", "erro técnico", "offline", "sem internet", "sincronização", "queue", "fila", "PDF", "relatório", "exportar", "NetworkGuard", "ErrorBoundary". Complementa auexpert-ui-patterns na parte de mensagens amigáveis.
---

# auExpert — Resiliência

## Filosofia

> **O app NUNCA pode quebrar na mão do tutor.**
> O tutor é uma pessoa que ama seu pet e quer cuidar dele. Ele NÃO é programador. Se o app trava, congela, fecha ou mostra erro técnico, perdemos a confiança dessa pessoa para sempre.

## Camadas de proteção (TODAS obrigatórias)

```
1. ErrorBoundary global (root layout)    ← captura crashes de render
2. ErrorBoundary por seção               ← isola falhas por área crítica
3. try/catch em toda operação async      ← captura erros de rede/API
4. React Query retry + error states      ← retry automático + fallback
5. Toast para feedback de ações          ← tutor sabe o que aconteceu
6. Fallback UI em todo loading           ← Skeleton, NUNCA tela vazia
7. Validação Zod nas bordas              ← dados inválidos não passam
```

## Hierarquia de providers no root — CRÍTICA

Ordem em `app/_layout.tsx` **DEVE** ser mantida:

```typescript
<ErrorBoundary>              {/* 1. Captura TUDO — última linha de defesa */}
  <QueryClientProvider>      {/* 2. Cache + fetch — precisa estar alto */}
    <ToastProvider>          {/* 3. Feedback — disponível em toda a app */}
      <NetworkGuard>         {/* 4. Monitora rede — banner sobre tudo */}
        <Stack />            {/* 5. Navegação — as telas em si */}
        <StatusBar />
      </NetworkGuard>
    </ToastProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

## Regras anti-crash

### NUNCA

- Acessar propriedade de `null`/`undefined` sem optional chaining (`?.`)
- Renderizar dado do servidor sem fallback (`data?.name ?? '—'`)
- Deixar Promise sem `.catch()` ou sem try/catch
- Usar `JSON.parse()` sem try/catch
- Confiar que a API retorna o formato esperado — validar com Zod
- Deixar uma tela sem ErrorBoundary
- Mostrar tela vazia durante loading (usar Skeleton)
- Mostrar spinner infinito sem timeout — após 15s, mensagem + botão retry

### SEMPRE

- Optional chaining em todo acesso a dados remotos: `pet?.name`, `user?.email`
- Fallback em valor que pode ser null: `score ?? 0`, `name ?? '—'`
- ErrorBoundary no root layout E em cada seção crítica (diário, saúde, análise IA)
- try/catch em toda função async que interage com API / Storage / Camera
- Loading skeleton em toda tela que busca dados
- Pull-to-refresh (RefreshControl) em toda lista
- Timeout em toda requisição — não deixar o tutor esperando pra sempre
- Validar dados na entrada (formulários) E na saída (respostas da API)
- Logar erros técnicos no console (dev) e em serviço externo (prod)
- Testar fluxos offline — o app funciona graciosamente sem internet

---

## NetworkGuard — monitoramento de conexão

**Componente:** `components/NetworkGuard.tsx`
**Biblioteca:** `@react-native-community/netinfo`

### Comportamento

1. **Ficou offline** → banner animado no topo:
   - Ícone `WifiOff` amarelo (warning)
   - "Sem conexão" + "O app continua funcionando com os dados salvos"
   - Botão retry para verificar manualmente
   - Banner PERMANECE visível até reconectar

2. **Reconectou** → banner verde:
   - Ícone `Wifi` verde (success)
   - "Conexão restabelecida!"
   - Auto-desaparece em 3s

3. **React Query integrado** → `onlineManager.setEventListener`:
   - Offline: queries pausam (não disparam fetch, usam cache)
   - Online: queries stale refetcham automaticamente

### Regras

- NUNCA mostrar "Network Error" ou mensagem técnica (ver `auexpert-ui-patterns`)
- Banner não bloqueia a tela — tutor continua navegando com cache
- Botão retry discreto (não invasivo)
- Transição offline→online com spring animation
- Toda tela continua funcional com dados já carregados (React Query gcTime 30min)

---

## Estratégia Offline-First

### Arquitetura

```
1. CACHE PERSISTENTE (AsyncStorage)
   React Query cache salvo a cada 2min + ao sair
   Ao abrir o app: cache restaurado instantaneamente

2. REACT QUERY (memória)
   staleTime 5min / gcTime 30min / retry 2
   onlineManager sincroniza com NetInfo
   Offline: queries pausam, usam cache
   Online: queries stale refetcham

3. FILA DE MUTAÇÕES (AsyncStorage)
   Operações de escrita salvas localmente
   Sincronizadas automaticamente ao reconectar
   Máx 3 retries por operação

4. NETWORK GUARD (UI)
   Banner offline/online com animação
   Contador de operações pendentes
   Indicador de sincronização
```

### Classificação de operações

| Operação | Offline? | Estratégia |
|---|---|---|
| Ver lista de pets | SIM | Cache persistente |
| Ver perfil do pet | SIM | Cache persistente |
| Ver diário | SIM | Cache persistente |
| Ver vacinas/alergias | SIM | Cache persistente |
| Adicionar pet | SIM | Fila offline → pet temporário local → sync |
| Editar pet | SIM | Fila offline → atualiza cache local → sync |
| Excluir pet | SIM | Fila offline → remove do cache local → sync |
| Nova entrada diário | SIM | Fila offline → salva local → sync |
| Login/cadastro | NÃO | Requer internet — mensagem amigável |
| Reset de senha | NÃO | Requer internet — mensagem amigável |
| Análise foto IA | NÃO | Requer internet — "Sem conexão. Tente quando tiver internet." |
| Narração IA | NÃO | Entrada salva sem narração, IA narra ao reconectar |

### Regras de implementação

**TODA mutação (escrita) DEVE:**

1. Verificar `onlineManager.isOnline()` antes de chamar API
2. Se offline: salvar na fila via `addToQueue()` + atualizar cache local (optimistic)
3. Se online: chamar API normalmente

**TODA query (leitura) DEVE:**

1. Usar React Query (cache automático)
2. Dados servidos do cache quando offline
3. Refetch automático quando reconectar

**NetworkGuard DEVE:**

1. Mostrar banner offline com contagem de operações pendentes
2. Ao reconectar: executar `processQueue()` automaticamente
3. Mostrar "Sincronizando dados..." durante sync
4. Mostrar "Tudo sincronizado!" ao finalizar

### Arquivos do sistema offline

| Arquivo | Responsabilidade |
|---|---|
| `lib/offlineCache.ts` | Persistir/restaurar cache React Query no AsyncStorage |
| `lib/offlineQueue.ts` | Fila de mutações pendentes (CRUD no AsyncStorage) |
| `lib/offlineSync.ts` | Processar fila — executar mutações pendentes na API |
| `hooks/useNetwork.ts` | Hook para verificar conexão em qualquer componente |
| `components/NetworkGuard.tsx` | UI de monitoramento + sync automático |

---

## Relatórios PDF — especificação obrigatória

> **Todo dado do app DEVE poder ser exportado como PDF.**
> O tutor tem direito de ter seus dados fora do app a qualquer momento.

### Biblioteca

- **expo-print** — gera HTML → PDF e abre print preview nativo
- **expo-sharing** — compartilha o PDF gerado

### Template padrão (`lib/pdf.ts`)

Todo relatório DEVE usar o template via `previewPdf()` ou `sharePdf()`.

**Cabeçalho:**

```
┌─────────────────────────────────────────────────┐
│  [Logo auExpert]  Título do Relatório    Data/Hora│
│                   Subtítulo (opcional)            │
├─────────────────────────────────────────────────┤
```

- Logo: `assets/images/logotipotrans.png` (carregado como base64)
- Título: sistema, weight 700, 16px, cor `bg`
- Subtítulo: 10px, cinza
- Data/hora: canto direito, 9px
- Linha separadora: 2px cor `accent`

**Corpo:** HTML livre (cada relatório monta seu `bodyHtml`). Cards com borda, `border-radius: 8`, `page-break-inside: avoid`.

**Rodapé:**

```
────────────────────────────────────────────────
         Multiverso Digital © 2026 — auExpert
```

Fixo em todas as páginas. Centralizado, 8px, cinza claro.

### Regras obrigatórias

1. **NUNCA chamar `previewPdf()` ou `sharePdf()` diretamente de tela de conteúdo**
2. **SEMPRE navegar para tela dedicada de PDF Preview** — padrão obrigatório
3. Logo no cabeçalho é OBRIGATÓRIO
4. Rodapé "Multiverso Digital © 2026" é OBRIGATÓRIO
5. Data e hora de geração no cabeçalho é OBRIGATÓRIO
6. Título e subtítulo via i18n (NUNCA hardcoded)
7. Botão de exportar PDF usa ícone `Download` (laranja, clicável)

### Padrão de tela PDF Preview (`*-pdf.tsx`)

```
┌─────────────────────────────────────────┐
│  ←  Título do Relatório                 │
├─────────────────────────────────────────┤
│         ┌─────────────────┐             │
│         │   [ícone PDF]   │             │
│         └─────────────────┘             │
│         "Relatório pronto!"             │
│         "Pronto para imprimir..."       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [↓] Imprimir ou salvar PDF      │    │ → previewPdf()
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [↗] Compartilhar arquivo        │    │ → sharePdf()
│  └─────────────────────────────────┘    │
│                                         │
│    Gerado por IA · auExpert · ...       │
└─────────────────────────────────────────┘
```

### Como criar nova tela PDF Preview

1. Criar `[feature]-pdf.tsx` no diretório da feature
2. Receber dados via route params (JSON serializado)
3. Mostrar ícone representativo (Lucide, cor temática)
4. Dois botões: `previewPdf()` e `sharePdf()`
5. Disclaimer em i18n com "Gerado por IA · auExpert · ..."
6. Botão de origem usa ícone `Download` e navega para a tela PDF

### API (`lib/pdf.ts`) — usar APENAS dentro de telas `*-pdf.tsx`

```typescript
await previewPdf({ title, subtitle?, bodyHtml });
await sharePdf({ title, subtitle?, bodyHtml }, 'arquivo.pdf');
```

### Relatórios disponíveis

| Relatório | Tela | Status |
|---|---|---|
| Cardápio semanal | `nutrition/cardapio-pdf.tsx` | ✅ Implementado |
| Prontuário de saúde | `prontuario-pdf.tsx` | ✅ Implementado |
| Diário completo | `diary-pdf.tsx` | Pendente |
| Análise de foto IA | `photo-analysis-pdf.tsx` | Pendente |
| Carteirinha do pet | `id-card-pdf.tsx` | Pendente |

# Plano — Streaming Narração-First no Diário

> **Objetivo:** reduzir drasticamente o tempo que o tutor vê a mensagem
> "analisando…" ao gravar uma entrada no diário, publicando o card na
> timeline assim que a narração estiver pronta e deixando as análises de
> foto/vídeo/áudio aparecerem nas lentes do Painel conforme ficam prontas.
>
> **Autor:** pipeline de IA do diário
> **Data:** 2026-04-19
> **Status:** aguardando review antes de codar

---

## 1. Como está hoje (`hooks/_diary/backgroundClassify.ts`)

```
submitEntry  ───────────────────────────────────────────────────┐
                                                                │
                                                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 1 — runUploads (fotos, vídeo, áudio, doc)        │
       │    + extractVideoFrames + refreshSession (paralelo)    │
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 2 — Promise.all de 5 rotinas (lockstep)          │
       │    A) runTextClassification    → narração + mood + tags│
       │    B) runPhotoAnalyses         → foto deep por imagem  │
       │    C) runVideoClassification   → comportamento         │
       │    D) runAudioClassification   → som do pet            │
       │    E) runOCRClassification     → extrato de documento  │
       │                                                         │
       │  Espera a MAIS LENTA terminar (hoje: ~8-20s típico).    │
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 3 — createDiaryEntry + narration UPDATE +        │
       │  extraFields UPDATE + photo_analyses insert +          │
       │  video/audio UPDATEs + saveToModule +                  │
       │  buildMediaAnalyses + buildInsights                    │
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 4 — finalize: fetch freshEntry + embedding + RAG │
       │  + achievements + setQueryData + 12 invalidateQueries  │
       └────────────────────────────────────────────────────────┘
```

**Problema:** tudo trava na fase 2. O tutor não vê o card até a análise de foto/vídeo mais lenta terminar, mesmo quando a narração (rotina A) já estava pronta 10 segundos antes.

---

## 2. Como fica depois (fluxo streaming)

```
submitEntry  ───────────────────────────────────────────────────┐
                                                                │
                                                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 1 — runUploads + frames + refreshSession         │ (sem mudança)
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 2A — ROTINAS RÁPIDAS (await curto)               │
       │    • runTextClassification    (narração + mood + tags) │
       │    • runOCRClassification     (só se docBase64)        │
       │                                                         │
       │  ~2-4s típico (só texto) | ~5-8s (fotos-only c/ vision)│
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 3 — createDiaryEntry + narration UPDATE +        │
       │  extraFields UPDATE (com classifs do texto/OCR) +      │
       │  saveToModule + setQueryData + invalidar timeline      │
       │                                                         │
       │  ▶▶▶ CARD APARECE NA TIMELINE ◀◀◀                      │
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 4 — FIRE-AND-FORGET (não aguardado)              │
       │                                                         │
       │    runPhotoAnalyses   → UPDATE photo_analysis_data     │
       │                       → insert photo_analyses rows     │
       │                       → media_analyses[photo] push     │
       │                       → invalidate lens 'photo'        │
       │                                                         │
       │    runVideoClassification                              │
       │                       → UPDATE video_analysis          │
       │                       → media_analyses[video] push     │
       │                       → invalidate lens 'video'        │
       │                       → (se não havia narração) UPDATE │
       │                         narration da entrada           │
       │                                                         │
       │    runAudioClassification                              │
       │                       → UPDATE pet_audio_analysis      │
       │                       → media_analyses[audio] push     │
       │                       → invalidate lens 'audio'        │
       │                       → (se não havia narração) UPDATE │
       │                         narration da entrada           │
       │                                                         │
       │  Lentes do Painel aparecem UMA A UMA no card.          │
       └────────────────────────┬───────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────────┐
       │  FASE 5 — finalize (reduzida)                          │
       │    • embedding + RAG + achievements + milestone        │
       │    • processing_status='done' já foi setado na FASE 3  │
       └────────────────────────────────────────────────────────┘
```

**Tempo percebido pelo tutor:** "analisando…" cai de ~8-20s para ~2-5s típico. Análises continuam e "pipocam" no card como lentes do Painel, o que inclusive reforça a percepção de IA trabalhando (filosofia AI-first).

---

## 3. Grafo de dependências (o que pode ou não esperar)

| Saída | Consumido por | Depende de | Pode fire-and-forget? |
|---|---|---|---|
| `narration` | card timeline | rotina A (texto ou fotos-only) OU fallback de vídeo/áudio | **Não** (para fast-path) |
| `mood` + `tags` | `entryData` em `createDiaryEntry` | rotina A | **Não** |
| `classifications[]` (normal) | `extraFields` + `saveToModule` | rotina A | **Não** |
| `classifications[]` (ocr_scan) | `saveToModule` (correções de `extracted_data`) | rotina E | **Não** (só quando `inputType==='ocr_scan'`) |
| `photo_analysis_data` + `photo_analyses` table + `media_analyses[photo]` | lente Fotos no Painel | rotina B | **Sim** |
| `video_analysis` + `media_analyses[video]` | lente Vídeo no Painel | rotina C | **Sim** |
| `pet_audio_analysis` + `media_analyses[audio]` | lente Áudio no Painel | rotina D | **Sim** |
| `pet_insights` (toxicity, low energy) | notificações | análises de mídia prontas | **Sim** (já é fire-and-forget hoje) |
| freshEntry (fetch com joins), embedding, RAG, achievements, personality milestone | auditoria interna / busca semântica | todos os UPDATEs concluídos | **Sim** (já roda em finalize) |

**Regra do plano:** só fica na fase 2A o que é necessário para montar o card da timeline. Todo o resto vira UPDATE lateral com invalidação da lente específica.

---

## 4. Casos de borda e fallbacks

### 4.1 Entrada vídeo-only (sem texto, sem fotos)
- Rotina A é skipped (`reason: 'no_input'`).
- Sem narração pronta na fase 2A.
- **Estratégia:** cria entry com narration `null` e mood `calm`/0.5 (defaults atuais). Rotina C, quando completar em fire-and-forget, faz UPDATE da narration + mood + tags. Como isso já é a fase 4, não segura o card.
- Trade-off: card aparece por alguns segundos sem narração. Aceitável porque:
  1. Vídeo é minoria dos inputs.
  2. Melhor mostrar algo do que esperar 10s.
  3. O tutor vê a lente de vídeo aparecer primeiro (analysis) e a narração pipocar logo depois.

### 4.2 Entrada áudio-only (sem texto)
- Simétrica ao caso 4.1. Rotina D preenche narração retroativa quando completa.

### 4.3 Entrada fotos-only (sem texto)
- Rotina A hoje faz `classifyPhotoGallery` via vision (~5-8s). **Isso fica no await.**
- Rotina B (analyze-pet-photo por imagem) continua em fire-and-forget.
- Entrada não fica tão rápida quanto "texto puro", mas melhora porque não espera por B/C/D.

### 4.4 Rotina A falha
- Fallback já existe hoje (linha 313): `textValue ?? videoValue ?? audioValue ?? defaults`.
- **Como preservar no streaming:** se A falhar e houver vídeo ou áudio, não dá pra esperar C ou D (fire-and-forget). Cria entry com defaults (`calm`, 0.5, sem narração), e deixa C/D sobrescreverem narration ao completar. Toast de erro parcial já emitido.

### 4.5 Entrada `ocr_scan` com rotina E demorada
- Precisamos do OCR antes de `saveToModule` para gravar vaccines/consultations com `extracted_data` correto.
- **Manter E no await da fase 2A** quando `inputType === 'ocr_scan'`. Nos outros casos, E fica em fire-and-forget (raro — só quando `docBase64` vem junto com outros inputs).

### 4.6 `extraFields` (classifications/primary_type/urgency)
- Para `ocr_scan` usa classificações de E.
- Para tudo mais usa classificações de A.
- **Fica na fase 3** (junto do create), porque é tudo texto/OCR — já resolvido.

### 4.7 Retry e offline sync (`useSyncQueue`)
- `retryEntry` também chama `backgroundClassifyAndSave`. O fluxo streaming funciona igual (só recomeça do zero).
- Sem impacto em `skipAI` path (continua usando `_bg/skipAIPath.ts`, que já cria entry + salva mídia sem classificar).

---

## 5. Plano de implementação (arquivos e diffs)

### 5.1 Novo helper — `hooks/_diary/_bg/streamMediaRoutines.ts`

Encapsula a fase 4 (fire-and-forget) para que `backgroundClassify.ts` fique legível.

```ts
// Pseudocódigo
export function streamMediaRoutines(opts: {
  qc, petId, userId, entryId,
  aiFlags, analysisFramesCapped, tutorPhotoCount, species, petName, petBreed,
  uploadedVideoUrls, videoFramesBase64, uploadedAudioUrl, uploadedDocUrl,
  uploadedPhotos, audioOriginalName, audioDuration, videoDuration,
  mediaUris, text, inputType, language, authHeader,
  hadTextNarration: boolean,          // se false → C/D podem sobrescrever narração
}): void {
  // Dispara as 3 rotinas sem await.
  // Cada uma: roda → UPDATE DB → push em media_analyses via RPC/JSON merge →
  //           qc.invalidateQueries da lente correspondente.
  //
  // Se hadTextNarration === false e C/D produzem narração → UPDATE narration +
  //   invalidate timeline query.
}
```

Inclui helpers internos:
- `finishPhotoRoutine(result)` — INSERT em `photo_analyses`, UPDATE `photo_analysis_data`, merge em `media_analyses`, `qc.invalidateQueries([…'diary'])`.
- `finishVideoRoutine(result)` — UPDATE `video_analysis` + (se precisa) narração, merge em `media_analyses`, invalidar timeline.
- `finishAudioRoutine(result)` — UPDATE `pet_audio_analysis` + (se precisa) narração, merge em `media_analyses`, invalidar timeline.

### 5.2 `backgroundClassify.ts` — mudanças principais

**Remover (linhas 222–295):** `Promise.all` de 5 rotinas.

**Adicionar logo antes do create (linha ~437):**

```ts
// FASE 2A — rotinas rápidas (await)
const needsOCRAwait = inputType === 'ocr_scan' && aiFlags.analyzeOCR && !!docBase64ForAI;

const [textOutcome, ocrOutcome] = await Promise.all([
  aiFlags.narrateText && (textForClassify?.trim() || (hasVisualInput && !uploadedVideoUrls[0] && !uploadedAudioUrl))
    ? runTextClassification({…})
    : Promise.resolve<TextClassificationOutcome>({ status: 'skipped', reason: … }),

  needsOCRAwait
    ? runOCRClassification({…})
    : Promise.resolve<OCRClassificationOutcome>({ status: 'skipped', reason: 'deferred' }),
]);

// Monta `classification` a partir do texto OU defaults neutros.
// (se vídeo/áudio-only, narração ficará null → rotina C/D atualiza depois)
const classification = buildInitialClassification({ textOutcome, ocrOutcome });
```

**Manter (linha 437):** `createDiaryEntry(entryData)`.

**Manter (linha 440-447):** `updateDiaryNarration` quando `classification.narration` existe.

**Manter (linhas ~462-600):** `extraFields` UPDATE, `saveToModule`, `buildMediaAnalyses` — mas **adaptado** para:
- Não precisar dos resultados de B/C/D/E (exceto E para ocr_scan).
- Limpar branches que dependiam de `photoOutcome`/`videoOutcome`/`audioOutcome` → essas ramificações migram pro `streamMediaRoutines`.

**Adicionar (antes de `finalize`):**

```ts
// FASE 4 — dispara rotinas de mídia em fire-and-forget
streamMediaRoutines({
  qc, petId, userId, entryId,
  aiFlags,
  analysisFramesCapped, tutorPhotoCount: photosBase64?.length ?? 0,
  species: opts.species, petName: opts.petName, petBreed: opts.petBreed,
  uploadedVideoUrls, videoFramesBase64, uploadedAudioUrl,
  uploadedDocUrl, uploadedPhotos,
  audioOriginalName, audioDuration, videoDuration,
  mediaUris, text, inputType,
  language: i18n.language, authHeader,
  hadTextNarration: !!classification.narration,
});
```

**Manter (linha 606):** `buildInsights` (já é fire-and-forget; só precisa rodar depois que as análises estiverem prontas — mover pra dentro de `streamMediaRoutines`).

**Ajustar `finalize`:** ainda faz fetch do freshEntry + embedding + RAG + achievements. `postSavePromises` fica reduzido (só contém updates da fase 3, não mais da fase 4).

### 5.3 `buildMediaAnalyses` / `buildInsights`

- `buildMediaAnalyses` hoje monta `mediaAnalysesArr` de todas as análises em memória. No streaming, cada rotina fire-and-forget precisa empurrar UM item por vez no JSONB `media_analyses` do banco.
- **Opção escolhida:** criar RPC Postgres `append_media_analysis(entry_id, analysis)` que faz `UPDATE … SET media_analyses = media_analyses || jsonb_build_array($2)`. Assim cada rotina faz um append atômico sem precisar ler-modificar-gravar do cliente.
- `buildInsights` hoje varre `mediaAnalysesArr` in-memory. No streaming, mover invocação de `buildInsights` para **dentro de cada rotina de mídia** (após o append), e ele recebe só o analysis que acabou de completar.

---

## 6. Impacto em testes e QA

| Caso | Como testar | O que verificar |
|---|---|---|
| Texto puro | Gravar "Mana comeu ração" | Card na timeline em ~3s (vs ~8-12s hoje) |
| Texto + foto | Gravar texto + 1 foto | Card em ~3s com narração; lente "Foto" aparece 5-10s depois |
| Texto + vídeo | Gravar texto + vídeo curto | Card em ~3s; lente "Vídeo" aparece ~8s depois |
| Fotos-only (sem texto) | Só tirar foto | Card em ~5-8s (vision no rotina A); lente "Foto" aparece 5-10s depois |
| Vídeo-only | Só vídeo | Card em ~2s **sem narração**; lente "Vídeo" aparece 8s depois + narração UPDATE → card atualiza |
| Áudio-only | Só áudio pet | Card em ~2s sem narração; lente "Áudio" aparece + narração UPDATE |
| OCR (carteirinha) | Fotografar vacina | Card em ~5-8s COM vacina já cadastrada no módulo (rotina E no await) |
| Rotina A falha | Simular erro 500 em classify-diary-entry | Toast de erro parcial; card cria com defaults; rotina C/D (se houver) sobrescreve |
| Offline | Deixar em airplane mode | Entry na fila; ao reconectar, streaming roda normal |
| Retry após erro | Forçar erro, depois retry | Mesma pipeline de streaming |

---

## 7. Riscos

1. **Corrida entre `setQueryData` e invalidate.** Na fase 3 a gente já faz `setQueryData` otimista com a entry. Cada rotina fire-and-forget depois invalida `['pets', petId, 'diary']` para refetch. Risco: refetch traz dados parciais do banco (sem a análise recém-terminada) por latência de replicação. **Mitigação:** já existe em `finalize.ts` — o refetch silencioso tem fallback (linha 178-182) "se vier vazio, mantém cache atual". Replicar esse padrão.

2. **Ordem das lentes aparecerem "pulando".** Aceitável — é o comportamento esperado de UI assíncrona. Cada lente tem animação sutil de "apareceu agora".

3. **RPC nova (`append_media_analysis`).** Precisa migration. Alternativa sem migration: read-modify-write com `UPDATE … RETURNING` dentro de transação otimista. Vou escolher na hora da implementação conforme complexidade.

4. **`saveToModule` depende de classificações.** No streaming atual só roda em cima das classificações do texto/OCR (já disponíveis na fase 3). **Não há regressão.**

5. **Erro parcial (toast).** Hoje o toast de "algumas análises falharam" sai assim que todas as rotinas terminam. No streaming, o toast pode aparecer até ~30s depois do card. **Solução:** emitir toast dentro de cada `finishXRoutine` quando aquela rotina falhar. Pode ser 1-3 toasts em vez de 1 único — mas comunicam com precisão qual análise falhou.

---

## 8. Escopo estimado

- `hooks/_diary/_bg/streamMediaRoutines.ts`: **~200 linhas novas**.
- `hooks/_diary/backgroundClassify.ts`: **~120 linhas alteradas** (Promise.all de 5 vira Promise.all de 2; branches de photo/video/audio saem; chamada a `streamMediaRoutines` entra).
- `hooks/_diary/_bg/buildMediaAnalyses.ts`: **dividir** — criar `pushMediaAnalysis(entryId, analysis)` helper que cada rotina fire-and-forget usa.
- `hooks/_diary/_bg/buildInsights.ts`: **adaptar** para receber 1 análise por vez.
- `hooks/_diary/_bg/finalize.ts`: **~30 linhas a menos** (não aguarda mais `postSavePromises` relacionados a fotos/vídeo/áudio).
- (Opcional) Migration `append_media_analysis.sql`.

---

## 9. Checklist de implementação (após aprovação)

- [ ] Criar branch de trabalho.
- [ ] Extrair `streamMediaRoutines.ts` com as 3 rotinas + helpers de finalização.
- [ ] Adaptar `buildMediaAnalyses.ts` para expor `pushMediaAnalysis` standalone.
- [ ] Adaptar `buildInsights.ts` para aceitar 1 análise por vez.
- [ ] Refatorar `backgroundClassify.ts` — Promise.all reduzido, chamada para `streamMediaRoutines`.
- [ ] Ajustar `finalize.ts` — `postSavePromises` reduzido.
- [ ] Testar manualmente os 9 casos da seção 6.
- [ ] Commit: `refactor(diary): stream media routines, publish narration first`.

---

## 10. Arquivos protegidos (§17)

Este plano toca em:
- `hooks/_diary/backgroundClassify.ts` (não está na lista de §17)
- `hooks/_diary/_bg/*.ts` (helpers extraídos; não protegidos)

**NÃO toca em:**
- `hooks/useDiaryEntry.ts` (protegido — só consome `backgroundClassifyAndSave`)
- `app/(app)/pet/[id]/diary/new.tsx` (protegido — UI externa)
- `supabase/functions/classify-diary-entry/**` (protegido)
- `supabase/functions/analyze-pet-photo/**` (protegido)

---

**Fim do plano. Aguardando aprovação para começar a implementação.**

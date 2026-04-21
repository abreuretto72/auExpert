# Sprint E — Fase 1: Auditoria passiva de conformidade Apple/Google

**Data:** 2026-04-19
**Escopo:** leitura only, zero mudanças de código. Objetivo é mapear gaps antes de submissão às lojas.
**Metodologia:** varredura dos 7 pontos críticos do checklist de lojas (Apple App Store Review + Google Play Data Safety).

---

## Resumo executivo

| # | Ponto auditado | Status | Severidade |
|---|----------------|:------:|:----------:|
| 1 | Consentimento explícito de termos+privacidade no cadastro | ❌ Ausente | **BLOCKER** |
| 2 | Fluxo `user_consents` (LGPD/GDPR) | ⚠️ Parcial | **ALTO** |
| 3 | Consent para `errorReporter` (crash reports) | ✅ OK (sem remote) | Baixo |
| 4 | Permissões declaradas vs usadas | ⚠️ PT-only | Médio |
| 5 | ATT — App Tracking Transparency (iOS 14.5+) | ✅ Não requerido | — |
| 6 | Disclaimers de IA ("NUNCA diagnosticar") | ⚠️ Inconsistente | Médio |
| 7 | Age gate (pet data ≈ health-adjacent) | ❌ Ausente | **ALTO** |

**Conclusão:** existem 2 blockers para submissão (consent no cadastro + age gate) e 3 gaps relevantes (consent granular, permission strings EN, disclaimers em entry points de IA). O restante já está preparado ou é não-aplicável.

---

## 1. Consentimento explícito no cadastro — ❌ BLOCKER

**Evidência:** `app/(auth)/register.tsx` linhas 23-178 — o fluxo contém apenas 4 campos (nome, email, password, confirm) e um botão "Próximo". Nenhuma checkbox, link ou texto de aceite para Termos de Uso ou Política de Privacidade antes do `auth.signUp()`.

**Por que é blocker:**
- **Apple Guideline 5.1.1(i):** "Apps that collect user data must... obtain user consent before collection."
- **Google Play User Data Policy:** "You must obtain user consent... and provide a privacy policy."
- **LGPD Art. 7º, I + Art. 8º:** consentimento deve ser **específico, destacado e informado**. Cadastro sem aceite explícito é nulo.
- **GDPR Art. 7:** consent deve ser "freely given, specific, informed and unambiguous". Silêncio ou inação não configura consent.

**O que o projeto já tem preparado (mas não conectado):**
- Telas `app/(app)/privacy.tsx` e `app/(app)/terms.tsx` existem e são i18n-compliant.
- Documentos jurídicos em `docs/politica privacidade/` (PT + EN, docx + html).
- Tabela `user_consents` com valores suportados `'terms_of_service'`, `'privacy_policy'`, `'ai_training_anonymous'`, `'marketing'`, `'research_partner'` (migration 031).
- Protótipo `docs/prototypes/login_auth_pet.jsx` linha 304+ já mostra o padrão visual da checkbox ("Li e concordo com os Termos de Uso e Política de Privacidade").

**O que falta:**
1. Checkbox obrigatória no `register.tsx` com 2 links (termos + privacidade).
2. Gravar 2 rows em `user_consents` (`terms_of_service` + `privacy_policy`) no `auth.signUp()` ou no callback pós-signup.
3. Bloquear o botão "Próximo" enquanto não estiver marcado.
4. i18n keys sugeridas: `auth.acceptTerms`, `auth.acceptPrivacy`, `auth.mustAcceptConsents`, `auth.readTerms`, `auth.readPrivacy`.

**Severidade:** BLOCKER. Submissão às lojas será rejeitada.

---

## 2. Fluxo `user_consents` (LGPD/GDPR) — ⚠️ Parcial

**Evidência:**
- `hooks/useConsent.ts` implementa read/write correto via upsert em `(user_id, consent_type)`.
- Migration 031 define a tabela com rastreabilidade (ip_address, user_agent, document_version, granted_at, revoked_at).
- RLS policy `user_consents_own` restringe a leitura/escrita ao próprio user.
- **Único consumer:** `app/(app)/settings.tsx` linha 49 — usa `useConsent('ai_training_anonymous')`.

**Gaps identificados:**

### 2a. `terms_of_service` e `privacy_policy` nunca são gravados
Grep por `terms_of_service|privacy_policy` nos arquivos `.ts/.tsx` retorna zero ocorrências fora de `useConsent.ts`/migration. A infraestrutura existe mas os consents fundamentais nunca são registrados — decorre diretamente do gap #1.

### 2b. `ip_address` e `user_agent` não são populados
O hook grava apenas `user_id, consent_type, granted, granted_at, revoked_at, document_version`. Para compliance LGPD Art. 37 (ônus de demonstrar consent), IP e user-agent ajudam a provar quando/como o consent foi dado. Não é blocker, mas é forense limitado.

### 2c. `document_version` hardcoded como '1.0'
`useConsent.ts:42` usa `'1.0'` literal. Quando os termos forem atualizados, toda base precisa re-consentir — mas não há mecanismo de detectar versão desatualizada vs atual. Precisa de constante em `constants/legal.ts` e flag de "re-consent needed" no startup da app.

### 2d. Retirada de consent não tem efeito visível além do toggle
Revogar `ai_training_anonymous` no settings seta `revoked_at` mas a Edge Function `anonymize-entry` (citada em CLAUDE.md §13.6) **ainda não existe** (verificado via `ls supabase/functions/` na sessão anterior). Enquanto a Edge Function não existir, o consent não tem consequência funcional — é decorativo. Não é blocker (porque ninguém está anonimizando hoje), mas precisa casar quando `anonymize-entry` for criada.

**Severidade:** Alta. Boa arquitetura, faltando 4 conexões.

---

## 3. `errorReporter.ts` e consent para crash reports — ✅ OK (sem remote)

**Evidência:** `lib/errorReporter.ts` linha 66-78:
- Sink padrão é `console.error` apenas — **nada sai do dispositivo**.
- Docstring linha 30-32 indica "Quando Sentry entrar, este sink é trocado via `setErrorSink()`".
- `setErrorSink` nunca é chamado em nenhum lugar do código (grep retorna só a definição + docstring).

**Conclusão:** enquanto o errorReporter apenas loga localmente, **não há transferência de dados para terceiros → não há requerimento de consent**.

**Recomendação de bloqueio futuro:** no dia em que Sentry/Bugsnag for plugado, criar consent type `'crash_reports'` e gate `setErrorSink()` em cima dele antes do boot. A `activeSink` só troca se o consent for true. Isto precisa virar tarefa no momento da integração, não agora.

---

## 4. Permissões declaradas vs usadas — ⚠️ PT-only

**Declaradas em `app.json`:**

| Plataforma | Permissão | String justificativa |
|:----------:|-----------|----------------------|
| iOS | NSMicrophoneUsageDescription | PT-only |
| iOS | NSSpeechRecognitionUsageDescription | PT-only |
| iOS | (via expo-camera plugin) cameraPermission | PT-only |
| iOS | (via expo-local-authentication) faceIDPermission | PT-only |
| iOS | (via expo-speech-recognition) microphonePermission + speechRecognitionPermission | PT-only |
| iOS | (via expo-audio) microphonePermission | PT-only |
| iOS | (via expo-image-picker) photosPermission + cameraPermission | PT-only |
| Android | CAMERA, RECORD_AUDIO, USE_BIOMETRIC, USE_FINGERPRINT, MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK | — |

**Usadas em código (verificado via grep expo-*):**
- `expo-camera`: AddPetModal, AddExamModal, AddMedicationModal, AddSurgeryModal, AddConsultationModal, AddVaccineModal, IATab, PhotoCamera, VideoRecorder, DocumentScanner, diary/new, diary/voice, nutrition/trocar, photo-analysis, pet/edit — **usado** ✅
- `expo-image-picker`: AttachmentThumb, MediaViewerModal, e modais — **usado** ✅
- `expo-speech-recognition`: Input.tsx, diary/voice.tsx — **usado** ✅
- `expo-audio`: PetAudioRecorder — **usado** ✅
- `expo-local-authentication`: login.tsx — **usado** ✅
- `expo-notifications`: lib/notifications.ts, useNotifications — **usado** ✅

**Nenhuma permissão over-requested** — todas têm uso real.

**Gaps:**

### 4a. Permission strings só em PT-BR
Todas as justificativas em `app.json` são texto literal em português (ex: "Permitir que AuExpert acesse sua câmera..."). iOS mostra essas strings no dialog de permissão — em um device configurado em inglês, o tutor vê português. É permitido mas unprofessional.

**Solução:** iOS suporta localização de InfoPlist via `InfoPlist.strings`. Expo permite via plugin `expo-localization-plist` ou via `ios.infoPlist` com `CFBundleLocalizations`. Não é blocker de aprovação, mas é degradação visível de UX.

### 4b. Android Data Safety (Google Play Console) — não auditado aqui
Fase 1 é auditoria de código/config. O formulário Data Safety é preenchido no Play Console e é outro workstream (Fase 3 planejada). Todas as 7 permissões declaradas mapeiam para categorias válidas: Camera (photos/videos), Microphone (audio), Biometric (device or other IDs), Foreground service (app activity).

**Severidade:** Média. Nenhum blocker, mas strings EN faltando.

---

## 5. ATT — App Tracking Transparency (iOS 14.5+) — ✅ Não requerido

**Evidência:**
- Grep por `AppTrackingTransparency|ATTrackingManager|NSUserTrackingUsageDescription|tracking` → 0 ocorrências.
- Nenhum SDK de advertising/analytics de terceiros no `package.json` (Facebook SDK, AppsFlyer, Branch, Amplitude, Firebase Analytics, etc. — não presentes).
- `app.json` não declara `NSUserTrackingUsageDescription`.

**Conclusão:** ATT é exigido somente quando o app faz tracking entre apps/sites de terceiros. O auExpert não faz. **Não precisa do framework.**

**Cuidado futuro:** se no futuro integrar Facebook login, Google Ads, remarketing, ou qualquer analytics com IDFA/ad_id, o framework ATT passa a ser obrigatório antes de chamar qualquer API que toque o IDFA.

---

## 6. Disclaimers de IA ("NUNCA diagnosticar") — ⚠️ Inconsistente

**Regra (CLAUDE.md §9.2):** "Análise foto: JSON completo ..., NUNCA diagnosticar".

**Onde já existe (10 arquivos):**
- `photo-analysis.tsx`, `photo-analysis-pdf.tsx` — disclaimer presente (chave `ai.disclaimer` = "Análise feita por IA. Confirme ou edite.")
- `id-card-pdf.tsx` — `pdfDisclaimer`
- `prontuario.tsx`, `prontuario-pdf.tsx`, `prontuario-qr.tsx` — disclaimers médicos
- `diary/new.tsx` — `analyzerDisclaimer` / `mediaDisclaimer`
- `diary-pdf.tsx` — `pdfDisclaimer`
- `ia-pdf.tsx`, `nutrition/cardapio-pdf.tsx` — disclaimers em PDFs

**Gaps (entry points de IA sem disclaimer visível):**

### 6a. Modais de saúde com OCR
`AddExamModal`, `AddMedicationModal`, `AddSurgeryModal`, `AddConsultationModal`, `AddVaccineModal` — todos chamam Edge Function de IA (ocr-document) mas **não exibem disclaimer na UI** após a extração. O tutor vê os campos preenchidos pela IA mas não é avisado que são estimativas.

### 6b. `AddPetModal` — identificação de raça/peso
Grep confirmou que é o **único** Add*.tsx com disclaimer IA (`aiEstimate` ou similar). Os demais herdam OCR mas não sinalizam origem IA dos dados.

### 6c. `IATab.tsx` e `components/pet/IATab`
Não auditado em profundidade. Assumindo que seja a aba de IA na tela do pet, precisa verificação.

**Severidade:** Média. Não é blocker de loja (Apple costuma aceitar sem disclaimer em microcopy), mas é exigência interna do projeto (CLAUDE.md §9.2) e reforça compliance médico (evitar interpretação de "diagnóstico").

---

## 7. Age gate — ❌ Ausente

**Evidência:** `app/(auth)/register.tsx` linhas 32-43 (função `validate`) — valida nome, email, password. **Não pergunta idade, data de nascimento ou confirma que o tutor é ≥13 anos.**

**Por que importa:**
- **Apple App Review 1.3 + 5.1.4:** apps coletando dados de crianças (<13 anos) precisam cumprir COPPA, além de rating de idade correto.
- **Google Play Families Policy + Designed for Families:** mesma exigência.
- **LGPD Art. 14:** tratamento de dados de crianças (<12) e adolescentes (12-18) exige consentimento específico de pais/responsáveis.
- **GDPR Art. 8:** idade mínima 16 (ou 13 conforme país).

**O app é "Health-adjacent"?** O auExpert trata saúde DE PET, não de humano. Mas coleta dados pessoais do tutor (nome, email, eventualmente endereço/GPS, voz via STT, fotos). Isso basta para que as lojas classifiquem como "coleta de dados pessoais" — o que requer idade mínima.

**O que falta:**
1. Campo `birth_date` ou toggle "Tenho 18 anos ou mais" no registro (18 é mais seguro que 13 — evita conflito entre COPPA/GDPR/LGPD).
2. Gravar na tabela `users` (a coluna `birth_date DATE` já existe — `migrations/002_core_tables.sql:14`).
3. Bloquear cadastro se menor.
4. i18n: `auth.ageGate`, `auth.ageConfirm`, `auth.underageBlocked`.

**Severidade:** Alta. Apple pergunta explicitamente no formulário de review se o app é voltado para crianças.

---

## 8. Achados adicionais fora do escopo original

### 8a. Telas de Privacidade e Termos são órfãs
`app/(app)/privacy.tsx` e `app/(app)/terms.tsx` **existem mas não estão linkadas em lugar nenhum**. Grep por `router.push.*privacy|router.push.*terms` retorna 0 resultados. O drawer menu, settings, e o register não as referenciam.

**Impacto:** os documentos jurídicos estão no app mas são inacessíveis. Apple e Google exigem que o link para a política de privacidade esteja **visível dentro do app** E no metadata da loja.

**Sugestão:** adicionar links no settings (sob seção "Sobre") e no register.tsx (na checkbox de consent).

### 8b. Edge Function `anonymize-entry` ausente
CLAUDE.md §13.6 menciona esta função como parte do pipeline de anonimização pós-confirmação. `ls supabase/functions/` não mostra ela. Sem isto, o toggle `ai_training_anonymous` não produz efeito real — usuários que marcarem estão concedendo um consent que ninguém consome.

### 8c. Suporte jurídico EN já existe
`docs/politica privacidade/` tem privacy policy + terms of use em EN (`auExpert_Privacy_Policy_EN.docx`, `auExpert_Terms_of_Use_EN.docx`, mais `.html` combinados PT/EN). Isto facilita preencher o App Store Connect (exige 1 URL de privacy policy por língua suportada).

---

## Plano proposto para Fase 2 (implementação)

Ordenado por severidade:

### P0 — Blockers (não submeter sem isto)
1. **Checkbox de consent no register.tsx** + linkar `/privacy` e `/terms` + bloquear signUp sem aceite + gravar 2 rows em `user_consents` (`terms_of_service`, `privacy_policy`).
2. **Age gate no register.tsx** — toggle "Tenho 18+" ou campo `birth_date` → gravar em `users.birth_date` + bloquear menores.

### P1 — Alta prioridade
3. **Linkar privacy.tsx e terms.tsx** em `settings.tsx` (seção "Sobre") e via 2 links na checkbox do register.
4. **Permission strings EN** via InfoPlist localização (iOS) — não é blocker mas é visível no review.
5. **Disclaimer IA** nos 4 modais de saúde com OCR (AddExam/Medication/Surgery/Consultation/Vaccine) + IATab.

### P2 — Médio
6. **document_version** dinâmico em `constants/legal.ts` + mecanismo de re-consent quando versão mudar.
7. **ip_address + user_agent** populados em `useConsent.setConsent()` (para forense LGPD Art. 37).

### P3 — Bloqueado por outros trabalhos
8. Gate de `setErrorSink()` por consent `'crash_reports'` — só ativar quando Sentry for plugado.
9. Casar `anonymize-entry` Edge Function com o consent `ai_training_anonymous` — quando a função for criada (tracker separado).

---

## Artefatos não-ausentes (já prontos)

- ✅ `useConsent.ts` hook
- ✅ `user_consents` tabela + RLS + índices
- ✅ `delete-account` Edge Function (Apple 5.1.1(v) — right to delete)
- ✅ Privacy policy + Terms (PT + EN) em `docs/politica privacidade/`
- ✅ Telas `privacy.tsx` + `terms.tsx` (só falta linkar)
- ✅ iOS ASC App ID `6761654199` em `eas.json`
- ✅ `ITSAppUsesNonExemptEncryption: false` em `app.json` (declaração de crypto export)

---

**Fim do relatório Fase 1.** Nenhum código foi alterado nesta fase. Fase 2 exige aprovação do desenvolvedor antes de qualquer edição.

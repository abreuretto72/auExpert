# Prompt para Claude Code — Breed Intelligence Feed
# Data: 26/04/2026
# Leia CLAUDE.md e VISION.md antes de começar.

CONTEXTO:
  Breed Intelligence é o feed unificado por raça do auExpert Elite.
  Reúne 3 tipos de conteúdo em um único lugar:
    1. Editorial — conteúdo curado pela IA (artigos, alertas, dicas)
    2. Posts de tutores — vídeo, foto ou experiência do próprio pet
    3. Recomendações — The Inner Circle integrado ao feed
  
  Comentários existem mas são SEMPRE analisados e reescritos pela IA
  antes de aparecer. Nenhum texto do tutor aparece direto.
  
  PRINCÍPIO: Zero digitação — câmera, microfone, galeria.
  Disponível apenas para tutores Elite.

BANCO JÁ CRIADO:
  breed_posts         — todos os tipos de card do feed
  breed_post_comments — comentários moderados pela IA
  breed_post_reactions — reações "Útil"
  breed_feed_cache    — feed personalizado por tutor
  circle_recommendations — recomendações (The Inner Circle)

═══════════════════════════════════════════════════════════════
ETAPA 1 — Edge Function: breed-feed
ARQUIVO: supabase/functions/breed-feed/index.ts
═══════════════════════════════════════════════════════════════

Retorna o feed personalizado para o tutor baseado
nas raças dos seus pets.

GET body:
  {
    pet_id: string,        // pet atual selecionado
    cursor?: string,       // paginação (ISO datetime)
    limit?: number,        // default 20
    filter?: 'all' | 'editorial' | 'tutor_post' | 'recommendation'
  }

Fluxo interno:
  1. Buscar raças dos pets do tutor
  2. Buscar posts de breed_posts onde:
     - target_breeds contém alguma raça do tutor OU target_breeds IS NULL
     - target_species = espécie do pet OU 'both'
     - is_active = true, is_deleted = false
     - status = 'published' ou moderation_status = 'approved'
  3. Misturar na proporção:
     - 50% editorial (ai_generated = true)
     - 30% tutor_post
     - 20% recommendation
  4. Ordenar por:
     - urgency DESC (critical primeiro)
     - ai_relevance_score DESC
     - published_at DESC
  5. Retornar com paginação por cursor

Deploy:
  supabase functions deploy breed-feed --no-verify-jwt

═══════════════════════════════════════════════════════════════
ETAPA 2 — Edge Function: breed-post-create
ARQUIVO: supabase/functions/breed-post-create/index.ts
═══════════════════════════════════════════════════════════════

Cria um post de tutor com moderação automática pela IA.

POST body:
  {
    pet_id: string,
    audio_base64?: string,       // narração por voz (opcional)
    tutor_raw_text?: string,     // transcrição ou texto direto
    media_urls: string[],        // URLs já upadas no storage
    media_types: string[],       // 'photo' | 'video'
    from_diary_entry_id?: string, // se veio de uma entrada do diário
    recommendation_id?: string,  // se é uma recomendação
    language: string
  }

Fluxo interno:
  1. Buscar perfil do pet (raça, espécie, idade)
  2. Transcrever áudio se necessário (Gemini STT)
  3. Enviar para Claude moderar e enriquecer:

     Prompt de moderação:
     "Um tutor de ${pet.breed} compartilhou o seguinte:
      '${tutor_raw_text}'
      
      MODERE este conteúdo para o Breed Intelligence,
      um feed clínico e educativo sobre pets.
      
      REJEITE se contiver:
      - Indicação de medicamento sem veterinário
      - Diagnóstico informal de doença
      - Desinformação sobre saúde animal
      - Conteúdo ofensivo ou irrelevante
      
      Se APROVADO, reescreva em formato elegante e clínico
      (2-3 frases, 3ª pessoa, registro Elite):
      
      Retorne APENAS JSON:
      {
        'approved': true | false,
        'rejection_reason': 'string ou null',
        'ai_caption': 'texto reescrito elegante',
        'ai_tags': ['raça', 'condição', 'tema'],
        'urgency': 'none|low|medium|high|critical',
        'ai_relevance_score': 0.0 a 10.0
      }"

  4. Se aprovado → inserir em breed_posts com status publicado
  5. Se rejeitado → inserir com moderation_status = 'rejected'
     e notificar tutor com o motivo
  6. Retornar resultado ao tutor

Deploy:
  supabase functions deploy breed-post-create --no-verify-jwt

═══════════════════════════════════════════════════════════════
ETAPA 3 — Edge Function: breed-comment-create
ARQUIVO: supabase/functions/breed-comment-create/index.ts
═══════════════════════════════════════════════════════════════

Tutor comenta por voz. IA modera e reescreve antes de publicar.

POST body:
  {
    post_id: string,
    pet_id: string,
    audio_base64?: string,
    raw_text?: string,
    comment_type: 'experience' | 'question' | 'tip' | 'confirmation',
    language: string
  }

Fluxo interno:
  1. Transcrever áudio se necessário
  2. Claude modera e reescreve:

     Prompt:
     "Tutor de ${pet.breed} comentou em post sobre ${post.title}:
      '${raw_text}'
      
      Tipo de comentário: ${comment_type}
      
      REJEITE se contiver desinformação médica, diagnóstico
      informal, medicação sem vet ou conteúdo ofensivo.
      
      Se APROVADO, reescreva em formato clínico elegante.
      Verifique também se o comentário é relevante para o tema do post.
      
      Retorne APENAS JSON:
      {
        'approved': true | false,
        'rejection_reason': 'string ou null',
        'ai_summary': 'comentário reescrito (1-2 frases, 3ª pessoa)',
        'ai_tags': ['tags relevantes']
      }"

  3. Cruzar com diário do tutor:
     - Buscar entradas recentes com sintomas/condições similares
     - Se encontrar → diary_confirmed = true, diary_entry_id = id

  4. Inserir em breed_post_comments com status adequado
  5. Retornar para o tutor:
     - Se aprovado: "Sua contribuição foi publicada"
     - Se rejeitado: motivo em linguagem gentil

Deploy:
  supabase functions deploy breed-comment-create --no-verify-jwt

═══════════════════════════════════════════════════════════════
ETAPA 4 — Edge Function: breed-editorial-generate
ARQUIVO: supabase/functions/breed-editorial-generate/index.ts
═══════════════════════════════════════════════════════════════

Gera conteúdo editorial automaticamente para uma raça.
Chamada via cron (check-scheduled-events) ou manualmente.

POST body:
  {
    breed: string,
    species: 'dog' | 'cat',
    topic?: string,              // tema específico (opcional)
    language: string
  }

Fluxo interno:
  1. Claude gera conteúdo clínico sobre a raça:

     Prompt:
     "Gere um artigo clínico curto e útil sobre ${breed}.
      
      Público: tutores Elite com alto nível de cuidado.
      Tom: elegante, 3ª pessoa, baseado em evidências.
      Formato: título impactante + 3-4 parágrafos curtos.
      Tamanho: máximo 300 palavras.
      
      Temas prioritários para ${breed}:
      - Predisposições genéticas conhecidas
      - Alertas sazonais ou regionais (Brasil)
      - Cuidados preventivos específicos da raça
      - Novidades científicas recentes
      
      Retorne APENAS JSON:
      {
        'title': 'título do artigo',
        'body': 'corpo do artigo',
        'ai_tags': ['tags clínicas'],
        'urgency': 'none|low|medium|high|critical',
        'ai_relevance_score': 0.0 a 10.0,
        'source_name': 'WSAVA|PubMed|Multiverso IA|outro'
      }"

  2. Inserir em breed_posts com:
     - post_type = 'editorial'
     - ai_generated = true
     - moderation_status = 'approved' (já moderado)
     - target_breeds = [breed]

Deploy:
  supabase functions deploy breed-editorial-generate --no-verify-jwt

═══════════════════════════════════════════════════════════════
ETAPA 5 — Hook: useBreedIntelligence.ts
ARQUIVO: hooks/useBreedIntelligence.ts
═══════════════════════════════════════════════════════════════

  export function useBreedIntelligence(petId: string) {

    const { data: feed, fetchNextPage, isLoading } = useInfiniteQuery({
      queryKey: ['breed_intelligence', petId],
      queryFn: ({ pageParam }) =>
        supabase.functions.invoke('breed-feed', {
          body: { pet_id: petId, cursor: pageParam, limit: 20 }
        }).then(r => r.data),
      getNextPageParam: (last) => last.next_cursor,
    });

    const createPost = useMutation({
      mutationFn: async (params: {
        audioBase64?: string;
        tutorRawText?: string;
        mediaUrls: string[];
        mediaTypes: string[];
        fromDiaryEntryId?: string;
        recommendationId?: string;
      }) => {
        const { data } = await supabase.functions.invoke('breed-post-create', {
          body: { pet_id: petId, ...params, language: i18n.language },
        });
        return data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['breed_intelligence'] });
        if (data.approved) {
          toast(t('breedIntel.postPublished'), 'success');
        } else {
          toast(t('breedIntel.postRejected'), 'warning');
        }
      },
    });

    const createComment = useMutation({
      mutationFn: async (params: {
        postId: string;
        audioBase64?: string;
        rawText?: string;
        commentType: string;
      }) => {
        const { data } = await supabase.functions.invoke('breed-comment-create', {
          body: { pet_id: petId, ...params, language: i18n.language },
        });
        return data;
      },
    });

    const react = useMutation({
      mutationFn: async (postId: string) => {
        await supabase.from('breed_post_reactions').upsert({
          post_id: postId,
          user_id: userId,
          pet_id: petId,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['breed_intelligence'] });
      },
    });

    return { feed, fetchNextPage, isLoading, createPost, createComment, react };
  }

═══════════════════════════════════════════════════════════════
ETAPA 6 — Tela: Breed Intelligence
ARQUIVO: app/(app)/pet/[id]/breed-intelligence/index.tsx
═══════════════════════════════════════════════════════════════

ESTRUTURA DA TELA:

Header:
  ← voltar | "Breed Intelligence" | filtros (ícone)
  Subtítulo: "Chihuahua · Border Collie" (raças dos pets)

Filtros (chips horizontais, scrolláveis):
  [Todos]  [📰 Editorial]  [🎥 Tutores]  [⭐ Recomendações]
  Chip de urgência: [🔴 Alertas] — aparece quando há urgência alta

Botão de criar post (FAB laranja fixo no canto):
  Ícone câmera + microfone
  Ao tocar → bottom sheet com 3 opções:
    📷 Foto / Vídeo agora
    🖼️ Da galeria
    📖 Do meu diário

Feed (FlatList com pull-to-refresh):

  CARD EDITORIAL:
  ┌─────────────────────────────────────────┐
  │ [IMAGEM/ILUSTRAÇÃO GRANDE - 200px]      │
  │                                         │
  │ 📰 EDITORIAL · WSAVA                    │
  │ Chihuahuas e colapso de traqueia:       │
  │ como identificar precocemente           │
  │                                         │
  │ "Tutores de Chihuahua devem observar    │
  │  respiração ruidosa como sinal..."      │
  │                                         │
  │ #chihuahua #respiração #preventivo      │
  │                                         │
  │ [❤️ Útil · 24]  [💬 3]  [→ Ver mais]  │
  └─────────────────────────────────────────┘

  CARD DE TUTOR (vídeo):
  ┌─────────────────────────────────────────┐
  │ [THUMBNAIL VÍDEO COM ▶ CENTRALIZADO]    │
  │ 0:42                                    │
  │                                         │
  │ 🐾 Ana T. · Mana · Chihuahua · 2h      │
  │                                         │
  │ "Mana demonstrou melhora significativa  │
  │  após protocolo de fisioterapia aquática│
  │  indicado pela Dra. Paula."             │
  │                                         │
  │ #chihuahua #fisioterapia #recuperação   │
  │                                         │
  │ [❤️ Útil · 8]  [💬 2]  [↗️ Compartilhar]│
  └─────────────────────────────────────────┘

  CARD DE RECOMENDAÇÃO:
  ┌─────────────────────────────────────────┐
  │ ⭐ RECOMENDAÇÃO · São Paulo             │
  │                                         │
  │ Studio Patas Douradas                   │
  │ Groomer especialista em raças pequenas  │
  │                                         │
  │ "Mana voltou calma e impecável.         │
  │  Técnica excelente para Chihuahua       │
  │  com ansiedade de separação."           │
  │                                         │
  │ ⭐⭐⭐⭐⭐ · por Ana T.                  │
  │ 5 tutores confirmaram                  │
  │                                         │
  │ [✓ Confirmo]  [📞 Ligar]  [→ No App]  │
  └─────────────────────────────────────────┘

  CARD DE ALERTA (urgency = high | critical):
  ┌─────────────────────────────────────────┐
  │ 🔴 ALERTA DE SAÚDE · MAPA              │
  │ Recall: Lote X da Ração Y              │
  │                                         │
  │ "Produto retirado do mercado no Brasil  │
  │  por contaminação. Verificar imedi..."  │
  │                                         │
  │ [Ver detalhes →]                        │
  └─────────────────────────────────────────┘

TELA DE POST (ao tocar em um card):
  Header: ← voltar | título
  Mídia grande (foto ou vídeo player)
  Corpo do texto completo
  Tags clicáveis
  Seção de comentários:
    "Experiências de outros tutores"
    Lista de comentários aprovados pela IA
    (cada comentário tem: avatar pet, raça, texto IA, tipo)
    Botão: [🎤 Compartilhar minha experiência]
    → mic abre por 30s
    → IA analisa e reescreve
    → se aprovado: aparece após 2-3s

FLUXO DE CRIAR POST (bottom sheet):
  Opção 1 — Câmera:
    → Abre câmera nativa
    → Tutor grava até 60s ou tira foto
    → Mic abre automaticamente após captura:
       "Conte o que aconteceu com a Mana..."
    → Tutor fala (ou pula)
    → Preview do card gerado pela IA
    → [✏️ Editar]  [✅ Publicar]

  Opção 2 — Galeria:
    → Abre ImagePicker (sem crash — um picker)
    → Seleciona foto ou vídeo
    → Mic abre: "Conte o que aconteceu..."
    → Mesmo fluxo

  Opção 3 — Do diário:
    → Lista as últimas 10 entradas do diário
    → Tutor seleciona uma
    → IA gera o card automaticamente
    → [✏️ Editar]  [✅ Publicar]

═══════════════════════════════════════════════════════════════
ETAPA 7 — i18n (todos os 5 idiomas)
═══════════════════════════════════════════════════════════════

"breedIntel" NÃO é traduzido para o nome da feature.
Usar "Breed Intelligence" em todos os idiomas.

pt-BR:
  "breedIntel": {
    "title": "Breed Intelligence",
    "subtitle": "Conteúdo exclusivo para a raça da sua {{petName}}",
    "filterAll": "Todos",
    "filterEditorial": "Editorial",
    "filterTutor": "Tutores",
    "filterRec": "Recomendações",
    "filterAlerts": "Alertas",
    "createPost": "Compartilhar",
    "fromCamera": "Câmera agora",
    "fromGallery": "Da galeria",
    "fromDiary": "Do meu diário",
    "speakNow": "Conte o que aconteceu com a {{petName}}...",
    "postPublished": "Publicado no Breed Intelligence!",
    "postRejected": "Conteúdo não aprovado. Tente novamente.",
    "useful": "Útil",
    "shareExperience": "Compartilhar minha experiência",
    "commentsTitle": "Experiências de outros tutores",
    "commentPublished": "Sua contribuição foi publicada!",
    "commentPending": "Analisando sua contribuição...",
    "eliteOnly": "Disponível apenas no plano Elite",
    "editorial": "Editorial",
    "recommendation": "Recomendação",
    "alert": "Alerta de Saúde"
  }

en-US, es-MX, es-AR, pt-PT: traduzir equivalente.
"Breed Intelligence" permanece em inglês em todos os idiomas.

═══════════════════════════════════════════════════════════════
VERIFICAR após implementar
═══════════════════════════════════════════════════════════════

  1. Abrir Breed Intelligence (só Elite)
  2. Feed carrega com mix de cards por raça
  3. Tocar FAB → bottom sheet aparece
  4. Câmera → gravar vídeo da Mana → mic abre → falar → publicar
  5. Card aparece no feed em segundos
  6. Tocar em comentar → mic abre 30s → IA analisa → aparece
  7. Tocar "Útil" → contador incrementa
  8. Tutor não Elite → tela de paywall

NAO REMOVER OS LOGS EXISTENTES.
Não precisa de rebuild — salvar e ver no Metro.

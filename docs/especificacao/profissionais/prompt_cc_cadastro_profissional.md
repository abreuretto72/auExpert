# Prompt para Claude Code — Tela de Cadastro do Profissional com Scanner
# Data: 25/04/2026
# Leia CLAUDE.md antes de comecar.

CONTEXTO:
  O auExpert é mundial. Profissionais de qualquer país
  podem se cadastrar. O app NÃO valida nenhum conselho
  profissional — o profissional é 100% responsável pela
  veracidade de seus dados.

  O scanner de documentos usa a Edge Function
  analyze-pet-photo (já deployada, verify_jwt: false)
  para extrair dados do documento via OCR/IA.

═══════════════════════════════════════════════════════════════
ETAPA 1 — Tela de cadastro do profissional
Arquivo: app/(app)/professional/register.tsx (CRIAR)
═══════════════════════════════════════════════════════════════

Criar a tela de cadastro com as seguintes seções:

SEÇÃO 1 — Scanner de documento (opcional mas recomendado)

  <View style={styles.scannerBanner}>
    <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
    <View style={{ flex: 1 }}>
      <Text style={styles.scannerTitle}>
        {t('professional.scanDoc')}
      </Text>
      <Text style={styles.scannerSub}>
        {t('professional.scanDocHint')}
      </Text>
    </View>
    <TouchableOpacity style={styles.scanBtn} onPress={handleScanDocument}>
      <Camera size={rs(18)} color="#fff" strokeWidth={1.8} />
      <Text style={styles.scanBtnText}>{t('professional.scan')}</Text>
    </TouchableOpacity>
  </View>

  Ao tocar em Escanear:
  - Abrir câmera via ImagePicker.launchCameraAsync
  - Converter para base64
  - Enviar para analyze-pet-photo com prompt específico (ver Etapa 2)
  - Preencher campos automaticamente com o retorno
  - Mostrar Toast: "Dados extraídos! Revise antes de salvar."

SEÇÃO 2 — Dados profissionais (campos editáveis)

  Campos obrigatórios (*):
  - display_name *        — Nome completo / Nome profissional
  - professional_type *   — Picker: Médico Veterinário | Zootecnista |
                            Groomer | Nutricionista Animal | Treinador |
                            Outro
  - country_code *        — País (picker de países, default: BR)

  Campos opcionais:
  - council_name          — Conselho (ex: CRMV-SP, AVMA, RCVS, OMVQ...)
  - council_number        — Número do registro
  - council_uf            — Estado/Província (texto livre)
  - specialties           — Especialidades (chips selecionáveis:
                            Clínica Geral, Dermatologia, Cardiologia,
                            Oncologia, Ortopedia, Oftalmologia,
                            Nutrição, Comportamento, Odontologia,
                            Acupuntura, Homeopatia, Outro)
  - phone                 — Telefone com DDI
  - clinic_name           — Clínica / Consultório
  - clinic_address        — Endereço da clínica
  - website               — Site (opcional)
  - bio                   — Mini bio (máx 300 chars)
  - languages             — Idiomas atendidos (chips)
  - profile_photo_url     — Foto de perfil (ImagePicker)

SEÇÃO 3 — TERMO DE RESPONSABILIDADE (obrigatório, não pode prosseguir sem aceitar)

  <View style={styles.termoContainer}>
    <AlertTriangle size={rs(16)} color={colors.gold} strokeWidth={1.8} />
    <Text style={styles.termoTitle}>
      {t('professional.termoTitle')}
    </Text>
    <Text style={styles.termoText}>
      {t('professional.termoBody')}
    </Text>

    {/* Checkbox obrigatório */}
    <TouchableOpacity
      style={styles.termoCheck}
      onPress={() => setTermoAccepted(!termoAccepted)}
    >
      <View style={[styles.checkbox, termoAccepted && styles.checkboxActive]}>
        {termoAccepted && <Check size={rs(12)} color="#fff" strokeWidth={2.5} />}
      </View>
      <Text style={styles.checkboxLabel}>
        {t('professional.termoAccept')}
      </Text>
    </TouchableOpacity>
  </View>

  O botão "Criar Conta Profissional" só é habilitado
  quando termoAccepted === true.

  Estilo do termoContainer:
    backgroundColor: colors.gold + '12',
    borderWidth: 1,
    borderColor: colors.gold + '40',
    borderRadius: rs(12),
    padding: rs(16),
    gap: rs(10),

═══════════════════════════════════════════════════════════════
ETAPA 2 — Prompt de OCR para documento profissional
Arquivo: supabase/functions/analyze-pet-photo/index.ts
═══════════════════════════════════════════════════════════════

Adicionar um modo especial quando o body contém
mode: 'professional_document':

  if (mode === 'professional_document') {
    const ocrPrompt = `You are an OCR assistant for professional credential documents.
    Extract information from this professional document image.
    
    This could be any type of professional credential worldwide:
    veterinary council card, diploma, professional license, badge,
    CRMV card (Brazil), AVMA member card (USA), RCVS certificate (UK),
    or any other professional document.
    
    Extract what is visible. Do not infer or invent information.
    
    Return ONLY valid JSON:
    {
      "document_type": "council_card|diploma|license|badge|certificate|other",
      "full_name": "extracted name or null",
      "council_name": "council or institution name or null",
      "council_number": "registration number or null",
      "council_uf": "state/province if visible or null",
      "country": "country name if visible or null",
      "specialties": ["extracted specialties"] or [],
      "valid_until": "date if visible or null",
      "institution": "university/institution name or null",
      "confidence": 0.0 to 1.0
    }`;

    // usar analyze-pet-photo mas com ocrPrompt ao invés do prompt padrão
  }

Fazer redeploy: supabase functions deploy analyze-pet-photo

═══════════════════════════════════════════════════════════════
ETAPA 3 — Lógica de submit
Arquivo: app/(app)/professional/register.tsx
═══════════════════════════════════════════════════════════════

  const handleSubmit = async () => {
    if (!termoAccepted) return;

    setLoading(true);
    try {
      // 1. Upar foto de perfil se selecionada
      let profilePhotoUrl = null;
      if (profilePhotoUri) {
        const path = await uploadPetMedia(userId, 'professionals', profilePhotoUri, 'photo');
        profilePhotoUrl = getPublicUrl('pet-photos', path);
      }

      // 2. Criar perfil profissional no banco
      const { data, error } = await supabase
        .from('professionals')
        .insert({
          user_id: userId,
          display_name: displayName.trim(),
          professional_type: professionalType,
          country_code: countryCode,
          council_name: councilName || null,
          council_number: councilNumber || null,
          council_uf: councilUf || null,
          specialties: specialties.length > 0 ? specialties : null,
          phone: phone || null,
          clinic_name: clinicName || null,
          clinic_address: clinicAddress || null,
          website: website || null,
          bio: bio || null,
          languages: languages.length > 0 ? languages : ['pt-BR'],
          profile_photo_url: profilePhotoUrl,
          is_declared: true,
          declared_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // 3. Atualizar role do usuário para 'professional'
      await supabase.from('users')
        .update({ role: 'professional' })
        .eq('id', userId);

      toast(t('professional.registered'), 'success');
      router.replace('/(app)/professional/dashboard');

    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  };

═══════════════════════════════════════════════════════════════
ETAPA 4 — Textos i18n (todos os 5 idiomas)
═══════════════════════════════════════════════════════════════

pt-BR:
  "professional": {
    "scanDoc": "Escanear documento profissional",
    "scanDocHint": "Aponte para sua carteira do conselho, diploma ou crachá",
    "scan": "Escanear",
    "scanSuccess": "Dados extraídos! Revise antes de salvar.",
    "termoTitle": "Declaração de Responsabilidade",
    "termoBody": "Declaro que todas as informações fornecidas neste cadastro são verdadeiras e de minha inteira responsabilidade. O auExpert não verifica credenciais profissionais. Sou o único responsável pela veracidade dos meus dados, número de registro e qualificações declaradas. O uso de informações falsas pode resultar no cancelamento da conta e responsabilização civil e criminal.",
    "termoAccept": "Li e aceito a Declaração de Responsabilidade",
    "registered": "Conta profissional criada com sucesso!",
    "registerTitle": "Cadastro Profissional",
    "registerSub": "Profissionais de qualquer país são bem-vindos",
    "displayName": "Nome profissional completo",
    "professionalType": "Tipo de profissional",
    "country": "País de atuação",
    "councilName": "Conselho profissional",
    "councilNameHint": "Ex: CRMV-SP, AVMA, RCVS, OMVQ...",
    "councilNumber": "Número de registro",
    "councilUf": "Estado / Província",
    "specialties": "Especialidades",
    "clinicName": "Clínica / Consultório",
    "bio": "Mini bio",
    "bioHint": "Descreva sua experiência em até 300 caracteres",
    "createAccount": "Criar Conta Profissional",
    "termoRequired": "Você precisa aceitar a Declaração de Responsabilidade"
  }

en-US:
  "professional": {
    "scanDoc": "Scan professional document",
    "scanDocHint": "Point to your council card, diploma or badge",
    "scan": "Scan",
    "scanSuccess": "Data extracted! Review before saving.",
    "termoTitle": "Responsibility Declaration",
    "termoBody": "I declare that all information provided in this registration is true and is my sole responsibility. auExpert does not verify professional credentials. I am solely responsible for the accuracy of my data, registration number and declared qualifications. Use of false information may result in account cancellation and civil and criminal liability.",
    "termoAccept": "I have read and accept the Responsibility Declaration",
    "registered": "Professional account created successfully!",
    "registerTitle": "Professional Registration",
    "registerSub": "Professionals from any country are welcome",
    "displayName": "Full professional name",
    "professionalType": "Professional type",
    "country": "Country of practice",
    "councilName": "Professional council",
    "councilNameHint": "E.g.: CRMV-SP, AVMA, RCVS, OMVQ...",
    "councilNumber": "Registration number",
    "councilUf": "State / Province",
    "createAccount": "Create Professional Account",
    "termoRequired": "You must accept the Responsibility Declaration"
  }

es-MX / es-AR:
  "professional": {
    "scanDoc": "Escanear documento profesional",
    "scanDocHint": "Apunte a su tarjeta de colegio, diploma o credencial",
    "scan": "Escanear",
    "termoTitle": "Declaración de Responsabilidad",
    "termoBody": "Declaro que toda la información proporcionada en este registro es verdadera y es de mi entera responsabilidad. auExpert no verifica credenciales profesionales. Soy el único responsable de la veracidad de mis datos, número de registro y calificaciones declaradas.",
    "termoAccept": "He leído y acepto la Declaración de Responsabilidad",
    "createAccount": "Crear Cuenta Profesional"
  }

pt-PT:
  "professional": {
    "scanDoc": "Digitalizar documento profissional",
    "scanDocHint": "Aponte para a sua cédula, diploma ou crachá",
    "scan": "Digitalizar",
    "termoTitle": "Declaração de Responsabilidade",
    "termoBody": "Declaro que todas as informações fornecidas neste registo são verdadeiras e da minha inteira responsabilidade. O auExpert não verifica credenciais profissionais.",
    "termoAccept": "Li e aceito a Declaração de Responsabilidade",
    "createAccount": "Criar Conta Profissional"
  }

═══════════════════════════════════════════════════════════════
VERIFICAR após implementar
═══════════════════════════════════════════════════════════════

  1. Abrir tela de cadastro profissional
  2. Tocar em "Escanear" → câmera abre
  3. Fotografar carteira CRMV → campos preenchidos automaticamente
  4. Revisar e corrigir campos se necessário
  5. Tentar salvar sem aceitar o termo → botão bloqueado
  6. Aceitar o termo → botão habilitado
  7. Salvar → perfil criado na tabela professionals
  8. Redirecionar para dashboard do profissional

NAO REMOVER OS LOGS EXISTENTES.
Não precisa de rebuild — salvar e ver no Metro.

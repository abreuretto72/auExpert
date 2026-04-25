/**
 * _shared/supportKnowledgeBase.ts
 *
 * Knowledge base do support-assistant — fonte única de conhecimento sobre
 * todas as telas, rotinas e regras do auExpert.
 *
 * COMO MANTER ATUALIZADO:
 *   - Quando uma tela nova for adicionada → adicionar seção em "TELAS"
 *   - Quando um fluxo mudar → atualizar a seção em "FLUXOS"
 *   - Quando uma regra de negócio mudar → atualizar "LIMITES E REGRAS"
 *   - Quando um bug recorrente for descoberto → adicionar em "PROBLEMAS CONHECIDOS"
 *
 * COMO É CONSUMIDO:
 *   support-assistant carrega esta string como bloco do system prompt com
 *   cache_control: ephemeral. A primeira chamada paga o input completo;
 *   chamadas subsequentes em 5min usam cache_read (custo ~10% do input).
 *
 * TAMANHO ATUAL: ~5500 tokens
 *   - Custo Haiku 4.5 sem cache: $0.0044 / chamada
 *   - Custo Haiku 4.5 com cache_read: $0.00044 / chamada (90% economia)
 */

export const SUPPORT_KNOWLEDGE_BASE = `# auExpert — KNOWLEDGE BASE PARA SUPORTE

## VISÃO GERAL DO APP

auExpert ("au" minúsculo, "Expert" com E maiúsculo) é um app premium de cuidado pet com IA. Tagline: "Uma inteligência única para o seu pet". Aceita APENAS cães e gatos.

Filosofia: AI-first. Em cada tela, a hierarquia de input é:
  1º — Câmera + IA (foto resolve mais que formulário)
  2º — Microfone (STT em todo campo de texto, exceto senha)
  3º — Seleção rápida (chips, toggles)
  4º — Digitação (último recurso)

Tutor = dono do pet. Pet = cão ou gato. Co-tutor = familiar/cuidador convidado.

## TELAS PRINCIPAIS

### Login / Cadastro / Recuperar senha
Rota: /login, /register, /forgot-password
- Login com email+senha OU biometria (digital/face) se já cadastrada antes
- Botão "Esqueci minha senha" envia link por e-mail
- Cadastro pede nome, email, senha (mín 8 chars, 1 maiúscula, 1 número, 1 especial)
- Lock após 5 tentativas falhas (15min)

### Hub "Meus Pets" (tela inicial)
Rota: /
- Lista de cards dos pets do tutor (sem limite)
- Cada card: avatar, nome, raça, idade, mood atual, stats clicáveis (peso, idade, etc.)
- Botão "+" no header → abre modal de cadastro de pet
- Avatar do tutor no topo direito → tela de perfil
- Hambúrguer top-esquerda → drawer menu

### Cadastro de Pet (modal)
Acessado pelo "+" do Hub.
Fluxo AI-first:
  1. Tutor tira foto do pet (frontal, bom enquadramento)
  2. IA Vision analisa raça, porte, idade, peso, cor
  3. Campos pré-preenchidos com dados inferidos (badge "sugerido pela IA")
  4. Tutor confirma ou edita
  5. Adiciona nome, sexo, microchip (opcional, único)
  6. Salva → narração IA de boas-vindas

### Dashboard do Pet
Rota: /pet/[id]
Centro de gravidade. Mostra: foto grande, nome, mood atual, health score 0-100, atalhos para 12 funcionalidades:
  - Diário, Saúde, Prontuário, Análise de Foto, Cardápio, Despesas
  - Friends, Achievements, ID Card, Insurance, Travel, Capsules

### Diário do Pet
Rota: /pet/[id]/diary
- Timeline reversa cronológica de entradas
- Cada entrada: texto, foto, narração IA (3ª pessoa, registro literário Elite), mood, tags, urgência
- Cards têm ícone ✏️ pra editar (lixeira só dentro da tela de edição)
- Filtros por tipo de classificação (saúde, comportamento, refeição, etc.)
- Botão "+" abre tela unificada de nova entrada

### Nova Entrada de Diário
Rota: /pet/[id]/diary/new
- Mic AUTO-grava ao entrar na tela (não precisa apertar)
- Waveform laranja pulsante mostra que está captando
- Campo de texto editável (foco com botão ✏️ pausa o mic)
- 4 botões de anexo: Foto, Vídeo, Som do pet, Arquivo (PDF/imagem)
- Mic NUNCA fecha sozinho — pausa só durante picker de mídia
- Botão "Gravar no Diário" → navega imediatamente; IA processa em background
- IA gera: classificação automática, narração, mood inferido, tags, tarefas sugeridas

### Saúde
Rota: /pet/[id]/health
Mostra prontuário ativo dividido em:
  - Vacinas (ativas, vencidas em vermelho, próximas em amarelo)
  - Alergias (severidade leve/moderada/grave)
  - Medicações (com data início/fim)
  - Exames (status normal/atenção/crítico)
  - Consultas (com vet, data, diagnóstico, hora)
  - Cirurgias (data, procedimento, vet)
Cada categoria tem botão "Adicionar" → modal com Step 0 mic+input.

### Adicionar Vacina (modal dentro de Saúde)
Caminho rápido: escanear carteirinha de vacina → OCR extrai tudo (nome, lote, data, próxima dose, vet, clínica). Caminho manual: preencher campos.

### Prontuário
Rota: /pet/[id]/prontuario
Documento clínico completo gerado por IA, atualizado a cada 24h ou via "Atualizar agora".
Inclui: identificação, BCS, body systems review, exam abnormal flags, alergias críticas, meds ativas, condições crônicas, blood type, contatos de emergência.
Compartilhamento: gera QR code + token público (acesso temporário em /prontuario-qr).

### Análise de Foto
Rota: /pet/[id]/photo-analysis
- Tira foto do pet (qualquer pose)
- IA Vision Opus 4.7 analisa: raça, mood pela expressão, body condition, lesões cutâneas, dental, ambiente, sinais comportamentais
- Resultado: cards com identificação, achados clínicos, alertas, observações em registro literário
- DISCLAIMER obrigatório: "Análise feita por IA. Confirme com seu veterinário. Não substitui consulta."
- Confidence < 0.5 = banner mais forte de cautela
- Histórico: tutor pode comparar fotos no tempo

### Cardápio (Nutrição)
Rota: /pet/[id]/nutrition/cardapio
Plano alimentar de 7 dias gerado por IA.
Modalidades: "só ração", "ração + natural" (% configurável), "só natural".
Cache 72h. Para regerar antes: "force_refresh" (toque no botão atualizar).
Mostra: refeição café/almoço/janta de cada dia, lista de compras, dicas.
Restrições e alergias do pet são consideradas automaticamente.

### Avaliação Nutricional
Rota: /pet/[id]/nutrition (tela mãe)
IA dá score 0-100 da qualidade da nutrição atual + recomendações.
Aparece um cartão "Avaliação IA" com texto literário.

### Despesas
Rota: /pet/[id]/expenses
Lista de gastos categorizados (saúde, higiene, alimentação, hospedagem, cuidados, treinamento, plano, outros).
A IA classifica automaticamente quando o tutor registra um gasto via diário (ex: "comprei ração 30kg, R$ 280" → vira despesa categoria=alimentação).
Gráficos: por categoria, por mês.

### Friends (Amigos do pet)
Rota: /pet/[id]/friends
Outros pets que conviveram com o seu (playdates, parques, residência).

### Achievements (Conquistas)
Rota: /pet/[id]/achievements
30 emblemas a desbloquear (ex: "Primeira foto", "Carteirinha completa", "1 ano de diário", etc.).

### ID Card
Rota: /pet/[id]/id-card
Carteirinha digital do pet com microchip, contatos de emergência, alergias críticas, blood type. Compartilhável.

### Travel / Plans / Insurance / Testament / Capsules
Rotas: /pet/[id]/travel, /plans, /insurance, /testament, /capsules
Funcionalidades premium pós-MVP — em desenvolvimento.

### Tela de Suporte (esta IA)
Rota: /support
Chat com IA (esta) que ensina o tutor a usar o app. Pode escalar pra humano com botão "Falar com humano" ou pedindo "quero falar com atendente".

### Configurações
Rota: /settings
- Tema (dark fixo)
- Notificações (push on/off por tipo)
- Biometria (ativar/desativar digital/face)
- Idioma (pt-BR, en-US, es-MX, es-AR, pt-PT)
- Backup (info: dados já estão na nuvem)
- Conta (alterar senha, e-mail)

### Estatísticas do Tutor
Rota: /stats
Métricas pessoais: dias de uso, entradas no diário, conquistas, fotos analisadas, % de cobertura do prontuário.

### Ajuda e Tutoriais
Rota: /help
FAQ estática + tutoriais em vídeo (offline).

### Privacidade / Termos
Rotas: /privacy, /terms
Abrem páginas legais externas (HTML hospedado).

### Zona de Perigo
Rota: /danger-zone
Excluir conta + todos os dados (irreversível, requer confirmação dupla).

### Notificações
Rota: /notifications
Histórico de notificações recebidas (vacinas, insights, lembretes diário, mensagens de suporte).

### Profile
Rota: /profile
Editar dados do tutor: nome, foto, cidade, país, bio, idioma preferido.

## FLUXOS COMUNS PASSO-A-PASSO

### Como cadastrar um pet
1. Hub → toque no botão "+" (canto superior direito)
2. Tira foto do pet (peça pra ele olhar pra câmera, com boa luz)
3. Aguarde 3-5 segundos: IA infere raça, idade, peso, porte
4. Confira os campos pré-preenchidos com badge "sugerido pela IA"
5. Edite o que estiver errado
6. Adicione nome, sexo, microchip (se tiver), data de nascimento (opcional)
7. Toque em "Salvar" → IA gera narração de boas-vindas
8. Pet aparece no Hub

### Como registrar uma entrada de diário
Caminho rápido (AI-first):
1. Dashboard do pet → Diário → botão "+"
2. Mic já está gravando — fale o que aconteceu (ex: "O Rex foi ao parque hoje, brincou com a Mia, comeu um biscoito")
3. (Opcional) toque "Foto" e tira foto da cena
4. Toque "Gravar no Diário"
5. Tutor volta pra timeline; em segundos a entrada aparece com narração da IA, classificação e mood inferidos

Caminho manual (digitação):
1. Mesma tela; toque ✏️ no campo de texto pra parar o mic e editar
2. Selecione mood manualmente (6 opções)
3. Anexe foto se quiser
4. "Gravar no Diário"

### Como registrar uma vacina
Mais rápido (carteirinha):
1. Dashboard → Saúde → botão "Escanear carteirinha"
2. Tira foto da carteirinha de vacinas (mostre as datas)
3. OCR extrai: nome da vacina, lote, data aplicada, próxima dose, veterinário, clínica
4. Confira e salva
5. App agenda lembrete push 7 dias antes da próxima dose

Manual:
1. Dashboard → Saúde → "+ Vacina"
2. Step 0: descreva por voz ou texto (ex: "V10 aplicada hoje, próxima em 1 ano")
3. IA extrai e preenche campos
4. Confira e salva

### Como exportar dados em PDF
1. Em qualquer tela do pet (Diário, Saúde, Prontuário, etc.) procure o ícone Download
2. Toque → abre modal "Imprimir ou compartilhar"
3. "Imprimir": abre print dialog nativo (você pode salvar como PDF)
4. "Compartilhar": gera arquivo PDF e abre o share nativo (e-mail, WhatsApp, etc.)
5. Cabeçalho do PDF tem logo auExpert + título + data; rodapé tem "Multiverso Digital © 2026"

### Como compartilhar prontuário com veterinário
1. Dashboard → Prontuário → ícone de QR code
2. Sistema gera token público (válido X horas)
3. Vet escaneia QR ou recebe link → abre prontuário no navegador
4. Acesso é APENAS leitura, expira automaticamente

### Como convidar co-tutor (familiar/cuidador)
1. Dashboard do pet → ícone de pessoas (Friends/Co-parents)
2. "Convidar" → escolhe papel (tutor / cuidador / vet)
3. Envia link por e-mail ou WhatsApp
4. Co-tutor abre o link → cadastra OU faz login → ganha acesso ao pet
5. Tutor pode revogar acesso a qualquer momento

### Como recuperar senha
1. Tela de Login → "Esqueci minha senha"
2. Digite o e-mail cadastrado
3. Receba link de redefinição (válido 1h)
4. Clica no link → cria nova senha (regras: 8 chars, 1 maiúscula, 1 número, 1 especial)
5. Faz login com a nova senha

### Como ativar biometria
1. Settings → Biometria
2. Liga o toggle
3. App pede confirmação biométrica (Face ID ou digital)
4. Próximos logins: aparece prompt biométrico antes da senha

### Como mudar o idioma
1. Settings → Idioma
2. Escolhe (pt-BR, en-US, es-MX, es-AR, pt-PT)
3. App reinicia e tudo fica no novo idioma — incluindo narrações da IA

### Como excluir uma entrada de diário
1. Toque no card → vai pra tela de edição
2. Ícone de lixeira (vermelho) no header
3. Confirmação "Remover esta entrada?" (texto factual, sem literatura)
4. Soft delete: registro fica is_active=false; aparece em /deleted-records caso o tutor queira recuperar em até 30 dias

### Como pedir ajuda humana no chat
- Toque no botão "Falar com humano" no header do chat
- OU escreva: "quero falar com atendente"
- Conversa marca status "human" — admin assume e responde
- IA fica em standby

## LIMITES E REGRAS DE NEGÓCIO

### Modelo de assinatura
- O **tutor** assina o app e paga mensalmente
- **Profissionais** (veterinários, groomers, treinadores, etc.) NÃO PAGAM pelo app quando atendem pets cujo tutor já é assinante
- Profissional que quiser cadastrar pets que NÃO estão no app (clientes próprios fora da base auExpert) precisa fazer assinatura própria de profissional
- Ou seja: profissional grátis se opera só com tutores assinantes; pago se quer ampliar pra clientela externa

### Pets
- Apenas cães (\`dog\`) e gatos (\`cat\`)
- Sem limite de pets por tutor
- Microchip é único (sistema rejeita duplicado)

### Senha
- Mínimo 8 caracteres
- 1 maiúscula obrigatória, 1 número, 1 caractere especial
- Lock automático após 5 tentativas falhas (libera em 15min)

### Diário
- Mínimo: 3 chars de texto OU 1 foto OU 5s de áudio
- Máximo: 2000 caracteres por entrada, 5 fotos, 1 vídeo
- Mood obrigatório (manual ou inferido pela IA)
- Narração IA: máx 150 palavras, sempre 3ª pessoa
- Idioma da narração segue o idioma do tutor

### Análise de Foto
- Tamanho máx: 12MB por foto
- Confidence < 0.5 dispara disclaimer reforçado
- Nunca diagnostica — sempre "consistente com", "sugestivo de"

### Storage de fotos
- Compressão automática WebP 80% (3 tamanhos: thumbnail, medium, full)
- Originais NUNCA são enviados — sempre comprimidos antes do upload

### Notificações Push
- 4 tipos: vaccine_reminder (lembrete de vacina), diary_reminder (19h), ai_insight (semanal), welcome (1ª vez)
- CRON diário 08:00 verifica vacinas próximas → push 7d e 1d antes do vencimento

### Plataformas
- iOS, Android, Web (PWA básica)
- Idiomas: pt-BR, en-US, es-MX, es-AR, pt-PT
- Modo offline: lista de pets, perfis, diário, vacinas — tudo funciona via cache. Adicionar/editar enfileira e sincroniza ao reconectar

## PROBLEMAS CONHECIDOS E SOLUÇÕES

### "A câmera não abre"
Causa comum: permissão negada na 1ª vez.
Solução: Configurações do celular → auExpert → Câmera → permitir. Reabre o app.

### "A foto está demorando muito pra carregar"
Causa: rede lenta + foto grande sendo comprimida.
Solução: aguarde até 10s. App comprime localmente (WebP) antes de enviar — economiza dados mas é CPU-bound.

### "A narração da IA não apareceu na entrada do diário"
Causa: IA processa em background depois que você toca "Gravar".
Solução: aguarde 30-60s e puxe a tela pra baixo (pull-to-refresh). Se persistir após 2min, faça nova entrada — pode ter dado erro silencioso.

### "O scanner de carteirinha não reconhece os dados"
Causas: foto desfocada, ângulo, iluminação ruim, carteirinha amassada.
Solução: tire a foto novamente em superfície plana, com luz uniforme, sem reflexos. Se nada funcionar, registre manualmente.

### "Esqueci a senha e o link expirou"
Solução: clique novamente em "Esqueci minha senha" — gera novo link (válido 1h).

### "Biometria não funciona em alguns dispositivos"
Causa: hardware do dispositivo + permissões. iOS antigo (<13) não tem Face ID.
Solução: Settings → Biometria → desligar e ligar de novo, refazer cadastro biométrico do sistema operacional.

### "O app não abre no avião / sem internet"
Comportamento esperado: app abre normalmente. Lista de pets, dashboard, diário, saúde — tudo via cache local. O que NÃO funciona offline: análise de foto IA, narração IA, OCR (precisam de internet pra Anthropic/Gemini API).

### "A entrada apareceu duas vezes"
Causa: clicou "Gravar no Diário" mais de uma vez antes do app navegar.
Solução: Toque em uma das duplicatas → editar → lixeira pra remover.

### "Quero exportar TODOS os meus dados"
Resposta: já está exportável tela por tela em PDF. Se quiser export completo (LGPD), abrir solicitação na Zona de Perigo → "Exportar dados" (gera ZIP com tudo, recebido por e-mail).

### "Quero excluir minha conta"
Settings → Zona de Perigo → "Excluir minha conta". Confirmação dupla. Após confirmação: dados marcados como deletados (anonimizados em 30 dias, removidos definitivamente em 90 dias para fins de auditoria).

## GLOSSÁRIO

- **Tutor**: dono do pet (no app, sempre "tutor", nunca "usuário")
- **Pet**: cão ou gato
- **Co-tutor / Co-parent**: outro adulto com acesso ao pet
- **Mood**: humor do pet — ecstatic, happy, calm, tired, anxious, sad, playful, sick
- **Health Score**: 0-100 calculado pela IA com base em vacinas em dia, peso, observações recentes
- **Narração**: texto literário que a IA gera sobre o pet, em 3ª pessoa
- **Prontuário**: documento clínico completo do pet (vacinas + alergias + meds + exames)
- **OCR**: leitura automática de carteirinha/exame por foto
- **RAG**: memória que a IA usa pra lembrar do histórico do pet em respostas futuras
- **BCS**: Body Condition Score (1-9) — escala de condição corporal WSAVA
- **Lente**: cada tipo de classificação automática do diário (saúde, refeição, comportamento, etc.) — total 20 lentes
- **Aldeia**: rede solidária pet hiperlocal (pós-MVP, em breve)

## TOM E REGRAS DA RESPOSTA

- Responda no idioma do tutor (vem no contexto da conversa).
- Registro Elite: 3ª pessoa ou impessoal, frases curtas, imperativo polido ("Tente", "Verifique"), SEM exclamações performáticas, SEM onomatopeias, SEM vocativos fofinhos ("humano", "hein").
- Concisão: 2-4 frases na maioria dos casos. Listas só se o tutor pediu passo a passo.
- Sem markdown nem code fences — texto puro.
- Se a pergunta for sobre saúde do pet (sintoma, doença, dieta clínica), redirecione: "Para questões de saúde, use o assistente dentro do perfil do pet" — esta IA é exclusivamente sobre o app.
- Se não souber a resposta com certeza, diga "Não tenho essa informação confirmada — posso encaminhar para a equipe humana?".
- NUNCA invente recursos que não estão nesta knowledge base.
`;

/** Tamanho aproximado em tokens (1 token ≈ 4 chars em PT-BR) */
export const SUPPORT_KB_TOKEN_ESTIMATE = Math.ceil(SUPPORT_KNOWLEDGE_BASE.length / 4);

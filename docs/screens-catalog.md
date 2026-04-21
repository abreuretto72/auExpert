# auExpert — Catálogo de Telas

> Documento gerado em 2026-04-20. Lista todas as telas do app com rota, propósito e descrição funcional.

---

## Sumário por grupo

1. [Autenticação](#autenticação)
2. [Hub Principal](#hub-principal)
3. [Dashboard do Pet](#dashboard-do-pet)
4. [Diário](#diário)
5. [Saúde](#saúde)
6. [Nutrição](#nutrição)
7. [Prontuário](#prontuário)
8. [Agenda](#agenda)
9. [Conquistas](#conquistas)
10. [Amigos](#amigos)
11. [Gastos](#gastos)
12. [Felicidade](#felicidade)
13. [Cápsulas do Tempo](#cápsulas-do-tempo)
14. [Seguro e Planos](#seguro-e-planos)
15. [Viagens](#viagens)
16. [Testamento Digital](#testamento-digital)
17. [Co-tutores](#co-tutores)
18. [Carteirinha do Pet](#carteirinha-do-pet)
19. [Análise de Foto IA](#análise-de-foto-ia)
20. [Perfil do Tutor](#perfil-do-tutor)
21. [Configurações](#configurações)
22. [Notificações](#notificações)
23. [Parcerias](#parcerias)
24. [Ajuda](#ajuda)
25. [Privacidade e Termos](#privacidade-e-termos)
26. [Exportações PDF](#exportações-pdf)

---

## Autenticação

### `app/(auth)/login.tsx`
**Rota:** `/login`
**Propósito:** Entrada no app.
**Descrição:** Tela inicial com logo auExpert, campos de e-mail e senha, botões de login biométrico (impressão digital e reconhecimento facial), link para cadastro e recuperação de senha. Inclui STT em todos os campos de texto (exceto senha).

---

### `app/(auth)/register.tsx`
**Rota:** `/register`
**Propósito:** Criar nova conta de tutor.
**Descrição:** Formulário com nome completo (mín 2 palavras), e-mail, senha e confirmação. Valida força da senha (8+ chars, maiúscula, número, especial). Exibe os critérios de senha em tempo real. Após cadastro, envia e-mail de confirmação.

---

### `app/(auth)/forgot-password.tsx`
**Rota:** `/forgot-password`
**Propósito:** Solicitar redefinição de senha.
**Descrição:** Campo de e-mail com STT. Envia link de redefinição para o e-mail cadastrado. Exibe confirmação de envio sem revelar se o e-mail existe (segurança).

---

### `app/(auth)/reset-password.tsx`
**Rota:** `/reset-password`
**Propósito:** Definir nova senha após clicar no link do e-mail.
**Descrição:** Dois campos de senha (nova + confirmação) com toggle de visibilidade. Valida os mesmos critérios do cadastro. Redireciona para login após sucesso.

---

## Hub Principal

### `app/(app)/index.tsx`
**Rota:** `/` (após login)
**Propósito:** Central de navegação — lista todos os pets do tutor.
**Descrição:** Tela principal do app. Exibe o card do tutor (nome, foto, estatísticas), card da Rede Solidária (Aldeia — pós-MVP), lista de PetCards (foto/ícone, nome, espécie, mood atual, health score, alertas de vacina). FAB laranja [+] para adicionar pet. Drawer de menu lateral, sino de notificações, pull-to-refresh. Usa skeleton durante carregamento.

---

## Dashboard do Pet

### `app/(app)/pet/[id]/index.tsx`
**Rota:** `/pet/[id]`
**Propósito:** Visão geral do pet com 4 abas: Diário, Lentes, Agenda, IA.
**Descrição:** Tela central do pet. Header fixo com foto/ícone, nome, espécie, mood, health score, alergias e personalidade. Aba **Diário** exibe a timeline completa. Aba **Lentes** exibe os 20 módulos de análise (lentes de IA). Aba **Agenda** exibe eventos futuros. Aba **IA** exibe o assistente conversacional do pet. Navegação inferior fixa (PetBottomNav). Toque no avatar abre picker de foto de perfil.

---

### `app/(app)/pet/[id]/edit.tsx`
**Rota:** `/pet/[id]/edit`
**Propósito:** Editar dados cadastrais do pet.
**Descrição:** Formulário completo com nome, espécie, raça, data de nascimento, sexo, peso, cor, microchip, personalidade, alergias e observações. Campos com STT. Permite trocar a foto de perfil. Salva com soft delete — nunca exclui dados antigos.

---

## Diário

### `app/(app)/pet/[id]/diary.tsx`
**Rota:** `/pet/[id]/diary`
**Propósito:** Timeline das entradas do diário do pet.
**Descrição:** Orquestrador fino que renderiza `DiaryTimeline`. Exibe entradas do diário ordenadas cronologicamente com narração IA (fonte Caveat), mood, lentes classificadas e fotos. Suporta filtros por categoria e busca. FAB [+] para nova entrada. Pull-to-refresh. Botão de exportar PDF. Offline-first com fila de sync.

---

### `app/(app)/pet/[id]/diary/new.tsx`
**Rota:** `/pet/[id]/diary/new`
**Propósito:** Criar nova entrada no diário (tela unificada AI-first).
**Descrição:** Tela única que substitui o grid de botões. Mic inicia automaticamente ao abrir (STT). Waveform animado laranja durante gravação. Campo de transcrição editável quando pausado. Botões de anexo: Foto, Vídeo, Som do pet, Arquivo/Documento. Hint roxo sobre narração IA automática. Botão "Gravar no Diário" navega imediatamente e processa IA em background (fire-and-forget). Desabilitado sem conteúdo.

---

### `app/(app)/pet/[id]/diary/voice.tsx`
**Rota:** `/pet/[id]/diary/voice`
**Propósito:** Entrada de diário simplificada — apenas voz.
**Descrição:** Tela focada exclusivamente em gravação de voz. Mic inicia automaticamente. Toggle pausar/retomar. Ao pausar, transcrição fica editável. Botão "Confirmar" faz submit e navega de volta imediatamente. IA processa em background.

---

### `app/(app)/pet/[id]/diary/[entryId]/edit.tsx`
**Rota:** `/pet/[id]/diary/[entryId]/edit`
**Propósito:** Editar entrada existente do diário.
**Descrição:** Carrega a entrada pelo ID. Permite editar texto, alterar mood, adicionar/remover fotos. Botão de lixeira no header para excluir a entrada completa (soft delete, pede confirm). Botão para zerar narração IA (regenera na próxima abertura).

---

## Saúde

### `app/(app)/pet/[id]/health.tsx`
**Rota:** `/pet/[id]/health`
**Propósito:** Central de saúde do pet com 8 abas.
**Descrição:** Tela com abas: **Geral** (resumo, tipo sanguíneo, alergias), **Vacinas** (calendário, status, adicionar via OCR), **Exames** (lista com resultados), **Medicações** (ativas e históricas), **Consultas** (histórico com veterinário, diagnóstico, hora), **Cirurgias** (procedimentos realizados), **Métricas** (peso, altura, histórico), **Gastos** (despesas de saúde). Cada aba tem modal de adição com input-first UX (STT + câmera). Exporta PDF. Modal de informação sobre tipos sanguíneos.

---

## Nutrição

### `app/(app)/pet/[id]/nutrition.tsx`
**Rota:** `/pet/[id]/nutrition`
**Propósito:** Hub de nutrição — visão geral + navegação para subtelas.
**Descrição:** Mostra modalidade alimentar atual (ração, natural, misto, BARF), ração em uso, peso atual, fase de vida, alertas nutricionais e avaliação resumida da IA. Botões de ação rápida para cada subtela do módulo. Exporta PDF de nutrição.

---

### `app/(app)/pet/[id]/nutrition/racao.tsx`
**Rota:** `/pet/[id]/nutrition/racao`
**Propósito:** Detalhes da ração atual + calculadora de porção.
**Descrição:** Exibe produto, marca, fase (filhote/adulto/sênior), porção recomendada pelo fabricante e porção ajustada pela IA com base no peso e nível de atividade. Calculadora interativa de porção. Alertas de restrições. Botão para trocar ração.

---

### `app/(app)/pet/[id]/nutrition/trocar.tsx`
**Rota:** `/pet/[id]/nutrition/trocar`
**Propósito:** Registrar troca de ração com IA (AI-first).
**Descrição:** Fluxo AI-first: tutor fala (STT) ou fotografa a embalagem (câmera). IA extrai automaticamente produto, marca, fase e porção via OCR + classify. Card de confirmação mostra os dados extraídos para revisão. Tutor confirma e dados são salvos. Compressão de imagem antes do envio (1568px, JPEG 75%).

---

### `app/(app)/pet/[id]/nutrition/historico.tsx`
**Rota:** `/pet/[id]/nutrition/historico`
**Propósito:** Histórico de todas as rações que o pet já usou.
**Descrição:** Lista cronológica de rações com produto, marca, período de uso e motivo da troca. Permite visualizar a evolução alimentar do pet ao longo do tempo.

---

### `app/(app)/pet/[id]/nutrition/restricoes.tsx`
**Rota:** `/pet/[id]/nutrition/restricoes`
**Propósito:** Gerenciar restrições alimentares e intolerâncias.
**Descrição:** Lista de restrições cadastradas (ingredientes proibidos, alergias alimentares). Adicionar nova restrição com STT ou digitação. Seção com lista de alimentos tóxicos para pets da ASPCA (base embutida). Exporta PDF. Soft delete ao remover.

---

### `app/(app)/pet/[id]/nutrition/cardapio.tsx`
**Rota:** `/pet/[id]/nutrition/cardapio`
**Propósito:** Cardápio semanal gerado por IA.
**Descrição:** Exibe menu de 7 dias gerado pelo Claude (modelo Haiku 4.5 para velocidade). Navegação entre semanas (← →). Cada dia mostra refeições com porção, ingredientes e ícones nutricionais. Botão de regenerar cardápio. Link para detalhes de cada receita. Botão de histórico de cardápios. Exporta PDF.

---

### `app/(app)/pet/[id]/nutrition/cardapio-history.tsx`
**Rota:** `/pet/[id]/nutrition/cardapio-history`
**Propósito:** Histórico de cardápios gerados pela IA.
**Descrição:** Lista de cardápios anteriores por semana com data de geração. Permite abrir qualquer cardápio passado para consulta.

---

### `app/(app)/pet/[id]/nutrition/cardapio-detail.tsx`
**Rota:** `/pet/[id]/nutrition/cardapio-detail`
**Propósito:** Detalhe de um cardápio histórico específico.
**Descrição:** Exibe o cardápio completo de uma semana selecionada no histórico, com a mesma interface do cardápio atual.

---

### `app/(app)/pet/[id]/nutrition/receita.tsx`
**Rota:** `/pet/[id]/nutrition/receita`
**Propósito:** Detalhe completo de uma receita do cardápio.
**Descrição:** Exibe ingredientes com quantidades, modo de preparo passo a passo, tempo de preparo, dicas de armazenamento (geladeira/freezer), validade e alertas da IA. Badge de aprovação IA. Aviso de restrições se houver ingrediente controlado.

---

### `app/(app)/pet/[id]/nutrition/modalidade.tsx`
**Rota:** `/pet/[id]/nutrition/modalidade`
**Propósito:** Escolher ou alterar a modalidade alimentar do pet.
**Descrição:** Seleção entre 4 modalidades: Só Ração, Ração + Natural, Só Natural (BARF) e Dieta Caseira. Cada opção com ícone, descrição e prós/contras. Ao confirmar, atualiza a modalidade e redireciona para a subtela correspondente.

---

### `app/(app)/pet/[id]/nutrition/so-racao.tsx`
**Rota:** `/pet/[id]/nutrition/so-racao`
**Propósito:** Guia de rotina para modalidade "Só Ração".
**Descrição:** Orientações personalizadas pela IA para pets em dieta exclusivamente de ração: horários ideais, quantidade por refeição, importância da hidratação, dicas de enriquecimento ambiental na hora da refeição.

---

### `app/(app)/pet/[id]/nutrition/racao-natural.tsx`
**Rota:** `/pet/[id]/nutrition/racao-natural`
**Propósito:** Configurar proporção entre ração e alimentação natural.
**Descrição:** Slider interativo para definir o percentual de ração vs natural (ex: 60% ração / 40% natural). IA recalcula cardápio com base na proporção escolhida. Alertas de equilíbrio nutricional.

---

### `app/(app)/pet/[id]/nutrition/so-natural.tsx`
**Rota:** `/pet/[id]/nutrition/so-natural`
**Propósito:** Aviso e orientações para dieta 100% natural / BARF.
**Descrição:** Tela educativa com alertas importantes sobre dieta exclusivamente natural. Lista de cuidados obrigatórios, suplementação necessária, riscos e recomendação de acompanhamento veterinário. Checklist de itens essenciais.

---

## Prontuário

### `app/(app)/pet/[id]/prontuario.tsx`
**Rota:** `/pet/[id]/prontuario`
**Propósito:** Prontuário médico completo gerado e mantido pela IA.
**Descrição:** Documento médico estruturado com: identidade do pet, resumo de saúde gerado pela IA, alertas ativos, vacinas em dia e atrasadas, medicações ativas, alergias, condições crônicas, última consulta. Ações: exportar PDF, gerar QR Code de emergência, regenerar resumo IA. Exibe data da última atualização.

---

### `app/(app)/pet/[id]/prontuario-qr.tsx`
**Rota:** `/pet/[id]/prontuario-qr`
**Propósito:** QR Code de emergência para acesso rápido ao prontuário.
**Descrição:** Gera QR Code linkando para URL pública de emergência `auexpert.app/emergency/{token}`. Qualquer veterinário, abrigo ou resgatador pode escanear e acessar os dados médicos essenciais do pet sem precisar de login. Opção de compartilhar/imprimir o QR Code.

---

## Agenda

### `app/(app)/pet/[id]/agenda.tsx`
**Rota:** `/pet/[id]/agenda`
**Propósito:** Agenda de eventos e lembretes do pet.
**Descrição:** Calendário visual com marcadores de eventos por dia. Lista de próximos eventos: vacinas, consultas, medicações, restrições de dieta, aniversários. Filtros por tipo. Integra com `AgendaLensContent`. Exporta PDF. Pull-to-refresh.

---

## Conquistas

### `app/(app)/pet/[id]/achievements.tsx`
**Rota:** `/pet/[id]/achievements`
**Propósito:** Conquistas e gamificação do cuidado com o pet.
**Descrição:** Galeria de emblemas desbloqueados e bloqueados. Cada conquista tem nome, descrição, critério de desbloqueio e data de conquista. Progresso em direção às próximas conquistas. XP acumulado e nível atual. Usa `AchievementsLensContent`. Exporta PDF.

---

## Amigos

### `app/(app)/pet/[id]/friends.tsx`
**Rota:** `/pet/[id]/friends`
**Propósito:** Rede social do pet — pets amigos e interações.
**Descrição:** Lista de pets amigos com foto, nome e tipo de relação (melhor amigo, amigo, conhecido). Histórico de encontros. Estatísticas de socialização. Usa `FriendsLensContent`. Exporta PDF. (Feature pós-MVP completo na Aldeia.)

---

## Gastos

### `app/(app)/pet/[id]/expenses.tsx`
**Rota:** `/pet/[id]/expenses`
**Propósito:** Controle financeiro dos gastos com o pet.
**Descrição:** Dashboard de despesas com gráfico por categoria (saúde, alimentação, higiene, hospedagem, etc.). Histórico de lançamentos. Classificação automática por IA — nunca usa "outros" quando há contexto. Totais mensais e anuais. Usa `ExpensesLens`. Exporta PDF.

---

## Felicidade

### `app/(app)/pet/[id]/happiness.tsx`
**Rota:** `/pet/[id]/happiness`
**Propósito:** Histórico emocional e curva de felicidade do pet.
**Descrição:** Gráfico de humor ao longo do tempo com base nos mood_logs do diário. Heatmap de humor por dia/semana. Eventos correlacionados com picos e quedas de humor. Análise IA das tendências emocionais. Usa `HappinessLensContent`. Exporta PDF.

---

## Cápsulas do Tempo

### `app/(app)/pet/[id]/capsules.tsx`
**Rota:** `/pet/[id]/capsules`
**Propósito:** Cápsulas do tempo — mensagens e memórias para o futuro.
**Descrição:** Lista de cápsulas criadas com status (bloqueada/aberta), título, autor, data de abertura e progresso. Filtro por status. Cada cápsula pode ter condição de abertura (data específica, evento, etc.). Preview desbloqueado ao cumprir condição. Botão [+] para criar nova cápsula.

---

## Seguro e Planos

### `app/(app)/pet/[id]/insurance.tsx`
**Rota:** `/pet/[id]/insurance`
**Propósito:** Gerenciar planos de saúde e seguros do pet.
**Descrição:** Lista de planos ativos (saúde, funeral, bem-estar) com nome da operadora, valor mensal, data de renovação e cobertura. Botão de contato direto com a operadora. Score de adequação calculado pela IA com base no perfil do pet. Usa `PlansLensContent` internamente.

---

### `app/(app)/pet/[id]/plans.tsx`
**Rota:** `/pet/[id]/plans`
**Propósito:** Tela dedicada a planos e seguros (lente expandida).
**Descrição:** Visão expandida dos planos ativos e sugestões de planos adequados ao perfil do pet. Mesmos dados de `insurance.tsx` mas com layout de lente completa. Exporta PDF.

---

## Viagens

### `app/(app)/pet/[id]/travel.tsx`
**Rota:** `/pet/[id]/travel`
**Propósito:** Registro e planejamento de viagens com o pet.
**Descrição:** Histórico de viagens realizadas e planejamento de futuras. Cada viagem tem destino, datas, modo de transporte, locais pet-friendly visitados e registros fotográficos. IA sugere dicas por destino. Usa `TravelsLensContent`. Exporta PDF.

---

## Testamento Digital

### `app/(app)/pet/[id]/testament.tsx`
**Rota:** `/pet/[id]/testament`
**Propósito:** Testamento emocional do pet — instruções de cuidado e sucessão.
**Descrição:** Documento digital com instruções do tutor sobre cuidados especiais, preferências do pet, contatos de emergência, designação de guardião em caso de impossibilidade do tutor, e mensagens emocionais. Protegido por biometria para edição. Pode ser compartilhado de forma segura.

---

## Co-tutores

### `app/(app)/pet/[id]/coparents.tsx`
**Rota:** `/pet/[id]/coparents`
**Propósito:** Gerenciar co-tutores e permissões de acesso ao pet.
**Descrição:** Hierarquia de 5 níveis: ROOT (fundador), CO-OWNER, CO-PARENT, CAREGIVER, VIEWER. Cada nível com permissões específicas. Botão de convidar por link ou e-mail. Aceitar/recusar convites pendentes. Remover co-tutores (só ROOT pode remover CO-OWNER). Cada membro exibe foto, nome, role e data de entrada.

---

## Carteirinha do Pet

### `app/(app)/pet/[id]/id-card.tsx`
**Rota:** `/pet/[id]/id-card`
**Propósito:** Carteirinha digital oficial do pet com QR Code.
**Descrição:** Documento visual tipo cartão de identidade com foto do pet, nome, espécie, raça, data de nascimento, microchip, nome do tutor e QR Code de acesso rápido. Ações: compartilhar, imprimir, exportar PDF, escanear (lê microchip via NFC/câmera). Visual premium com design de cartão.

---

## Análise de Foto IA

### `app/(app)/pet/[id]/photo-analysis.tsx`
**Rota:** `/pet/[id]/photo-analysis`
**Propósito:** Análise visual do pet por IA com foco em saúde e bem-estar.
**Descrição:** Tutor tira foto ou importa da galeria. Claude Vision analisa: raça estimada, humor pela expressão/postura, saúde visual (pelagem, olhos, orelhas, postura), peso estimado, ambiente. Exibe resultado em cards com ícone, valor e % de confiança. Confidence < 0.5 exibe disclaimer obrigatório. Nunca faz diagnóstico — apenas observações visuais. Compara com histórico via RAG. Histórico de análises anteriores com scroll. Exporta PDF.

---

## Perfil do Tutor

### `app/(app)/profile.tsx`
**Rota:** `/profile`
**Propósito:** Visualizar e editar o perfil do tutor.
**Descrição:** Foto de perfil (câmera ou galeria), nome completo, e-mail, telefone, localização (detectada por GPS ou manual), data de nascimento, bio. Estatísticas resumidas: total de pets, entradas de diário, análises IA. Links para pets cadastrados. Exporta PDF do perfil. Toggle para compartilhar perfil publicamente.

---

## Configurações

### `app/(app)/settings.tsx`
**Rota:** `/settings`
**Propósito:** Configurações do app e da conta.
**Descrição:** Seções: **Notificações** (toggle por tipo — vacinas, diário, insights), **Biometria** (ativar/desativar digital e face ID), **IA** (configurações de privacidade e dados de treinamento), **Conta** (alterar senha, excluir conta), **Legal** (termos e privacidade). Botão de logout com confirm. Zona de perigo com confirmação em cascata para exclusão de conta.

---

## Notificações

### `app/(app)/notifications.tsx`
**Rota:** `/notifications`
**Propósito:** Central de notificações recebidas.
**Descrição:** Lista de notificações por tipo: lembretes de vacina (7d/1d antes), lembrete de diário (19h), insights IA, boas-vindas. Cada notificação com ícone colorido por tipo, título, corpo, data e status (lida/não lida). Ação de marcar todas como lidas. Pull-to-refresh.

---

## Parcerias

### `app/(app)/partnerships.tsx`
**Rota:** `/partnerships`
**Propósito:** Programa de parcerias e benefícios para tutores.
**Descrição:** Lista de parceiros verificados (pet shops, clínicas, groomers, pet hotels) com descontos exclusivos para usuários auExpert. Filtro por tipo e localização. Card de cada parceiro com logo, tipo, desconto disponível e botão de contato. Integração com Proof of Love (maiores cuidadores têm mais benefícios).

---

## Ajuda

### `app/(app)/help.tsx`
**Rota:** `/help`
**Propósito:** Central de ajuda e documentação do app.
**Descrição:** FAQ por categoria, guias de uso das funcionalidades principais, contato com suporte. Listagem das 20 lentes de IA com ícones Lucide e descrições (conforme funcionalidade Painel tab pendente). Versão do app e links legais.

---

## Privacidade e Termos

### `app/(app)/privacy.tsx`
**Rota:** `/privacy`
**Propósito:** Política de privacidade LGPD/GDPR.
**Descrição:** Documento completo de política de privacidade em ScrollView. Explica quais dados são coletados, como são usados, direitos do usuário (acesso, correção, exclusão), uso de IA e dados de treinamento (com consentimento explícito), e contato do DPO.

---

### `app/(app)/terms.tsx`
**Rota:** `/terms`
**Propósito:** Termos de uso do app.
**Descrição:** Termos e condições completos: elegibilidade, uso aceitável, limitações de responsabilidade da IA, propriedade intelectual, rescisão de conta e lei aplicável.

---

## Exportações PDF

> Todas as telas `*-pdf.tsx` são telas intermediárias que montam o HTML do relatório e abrem o print preview nativo via `expo-print`. Usam o template padrão com logo auExpert, cabeçalho, rodapé "Multiverso Digital © 2026" e data de geração.

| Arquivo | Conteúdo do PDF |
|---------|----------------|
| `pet/[id]/diary-pdf.tsx` | Entradas do diário com narração, mood, tags e fotos |
| `pet/[id]/health-pdf.tsx` | Prontuário completo: vacinas, exames, medicações, consultas, cirurgias |
| `pet/[id]/nutrition-pdf.tsx` | Cardápio, ração atual, restrições e avaliação nutricional |
| `pet/[id]/prontuario-pdf.tsx` | Prontuário médico formatado para veterinário |
| `pet/[id]/id-card-pdf.tsx` | Carteirinha do pet em formato imprimível |
| `pet/[id]/photo-analysis-pdf.tsx` | Resultado da análise de foto IA |
| `pet/[id]/agenda-pdf.tsx` | Calendário de eventos e lembretes futuros |
| `pet/[id]/happiness-pdf.tsx` | Histórico emocional e curva de humor |
| `pet/[id]/achievements-pdf.tsx` | Conquistas desbloqueadas e progresso |
| `pet/[id]/expenses-pdf.tsx` | Relatório de gastos por categoria |
| `pet/[id]/friends-pdf.tsx` | Lista de pets amigos e histórico de interações |
| `pet/[id]/travel-pdf.tsx` | Histórico de viagens e registros |
| `pet/[id]/plans-pdf.tsx` | Planos e seguros ativos |
| `pet/[id]/ia-pdf.tsx` | Histórico de análises e insights de IA |
| `pet/[id]/painel-pdf.tsx` | Relatório consolidado de todas as lentes |
| `pet/[id]/nutrition/cardapio-pdf.tsx` | Cardápio semanal formatado |
| `pet/[id]/prontuario-qr.tsx` | (não é PDF — gera QR Code de emergência) |
| `(app)/profile-pdf.tsx` | Perfil do tutor exportado |
| `pet/[id]/deleted-records.tsx` | Registros excluídos (soft delete — recuperação) |

---

## Registros Excluídos

### `app/(app)/pet/[id]/deleted-records.tsx`
**Rota:** `/pet/[id]/deleted-records`
**Propósito:** Visualizar e recuperar registros com soft delete.
**Descrição:** Lista todos os registros marcados como `is_active = false` do pet (entradas de diário, vacinas, exames, etc.). Permite restaurar ou confirmar exclusão permanente (apenas ROOT e CO-OWNER). Implementa o princípio de que delete físico é proibido no auExpert.

---

## Resumo estatístico

| Grupo | Qtd de telas |
|-------|-------------|
| Autenticação | 4 |
| Hub / Perfil / Configurações | 5 |
| Dashboard do Pet | 2 |
| Diário | 4 |
| Saúde | 1 (com 8 abas internas) |
| Nutrição | 12 |
| Prontuário | 2 |
| Agenda | 1 |
| Conquistas | 1 |
| Amigos | 1 |
| Gastos | 1 |
| Felicidade | 1 |
| Cápsulas do Tempo | 1 |
| Seguro e Planos | 2 |
| Viagens | 1 |
| Testamento | 1 |
| Co-tutores | 1 |
| Carteirinha | 1 |
| Análise de Foto IA | 1 |
| Notificações | 1 |
| Parcerias | 1 |
| Ajuda / Privacidade / Termos | 3 |
| PDFs e Registros Excluídos | 20 |
| **TOTAL** | **68** |

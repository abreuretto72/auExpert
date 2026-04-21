# auExpert — Plano: Profissionais com Acesso Autorizado

*Como veterinários, dentistas, creches, clínicas, pet shops e demais cuidadores entram no mesmo app do tutor, contribuem para o prontuário vivo do pet sem digitar formulário e mantêm a confiança clínica intacta.*

---

## Escopo do MVP — profissionais internacionais desde o dia um

**Decisão fechada: o módulo profissional do auExpert nasce internacional, sem validação obrigatória de credenciais.** O app não bloqueia ninguém por país, não verifica CRMV com API externa antes de liberar cadastro, não trava a Fase 1 atrás de Country Adapter. Qualquer veterinário, dentista de pet, clínica, creche, hotel, pet shop ou profissional autônomo — brasileiro, argentino, português, mexicano, americano, inglês — se cadastra, declara seu conselho local (CRMV UF, CRO UF, RCVS, AVMA, MRCVS, OMV, Colegio MV, etc.) e seu identificador fiscal local (CNPJ, VAT, EIN, CUIT, NIPC) e começa a atender. Nada impede.

O modelo é o mesmo do Airbnb para anfitriões, do Fiverr para freelancers, do Upwork para profissionais, do LinkedIn para títulos acadêmicos: **a plataforma não verifica credenciais por padrão; a responsabilidade de checar é do contratante**. No caso do auExpert, o contratante é o tutor — ele convida o vet que ele já conhece, confia na indicação da amiga, viu na vizinhança. Todo registro clínico carrega assinatura visível do autor: "Dr. Silva — CRMV-SP 12345 (declarado, não verificado pelo auExpert)". O tutor sabe exatamente o que sabe e o que não sabe.

Isso desbloqueia três coisas que a validação obrigatória bloqueava. Primeiro, **o app escala internacional desde o MVP** — não precisamos de ConsultaCRM para Brasil, RCVS API para UK, AVMA API para EUA, Colegio API para México. Não precisamos de Country Adapter. Não precisamos escolher país prioritário. Segundo, **a Fase 1 fica muito mais simples** — uma Edge Function a menos (`validate-professional` deixa de existir), uma dependência externa a menos, um rate-limit a menos, um ponto de falha a menos. Terceiro, **o profissional entra em segundos** — ele não espera resposta de API, não manda carteirinha para análise manual, não fica "em análise" por 24h. Cadastrou, declarou, atende.

A interface do Modo Profissional passa a ser **multilíngue como o resto do app** — pt-BR, en-US, es-MX, es-AR, pt-PT no MVP, com espaço para crescer. O vet em Lisboa usa em português europeu, o vet em Buenos Aires usa em espanhol argentino, o vet em Miami usa em inglês. Receitas saem no idioma do estabelecimento que o profissional declarou como base.

**Disclaimer visível no app e nos documentos:** *"o auExpert não valida licenças profissionais nem verifica autenticidade de registros em conselhos. Os dados profissionais exibidos (CRMV, CNPJ, nome, especialidade) foram declarados pelo próprio profissional. Cabe ao tutor confirmar as qualificações de qualquer profissional que convidar a acessar o prontuário do seu pet."* Esse texto aparece: no card do profissional dentro do app, no rodapé de toda receita gerada, na tela de convite antes do tutor confirmar, nos Termos de Uso, na exportação PDF do prontuário.

A confiança no app se constrói por três caminhos orgânicos que não dependem de API externa: **(1) indicação do tutor** — 90% dos convites vêm do tutor que já escolheu o profissional na vida real e está apenas conectando ao app; **(2) reputação agregada** — avaliações pós-atendimento, tempo de plataforma, número de pacientes ativos, resposta média, taxa de reincidência do tutor, tudo visível no perfil público do profissional; **(3) Selo Verificado opcional** — explicado na seção seguinte, feature que profissionais podem solicitar por demanda quando quiserem um diferencial competitivo no marketplace.

---

## Princípios inegociáveis (tudo se ajusta a estes)

O plano inteiro parte de cinco decisões que não se negociam. Primeira: é **um só app**. Tutor, co-tutor, cuidador, visitante e todo profissional (vet, dentista, groomer, creche, hotel, pet shop, treinador, passeador, ONG) baixam a mesma auExpert da mesma loja — não vamos fragmentar a plataforma em um app "tutor" e outro app "vet". Segunda: o **tutor é o proprietário absoluto** dos dados do pet. Nenhum profissional vê nada sem convite explícito, nenhum acesso é permanente por padrão, nenhum dado sai do pet sem autorização. Terceira: **imutabilidade por autor** vale para todos, inclusive profissionais — o vet não altera o que o tutor escreveu, a creche não altera o que o vet prescreveu, o pet shop não altera o peso registrado na última consulta. Quem discorda insere uma nova entrada com a sua versão, assinada, e a timeline mostra as duas. Quarta: **AI-first estendido** — o profissional registra com câmera, microfone, scanner e anexo, nunca com formulário. Quem digita é quem já não tem cliente. Quinta: **rastreabilidade total** — todo registro carrega autor, papel, CRMV/CRO/CNPJ quando cabível, timestamp, e qualquer análise de IA carrega as três referências mínimas que sustentam a inferência.

---

## Arquitetura em três camadas

A plataforma passa a operar em camadas sobrepostas. Na base está o **prontuário vivo do pet** — a mesma estrutura que já existe hoje (pets, diary_entries, vaccines, allergies, chronic conditions, exams, medications, etc.). No meio está o **sistema de papéis e autorizações** — quem é quem, quem pode ver e escrever o quê sobre qual pet, por quanto tempo. No topo estão as **interfaces específicas de cada papel** — o tutor vê seu hub de pets; o vet vê seus pacientes do dia; o pet shop vê sua agenda de banhos e o funil de compra; a creche vê quem está em estadia. São visões diferentes sobre o mesmo banco, com a mesma IA individual por pet.

A IA isolada por pet é o fio que costura tudo. Quando o vet abre o prontuário da Mana, é a IA da Mana que está ali — a mesma que o tutor vê, com a mesma memória vetorial, as mesmas referências. Quando o pet shop manda "chegou a ração nova", é a IA da Mana que verifica alergia a frango antes do disparo. O pet é o centro — os papéis são ângulos de acesso.

---

## Taxonomia de papéis profissionais

Além dos quatro papéis humanos do círculo pessoal (tutor, co-tutor, cuidador, visitante), introduzimos seis papéis profissionais, todos cadastrados por **declaração** (o profissional informa seus dados; o app registra e exibe como declarado, sem verificar):

**Veterinário clínico geral** — declara conselho local (CRMV no Brasil, RCVS no Reino Unido, AVMA/state license nos EUA, Colegio MV na Argentina, OMV em Portugal, etc.), UF/estado/província e número. Perfil mostra especialidade, clínica vinculada, tempo na plataforma, avaliações. **Veterinário especialista** (cardiologista, dermatologista, oftalmologista, oncologista, ortopedista, neurologista, odontologista) — mesmo fluxo, com especialidade declarada e, opcionalmente, upload de título/residência para compor o Selo Verificado. **Clínica ou hospital veterinário** — declara identificador fiscal local (CNPJ no Brasil, EIN nos EUA, VAT na UE, CUIT na Argentina, NIPC em Portugal) e conselho do responsável técnico; pode vincular múltiplos vets ao seu quadro. **Creche ou hotel para pets** — declara identificador fiscal; informa capacidade, serviços oferecidos, vacinas exigidas, política de emergência. **Pet shop ou agropecuária** — declara identificador fiscal; cadastra catálogo (rações, medicamentos, acessórios), agenda (banho, tosa, estética) e tabela de preços. **Profissional autônomo** (dog walker, adestrador, cat sitter, groomer independente, fisioterapeuta animal, nutricionista animal) — declara identificador pessoal local (CPF no Brasil, SSN nos EUA, NIE na Espanha, etc.) e opcionalmente documento de formação.

Cada papel tem ícone próprio, cor de acento dentro da paleta do app (sem inventar fora do design system), e todos os dados profissionais ficam visíveis ao tutor com rótulo explícito "(declarado)". O **Selo Verificado** — explicado na próxima seção — é uma camada adicional, opcional, que o profissional pode solicitar quando quiser um diferencial; não é pré-requisito para atender pelo app.

---

## Onboarding do profissional — como ele entra no app

O cadastro do profissional começa igual ao do tutor (email, senha, biometria) e imediatamente divide o fluxo em duas perguntas: "você tem pet próprio?" e "você cuida de pets profissionalmente?". Respondendo sim à segunda, o app pede: país de atuação (seleção com 20+ opções no MVP, expansível), tipo de atuação (vet, dentista, creche, pet shop, etc.), conselho profissional local e número (se aplicável — ex.: CRMV-SP 12345; RCVS 456789; AVMA/state license + número), identificador fiscal do estabelecimento (CNPJ/EIN/VAT/CUIT/NIPC, conforme país), endereço do estabelecimento, horário de atendimento, serviços oferecidos, tabela de preços opcional. Nenhuma dessas telas é um formulário clássico — toda entrada tem microfone ativo, câmera disponível e scanner de documento. O profissional pode fotografar a carteira do conselho e o OCR pré-preenche os campos; o app **guarda a foto como comprovante opcional**, mas não consulta API externa para verificar — apenas registra o que foi declarado.

Não há validação bloqueante. Assim que o profissional confirma os dados declarados, **a conta está ativa** — ele pode receber convites de tutor, aceitar pacientes, emitir receitas, registrar atendimentos. Todo registro que ele cria no prontuário do pet carrega a assinatura visível "Nome Completo — [Conselho] [Número] (declarado)". O tutor sabe, o regulador sabe, o próprio profissional sabe — zero ambiguidade sobre o que o app verificou e o que não verificou.

Um detalhe importante: o app **valida consistência formal** do dado declarado (dígito verificador do CNPJ brasileiro, formato ISO do VAT europeu, checksum do CPF, formato do CRMV), mas **não consulta autoridade externa**. Isso evita fraude grosseira (CNPJ inventado, número fora do padrão) sem depender de integração. Se um dia o profissional solicitar o Selo Verificado, aí sim há consulta externa — mas é opt-in.

Ativada a conta, o profissional entra no **Modo Profissional**. Ao abrir, ele vê uma agenda e uma caixa de entrada: à esquerda, os pacientes/clientes do dia; no topo, os convites recebidos ainda não aceitos; no centro, ações rápidas (nova consulta, novo atendimento, novo agendamento). Se o mesmo profissional é também tutor de pet próprio, um toggle no topo alterna entre Modo Tutor e Modo Profissional. A paleta, a tipografia, a responsividade e o design system são exatamente os do app — o que muda é o que aparece em cada tela.

---

## Selo Verificado — feature opcional e posterior

O Selo Verificado é um badge visual extra que o profissional pode solicitar **quando quiser** (não é pré-requisito para atender). Ele sinaliza ao tutor que o auExpert confirmou, por canal próprio, a autenticidade dos dados declarados. Funciona como o selo azul do Instagram, o "Top Rated" do Upwork ou o "Superhost" do Airbnb: não é obrigatório, mas vale a pena para quem quer se destacar no marketplace.

A lógica de obtenção varia por país. Para o Brasil, onde temos APIs públicas e confiáveis disponíveis, o processo é automático. Para os demais países, começamos com revisão manual da equipe — o profissional faz upload de carteirinha do conselho e do documento fiscal, nossa equipe confere visualmente e concede o selo — e, conforme cada mercado amadurece, integramos com APIs locais quando existirem e forem estáveis.

### Fluxo do Selo — único Edge Function, mesma UI

A solicitação do selo dispara a Edge Function **`grant-verified-badge`** (com `verify_jwt: true` — apenas o próprio profissional autenticado dispara a verificação sobre seus próprios dados). A função recebe o país declarado, o tipo de conselho e o identificador fiscal, e roteia para o adapter correspondente: Brasil vai para o fluxo automático (ConsultaCRM + BrasilAPI); outros países vão para a fila de revisão manual, enquanto não tivermos adapter local.

Status possíveis no perfil: **"sem selo"** (default), **"selo solicitado — em análise"** (documentação enviada, aguardando), **"selo verificado"** (aprovado — badge visível), **"solicitação rejeitada"** (com motivo explicitado ao profissional). Nenhum desses status bloqueia atendimento — somente afetam a visibilidade do badge no perfil público.

### Adapter Brasil — ConsultaCRM + BrasilAPI (automático)

Para profissionais declarando país Brasil, a `grant-verified-badge` dispara em paralelo:

**ConsultaCRM.com.br** para validar CRMV — o serviço expõe um endpoint REST que aceita UF, tipo de conselho e número do registro, retornando JSON com nome completo, situação (ativo, suspenso, cassado, cancelado, em processo) e UF. O plano gratuito cobre testes iniciais; na produção assinamos plano pago. O token de autenticação fica em variável de ambiente da Edge Function (`CONSULTACRM_TOKEN`) — nunca no cliente, nunca no repositório.

**BrasilAPI** para validar CNPJ (clínica, hospital, creche, hotel, pet shop) — pública, gratuita e sem token. Endpoint canônico: `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (14 dígitos, sem pontuação). Retorna JSON completo com razão social, nome fantasia, endereço, CNAE fiscal, situação cadastral, data de abertura.

Regras de decisão automática no adapter Brasil:

- CRMV com `situacao === 'ativo'` e nome que bate com o declarado → **aprova selo**
- CRMV suspenso/cassado/inativo → **rejeita selo**, conta continua ativa (apenas sem badge), mensagem para o profissional: "não conseguimos confirmar seu registro ativo no conselho; revise os dados ou envie documentação complementar"
- Divergência de nome (pode ser mudança por casamento, erro de digitação) → **fila de revisão manual**
- CNPJ com `situacao_cadastral === 'ATIVA'` e CNAE compatível (lista abaixo) → **aprova selo do estabelecimento**
- CNPJ baixado/suspenso/inapto → **rejeita selo**
- CNPJ ativo mas CNAE incompatível → **revisão manual** (pode ser filial)
- API indisponível / timeout → **fila de revisão manual**, retry em background

CNAEs considerados compatíveis com atividade pet no Brasil (lista preliminar, ajustamos conforme uso):

- 7500100 — Atividades veterinárias
- 4789099 — Comércio varejista de outros produtos (pet shop genérico)
- 4771704 — Comércio varejista de medicamentos veterinários
- 9609208 — Higiene e embelezamento de animais domésticos
- 0159803 — Serviços de inseminação artificial em animais
- 8690904 — Atividades de apoio à gestão de saúde

Mapeamento canônico do BrasilAPI para o schema do auExpert (a confirmar no primeiro request real):

| Campo do banco auExpert | Campo BrasilAPI esperado |
|---|---|
| `cnpj` | `cnpj` |
| `legal_name` | `razao_social` |
| `trade_name` | `nome_fantasia` |
| `cnae` | `cnae_fiscal` + `cnae_fiscal_descricao` |
| `status` | `situacao_cadastral` / `descricao_situacao_cadastral` |
| `founded_at` | `data_inicio_atividade` |
| `address.street` | `logradouro` |
| `address.number` | `numero` |
| `address.district` | `bairro` |
| `address.city` | `municipio` |
| `address.state` | `uf` |
| `address.zip` | `cep` |

Cache local em `professional_verification_cache` por 30 dias para reduzir chamadas à ConsultaCRM (registro ativo hoje dificilmente muda amanhã). O payload bruto fica sempre em `verification_log.raw_response` — serve como prova e facilita ajuste quando shape da API mudar.

### Adapters futuros — outros países (manual primeiro, API quando fizer sentido)

Para qualquer país que não seja Brasil, o Selo Verificado começa **100% manual**: o profissional sobe foto da carteira do conselho, foto do documento fiscal, e a equipe auExpert revisa em até 5 dias úteis. Não é elegante, mas é honesto — e resolve enquanto o volume é baixo.

Conforme volume cresce em um mercado específico, avaliamos adapter automático:

- **Reino Unido** — RCVS oferece busca pública em `findavet.rcvs.org.uk` (scrape ou API se abrirem); identificador fiscal via Companies House API (gratuita)
- **EUA** — State licensing boards são estaduais e heterogêneos; pragmatic fallback = manual; EIN via IRS não tem API pública de lookup
- **Argentina** — Colegio Médico Veterinario por província (sem API nacional unificada); CUIT via AFIP (consulta pública)
- **Portugal** — OMV oferece busca pública em `omv.pt`; NIPC via portal das finanças
- **México** — SENASICA e cédulas estaduais (sem API unificada); RFC via SAT

Cada adapter novo é uma Edge Function plugada via pattern: `grant-verified-badge` detecta o país e chama o adapter correspondente; se não houver adapter automático, cai em fila manual. Nenhum deles bloqueia o app — são tooling para o badge opcional.

### O que o Selo realmente significa (para o tutor entender)

No perfil do profissional, abaixo do badge, texto explicativo claro: *"O Selo Verificado indica que o auExpert confirmou, em [data], a existência e atividade do registro declarado junto a [autoridade]. O selo não atesta competência, histórico disciplinar, ou cobertura de seguro profissional — apenas a validade formal do registro no momento da verificação. Cabe ao tutor avaliar a adequação do profissional ao caso."* Esse texto aparece traduzido no idioma do tutor.

---

## Autorização — como o tutor concede acesso

O tutor autoriza de três maneiras. A primeira é por **convite direto**: abre o perfil do pet, toca em "Convidar profissional", escolhe o tipo (vet, dentista, creche, etc.), busca pelo nome ou CRMV ou CNPJ na base auExpert, define o escopo (apenas leitura, leitura e escrita, leitura/escrita/prescrição para vet) e a validade (uma consulta, 30 dias, 6 meses, indefinido). O profissional recebe push e aceita. A segunda é por **QR code instantâneo**: o tutor está na recepção da clínica ou da creche, abre o app, gera um QR de acesso (válido por 1 hora por padrão); o profissional aponta o leitor (dentro do próprio app dele) e o acesso é criado com escopo adequado ao papel dele. A terceira é por **link de compartilhamento temporário**: útil para emergências — o tutor gera um link, manda por WhatsApp para o vet de plantão que ainda não está no app, e o link vira conta-passaporte válida por 24 horas.

Revogar é igualmente simples. O tutor vê a lista de acessos ativos no perfil do pet (com foto, nome, papel, data de concessão, próxima renovação) e toca no X ao lado. A partir daquele instante o profissional não escreve mais nada novo no prontuário daquele pet. O que ele já escreveu permanece (imutabilidade por autor), assinado, auditável.

Quatro regras fechadas de autorização:

1. O **acesso é por pet**, não por tutor. Se a família tem três gatos e o tutor leva só um ao vet, o vet vê só daquele gato.
2. O **escopo é granular**. O pet shop não vê o laudo do oncologista. O groomer não vê a medicação controlada. O cardiologista não vê a foto do passeio no parque. Cada papel tem permissões padrão, e o tutor pode apertar para menos (nunca para mais do que o padrão do papel).
3. O **acesso é expirável**. Sem validade definida, assume 30 dias. Ao vencer, o profissional perde escrita e mantém leitura degradada por mais 30 dias (para continuidade clínica caso o tutor volte), depois perde tudo.
4. A **emergência sobrepõe**. Em SOS (pós-MVP, via Aldeia), o prontuário de emergência é exposto automaticamente sem convite — mas só o cartão essencial: alergias críticas, medicações ativas, tipo sanguíneo, condição crônica grave, contatos. O resto continua protegido.

---

## Matriz de permissões por papel

| Papel | Ler prontuário | Escrever diário | Registrar vacina | Prescrever medicação | Registrar cirurgia | Diagnosticar (ICD) | Agendar serviço | Vender produto |
|---|---|---|---|---|---|---|---|---|
| Tutor | Total | Sim (imutável por outros) | Sim | Não | Não | Não | Como cliente | Como cliente |
| Co-tutor | Total | Sim (imutável por outros) | Sim | Não | Não | Não | Como cliente | Como cliente |
| Cuidador | Parcial (não-clínico) | Sim | Não | Administra, não prescreve | Não | Não | Não | Não |
| Visitante | Parcial (configurável) | Não | Não | Não | Não | Não | Não | Não |
| Vet clínico geral | Total | Sim | Sim, assinada | Sim, assinada | Sim, assinada | Sim | Sim (retorno) | Não |
| Vet especialista | Total | Sim | Sim, assinada | Sim, assinada | Sim, assinada | Sim, na especialidade | Sim (retorno) | Não |
| Clínica/hospital | Total (via vets vinculados) | Sim | Sim | Sim | Sim | Sim | Sim | Não |
| Creche/hotel | Parcial (vacinas + alergias + medicações ativas + gatilhos comportamentais) | Sim (estadia) | Não | Administra medicação prescrita | Não | Não | Sim (hospedagem) | Não |
| Pet shop | Parcial (peso, raça, alergias alimentares, próximos vencimentos, preferências) | Não | Não | Não | Não | Não | Sim (banho/tosa) | Sim (catálogo) |
| Profissional autônomo | Conforme especialidade | Sim (sessão) | Não | Não | Não | Não | Sim | Não |

Essa matriz vira código: tabela `role_permissions` no Supabase, consultada por toda RLS policy. Alterar permissão = UPDATE no banco, zero deploy.

---

## Registro sem formulário — AI-first estendido para profissionais

Esta é a parte que muda o jogo para o vet e a clínica. Hoje, registrar uma consulta num sistema veterinário é digitar — anamnese, exame físico, diagnóstico, prescrição, retorno. O auExpert elimina isso.

O vet abre o prontuário da Mana. Toca no botão grande "Nova consulta". O microfone liga e ele fala enquanto examina: *"paciente em bom estado geral, mucosas rosadas, tempo de enchimento capilar menor que dois segundos, temperatura 38.7, frequência cardíaca 120 rítmica sem sopros, frequência respiratória 24 eupneica, BCS 5 de 9, palpação abdominal indolor, linfonodos normotrofos, tutor relata vômito de espuma branca três vezes em 24 horas sem outros sintomas, suspeito gastrite alimentar, prescrevo omeprazol 1 mg por kg uma vez ao dia por sete dias em jejum, dieta branda por cinco dias, retorno em sete dias se persistir"*. Três coisas acontecem em paralelo:

A primeira é o **STT + classificador** — o texto vai sendo transcrito, e o classificador separa automaticamente em blocos estruturados: sinais vitais (temp, FC, FR, TRC, mucosas, BCS), anamnese (o que o tutor relatou), exame físico (linfonodos, palpação), hipótese diagnóstica (gastrite alimentar → ICD-10-Vet sugerido), prescrição (medicamento, dose/kg, frequência, duração, condição de administração), retorno. Tudo vira lente no diário, registro no prontuário, entrada de medicação ativa.

A segunda é o **cruzamento com a IA individual da Mana** — o app já sabe que a Mana tem 2,1 kg (calcula a dose exata: 2 mg omeprazol), já sabe as medicações ativas atuais (avisa se houver interação), já sabe alergias conhecidas (valida a prescrição), já sabe o histórico de gastrite (se a IA encontrar padrão recorrente, sugere exames complementares).

A terceira é a **geração de documentos** — enquanto o vet ainda está guardando o estetoscópio, o app já gerou: receita em PDF assinada com CRMV (timbrada com a identidade da clínica se vinculada), atestado se pedido, pedido de exame se for o caso, instruções para o tutor em linguagem simples, lembrete programado de próxima dose, push para o tutor com resumo da consulta em linguagem acolhedora (voz do pet, no idioma dele).

O vet não digitou uma linha. Apenas falou enquanto examinava — que era o que ele faria de qualquer jeito, em voz alta, para o estagiário. O app ouviu, estruturou, cruzou, prescreveu. O tempo da consulta volta para o pet.

O mesmo vale para os outros papéis. A creche usa a câmera e o microfone: fotografa o pet chegando ("Mana entrou às 7:45 animada, comeu 100% da ração no almoço, dormiu das 13 às 15"), o app monta o registro. O dentista fotografa a cavidade oral, a IA de visão estima presença de tártaro, índice de doença periodontal, lesões; o dentista confirma ou corrige por voz. O pet shop usa o scanner: lê o código de barras da ração que a cliente está comprando, bate com o perfil da Mana, atualiza "última ração comprada" no prontuário, cria lembrete para quando o saco estiver acabando. O groomer fotografa antes e depois do banho, o app cria a lente "Grooming" com as duas fotos lado a lado.

A regra geral: se a mão do profissional está ocupada no pet, a voz resolve. Se a mão está livre, a câmera resolve. Se é documento externo (receita de outro profissional, exame de laboratório, nota fiscal), o scanner resolve. Em último caso, digitar — mas com IA preenchendo o que ela já infere.

---

## Camada comercial — pet shop, agendamentos, compras

Para o pet shop funcionar de verdade, precisamos de uma camada comercial leve, sem virar e-commerce. Três construções.

A primeira é a **agenda de serviços**. O pet shop cadastra seus serviços (banho, tosa higiênica, tosa na tesoura, banho medicinal, hidratação, corte de unha, limpeza de ouvido, SPA completo, day care, etc.) com duração, preço, porte compatível e observações. O tutor abre o perfil do pet, toca em "Agendar banho", o app mostra os pet shops parceiros próximos com horários disponíveis, ele escolhe, confirma. O pet shop recebe o agendamento com ficha do pet pré-carregada (raça, porte, temperamento, alergias a shampoo, últimos banhos, fotos anteriores). No dia, o tutor só entrega o pet — nada de preencher ficha na recepção.

A segunda é o **catálogo inteligente**. Cada pet shop cadastra seus produtos (SKU, marca, categoria, tamanho/peso, preço, estoque). A IA da Mana cruza o catálogo com o perfil dela: ração Royal Canin Chihuahua 1,5 kg (sem frango por causa da alergia) fica destacada; a coleira tamanho P é filtrada automaticamente; o antipulgas certo para 2,1 kg aparece primeiro. Quando o tutor aceita uma recomendação, o app avisa o pet shop, que pode separar o produto ou confirmar entrega.

A terceira é a **compra conectada ao prontuário**. Toda compra vira uma entrada no diário (lente "Gasto" classificada em alimentação/higiene/brinquedos/saúde/acessórios) com foto do produto, valor, quantidade. O controle de estoque do pet acontece sozinho — a IA sabe quando a ração está acabando porque sabe há quantos dias foi comprada e o consumo diário estimado do pet. No dia em que vai faltar, push para o tutor: "a Mana tem ração para mais 5 dias, quer que o pet shop separe?".

Pagamento fica **fora do app** no MVP do módulo comercial. O app conecta tutor e pet shop, registra serviço e compra, atualiza prontuário — o pagamento segue o canal que o pet shop já usa (PIX, cartão presencial, boleto). Num momento posterior, integração com gateway brasileiro (Mercado Pago, Stripe, Asaas) vira opcional, nunca obrigatório, e dá comissão transparente ao auExpert.

Para vet e clínica existe uma variação da mesma camada: agenda de consulta, agenda de exame, agenda de cirurgia. A clínica cadastra seus vets, horários, tipos de atendimento, convênios aceitos. Tutor agenda, prontuário pré-carrega, vet atende, receita vira lente no diário — fluxo igual ao do pet shop, apenas com outro tipo de serviço.

---

## Schema no Supabase — tabelas novas

O banco cresce em dez tabelas principais, todas com `id UUID`, `created_at TIMESTAMPTZ`, `is_active BOOLEAN` para soft delete, `created_by UUID REFERENCES public.users`, RLS ativa:

**professionals** — perfil profissional (user_id, type, crmv, cro, cpf_or_cnpj, full_name_or_company, specialty, verified_at, verified_by, establishment_address, services_offered JSONB, price_table JSONB, accepted_insurances JSONB, selo_verified BOOLEAN, rating NUMERIC, total_reviews INT). Um user pode ter zero ou uma linha aqui. Se tem, é profissional.

**establishments** — quando o profissional é clínica/hospital/creche/hotel/pet shop (CNPJ, razão social, CNAE, horário, capacidade, tax_id, responsible_vet_id, logo_url, banner_url, description, coordinates GEOGRAPHY). Relaciona-se com `professionals` via owner_user_id.

**professional_establishment_members** — vincula vets a clínicas, groomers a pet shops, cuidadores a creches (professional_id, establishment_id, role_in_establishment, joined_at, left_at).

**access_grants** — o coração do sistema (id, pet_id, grantee_user_id, grantee_role, granted_by_user_id, scope JSONB, started_at, expires_at, revoked_at, revoked_reason, invite_method ENUM('direct','qr','link','emergency')). RLS: o tutor vê os seus; o profissional vê os que ele recebeu; ninguém mais vê.

**role_permissions** — a matriz viva (role, can_read_clinical BOOL, can_write_diary BOOL, can_prescribe BOOL, can_register_vaccine BOOL, can_diagnose BOOL, can_schedule_service BOOL, can_sell_product BOOL, etc.). Atualizar permissão = UPDATE linha, zero deploy.

**professional_signatures** — assinatura digital por registro (record_type, record_id, signed_by_user_id, crmv_or_cro, signed_at, signature_hash). Todo registro clínico criado por profissional tem uma linha aqui — vira a prova de autoria imutável.

**services_catalog** — catálogo de serviços do estabelecimento (establishment_id, service_type ENUM, name, description, duration_minutes, price, compatible_sizes JSONB, requirements JSONB).

**products_catalog** — catálogo de produtos do pet shop (establishment_id, sku, barcode, brand, category, name, size_or_weight, price, stock_quantity, species_compatible, allergens JSONB, description).

**appointments** — agendamentos (pet_id, establishment_id, service_id, scheduled_for, duration, status ENUM('pending','confirmed','in_progress','done','no_show','cancelled'), created_by_user_id, notes, checkin_at, checkout_at, report JSONB).

**orders** — pedidos/compras (pet_id, establishment_id, items JSONB, total, status ENUM, payment_status ENUM, payment_method, delivery_method, created_by_user_id).

E três complementares:

**professional_reviews** — avaliações pós-atendimento (professional_id, by_user_id, pet_id, stars 1-5, comment, dimensions JSONB — comunicação, pontualidade, cuidado, valor).

**clinical_records** — sombra de imutabilidade: todo registro clínico (vacina, prescrição, diagnóstico, cirurgia) tem espelho imutável aqui com hash SHA-256 do conteúdo no momento da criação. Permite provar em auditoria que nada foi alterado depois.

**access_audit_log** — log imutável de toda ação de profissional sobre pet (who, when, pet_id, action, record_type, record_id, ip, device).

Migrations seguem o padrão do projeto, com `NOTIFY pgrst, 'reload schema'` no final.

---

## RLS — fronteiras de segurança

A política padrão em toda tabela clínica passa a ser: "pode ler/escrever se (sou o tutor do pet) OU (sou co-tutor/cuidador ativo do pet) OU (tenho access_grant ativo no pet com a permissão adequada para esta tabela/operação)". Função SQL `public.has_pet_access(pet_uuid, required_permission)` centraliza a decisão — toda policy chama essa função, ninguém repete lógica. Assim, acrescentar um novo papel amanhã é atualizar a função, não reescrever 40 policies.

Duas verificações extras para profissionais: (1) a escrita só passa se o grant não expirou e não foi revogado; (2) o UPDATE/DELETE em registro alheio é bloqueado no banco — `USING (created_by = auth.uid())` na policy de UPDATE, garantindo que o vet não edita o que o tutor escreveu, nem vice-versa, mesmo por erro de frontend.

Emergência tem policy própria: `has_emergency_proxy_access(pet_uuid)` libera leitura do cartão de emergência (alergias críticas, medicações ativas, tipo sanguíneo, contatos) para qualquer profissional autenticado com SOS ativo, por tempo limitado. O restante do prontuário permanece fechado.

---

## Auditoria e imutabilidade — a coluna vertebral

Tudo que um profissional escreve sobre um pet vira três coisas em paralelo: o registro funcional (na tabela certa — `vaccines`, `prescriptions`, `diagnoses`), a assinatura digital (`professional_signatures`), e a entrada no log de auditoria (`access_audit_log`). O hash SHA-256 do conteúdo + timestamp + CRMV vira prova jurídica do que foi dito e quando.

Se o vet tenta alterar a prescrição que ele mesmo fez há duas horas, permitimos (o autor pode corrigir dentro de uma janela de, por exemplo, 24 horas) — e a correção gera novo registro com nota "editado pelo autor em DD/MM às HH:MM", mantendo o registro original visível. Depois de 24 horas, nem o próprio autor edita — tem que criar novo registro referenciando o anterior ("corrige prescrição de 19/04").

Para o tutor, tudo isso aparece simples: a timeline mostra os registros com quem escreveu, em que papel, quando. Toque longo em um registro abre "histórico de edições" e "assinatura profissional" com CRMV clicável (abre perfil do profissional no app). Para órgãos de fiscalização (CRMV de cada estado), o auExpert oferece uma exportação oficial de prontuário com hash verificável.

---

## Compliance — LGPD sem drama

Três pilares. Primeiro, **consentimento granular** — o tutor autoriza acesso por pet, por papel, por escopo, por prazo. Não existe autorização em branco. Segundo, **portabilidade e exclusão** — o tutor exporta todos os dados do pet (PDF vet-grade + JSON bruto) a qualquer momento; pede exclusão e o sistema ativa o soft-delete, com retenção legal de prontuário clínico por cinco anos (exigência CFMV para vet), depois anonimização ou purge definitiva. Terceiro, **anonimização no dataset agregado** — o dataset de IA proprietária (já previsto na arquitetura) usa hash one-way com salt; nenhum dado identificável sai do par tutor-pet sem consentimento explícito.

O profissional tem também seus próprios direitos: prontuário que ele criou fica imutável por cinco anos mesmo após revogação do acesso (proteção legal do ato profissional), acessível sob solicitação formal via CRMV.

---

## Identidade visual e UX do modo profissional

Mesma paleta, mesma tipografia, mesma filosofia AI-first — mas telas específicas. O **Dashboard profissional** abre com três blocos: agenda de hoje (pacientes/clientes com horário, nome do pet, foto, motivo da visita), caixa de entrada (convites novos, mensagens do tutor, revisões pendentes), métricas (atendimentos do mês, avaliação média, receita estimada — visível só para o profissional, nunca para o tutor). A **Ficha rápida do paciente** abre com identidade, vacinas pendentes destacadas, medicações ativas, alergias, BCS, últimos sinais vitais, e um botão grande "Nova consulta" (vet) ou "Novo atendimento" (outros papéis). A **Tela de registro** é a mesma tela unificada AI-first do tutor — microfone ligado, câmera disponível, scanner acessível, campo de texto opcional. Só muda a classificação automática (consulta em vez de diário).

Acentos de cor para navegação profissional seguem a matriz: vet e clínica usam `petrol` (azul petróleo, sobriedade clínica); creche e hotel usam `accent` (laranja, energia do cuidado diário); pet shop usa `accent` com toques de `gold` (mercadoria, marketing); dentista usa `purple` (especialidade). Tudo dentro do design system — nada de cores novas.

O toggle Modo Tutor / Modo Profissional fica no header, com a foto do usuário. Dois toques e o mesmo app troca de papel. Quem é só profissional, só vê Modo Profissional. Quem é só tutor, só vê o hub atual. Quem é as duas coisas (caso comum — o vet que também tem três gatos em casa), alterna à vontade.

---

## Fases de construção — ordem sugerida

O módulo profissional é grande demais para virar uma feature única. Proponho sete fases, cada uma entregando valor sozinha.

**Fase 1 — Fundação de papéis.** Tabelas `professionals`, `access_grants`, `role_permissions`, `professional_signatures`, `access_audit_log`. Função `has_pet_access()`. Onboarding declarativo do profissional (cadastro internacional, país, conselho local, identificador fiscal local, sem validação externa). OCR opcional para pré-preencher a partir de foto da carteirinha. Consistência formal dos identificadores (dígitos verificadores, formato). Sem UI de atendimento ainda — só infra. **Selo Verificado fica como feature separada, posterior, opcional** — não entra no escopo da Fase 1.

**Fase 2 — Vet MVP.** Tela de paciente, tela de nova consulta AI-first (voz estrutura tudo), geração automática de receita em PDF, lente "Consulta" expandida, cruzamento com RAG individual do pet para sugestões seguras. A migração natural do prontuário atual para receber escrita do vet.

**Fase 3 — Convite e QR code.** Tutor convida profissional (busca por nome/CRMV/CNPJ na base auExpert), aceite no modo profissional, QR instantâneo na recepção. Expiração, revogação, renovação.

**Fase 4 — Clínica/hospital.** `establishments`, `professional_establishment_members`. Clínica cadastra seus vets, tem página pública no app, aparece em busca por proximidade. Receita sai com timbre da clínica.

**Fase 5 — Creche e hotel.** Ficha de estadia, check-in/check-out com foto, registro diário durante a hospedagem, relatório de saída para o tutor, integração com gatilhos comportamentais da IA.

**Fase 6 — Pet shop e agenda comercial.** `services_catalog`, `products_catalog`, `appointments`, `orders`. Agenda de banho/tosa, catálogo de produtos, recomendação por IA, compra conectada ao prontuário. Pagamento fora do app.

**Fase 7 — Dentista e especialistas.** Telas específicas da odontologia animal (odontograma digital, análise de visão por IA do estado dental, lesões identificadas). Mesma estrutura para cardiologista (ecocardio anexado), dermatologista (mapa de lesões na pele), etc.

Entre 2 e 3 cabe um piloto com um ou dois vets parceiros reais (Anita pode intermediar). Testar com pet de teste (Mana, Pico) antes de expor para consultório.

---

## Decisões abertas — precisamos alinhar antes de começar

Com o escopo fechado em **internacional desde o dia um via modelo declarativo** (sem validação obrigatória; Selo Verificado opcional e posterior; ConsultaCRM+BrasilAPI se tornam adapter Brasil de uma feature futura), sobram cinco pontos para decidir antes do código da Fase 1.

**1. Cobrança do profissional — free ou freemium desde o início?** Uma tese: modo profissional grátis até X pacientes/mês, depois plano mensal com timbre da clínica, receita ilimitada, agenda integrada, relatórios avançados. A outra: free puro até massa crítica, cobrança depois. Qual é sua preferência?

**2. Pagamento no app — entra quando?** Proposta é deixar fora do MVP (cada estabelecimento recebe pelo canal dele — PIX, cartão presencial, boleto). Aceita ou você quer pagamento integrado desde a Fase 6 (pet shop)? Se integrar, gateway natural no Brasil é Asaas, Mercado Pago ou PagSeguro.

**3. Pet shop é categoria própria ou entra pela Aldeia como "Partner"?** A Aldeia já tem Partner (vet, pet shop, groomer, walker, hotel, trainer, ONG) pós-MVP. Reusamos a mesma estrutura (`aldeia_partners`) ou separamos módulo profissional do módulo Aldeia em tabelas distintas?

**4. Assinatura digital — hash simples ou ICP-Brasil?** Hash (SHA-256 + CRMV + timestamp) cobre 95% dos casos clínicos e é grátis para o vet. ICP-Brasil (certificado A3 pago pelo vet) cobre validade jurídica plena para receitas controladas (medicamentos tarja preta, alguns antibióticos por UF). Começamos com hash e evoluímos sob demanda?

**5. Ordem real de construção.** A ordem de sete fases proposta entrega valor em paralelo para tutor e vet. Se a pressão comercial for pet shop primeiro, a ordem muda. Qual é sua prioridade real: **vet, creche ou pet shop** para entregar antes?

Responde cada ponto quando tiver cabeça e a gente refina o plano, ajusta escopo, e parte para o schema da Fase 1 — que é pré-requisito para tudo.

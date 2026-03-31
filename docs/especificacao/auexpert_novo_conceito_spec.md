# auExpert — Novo Conceito: Diário como Coração do App
# Especificação Completa v1.0
# Data: 30/03/2026

---

## 1. FILOSOFIA

### 1.1 Princípio Fundamental

> O tutor nunca precisa pensar onde colocar a informação.
> Ele fala, fotografa ou escreve. O resto é problema da IA.

O auExpert tem UMA interface de entrada: o Diário do pet. Tudo que o tutor quer registrar, comunicar ou organizar passa pelo Diário. A IA classifica, organiza e sugere — o tutor só confirma.

### 1.2 Regras Absolutas

1. **Zero navegação para inserir dados.** O tutor nunca precisa ir a um módulo específico para registrar algo. O Diário é a porta única.
2. **Zero formulários.** Nenhum campo obrigatório, nenhum formulário longo. A IA preenche tudo a partir de foto, voz ou texto livre.
3. **Zero categorização manual.** O tutor não escolhe "tipo: vacina" ou "categoria: gasto". A IA classifica sozinha.
4. **Módulos são lentes de consulta, não portas de entrada.** O tutor só acessa os módulos quando quer VER dados organizados, nunca para inserir.
5. **O app sugere, nunca obriga.** Quando a IA detecta um contexto (saúde, gasto, viagem), ela pergunta gentilmente. O tutor pode ignorar.
6. **Câmera é navegação.** A foto determina pra onde o app sugere ir. Foto de nota fiscal → sugere Gastos. Foto de vacina → sugere Prontuário.
7. **Narração é da IA, nunca do pet.** A IA narra em 3ª pessoa, descrevendo o que aconteceu com o pet. Nunca simula a voz do pet em 1ª pessoa.

### 1.3 Narração IA — Regra de Voz

A narração do diário é SEMPRE da IA como narradora inteligente. A IA descreve o que aconteceu com o pet em 3ª pessoa, de forma descritiva, clara e com os dados extraídos da entrada.

```
ERRADO (voz do pet — NÃO usar):
  "Hoje fui no vet. Levei uma picadinha mas fui corajoso.
   A doutora disse que estou saudável."

CERTO (voz da IA narradora — SEMPRE usar):
  "Hoje o Rex foi ao veterinário tomar vacina. Foi aplicada
   a V10 conforme foto da caixa da vacina anexada. A Dra.
   Carla Mendes informou que o pet está muito bem e pesa
   32 quilos."
```

Princípios da narração:

1. **Sempre 3ª pessoa.** "O Rex foi...", "A Luna comeu...", nunca "Fui...", "Comi..."
2. **Nome do pet.** Sempre usar o nome cadastrado, nunca "eu" ou "meu dono".
3. **Factual e descritiva.** Incluir dados extraídos (nome da vacina, peso, vet, valor).
4. **Referencia as fontes.** "Conforme foto anexada", "segundo o tutor", "de acordo com o laudo".
5. **Tom acolhedor mas profissional.** Não é seco como relatório médico, mas também não é infantil.
6. **Máximo 150 palavras.** Concisa, sem repetição.

Exemplos por contexto:

```
VACINA:
  "Hoje o Rex foi ao veterinário e recebeu a vacina V10 (Polivalente),
   laboratório Vanguard Plus, lote A2847N. A aplicação foi realizada
   pela Dra. Carla Mendes na Clínica VetBem. Próxima dose em 27/03/2027."

GASTO:
  "O tutor registrou uma despesa na Clínica VetBem no valor de R$ 280,00.
   Os itens incluem consulta veterinária (R$ 150,00) e vacina V10 (R$ 130,00)."

PASSEIO:
  "Hoje o Rex foi ao parque e brincou com um Golden Retriever.
   Segundo o tutor, correram bastante e voltaram sujos. O humor
   do Rex foi classificado como feliz pela análise da foto."

SINTOMA:
  "O tutor relatou que o Rex está com diarreia desde ontem.
   É o segundo registro desse sintoma em 48 horas.
   Recomenda-se observação e, se persistir, consulta veterinária."

SOM DO PET:
  "Foi gravado um áudio de 8 segundos do Rex. A análise identificou
   padrão de latido de ansiedade: frequência alta, intervalos curtos,
   tom agudo. Este é o 4º registro de ansiedade nas últimas 2 semanas."
```

### 1.4 Experiência do Tutor

```
ABRE O APP
    → Vê seus pets
    → Toca no Rex
    → Vê o Diário do Rex (timeline)
    → Toca "+" ou câmera
    → Fala, fotografa ou escreve
    → IA entende e organiza
    → Fim

Não precisa aprender menus.
Não precisa decorar fluxos.
Não precisa saber que existem módulos por baixo.
```

---

## 2. ESTRUTURA DO APP

### 2.1 Hierarquia de Telas

```
Hub (Meus Pets)
├── Card Aldeia (rede solidária)
├── Card Tutor (perfil + stats)
└── Cards dos Pets
    └── Pet Dashboard
        ├── DIÁRIO (protagonista central — ocupa 70% da tela)
        │   ├── Timeline cronológica
        │   ├── Botão "+" (FAB)
        │   │   ├── Câmera (prioridade visual)
        │   │   ├── Microfone
        │   │   └── Teclado
        │   └── Filtros discretos (Tudo, Momentos, Saúde, IA)
        │
        └── Lentes (cards pequenos abaixo do diário)
            ├── Prontuário → view organizada de saúde
            ├── Nutrição → view de alimentação
            ├── Gastos → view financeira
            ├── Amigos → grafo social do pet
            ├── Conquistas → badges e marcos
            └── Mais... → viagens, seguros, etc.
```

### 2.2 O Dashboard do Pet

O Dashboard não é uma grade de módulos. É o Diário ocupando a maior parte da tela, com lentes embaixo:

```
┌─────────────────────────────────┐
│ ← Voltar    Rex    ⚙️           │
│                                  │
│ [Avatar]  Labrador · 3 anos     │
│ Humor: Feliz · Saúde: 92       │
│                                  │
│ ┌───────────────────────────┐   │
│ │ DIÁRIO                     │   │
│ │ [Tudo] [Momentos] [Saúde]  │   │
│ │                            │   │
│ │ Hoje 16:45                 │   │
│ │ "Hoje o Rex correu no parque │   │
│ │  com o Thor. Segundo o tutor│   │
│ │  ficaram sujos mas felizes" │   │
│ │                            │   │
│ │ Hoje 10:00                 │   │
│ │ "O Rex foi ao veterinário   │   │
│ │  e tomou a V10..."         │   │
│ │         [+ Câmera/Voz]     │   │
│ └───────────────────────────┘   │
│                                  │
│ Lentes do Rex:                  │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │Pront.│ │Nutri.│ │Gastos│    │
│ │  3🔴 │ │  ✓   │ │R$910│    │
│ └──────┘ └──────┘ └──────┘    │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │Amigos│ │Conqui│ │Mais..│    │
│ │  5   │ │  12  │ │      │    │
│ └──────┘ └──────┘ └──────┘    │
└─────────────────────────────────┘
```

### 2.3 Lentes (módulos de consulta)

Cada lente mostra dados que a IA classificou e organizou automaticamente a partir do Diário. O tutor abre uma lente apenas quando quer CONSULTAR, nunca para inserir.

| Lente | O que mostra | Badge |
|-------|-------------|-------|
| Prontuário | Vacinas, exames, medicações, consultas, peso, alergias, cirurgias | Count de vencidas/alertas |
| Nutrição | Ração atual, dieta, petiscos, suplementos, histórico | Check se completa |
| Gastos | Resumo mensal, por categoria, por parceiro, gráfico | Valor do mês |
| Amigos | Grafo social, pets conhecidos, compatibilidade | Count de amigos |
| Conquistas | Badges, marcos, XP, nível | Count total |
| Felicidade | Gráfico emocional, tendências, humor médio | Mood atual |
| Viagens | Roteiros, registros, locais pet-friendly | Count de viagens |
| Planos | Saúde, seguro, funerário, assistência, emergencial — ativos e sugeridos pela IA | Status + economia |

---

## 3. ELEMENTOS DE ENTRADA (8 tipos)

O Diário aceita 8 tipos de entrada. O tutor não precisa saber a diferença — o botão "+" oferece tudo de forma intuitiva.

### 3.1 O Botão "+"

O FAB (Floating Action Button) do diário é a única forma de inserir dados no app. Ao tocar:

```
┌─────────────────────────────────┐
│                                  │
│  O que aconteceu com o Rex?     │
│                                  │
│  ┌──────────────┐ ┌──────────┐  │
│  │              │ │          │  │
│  │    FOTO      │ │  VÍDEO   │  │  ← Grandes, prioridade visual
│  │   (câmera)   │ │ (câmera) │  │
│  │              │ │          │  │
│  └──────────────┘ └──────────┘  │
│                                  │
│  ┌──────────┐ ┌──────────────┐  │
│  │  FALAR   │ │   OUVIR      │  │  ← Voz do tutor / som do pet
│  │  (voz    │ │   (gravar    │  │
│  │  tutor)  │ │   som pet)   │  │
│  └──────────┘ └──────────────┘  │
│                                  │
│  ┌──────────┐ ┌──────────────┐  │
│  │ ESCREVER │ │   GALERIA    │  │  ← Texto / upload de mídia
│  │ (teclado)│ │ (upload)     │  │
│  └──────────┘ └──────────────┘  │
│                                  │
│  ┌──────────┐ ┌──────────────┐  │
│  │ SCANNER  │ │  DOCUMENTO   │  │  ← OCR / upload de PDF
│  │  (OCR)   │ │  (PDF/img)   │  │
│  └──────────┘ └──────────────┘  │
│                                  │
│  Dica: tire foto de qualquer    │
│  coisa ao redor do Rex          │
│                                  │
└─────────────────────────────────┘
```

### 3.2 Os 8 Elementos

| # | Elemento | Ícone Lucide | O que faz | IA processa como |
|---|----------|-------------|-----------|------------------|
| 1 | **Foto** | `camera` | Abre câmera, tira foto | Claude Vision: documento? produto? pet? ambiente? |
| 2 | **Vídeo** | `video` | Abre câmera em modo vídeo | Claude Vision analisa frames + áudio do vídeo |
| 3 | **Falar** | `mic` | Grava voz do tutor | STT transcreve → Claude classifica texto |
| 4 | **Ouvir** | `ear` | Grava som do pet (latido, miado, ronronar) | IA analisa padrão sonoro: ansiedade? dor? brincadeira? |
| 5 | **Escrever** | `keyboard` | Campo de texto livre | Claude classifica texto |
| 6 | **Galeria** | `image-up` | Upload de foto/vídeo/áudio da galeria | Mesma análise que câmera, mas de arquivo existente |
| 7 | **Scanner** | `scan` | Modo scanner otimizado para documentos (OCR) | Claude Vision com prompt focado em extração de dados |
| 8 | **Documento** | `file-text` | Upload de PDF/imagem de documento | Extração de conteúdo textual e dados estruturados |

### 3.3 Fluxo: FOTO (câmera)

```
Tutor toca Foto
    → Abre câmera nativa (tela cheia)
    → Tutor tira foto de qualquer coisa
    → Tela de análise com animação (2-3 segundos):
        "Analisando..."
        Linhas de scan aparecem sobre a foto
    → IA identifica o que é e mostra resultado:

    ┌─────────────────────────────────┐
    │  [foto tirada]                   │
    │                                  │
    │  IA detectou:                    │
    │  ┌──────────────────────────┐   │
    │  │ Carteirinha de vacina     │   │
    │  │                          │   │
    │  │ V10 (Polivalente)   95%  │   │
    │  │ Vanguard Plus       92%  │   │
    │  │ Lote: A2847N        88%  │   │
    │  │ Data: 27/03/2026    97%  │   │
    │  │ Dra. Carla Mendes   85%  │   │
    │  │                          │   │
    │  │ [Registrar no Prontuário]│   │
    │  │ [Só salvar no diário]    │   │
    │  │ [Descartar]              │   │
    │  └──────────────────────────┘   │
    └─────────────────────────────────┘

    Se "Registrar no Prontuário":
        → Abre módulo vacinas com dados pré-preenchidos
        → Tutor só confirma (1 toque)
        → Volta pro diário
        → Narração IA aparece: "Hoje o Rex foi ao veterinário tomar vacina..."

    Se "Só salvar no diário":
        → Salva foto + classificação interna na timeline
        → Tutor pode mandar pro módulo depois se quiser
```

### 3.4 Fluxo: VÍDEO (câmera)

```
Tutor toca Vídeo
    → Abre câmera em modo vídeo (max 60s no MVP)
    → Tutor grava o pet em ação
    → Upload + análise (3-5 segundos):

    IA analisa:
    ├── Frames visuais: postura, locomoção, comportamento, saúde visual
    ├── Áudio do vídeo: latidos, miados, respiração, silêncio
    └── Contexto: ambiente (casa, parque, vet), outros pets, pessoas

    Classificações possíveis:
    ├── Momento: pet brincando, passeando, dormindo
    ├── Saúde: locomoção anormal, claudicação, tremor, letargia
    ├── Comportamento: ansiedade, agressividade, medo, hiper-atividade
    ├── Conexão: interação com outro pet
    └── Conquista: truque novo, primeiro banho

    Resultado inclui:
    ├── Thumbnail extraído para a timeline
    ├── Scores: locomoção 95%, energia 80%, calma 70%
    ├── Humor inferido do vídeo
    └── Alerta se detectar algo preocupante

    Vídeo comprimido e armazenado no Supabase Storage
```

### 3.5 Fluxo: FALAR (voz do tutor)

```
Tutor toca Falar
    → Animação pulsante laranja
    → Tutor fala livremente (sem limite de tempo)
    → STT transcreve em tempo real (texto aparecendo na tela)
    → Tutor para de falar (ou toca pra parar)
    → IA analisa o texto (1-2 segundos)
    → Se detectar múltiplos itens, mostra cada um:

    ┌─────────────────────────────────┐
    │  "Voltei do vet com o Rex.      │
    │   Dra. Carla fez check-up,     │
    │   tomou V10, peso 32 quilos"   │
    │                                  │
    │  IA detectou 3 itens:           │
    │                                  │
    │  ┌────────────────────────┐     │
    │  │ Vacina V10              │     │
    │  │ [Registrar Prontuário]  │     │
    │  └────────────────────────┘     │
    │  ┌────────────────────────┐     │
    │  │ Peso 32kg               │     │
    │  │ [Atualizar peso]        │     │
    │  └────────────────────────┘     │
    │  ┌────────────────────────┐     │
    │  │ Consulta check-up       │     │
    │  │ [Registrar consulta]    │     │
    │  └────────────────────────┘     │
    │                                  │
    │  [Salvar tudo de uma vez]       │
    │  [Só adicionar ao diário]       │
    └─────────────────────────────────┘

    Cada card pode ser aceito ou ignorado individualmente.
    "Salvar tudo" registra os 3 de uma vez em seus módulos.
```

### 3.6 Fluxo: OUVIR (som do pet)

```
Tutor toca Ouvir
    → Animação diferente (ondas sonoras, cor petrol — não laranja)
    → Grava som que o pet está fazendo
    → IA analisa padrão sonoro:

    Cães:
    ├── Latido de alerta: curto, forte, repetitivo → "Rex está avisando sobre algo"
    ├── Latido de medo: agudo, intercalado com choramingo → "Rex está com medo"
    ├── Latido de brincadeira: irregular, tom variado → "Rex quer brincar!"
    ├── Latido de solidão: longo, espaçado, melancólico → "Rex está se sentindo sozinho"
    ├── Latido de dor: agudo, súbito, com gemido → urgency: medium
    ├── Choramingo: contínuo, baixo → ansiedade ou desconforto
    ├── Ofegante: respiração rápida → calor, estresse ou possível problema
    └── Gemido: gutural → possível dor, urgency: medium

    Gatos:
    ├── Miado curto: saudação → "Luna está dizendo oi"
    ├── Miado longo: demanda (fome, atenção) → "Luna quer algo"
    ├── Miado agudo: dor ou desconforto → urgency: medium
    ├── Ronronar: contentamento ou auto-cura → "Luna está relaxada"
    ├── Rosnar/soprar: medo ou agressão → "Luna não está feliz"
    ├── Trilo: excitação → "Luna viu algo interessante"
    └── Silêncio prolongado: letargia → verificar saúde

    Resultado:
    ┌─────────────────────────────────┐
    │  Som analisado: 12 segundos     │
    │                                  │
    │  Padrão: Latido de ansiedade    │
    │  Frequência alta, intervalos    │
    │  curtos, tom agudo              │
    │                                  │
    │  "Rex está ansioso. Isso costuma│
    │   acontecer quando fica sozinho"│
    │                                  │
    │  Humor atualizado: Ansioso      │
    │                                  │
    │  [Registrar no Prontuário]      │  ← Se padrão de dor
    │  [Salvar no diário]             │
    └─────────────────────────────────┘

    Narração IA: "O Rex ficou sozinho em casa e demonstrou sinais claros de ansiedade.
                  Os latidos foram frequentes e agudos, indicando que não aprovou a saída do tutor."
```

### 3.7 Fluxo: ESCREVER (teclado)

```
Tutor toca Escrever
    → Campo de texto abre
    → Mic sempre disponível ao lado (pode trocar pra voz a qualquer momento)
    → Tutor digita livremente
    → Ao enviar, IA analisa (mesma lógica da voz)
    → Se detectar contexto específico, sugere módulo
    → Se não detectar nada especial, salva como momento do diário

    Texto é o último recurso na hierarquia AI-first.
    Mas sempre disponível para quem prefere digitar.
```

### 3.8 Fluxo: GALERIA (upload de mídia existente)

```
Tutor toca Galeria
    → Abre galeria do celular
    → Pode selecionar:
        ├── Fotos (1 ou múltiplas, até 5)
        ├── Vídeos (1, até 60s)
        └── Áudios (1, gravação existente)
    → Mesma análise que câmera/vídeo/ouvir ao vivo
    → Permite adicionar voz ou texto junto

    Casos de uso:
    ├── Vet mandou foto do raio-X por WhatsApp → upload → IA lê
    ├── Vídeo do pet mancando gravado ontem → upload → IA analisa locomoção
    ├── Foto da nota fiscal tirada antes → upload → IA extrai gasto
    ├── Áudio do latido gravado de madrugada → upload → IA analisa padrão
    ├── Fotos da viagem do fim de semana → upload em lote → IA organiza
    └── Foto da ração que comprou no mercado → upload → IA registra nutrição
```

### 3.9 Fluxo: SCANNER (OCR de documentos)

```
Tutor toca Scanner
    → Abre câmera em modo especial para documentos:
        ├── Guias visuais para enquadrar documento
        ├── Correção automática de perspectiva (endireita)
        ├── Contraste aumentado para texto
        ├── Flash automático se ambiente escuro
        └── Preview do que foi detectado antes de confirmar
    → IA processa com prompt focado em extração de dados:

    Documentos reconhecidos:
    ├── Carteirinha de vacinação → nome, lab, lote, data, vet, próxima
    ├── Receita veterinária → medicamento, dose, frequência, duração
    ├── Laudo de exame → nome, resultados com referência, status
    ├── Nota fiscal / cupom → valor, itens, estabelecimento, CNPJ, data
    ├── Recibo → valor, serviço, profissional, data
    ├── Boleto / fatura → valor, empresa, vencimento
    ├── Apólice de seguro → plano, coberturas, valores, vigência
    ├── Embalagem (ração, remédio) → marca, tipo, ingredientes, validade
    ├── Bula de medicamento → princípio ativo, dosagem, contraindicações
    └── Atestado / relatório veterinário → data, vet, diagnóstico, prescrições

    Cada campo extraído mostra % de confiança.
    Tutor confirma e a IA distribui para o módulo correto.
```

### 3.10 Fluxo: DOCUMENTO (upload de PDF/arquivo)

```
Tutor toca Documento
    → Abre seletor de arquivos do celular
    → Pode selecionar:
        ├── PDF (laudo, prontuário antigo, apólice)
        ├── Imagem de documento (foto já tirada)
        └── Arquivo de texto
    → IA extrai todo o conteúdo:

    Casos de uso:
    ├── PDF de exame que o lab mandou por email
    │   → IA extrai: nome do exame, resultados, referências
    │   → "Detectei hemograma. Importar resultados?"
    │
    ├── PDF do prontuário antigo de outro vet/app
    │   → IA extrai: vacinas, exames, consultas, cirurgias
    │   → "Detectei 12 vacinas, 5 exames e 3 consultas. Importar tudo?"
    │   → Um toque importa tudo para os módulos corretos
    │
    ├── Apólice de seguro em PDF
    │   → IA extrai: plano, coberturas, vigência, valores
    │   → "Registrar seguro do Rex?"
    │
    └── Imagem de documento médico recebida por WhatsApp/email
        → Mesma análise que Scanner/OCR
```

### 3.11 Combinações (entrada múltipla)

O tutor pode combinar elementos na mesma entrada do diário. A IA cruza as informações para um resultado mais preciso:

| Combo | Exemplo | IA faz |
|-------|---------|--------|
| Foto + Voz | Foto da receita + "vet receitou isso" | OCR da foto + contexto da voz = registro completo |
| Foto + Texto | Foto do Rex + "primeiro dia na praia" | Análise visual + contexto = momento + viagem |
| Vídeo + Voz | Vídeo do Rex mancando + "tá assim desde ontem" | Análise locomoção + timeline do sintoma = alerta médico |
| Scanner + Voz | Scanner da nota + "isso foi o check-up" | Dados da nota + contexto = gasto vinculado à consulta |
| Galeria + Voz | Upload de 3 fotos + "fim de semana no litoral" | Análise das fotos + contexto = diário de viagem |
| Ouvir + Foto | Grava latido + foto do Rex | Padrão sonoro + expressão visual = diagnóstico emocional preciso |
| Ouvir + Voz | Grava miado + "faz isso toda noite" | Análise sonora + frequência = padrão comportamental |
| Scanner + Galeria | Scanner da receita + foto da caixa do remédio | Dados da receita + confirmação visual do produto |

### 3.12 Regra de Ouro das Entradas

```
Qualquer combinação de elementos gera UMA entrada no diário.
A IA pode sugerir MÚLTIPLOS módulos a partir dessa entrada.
O tutor confirma cada sugestão individualmente ou todas de uma vez.
"Só salvar no diário" é SEMPRE uma opção — o tutor nunca é obrigado.
```

---

## 4. SISTEMA DE CLASSIFICAÇÃO DA IA

### 4.1 Tipos de Classificação

A IA classifica cada entrada do diário em um ou mais tipos:

| Tipo | Gatilho (foto) | Gatilho (voz/texto) | Módulo destino |
|------|----------------|---------------------|----------------|
| `moment` | Foto do pet, selfie com pet | "Rex brincou", "fomos ao parque" | Diário (fica na timeline) |
| `vaccine` | Carteirinha, frasco, caixa de vacina | "tomou V10", "vacinei o Rex" | Prontuário → Vacinas |
| `exam` | Laudo, resultado de exame | "resultado do hemograma", "exame deu normal" | Prontuário → Exames |
| `medication` | Receita, caixa de remédio, frasco | "começou a tomar", "vet receitou" | Prontuário → Medicações |
| `consultation` | Atestado, relatório vet | "fui no vet", "Dra. Carla disse" | Prontuário → Consultas |
| `allergy` | Foto de reação no pet | "vomitou depois de comer", "coceira" | Prontuário → Alergias |
| `weight` | Display de balança | "pesou 32kg", "engordou" | Prontuário → Peso |
| `surgery` | Relatório cirúrgico | "operou", "castrou" | Prontuário → Cirurgias |
| `symptom` | Foto de ferida, olho vermelho | "tá mancando", "diarreia", "não come" | Prontuário → Alerta de saúde |
| `food` | Embalagem de ração, petisco | "ração nova", "comeu", "dieta" | Nutrição |
| `expense` | Nota fiscal, cupom, recibo, boleto | "gastei", "paguei", "custou R$" | Gastos |
| `connection` | Foto com outro pet | "brincou com o Thor", "novo amigo" | Amigos |
| `travel` | Paisagem, carro, hotel | "viagem", "fomos pra", "praia" | Viagens |
| `partner` | Placa de loja, fachada | "pet shop novo", "vet bom" | Parceiros |
| `achievement` | — (IA detecta automaticamente) | "primeira vez", "conseguiu", "aprendeu" | Conquistas |
| `mood` | Expressão facial do pet | "tá triste", "feliz demais", "ansioso" | Felicidade (humor) |
| `insurance` | Apólice, fatura de seguro | "seguro", "plano", "cobertura" | Planos |
| `plan` | Documento de plano pet | "assinei plano", "renovar", "cancelar" | Planos |

### 4.2 Classificação Múltipla

Uma entrada pode ter MÚLTIPLAS classificações:

```
"Voltei do vet, Rex tomou V10, gastei R$280, peso 32kg"

Classificações:
├── consultation (foi ao vet)
├── vaccine (V10)
├── expense (R$280)
└── weight (32kg)

A IA gera 4 sugestões de módulo. Tutor confirma cada uma.
```

### 4.3 Confiança e Threshold

A IA retorna confiança para cada classificação:

```
confidence >= 90%  → Sugere módulo automaticamente com CTA destacado
confidence 70-89%  → Sugere módulo com "Parece que..." (tom gentil)
confidence 50-69%  → Não sugere módulo, salva só no diário, classifica internamente
confidence < 50%   → Ignora classificação, trata como momento genérico
```

### 4.4 Prompt da IA para Classificação

```
Edge Function: classify-diary-entry

Input: {
  pet_id,
  text (transcrito de voz ou digitado),
  photo_base64 (se houver),
  pet_context (raça, idade, histórico recente do RAG)
}

Prompt para Claude:
"Analise esta entrada do diário de um pet e classifique.
 Retorne JSON com:
 - classifications: array de { type, confidence, extracted_data }
 - narration: narração da IA sobre o pet (3ª pessoa, descritiva, max 150 palavras)
 - mood: humor inferido
 - urgency: none | low | medium | high (se sintoma de saúde)

 Se a foto for de documento (nota fiscal, carteirinha, receita, laudo),
 extraia todos os dados estruturados possíveis.

 Se a foto for do pet, analise saúde visual e humor.

 Pet: {name}, {breed}, {age}. Contexto recente: {rag_memories}"
```

### 4.5 Resposta da IA (exemplo)

```json
{
  "classifications": [
    {
      "type": "consultation",
      "confidence": 0.95,
      "extracted_data": {
        "vet_name": "Dra. Carla Mendes",
        "type": "check-up",
        "date": "2026-03-27"
      }
    },
    {
      "type": "vaccine",
      "confidence": 0.92,
      "extracted_data": {
        "name": "V10",
        "vet_name": "Dra. Carla Mendes",
        "date": "2026-03-27"
      }
    },
    {
      "type": "weight",
      "confidence": 0.88,
      "extracted_data": {
        "weight_kg": 32.0,
        "source": "vet"
      }
    },
    {
      "type": "expense",
      "confidence": 0.45,
      "extracted_data": {}
    }
  ],
  "narration": "Hoje o Rex foi ao veterinário. Foi aplicada a vacina V10 pela Dra. Carla Mendes. O check-up mostrou que ele está saudável e pesando 32 quilos, dentro do ideal para um Labrador de 3 anos. Tudo em ordem.",
  "mood": "calm",
  "urgency": "none"
}
```

Nesse exemplo, consulta/vacina/peso seriam sugeridos ao tutor (confiança alta). O gasto não seria sugerido (confiança baixa) porque o tutor não mencionou valor.

---

## 5. SISTEMA DE SUGESTÃO (como o app fala com o tutor)

### 5.1 Princípios de UX

1. **Nunca bloquear.** A sugestão é um card que pode ser ignorado.
2. **Nunca repetir.** Se o tutor ignorou 3x a mesma sugestão, parar de sugerir.
3. **Sempre gentil.** Tom de assistente, não de formulário.
4. **Sempre com preview.** Mostrar o que foi extraído antes de pedir confirmação.
5. **Um toque para confirmar.** O dado já vem pré-preenchido, tutor só confirma.
6. **Zero obrigação.** "Só adicionar ao diário" é sempre opção.

### 5.2 Card de Sugestão (componente padrão)

```
┌─────────────────────────────────┐
│ [ícone] [Tipo detectado]    [%] │
│                                  │
│ Dados extraídos:                │
│ Campo 1: valor                  │
│ Campo 2: valor                  │
│                                  │
│ [CTA: Registrar no Módulo]      │  ← Botão accent (laranja)
│ [Ignorar]                       │  ← Link discreto
└─────────────────────────────────┘
```

### 5.3 Sugestões por Contexto

**Foto de documento médico:**
```
"Detectei carteirinha de vacina.
 V10 · Vanguard Plus · 27/03/2026
 [Registrar no Prontuário]"
```

**Foto de nota fiscal:**
```
"Detectei nota fiscal.
 Clínica VetBem · R$ 280,00
 [Registrar nos Gastos do Rex]"
```

**Voz mencionando viagem:**
```
"Parece que o Rex vai viajar!
 Campos do Jordão · semana que vem
 [Criar roteiro pet-friendly]"
```

**Foto do pet com sintoma:**
```
"Detectei possível irritação na pele.
 Região: lombar · Tipo: vermelhidão
 [Registrar no Prontuário]
 ⚠️ Se persistir, consulte o veterinário"
```

**Foto de embalagem de ração:**
```
"Detectei ração Royal Canin Labrador Adult.
 [Registrar na Nutrição do Rex]"
```

**IA detecta marco automaticamente:**
```
"Rex completou 100 entradas no diário!
 Conquista desbloqueada: Memória Viva
 [Ver conquistas]"
```

### 5.4 Sugestão de Urgência (saúde)

Quando a IA detecta algo urgente:

```
confidence >= 80% + urgency: high

Card vermelho (não laranja):
┌─────────────────────────────────┐
│ ⚠️ Atenção                      │
│                                  │
│ Rex apresenta sintomas que podem│
│ precisar de atenção veterinária: │
│ • Vômito recorrente (3ª vez)    │
│ • Perda de apetite há 2 dias   │
│                                  │
│ [Registrar no Prontuário]       │
│ [Ligar para VetBem]             │  ← Se parceiro cadastrado
│ [Ativar SOS na Aldeia]          │  ← Se Aldeia ativa
└─────────────────────────────────┘
```

---

## 6. RECONHECIMENTO POR TIPO DE MÍDIA (tabela completa)

### 6.1 Documentos

| Foto de | IA extrai | Módulo | Confiança típica |
|---------|-----------|--------|-----------------|
| Carteirinha de vacina | Nome, lab, lote, data, vet, próxima | Prontuário → Vacinas | 90-97% |
| Caixa/frasco de vacina | Nome comercial, lab, lote, validade | Prontuário → Vacinas | 85-92% |
| Receita veterinária | Medicamento, dose, frequência, duração, vet | Prontuário → Medicações | 85-95% |
| Laudo de exame | Nome, resultados, referências, status | Prontuário → Exames | 88-95% |
| Atestado/relatório vet | Data, vet, diagnóstico, prescrições | Prontuário → Consultas | 80-90% |
| Relatório cirúrgico | Procedimento, anestesia, vet, notas | Prontuário → Cirurgias | 80-90% |
| Nota fiscal | Valor, itens, estabelecimento, CNPJ, data | Gastos | 85-95% |
| Cupom fiscal | Valor, produtos, loja, data | Gastos | 80-92% |
| Recibo | Valor, serviço, profissional, data | Gastos | 80-90% |
| Boleto/fatura | Valor, empresa, vencimento, plano | Gastos / Seguros | 75-88% |
| Apólice de seguro | Plano, coberturas, valores, vigência | Seguros | 80-90% |

### 6.2 Produtos

| Foto de | IA extrai | Módulo | Confiança típica |
|---------|-----------|--------|-----------------|
| Embalagem de ração | Marca, linha, peso, tipo (adulto/filhote) | Nutrição | 90-97% |
| Petisco / snack | Marca, sabor, ingredientes visíveis | Nutrição | 85-92% |
| Suplemento | Nome, tipo, dosagem | Nutrição / Medicações | 80-90% |
| Caixa de remédio | Nome comercial, dosagem, lab | Prontuário → Medicações | 88-95% |
| Produto de higiene | Marca, tipo (shampoo, condicionador) | — (registra como gasto) | 80-88% |
| Acessório (coleira, brinquedo) | Tipo, marca | — (registra como gasto) | 75-85% |

### 6.3 Pet e Ambiente (foto)

| Foto de | IA extrai | Módulo | Confiança típica |
|---------|-----------|--------|-----------------|
| Pet saudável e feliz | Humor, saúde visual, pelo, olhos | Diário (momento) + Humor | 85-95% |
| Pet com outro pet | Espécie, raça do outro, interação | Diário → Amigos | 80-90% |
| Pet com sintoma visível | Tipo (ferida, inchaço, vermelhidão), região | Prontuário → Alerta | 70-85% |
| Pet na balança | Valor do peso | Prontuário → Peso | 88-95% |
| Paisagem / praia / parque | Tipo de local, possível cidade | Viagens / Diário | 75-88% |
| Carro com caixa transporte | Contexto de viagem | Viagens | 70-80% |
| Fachada de vet/pet shop | Nome do estabelecimento | Parceiros | 75-88% |
| Ambiente interno (casa) | Contexto casual | Diário (momento) | 90%+ |

### 6.4 Vídeo do Pet

| Vídeo mostra | IA extrai | Módulo | Confiança típica |
|-------------|-----------|--------|-----------------|
| Pet andando/correndo normalmente | Locomoção OK, energia, postura | Diário (momento) + Humor | 85-95% |
| Pet mancando/claudicando | Membro afetado, grau, padrão | Prontuário → Alerta (urgency: medium) | 75-88% |
| Pet tremendo | Tipo (frio, medo, dor, neurológico) | Prontuário → Alerta | 70-85% |
| Pet brincando com outro | Interação, energia, compatibilidade | Diário → Amigos | 80-90% |
| Pet fazendo truque | Tipo de truque, precisão | Conquista | 80-90% |
| Pet letárgico/parado | Possível doença, comparação com padrão | Prontuário → Alerta (urgency: low) | 65-80% |
| Pet comendo | Velocidade, interesse, quantidade | Nutrição + Humor | 70-85% |
| Pet tomando banho | Comportamento, cooperação | Diário (momento) | 85-92% |
| Ambiente externo (passeio) | Local, atividade, duração estimada | Diário + Viagens | 75-88% |

### 6.5 Som do Pet (áudio)

| Som gravado | IA classifica como | Resultado | Módulo |
|------------|-------------------|-----------|--------|
| Latido de alerta | Curto, forte, repetitivo | "Rex está avisando sobre algo" | Humor: alerta |
| Latido de medo | Agudo, intercalado com choramingo | "Rex está com medo" | Humor: ansioso |
| Latido de brincadeira | Irregular, tom variado | "Rex quer brincar!" | Humor: brincalhão |
| Latido de solidão | Longo, espaçado, melancólico | "Rex está sozinho" | Humor: triste |
| Latido/gemido de dor | Agudo, súbito, gutural | "Possível dor — observar" | Prontuário → Alerta (urgency: medium) |
| Choramingo contínuo | Baixo, contínuo | "Ansiedade ou desconforto" | Humor: ansioso |
| Respiração ofegante | Rápida, ruidosa | "Calor, estresse ou problema respiratório" | Prontuário → Alerta (urgency: low) |
| Miado curto (gato) | Saudação | "Luna está dizendo oi" | Humor: feliz |
| Miado longo (gato) | Demanda (fome, atenção) | "Luna quer algo" | Humor: alerta |
| Miado agudo (gato) | Dor ou desconforto | "Possível desconforto" | Prontuário → Alerta (urgency: medium) |
| Ronronar (gato) | Contentamento ou auto-cura | "Luna está relaxada" | Humor: calmo |
| Rosnar/soprar (gato) | Medo ou agressão | "Luna não está feliz" | Humor: ansioso |
| Silêncio prolongado | Letargia | "Verificar se está tudo bem" | Prontuário → Alerta (urgency: low) |

### 6.6 Voz do Tutor (texto transcrito)

| Tutor fala | IA classifica como | Módulo |
|-----------|-------------------|--------|
| "Rex brincou no parque" | moment | Diário |
| "Tomou V10 hoje" | vaccine | Prontuário → Vacinas |
| "Pesou 32 quilos" | weight | Prontuário → Peso |
| "Tá com diarreia" | symptom | Prontuário → Alerta |
| "Comprei ração nova" | food | Nutrição |
| "Gastei 280 no vet" | expense | Gastos |
| "Vamos viajar pro litoral" | travel | Viagens |
| "Fez amizade com o Thor" | connection | Amigos |
| "Aprendeu a dar a pata" | achievement | Conquistas |
| "Tá muito ansioso hoje" | mood | Humor |
| "Vet receitou ômega 3" | medication | Prontuário → Medicações |
| "Resultado do exame saiu" | exam | Prontuário → Exames |
| "Banho e tosa custou 85 reais" | expense | Gastos |
| "Seguro do Rex vence mês que vem" | insurance | Seguros |

### 6.7 Documentos (Scanner/OCR/Upload)

| Documento | IA extrai | Módulo | Confiança típica |
|-----------|-----------|--------|-----------------|
| Carteirinha de vacinação | Nome, lab, lote, data, vet, próxima | Prontuário → Vacinas | 90-97% |
| Receita veterinária | Medicamento, dose, frequência, vet | Prontuário → Medicações | 85-95% |
| Laudo de exame | Nome, resultados, referências, status | Prontuário → Exames | 88-95% |
| Relatório cirúrgico | Procedimento, anestesia, vet | Prontuário → Cirurgias | 80-90% |
| Nota fiscal | Valor, itens, estabelecimento, CNPJ | Gastos | 85-95% |
| Cupom fiscal | Valor, produtos, loja | Gastos | 80-92% |
| Recibo | Valor, serviço, profissional | Gastos | 80-90% |
| Boleto/fatura | Valor, empresa, vencimento | Gastos / Seguros | 75-88% |
| Apólice de seguro | Plano, coberturas, vigência | Seguros | 80-90% |
| Bula de medicamento | Princípio ativo, dosagem, contraindicações | Prontuário → Medicações | 85-92% |
| Prontuário antigo (PDF) | Vacinas, exames, consultas, cirurgias | Importação completa | 75-90% |
| Embalagem de ração | Marca, tipo, composição | Nutrição | 90-97% |
| Embalagem de petisco | Marca, sabor, ingredientes | Nutrição | 85-92% |

---

## 7. PIPELINE TÉCNICO

### 7.1 Fluxo Completo (do toque ao registro)

```
CELULAR                           SUPABASE (Edge Functions)
   │                                    │
   │ 1. Tutor usa qualquer elemento:    │
   │    foto, vídeo, voz, som do pet,   │
   │    texto, galeria, scanner, PDF    │
   │                                    │
   │ 2. Upload mídia (se houver)        │
   │──────────────────────────────────►│
   │                                    │ 2b. compress-media (foto/vídeo)
   │                                    │ 2c. process-voice-stt (se voz do tutor)
   │                                    │
   │                                    │ 3. classify-diary-entry
   │                                    │    ├── Claude Vision (se foto/vídeo/scan)
   │                                    │    ├── analyze-video (se vídeo: locomoção, energia)
   │                                    │    ├── analyze-pet-audio (se som do pet: padrão)
   │                                    │    ├── process-document-ocr (se documento)
   │                                    │    ├── Claude Text (texto/voz transcrita)
   │                                    │    ├── Busca RAG (contexto do pet)
   │                                    │    └── Retorna: classifications + narration + mood
   │◄──────────────────────────────────│
   │                                    │
   │ 4. Mostra cards de sugestão       │
   │    (tutor confirma/ignora cada um) │
   │                                    │
   │ 5a. Tutor confirma "Registrar"     │
   │──────────────────────────────────►│
   │                                    │ 6. save-classified-entry
   │                                    │    ├── Insere diary_entry (sempre)
   │                                    │    ├── Insere vaccine/exam/expense/etc (confirmados)
   │                                    │    ├── Gera embedding RAG (texto + narração)
   │                                    │    ├── Atualiza health_score (se saúde)
   │                                    │    ├── Atualiza mood do pet (se humor detectado)
   │                                    │    └── Cria notificação futura (se vacina/retorno/medicação)
   │◄──────────────────────────────────│
   │                                    │
   │ 7. Timeline atualizada com         │
   │    narração IA + mídia + badges    │
   │    dos módulos alimentados         │
   │                                    │
   │ 5b. Tutor ignora (só diário)       │
   │──────────────────────────────────►│
   │                                    │ 6b. save-diary-only
   │                                    │     ├── Insere diary_entry com mídia
   │                                    │     ├── Gera narração IA
   │                                    │     ├── Gera embedding RAG
   │                                    │     └── Classificação salva internamente
   │                                    │       (para sugestão futura se padrão se repetir)
```

### 7.2 Edge Functions

| Edge Function | Input | Output | Quando |
|---------------|-------|--------|--------|
| `classify-diary-entry` | pet_id, text, photo, video, audio, document | classifications[], narration, mood, urgency | Toda nova entrada |
| `save-classified-entry` | pet_id, diary_data, confirmed_classifications[] | diary_entry_id, module_ids[] | Tutor confirma |
| `save-diary-only` | pet_id, diary_data, narration | diary_entry_id | Tutor ignora sugestões |
| `generate-narration` | pet_id, text, mood, rag_context | narration_text | Dentro de classify |
| `generate-embedding` | pet_id, text, source_table, source_id | embedding_id | Após qualquer save |
| `calculate-health-score` | pet_id | health_score (0-100) | Após classificação de saúde |
| `process-document-ocr` | photo_base64, document_type | extracted_fields{} | Dentro de classify (quando foto/scan = documento) |
| `analyze-video` | video_url, pet_id | locomotion, energy, behavior, alerts[] | Dentro de classify (quando input = vídeo) |
| `analyze-pet-audio` | audio_base64, pet_species | pattern, emotion, intensity | Dentro de classify (quando input = pet_audio) |
| `process-voice-stt` | audio_base64, language | transcribed_text | Quando input = voice (antes de classify) |
| `compress-media` | media_url, media_type | compressed_url, thumbnail_url | Após upload de foto/vídeo |
| `check-pattern` | pet_id, classification_type | pattern_detected, suggestion | Quando IA detecta padrão recorrente |

### 7.3 Tabela diary_entries (atualizada)

```sql
CREATE TABLE diary_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- Entrada do tutor
    input_text      TEXT,                        -- O que o tutor falou/escreveu (transcrito se voz)
    input_type      VARCHAR(30) NOT NULL DEFAULT 'text'
                    CHECK (input_type IN (
                      'photo',                   -- foto tirada pela câmera
                      'video',                   -- vídeo gravado pela câmera
                      'voice',                   -- voz do tutor (STT)
                      'pet_audio',               -- som do pet (latido, miado, ronronar)
                      'text',                    -- digitado pelo tutor
                      'gallery_photo',           -- upload de foto da galeria
                      'gallery_video',           -- upload de vídeo da galeria
                      'gallery_audio',           -- upload de áudio da galeria
                      'ocr_scan',                -- modo scanner de documento
                      'pdf_upload',              -- upload de PDF/documento
                      'photo_voice',             -- combo foto + voz
                      'photo_text',              -- combo foto + texto
                      'video_voice',             -- combo vídeo + voz
                      'ocr_voice',               -- combo scanner + voz
                      'gallery_voice',           -- combo galeria + voz
                      'pet_audio_photo',         -- combo som do pet + foto
                      'multi'                    -- 3+ elementos combinados
                    )),
    
    -- Classificação IA
    classifications JSONB DEFAULT '[]',          -- Array de {type, confidence, extracted_data, confirmed}
    primary_type    VARCHAR(30) DEFAULT 'moment'
                    CHECK (primary_type IN (
                      'moment','vaccine','exam','medication','consultation',
                      'allergy','weight','surgery','symptom','food',
                      'expense','connection','travel','partner',
                      'achievement','mood','insurance','plan'
                    )),
    
    -- ===== NARRAÇÃO IA (sempre 3ª pessoa, nunca na voz do pet) =====
    -- Exemplo: "Hoje o Rex foi ao veterinário. A Dra. Carla aplicou a V10 e informou que está saudável."
    ai_narration    TEXT,
    
    -- Humor
    mood            VARCHAR(20)
                    CHECK (mood IN ('ecstatic','happy','calm','playful','tired','anxious','sad','sick')),
    mood_confidence REAL,
    mood_source     VARCHAR(20) DEFAULT 'text'   -- 'text' | 'photo' | 'video' | 'pet_audio' | 'ai_pattern'
                    CHECK (mood_source IN ('text','photo','video','pet_audio','ai_pattern')),
    
    -- Urgência (saúde)
    urgency         VARCHAR(10) DEFAULT 'none'
                    CHECK (urgency IN ('none','low','medium','high')),
    
    -- Mídia (expandido para todos os tipos)
    photo_urls      TEXT[] DEFAULT '{}',          -- Fotos (câmera, galeria, scanner)
    video_url       TEXT,                         -- Vídeo (câmera ou galeria)
    video_thumbnail TEXT,                         -- Thumbnail extraído do vídeo
    video_duration  INTEGER,                      -- Duração em segundos
    audio_url       TEXT,                         -- Áudio do tutor (voz) ou do pet
    audio_duration  INTEGER,                      -- Duração em segundos
    audio_type      VARCHAR(20)                   -- 'tutor_voice' | 'pet_sound'
                    CHECK (audio_type IN ('tutor_voice','pet_sound')),
    document_url    TEXT,                         -- PDF/documento uploadado
    document_type   VARCHAR(30),                  -- 'vaccine_card','prescription','exam_result','invoice','receipt','insurance','pet_record','other'
    ocr_data        JSONB,                        -- Dados extraídos do OCR {fields, confidence_per_field}
    
    -- Análise de vídeo (quando input_type envolve vídeo)
    video_analysis  JSONB,                        -- {locomotion_score, energy_score, behavior, alerts[]}
    
    -- Análise de áudio do pet (quando input_type = pet_audio)
    pet_audio_analysis JSONB,                     -- {pattern, emotion, intensity, description}
    
    -- Módulos alimentados (IDs dos registros criados quando tutor confirma)
    linked_vaccine_id       UUID,
    linked_exam_id          UUID,
    linked_medication_id    UUID,
    linked_consultation_id  UUID,
    linked_expense_id       UUID,
    linked_weight_log_id    UUID,
    linked_allergy_id       UUID,
    linked_surgery_id       UUID,
    
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_diary_pet ON diary_entries(pet_id);
CREATE INDEX idx_diary_created ON diary_entries(created_at DESC);
CREATE INDEX idx_diary_type ON diary_entries(primary_type);
CREATE INDEX idx_diary_mood ON diary_entries(mood);
CREATE INDEX idx_diary_input ON diary_entries(input_type);
CREATE INDEX idx_diary_urgency ON diary_entries(urgency) WHERE urgency != 'none';
CREATE INDEX idx_diary_classifications ON diary_entries USING GIN(classifications);
CREATE INDEX idx_diary_ocr ON diary_entries USING GIN(ocr_data) WHERE ocr_data IS NOT NULL;
```

---

## 8. HÁBITO DO TUTOR (onboarding progressivo)

### 8.1 Semana 1: Ensinar a falar

```
Dia 1: "Conte o que aconteceu com o Rex hoje!"
        → Tutor fala algo simples
        → IA narra o que aconteceu com o pet
        → Tutor se encanta com o resumo inteligente

Dia 2: "O diário do Rex já tem 1 memória. Quer adicionar mais?"
        → Reforço positivo

Dia 3-7: Tips gentis dentro do diário:
        "Sabia que você pode tirar foto e eu organizo tudo?"
```

### 8.2 Semana 2: Ensinar a fotografar

```
"Dica: tire foto da carteirinha de vacina do Rex.
 Eu leio e registro tudo automaticamente."

"Dica: fotografe a embalagem da ração do Rex.
 Eu monto a dieta dele."

Após primeira foto de documento:
"Incrível! Registrei a V10 do Rex em 2 segundos.
 Conquista desbloqueada: Primeiro Scan!"
```

### 8.3 Semana 3-4: Reforço do hábito

```
Notificação push (se tutor parou de usar):
"Rex tá com saudade! Conta o que aconteceu hoje?"

Após ida ao vet (se calendário detectar):
"Rex foi ao vet hoje? Tire foto da receita e eu organizo."

Conquistas que reforçam:
├── "Fotógrafo Iniciante"   → 10 fotos classificadas
├── "Scanner Pro"           → 50 fotos classificadas
├── "Prontuário Completo"   → Todas vacinas via foto
├── "Contador do Rex"       → 10 gastos registrados
└── "Memória Viva"          → 100 entradas no diário
```

### 8.4 Mês 2+: Tutor já formou o hábito

O app para de ensinar e começa a surpreender:

```
"Rex gastou R$910 em março. 45% foi saúde.
 Quer ver o resumo?"

"Faz 11 meses que Rex tomou Antirrábica.
 Vence mês que vem. Agendar?"

"Rex brincou com o Thor 8 vezes este mês.
 Melhor amigo confirmado!"

"Baseado nos gastos, um seguro pet de R$89/mês
 cobriria as emergências. Quer ver opções?"
```

---

## 9. FILTROS DO DIÁRIO (timeline)

### 9.1 Filtros principais (barra superior)

```
[Tudo]  [Momentos]  [Saúde]  [IA]  [Marcos]
```

| Filtro | O que mostra | primary_type incluídos |
|--------|-------------|----------------------|
| **Tudo** | Timeline completa | Todos |
| **Momentos** | Vida do pet, fotos, passeios | moment, connection, travel, food |
| **Saúde** | Vacinas, exames, consultas, sintomas, peso | vaccine, exam, medication, consultation, allergy, weight, surgery, symptom |
| **IA** | Insights, análises, alertas automáticos | Entries com urgency != 'none' ou classificação IA relevante |
| **Marcos** | Conquistas, primeiras vezes | achievement, mood (mudanças bruscas) |

### 9.2 Cada entrada na timeline mostra

```
┌─────────────────────────────────┐
│ Hoje · 16:45                     │
│                                  │
│ "Hoje o Rex correu no parque com │
│  o Thor. Segundo o tutor,       │
│  ficaram sujos mas muito        │
│  felizes. Atividade intensa."   │
│                                  │
│ [📷 foto] [📷 foto]             │
│                                  │
│ 🏷️ Momento · Amigos · Humor: Feliz │  ← Tags da classificação
│                                  │
│ Registrado em: Prontuário ✓     │  ← Se tutor confirmou algum módulo
│                Amigos ✓          │
└─────────────────────────────────┘
```

---

## 10. OFFLINE (como funciona sem internet)

```
ENTRADA: funciona 100% offline
├── Tutor fala/escreve → salva texto local
├── Tutor tira foto → salva foto local
├── Aparece na timeline COM texto do tutor
├── Aparece SEM narração IA (placeholder)
├── Aparece SEM sugestões de módulo
└── Badge: "Sem conexão · classificação pendente"

QUANDO RECONECTA:
├── Upload das fotos
├── IA classifica tudo pendente
├── Narrações aparecem
├── Sugestões de módulo aparecem retroativamente
├── Tutor confirma/ignora
└── Tudo sincroniza
```

---

## 11. IMPACTO NOS MÓDULOS EXISTENTES

### 11.1 O que muda

| Módulo | Antes | Depois |
|--------|-------|--------|
| Prontuário | Tutor abre, navega, preenche formulário | Auto-populado pelo diário, tutor só consulta |
| Nutrição | Tutor configura dieta manualmente | Auto-populado por fotos de ração/petisco |
| Gastos | Não existia | Auto-populado por fotos de notas fiscais |
| Amigos | Tutor registra conexões | Auto-detectado pela IA em fotos/textos |
| Conquistas | Tutor não faz nada, IA detecta | Sem mudança (já era automático) |
| Viagens | Tutor cria roteiro manualmente | IA sugere quando detecta contexto |
| Seguros | Tutor contrata separado | IA sugere quando detecta gasto alto |
| Planos | Não existia como módulo unificado | 5 tipos (saúde, seguro, funerário, assistência, emergencial) com sugestão contextual |
| Métricas clínicas | Não existia — dados perdidos em laudos | Auto-extraídas de exames/fotos/voz → gráficos de evolução |

### 11.2 O que NÃO muda

- As tabelas do banco continuam existindo (vacinas, exames, etc.)
- As lentes/módulos continuam existindo como views de consulta
- A Aldeia continua separada (é rede social, não é narrativa pessoal)
- O login/cadastro continua separado
- As Edge Functions de processamento continuam as mesmas

### 11.3 O que é NOVO

- `classify-diary-entry` (a Edge Function mais importante do app — aceita 8 tipos de mídia)
- `analyze-video` (análise de locomoção, energia, comportamento por vídeo)
- `analyze-pet-audio` (análise de padrão sonoro — latido, miado, ronronar)
- `process-voice-stt` (transcrição de voz do tutor)
- `compress-media` (compressão de foto/vídeo antes de armazenar)
- `extract-clinical-metrics` (extrai valores numéricos de exames/fotos/voz para séries temporais)
- `expenses` (tabela nova de gastos auto-populada por fotos de notas)
- `clinical_metrics` (tabela nova — 28 tipos de métrica clínica com referência por raça/idade)
- `pet_plans` (tabela nova — 5 tipos de plano: saúde, seguro, funerário, assistência, emergencial)
- `plan_claims` (tabela nova — sinistros e uso de planos)
- Sistema de sugestão com cards (IA sugere módulo, tutor confirma)
- 8 elementos de entrada (foto, vídeo, voz, som pet, texto, galeria, scanner, documento)
- Combinações de entrada (foto+voz, vídeo+voz, scanner+voz, etc.)
- Onboarding progressivo baseado em formação de hábito (4 semanas)
- Classificação JSONB em diary_entries (múltiplas classificações por entrada)
- Linked IDs em diary_entries (ligando diário aos módulos alimentados)
- Campos expandidos de mídia (video_url, video_thumbnail, audio_type, document_url, ocr_data, video_analysis, pet_audio_analysis)
- Gráficos de evolução clínica auto-gerados (peso, ALT, hemoglobina, humor, mobilidade, etc.)
- Alertas automáticos de tendência (IA monitora padrões e alerta proativamente)
- Lente Planos com ROI, economia e sugestões contextuais da IA

---

## 12. MÉTRICAS CLÍNICAS — COLETA E GRÁFICOS DE EVOLUÇÃO

### 12.1 Princípio

Toda vez que a IA classifica uma entrada como saúde, ela extrai automaticamente valores numéricos e armazena como **datapoints** em séries temporais. O tutor nunca precisa preencher gráfico — os gráficos se constroem sozinhos a partir do diário.

### 12.2 Tabela de Métricas Clínicas

```sql
CREATE TABLE clinical_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    metric_type     VARCHAR(30) NOT NULL
                    CHECK (metric_type IN (
                      'weight',              -- Peso (kg)
                      'temperature',         -- Temperatura (°C)
                      'heart_rate',          -- Freq. cardíaca (bpm)
                      'respiratory_rate',    -- Freq. respiratória (rpm)
                      'blood_glucose',       -- Glicemia (mg/dL)
                      'alt_tgp',             -- ALT/TGP hepático (U/L)
                      'ast_tgo',             -- AST/TGO hepático (U/L)
                      'creatinine',          -- Creatinina renal (mg/dL)
                      'urea',               -- Ureia renal (mg/dL)
                      'hemoglobin',          -- Hemoglobina (g/dL)
                      'hematocrit',          -- Hematócrito (%)
                      'platelets',           -- Plaquetas (mil/µL)
                      'leukocytes',          -- Leucócitos (mil/µL)
                      'albumin',             -- Albumina (g/dL)
                      'total_protein',       -- Proteína total (g/dL)
                      'cholesterol',         -- Colesterol (mg/dL)
                      'triglycerides',       -- Triglicerídeos (mg/dL)
                      'bun',                 -- BUN (mg/dL)
                      'alkaline_phosphatase',-- Fosfatase alcalina (U/L)
                      'bilirubin',           -- Bilirrubina (mg/dL)
                      'body_condition_score',-- Score corporal (1-9)
                      'health_score',        -- Score IA geral (0-100)
                      'pain_score',          -- Score de dor (0-10)
                      'mobility_score',      -- Score de mobilidade IA (0-100)
                      'mood_score',          -- Score de humor (0-100)
                      'energy_score',        -- Score de energia IA (0-100)
                      'coat_score',          -- Score de pelo IA (0-100)
                      'hydration_score',     -- Score de hidratação IA (0-100)
                      'custom'               -- Métrica personalizada
                    )),
    value           DECIMAL(10,3) NOT NULL,  -- Valor numérico
    unit            VARCHAR(20),              -- kg, °C, bpm, U/L, mg/dL, %, etc
    reference_min   DECIMAL(10,3),            -- Referência mínima para a raça/idade
    reference_max   DECIMAL(10,3),            -- Referência máxima para a raça/idade
    status          VARCHAR(20) DEFAULT 'normal'
                    CHECK (status IN ('normal','low','high','critical')),
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai_photo','ai_video','vet','lab')),
    source_diary_id UUID REFERENCES diary_entries(id),  -- Qual entrada do diário gerou
    source_exam_id  UUID,                     -- Qual exame gerou (se aplicável)
    measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clinical_pet ON clinical_metrics(pet_id);
CREATE INDEX idx_clinical_type ON clinical_metrics(metric_type);
CREATE INDEX idx_clinical_date ON clinical_metrics(measured_at);
CREATE INDEX idx_clinical_pet_type ON clinical_metrics(pet_id, metric_type, measured_at DESC);
```

### 12.3 Como a IA Coleta Automaticamente

```
ENTRADA DO TUTOR                     IA EXTRAI MÉTRICAS
─────────────────                    ─────────────────

Foto do laudo de exame               → ALT: 92 U/L (ref 10-88) status: high
                                     → Hemoglobina: 15.2 g/dL (ref 12-18) status: normal
                                     → Plaquetas: 285 mil/µL (ref 200-500) status: normal
                                     → Leucócitos: 11.4 mil/µL (ref 6-17) status: normal

Voz: "Rex pesou 32kg no vet"         → Peso: 32.0 kg (ref 29-36 para Labrador 3a) status: normal

Foto do pet pela IA                  → health_score: 92 (IA calculou)
                                     → coat_score: 85 (pelo com leve ressecamento)
                                     → mood_score: 80 (feliz, relaxado)
                                     → hydration_score: 90 (mucosas normais)

Vídeo do pet andando                 → mobility_score: 95 (locomoção normal)
                                     → energy_score: 82 (atividade acima da média)

Som do pet (latido de ansiedade)     → mood_score: 35 (ansioso)

Voz: "Vet mediu temperatura 38.5"   → temperature: 38.5 °C (ref 38.0-39.2) status: normal

Scanner de receita com dosagem       → (registra medicação, não métrica clínica)
```

### 12.4 Gráficos de Evolução (Lente Prontuário)

Quando o tutor abre a lente Prontuário, vê gráficos que se construíram sozinhos:

```
GRÁFICOS DISPONÍVEIS NO PRONTUÁRIO

┌─────────────────────────────────────┐
│  Peso · Últimos 12 meses           │
│  32kg ─────────────●                │
│  30kg ────●────────                 │
│  28kg ●                             │
│       Jul  Set  Nov  Jan  Mar       │
│  Status: Ideal para Labrador 3a    │
│  Tendência: Estável (±0.5kg)       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ALT (TGP) · Últimos 6 meses       │
│  100 ─ ─ ─ ─ ─ ─ ─ ─ref max(88)── │
│   92 ────────────────●  ⚠️          │
│   45 ●───────────────               │
│       Out  Dez  Fev  Mar            │
│  Status: Acima do normal            │
│  IA: "Repetir em 30 dias"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Score de Saúde IA · 6 meses       │
│  100 ────────●──────                │
│   92 ────────────────●              │
│   85 ●                              │
│       Out  Dez  Fev  Mar            │
│  Tendência: Subindo (+7%)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Humor · 30 dias                    │
│  😊 ████████████████░░░░ 65% Feliz │
│  😌 ████████░░░░░░░░░░░░ 20% Calmo │
│  😰 ████░░░░░░░░░░░░░░░░ 10% Ansioso│
│  😴 ██░░░░░░░░░░░░░░░░░░  5% Cansado│
│  Tendência: Mais feliz que mês passado│
└─────────────────────────────────────┘
```

### 12.5 Referências por Raça/Idade/Porte

A IA ajusta automaticamente os ranges de referência baseado no pet:

| Métrica | Labrador 3 anos | Siamês 2 anos | Yorkshire 5 anos |
|---------|----------------|---------------|-----------------|
| Peso ideal | 29-36 kg | 3.5-5.5 kg | 2-3.5 kg |
| Temperatura | 38.0-39.2 °C | 38.0-39.2 °C | 38.0-39.2 °C |
| Freq. cardíaca | 60-120 bpm | 140-220 bpm | 80-140 bpm |
| ALT (TGP) | 10-88 U/L | 12-130 U/L | 10-88 U/L |
| Hemoglobina | 12-18 g/dL | 8-15 g/dL | 12-18 g/dL |

A IA busca referências atualizadas para a raça/idade específica do pet e marca como normal/low/high/critical automaticamente.

### 12.6 Alertas Automáticos de Tendência

```
IA monitora tendências e alerta proativamente:

"O peso do Rex subiu 2kg nos últimos 3 meses.
 Se continuar nesse ritmo, estará acima do ideal em 2 meses.
 Sugestão: ajustar porção da ração."

"O ALT do Rex está acima do normal pela 2ª vez.
 Padrão sugere acompanhamento hepático.
 Sugestão: repetir exame e consultar vet."

"O humor do Rex está 40% mais ansioso que o mês passado.
 Horário predominante: 14h-16h (quando fica sozinho).
 Sugestão: deixar brinquedo interativo."

"O score de mobilidade do Rex caiu de 95 para 82 esta semana.
 Possível desconforto articular.
 Sugestão: observar locomoção e consultar vet se persistir."
```

### 12.7 Edge Function: extract-clinical-metrics

```
Edge Function: extract-clinical-metrics

Roda DENTRO da classify-diary-entry quando classificação inclui saúde.

Input: {
  pet_id,
  classifications (os que são de saúde),
  extracted_data (dados OCR/voz),
  pet_profile (raça, idade, peso atual, histórico)
}

Output: {
  metrics: [
    { metric_type: "weight", value: 32.0, unit: "kg", reference_min: 29, reference_max: 36, status: "normal" },
    { metric_type: "alt_tgp", value: 92, unit: "U/L", reference_min: 10, reference_max: 88, status: "high" },
  ],
  trends: [
    { metric_type: "weight", direction: "stable", change_pct: 0.5, alert: false },
    { metric_type: "alt_tgp", direction: "rising", change_pct: 104, alert: true },
  ],
  alerts: [
    { type: "value_high", metric: "alt_tgp", message: "ALT acima do normal. Repetir em 30 dias." }
  ]
}
```

---

## 13. PLANOS PET — Tipos de Cobertura

### 13.1 Os 5 Tipos de Plano

| Tipo | Uso principal | O que cobre | Exemplo |
|------|--------------|-------------|---------|
| **Saúde** | Rotina + prevenção | Consultas, vacinas, exames de rotina, check-ups, vermifugação, ração terapêutica | Plano VetAmigo Básico R$89/mês |
| **Seguro** | Emergências caras | Cirurgias, internação, acidentes, doenças graves, tratamentos oncológicos | Porto Seguro Pet R$120/mês (cobertura até R$15.000) |
| **Funerário** | Pós-vida | Cremação, sepultamento, urna, cerimônia, transporte, suporte emocional ao tutor | Memorial Pet R$35/mês |
| **Assistência** | Benefícios e serviços | Banho/tosa com desconto, hotel pet, transporte, televet 24h, nutricionista | Clube Pet Plus R$49/mês |
| **Emergencial** | Urgência imediata | Ambulância pet 24h, atendimento emergencial, primeiros socorros, desastres | SOS Pet R$29/mês |

### 13.2 Como Entra pelo Diário

O tutor nunca precisa procurar planos. A IA sugere baseado no contexto:

```
GATILHO                              SUGESTÃO DA IA
────────                             ──────────────

Tutor registra gasto de R$2.800      "Rex gastou R$2.800 em cirurgia.
em cirurgia emergencial              Um seguro pet de R$120/mês cobriria
                                     até R$15.000. Quer ver opções?"
                                     [Ver planos de Seguro]

IA detecta que Rex tem 8 anos        "Rex está entrando na fase sênior.
                                     Exames preventivos ficam mais frequentes.
                                     Um plano de Saúde pode economizar 40%.
                                     [Ver planos de Saúde]"

Tutor registra que viaja muito       "Você viajou 3x com Rex este semestre.
com o pet                            Um plano de Assistência inclui hotel pet
                                     e transporte com desconto.
                                     [Ver planos de Assistência]"

Rex completa 10 anos                 "Rex completou 10 anos. Parabéns!
                                     É hora de pensar no futuro dele.
                                     Um plano funerário garante dignidade.
                                     [Ver planos Funerários]"

IA detecta 3 emergências             "Rex teve 3 emergências em 6 meses.
em 6 meses                           Um plano Emergencial garante ambulância
                                     24h e atendimento imediato.
                                     [Ver planos Emergenciais]"
```

### 13.3 Tabela de Planos

```sql
CREATE TABLE pet_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    plan_type       VARCHAR(20) NOT NULL
                    CHECK (plan_type IN ('health','insurance','funeral','assistance','emergency')),
    provider_name   VARCHAR(100) NOT NULL,     -- "Porto Seguro Pet", "VetAmigo", "Memorial Pet"
    plan_name       VARCHAR(100),              -- "Plano Ouro", "Básico", "Premium"
    monthly_cost    DECIMAL(10,2),             -- R$ 89,00
    coverage_limit  DECIMAL(10,2),             -- R$ 15.000,00 (para seguros)
    start_date      DATE NOT NULL,
    end_date        DATE,                       -- NULL = vigente
    renewal_date    DATE,                       -- Próxima renovação
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active','expired','cancelled','pending')),
    coverage_details JSONB DEFAULT '{}',       -- Detalhes da cobertura
    documents       TEXT[] DEFAULT '{}',        -- URLs dos documentos (apólice, contrato)
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai_suggestion')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_plans_pet ON pet_plans(pet_id);
CREATE INDEX idx_plans_type ON pet_plans(plan_type);
CREATE INDEX idx_plans_active ON pet_plans(status) WHERE status = 'active';
CREATE INDEX idx_plans_renewal ON pet_plans(renewal_date);
```

### 13.4 Tabela de Sinistros/Uso do Plano

```sql
CREATE TABLE plan_claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES pet_plans(id) ON DELETE CASCADE,
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    claim_type      VARCHAR(30) NOT NULL,       -- "surgery", "emergency", "routine", "cremation", "grooming"
    description     TEXT NOT NULL,
    amount          DECIMAL(10,2),              -- Valor do sinistro
    reimbursed      DECIMAL(10,2),              -- Valor reembolsado
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied','partial','completed')),
    date            DATE NOT NULL,
    linked_expense_id  UUID,                    -- Vincula ao gasto no módulo Gastos
    linked_consultation_id UUID,                -- Vincula à consulta
    documents       TEXT[] DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_claims_plan ON plan_claims(plan_id);
CREATE INDEX idx_claims_pet ON plan_claims(pet_id);
```

### 13.5 Lente de Planos (visualização)

```
PLANOS DO REX

┌─────────────────────────────────────┐
│ Saúde · VetAmigo Básico             │
│ R$ 89/mês · Vigente até 03/2027    │
│ Consultas ✓  Vacinas ✓  Exames ✓   │
│ Usado: 3x este ano · Economia: R$420│
│ [Ver detalhes]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Seguro · Porto Seguro Pet Ouro      │
│ R$ 120/mês · Cobertura até R$15.000│
│ Cirurgias ✓  Internação ✓  Acidente ✓│
│ Usado: 1x (cirurgia R$2.800)       │
│ [Ver detalhes]                       │
└─────────────────────────────────────┘

┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│ IA sugere: Plano Emergencial        │
│ Rex teve 3 emergências em 6 meses.  │
│ SOS Pet R$29/mês garante ambulância │
│ 24h. [Ver opções]                    │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

Resumo financeiro:
├── Total planos: R$ 209/mês
├── Total gastos saúde sem plano: R$ 910/mês
├── Economia estimada: R$ 420/ano
└── ROI: planos se pagam em 6 meses
```

### 13.6 Notificações de Planos

| Tipo | Quando | Mensagem |
|------|--------|----------|
| Renovação | 30 dias antes | "Plano VetAmigo do Rex renova em 30 dias. R$89/mês." |
| Vencimento | No dia | "Plano Porto Seguro do Rex venceu hoje. Renovar?" |
| Sinistro aprovado | Quando processado | "Reembolso de R$2.100 aprovado (cirurgia do Rex)" |
| Sugestão IA | Quando contexto indica | "Baseado nos gastos, um seguro economizaria R$3.000/ano" |
| Economia mensal | Fim do mês | "Seus planos economizaram R$320 este mês para o Rex" |

### 13.7 Integração com Gastos

Todo plano gera entrada automática no módulo Gastos:
- Mensalidade como gasto recorrente (categoria: seguro/plano)
- Sinistro/reembolso como entrada positiva
- Relatório de ROI: quanto o plano economizou vs quanto custou

### 13.8 Integração com Aldeia (pós-MVP)

Parceiros da Aldeia podem oferecer planos com desconto baseado no Proof of Love:

| Proof of Love | Desconto em planos |
|--------------|-------------------|
| Bronze | 5% |
| Prata | 10% |
| Ouro | 15% |
| Diamante | 20% |

---

## 14. ESTRATÉGIA DE DESENVOLVIMENTO — Menos Manutenção, Mais Performance

### 14.1 Princípio Fundamental

> Cada coisa existe em 1 lugar só, faz 1 coisa só, e é reutilizada por tudo que precisa.

O app tem 18 classificações, 28 métricas clínicas, 8 tipos de mídia e 30+ tabelas. Se não for arquitetado com disciplina, vira um monstro impossível de manter. A estratégia é: pipeline unificado no servidor, hook único no celular, cache agressivo, IA em 1 chamada.

### 14.2 Servidor: Pipeline Único

O celular faz 1 chamada. O servidor orquestra tudo com módulos reutilizáveis:

```
classify-diary-entry (a ÚNICA Edge Function que o celular chama para entradas)
    │
    ├── modules/auth.ts          → valida JWT (1 vez, reutilizado por todos)
    ├── modules/media.ts         → comprime foto/vídeo, gera thumbnail
    ├── modules/stt.ts           → transcreve voz (se áudio do tutor)
    ├── modules/vision.ts        → Claude Vision (se foto/vídeo/scan)
    ├── modules/classifier.ts    → classifica em 18 tipos com 1 prompt
    ├── modules/ocr.ts           → extrai dados estruturados (se documento)
    ├── modules/narration.ts     → gera narração da IA sobre o pet (3ª pessoa)
    ├── modules/metrics.ts       → extrai métricas clínicas (se saúde)
    ├── modules/rag.ts           → busca contexto + gera embedding
    ├── modules/save.ts          → salva diary_entry + módulos confirmados
    └── modules/notify.ts        → cria notificações futuras
```

11 módulos, 1 ponto de entrada. Mudar lógica de OCR = editar `modules/ocr.ts` e todas as entradas são afetadas. Zero duplicação.

Edge Functions isoladas existem apenas para CRONs:

```
classify-diary-entry/     → chamada pelo celular (toda entrada)
check-vaccine-status/     → CRON diário 08:00 (verifica vencimentos)
refresh-health-views/     → CRON horário (atualiza views materializadas)
```

3 Edge Functions expostas. Não 13.

### 14.3 IA: 1 Prompt Faz Tudo

```
ERRADO (5 chamadas por entrada — lento e caro):
  1. Claude Vision → analisar foto
  2. Claude Text → classificar
  3. Claude Text → gerar narração
  4. Claude Text → extrair métricas
  5. Claude Text → gerar embedding text

CERTO (1 chamada — rápido e barato):
  1. Claude recebe foto + texto + contexto RAG
  → Retorna JSON com TUDO de uma vez:
     classifications, narration, mood, metrics,
     ocr_data, urgency, suggestions
```

Prompt unificado:

```typescript
// modules/classifier.ts

const prompt = `
Você é o classificador do auExpert. Analise a entrada e retorne APENAS JSON válido.

Pet: ${pet.name}, ${pet.breed}, ${pet.age}, peso: ${pet.weight}kg
Memórias recentes: ${ragContext}
Idioma: ${language}

Retorne:
{
  "classifications": [{ "type": "...", "confidence": 0.0-1.0, "extracted_data": {} }],
  "narration": "3ª pessoa sobre o pet, descritiva, max 150 palavras",
  "mood": "ecstatic|happy|calm|playful|tired|anxious|sad|sick",
  "mood_confidence": 0.0-1.0,
  "urgency": "none|low|medium|high",
  "clinical_metrics": [{ "type": "...", "value": 0, "unit": "...", "status": "..." }],
  "suggestions": ["sugestão para o tutor"],
  "ocr_data": {}
}

Tipos: moment, vaccine, exam, medication, consultation, allergy,
weight, surgery, symptom, food, expense, connection, travel,
partner, achievement, mood, insurance, plan.
`;
```

Resultado: 80% menos custo de API. Resposta em 2-3s em vez de 10-15s. 1 parse de JSON em vez de 5.

### 14.4 Embedding e Processamento em Background

O tutor nunca espera por tarefas secundárias:

```
SÍNCRONO (tutor espera — max 3s):
  1. Upload mídia comprimida
  2. classify-diary-entry → 1 chamada Claude
  3. Retorna: classifications + narration + mood

ASSÍNCRONO (background — tutor já viu resultado):
  4. Gera embedding no RAG
  5. Insere clinical_metrics
  6. Refresh materialized views
  7. Agenda notificações futuras (vacina, retorno)
  8. Atualiza health_score do pet
```

### 14.5 Celular: Hook Único

```
ERRADO (15 hooks diferentes):
  useCreateVaccine.ts
  useCreateExam.ts
  useCreateExpense.ts
  useCreateConsultation.ts
  useCreateWeight.ts
  ... (cada módulo com seu hook)

CERTO (1 hook):
  useDiaryEntry.ts
    ├── prepareMedia()            → comprime antes de enviar
    ├── submitEntry()             → chama classify-diary-entry
    ├── handleClassifications()   → mostra cards de sugestão
    ├── confirmClassification()   → confirma 1 módulo
    ├── confirmAll()              → confirma todos de uma vez
    └── saveToTimeline()          → optimistic update no cache
```

1 hook no celular, 1 Edge Function no servidor, 11 módulos reutilizáveis.

### 14.6 Banco: Views Materializadas

Em vez de JOIN complexo toda vez que o tutor abre uma lente:

```sql
-- View materializada: resumo de saúde (query instantânea)
CREATE MATERIALIZED VIEW pet_health_summary AS
SELECT
  p.id AS pet_id,
  p.name,
  p.health_score,
  (SELECT COUNT(*) FROM vaccines v
   WHERE v.pet_id = p.id AND v.status = 'overdue') AS vaccines_overdue,
  (SELECT COUNT(*) FROM vaccines v
   WHERE v.pet_id = p.id AND v.status = 'ok') AS vaccines_ok,
  (SELECT COUNT(*) FROM allergies a
   WHERE a.pet_id = p.id AND a.is_deleted = FALSE) AS allergies_count,
  (SELECT value FROM clinical_metrics cm
   WHERE cm.pet_id = p.id AND cm.metric_type = 'weight'
   ORDER BY cm.measured_at DESC LIMIT 1) AS current_weight
FROM pets p WHERE p.is_deleted = FALSE;

-- Refresh via CRON (refresh-health-views a cada hora)
REFRESH MATERIALIZED VIEW CONCURRENTLY pet_health_summary;
```

Lente Prontuário carrega em 1 query. Não em 6 JOINs.

JSONB onde pode, tabela onde deve:

```
TABELAS SEPARADAS (precisa de query independente):
  diary_entries, clinical_metrics, vaccines, allergies,
  expenses, pet_plans, plan_claims

JSONB DENTRO DE diary_entries (não precisa de query direta):
  classifications, ocr_data, video_analysis, pet_audio_analysis
```

### 14.7 Cache: 3 Camadas

```
CAMADA 1: React Query com staleTime generoso
─────────────────────────────────────────────
  diary_timeline:    5 min     (muda frequentemente)
  health_summary:    1 hora    (view materializada)
  vaccines:          30 min    (muda raramente)
  expenses_monthly:  15 min    (muda com notas fiscais)
  clinical_metrics:  1 hora    (muda com exames)
  pet_plans:         24 horas  (quase nunca muda)
  pet_profile:       30 min    (muda raramente)
  allergies:         1 hora    (muda raramente)
  breeds_list:       Infinity  (nunca muda)

CAMADA 2: AsyncStorage persistente
──────────────────────────────────
  Cache do React Query sobrevive ao app ser fechado
  Tutor abre app → vê dados imediatamente do disco
  Refetch silencioso em background

CAMADA 3: Paginação inteligente
───────────────────────────────
  Timeline: 20 entradas iniciais, mais 20 por scroll
  Lentes: carregam sob demanda no primeiro toque
  NUNCA carrega tudo de uma vez
```

### 14.8 Optimistic Updates

O truque mais importante de performance. O tutor vê resultado instantâneo:

```typescript
// Quando o tutor envia uma entrada:

// 1. INSTANTÂNEO (0ms — antes de chamar servidor):
queryClient.setQueryData(['diary', petId], old => ({
  ...old,
  entries: [
    { ...newEntry, ai_narration: null, status: 'pending' },
    ...old.entries
  ]
}));
// Entrada aparece na timeline com placeholder "Gerando narração..."

// 2. SERVIDOR (2-3s — em background):
const result = await classify(entry);

// 3. ATUALIZA (substitui placeholder por narração real):
queryClient.setQueryData(['diary', petId], old => ({
  ...old,
  entries: old.entries.map(e =>
    e.id === tempId ? { ...e, ...result, status: 'done' } : e
  )
}));
// Narração IA aparece suavemente, tutor já estava fazendo outra coisa
```

### 14.9 Compressão de Mídia no Celular

Nunca enviar mídia original. Sempre comprimir antes:

```typescript
// Foto: de 5-10MB para 200-400KB
import * as ImageManipulator from 'expo-image-manipulator';
const compressed = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1200 } }],
  { compress: 0.7, format: 'jpeg' }
);

// Vídeo: de 50-100MB para 5-10MB
// Usar expo-video-thumbnails + compressão FFmpeg via lib nativa

// Áudio: de 2-5MB para 200-500KB
// Usar formato opus/aac com bitrate reduzido
```

Upload 10x mais rápido. Storage 10x mais barato.

### 14.10 FlatList Otimizada

```typescript
<FlatList
  data={entries}
  renderItem={renderDiaryEntry}
  keyExtractor={item => item.id}
  windowSize={5}                    // Renderiza só 5 telas ao redor
  maxToRenderPerBatch={10}          // Max 10 itens por batch
  removeClippedSubviews={true}      // Remove itens fora da tela
  initialNumToRender={10}           // 10 no load inicial
  getItemLayout={getItemLayout}     // Layout pré-calculado
  onEndReached={loadMore}           // Paginação infinita
  onEndReachedThreshold={0.5}       // Carrega a 50% do fim
/>
```

60 FPS garantido mesmo com 1000+ entradas.

### 14.11 Tempos Máximos (contrato de performance)

| Ação do tutor | Tempo máximo | Como garantir |
|---------------|-------------|---------------|
| Abrir app | < 1s | Cache persistente AsyncStorage |
| Abrir diário do pet | < 0.5s | Dados já no React Query |
| Toque no "+" | Instantâneo | Modal pré-renderizado |
| Tirar foto/vídeo | Nativo | Câmera do sistema |
| Enviar entrada | < 3s | Optimistic update + IA background |
| Ver narração IA | < 3s | Vem junto com classificação |
| Abrir lente | < 1s | Cache ou view materializada |
| Scroll timeline | 60 FPS | FlatList otimizada |
| Gerar PDF | < 2s | expo-print (HTML local) |
| Buscar no diário | < 1s | Index full-text no Supabase |

### 14.12 Organização de Código

```
lib/
├── supabase.ts                → Cliente Supabase (1 arquivo)
├── ai/
│   ├── classifier.ts          → Prompt unificado + parse JSON
│   ├── narrator.ts            → Lógica de narração da IA (3ª pessoa)
│   └── metrics.ts             → Extração de métricas clínicas
├── media/
│   ├── compress.ts            → Comprime foto/vídeo/áudio
│   ├── upload.ts              → Upload para Storage
│   └── thumbnail.ts           → Thumbnail de vídeo
├── offline/
│   ├── cache.ts               → Persistência React Query
│   ├── queue.ts               → Fila offline
│   └── sync.ts                → Sincronização ao reconectar
└── notifications.ts           → Push notifications

hooks/
├── useDiaryEntry.ts           → O ÚNICO hook de entrada
├── useLens.ts                 → Hook genérico para qualquer lente
├── useNetwork.ts              → Online/offline
├── usePets.ts                 → CRUD de pets
└── useAuth.ts                 → Login/sessão

components/
├── ui/                        → Button, Input, Card, Modal, Badge, Alert
├── diary/
│   ├── DiaryTimeline.tsx      → FlatList da timeline
│   ├── DiaryEntry.tsx         → Card de uma entrada
│   ├── InputSelector.tsx      → Modal 8 elementos
│   ├── ClassificationCard.tsx → Card de sugestão IA
│   └── NarrationBubble.tsx    → Balão de narração da IA sobre o pet
├── lenses/
│   ├── LensGrid.tsx           → Grid de lentes no dashboard
│   └── LensScreen.tsx         → Tela genérica (1 componente = 7+ lentes)
└── NetworkGuard.tsx           → Banner offline

supabase/functions/
├── classify-diary-entry/
│   ├── index.ts               → Entry point único
│   └── modules/               → 11 módulos reutilizáveis
│       ├── auth.ts
│       ├── media.ts
│       ├── stt.ts
│       ├── vision.ts
│       ├── classifier.ts
│       ├── ocr.ts
│       ├── narration.ts
│       ├── metrics.ts
│       ├── rag.ts
│       ├── save.ts
│       └── notify.ts
├── check-vaccine-status/      → CRON diário
└── refresh-health-views/      → CRON horário
```

Total: ~35 arquivos de código. Não 100+.

### 14.13 Lente Genérica (1 componente = todas as lentes)

```typescript
// components/lenses/LensScreen.tsx
// REUTILIZADO por Prontuário, Nutrição, Gastos, Amigos, Conquistas, etc.

export function LensScreen({ petId, lensType, title, icon }) {
  const { data, isLoading } = useLens(petId, lensType);

  const renderers = {
    health:       HealthLensContent,
    nutrition:    NutritionLensContent,
    expenses:     ExpensesLensContent,
    friends:      FriendsLensContent,
    achievements: AchievementsLensContent,
    happiness:    HappinessLensContent,
    plans:        PlansLensContent,
    travels:      TravelsLensContent,
  };

  const Content = renderers[lensType];
  return (
    <Screen title={title} icon={icon}>
      {isLoading ? <Skeleton /> : <Content data={data} />}
    </Screen>
  );
}
```

1 componente de tela, 8 renderers enxutos. Em vez de 8 telas com 80% de código duplicado.

### 14.14 Deploy e Atualizações

```
DEPLOY (3 comandos):
  supabase functions deploy     → Edge Functions
  supabase db push              → Migrations SQL
  eas build --profile preview   → APK

ATUALIZAÇÃO RÁPIDA (sem gerar APK):
  eas update --branch production --message "Fix narração"
  → Tutores recebem atualização na próxima abertura
  → Sem Play Store, sem download de APK
  → 90% das atualizações são OTA (instantâneas)
  → APK novo só quando mexe em pacote nativo (câmera, mic)

MONITORAMENTO:
  Supabase Dashboard → logs Edge Functions + queries lentas
  Sentry (grátis)    → crashes no React Native
  React Query DevTools → cache em dev
```

### 14.15 Resumo da Estratégia

| Área | Estratégia | Impacto |
|------|-----------|---------|
| Servidor | 1 Edge Function + 11 módulos (não 13 isoladas) | 70% menos código duplicado |
| IA | 1 prompt unificado (não 5 chamadas) | 80% menos custo, 3x mais rápido |
| Banco | Views materializadas + JSONB | Queries 5x mais rápidas |
| Cache | React Query persistente + staleTime generoso | 90% menos requisições |
| Celular | Optimistic updates + compressão mídia | Tutor nunca espera |
| Código | Hook único + lente genérica + pipeline | ~35 arquivos (não 100+) |
| Lista | FlatList otimizada + paginação | 60 FPS sempre |
| Deploy | EAS Update OTA + Supabase CLI | Atualização em minutos |
| Embedding | Background (não síncrono) | Não bloqueia tutor |
| Mídia | Compressão no celular antes de upload | 10x menos storage/banda |

---

## 15. MÉTRICAS DE SUCESSO

| Métrica | Como medir | Meta |
|---------|-----------|------|
| Entradas por tutor/semana | COUNT diary_entries últimos 7 dias | >= 5 |
| % de fotos classificadas | classifications != '[]' / total com foto | >= 80% |
| % de sugestões aceitas | confirmed = true / total suggestions | >= 60% |
| Tempo médio de entrada | timestamp entre abrir "+" e salvar | < 30 segundos |
| Módulos auto-populados | COUNT de linked_*_id != NULL | >= 3 módulos/mês |
| Retenção 30 dias | Tutores ativos após 30 dias | >= 40% |
| NPS do tutor | Pesquisa in-app | >= 70 |

---

## 16. RESUMO EXECUTIVO

O auExpert deixa de ser um app com 12 módulos que o tutor precisa navegar e passa a ser um app com 1 entrada (o Diário) e várias lentes de consulta.

O tutor aprende um único hábito: **registrar o que aconteceu com o pet** — usando qualquer um dos 8 elementos de entrada: foto, vídeo, voz, som do pet, texto, galeria, scanner OCR ou upload de documento. A IA entende, classifica, narra em 3ª pessoa e organiza em tempo real. Os módulos se populam sozinhos.

A câmera é a ferramenta de navegação mais poderosa do app. Uma foto de carteirinha de vacina resolve o que antes precisava de 8 campos de formulário. Uma foto de nota fiscal cria um registro de gasto que o tutor nunca teria paciência de digitar. Um vídeo do pet mancando gera alerta de saúde automático. Um latido gravado revela o estado emocional do pet.

O resultado é um app que parece simples mas é extremamente poderoso por dentro. O tutor vê apenas o Diário e suas narrações. Por baixo, 18 tipos de classificação, 1 Edge Function com 11 módulos, 8 tipos de mídia, 28 métricas clínicas com gráficos de evolução, 5 tipos de plano pet e ~35 arquivos de código trabalham em silêncio.

A arquitetura é disciplinada: 1 prompt de IA faz tudo (80% menos custo), views materializadas eliminam JOINs pesados, cache de 3 camadas reduz requisições em 90%, optimistic updates garantem que o tutor nunca espera, e EAS Update OTA permite atualizar sem gerar APK novo.

Exatamente como a tagline promete: **uma inteligência única para o seu pet**.

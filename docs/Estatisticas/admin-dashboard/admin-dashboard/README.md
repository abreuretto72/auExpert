# auExpert · Admin Dashboard

Painel administrativo web do auExpert, para monitorar uso de IA, custos, erros e usuários.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS com paleta Elite (Ametista + Jade sobre dark)
- Supabase Auth + SSR (`@supabase/ssr`)
- lucide-react para ícones
- Hospedagem: Vercel
- Domínio: `admin.auexpert.com.br`

## Estrutura

```
admin-dashboard/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← layout com Sidebar
│   │   ├── page.tsx            ← Visão geral (KPIs)
│   │   ├── users/page.tsx      ← Lista de usuários
│   │   ├── ai-costs/page.tsx   ← Custos por função/modelo
│   │   └── errors/page.tsx     ← Incidentes recentes
│   ├── login/page.tsx          ← Login (email + senha)
│   ├── layout.tsx              ← RootLayout
│   └── globals.css             ← Estilos + fontes
├── components/
│   ├── sidebar.tsx
│   └── stat-card.tsx
├── lib/
│   ├── supabase-server.ts      ← cliente p/ Server Components
│   ├── supabase-client.ts      ← cliente p/ Browser
│   ├── types.ts                ← tipos das RPCs
│   └── utils.ts                ← formatadores
├── middleware.ts               ← bloqueia não-admin
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## Rotas

| Rota          | O que faz                                                   |
|---------------|-------------------------------------------------------------|
| `/login`      | Autenticação via email/senha (Supabase Auth)                |
| `/`           | Visão geral: totais do sistema, uso de IA, saúde, custos    |
| `/users`      | Lista paginada de usuários com consumo individual           |
| `/ai-costs`   | Breakdown de custo/performance por função e por modelo      |
| `/errors`     | Erros categorizados + lista dos últimos 50 incidentes       |

## Autenticação

- Só admins entram. Middleware verifica `users.role = 'admin'` a cada request
- Não-admins são deslogados e redirecionados pra `/login?error=not_admin`
- A RPCs `get_admin_*` também verificam `is_admin()` no backend (defesa em profundidade)

## Rodar localmente

```bash
cd admin-dashboard
cp .env.example .env.local
# edite .env.local com SUPABASE_URL e ANON_KEY

npm install
npm run dev
```

Abra http://localhost:3000, faça login com o email admin.

## Deploy na Vercel

Siga `GUIA_DEPLOY_HOSTGATOR.md` na raiz do repo (instruções passo-a-passo de DNS e Vercel).

## Design system

Paleta Elite aplicada em Tailwind:

| Cor        | Hex      | Uso                              |
|------------|----------|----------------------------------|
| `bg`       | #0D0E16  | Fundo principal                  |
| `bg-deep`  | #08090F  | Fundo mais escuro (sidebar)      |
| `bg-card`  | #161826  | Cards, tabelas                   |
| `border`   | #2A2D3E  | Bordas                           |
| `text`     | #F0EDF5  | Texto primário                   |
| `ametista` | #8F7FA8  | Ação, CTAs                       |
| `jade`     | #4FA89E  | IA, sucesso, destaques           |
| `warning`  | #D4A574  | Alertas moderados                |
| `danger`   | #C2645E  | Erros críticos                   |
| `success`  | #7FA886  | Status OK                        |

Tipografia:
- **Playfair Display** (serif, números e títulos)
- **Inter** (sans, corpo)
- **JetBrains Mono** (dados técnicos, emails, IDs)

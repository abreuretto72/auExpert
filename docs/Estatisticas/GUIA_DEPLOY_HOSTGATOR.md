# Guia de Deploy — admin.auexpert.com.br

Passo a passo completo, do zero ao ar. Estimativa total: **1 hora**.

**O que você vai ter no final:** dashboard admin rodando em `https://admin.auexpert.com.br`, com SSL, protegido por login, visível apenas para `aberu@multiversodigital.com.br`.

---

## Parte 1 · Aplicar migrations no Supabase (10 min)

1. Abra https://supabase.com/dashboard/project/peqpkzituzpwukzusgcq
2. Menu lateral → **SQL Editor**
3. Clique **New query**
4. **Cole o conteúdo de `migration_admin_dashboard.sql`** e clique **Run**

Validação: rode no mesmo SQL Editor
```sql
SELECT id, email, role FROM public.users WHERE email = 'aberu@multiversodigital.com.br';
```
Deve retornar sua linha com `role = 'admin'`.

Se o conteúdo `ai_invocations` ainda não existe no seu banco (não aplicou as migrations anteriores), as RPCs vão funcionar mas retornarão zeros nas seções de custo/erros. Você pode aplicar depois.

---

## Parte 2 · Commit do código do dashboard (10 min)

1. Descompacte `admin-dashboard.zip` dentro do seu repo local auExpert:
   ```
   auExpert/
   ├── [seus arquivos mobile]
   └── admin-dashboard/          ← novo
   ```

2. No terminal, dentro da pasta `admin-dashboard/`:
   ```bash
   cd admin-dashboard
   cp .env.example .env.local
   ```

3. Edite `.env.local` e preencha o `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
   - Supabase Dashboard → Settings → API → `anon public` key
   - Cole em `.env.local`

4. Teste local:
   ```bash
   npm install
   npm run dev
   ```
   Abra http://localhost:3000/login, entre com `aberu@multiversodigital.com.br` e a senha que você usa no app.

5. Se funcionou, faça commit:
   ```bash
   cd ..  # voltar pra raiz do repo
   git add admin-dashboard
   git commit -m "feat: add admin dashboard"
   git push
   ```

---

## Parte 3 · Deploy na Vercel (15 min)

1. Acesse https://vercel.com e clique **Sign up** (ou login se já tem conta)
2. Escolha **Continue with GitHub** — autorize a Vercel a acessar seus repos
3. Clique **Add New → Project**
4. Na lista de repositórios, selecione **auExpert** e clique **Import**

5. **IMPORTANTE** — tela de configuração:
   - **Framework Preset:** Next.js (deve detectar automático)
   - **Root Directory:** clique em **Edit** e selecione `admin-dashboard`
   - **Build Command:** deixar padrão (`next build`)
   - **Output Directory:** deixar padrão

6. Expanda **Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://peqpkzituzpwukzusgcq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (cole a anon key)

7. Clique **Deploy** — em ~2 minutos você tem uma URL tipo `auexpert-[hash].vercel.app`

8. Acesse essa URL, faça login. Se funcionar, siga pra Parte 4.

---

## Parte 4 · Apontar o subdomínio no HostGator (15 min)

1. Entre no painel do HostGator (cPanel)
2. Procure **Zone Editor** (ou **Editor de DNS**)
3. Clique no domínio **auexpert.com.br**
4. Clique **Add Record** (ou **Adicionar Registro**)

5. Preencha assim:
   - **Type:** CNAME
   - **Name:** `admin` (só `admin`, o sistema adiciona o `.auexpert.com.br`)
   - **TTL:** 14400 (ou deixa o padrão)
   - **CNAME / Record:** `cname.vercel-dns.com`

6. Salve

**IMPORTANTE:** NÃO mexa em:
- Registros tipo `A` do domínio raiz (onde seu site está)
- Registros tipo `MX` (emails)
- Qualquer outro `CNAME` existente

Você está **adicionando** um novo registro, não alterando os existentes.

---

## Parte 5 · Adicionar domínio na Vercel (5 min)

1. Volte pro dashboard Vercel → seu projeto
2. **Settings → Domains**
3. Digite `admin.auexpert.com.br` e clique **Add**
4. A Vercel detecta o CNAME automaticamente e valida
5. SSL é emitido automaticamente (leva ~5 min)

**Aguarde:** a propagação DNS pode levar de 5 a 60 minutos. Verifique em https://dnschecker.org/#CNAME/admin.auexpert.com.br

Quando validar, acesse https://admin.auexpert.com.br — deve abrir a tela de login com SSL ativo (cadeado no navegador).

---

## Parte 6 · Deploy automático daqui pra frente

A partir de agora, toda vez que você fizer `git push` na branch principal:
- Vercel detecta o push
- Roda `npm run build` em ~1 minuto
- Publica automaticamente em `admin.auexpert.com.br`

Cada Pull Request ganha uma **preview URL** separada (útil pra testes).

---

## Troubleshooting comum

### "Este site não pode ser acessado"
Aguarde mais 30 min — propagação DNS. Verifique em https://dnschecker.org

### Login funciona local mas não em produção
Verifique se `NEXT_PUBLIC_SUPABASE_ANON_KEY` foi adicionada na Vercel (Settings → Environment Variables) e faça um **Redeploy**.

### "Access denied: admin role required"
Rode no Supabase SQL Editor:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'aberu@multiversodigital.com.br';
```

### Site principal auexpert.com.br parou de funcionar
Você mexeu em DNS que não devia. Volte ao Zone Editor e verifique se o registro tipo `A` do `@` ainda aponta pro IP do HostGator. Se não souber, abra ticket de suporte HostGator com "restaurar DNS padrão".

### Email contato@auexpert.com.br parou
Verifique se registros **MX** estão intactos no Zone Editor. Se sumiram, abra ticket HostGator pedindo restauração.

---

## Custos

| Item           | Custo           |
|----------------|-----------------|
| Vercel         | US$ 0 (plano Hobby, suficiente) |
| Domínio        | Já pago no HostGator |
| SSL            | US$ 0 (Vercel emite) |
| Supabase       | No seu plano atual |

**Limite do plano Hobby da Vercel:** 100 GB de banda/mês — impossível estourar com um dashboard admin.

---

## Acesso adicional (se precisar convidar outro admin depois)

Rode no Supabase SQL Editor:

```sql
-- Promover outro usuário a admin
UPDATE public.users SET role = 'admin' WHERE email = 'outro@email.com';

-- Remover privilégio admin
UPDATE public.users SET role = 'tutor_owner' WHERE email = 'outro@email.com';
```

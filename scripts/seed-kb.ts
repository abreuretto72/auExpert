#!/usr/bin/env -S npx tsx
/**
 * scripts/seed-kb.ts
 *
 * Le arquivos do projeto (CLAUDE.md, VISION.md, telas com JSDoc, i18n) e
 * envia chunks pra EF scan-app-for-kb que gera embedding (Gemini) + insere
 * em support_kb_chunks.
 *
 * Uso:
 *   KB_SECRET=auexpert-kb-2026 npx tsx scripts/seed-kb.ts
 *
 * Roda manualmente apos cada release importante. Pra automacao, ver
 * supabase/functions/update-kb-on-deploy.
 */
import fs from 'fs';
import path from 'path';

const KB_URL = process.env.KB_URL ?? 'https://peqpkzituzpwukzusgcq.supabase.co/functions/v1/scan-app-for-kb';
const KB_SECRET = process.env.KB_SECRET ?? 'auexpert-kb-2026';
const BATCH_SIZE = 5;

interface Chunk {
  source: 'screen' | 'flow' | 'faq' | 'rule' | 'release_note';
  source_ref: string;
  title: string;
  content: string;
  language: string;
}

const chunks: Chunk[] = [];

// 1. CLAUDE.md
if (fs.existsSync('CLAUDE.md')) {
  const content = fs.readFileSync('CLAUDE.md', 'utf-8');
  chunks.push({ source: 'rule', source_ref: 'CLAUDE.md', title: 'Regras de Desenvolvimento auExpert', content, language: 'pt-BR' });
}

// 2. VISION.md
if (fs.existsSync('VISION.md')) {
  const content = fs.readFileSync('VISION.md', 'utf-8');
  chunks.push({ source: 'rule', source_ref: 'VISION.md', title: 'Visao Estrategica auExpert', content, language: 'pt-BR' });
}

// 3. Telas com JSDoc (extrai apenas comentarios)
const screenDirs = [
  'app/(app)/pet/[id]',
  'app/(app)/pet/[id]/diary',
  'app/(app)/pet/[id]/health',
  'app/(app)/professional',
  'app/(app)/professional/agents',
];

for (const dir of screenDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue;
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const comments = content.match(/\/\*\*[\s\S]*?\*\//g) ?? [];
    if (comments.length > 0) {
      chunks.push({
        source: 'screen',
        source_ref: fullPath.replace(/\\/g, '/'),
        title: `Tela: ${file}`,
        content: comments.join('\n\n'),
        language: 'pt-BR',
      });
    }
  }
}

// 4. i18n pt-BR (textos do app)
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) Object.assign(acc, flatten(v as Record<string, unknown>, key));
    else acc[key] = String(v);
    return acc;
  }, {} as Record<string, string>);
}

if (fs.existsSync('i18n/pt-BR.json')) {
  const i18n = JSON.parse(fs.readFileSync('i18n/pt-BR.json', 'utf-8'));
  const flat = flatten(i18n);
  // Quebra em chunks por bloco top-level (auth, diary, health...) para nao ter chunk gigante
  const byBlock: Record<string, Record<string, string>> = {};
  for (const [k, v] of Object.entries(flat)) {
    const top = k.split('.')[0];
    byBlock[top] = byBlock[top] ?? {};
    byBlock[top][k] = v;
  }
  for (const [block, kv] of Object.entries(byBlock)) {
    const c = Object.entries(kv).map(([k, v]) => `${k}: ${v}`).join('\n');
    if (c.length > 200) {
      chunks.push({
        source: 'rule',
        source_ref: `i18n/pt-BR.json#${block}`,
        title: `Textos do app — ${block}`,
        content: c,
        language: 'pt-BR',
      });
    }
  }
}

// 5. Planos de assinatura (estatico, sera atualizado pela EF update-kb-on-deploy)
chunks.push({
  source: 'rule',
  source_ref: 'subscription_plans',
  title: 'Planos de Assinatura',
  content: `PLANO GRATUITO: 1 pet, IA basica, sem profissional vinculado.
PLANO ELITE (R$ 49,90/mes): pets ilimitados, IA exclusiva por pet, profissionais ilimitados, todos os agentes burocraticos (anamnese, prontuario, receituario, ASA, TCI, notificacao sanitaria, relatorio de alta).
PROFISSIONAL: sempre gratuito quando atende pets de tutores Elite.`,
  language: 'pt-BR',
});

// ── Enviar em lotes ─────────────────────────────────────────────────────────
async function main() {
  console.log(`[seed-kb] ${chunks.length} chunks identificados.`);
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`[seed-kb] enviando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)...`);
    const res = await fetch(KB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-kb-secret': KB_SECRET },
      body: JSON.stringify({ chunks: batch }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`  erro HTTP ${res.status}:`, json);
    } else {
      console.log(`  inserted=${json.inserted}/${json.total}`);
      for (const r of json.results ?? []) {
        if (!r.ok) console.warn(`    falhou: ${r.title} — ${r.error}`);
      }
    }
  }
  console.log('[seed-kb] concluido.');
}

main().catch((e) => { console.error(e); process.exit(1); });

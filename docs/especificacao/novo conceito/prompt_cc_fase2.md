# Prompt para Claude Code — Fase 2

Copie o bloco abaixo e cole no Claude Code.

---

## PROMPT:

```
CONTEXTO: Este é o início da FASE 2 do auExpert. A Fase 1 (conceito Diário-cêntrico) já foi implementada. Leia docs/specs/fase2_plano_implementacao.md para o plano completo.

RESUMO DO QUE JÁ EXISTE (Fase 1):
- Dashboard do pet com diário protagonista
- InputSelector com Foto, Falar, Escrever funcionando
- classify-diary-entry (Edge Function) classificando e narrando em 3ª pessoa
- Cards de sugestão da IA
- clinical_metrics, app_config, metric_references (tabelas)
- useDiaryEntry hook com optimistic updates
- Timeline com narração, tags e humor

O QUE A FASE 2 ADICIONA (4 sprints):
1. Galeria — upload de fotos/vídeos da galeria do celular
2. Scanner OCR — modo câmera para documentos com extração de dados
3. Prontuário completo — lente com vacinas + exames + consultas + métricas + gráficos
4. Gastos — lente de controle financeiro com OCR de notas fiscais

---

REGRAS GERAIS (valem para TODAS as sprints):
- Narração SEMPRE em 3ª pessoa. NUNCA "Fui...", "Meu dono..."
- Preservar TUDO da Fase 1 (zero regressão)
- Não remover colunas ou tabelas existentes
- Usar is_active (não is_deleted) para soft delete — consistente com banco atual
- Toda tabela nova: RLS ativo + policy user_id = auth.uid()
- Toda tabela nova: user_id UUID NOT NULL REFERENCES users(id)
- Usar o hook useDiaryEntry existente (não criar hooks paralelos)
- Usar o componente LensScreen genérico para lentes novas

---

NÃO EXECUTE NADA AINDA.

Primeiro confirme que entendeu respondendo:
1. Quais tabelas NOVAS precisam ser criadas na Fase 2?
2. Quais botões do InputSelector serão ativados?
3. Quais lentes serão funcionais após a Fase 2?
4. O que NÃO pode quebrar da Fase 1?

Depois que confirmar, eu indico qual Sprint executar primeiro.
```

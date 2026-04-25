import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate } from '@/lib/utils';
import { type AdminSupportMessages } from '@/lib/types';
import { ConversationView } from './conversation-view';

export const dynamic = 'force-dynamic';

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_admin_support_messages', {
    p_conversation_id: id,
  });

  if (error) return <div className="text-danger">Erro: {error.message}</div>;

  const d = data as AdminSupportMessages;
  if (!d?.conversation) {
    return (
      <div className="space-y-4">
        <Link href="/support" className="text-jade text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <div className="text-text-dim italic">Conversa não encontrada.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/support" className="text-jade text-sm flex items-center gap-1 hover:underline">
        <ChevronLeft size={16} /> Voltar para a lista
      </Link>

      <header className="bg-bg-card border border-border rounded-xl p-5">
        <h1 className="font-display text-2xl mb-1">
          {d.conversation.user_name ?? d.conversation.user_email ?? 'Tutor anônimo'}
        </h1>
        <div className="text-text-muted text-sm font-mono mb-2">{d.conversation.user_email}</div>
        {d.conversation.subject && (
          <div className="text-text-muted text-sm italic mb-2">"{d.conversation.subject}"</div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-text-dim">
          <span>Criada em {fmtDate(d.conversation.created_at)}</span>
          {d.conversation.app_version && <span>app v{d.conversation.app_version}</span>}
          {d.conversation.platform && <span>{d.conversation.platform}</span>}
          {d.conversation.locale && <span>{d.conversation.locale}</span>}
          <span>{d.conversation.message_count} mensagens</span>
        </div>
      </header>

      <ConversationView conversation={d.conversation} initialMessages={d.messages} />
    </div>
  );
}

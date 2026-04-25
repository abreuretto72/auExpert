'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Send, Bot, UserRound, ShieldCheck, Power, Lock } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import {
  type SupportConversationRow,
  type SupportMessageRow,
} from '@/lib/types';
import { sendAdminReply, closeConversation, reactivateAi } from '../actions';

interface Props {
  conversation: SupportConversationRow;
  initialMessages: SupportMessageRow[];
}

export function ConversationView({ conversation, initialMessages }: Props) {
  const [messages, setMessages] = useState<SupportMessageRow[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final ao abrir
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    setError(null);
    const text = input.trim();
    if (!text) return;

    // Optimistic
    const optimistic: SupportMessageRow = {
      id: `temp-${Date.now()}`,
      sender: 'admin',
      sender_user_id: null,
      content: text,
      attachments: null,
      ai_model: null,
      ai_tokens_in: null,
      ai_tokens_out: null,
      read_by_user: false,
      read_by_admin: true,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    startTransition(async () => {
      const res = await sendAdminReply({
        conversation_id: conversation.id,
        content: text,
        takeover: true,
      });
      if (!res.ok) {
        setError(res.error ?? 'Erro desconhecido');
        // Reverte optimistic em caso de erro
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      }
    });
  }

  async function handleClose() {
    if (!confirm('Fechar esta conversa? O tutor pode reabrir mandando nova mensagem.')) return;
    startTransition(async () => {
      await closeConversation(conversation.id);
    });
  }

  async function handleReactivateAi() {
    if (!confirm('Reativar IA nesta conversa? A próxima mensagem do tutor será respondida pela IA.')) return;
    startTransition(async () => {
      await reactivateAi(conversation.id);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
      {/* Mensagens */}
      <div className="bg-bg-card border border-border rounded-xl flex flex-col min-h-[500px] max-h-[700px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-text-dim italic text-center py-12">Sem mensagens ainda.</div>
          )}
          {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        </div>

        <div className="border-t border-border p-3">
          {error && <div className="text-danger text-xs mb-2">{error}</div>}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Resposta como admin (Cmd/Ctrl+Enter envia)…"
              className="input resize-none flex-1"
              disabled={pending || conversation.status === 'closed'}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || pending || conversation.status === 'closed'}
              className="bg-jade text-bg-deep h-11 w-11 rounded-lg flex items-center justify-center hover:bg-jade/80 disabled:opacity-40 transition"
              title="Enviar (Cmd/Ctrl+Enter)"
            >
              <Send size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar de info + ações */}
      <aside className="space-y-3">
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-ametista text-[10px] uppercase tracking-widest font-medium">Status</h3>
          <StatusRow
            label={conversation.ia_active ? 'IA ativa' : 'IA pausada'}
            icon={<Bot size={14} />}
            color={conversation.ia_active ? 'jade' : 'text-muted'}
          />
          {conversation.escalated_to_human && (
            <StatusRow
              label="Escalada pra humano"
              icon={<UserRound size={14} />}
              color="warning"
            />
          )}
          <StatusRow
            label={`Status: ${conversation.status}`}
            icon={<ShieldCheck size={14} />}
            color="text"
          />
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-2">Ações</h3>

          {!conversation.ia_active && conversation.status === 'open' && (
            <ActionButton
              label="Reativar IA"
              icon={<Power size={14} />}
              onClick={handleReactivateAi}
              disabled={pending}
            />
          )}

          {conversation.status === 'open' && (
            <ActionButton
              label="Fechar conversa"
              icon={<Lock size={14} />}
              onClick={handleClose}
              disabled={pending}
              danger
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessageRow }) {
  const role =
    message.sender === 'user'  ? 'user'
  : message.sender === 'admin' ? 'admin'
  :                              'ai';

  const styles = {
    user: {
      align: 'justify-end',
      bg: 'bg-bg-deep border-border',
      label: 'Tutor',
      icon: <UserRound size={12} />,
      labelColor: 'text-text-muted',
    },
    ai: {
      align: 'justify-start',
      bg: 'bg-ametista/10 border-ametista/30',
      label: 'IA',
      icon: <Bot size={12} />,
      labelColor: 'text-ametista',
    },
    admin: {
      align: 'justify-start',
      bg: 'bg-jade/10 border-jade/30',
      label: 'Admin (você)',
      icon: <ShieldCheck size={12} />,
      labelColor: 'text-jade',
    },
  } as const;

  const s = styles[role];
  return (
    <div className={`flex ${s.align}`}>
      <div className={`max-w-[75%] border rounded-2xl px-4 py-3 ${s.bg}`}>
        <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium mb-1 ${s.labelColor}`}>
          {s.icon}
          {s.label}
        </div>
        <div className="text-text text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
        <div className="text-text-dim text-[10px] mt-1.5 font-mono">
          {fmtDate(message.created_at)}
          {message.ai_model && (
            <span className="ml-2 text-ametista/60">{message.ai_model}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, icon, color }: { label: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    jade: 'text-jade',
    warning: 'text-warning',
    'text-muted': 'text-text-muted',
    text: 'text-text',
  };
  return (
    <div className={`flex items-center gap-2 text-xs ${colorMap[color] ?? 'text-text-muted'}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ActionButton({
  label, icon, onClick, disabled, danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition disabled:opacity-40 ' +
        (danger
          ? 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20'
          : 'bg-bg-deep text-text-muted border-border hover:text-text')
      }
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * usePetAssistant — hook for the conversational AI assistant per pet.
 *
 * Calls the `pet-assistant` Edge Function with the tutor's message
 * and maintains in-memory conversation history (last 10 messages).
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getLocales } from 'expo-localization';

export interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: string;
}

export function usePetAssistant(petId: string) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const language = getLocales()[0]?.languageTag ?? 'pt-BR';

  // Keep a ref of current messages to build history inside sendMessage
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  // Convert to Anthropic-compatible format (last 10 messages)
  const toAnthropicHistory = (msgs: ChatMessage[]) =>
    msgs.slice(-10).map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id:        `user-${Date.now()}`,
      role:      'user',
      content:   trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'pet-assistant',
        {
          body: {
            pet_id:               petId,
            message:              trimmed,
            language,
            conversation_history: toAnthropicHistory(messagesRef.current),
          },
        },
      );

      if (fnError) throw fnError;
      if (!data?.reply) throw new Error('Empty reply from assistant');

      const assistantMessage: ChatMessage = {
        id:        `assistant-${Date.now()}`,
        role:      'assistant',
        content:   data.reply as string,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [petId, isLoading, language]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
  };
}

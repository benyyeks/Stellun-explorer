// Saved Stellun AI conversations. Signed-in accounts keep their threads in the
// cloud so the same questions and answers appear on every device. Signed out,
// nothing is stored and the page stays session only.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AskMode = "chat" | "quiz" | "explain" | "resources";
export type AskMsg = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  title: string;
  mode: AskMode;
  updatedAt: string;
};

const MAX_TITLE = 120;
const MAX_CONTENT = 20000;

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
}

export function useAskHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ask_conversations")
      .select("id, title, mode, updated_at")
      .order("updated_at", { ascending: false })
      .limit(60);
    setLoading(false);
    if (error) return;
    setConversations(
      (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        mode: (row.mode as AskMode) ?? "chat",
        updatedAt: row.updated_at,
      }))
    );
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Loads the full thread of a saved conversation, oldest message first.
  const loadMessages = useCallback(
    async (conversationId: string): Promise<AskMsg[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("ask_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error || !data) return [];
      return data.map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
      }));
    },
    [userId]
  );

  const createConversation = useCallback(
    async (firstQuestion: string, mode: AskMode): Promise<string | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("ask_conversations")
        .insert({
          user_id: userId,
          title: titleFrom(firstQuestion).slice(0, MAX_TITLE),
          mode,
        })
        .select("id, title, mode, updated_at")
        .single();
      if (error || !data) return null;
      setConversations((prev) => [
        {
          id: data.id,
          title: data.title,
          mode: (data.mode as AskMode) ?? mode,
          updatedAt: data.updated_at,
        },
        ...prev,
      ]);
      return data.id;
    },
    [userId]
  );

  const appendMessage = useCallback(
    async (conversationId: string, message: AskMsg) => {
      if (!userId) return;
      const content = message.content.trim().slice(0, MAX_CONTENT);
      if (!content) return;
      await supabase
        .from("ask_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: message.role,
          content,
        });
      // Bump the thread so the sidebar keeps the most recent chat on top.
      await supabase
        .from("ask_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      setConversations((prev) => {
        const found = prev.find((c) => c.id === conversationId);
        if (!found) return prev;
        const rest = prev.filter((c) => c.id !== conversationId);
        return [{ ...found, updatedAt: new Date().toISOString() }, ...rest];
      });
    },
    [userId]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!userId) return;
      const clean = title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
      if (!clean) return;
      const { error } = await supabase
        .from("ask_conversations")
        .update({ title: clean })
        .eq("id", conversationId);
      if (error) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title: clean } : c))
      );
    },
    [userId]
  );

  const setConversationMode = useCallback(
    async (conversationId: string, mode: AskMode) => {
      if (!userId) return;
      await supabase.from("ask_conversations").update({ mode }).eq("id", conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, mode } : c))
      );
    },
    [userId]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("ask_conversations")
        .delete()
        .eq("id", conversationId);
      if (error) return;
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    },
    [userId]
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("ask_conversations")
      .delete()
      .eq("user_id", userId);
    if (error) return;
    setConversations([]);
  }, [userId]);

  return {
    signedIn: Boolean(userId),
    conversations,
    loading,
    refresh,
    loadMessages,
    createConversation,
    appendMessage,
    renameConversation,
    setConversationMode,
    deleteConversation,
    clearAll,
  };
}

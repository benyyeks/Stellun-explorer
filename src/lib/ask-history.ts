// Saved Stellun AI conversations (Supabase). Signed-out users stay session-only.
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
  return clean.length > 60 ? clean.slice(0, 57) + "..." : clean;
}

export function useAskHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setHistoryError(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ask_conversations")
      .select("id, title, mode, updated_at")
      .order("updated_at", { ascending: false })
      .limit(60);
    setLoading(false);
    if (error) {
      console.error("ask_conversations list", error);
      setHistoryError("Could not load saved chats.");
      return;
    }
    setHistoryError(null);
    setConversations(
      (data ?? []).map((row) => ({
        id: row.id,
        title: row.title || "New chat",
        mode: (row.mode as AskMode) ?? "chat",
        updatedAt: row.updated_at,
      })),
    );
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMessages = useCallback(
    async (conversationId: string): Promise<AskMsg[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("ask_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error || !data) {
        if (error) console.error("ask_messages load", error);
        return [];
      }
      return data.map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
      }));
    },
    [userId],
  );

  const createConversation = useCallback(
    async (firstQuestion: string, mode: AskMode): Promise<string | null> => {
      if (!userId) return null;
      const title = titleFrom(firstQuestion).slice(0, MAX_TITLE);
      const { data, error } = await supabase
        .from("ask_conversations")
        .insert({
          user_id: userId,
          title,
          mode,
        })
        .select("id, title, mode, updated_at")
        .single();
      if (error || !data) {
        console.error("ask_conversations create", error);
        setHistoryError("Could not save this chat. Try again while signed in.");
        return null;
      }
      setHistoryError(null);
      setConversations((prev) => [
        {
          id: data.id,
          title: data.title,
          mode: (data.mode as AskMode) ?? mode,
          updatedAt: data.updated_at,
        },
        ...prev.filter((c) => c.id !== data.id),
      ]);
      return data.id;
    },
    [userId],
  );

  const appendMessage = useCallback(
    async (conversationId: string, message: AskMsg) => {
      if (!userId) return;
      const content = message.content.trim().slice(0, MAX_CONTENT);
      if (!content) return;
      const { error } = await supabase.from("ask_messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: message.role,
        content,
      });
      if (error) {
        console.error("ask_messages insert", error);
        return;
      }
      const now = new Date().toISOString();
      await supabase
        .from("ask_conversations")
        .update({ updated_at: now })
        .eq("id", conversationId);
      setConversations((prev) => {
        const found = prev.find((c) => c.id === conversationId);
        if (!found) return prev;
        const rest = prev.filter((c) => c.id !== conversationId);
        return [{ ...found, updatedAt: now }, ...rest];
      });
    },
    [userId],
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
      if (error) {
        console.error("ask_conversations rename", error);
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title: clean } : c)),
      );
    },
    [userId],
  );

  const setConversationMode = useCallback(
    async (conversationId: string, mode: AskMode) => {
      if (!userId) return;
      await supabase
        .from("ask_conversations")
        .update({ mode })
        .eq("id", conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, mode } : c)),
      );
    },
    [userId],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("ask_conversations")
        .delete()
        .eq("id", conversationId);
      if (error) {
        console.error("ask_conversations delete", error);
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    },
    [userId],
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("ask_conversations")
      .delete()
      .eq("user_id", userId);
    if (error) {
      console.error("ask_conversations clear", error);
      return;
    }
    setConversations([]);
  }, [userId]);

  return {
    signedIn: Boolean(userId),
    conversations,
    loading,
    historyError,
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

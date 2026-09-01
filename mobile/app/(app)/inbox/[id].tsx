import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchConversation, sendReply, assignConversation } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatDateTime, windowMinutesLeft } from "../../../lib/format";
import type { Conversation, Message } from "../../../lib/types";
import { colors } from "../../../lib/theme";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchConversation(id);
      setConversation(data.conversation);
      setMessages(data.messages);
      // Cleared on success rather than up front, so a failure banner survives
      // until a poll actually succeeds instead of blinking every 15s.
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load thread.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Focus-scoped so the 15s poll stops while the screen is in the background.
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 15000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const mins = windowMinutesLeft(conversation?.lastInboundAt ?? null);
  const windowOpen = mins > 0;

  async function onClaim() {
    if (!id || !can("inbox.reply")) return;
    setClaiming(true);
    setError(null);
    try {
      await assignConversation(id, { claim: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }

  async function onSend() {
    if (!id || !body.trim() || !can("inbox.reply")) return;
    setSending(true);
    setError(null);
    try {
      await sendReply(id, body);
      setBody("");
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !conversation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.merlot} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{conversation?.customerName ?? "Conversation"}</Text>
        <Text style={styles.sub}>
          +{conversation?.customerWaId} ·{" "}
          {windowOpen ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : "24h window closed"}
          {conversation?.assigneeName
            ? ` · ${conversation.assigneeId === user?.id ? "You" : conversation.assigneeName}`
            : " · Unassigned"}
        </Text>
        {conversation && conversation.assigneeId !== user?.id && can("inbox.reply") ? (
          <Pressable
            style={[styles.claim, claiming && styles.disabled]}
            disabled={claiming}
            onPress={onClaim}
          >
            <Text style={styles.claimText}>{claiming ? "Claiming…" : "Claim"}</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const out = item.direction === "out";
          return (
            <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
              <Text style={[styles.bubbleText, out && styles.bubbleTextOut]}>{item.body}</Text>
              <Text style={[styles.bubbleMeta, out && styles.bubbleMetaOut]}>
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={windowOpen ? "Type a reply…" : "Window closed - free text may fail"}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
          editable={can("inbox.reply") && !sending}
        />
        <Pressable
          style={[styles.send, (!body.trim() || sending || !can("inbox.reply")) && styles.disabled]}
          disabled={!body.trim() || sending || !can("inbox.reply")}
          onPress={onSend}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  sub: { marginTop: 2, fontSize: 12, color: colors.muted },
  claim: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: colors.merlot,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  claimText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  thread: { padding: 12, paddingBottom: 20 },
  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  bubbleIn: {
    alignSelf: "flex-start",
    backgroundColor: colors.bubbleIn,
  },
  bubbleOut: {
    alignSelf: "flex-end",
    backgroundColor: colors.bubbleOut,
  },
  bubbleText: { fontSize: 14, color: colors.foreground },
  bubbleTextOut: { color: "#fff" },
  bubbleMeta: { marginTop: 4, fontSize: 10, color: colors.muted },
  bubbleMetaOut: { color: "rgba(255,255,255,0.75)" },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.cream,
  },
  send: {
    backgroundColor: colors.merlot,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: "center",
  },
  sendText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, paddingHorizontal: 14, paddingTop: 8, fontSize: 13 },
});

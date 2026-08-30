import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchConversations } from "../../../lib/api";
import { timeAgo, windowMinutesLeft } from "../../../lib/format";
import type { Conversation } from "../../../lib/types";
import { colors } from "../../../lib/theme";

export default function InboxListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchConversations();
      setItems(data.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      const id = setInterval(() => void load(), 20000);
      return () => clearInterval(id);
    }, [load]),
  );

  if (loading && !items.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.merlot} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.merlot} />}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
      renderItem={({ item }) => {
        const mins = windowMinutesLeft(item.lastInboundAt);
        return (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/inbox/${item.id}`)}
          >
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastMessagePreview}
            </Text>
            <View style={styles.meta}>
              {item.unread > 0 ? (
                <Text style={styles.unread}>{item.unread}</Text>
              ) : null}
              <Text style={[styles.pill, mins > 0 ? styles.pillOk : styles.pillBad]}>
                {mins > 0 ? `${Math.floor(mins / 60)}h window` : "Window closed"}
              </Text>
              <Text style={styles.assignee}>
                {item.assigneeName ?? "Unassigned"}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, gap: 8 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground },
  time: { fontSize: 11, color: colors.muted },
  preview: { marginTop: 4, fontSize: 13, color: colors.muted },
  meta: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  unread: {
    backgroundColor: colors.merlot,
    color: "#fff",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  pill: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  pillOk: { backgroundColor: "#e6f2ea", color: colors.success },
  pillBad: { backgroundColor: "#f8e6e6", color: colors.danger },
  assignee: { fontSize: 11, color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
});

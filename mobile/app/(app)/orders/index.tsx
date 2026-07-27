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
import { fetchOrders } from "../../../lib/api";
import { formatIDR, timeAgo } from "../../../lib/format";
import type { Order } from "../../../lib/types";
import { colors } from "../../../lib/theme";

export default function OrdersListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchOrders();
      setItems(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      const id = setInterval(() => void load(), 30000);
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
      ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/orders/${item.id}`)}>
          <View style={styles.rowTop}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={styles.total}>{formatIDR(item.total)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {item.customerName}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.pill}>{item.status}</Text>
            <Text style={styles.pillMuted}>{item.paymentStatus}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  code: { fontSize: 15, fontWeight: "700", color: colors.merlot },
  total: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  name: { marginTop: 4, fontSize: 14, color: colors.foreground },
  meta: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pill: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    backgroundColor: "#f0e4e8",
    color: colors.merlot,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  pillMuted: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    backgroundColor: colors.cream,
    color: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  time: { fontSize: 11, color: colors.muted, marginLeft: "auto" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
});

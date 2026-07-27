import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  advanceOrder,
  fetchOrder,
  generatePaymentLink,
  raiseNotice,
} from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatDateTime, formatIDR } from "../../../lib/format";
import type { Order } from "../../../lib/types";
import { colors } from "../../../lib/theme";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const canEdit = can("orders.edit");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchOrder(id);
      setOrder(data.order);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Refetches on focus, so returning from another screen shows current state.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.merlot} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Order not found."}</Text>
      </View>
    );
  }

  const terminal = order.status === "delivered" || order.status === "cancelled";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.code}>{order.code}</Text>
      <Text style={styles.meta}>
        {formatDateTime(order.createdAt)} · {order.status} · {order.paymentStatus}
      </Text>
      <Text style={styles.customer}>{order.customerName}</Text>

      {order.flaggedIssue ? (
        <View style={styles.flag}>
          <Text style={styles.flagText}>Flagged: {order.flaggedIssue}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items.map((it) => (
          <View key={it.productId} style={styles.item}>
            <Text style={styles.itemName}>{it.name}</Text>
            <Text style={styles.itemMeta}>
              {it.qty} × {formatIDR(it.unitPrice)}
            </Text>
            <Text style={styles.itemTotal}>{formatIDR(it.qty * it.unitPrice)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatIDR(order.total)}</Text>
        </View>
      </View>

      {order.paymentLink ? (
        <Pressable onPress={() => Linking.openURL(order.paymentLink!)}>
          <Text style={styles.link} numberOfLines={2}>
            {order.paymentLink}
          </Text>
        </Pressable>
      ) : null}

      {canEdit ? (
        <View style={styles.actions}>
          {!order.paymentLink && order.paymentStatus !== "paid" ? (
            <Pressable
              style={[styles.primaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => run(() => generatePaymentLink(order.id))}
            >
              <Text style={styles.primaryBtnText}>Generate payment link</Text>
            </Pressable>
          ) : null}

          {!terminal ? (
            <Pressable
              style={[styles.secondaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => run(() => advanceOrder(order.id))}
            >
              <Text style={styles.secondaryBtnText}>Advance status</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.dangerBtn}
            onPress={() => setShowNotice((v) => !v)}
          >
            <Text style={styles.dangerBtnText}>Flag issue to warehouse</Text>
          </Pressable>

          {showNotice ? (
            <View style={styles.noticeBox}>
              <TextInput
                value={notice}
                onChangeText={setNotice}
                placeholder="Describe the issue…"
                placeholderTextColor={colors.muted}
                multiline
                style={styles.noticeInput}
              />
              <Pressable
                style={[styles.primaryBtn, busy && styles.disabled]}
                disabled={busy || !notice.trim()}
                onPress={() =>
                  run(async () => {
                    await raiseNotice(order.id, notice);
                    setNotice("");
                    setShowNotice(false);
                  })
                }
              >
                <Text style={styles.primaryBtnText}>Send notice</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.hint}>View-only for your role (order actions require sales/admin).</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  container: { padding: 16, paddingBottom: 40 },
  code: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  meta: { marginTop: 4, fontSize: 13, color: colors.muted, textTransform: "capitalize" },
  customer: { marginTop: 8, fontSize: 15, fontWeight: "600", color: colors.merlot },
  flag: {
    marginTop: 12,
    backgroundColor: "#f8e6e6",
    borderRadius: 10,
    padding: 10,
  },
  flagText: { color: colors.danger, fontSize: 13 },
  card: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  itemMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  itemTotal: { marginTop: 2, fontSize: 13, fontWeight: "600", color: colors.foreground },
  totalRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  totalValue: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  link: { marginTop: 12, color: colors.merlot, fontSize: 12 },
  actions: { marginTop: 16, gap: 8 },
  primaryBtn: {
    backgroundColor: colors.merlot,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.foreground, fontWeight: "600" },
  dangerBtn: {
    borderWidth: 1,
    borderColor: "#e8b4b4",
    backgroundColor: "#f8e6e6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: { color: colors.danger, fontWeight: "600" },
  noticeBox: { gap: 8 },
  noticeInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    color: colors.foreground,
  },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, marginTop: 10, fontSize: 13 },
  hint: { marginTop: 16, fontSize: 13, color: colors.muted },
});

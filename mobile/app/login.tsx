import { Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { allowDemoLogin, API_URL, isSupabaseConfigured } from "../lib/config";
import { colors } from "../lib/theme";

const DEMO_ROLES = [
  { id: "u-cs-1", label: "CS · Sari Putri" },
  { id: "u-sales-1", label: "Sales · Dewi Lestari" },
  { id: "u-admin", label: "Admin · Rina Wijaya" },
];

export default function LoginScreen() {
  const { user, loading, signInWithPassword, signInDemo, demoEnabled } = useAuth();
  const showDemo = demoEnabled || allowDemoLogin;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Redirect href="/inbox" />;

  async function onPasswordLogin() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDemo(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await signInDemo(userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Demo sign-in failed.";
      setError(
        `${msg}\n\nMake sure Next is running from the repo root with:\n$env:STAFF_API_ALLOW_DEMO="true"\nnpm run dev\n\nAPI: ${API_URL}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>Aeris Field</Text>
      <Text style={styles.sub}>Inbox & orders for the team on the go</Text>
      <Text style={styles.api}>API · {API_URL}</Text>
      <Text style={styles.api}>Demo buttons · {showDemo ? "on" : "off"}</Text>

      {showDemo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Continue without password</Text>
          <Text style={styles.hint}>
            Tap a demo role. Next must be running with STAFF_API_ALLOW_DEMO=true.
          </Text>
          {DEMO_ROLES.map((role) => (
            <Pressable
              key={role.id}
              style={[styles.primaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => onDemo(role.id)}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{role.label}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {isSupabaseConfigured && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff login</Text>
          <Text style={styles.label}>Work email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@aerisbeaute.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={onPasswordLogin}
          >
            <Text style={styles.secondaryBtnText}>Sign in with password</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 72,
    backgroundColor: colors.cream,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.merlot,
  },
  sub: {
    marginTop: 6,
    fontSize: 15,
    color: colors.muted,
  },
  api: {
    marginTop: 6,
    fontSize: 11,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.cream,
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: colors.merlot,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.cream,
    marginTop: 8,
  },
  secondaryBtnText: {
    color: colors.foreground,
    fontWeight: "500",
    fontSize: 14,
  },
  disabled: { opacity: 0.6 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
  },
});

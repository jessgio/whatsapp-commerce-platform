import { Pressable, Text } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={() => signOut()} style={{ marginRight: 14 }}>
      <Text style={{ color: colors.merlot, fontWeight: "600", fontSize: 13 }}>Sign out</Text>
    </Pressable>
  );
}

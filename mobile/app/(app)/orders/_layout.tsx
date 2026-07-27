import { Stack } from "expo-router";
import { SignOutButton } from "../../../components/sign-out-button";
import { colors } from "../../../lib/theme";

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.merlot,
        headerTitleStyle: { color: colors.foreground, fontWeight: "600" },
        contentStyle: { backgroundColor: colors.cream },
        headerRight: () => <SignOutButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Orders" }} />
      <Stack.Screen name="[id]" options={{ title: "Order" }} />
    </Stack>
  );
}

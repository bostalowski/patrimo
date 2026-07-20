import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { colors } from "../lib/theme";

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = isDark ? colors.dark : colors.light;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: t.accent,
          tabBarInactiveTintColor: t.textMuted,
          tabBarStyle: {
            backgroundColor: isDark ? "#18181b" : "#ffffff",
            borderTopColor: t.cardBorder,
          },
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Patrimoine",
            tabBarLabel: "Accueil",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: "Transactions",
            tabBarLabel: "Transactions",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="actifs"
          options={{
            title: "Actifs",
            tabBarLabel: "Actifs",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pie-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="comptes"
          options={{
            title: "Comptes",
            tabBarLabel: "Comptes",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Réglages",
            tabBarLabel: "Réglages",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="projection" options={{ href: null }} />
        <Tabs.Screen name="add-transaction" options={{ href: null, title: "Nouvelle transaction" }} />
        <Tabs.Screen name="add-asset" options={{ href: null, title: "Nouvel actif" }} />
        <Tabs.Screen name="add-account" options={{ href: null, title: "Nouveau compte" }} />
        <Tabs.Screen name="oauth2redirect" options={{ href: null }} />
      </Tabs>
    </>
  );
}

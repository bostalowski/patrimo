import "../global.css";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: isDark ? "#a78bfa" : "#7c3aed",
          tabBarStyle: {
            backgroundColor: isDark ? "#18181b" : "#ffffff",
            borderTopColor: isDark ? "#27272a" : "#e4e4e7",
          },
          headerStyle: {
            backgroundColor: isDark ? "#09090b" : "#ffffff",
          },
          headerTintColor: isDark ? "#fafafa" : "#09090b",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Patrimoine", tabBarLabel: "Accueil" }}
        />
        <Tabs.Screen
          name="actifs"
          options={{ title: "Actifs", tabBarLabel: "Actifs" }}
        />
        <Tabs.Screen
          name="comptes"
          options={{ title: "Comptes", tabBarLabel: "Comptes" }}
        />
        <Tabs.Screen
          name="projection"
          options={{ title: "Projection", tabBarLabel: "Projection" }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: "Réglages", tabBarLabel: "Réglages" }}
        />
      </Tabs>
    </>
  );
}

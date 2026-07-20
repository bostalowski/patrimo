import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, shared } from "../lib/theme";

type MenuItem = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Transactions", route: "/transactions", icon: "swap-horizontal-outline", description: "Historique des mouvements" },
  { label: "Budget", route: "/budget", icon: "calculator-outline", description: "Revenus, dépenses et épargne" },
  { label: "Frais", route: "/frais", icon: "receipt-outline", description: "Analyse des frais" },
  { label: "Fiscalité", route: "/fiscalite", icon: "document-text-outline", description: "Plus-values et revenus imposables" },
  { label: "Investissements", route: "/investissements", icon: "trending-up-outline", description: "DCA et immobilier" },
  { label: "Projection", route: "/projection", icon: "analytics-outline", description: "Simulation sur 20 ans" },
];

export default function MoreScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.route}
          onPress={() => router.push(item.route as never)}
          style={[
            shared.card,
            {
              backgroundColor: t.card,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            },
          ]}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: isDark ? "#27272a" : "#e4e4e7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={item.icon} size={20} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>
              {item.label}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>
              {item.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

import { StyleSheet } from "react-native";

export const colors = {
  dark: {
    bg: "#09090b",
    card: "#18181b",
    cardBorder: "#27272a",
    text: "#fafafa",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    accent: "#a78bfa",
    accentBg: "#7c3aed",
    success: "#34d399",
    danger: "#f87171",
  },
  light: {
    bg: "#ffffff",
    card: "#f4f4f5",
    cardBorder: "#e4e4e7",
    text: "#09090b",
    textSecondary: "#52525b",
    textMuted: "#71717a",
    accent: "#7c3aed",
    accentBg: "#7c3aed",
    success: "#059669",
    danger: "#dc2626",
  },
} as const;

export type Theme = (typeof colors)[keyof typeof colors];

export function useThemeColors(isDark: boolean): Theme {
  return isDark ? colors.dark : colors.light;
}

export const shared = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
  },
});

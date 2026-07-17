import { View, Text, TouchableOpacity, Alert, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { connected, connect, disconnect } = useWorkbook();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (e) {
      Alert.alert("Erreur", "Impossible de se connecter à Google Drive.");
    }
  };

  return (
    <View className={`flex-1 p-4 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
      <View className={`rounded-xl p-4 ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}>
        <Text className={isDark ? "text-zinc-100 font-semibold mb-2" : "text-zinc-900 font-semibold mb-2"}>
          Google Drive
        </Text>
        <Text className={isDark ? "text-zinc-400 text-sm mb-4" : "text-zinc-500 text-sm mb-4"}>
          Connecte ton compte Google pour accéder à ton fichier Excel Patrimo
          stocké sur Drive.
        </Text>

        {connected ? (
          <View>
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              <Text className="text-emerald-400">Connecté</Text>
            </View>
            <TouchableOpacity
              onPress={disconnect}
              className="bg-zinc-800 rounded-lg py-3 px-4"
            >
              <Text className="text-zinc-300 text-center font-medium">
                Se déconnecter
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleConnect}
            className="bg-violet-600 rounded-lg py-3 px-4"
          >
            <Text className="text-white text-center font-medium">
              Connecter Google Drive
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

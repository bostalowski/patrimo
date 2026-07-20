import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";

export default function OAuthRedirect() {
  useEffect(() => {
    router.replace("/settings");
  }, []);

  return <View />;
}

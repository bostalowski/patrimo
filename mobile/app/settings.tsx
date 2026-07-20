import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import {
  useGoogleAuth,
  getAccessToken,
  saveToken,
  getToken,
  clearToken,
  saveFileId,
  getFileId,
  searchExcelFiles,
  type DriveFile,
} from "../lib/google-drive";
import { useThemeColors, shared } from "../lib/theme";

export default function SettingsScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { request, response, promptAsync } = useGoogleAuth();

  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const fileId = await getFileId();
      console.log("[Settings] stored token:", token ? "present" : "null", "fileId:", fileId);
      setConnected(!!token);
      setSelectedFile(fileId);
    })();
  }, []);

  useEffect(() => {
    console.log("[Settings] OAuth request ready:", !!request);
  }, [request]);

  useEffect(() => {
    console.log("OAuth response:", JSON.stringify(response));
    const token = getAccessToken(response);
    console.log("Extracted token:", token ? "present" : "null");
    if (token) {
      const auth = response?.type === "success" ? response.authentication : null;
      handleAuthSuccess(token, auth?.refreshToken, auth?.expiresIn);
    }
  }, [response]);

  const handleAuthSuccess = async (token: string, refreshToken?: string | null, expiresIn?: number | null) => {
    await saveToken(token, refreshToken, expiresIn);
    setConnected(true);
    setLoadingFiles(true);
    try {
      const driveFiles = await searchExcelFiles(token);
      setFiles(driveFiles);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de lister les fichiers Drive.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    if (!request) {
      Alert.alert("Erreur", "OAuth non prêt. Vérifie le Google Client ID.");
      return;
    }
    await promptAsync();
  };

  const handleSelectFile = async (file: DriveFile) => {
    await saveFileId(file.id);
    setSelectedFile(file.id);
    Alert.alert("Fichier sélectionné", `"${file.name}" sera utilisé comme source de données.`);
  };

  const handleDisconnect = async () => {
    await clearToken();
    setConnected(false);
    setSelectedFile(null);
    setFiles([]);
  };

  const handleRefreshFiles = async () => {
    const token = await getToken();
    if (!token) {
      setConnected(false);
      return;
    }
    setLoadingFiles(true);
    try {
      const driveFiles = await searchExcelFiles(token);
      setFiles(driveFiles);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "TOKEN_EXPIRED") {
        setConnected(false);
        setFiles([]);
        Alert.alert("Session expirée", "Reconnecte-toi à Google Drive.");
      } else {
        Alert.alert("Erreur", "Impossible de lister les fichiers.");
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <View style={[shared.screenContainer, { backgroundColor: t.bg }]}>
      <View style={[shared.card, { backgroundColor: t.card }]}>
        <Text style={[shared.cardTitle, { color: t.text }]}>Google Drive</Text>
        <Text style={[shared.cardSubtitle, { color: t.textSecondary }]}>
          Connecte ton compte Google pour accéder à ton fichier Excel Patrimo
          stocké sur Drive.
        </Text>

        {connected ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.success,
                  marginRight: 8,
                }}
              />
              <Text style={{ color: t.success, fontSize: 14, fontWeight: "500" }}>
                Connecté
              </Text>
            </View>

            {selectedFile && (
              <View
                style={{
                  backgroundColor: t.bg,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 2 }}>
                  Fichier actif
                </Text>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: "500" }}>
                  {selectedFile}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleRefreshFiles}
              style={[shared.button, { backgroundColor: t.accentBg, marginBottom: 8 }]}
            >
              <Text style={[shared.buttonText, { color: "#ffffff" }]}>
                Choisir un fichier
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDisconnect}
              style={[shared.button, { backgroundColor: t.cardBorder }]}
            >
              <Text style={[shared.buttonText, { color: t.textSecondary }]}>
                Se déconnecter
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleConnect}
            disabled={!request}
            style={[
              shared.button,
              { backgroundColor: t.accentBg, opacity: request ? 1 : 0.5 },
            ]}
          >
            <Text style={[shared.buttonText, { color: "#ffffff" }]}>
              Connecter Google Drive
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loadingFiles && (
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <ActivityIndicator color={t.accent} />
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 8 }}>
            Recherche des fichiers Excel...
          </Text>
        </View>
      )}

      {files.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card, marginTop: 12 }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Fichiers Excel trouvés
          </Text>
          {files.map((file) => (
            <TouchableOpacity
              key={file.id}
              onPress={() => handleSelectFile(file)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                marginBottom: 4,
                backgroundColor: selectedFile === file.id ? t.accentBg + "20" : "transparent",
              }}
            >
              <Text
                style={{
                  color: selectedFile === file.id ? t.accent : t.text,
                  fontSize: 14,
                  fontWeight: selectedFile === file.id ? "600" : "400",
                }}
              >
                {file.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

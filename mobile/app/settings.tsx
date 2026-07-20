import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
import {
  createBlankWorkbookOnDrive,
  createBlankWorkbookLocally,
} from "../lib/create-workbook";
import { pickLocalFile, getLocalFile, clearLocalFile } from "../lib/local-file";
import { setSourceType, getSourceType } from "../lib/file-source";
import { getSyncInterval, saveSyncInterval, getLastSync } from "../lib/price-sync";
import {
  SYNC_INTERVAL_PRESETS,
  clampSyncIntervalMinutes,
} from "@patrimo/core/prices/schedule";
import { useThemeColors, shared } from "../lib/theme";
import { useWorkbook } from "../lib/use-workbook";

type ActiveSource =
  | { type: "drive"; fileId: string; fileName: string | null }
  | { type: "local"; uri: string; name: string }
  | null;

export default function SettingsScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { request, response, promptAsync } = useGoogleAuth();
  const { refresh: reloadWorkbook } = useWorkbook();

  const [activeSource, setActiveSource] = useState<ActiveSource>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showDriveCreate, setShowDriveCreate] = useState(false);
  const [showLocalCreate, setShowLocalCreate] = useState(false);
  const [newFileName, setNewFileName] = useState("Patrimo.xlsx");
  const [creating, setCreating] = useState(false);
  const [pickingLocal, setPickingLocal] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sourceType = await getSourceType();

      if (sourceType === "local") {
        const local = await getLocalFile();
        if (local) {
          setActiveSource({ type: "local", uri: local.uri, name: local.name });
        }
      } else {
        const token = await getToken();
        const fileId = await getFileId();
        if (token && fileId) {
          setDriveConnected(true);
          let fileName: string | null = null;
          try {
            const driveFiles = await searchExcelFiles(token);
            const match = driveFiles.find((f) => f.id === fileId);
            if (match) fileName = match.name;
          } catch {}
          setActiveSource({ type: "drive", fileId, fileName });
        } else if (token) {
          setDriveConnected(true);
        }
      }

      const interval = await getSyncInterval();
      setSyncInterval(clampSyncIntervalMinutes(interval));
      setLastSync(await getLastSync());
    })();
  }, []);

  const handleDriveAuthSuccess = useCallback(
    async (
      token: string,
      refreshToken?: string | null,
      expiresIn?: number | null,
    ) => {
      await saveToken(token, refreshToken, expiresIn);
      setDriveConnected(true);
      setLoadingFiles(true);
      try {
        const driveFiles = await searchExcelFiles(token);
        setFiles(driveFiles);
      } catch {
        Alert.alert("Erreur", "Impossible de lister les fichiers Drive.");
      } finally {
        setLoadingFiles(false);
      }
    },
    [],
  );

  useEffect(() => {
    const token = getAccessToken(response);
    if (token) {
      const auth =
        response?.type === "success" ? response.authentication : null;
      handleDriveAuthSuccess(
        token,
        auth?.refreshToken,
        auth?.expiresIn,
      );
    }
  }, [response, handleDriveAuthSuccess]);

  const handleConnectDrive = async () => {
    if (!request) {
      Alert.alert("Erreur", "OAuth non prêt. Vérifie le Google Client ID.");
      return;
    }
    await promptAsync();
  };

  const handleSelectDriveFile = async (file: DriveFile) => {
    await saveFileId(file.id);
    await setSourceType("drive");
    setActiveSource({ type: "drive", fileId: file.id, fileName: file.name });
    await reloadWorkbook();
    Alert.alert(
      "Fichier sélectionné",
      `"${file.name}" sera utilisé comme source de données.`,
    );
  };

  const handleCreateDriveFile = async () => {
    const token = await getToken();
    if (!token) {
      setDriveConnected(false);
      return;
    }
    const name = newFileName.trim() || "Patrimo.xlsx";
    const finalName = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
    setCreating(true);
    try {
      const fileId = await createBlankWorkbookOnDrive(token, finalName);
      await saveFileId(fileId);
      await setSourceType("drive");
      setActiveSource({ type: "drive", fileId, fileName: finalName });
      setShowDriveCreate(false);
      await reloadWorkbook();
      Alert.alert(
        "Fichier créé",
        `"${finalName}" a été créé sur Google Drive et sélectionné.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "TOKEN_EXPIRED") {
        setDriveConnected(false);
        Alert.alert("Session expirée", "Reconnecte-toi à Google Drive.");
      } else {
        Alert.alert("Erreur", "Impossible de créer le fichier sur Drive.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await clearToken();
    setDriveConnected(false);
    if (activeSource?.type === "drive") setActiveSource(null);
    setFiles([]);
  };

  const handleRefreshDriveFiles = async () => {
    const token = await getToken();
    if (!token) {
      setDriveConnected(false);
      return;
    }
    setLoadingFiles(true);
    try {
      const driveFiles = await searchExcelFiles(token);
      setFiles(driveFiles);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "TOKEN_EXPIRED") {
        setDriveConnected(false);
        setFiles([]);
        Alert.alert("Session expirée", "Reconnecte-toi à Google Drive.");
      } else {
        Alert.alert("Erreur", "Impossible de lister les fichiers.");
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const handlePickLocal = async () => {
    setPickingLocal(true);
    try {
      const result = await pickLocalFile();
      if (result) {
        await setSourceType("local");
        setActiveSource({ type: "local", uri: result.uri, name: result.name });
        await reloadWorkbook();
        Alert.alert(
          "Fichier sélectionné",
          `"${result.name}" sera utilisé comme source de données locale.`,
        );
      }
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible d'ouvrir le sélecteur de fichiers.",
      );
    } finally {
      setPickingLocal(false);
    }
  };

  const handleCreateLocal = async () => {
    const name = newFileName.trim() || "Patrimo.xlsx";
    const finalName = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
    setCreating(true);
    try {
      const result = await createBlankWorkbookLocally(finalName);
      await setSourceType("local");
      setActiveSource({ type: "local", uri: result.uri, name: result.name });
      setShowLocalCreate(false);
      await reloadWorkbook();
      Alert.alert(
        "Fichier créé",
        `"${finalName}" a été créé localement et sélectionné.`,
      );
    } catch {
      Alert.alert("Erreur", "Impossible de créer le fichier local.");
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveLocal = async () => {
    await clearLocalFile();
    if (activeSource?.type === "local") setActiveSource(null);
  };

  const handleSyncIntervalChange = async (minutes: number) => {
    const clamped = clampSyncIntervalMinutes(minutes);
    setSyncInterval(clamped);
    await saveSyncInterval(clamped);
  };

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return "Jamais";
    const d = new Date(iso);
    const now = Date.now();
    const diffMin = Math.round((now - d.getTime()) / 60_000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeFileId =
    activeSource?.type === "drive" ? activeSource.fileId : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      {activeSource && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text }]}>
            Source active
          </Text>
          <View
            style={{
              backgroundColor: t.bg,
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: t.textSecondary,
                fontSize: 12,
                marginBottom: 2,
              }}
            >
              {activeSource.type === "drive"
                ? "Google Drive"
                : "Fichier local"}
            </Text>
            <Text
              style={{ color: t.text, fontSize: 14, fontWeight: "500" }}
            >
              {activeSource.type === "drive"
                ? activeSource.fileName ?? activeSource.fileId
                : activeSource.name}
            </Text>
          </View>
        </View>
      )}

      <View style={[shared.card, { backgroundColor: t.card }]}>
        <Text style={[shared.cardTitle, { color: t.text }]}>
          Synchronisation des prix
        </Text>
        <Text style={[shared.cardSubtitle, { color: t.textSecondary }]}>
          Intervalle minimum entre deux mises à jour automatiques des cours.
        </Text>

        <View
          style={{
            backgroundColor: t.bg,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: t.textSecondary,
              fontSize: 12,
              marginBottom: 2,
            }}
          >
            Dernière synchro
          </Text>
          <Text
            style={{ color: t.text, fontSize: 14, fontWeight: "500" }}
          >
            {formatLastSync(lastSync)}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 4 }}
        >
          {SYNC_INTERVAL_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.minutes}
              onPress={() => handleSyncIntervalChange(preset.minutes)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor:
                  syncInterval === preset.minutes
                    ? t.accentBg
                    : t.bg,
                borderWidth: 1,
                borderColor:
                  syncInterval === preset.minutes
                    ? t.accentBg
                    : t.cardBorder,
              }}
            >
              <Text
                style={{
                  color:
                    syncInterval === preset.minutes
                      ? "#fff"
                      : t.text,
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[shared.card, { backgroundColor: t.card }]}>
        <Text style={[shared.cardTitle, { color: t.text }]}>
          Fichier local
        </Text>
        <Text style={[shared.cardSubtitle, { color: t.textSecondary }]}>
          Utilise un fichier Excel stocké sur ton appareil, sans connexion
          internet.
        </Text>

        <TouchableOpacity
          onPress={handlePickLocal}
          disabled={pickingLocal}
          style={[
            shared.button,
            {
              backgroundColor: t.accentBg,
              marginBottom: 8,
              opacity: pickingLocal ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[shared.buttonText, { color: "#ffffff" }]}>
            {pickingLocal
              ? "Ouverture..."
              : "Choisir un fichier .xlsx existant"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowLocalCreate(!showLocalCreate)}
          style={[
            shared.button,
            { backgroundColor: t.cardBorder, marginBottom: 8 },
          ]}
        >
          <Text style={[shared.buttonText, { color: t.text }]}>
            Créer un nouveau fichier local
          </Text>
        </TouchableOpacity>

        {showLocalCreate && (
          <View
            style={{
              backgroundColor: t.bg,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: t.textSecondary,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Nom du fichier
            </Text>
            <TextInput
              value={newFileName}
              onChangeText={setNewFileName}
              placeholder="Patrimo.xlsx"
              placeholderTextColor={t.textMuted}
              style={{
                backgroundColor: t.card,
                color: t.text,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                borderWidth: 1,
                borderColor: t.cardBorder,
                marginBottom: 12,
              }}
            />
            <TouchableOpacity
              onPress={handleCreateLocal}
              disabled={creating}
              style={[
                shared.button,
                {
                  backgroundColor: t.accentBg,
                  opacity: creating ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[shared.buttonText, { color: "#ffffff" }]}>
                {creating
                  ? "Création en cours..."
                  : "Créer le fichier"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSource?.type === "local" && (
          <TouchableOpacity
            onPress={handleRemoveLocal}
            style={[shared.button, { backgroundColor: t.cardBorder }]}
          >
            <Text style={[shared.buttonText, { color: t.textSecondary }]}>
              Dissocier le fichier local
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[shared.card, { backgroundColor: t.card }]}>
        <Text style={[shared.cardTitle, { color: t.text }]}>
          Google Drive
        </Text>
        <Text style={[shared.cardSubtitle, { color: t.textSecondary }]}>
          Connecte ton compte Google pour accéder à ton fichier Excel Patrimo
          stocké sur Drive.
        </Text>

        {driveConnected ? (
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.success,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  color: t.success,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Connecté
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRefreshDriveFiles}
              style={[
                shared.button,
                { backgroundColor: t.accentBg, marginBottom: 8 },
              ]}
            >
              <Text style={[shared.buttonText, { color: "#ffffff" }]}>
                Choisir un fichier existant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDriveCreate(!showDriveCreate)}
              style={[
                shared.button,
                { backgroundColor: t.cardBorder, marginBottom: 8 },
              ]}
            >
              <Text style={[shared.buttonText, { color: t.text }]}>
                Créer un nouveau fichier
              </Text>
            </TouchableOpacity>

            {showDriveCreate && (
              <View
                style={{
                  backgroundColor: t.bg,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: t.textSecondary,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  Nom du fichier
                </Text>
                <TextInput
                  value={newFileName}
                  onChangeText={setNewFileName}
                  placeholder="Patrimo.xlsx"
                  placeholderTextColor={t.textMuted}
                  style={{
                    backgroundColor: t.card,
                    color: t.text,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: t.cardBorder,
                    marginBottom: 12,
                  }}
                />
                <TouchableOpacity
                  onPress={handleCreateDriveFile}
                  disabled={creating}
                  style={[
                    shared.button,
                    {
                      backgroundColor: t.accentBg,
                      opacity: creating ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[shared.buttonText, { color: "#ffffff" }]}>
                    {creating
                      ? "Création en cours..."
                      : "Créer sur Google Drive"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={handleDisconnectDrive}
              style={[shared.button, { backgroundColor: t.cardBorder }]}
            >
              <Text
                style={[shared.buttonText, { color: t.textSecondary }]}
              >
                Se déconnecter
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleConnectDrive}
            disabled={!request}
            style={[
              shared.button,
              {
                backgroundColor: t.accentBg,
                opacity: request ? 1 : 0.5,
              },
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
          <Text
            style={{
              color: t.textSecondary,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            Recherche des fichiers Excel...
          </Text>
        </View>
      )}

      {files.length > 0 && (
        <View
          style={[shared.card, { backgroundColor: t.card, marginTop: 12 }]}
        >
          <Text
            style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}
          >
            Fichiers Excel trouvés
          </Text>
          {files.map((file) => (
            <TouchableOpacity
              key={file.id}
              onPress={() => handleSelectDriveFile(file)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                marginBottom: 4,
                backgroundColor:
                  activeFileId === file.id
                    ? t.accentBg + "20"
                    : "transparent",
              }}
            >
              <Text
                style={{
                  color:
                    activeFileId === file.id ? t.accent : t.text,
                  fontSize: 14,
                  fontWeight:
                    activeFileId === file.id ? "600" : "400",
                }}
              >
                {file.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

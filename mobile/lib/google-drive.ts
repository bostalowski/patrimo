import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const STORAGE_KEY_TOKEN = "patrimo:google_token";
const STORAGE_KEY_FILE_ID = "patrimo:drive_file_id";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "patrimo" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      responseType: AuthSession.ResponseType.Token,
    },
    discovery,
  );

  return { request, response, promptAsync };
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_TOKEN);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEY_FILE_ID);
}

export async function saveFileId(fileId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_FILE_ID, fileId);
}

export async function getFileId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_FILE_ID);
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

export async function searchExcelFiles(token: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false",
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Drive API error: ${response.status}`);
  const data = await response.json();
  return data.files ?? [];
}

export async function downloadFile(
  token: string,
  fileId: string,
): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Drive download error: ${response.status}`);
  return response.arrayBuffer();
}

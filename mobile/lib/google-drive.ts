import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const GOOGLE_SCHEME = "com.googleusercontent.apps.12560355131-0q31f1ct528o6249qilucbnlg4hsg1ur";
const STORAGE_KEY_TOKEN = "patrimo:google_token";
const STORAGE_KEY_REFRESH_TOKEN = "patrimo:google_refresh_token";
const STORAGE_KEY_TOKEN_EXPIRY = "patrimo:google_token_expiry";
const STORAGE_KEY_FILE_ID = "patrimo:drive_file_id";

export function useGoogleAuth() {
  const redirectUri = makeRedirectUri({
    scheme: GOOGLE_SCHEME,
    path: "oauth2redirect",
    native: `${GOOGLE_SCHEME}:/oauth2redirect`,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    redirectUri,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return { request, response, promptAsync };
}

export function getAccessToken(
  response: Google.GoogleAuthSessionResult | null,
): string | null {
  if (response?.type !== "success") return null;
  return response.authentication?.accessToken ?? null;
}

export async function saveToken(token: string, refreshToken?: string | null, expiresIn?: number | null): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
  if (refreshToken) {
    await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
  }
  const expiry = Date.now() + ((expiresIn ?? 3600) - 60) * 1000;
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, String(expiry));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANDROID_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    await saveToken(data.access_token, null, data.expires_in);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) return null;

  const expiryStr = await AsyncStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
  const expiry = expiryStr ? Number(expiryStr) : 0;

  if (Date.now() < expiry) return token;

  const refreshed = await refreshAccessToken();
  return refreshed ?? null;
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
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
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_EXPIRED");
  }
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  return data.files ?? [];
}

export async function downloadFile(
  token: string,
  fileId: string,
): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_EXPIRED");
  }
  if (!res.ok) throw new Error(`Drive download error: ${res.status}`);
  return res.arrayBuffer();
}

export async function uploadFile(
  token: string,
  fileId: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: buffer,
    },
  );
  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_EXPIRED");
  }
  if (!res.ok) throw new Error(`Drive upload error: ${res.status}`);
}

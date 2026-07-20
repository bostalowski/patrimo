import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_LOCAL_URI = "patrimo:local_file_uri";
const STORAGE_KEY_LOCAL_NAME = "patrimo:local_file_name";
const LOCAL_DIR = `${FileSystem.documentDirectory}workbooks/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LOCAL_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true });
  }
}

export async function pickLocalFile(): Promise<{
  uri: string;
  name: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];

  await ensureDir();
  const destUri = `${LOCAL_DIR}${asset.name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destUri });

  await saveLocalFile(destUri, asset.name);
  return { uri: destUri, name: asset.name };
}

export async function saveLocalFile(
  uri: string,
  name: string,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_LOCAL_URI, uri);
  await AsyncStorage.setItem(STORAGE_KEY_LOCAL_NAME, name);
}

export async function getLocalFile(): Promise<{
  uri: string;
  name: string;
} | null> {
  const uri = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_URI);
  const name = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_NAME);
  if (!uri) return null;
  return { uri, name: name ?? "Patrimo.xlsx" };
}

export async function clearLocalFile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_LOCAL_URI);
  await AsyncStorage.removeItem(STORAGE_KEY_LOCAL_NAME);
}

export async function readLocalFile(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

export async function writeLocalFile(
  uri: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const base64 = arrayBufferToBase64(buffer);
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function createLocalFile(fileName: string): Promise<string> {
  await ensureDir();
  const uri = `${LOCAL_DIR}${fileName}`;
  return uri;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

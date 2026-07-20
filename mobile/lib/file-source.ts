import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getToken,
  getFileId,
  downloadFile,
  uploadFile,
  clearToken,
} from "./google-drive";
import { getLocalFile, readLocalFile, writeLocalFile } from "./local-file";

export type FileSource =
  | { type: "drive"; token: string; fileId: string }
  | { type: "local"; uri: string; name: string };

const STORAGE_KEY_SOURCE_TYPE = "patrimo:source_type";

export async function setSourceType(
  type: "drive" | "local",
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_SOURCE_TYPE, type);
}

export async function getSourceType(): Promise<"drive" | "local" | null> {
  const val = await AsyncStorage.getItem(STORAGE_KEY_SOURCE_TYPE);
  if (val === "drive" || val === "local") return val;
  return null;
}

export async function getActiveSource(): Promise<FileSource | null> {
  const sourceType = await getSourceType();

  if (sourceType === "local") {
    const local = await getLocalFile();
    if (local) return { type: "local", ...local };
    return null;
  }

  const token = await getToken();
  const fileId = await getFileId();
  if (token && fileId) return { type: "drive", token, fileId };

  return null;
}

export async function readSourceFile(
  source: FileSource,
): Promise<ArrayBuffer> {
  if (source.type === "local") {
    return readLocalFile(source.uri);
  }
  return downloadFile(source.token, source.fileId);
}

export async function writeSourceFile(
  source: FileSource,
  buffer: ArrayBuffer,
): Promise<void> {
  if (source.type === "local") {
    await writeLocalFile(source.uri, buffer);
    return;
  }
  await uploadFile(source.token, source.fileId, buffer);
}

export async function clearSource(): Promise<void> {
  const sourceType = await getSourceType();
  if (sourceType === "drive") {
    await clearToken();
  }
  await AsyncStorage.removeItem(STORAGE_KEY_SOURCE_TYPE);
}

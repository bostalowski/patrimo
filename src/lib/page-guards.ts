import { redirect } from "next/navigation";
import { isExcelConfigured, validateExcelFile } from "@/lib/excel";
import { getConfiguredExcelPath } from "@/lib/config";

export function requireExcelConfigured(): void {
  if (!isExcelConfigured()) {
    redirect("/reglages");
  }
  const path = getConfiguredExcelPath();
  if (path) {
    const status = validateExcelFile(path);
    if (!status.valid) {
      redirect("/reglages");
    }
  }
}

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfiguredExcelPath } from "@/lib/config";
import { validateExcelFile } from "@/lib/excel";
import { SettingsClient, type SettingsStatus } from "./settings-client";

export const dynamic = "force-dynamic";

export default function ReglagesPage() {
  const excelPath = getConfiguredExcelPath();
  const initialStatus: SettingsStatus = excelPath
    ? (() => {
        const validation = validateExcelFile(excelPath);
        return validation.valid
          ? { excelPath, configured: true, valid: true }
          : {
              excelPath,
              configured: true,
              valid: false,
              reason: validation.reason,
              detail: validation.detail,
            };
      })()
    : { excelPath: null, configured: false, valid: false };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure le fichier Excel qui sert de source de vérité à l&apos;application.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Fichier source</CardTitle>
        </CardHeader>
        <CardBody>
          <SettingsClient initialStatus={initialStatus} />
        </CardBody>
      </Card>
    </div>
  );
}

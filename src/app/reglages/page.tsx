import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getConfiguredExcelPath,
  getInflationRate,
  getSyncIntervalMinutes,
} from "@/lib/config";
import { validateExcelFile } from "@/lib/excel";
import {
  InflationSettings,
  SettingsClient,
  SyncIntervalSettings,
  type SettingsStatus,
} from "./settings-client";

export const dynamic = "force-dynamic";

export default function ReglagesPage() {
  const excelPath = getConfiguredExcelPath();
  const inflationRate = getInflationRate();
  const syncIntervalMinutes = getSyncIntervalMinutes();
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

      <Card>
        <CardHeader>
          <CardTitle>Synchronisation des cours</CardTitle>
        </CardHeader>
        <CardBody>
          <SyncIntervalSettings initialMinutes={syncIntervalMinutes} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hypothèse d&apos;inflation</CardTitle>
        </CardHeader>
        <CardBody>
          <InflationSettings initialRate={inflationRate} />
        </CardBody>
      </Card>
    </div>
  );
}

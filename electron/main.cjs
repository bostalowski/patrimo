const {
  app,
  BrowserWindow,
  Menu,
  shell,
  dialog,
  ipcMain,
  utilityProcess,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");

const GITHUB_REPO = "bostalowski/patrimo";

function parseEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const parsed = parseEnvFile(filePath);
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}

const isDev = !app.isPackaged;
const DEV_URL = "http://localhost:3000";

let mainWindow = null;
let nextServerProcess = null;
let nextServerPort = null;

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}\n`;
  try {
    const logDir = app.getPath("logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, "main.log"), line);
  } catch {
    // best effort
  }
  console.log(line.trimEnd());
}

function getUserEnvPath() {
  return path.join(app.getPath("userData"), ".env.local");
}

function getBundledEnvExamplePath() {
  return isDev
    ? path.join(__dirname, "..", ".env.local.example")
    : path.join(process.resourcesPath, ".env.local.example");
}

function loadEnvFile() {
  if (isDev) {
    applyEnvFile(path.join(__dirname, "..", ".env.local"));
    return;
  }

  const userEnvPath = getUserEnvPath();
  if (!fs.existsSync(userEnvPath)) {
    const examplePath = getBundledEnvExamplePath();
    if (fs.existsSync(examplePath)) {
      fs.mkdirSync(path.dirname(userEnvPath), { recursive: true });
      fs.copyFileSync(examplePath, userEnvPath);
    }
  }

  applyEnvFile(userEnvPath);
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not determine free port"));
      }
    });
  });
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const req = http.request(
      url,
      { method: "HEAD", timeout: 2000, agent: false },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 500);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function waitForUrl(url, timeoutMs = 60000, intervalMs = 250, isAlive) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (typeof isAlive === "function" && !isAlive()) {
        reject(new Error(`Server process exited before ${url} became reachable`));
        return;
      }
      if (await probeUrl(url)) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function tailFile(filePath, maxBytes = 2000) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.length > maxBytes ? content.slice(-maxBytes) : content;
  } catch {
    return "";
  }
}

let nextServerUrl = null;

function getUserDataDir() {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDefaultExcelDir() {
  if (isDev) {
    const dir = path.join(__dirname, "..", "data");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return getUserDataDir();
}

async function startNextServer() {
  if (nextServerProcess && nextServerUrl) {
    return nextServerUrl;
  }

  const standaloneDir = path.join(process.resourcesPath, "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");

  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `Next standalone server not found at ${serverEntry}. Did you run \`npm run build\`?`,
    );
  }

  nextServerPort = await findFreePort();
  const logPath = path.join(app.getPath("logs"), "next-server.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  log(`Forking next server at ${serverEntry} on port ${nextServerPort}`);

  nextServerProcess = utilityProcess.fork(serverEntry, [], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(nextServerPort),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      FINGRAPHS_DATA_DIR: getUserDataDir(),
    },
    stdio: "pipe",
    serviceName: "next-server",
  });

  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  nextServerProcess.stdout?.pipe(logStream);
  nextServerProcess.stderr?.pipe(logStream);

  let serverAlive = true;
  nextServerProcess.on("exit", (code) => {
    serverAlive = false;
    log(`Next server exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox(
        "Serveur Next.js arrêté",
        `Le serveur a quitté avec le code ${code}. Voir les logs : ${logPath}`,
      );
    }
    nextServerProcess = null;
    nextServerUrl = null;
    app.quit();
  });

  nextServerUrl = `http://127.0.0.1:${nextServerPort}`;
  try {
    await waitForUrl(nextServerUrl, 60000, 250, () => serverAlive);
  } catch (error) {
    const logTail = tailFile(logPath);
    log(`Next server readiness failed: ${error}`);
    const detail = logTail
      ? `\n\nDerniers logs du serveur :\n${logTail}`
      : `\n\n(Aucun log serveur à ${logPath})`;
    throw new Error(`${error instanceof Error ? error.message : error}${detail}`);
  }
  log(`Next server ready at ${nextServerUrl}`);
  return nextServerUrl;
}

function stopNextServer() {
  if (nextServerProcess) {
    nextServerProcess.removeAllListeners("exit");
    nextServerProcess.kill();
    nextServerProcess = null;
    nextServerUrl = null;
  }
}

const BACKGROUND_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const BACKGROUND_SYNC_INITIAL_DELAY_MS = 10 * 1000;
let backgroundSyncTimer = null;
let backgroundSyncInitialTimeout = null;

function triggerBackgroundSync(baseUrl) {
  try {
    const target = new URL("/api/prices/sync?ifStale=1", baseUrl);
    const req = http.request(
      target,
      { method: "POST", timeout: 60000, agent: false },
      (res) => {
        res.resume();
      },
    );
    req.on("error", (err) => {
      log(`Background sync failed: ${err instanceof Error ? err.message : err}`);
    });
    req.on("timeout", () => req.destroy());
    req.end();
  } catch (err) {
    log(`Background sync error: ${err instanceof Error ? err.message : err}`);
  }
}

function startBackgroundSync(baseUrl) {
  stopBackgroundSync();
  backgroundSyncInitialTimeout = setTimeout(() => {
    triggerBackgroundSync(baseUrl);
  }, BACKGROUND_SYNC_INITIAL_DELAY_MS);
  backgroundSyncTimer = setInterval(() => {
    triggerBackgroundSync(baseUrl);
  }, BACKGROUND_SYNC_INTERVAL_MS);
}

function stopBackgroundSync() {
  if (backgroundSyncInitialTimeout) {
    clearTimeout(backgroundSyncInitialTimeout);
    backgroundSyncInitialTimeout = null;
  }
  if (backgroundSyncTimer) {
    clearInterval(backgroundSyncTimer);
    backgroundSyncTimer = null;
  }
}

function compareVersions(a, b) {
  const segments = (v) =>
    String(v)
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const left = segments(a);
  const right = segments(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        method: "GET",
        timeout: 8000,
        headers: {
          "User-Agent": "Patrimo",
          Accept: "application/vnd.github+json",
        },
      },
      (res) => {
        if ((res.statusCode ?? 500) >= 400) {
          res.resume();
          reject(new Error(`GitHub API responded ${res.statusCode}`));
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timed out reaching GitHub"));
    });
    req.end();
  });
}

function pickDownloadUrl(release) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const dmgAssets = assets.filter((asset) =>
    asset.name?.toLowerCase().endsWith(".dmg"),
  );
  const archMatch = dmgAssets.find((asset) =>
    asset.name?.toLowerCase().includes(arch),
  );
  return (
    archMatch?.browser_download_url ??
    dmgAssets[0]?.browser_download_url ??
    release.html_url
  );
}

async function checkForUpdates({ silent }) {
  try {
    const release = await fetchLatestRelease();
    const latest = release.tag_name;
    const current = app.getVersion();
    if (!latest) {
      throw new Error("No tag_name in latest release");
    }

    if (compareVersions(latest, current) <= 0) {
      log(`Up to date (current=${current}, latest=${latest})`);
      if (!silent) {
        await dialog.showMessageBox(mainWindow ?? undefined, {
          type: "info",
          title: "Mises à jour",
          message: "Vous êtes à jour.",
          detail: `Version installée : ${current}.`,
          buttons: ["OK"],
        });
      }
      return;
    }

    log(`Update available (current=${current}, latest=${latest})`);
    const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
      type: "info",
      title: "Mise à jour disponible",
      message: `Une nouvelle version de Patrimo est disponible (${latest.replace(/^v/, "")}).`,
      detail: `Version installée : ${current}.\nTélécharge la nouvelle version puis remplace l'app dans Applications.`,
      buttons: ["Télécharger", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      await shell.openExternal(pickDownloadUrl(release));
    }
  } catch (error) {
    log(`Update check failed: ${error instanceof Error ? error.message : error}`);
    if (!silent) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: "warning",
        title: "Mises à jour",
        message: "Impossible de vérifier les mises à jour.",
        detail:
          "Vérifie ta connexion internet et réessaie plus tard.\n" +
          `Tu peux aussi consulter https://github.com/${GITHUB_REPO}/releases/latest`,
        buttons: ["OK"],
      });
    }
  }
}

function buildMenu() {
  const template = [
    { role: "appMenu" },
    { role: "editMenu" },
    {
      label: "Affichage",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Configuration",
      submenu: [
        {
          label: "Vérifier les mises à jour…",
          click: () => {
            checkForUpdates({ silent: false });
          },
        },
        { type: "separator" },
        {
          label: "Ouvrir le fichier .env.local",
          click: () => {
            const target = isDev
              ? path.join(__dirname, "..", ".env.local")
              : getUserEnvPath();
            if (!fs.existsSync(target)) {
              dialog.showErrorBox(
                "Fichier introuvable",
                `Aucun fichier .env.local à ${target}.`,
              );
              return;
            }
            shell.openPath(target);
          },
        },
        {
          label: "Ouvrir le dossier de données (prix synchronisés)",
          click: () => {
            const target = isDev
              ? path.join(__dirname, "..", "data")
              : getUserDataDir();
            fs.mkdirSync(target, { recursive: true });
            shell.openPath(target);
          },
        },
        {
          label: "Révéler le dossier de configuration",
          click: () => {
            const target = isDev
              ? path.join(__dirname, "..")
              : app.getPath("userData");
            shell.openPath(target);
          },
        },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function getAppIconPath() {
  const candidates = isDev
    ? [path.join(__dirname, "..", "build", "icon.png")]
    : [
        path.join(process.resourcesPath, "icon.png"),
        path.join(process.resourcesPath, "app.asar.unpacked", "build", "icon.png"),
      ];
  return candidates.find((p) => fs.existsSync(p));
}

async function createMainWindow(targetUrl) {
  const iconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "Patrimo",
    backgroundColor: "#0a0a0a",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(targetUrl);
}

function registerIpcHandlers() {
  ipcMain.handle("fingraphs:pick-excel-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: "Choisir un classeur Excel",
      defaultPath: getDefaultExcelDir(),
      properties: ["openFile"],
      filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("fingraphs:pick-new-excel-location", async (_event, defaultName) => {
    const fileName =
      typeof defaultName === "string" && defaultName.length > 0
        ? defaultName
        : "Investissement.xlsx";
    const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
      title: "Créer un nouveau classeur Excel",
      defaultPath: path.join(getDefaultExcelDir(), fileName),
      filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }],
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
}

async function bootstrap() {
  log(`Bootstrap (isDev=${isDev}, packaged=${app.isPackaged})`);
  loadEnvFile();
  log(`EXCEL_PATH=${process.env.EXCEL_PATH || "(unset, onboarding in-app)"}`);
  buildMenu();
  registerIpcHandlers();

  try {
    const url = isDev ? DEV_URL : await startNextServer();
    if (isDev) {
      await waitForUrl(url, 60000);
    }
    log(`Loading window at ${url}`);
    await createMainWindow(url);
    startBackgroundSync(url);
    if (!isDev) {
      checkForUpdates({ silent: true });
    }
  } catch (error) {
    log(`Bootstrap error: ${error instanceof Error ? error.stack : error}`);
    dialog.showErrorBox(
      "Démarrage impossible",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  stopBackgroundSync();
  stopNextServer();
});
app.on("will-quit", () => {
  stopBackgroundSync();
  stopNextServer();
});

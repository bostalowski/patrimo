const { app, BrowserWindow, Menu, shell, dialog, utilityProcess } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");

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

function waitForUrl(url, timeoutMs = 30000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok || res.status < 500) {
          resolve();
          return;
        }
      } catch {
        // server not ready yet
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

let nextServerUrl = null;

function getUserDataDir() {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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

  nextServerProcess.on("exit", (code) => {
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
  await waitForUrl(nextServerUrl);
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
    title: "Financial Graphs",
    backgroundColor: "#0a0a0a",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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

function ensureExcelPathConfigured() {
  if (process.env.EXCEL_PATH && process.env.EXCEL_PATH.trim().length > 0) {
    return true;
  }
  const userEnvPath = getUserEnvPath();
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    title: "Configuration requise",
    message: "EXCEL_PATH n'est pas configuré.",
    detail: `Édite le fichier suivant pour pointer vers ton classeur Excel, puis relance l'app :\n\n${userEnvPath}`,
    buttons: ["Ouvrir le fichier", "Quitter"],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice === 0) {
    shell.openPath(userEnvPath);
  }
  return false;
}

async function bootstrap() {
  log(`Bootstrap (isDev=${isDev}, packaged=${app.isPackaged})`);
  loadEnvFile();
  log(`EXCEL_PATH=${process.env.EXCEL_PATH || "(unset)"}`);
  buildMenu();

  if (!isDev && !ensureExcelPathConfigured()) {
    app.quit();
    return;
  }

  try {
    const url = isDev ? DEV_URL : await startNextServer();
    if (isDev) {
      await waitForUrl(url, 60000);
    }
    log(`Loading window at ${url}`);
    await createMainWindow(url);
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (mainWindow) return;
  try {
    const url = isDev ? DEV_URL : nextServerUrl || (await startNextServer());
    await createMainWindow(url);
  } catch (error) {
    log(`Activate error: ${error instanceof Error ? error.stack : error}`);
  }
});

app.on("before-quit", stopNextServer);
app.on("will-quit", stopNextServer);

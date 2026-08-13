/* eslint-disable @typescript-eslint/no-require-imports -- electron-builder afterPack hook is CommonJS */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  const nextModule = path.join(
    appPath,
    "Contents",
    "Resources",
    "standalone",
    "node_modules",
    "next",
    "package.json",
  );

  if (!fs.existsSync(nextModule)) {
    throw new Error(
      `Packaged app is missing standalone/node_modules/next (${nextModule}). ` +
        "electron-builder skips top-level node_modules in extraResources unless " +
        "copied via a dedicated from path — check electron-builder.yml.",
    );
  }

  console.log(`  • ad-hoc signing ${appName}`);
  execFileSync(
    "codesign",
    ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath],
    { stdio: "inherit" },
  );

  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], {
    stdio: "inherit",
  });
};

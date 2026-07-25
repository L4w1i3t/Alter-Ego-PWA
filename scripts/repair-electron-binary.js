#!/usr/bin/env node
/**
 * Repairs a half-installed Electron binary.
 *
 * Why this exists
 * ---------------
 * `electron`'s own postinstall downloads a ~140 MB zip and unpacks it with
 * extract-zip. On this project's Windows + Node 24 setup that unpack stalls
 * partway through the first file and the process exits 0, leaving
 * node_modules/electron/dist containing a single empty directory and no
 * path.txt. Nothing reports an error, so the failure only shows up later as:
 *
 *   Error: Electron failed to install correctly, please delete
 *   node_modules/electron and try installing again
 *
 * Deleting node_modules/electron and reinstalling does not help -- the same
 * unpack runs and fails the same way.
 *
 * What it does
 * ------------
 * Exactly what electron/install.js would have done, using the OS unzip tool
 * instead of extract-zip: unpack the already-downloaded zip from @electron/get's
 * cache into dist/, lift electron.d.ts up a level, and write path.txt. The zip
 * is reused if present and downloaded via @electron/get if not, so this never
 * re-downloads unnecessarily.
 *
 * Run with: npm run electron:repair
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');

function platformPath() {
  switch (os.platform()) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error(`Electron builds are not available on ${os.platform()}`);
  }
}

function isHealthy(expectedVersion) {
  try {
    const distVersion = fs
      .readFileSync(path.join(electronDir, 'dist', 'version'), 'utf-8')
      .replace(/^v/, '');
    if (distVersion !== expectedVersion) return false;
    if (
      fs.readFileSync(path.join(electronDir, 'path.txt'), 'utf-8').trim() !==
      platformPath()
    ) {
      return false;
    }
    return fs.existsSync(path.join(electronDir, 'dist', platformPath()));
  } catch {
    return false;
  }
}

/** Unpacks with the OS tool. extract-zip is exactly what we are working around. */
function unzip(zipPath, destDir) {
  if (os.platform() === 'win32') {
    // Expand-Archive ships with Windows PowerShell 5.1, so it is always present.
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ],
      { stdio: 'inherit' }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Expand-Archive exited with code ${result.status}`);
    }
    return;
  }

  const result = spawnSync('unzip', ['-q', '-o', zipPath, '-d', destDir], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`unzip exited with code ${result.status}`);
  }
}

async function main() {
  if (!fs.existsSync(electronDir)) {
    console.error(
      'node_modules/electron is not present. Run `npm install` first.'
    );
    process.exit(1);
  }

  const { version } = require(path.join(electronDir, 'package.json'));

  if (isHealthy(version)) {
    console.log(`Electron ${version} is already installed correctly.`);
    return;
  }

  console.log(`Repairing Electron ${version}...`);

  // Reuses the cached zip; only downloads when the cache is cold.
  const { downloadArtifact } = require('@electron/get');
  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    checksums: require(path.join(electronDir, 'checksums.json')),
    platform: process.env.npm_config_platform || process.platform,
    arch: process.env.npm_config_arch || process.arch,
  });
  console.log(`Using archive: ${zipPath}`);

  const distDir = path.join(electronDir, 'dist');
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  unzip(zipPath, distDir);

  // install.js moves the bundled type definitions out of dist/.
  const bundledTypes = path.join(distDir, 'electron.d.ts');
  if (fs.existsSync(bundledTypes)) {
    fs.renameSync(bundledTypes, path.join(electronDir, 'electron.d.ts'));
  }

  fs.writeFileSync(path.join(electronDir, 'path.txt'), platformPath());

  if (!isHealthy(version)) {
    console.error(
      'Repair finished but the install still looks wrong. Check the output above.'
    );
    process.exit(1);
  }

  console.log(
    `Electron ${version} repaired: ${path.join(distDir, platformPath())}`
  );
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});

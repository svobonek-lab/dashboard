import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function cleanNpmBuildEnvironment(environment) {
  return Object.fromEntries(Object.entries(environment).filter(([key]) =>
    key.toLowerCase() !== 'npm_config_allow_scripts'));
}

export function findVercelCli(pathValue = process.env.PATH || '', platform = process.platform) {
  const separator = platform === 'win32' ? ';' : ':';
  for (const entry of pathValue.split(separator).filter(Boolean)) {
    const packageJsonPath = resolve(entry, '..', 'vercel', 'package.json');
    if (!existsSync(packageJsonPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.vercel;
      if (typeof bin === 'string' && bin) return resolve(dirname(packageJsonPath), bin);
    } catch {
      // Ignore unrelated or incomplete PATH entries and keep searching.
    }
  }
  throw new Error('Vercel CLI package is not present on the npm exec PATH.');
}

export function runVercelBuild(args = process.argv.slice(2), options = {}) {
  const cliPath = options.cliPath || findVercelCli(options.pathValue, options.platform);
  const environment = cleanNpmBuildEnvironment(options.environment || process.env);
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw new Error('Could not start the Vercel Preview build.');
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = runVercelBuild();
  } catch (error) {
    console.error(JSON.stringify({
      code: 'VERCEL_STAGING_BUILD_FAILED',
      message: error instanceof Error ? error.message : 'Could not run the Vercel Preview build.',
    }));
    process.exitCode = 1;
  }
}

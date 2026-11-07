import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function extractVercelPreviewUrl(output) {
  const matches = [...output.matchAll(/^\s*Preview\s+(https:\/\/[a-z0-9-]+\.vercel\.app)\s*$/gim)];
  if (matches.length !== 1) {
    throw new Error('Expected exactly one labeled Preview URL in Vercel deployment output.');
  }

  return matches[0][1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.stdout.write(`${extractVercelPreviewUrl(readFileSync(0, 'utf8'))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

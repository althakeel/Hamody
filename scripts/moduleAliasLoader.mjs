import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) {
    return nextResolve(specifier, context);
  }

  const basePath = path.resolve(projectRoot, specifier.slice(2));
  const candidates = path.extname(basePath)
    ? [basePath]
    : [
        `${basePath}.js`,
        `${basePath}.jsx`,
        `${basePath}.mjs`,
        `${basePath}.json`,
        path.join(basePath, 'index.js'),
        path.join(basePath, 'index.mjs'),
      ];
  const match = candidates.find(existsSync);

  if (!match) {
    return nextResolve(specifier, context);
  }

  return nextResolve(pathToFileURL(match).href, context);
}

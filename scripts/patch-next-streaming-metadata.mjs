/**
 * Next.js streams title/canonical/meta description outside head when:
 * 1) User-Agent is empty (ISR revalidate / export), or
 * 2) serveStreamingMetadata is forced true during export.
 *
 * With htmlLimitedBots matching all UAs we want metadata ALWAYS blocking so
 * SEO crawlers (and CDN caches that ignore Vary: User-Agent) never store
 * body-placed tags.
 *
 * Idempotent — safe to run on every install/build.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const require = createRequire(import.meta.url);

function nextFile(...parts) {
  return path.join(projectRoot, 'node_modules', 'next', ...parts);
}

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-next-streaming-metadata] skip missing ${path.relative(projectRoot, filePath)}`);
    return false;
  }
  let source = fs.readFileSync(filePath, 'utf8');
  const original = source;
  for (const { find, replace, label } of replacements) {
    if (source.includes(replace.trim()) || source.includes('HAMODY_BLOCK_STREAMING_METADATA')) {
      continue;
    }
    if (!source.includes(find)) {
      console.warn(`[patch-next-streaming-metadata] pattern not found (${label}) in ${path.relative(projectRoot, filePath)}`);
      continue;
    }
    source = source.replace(find, replace);
  }
  if (source === original) return false;
  fs.writeFileSync(filePath, source);
  console.log(`[patch-next-streaming-metadata] patched ${path.relative(projectRoot, filePath)}`);
  return true;
}

const APP_PAGE_FIND_CJS =
  'const serveStreamingMetadata = botType && isRoutePPREnabled ? false : !userAgent ? true : (0, _streamingmetadata.shouldServeStreamingMetadata)(userAgent, nextConfig.htmlLimitedBots);';
const APP_PAGE_REPLACE_CJS = `const serveStreamingMetadata = /* HAMODY_BLOCK_STREAMING_METADATA */ botType && isRoutePPREnabled ? false : nextConfig.htmlLimitedBots === '.*' ? false : !userAgent ? true : (0, _streamingmetadata.shouldServeStreamingMetadata)(userAgent, nextConfig.htmlLimitedBots);`;

const APP_PAGE_FIND_ESM =
  'const serveStreamingMetadata = botType && isRoutePPREnabled ? false : !userAgent ? true : shouldServeStreamingMetadata(userAgent, nextConfig.htmlLimitedBots);';
const APP_PAGE_REPLACE_ESM = `const serveStreamingMetadata = /* HAMODY_BLOCK_STREAMING_METADATA */ botType && isRoutePPREnabled ? false : nextConfig.htmlLimitedBots === '.*' ? false : !userAgent ? true : shouldServeStreamingMetadata(userAgent, nextConfig.htmlLimitedBots);`;

const STREAMING_FIND = `function shouldServeStreamingMetadata(userAgent, htmlLimitedBots) {
    const blockingMetadataUARegex = new RegExp(htmlLimitedBots || _isbot.HTML_LIMITED_BOT_UA_RE_STRING, 'i');
    // Only block metadata for HTML-limited bots
    if (userAgent && blockingMetadataUARegex.test(userAgent)) {
        return false;
    }
    return true;
}`;

const STREAMING_REPLACE = `function shouldServeStreamingMetadata(userAgent, htmlLimitedBots) {
    // HAMODY_BLOCK_STREAMING_METADATA: htmlLimitedBots /.*/ must also cover empty-UA ISR/export.
    if (htmlLimitedBots === '.*') {
        return false;
    }
    const blockingMetadataUARegex = new RegExp(htmlLimitedBots || _isbot.HTML_LIMITED_BOT_UA_RE_STRING, 'i');
    // Only block metadata for HTML-limited bots
    if (userAgent && blockingMetadataUARegex.test(userAgent)) {
        return false;
    }
    return true;
}`;

const STREAMING_FIND_ESM = `export function shouldServeStreamingMetadata(userAgent, htmlLimitedBots) {
    const blockingMetadataUARegex = new RegExp(htmlLimitedBots || HTML_LIMITED_BOT_UA_RE_STRING, 'i');
    // Only block metadata for HTML-limited bots
    if (userAgent && blockingMetadataUARegex.test(userAgent)) {
        return false;
    }
    return true;
}`;

const STREAMING_REPLACE_ESM = `export function shouldServeStreamingMetadata(userAgent, htmlLimitedBots) {
    // HAMODY_BLOCK_STREAMING_METADATA: htmlLimitedBots /.*/ must also cover empty-UA ISR/export.
    if (htmlLimitedBots === '.*') {
        return false;
    }
    const blockingMetadataUARegex = new RegExp(htmlLimitedBots || HTML_LIMITED_BOT_UA_RE_STRING, 'i');
    // Only block metadata for HTML-limited bots
    if (userAgent && blockingMetadataUARegex.test(userAgent)) {
        return false;
    }
    return true;
}`;

const EXPORT_FIND = `        // During the export phase in next build, we always enable the streaming metadata since if there's
        // any dynamic access in metadata we can determine it in the build phase.
        // If it's static, then it won't affect anything.
        // If it's dynamic, then it can be handled when request hits the route.
        serveStreamingMetadata: true,`;

const EXPORT_REPLACE = `        // HAMODY_BLOCK_STREAMING_METADATA: keep title/canonical/description in <head> for SEO crawlers.
        serveStreamingMetadata: false,`;

let changed = false;
changed = patchFile(nextFile('dist', 'build', 'templates', 'app-page.js'), [
  { find: APP_PAGE_FIND_CJS, replace: APP_PAGE_REPLACE_CJS, label: 'app-page cjs' },
]) || changed;
changed = patchFile(nextFile('dist', 'esm', 'build', 'templates', 'app-page.js'), [
  { find: APP_PAGE_FIND_ESM, replace: APP_PAGE_REPLACE_ESM, label: 'app-page esm' },
]) || changed;
changed = patchFile(nextFile('dist', 'server', 'lib', 'streaming-metadata.js'), [
  { find: STREAMING_FIND, replace: STREAMING_REPLACE, label: 'streaming-metadata cjs' },
]) || changed;
changed = patchFile(nextFile('dist', 'esm', 'server', 'lib', 'streaming-metadata.js'), [
  { find: STREAMING_FIND_ESM, replace: STREAMING_REPLACE_ESM, label: 'streaming-metadata esm' },
]) || changed;
changed = patchFile(nextFile('dist', 'export', 'worker.js'), [
  { find: EXPORT_FIND, replace: EXPORT_REPLACE, label: 'export worker cjs' },
]) || changed;
changed = patchFile(nextFile('dist', 'esm', 'export', 'worker.js'), [
  { find: EXPORT_FIND, replace: EXPORT_REPLACE, label: 'export worker esm' },
]) || changed;

try {
  require.resolve('next/package.json');
} catch {
  console.warn('[patch-next-streaming-metadata] next is not installed');
  process.exit(0);
}

if (!changed) {
  console.log('[patch-next-streaming-metadata] already applied or nothing to change');
}

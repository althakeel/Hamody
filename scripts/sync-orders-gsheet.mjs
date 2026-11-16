/**
 * Force-sync HAMODY orders into the orders Google Sheet.
 * Usage: node --env-file=.env --import ./scripts/registerModuleAliasLoader.mjs scripts/sync-orders-gsheet.mjs
 */
import { syncOrdersToGoogleSheet } from '@/lib/googleSheetsOrders.js';

console.log('Starting orders Google Sheet sync…');
const started = Date.now();

try {
  const result = await syncOrdersToGoogleSheet();
  console.log(JSON.stringify({
    ok: true,
    elapsedMs: Date.now() - started,
    ...result,
  }, null, 2));
  process.exit(0);
} catch (error) {
  console.error('Sync failed:', error?.message || error);
  if (error?.stack) console.error(error.stack);
  process.exit(1);
}

const dns = require('dns').promises;

const hosts = [
  'testapi.vaultspay.com',
  'liveapi.vaultspay.com',
  'api.vaultspay.com',
  'prodapi.vaultspay.com',
  'production.vaultspay.com',
  'secureapi.vaultspay.com',
  'gatewayapi.vaultspay.com',
  'merchantapi.vaultspay.com',
  'pgapi.vaultspay.com',
  'epg.vaultspay.com',
  'live.vaultspay.com',
  'app.vaultspay.com',
  'dashboard.vaultspay.com',
  'noor.vaultspay.ae',
];

async function main() {
  for (const h of hosts) {
    try {
      const a = await dns.lookup(h);
      console.log(h, a.address);
    } catch (e) {
      console.log(h, 'FAIL', e.code);
    }
  }
}

main();

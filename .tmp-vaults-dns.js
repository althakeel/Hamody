const dns = require('dns').promises;

async function main() {
  const hosts = [
    'noor.vaultspay.ae',
    'testapi.vaultspay.com',
    'api.vaultspay.ae',
    'epg.vaultspay.ae',
    'sdk.vaultspay.ae',
    'pay.vaultspay.ae',
  ];
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

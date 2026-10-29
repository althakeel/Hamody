const fs = require('fs');
const path = require('path');

const files = [
  'src/SDK/Services/AuthService.php',
  'src/SDK/Services/PaymentService.php',
  'src/SDK/Services/MethodService.php',
  'src/SDK/Services/VerificationService.php',
  'src/SDK/Http/HttpClient.php',
  'src/Client.php',
  'src/SDK/Config.php',
];

async function main() {
  const dir = path.join(__dirname, '.tmp-vaults-src');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const url = `https://raw.githubusercontent.com/manjeet2905/vaultspay-payment-gateway/1.0.1/${file}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log('FAIL', res.status, file);
      continue;
    }
    const text = await res.text();
    const out = path.join(dir, file.replaceAll('/', '__'));
    fs.writeFileSync(out, text);
    console.log('OK', file, text.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

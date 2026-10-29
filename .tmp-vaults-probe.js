async function main() {
  const res = await fetch('https://merchant.vaultspay.com/');
  const t = await res.text();
  const urls = [...t.matchAll(/https?:[^"'\\s<>]+/g)].map((m) => m[0]);
  const scripts = [...t.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
  console.log('URLS');
  console.log([...new Set(urls)].join('\n'));
  console.log('SCRIPTS');
  console.log([...new Set(scripts)].join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

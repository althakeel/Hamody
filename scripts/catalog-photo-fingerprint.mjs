import sharp from 'sharp';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const dir = process.argv[2];
if (!dir) {
  console.error('missing dir');
  process.exit(1);
}

const names = (await readdir(dir)).filter((name) => name.endsWith('.img')).sort();
const hashes = [];
for (const name of names) {
  const data = await sharp(await readFile(join(dir, name)), { failOn: 'none' })
    .rotate()
    .trim({ threshold: 18 })
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  const bits = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits.push(data[y * 9 + x] > data[y * 9 + x + 1] ? 1 : 0);
    }
  }
  hashes.push(bits);
}

process.stdout.write(JSON.stringify(hashes));

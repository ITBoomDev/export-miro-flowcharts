// Builds dist/export-miro-flowcharts.zip for the Chrome Web Store.
// No dependencies, works on any OS (the old `zip` CLI is missing on Windows).
// Run: bun tools/zip.mjs

import { deflateRawSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDE = ['manifest.json', 'LICENSE', '_locales', 'src', 'icons'];
const OUT = join(ROOT, 'dist', 'export-miro-flowcharts.zip');

const files = [];
const walk = p => {
  const st = statSync(p);
  if (st.isDirectory()) readdirSync(p).sort().forEach(f => walk(join(p, f)));
  else files.push(relative(ROOT, p).replaceAll('\\', '/'));
};
INCLUDE.forEach(p => walk(join(ROOT, p)));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

const locals = [], centrals = [];
let offset = 0;
for (const name of files) {
  const data = readFileSync(join(ROOT, name));
  const deflated = deflateRawSync(data, { level: 9 });
  const [method, body] = deflated.length < data.length ? [8, deflated] : [0, data];
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);            // version needed
  local.writeUInt16LE(0x0800, 6);        // UTF-8 names
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  locals.push(local, nameBuf, body);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);          // version made by
  central.writeUInt16LE(20, 6);          // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, nameBuf);

  offset += 30 + nameBuf.length + body.length;
}

const centralSize = centrals.reduce((s, b) => s + b.length, 0);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(offset, 16);

mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(OUT, Buffer.concat([...locals, ...centrals, eocd]));
console.log(`${relative(ROOT, OUT)}: ${files.length} files, ${statSync(OUT).size} bytes`);

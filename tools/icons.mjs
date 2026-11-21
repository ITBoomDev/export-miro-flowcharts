// Generates icons/icon{16,32,48,128}.png — no dependencies, pure zlib PNG writer.
// Design: indigo rounded square + white flowchart glyph (process box → decision diamond).
// Run: bun tools/icons.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const SIZES = [16, 32, 48, 128];

// colors
const BG_TOP = [0x2b, 0x3c, 0xa4];    // indigo gradient top
const BG_BOT = [0x18, 0x22, 0x66];    // indigo gradient bottom (brand #1e2a78 family)
const FG = [0xff, 0xff, 0xff];

// signed distances in normalized [0..1] space; negative = inside
const sdRoundRect = (x, y, cx, cy, hw, hh, r) => {
  const dx = Math.abs(x - cx) - hw + r, dy = Math.abs(y - cy) - hh + r;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
};
const sdDiamond = (x, y, cx, cy, h) => (Math.abs(x - cx) + Math.abs(y - cy)) - h;

const inBg = (x, y) => sdRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, 0.21) < 0;
const inGlyph = (x, y) =>
  sdRoundRect(x, y, 0.5, 0.295, 0.215, 0.093, 0.045) < 0 ||          // process box
  sdRoundRect(x, y, 0.5, 0.47, 0.027, 0.09, 0.027) < 0 ||           // connector line
  sdDiamond(x, y, 0.5, 0.675, 0.185) < 0;                           // decision diamond

function renderRGBA(size) {
  const px = new Uint8Array(size * size * 4);
  const SS = 4, step = 1 / (size * SS);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 0, r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x * SS + sx + 0.5) * step, v = (y * SS + sy + 0.5) * step;
          if (!inBg(u, v)) continue;
          const c = inGlyph(u, v) ? FG : BG_TOP.map((t, i) => Math.round(t + (BG_BOT[i] - t) * v));
          a++; r += c[0]; g += c[1]; b += c[2];
        }
      }
      const o = (y * size + x) * 4, n = SS * SS;
      px[o] = a ? Math.round(r / a) : 0;
      px[o + 1] = a ? Math.round(g / a) : 0;
      px[o + 2] = a ? Math.round(b / a) : 0;
      px[o + 3] = Math.round((a / n) * 255);
    }
  }
  return px;
}

// minimal PNG writer (RGBA8, no filters)
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
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const s of SIZES) {
  const file = join(OUT, `icon${s}.png`);
  writeFileSync(file, png(s, renderRGBA(s)));
  console.log(`icons/icon${s}.png`);
}

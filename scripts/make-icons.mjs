// Erzeugt die App-Icons (orangenes Quadrat mit Hantel) als PNG ohne zusätzliche Pakete.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
// Zeichnung: Hintergrund orange, Hantel in dunklem Braun-Schwarz
function draw(size) {
  const bg = [255, 107, 26], fg = [19, 8, 0];
  const s = size;
  const rect = (x, y, x0, y0, x1, y1) => x >= x0 * s && x < x1 * s && y >= y0 * s && y < y1 * s;
  return (x, y) => {
    const bar = rect(x, y, 0.20, 0.46, 0.80, 0.54);
    const plateL = rect(x, y, 0.16, 0.30, 0.27, 0.70) || rect(x, y, 0.28, 0.36, 0.36, 0.64);
    const plateR = rect(x, y, 0.73, 0.30, 0.84, 0.70) || rect(x, y, 0.64, 0.36, 0.72, 0.64);
    return bar || plateL || plateR ? [...fg, 255] : [...bg, 255];
  };
}
mkdirSync('public/icons', { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, draw(size)));
}
console.log('Icons erzeugt');

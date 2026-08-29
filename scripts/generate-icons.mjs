/**
 * Genere les icones PNG de la PWA (aucune dependance externe).
 * Carre jaune arrondi + lettre "m" foncee.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const BG = [255, 201, 60];
const INK = [42, 33, 9];

// Glyphe "m" 7x5 (1 = pixel encre)
const GLYPH = [
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 0, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function makePng(size, { rounded = true } = {}) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const rows = [];
  const glyphH = Math.round(size * 0.46);
  const cell = Math.max(1, Math.round(glyphH / GLYPH.length));
  const glyphHeight = cell * GLYPH.length;
  const glyphWidth = cell * GLYPH[0].length;
  const offsetX = Math.round((size - glyphWidth) / 2);
  const offsetY = Math.round((size - glyphHeight) / 2);

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = 1 + x * 4;
      let alpha = 255;
      if (rounded) {
        const dx = x < radius ? radius - x : x >= size - radius ? x - (size - radius - 1) : 0;
        const dy = y < radius ? radius - y : y >= size - radius ? y - (size - radius - 1) : 0;
        if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > radius) alpha = 0;
      }
      let color = BG;
      const gx = Math.floor((x - offsetX) / cell);
      const gy = Math.floor((y - offsetY) / cell);
      if (gy >= 0 && gy < GLYPH.length && gx >= 0 && gx < GLYPH[0].length && GLYPH[gy][gx]) {
        color = INK;
      }
      row[i] = color[0];
      row[i + 1] = color[1];
      row[i + 2] = color[2];
      row[i + 3] = alpha;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Fabrique un fichier .ico contenant plusieurs PNG (format accepté depuis
 * Windows Vista). electron-builder exige au moins une image 256x256.
 */
function makeIco(sizes) {
  const images = sizes.map((size) => ({ size, data: makePng(size, { rounded: false }) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size; // 0 signifie 256
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry[2] = 0; // palette
    entry[3] = 0; // réservé
    entry.writeUInt16LE(1, 4); // plans
    entry.writeUInt16LE(32, 6); // bits par pixel
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const outDir = path.join(process.cwd(), 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePng(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePng(512));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), makePng(512, { rounded: false }));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), makePng(180, { rounded: false }));

// Icônes de l'application de bureau (utilisées par electron-builder)
const desktopDir = path.join(process.cwd(), 'electron', 'assets');
fs.mkdirSync(desktopDir, { recursive: true });
fs.writeFileSync(path.join(desktopDir, 'icon.png'), makePng(512, { rounded: false }));
fs.writeFileSync(path.join(desktopDir, 'icon.ico'), makeIco([16, 24, 32, 48, 64, 128, 256]));

console.log('Icônes générées dans public/ et electron/assets/');

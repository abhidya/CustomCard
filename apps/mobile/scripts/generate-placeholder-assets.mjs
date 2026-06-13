// Generates valid placeholder PNG assets (solid brand color) for the Expo app
// icon, Android adaptive icon, and splash image. Replace with real brand
// artwork before store submission — see STORE_RELEASE_CHECKLIST.md.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(assetsDir, { recursive: true });

const brand = [0x17, 0x29, 0x27]; // #172927
const accent = [0xcd, 0xe9, 0xdf]; // #cde9df

writeFileSync(resolve(assetsDir, "icon.png"), buildPng(1024, 1024, brand, accent));
writeFileSync(resolve(assetsDir, "adaptive-icon.png"), buildPng(1024, 1024, brand, accent));
writeFileSync(resolve(assetsDir, "splash-icon.png"), buildPng(512, 512, brand, accent));
console.log(`Wrote placeholder PNG assets to ${assetsDir}`);

function buildPng(width, height, bg, fg) {
  // Solid background with a centered square so the placeholder is visibly an
  // intentional mark rather than a blank tile.
  const raw = Buffer.alloc(height * (1 + width * 3));
  const inset = Math.floor(width / 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const inMark = x >= inset && x < width - inset && y >= inset && y < height - inset;
      const [r, g, b] = inMark ? fg : bg;
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

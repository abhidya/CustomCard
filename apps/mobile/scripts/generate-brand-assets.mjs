// Generates production-ready CustomCard app icon, Android adaptive icon, and
// splash PNGs: a deep-green brand field with a centered mint card tile carrying
// a deep-green heart. Drawn with pure pixel math so release checks do not depend
// on native image libraries.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(assetsDir, { recursive: true });

const brand = [0x17, 0x29, 0x27]; // #172927 deep green
const card = [0xcd, 0xe9, 0xdf]; // #cde9df mint
const heart = [0x17, 0x29, 0x27]; // deep green on the card

writeFileSync(resolve(assetsDir, "icon.png"), buildMark(1024, 1024, { bleed: false }));
writeFileSync(resolve(assetsDir, "adaptive-icon.png"), buildMark(1024, 1024, { bleed: true }));
writeFileSync(resolve(assetsDir, "splash-icon.png"), buildMark(512, 512, { bleed: false }));
console.log(`Wrote brand-mark PNG assets to ${assetsDir}`);

function buildMark(width, height, { bleed }) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  const cx = width / 2;
  const cy = height / 2;
  // Android adaptive icons get cropped to a circle/squircle, so keep the card
  // smaller (more safe-zone padding) when bleed is requested.
  const cardHalf = (bleed ? 0.30 : 0.36) * width;
  const cardRadius = width * 0.07;
  const heartR = cardHalf * 0.62;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      let rgb = brand;
      if (insideRoundedSquare(x, y, cx, cy, cardHalf, cardRadius)) {
        rgb = insideHeart(x, y, cx, cy - height * 0.01, heartR) ? heart : card;
      }
      const px = rowStart + 1 + x * 3;
      raw[px] = rgb[0];
      raw[px + 1] = rgb[1];
      raw[px + 2] = rgb[2];
    }
  }

  return encodePng(width, height, raw);
}

function insideRoundedSquare(x, y, cx, cy, half, radius) {
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  if (dx > half || dy > half) return false;
  const inner = half - radius;
  if (dx <= inner || dy <= inner) return true;
  const ddx = dx - inner;
  const ddy = dy - inner;
  return ddx * ddx + ddy * ddy <= radius * radius;
}

function insideHeart(x, y, cx, cy, r) {
  // Implicit heart curve (y flipped because image space grows downward).
  const nx = (x - cx) / r;
  const ny = (cy - y) / r;
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
}

function encodePng(width, height, raw) {
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

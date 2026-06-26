// Deterministic PWA icon generator — renders the CustomCard mark (dark field,
// card face, heart) to PNG without any image dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");

const colors = {
  field: [0x17, 0x29, 0x27],
  card: [0xf4, 0xf7, 0xf6],
  border: [0x25, 0x84, 0x77],
  heart: [0xd6, 0x60, 0x4f]
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function insideHeart(unitX, unitY) {
  // Implicit heart curve: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
  const x = unitX * 2.6;
  const y = -unitY * 2.6;
  const base = x * x + y * y - 1;
  return base * base * base - x * x * y * y * y <= 0;
}

function pixelColor(x, y, size) {
  const cardLeft = size * 0.1875;
  const cardRight = size * 0.8125;
  const cardTop = size * 0.25;
  const cardBottom = size * 0.75;
  const borderWidth = size * 0.03;

  const inCard = x >= cardLeft && x <= cardRight && y >= cardTop && y <= cardBottom;
  if (!inCard) return colors.field;

  const heartCenterX = size * 0.5;
  const heartCenterY = size * 0.52;
  const heartRadius = size * 0.16;
  if (insideHeart((x - heartCenterX) / heartRadius, (y - heartCenterY) / heartRadius)) {
    return colors.heart;
  }

  const onBorder =
    x < cardLeft + borderWidth ||
    x > cardRight - borderWidth ||
    y < cardTop + borderWidth ||
    y > cardBottom - borderWidth;
  return onBorder ? colors.border : colors.card;
}

function renderPng(size) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0; // filter type: none
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixelColor(x, y, size);
      const offset = y * stride + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const outputs = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180]
];

for (const [fileName, size] of outputs) {
  const png = renderPng(size);
  writeFileSync(join(publicDir, fileName), png);
  console.log(`wrote public/${fileName} (${size}x${size}, ${png.length} bytes)`);
}

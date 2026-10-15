// Genera los íconos PNG de la app sin dependencias: dibuja los píxeles a mano
// y los codifica con zlib, que ya viene en Node.
import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

const BG = [18, 24, 32]; // #121820
const FG = [71, 155, 224]; // celeste, un poco más claro que el de la app para que resalte

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // RGB
  // scanlines con byte de filtro 0 adelante
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const off = y * (size * 3 + 1);
    raw[off] = 0;
    pixels.copy(raw, off + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Una mancuerna, en coordenadas de 0 a 1 para que escale a cualquier tamaño.
// [x1, y1, x2, y2, radio]
const BAR = [
  [0.29, 0.455, 0.71, 0.545, 0.012], // barra
  [0.2, 0.355, 0.29, 0.645, 0.028], // disco grande izquierdo
  [0.71, 0.355, 0.8, 0.645, 0.028], // disco grande derecho
  [0.14, 0.41, 0.2, 0.59, 0.022], // disco chico izquierdo
  [0.8, 0.41, 0.86, 0.59, 0.022], // disco chico derecho
];

function inRounded(x, y, [x1, y1, x2, y2, r]) {
  if (x < x1 || x > x2 || y < y1 || y > y2) return false;
  const cx = Math.min(Math.max(x, x1 + r), x2 - r);
  const cy = Math.min(Math.max(y, y1 + r), y2 - r);
  const dx = x - cx,
    dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function render(size, { bleed }) {
  const px = Buffer.alloc(size * size * 3);
  // antialias simple: 3x3 muestras por píxel
  const S = 3;
  const radius = bleed ? 0 : 0.17; // esquinas redondeadas salvo en el maskable
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let fg = 0,
        inside = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size,
            v = (y + (sy + 0.5) / S) / size;
          const onCanvas =
            radius === 0 ? true : inRounded(u, v, [0, 0, 1, 1, radius]);
          if (!onCanvas) continue;
          inside++;
          if (BAR.some((r) => inRounded(u, v, r))) fg++;
        }
      }
      const total = S * S;
      const o = (y * size + x) * 3;
      if (inside === 0) {
        // fuera del ícono: dejo el color de fondo igual, iOS recorta solo
        px[o] = BG[0];
        px[o + 1] = BG[1];
        px[o + 2] = BG[2];
        continue;
      }
      const a = fg / total;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  return png(size, px);
}

await mkdir("icons", { recursive: true });
for (const [size, name, opts] of [
  [180, "icon-180.png", { bleed: false }],
  [192, "icon-192.png", { bleed: false }],
  [512, "icon-512.png", { bleed: true }],
]) {
  const buf = render(size, opts);
  await writeFile(`icons/${name}`, buf);
  console.log(name, size + "x" + size, buf.length, "bytes");
}
